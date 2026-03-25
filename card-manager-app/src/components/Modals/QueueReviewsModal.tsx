import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter';
import { CardService } from '@/services/card.service';
import { ReviewService } from '@/services/review.service';
import { CardStatus } from '@/types/ui-types';
import type { CardWithStatus } from '@/types/ui-types';
import {
  formatDateShort,
  getStalenessInfo,
  getStalenessTier,
  STALENESS_TIERS,
  type StalenessTier,
} from '@/utils/staleness-utils';

interface QueueReviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type SortField = 'name' | 'lastReviewed' | 'lastRun';
type SortDir = 'asc' | 'desc';

export function QueueReviewsModal({ open, onOpenChange, onSuccess }: QueueReviewsModalProps) {
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Date maps
  const [lastReviewedDates, setLastReviewedDates] = useState<Record<string, string>>({});
  const [lastRunDates, setLastRunDates] = useState<Record<string, string>>({});

  // Filters
  const [lastReviewedFilter, setLastReviewedFilter] = useState<StalenessTier[]>([]);
  const [lastRunFilter, setLastRunFilter] = useState<StalenessTier[]>([]);

  // Sort
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    if (open) {
      loadData();
      setSelectedIds(new Set());
      setSearchQuery('');
      setLastReviewedFilter([]);
      setLastRunFilter([]);
      setSortField('name');
      setSortDir('asc');
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cardsData, reviewedDates, runDates] = await Promise.all([
        CardService.getAllCardsWithStatus(),
        ReviewService.getLastReviewedDates().catch((err) => {
          console.error('Failed to load last reviewed dates:', err);
          return {} as Record<string, string>;
        }),
        ReviewService.getLastRunDates().catch((err) => {
          console.error('Failed to load last run dates:', err);
          return {} as Record<string, string>;
        }),
      ]);
      cardsData.sort((a, b) => a.CardName.localeCompare(b.CardName));
      setCards(cardsData);
      setLastReviewedDates(reviewedDates);
      setLastRunDates(runDates);
    } catch {
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCards = useMemo(() => {
    let result = [...cards];

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(card =>
        card.CardName.toLowerCase().includes(q) ||
        card.CardIssuer.toLowerCase().includes(q)
      );
    }

    // Last Reviewed filter
    if (lastReviewedFilter.length > 0) {
      result = result.filter(card => {
        const tier = getStalenessTier(lastReviewedDates[card.ReferenceCardId]);
        return tier !== null && lastReviewedFilter.includes(tier);
      });
    }

    // Last Run filter
    if (lastRunFilter.length > 0) {
      result = result.filter(card => {
        const tier = getStalenessTier(lastRunDates[card.ReferenceCardId]);
        return tier !== null && lastRunFilter.includes(tier);
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.CardName.localeCompare(b.CardName);
        return sortDir === 'desc' ? -cmp : cmp;
      }

      const dateMap = sortField === 'lastReviewed' ? lastReviewedDates : lastRunDates;
      const dateA = dateMap[a.ReferenceCardId] || '';
      const dateB = dateMap[b.ReferenceCardId] || '';

      // Empty dates always go to the end regardless of sort direction
      if (!dateA && !dateB) return a.CardName.localeCompare(b.CardName);
      if (!dateA) return 1;
      if (!dateB) return -1;

      const cmp = dateA.localeCompare(dateB);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [cards, searchQuery, lastReviewedFilter, lastRunFilter, lastReviewedDates, lastRunDates, sortField, sortDir]);

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

  const isSelectable = (card: CardWithStatus) =>
    (card.websiteUrls?.length ?? 0) > 0 && card.status === CardStatus.Active;

  const toggleSelectAll = () => {
    const selectableCards = filteredAndSortedCards.filter(isSelectable);
    const selectableIds = selectableCards.map(c => c.ReferenceCardId);
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        selectableIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
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

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        // Reset to default
        setSortField('name');
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown size={12} style={{ color: '#9ca3af' }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#374151' }} />
      : <ChevronDown size={12} style={{ color: '#374151' }} />;
  };

  const renderDateCell = (dateString?: string) => {
    if (!dateString) return <span style={{ color: '#d1d5db' }}>--</span>;
    const staleness = getStalenessInfo(dateString);
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {staleness && <span style={{ color: staleness.color, display: 'flex' }}>{staleness.icon}</span>}
        <span>{formatDateShort(dateString)}</span>
      </span>
    );
  };

  const selectableVisible = filteredAndSortedCards.filter(isSelectable);
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every(c => selectedIds.has(c.ReferenceCardId));

  // Build filter options with staleness icons
  const stalenessFilterOptions = STALENESS_TIERS.map(tier => ({
    value: tier.value,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <tier.Icon size={14} style={{ color: tier.color }} />
        {tier.label}
      </span>
    ),
  }));

  const gridColumns = '32px 1fr 120px 120px';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Queue Reviews"
      description="Select cards to review"
      contentClassName="max-w-5xl"
      preventEscClose
      preventOutsideClose
    >
      <div>
        {/* Search + Filters row */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
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
                height: '36px',
              }}
            />
          </div>
          <MultiSelectFilter
            label="Last Reviewed"
            options={stalenessFilterOptions}
            selected={lastReviewedFilter}
            onChange={setLastReviewedFilter}
          />
          <MultiSelectFilter
            label="Last Run"
            options={stalenessFilterOptions}
            selected={lastRunFilter}
            onChange={setLastRunFilter}
          />
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: '0.5rem',
          padding: '0.375rem 0',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#6b7280',
          alignItems: 'center',
        }}>
          <div>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              style={{ width: '1rem', height: '1rem' }}
            />
          </div>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}
            onClick={() => handleSortClick('name')}
          >
            Card Name {renderSortIcon('name')}
          </div>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}
            onClick={() => handleSortClick('lastReviewed')}
          >
            Last Reviewed {renderSortIcon('lastReviewed')}
          </div>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }}
            onClick={() => handleSortClick('lastRun')}
          >
            Last Run {renderSortIcon('lastRun')}
          </div>
        </div>

        {/* Card list */}
        <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>Loading cards...</div>
          ) : filteredAndSortedCards.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>No cards found</div>
          ) : (
            filteredAndSortedCards.map(card => {
              const selectable = isSelectable(card);
              const hasUrls = (card.websiteUrls?.length ?? 0) > 0;
              const hasActiveVersion = card.status === CardStatus.Active;
              const reviewedDate = lastReviewedDates[card.ReferenceCardId];
              const runDate = lastRunDates[card.ReferenceCardId];

              return (
                <label
                  key={card.ReferenceCardId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridColumns,
                    gap: '0.5rem',
                    padding: '0.375rem 0',
                    cursor: selectable ? 'pointer' : 'default',
                    opacity: selectable ? 1 : 0.5,
                    fontSize: '0.8125rem',
                    alignItems: 'center',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(card.ReferenceCardId)}
                      onChange={() => toggleCard(card.ReferenceCardId)}
                      disabled={!selectable}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      flexShrink: 0,
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      background: card.CardPrimaryColor
                        ? `linear-gradient(135deg, ${card.CardPrimaryColor} 50%, ${card.CardSecondaryColor || card.CardPrimaryColor} 50%)`
                        : '#d1d5db',
                    }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.CardName}
                    </span>
                    {!hasActiveVersion && (
                      <span style={{ fontSize: '0.6875rem', color: '#9ca3af', flexShrink: 0 }}>(no active version)</span>
                    )}
                    {hasActiveVersion && !hasUrls && (
                      <span style={{ fontSize: '0.6875rem', color: '#9ca3af', flexShrink: 0 }}>(no URLs)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                    {renderDateCell(reviewedDate)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                    {renderDateCell(runDate)}
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Count */}
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', fontSize: '0.8125rem', color: '#666' }}>
          {selectedIds.size} of {cards.length} cards selected
          {(lastReviewedFilter.length > 0 || lastRunFilter.length > 0 || searchQuery) && (
            <span> ({filteredAndSortedCards.length} shown)</span>
          )}
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
