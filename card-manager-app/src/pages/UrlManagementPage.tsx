import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Search, Plus, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/PageHeader';
import { ProfilePopover } from '@/components/ProfilePopover';
import { CardService } from '@/services/card.service';
import type { CardWithStatus } from '@/types/ui-types';
import './UrlManagementPage.scss';

type FilterMode = 'all' | 'missing' | 'has';

export function UrlManagementPage() {
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [saving, setSaving] = useState(false);

  // Track URL edits per card: referenceCardId -> string[]
  const [urlEdits, setUrlEdits] = useState<Record<string, string[]>>({});
  // Stable keys for URL inputs to avoid key={index} DOM recycling issues on removal
  const [urlKeyMap, setUrlKeyMap] = useState<Record<string, number[]>>({});
  const nextKeyRef = useRef(0);
  // Original URLs as loaded from the server (for dirty comparison)
  const [originalUrls, setOriginalUrls] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setLoading(true);
    try {
      const data = await CardService.getAllCardsWithStatus();
      data.sort((a, b) => a.CardName.localeCompare(b.CardName));
      setCards(data);

      // Initialize URL edits, keys, and original snapshot from loaded data
      const edits: Record<string, string[]> = {};
      const originals: Record<string, string[]> = {};
      const keys: Record<string, number[]> = {};
      for (const card of data) {
        const urls = card.websiteUrls ?? [];
        edits[card.ReferenceCardId] = [...urls];
        originals[card.ReferenceCardId] = [...urls];
        keys[card.ReferenceCardId] = urls.map(() => nextKeyRef.current++);
      }
      setUrlEdits(edits);
      setOriginalUrls(originals);
      setUrlKeyMap(keys);
    } catch (err) {
      console.error('Failed to load cards:', err);
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const getUrlsForCard = useCallback((referenceCardId: string): string[] => {
    return urlEdits[referenceCardId] ?? [];
  }, [urlEdits]);

  const setUrlsForCard = useCallback((referenceCardId: string, urls: string[]) => {
    setUrlEdits(prev => ({ ...prev, [referenceCardId]: urls }));
  }, []);

  // Compute dirty cards by comparing current edits to original snapshot.
  // A card is dirty only if its non-empty URLs actually differ from the original.
  const dirtyCards = useMemo(() => {
    const dirty = new Set<string>();
    for (const cardId of Object.keys(urlEdits)) {
      const current = urlEdits[cardId].map(u => u.trim()).filter(Boolean);
      const original = (originalUrls[cardId] ?? []).map(u => u.trim()).filter(Boolean);
      if (current.length !== original.length || current.some((url, i) => url !== original[i])) {
        dirty.add(cardId);
      }
    }
    return dirty;
  }, [urlEdits, originalUrls]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyCards.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyCards.size]);

  const handleAddUrl = (referenceCardId: string) => {
    const current = getUrlsForCard(referenceCardId);
    setUrlsForCard(referenceCardId, [...current, '']);
    setUrlKeyMap(prev => ({
      ...prev,
      [referenceCardId]: [...(prev[referenceCardId] ?? []), nextKeyRef.current++],
    }));
  };

  const handleRemoveUrl = (referenceCardId: string, index: number) => {
    const current = getUrlsForCard(referenceCardId);
    setUrlsForCard(referenceCardId, current.filter((_, i) => i !== index));
    setUrlKeyMap(prev => ({
      ...prev,
      [referenceCardId]: (prev[referenceCardId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleUrlChange = (referenceCardId: string, index: number, value: string) => {
    const current = [...getUrlsForCard(referenceCardId)];
    current[index] = value;
    setUrlsForCard(referenceCardId, current);
  };

  const handleSaveAll = async () => {
    if (dirtyCards.size === 0) return;

    // Validate all URLs
    let hasErrors = false;
    for (const cardId of dirtyCards) {
      const card = cards.find(c => c.ReferenceCardId === cardId);
      const cardLabel = card?.CardName ?? cardId;
      const urls = getUrlsForCard(cardId);
      for (const url of urls) {
        if (url.trim()) {
          try {
            const parsed = new URL(url.trim());
            if (parsed.protocol !== 'https:') {
              hasErrors = true;
              toast.error(`${cardLabel}: URL must start with https://`);
            }
          } catch {
            hasErrors = true;
            toast.error(`${cardLabel}: Invalid URL format`);
          }
        }
      }
    }

    if (hasErrors) return;

    setSaving(true);
    try {
      const updates = Array.from(dirtyCards).map(cardId => ({
        referenceCardId: cardId,
        websiteUrls: Array.from(
          new Set(getUrlsForCard(cardId).map(u => u.trim()).filter(Boolean))
        ),
      }));

      await CardService.bulkUpdateUrls(updates);

      // Update local card data
      setCards(prev => prev.map(card => {
        const update = updates.find(u => u.referenceCardId === card.ReferenceCardId);
        if (update) {
          return { ...card, websiteUrls: update.websiteUrls };
        }
        return card;
      }));

      // Update original snapshot to match saved state so dirty comparison clears
      setOriginalUrls(prev => {
        const next = { ...prev };
        for (const update of updates) {
          next[update.referenceCardId] = [...update.websiteUrls];
        }
        return next;
      });
      // Also update urlEdits to remove empty strings (they were filtered on save)
      setUrlEdits(prev => {
        const next = { ...prev };
        for (const update of updates) {
          next[update.referenceCardId] = [...update.websiteUrls];
        }
        return next;
      });
      toast.success(`Updated URLs for ${updates.length} card${updates.length !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Failed to save URLs:', err);
      toast.error('Failed to save URLs: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!card.CardName.toLowerCase().includes(q) &&
            !card.CardIssuer.toLowerCase().includes(q) &&
            !card.ReferenceCardId.toLowerCase().includes(q)) {
          return false;
        }
      }

      // URL filter
      const urlCount = getUrlsForCard(card.ReferenceCardId).filter(u => u.trim()).length;
      if (filterMode === 'missing' && urlCount > 0) return false;
      if (filterMode === 'has' && urlCount === 0) return false;

      return true;
    });
  }, [cards, searchQuery, filterMode, getUrlsForCard]);

  // Progress counter
  const cardsWithUrls = useMemo(() => {
    return cards.filter(card => {
      const urls = getUrlsForCard(card.ReferenceCardId);
      return urls.some(u => u.trim().length > 0);
    }).length;
  }, [cards, getUrlsForCard]);

  if (loading) {
    return (
      <div className="url-management-page">
        <PageHeader title="URL Management" backTo="/" actions={<ProfilePopover />} />
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading cards...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="url-management-page">
      <PageHeader title="URL Management" backTo="/" actions={<ProfilePopover />} />

      <div className="progress-counter">
        {cardsWithUrls}/{cards.length} cards have URLs configured
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select
          value={filterMode}
          onChange={(value) => setFilterMode(value as FilterMode)}
          options={[
            { value: 'all', label: 'All Cards' },
            { value: 'missing', label: 'Missing URLs' },
            { value: 'has', label: 'Has URLs' },
          ]}
        />
      </div>

      {filteredCards.map(card => {
        const urls = getUrlsForCard(card.ReferenceCardId);
        const urlCount = urls.filter(u => u.trim()).length;
        const isDirty = dirtyCards.has(card.ReferenceCardId);

        return (
          <div key={card.ReferenceCardId} className="card-section" style={isDirty ? { borderColor: '#ca8a04' } : undefined}>
            <div className="card-header">
              <div className="card-info">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={`/cards/${card.ReferenceCardId}${card.id ? `/${card.id}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-name-link"
                    >
                      {card.CardName}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>{card.ReferenceCardId}</span>
                  </TooltipContent>
                </Tooltip>
                <span className="card-issuer">({card.CardIssuer})</span>
              </div>
              <span className={`url-count ${urlCount > 0 ? 'has-urls' : 'no-urls'}`}>
                {urlCount > 0 ? `${urlCount} URL${urlCount !== 1 ? 's' : ''}` : '0 URLs'}
              </span>
            </div>

            {urls.map((url, index) => (
              <div key={urlKeyMap[card.ReferenceCardId]?.[index] ?? index} className="url-row">
                <input
                  type="text"
                  className="url-input"
                  value={url}
                  onChange={(e) => handleUrlChange(card.ReferenceCardId, index, e.target.value)}
                  placeholder="https://..."
                />
                {url.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      try {
                        const parsed = new URL(url.trim());
                        if (parsed.protocol !== 'https:') {
                          toast.error('Only https:// URLs can be opened');
                          return;
                        }
                        window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
                      } catch {
                        toast.error('Invalid URL');
                      }
                    }}
                    title="Open URL"
                  >
                    <ExternalLink size={14} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveUrl(card.ReferenceCardId, index)}
                  title="Remove URL"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddUrl(card.ReferenceCardId)}
            >
              <Plus size={14} />
              Add URL
            </Button>
          </div>
        );
      })}

      {filteredCards.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          No cards match your filters
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky-save-bar">
        {dirtyCards.size > 0 && (
          <span className="unsaved-indicator">
            {dirtyCards.size} card{dirtyCards.size !== 1 ? 's' : ''} with unsaved changes
          </span>
        )}
        <Button
          onClick={handleSaveAll}
          disabled={dirtyCards.size === 0 || saving}
        >
          {saving ? 'Saving...' : `Save All${dirtyCards.size > 0 ? ` (${dirtyCards.size})` : ''}`}
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
}
