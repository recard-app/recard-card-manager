import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { CardService } from '@/services/card.service';
import { ReviewService } from '@/services/review.service';
import type { CardWithStatus } from '@/types/ui-types';

interface QueueReviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QueueReviewsModal({ open, onOpenChange, onSuccess }: QueueReviewsModalProps) {
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadCards();
      setSelectedIds(new Set());
      setSearchQuery('');
    }
  }, [open]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const data = await CardService.getAllCardsWithStatus();
      data.sort((a, b) => a.CardName.localeCompare(b.CardName));
      setCards(data);
    } catch {
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = useMemo(() => {
    if (!searchQuery) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(card =>
      card.CardName.toLowerCase().includes(q) ||
      card.CardIssuer.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  const toggleCard = (cardId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    // Only select cards that have URLs configured
    const selectableCards = filteredCards.filter(c => (c.websiteUrls?.length ?? 0) > 0);
    const selectableIds = selectableCards.map(c => c.ReferenceCardId);
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));

    if (allSelected) {
      // Deselect all visible
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all visible that have URLs
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const result = await ReviewService.queueReviews(Array.from(selectedIds));
      const queued = result.reviewIds.length;
      const skippedCount = result.skipped.length;

      if (queued > 0) {
        toast.success(`Queued ${queued} review${queued !== 1 ? 's' : ''}${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`);
      } else {
        toast.info(`All ${skippedCount} selected card${skippedCount !== 1 ? 's were' : ' was'} skipped`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to queue reviews:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to queue reviews: ' + message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectableVisible = filteredCards.filter(c => (c.websiteUrls?.length ?? 0) > 0);
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every(c => selectedIds.has(c.ReferenceCardId));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Queue Reviews"
      description="Select cards to review"
    >
      <div>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Select All */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '0.5rem',
          }}
        >
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAll}
            style={{ width: '1rem', height: '1rem' }}
          />
          Select All{searchQuery ? ' (filtered)' : ''}
        </label>

        {/* Card list */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>Loading cards...</div>
          ) : filteredCards.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No cards found</div>
          ) : (
            filteredCards.map(card => {
              const hasUrls = (card.websiteUrls?.length ?? 0) > 0;
              return (
                <label
                  key={card.ReferenceCardId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0',
                    cursor: hasUrls ? 'pointer' : 'default',
                    opacity: hasUrls ? 1 : 0.5,
                    fontSize: '0.875rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(card.ReferenceCardId)}
                    onChange={() => toggleCard(card.ReferenceCardId)}
                    disabled={!hasUrls}
                    style={{ width: '1rem', height: '1rem' }}
                  />
                  <span>{card.CardName}</span>
                  {!hasUrls && (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>(no URLs)</span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Count */}
        <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: '#666' }}>
          {selectedIds.size} of {cards.length} cards selected
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={selectedIds.size === 0 || submitting}>
          {submitting ? 'Queueing...' : `Queue ${selectedIds.size} Review${selectedIds.size !== 1 ? 's' : ''}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
