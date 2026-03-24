import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ExternalLink,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Minus,
  Eye,
  Copy,
  Check,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { PageHeader } from '@/components/PageHeader';
import { ProfilePopover } from '@/components/ProfilePopover';
import { FieldComparisonCard } from '@/components/comparison/FieldComparisonCard';
import { ComponentCard } from '@/components/comparison/ComponentComparisonTabs';
import { ReviewService } from '@/services/review.service';
import { CardService } from '@/services/card.service';
import { ComponentService } from '@/services/component.service';
import { CreditModal } from '@/components/Modals/CreditModal';
import { PerkModal } from '@/components/Modals/PerkModal';
import { MultiplierModal } from '@/components/Modals/MultiplierModal';
import { UrlManagementModal } from '@/components/Modals/UrlManagementModal';
import type { ReviewResult } from '@/types/review-types';
import type { ComponentComparisonResult } from '@/types/comparison-types';
import type { CardCredit, CardPerk, CardMultiplier } from '@/types';
import type { CreditCardName } from '@/types/ui-types';
import './CardReviewDetailPage.scss';

type ComparisonTab = 'cardDetails' | 'credits' | 'perks' | 'multipliers' | 'urls';

function formatTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(3)}`;
}

export function CardReviewDetailPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageSectionOpen, setUsageSectionOpen] = useState(true);
  const [activeComparisonTab, setActiveComparisonTab] = useState<ComparisonTab>('cardDetails');

  // Inline edit modal state
  const [editModalType, setEditModalType] = useState<'credits' | 'perks' | 'multipliers' | null>(null);
  const [editingComponent, setEditingComponent] = useState<CardCredit | CardPerk | CardMultiplier | null>(null);
  const [editInitialJson, setEditInitialJson] = useState<Record<string, unknown> | undefined>(undefined);
  const [editModalKey, setEditModalKey] = useState(0);


  // Scraped content viewer modal
  const [contentViewerOpen, setContentViewerOpen] = useState(false);
  const [contentViewerUrl, setContentViewerUrl] = useState('');
  const [contentViewerText, setContentViewerText] = useState('');
  const [contentCopied, setContentCopied] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [urlModalCardName, setUrlModalCardName] = useState<CreditCardName | null>(null);
  const [updatingUrlIndex, setUpdatingUrlIndex] = useState<number | null>(null);

  // Human review tracking
  type ReviewedItemsState = {
    cardDetails: number[];
    credits: number[];
    perks: number[];
    multipliers: number[];
    urls: number[];
  };
  const [reviewStatus, setReviewStatus] = useState<'not_reviewed' | 'reviewed'>('not_reviewed');
  const [reviewedItems, setReviewedItems] = useState<ReviewedItemsState>({
    cardDetails: [], credits: [], perks: [], multipliers: [], urls: [],
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistReviewState = useCallback((
    nextStatus: 'not_reviewed' | 'reviewed',
    nextItems: ReviewedItemsState
  ) => {
    if (!resultId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      ReviewService.updateReviewStatus(resultId, {
        reviewStatus: nextStatus,
        reviewedItems: nextItems,
      }).catch(() => toast.error('Failed to save review status'));
    }, 500);
  }, [resultId]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const toggleReviewedItem = (section: keyof ReviewedItemsState, index: number) => {
    setReviewedItems(prev => {
      const arr = prev[section];
      const next = arr.includes(index) ? arr.filter(i => i !== index) : [...arr, index];
      const nextItems = { ...prev, [section]: next };

      // Auto-promote: check if all non-match items are now reviewed
      if (review?.comparisonResult) {
        const cr = review.comparisonResult;
        const allChecked =
          cr.cardDetails.every((f, i) => f.status === 'match' || f.status === 'missing_from_website' || nextItems.cardDetails.includes(i)) &&
          cr.credits.every((c, i) => c.status === 'match' || nextItems.credits.includes(i)) &&
          cr.perks.every((p, i) => p.status === 'match' || nextItems.perks.includes(i)) &&
          cr.multipliers.every((m, i) => m.status === 'match' || nextItems.multipliers.includes(i)) &&
          (!review.urlResults || review.urlResults.every((u, i) => (u.status === 'ok' && !u.truncated) || nextItems.urls.includes(i)));

        if (allChecked) {
          setReviewStatus('reviewed');
          persistReviewState('reviewed', nextItems);
          return nextItems;
        }
      }

      persistReviewState(reviewStatus, nextItems);
      return nextItems;
    });
  };

  const markAllInSection = (section: keyof ReviewedItemsState) => {
    if (!review?.comparisonResult && section !== 'urls') return;
    setReviewedItems(prev => {
      let indices: number[] = [];
      const cr = review!.comparisonResult;
      if (section === 'cardDetails' && cr) {
        indices = cr.cardDetails.map((f, i) => (f.status !== 'match' && f.status !== 'missing_from_website') ? i : -1).filter(i => i >= 0);
      } else if (section === 'urls' && review?.urlResults) {
        indices = review.urlResults.map((u, i) => (u.status !== 'ok' || u.truncated) ? i : -1).filter(i => i >= 0);
      } else if (cr && section in cr) {
        const items = cr[section as 'credits' | 'perks' | 'multipliers'];
        indices = items.map((c, i) => c.status !== 'match' ? i : -1).filter(i => i >= 0);
      }
      const nextItems = { ...prev, [section]: indices };

      // Check auto-promote
      if (cr) {
        const allChecked =
          cr.cardDetails.every((f, i) => f.status === 'match' || f.status === 'missing_from_website' || nextItems.cardDetails.includes(i)) &&
          cr.credits.every((c, i) => c.status === 'match' || nextItems.credits.includes(i)) &&
          cr.perks.every((p, i) => p.status === 'match' || nextItems.perks.includes(i)) &&
          cr.multipliers.every((m, i) => m.status === 'match' || nextItems.multipliers.includes(i)) &&
          (!review?.urlResults || review.urlResults.every((u, i) => (u.status === 'ok' && !u.truncated) || nextItems.urls.includes(i)));

        if (allChecked) {
          setReviewStatus('reviewed');
          persistReviewState('reviewed', nextItems);
          return nextItems;
        }
      }

      persistReviewState(reviewStatus, nextItems);
      return nextItems;
    });
  };

  const clearAllInSection = (section: keyof ReviewedItemsState) => {
    setReviewedItems(prev => {
      const nextItems = { ...prev, [section]: [] };
      persistReviewState(reviewStatus, nextItems);
      return nextItems;
    });
  };

  const handleReviewStatusChange = (value: string) => {
    const newStatus = value as 'not_reviewed' | 'reviewed';
    setReviewStatus(newStatus);
    persistReviewState(newStatus, reviewedItems);
  };

  useEffect(() => {
    if (resultId) {
      loadReview(resultId);
    }
  }, [resultId]);

  const loadReview = async (id: string) => {
    setLoading(true);
    try {
      const result = await ReviewService.getResult(id);
      setReview(result);
      setReviewStatus(result.reviewStatus || 'not_reviewed');
      setReviewedItems({
        cardDetails: result.reviewedItems?.cardDetails || [],
        credits: result.reviewedItems?.credits || [],
        perks: result.reviewedItems?.perks || [],
        multipliers: result.reviewedItems?.multipliers || [],
        urls: result.reviewedItems?.urls || [],
      });
    } catch (err) {
      console.error('Failed to load review:', err);
      toast.error('Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async () => {
    if (!review) return;
    try {
      await ReviewService.queueReviews([review.referenceCardId]);
      toast.success('Review queued');
    } catch {
      toast.error('Failed to queue review');
    }
  };

  const handleOpenCard = () => {
    if (!review) return;
    window.open(`/cards/${review.referenceCardId}/${review.versionId}`, '_blank');
  };

  const handleDelete = async () => {
    if (!review || !resultId) return;
    if (!window.confirm(`Delete this review for "${review.cardName}"? This cannot be undone.`)) return;

    try {
      await ReviewService.deleteReview(resultId);
      toast.success('Review deleted');
      navigate('/reviews?tab=completed');
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const normalizeUrls = (urls: string[]): string[] => {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const url of urls) {
      const trimmed = url.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      normalized.push(trimmed);
    }
    return normalized;
  };

  const loadCardNameForUrlModal = async (): Promise<CreditCardName | null> => {
    if (!review) return null;
    try {
      const cardName = await CardService.getCardName(review.referenceCardId);
      if (!cardName) {
        toast.error('Card not found');
        return null;
      }
      setUrlModalCardName(cardName);
      return cardName;
    } catch {
      toast.error('Failed to load card URL settings');
      return null;
    }
  };

  const handleEnterManualUrl = async () => {
    const cardName = await loadCardNameForUrlModal();
    if (!cardName) return;
    setUrlModalOpen(true);
  };

  const markSuggestedUrlDismissedLocally = (urlIndex: number) => {
    setReview(prev => {
      if (!prev?.urlResults || urlIndex < 0 || urlIndex >= prev.urlResults.length) return prev;
      const nextUrlResults = [...prev.urlResults];
      nextUrlResults[urlIndex] = {
        ...nextUrlResults[urlIndex],
        suggestedUrlDismissed: true,
      };
      return { ...prev, urlResults: nextUrlResults };
    });
  };

  const handleDismissSuggestedUrl = async (urlIndex: number) => {
    if (!review) return;
    setUpdatingUrlIndex(urlIndex);
    try {
      await ReviewService.dismissUrl(review.id, urlIndex);
      markSuggestedUrlDismissedLocally(urlIndex);
      toast.success('Suggestion dismissed');
    } catch {
      toast.error('Failed to dismiss suggestion');
    } finally {
      setUpdatingUrlIndex(null);
    }
  };

  const handleApproveSuggestedUrl = async (urlIndex: number) => {
    if (!review?.urlResults) return;
    const urlResult = review.urlResults[urlIndex];
    const suggestedUrl = urlResult?.suggestedUrl?.trim();

    if (!urlResult || !suggestedUrl) {
      toast.error('No suggested URL available');
      return;
    }

    setUpdatingUrlIndex(urlIndex);
    try {
      const cardName = await CardService.getCardName(review.referenceCardId);
      if (!cardName) {
        toast.error('Card not found');
        return;
      }

      const currentUrls = normalizeUrls(cardName.websiteUrls ?? []);
      let nextUrls = currentUrls.map(url => (url === urlResult.url ? suggestedUrl : url));
      if (!nextUrls.includes(suggestedUrl)) {
        nextUrls = [...nextUrls, suggestedUrl];
      }
      nextUrls = normalizeUrls(nextUrls);

      await CardService.updateCardName(review.referenceCardId, {
        websiteUrls: nextUrls,
      });

      try {
        await ReviewService.dismissUrl(review.id, urlIndex);
      } catch {
        // Non-blocking: URL update succeeded; review suggestion dismissal can fail independently.
      }
      markSuggestedUrlDismissedLocally(urlIndex);
      toast.success('Suggested URL approved and saved');
    } catch (error) {
      console.error('Failed to approve suggested URL:', error);
      toast.error('Failed to approve suggested URL');
    } finally {
      setUpdatingUrlIndex(null);
    }
  };

  const handleEditComponent = async (
    componentType: 'credits' | 'perks' | 'multipliers',
    component: ComponentComparisonResult
  ) => {
    if (!review) return;

    if (component.status === 'new') {
      // Create mode: pre-fill from proposedFix
      setEditingComponent(null);
      setEditInitialJson(component.proposedFix ?? undefined);
    } else if (component.id) {
      // Edit mode: load the existing component data
      try {
        let existingComponent: CardCredit | CardPerk | CardMultiplier | undefined;

        if (componentType === 'credits') {
          const credits = await ComponentService.getCreditsByCardId(review.referenceCardId);
          existingComponent = credits.find(c => c.id === component.id);
        } else if (componentType === 'perks') {
          const perks = await ComponentService.getPerksByCardId(review.referenceCardId);
          existingComponent = perks.find(p => p.id === component.id);
        } else if (componentType === 'multipliers') {
          const multipliers = await ComponentService.getMultipliersByCardId(review.referenceCardId);
          existingComponent = multipliers.find(m => m.id === component.id);
        }

        if (!existingComponent) {
          toast.error('Component not found -- it may have been deleted');
          return;
        }

        setEditingComponent(existingComponent);
        setEditInitialJson(undefined);
      } catch {
        toast.error('Failed to load component data');
        return;
      }
    }

    setEditModalType(componentType);
    setEditModalKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="card-review-detail-page">
        <PageHeader title="Review Details" backTo="/reviews?tab=completed" actions={<ProfilePopover />} />
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading review...</div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="card-review-detail-page">
        <PageHeader title="Review Not Found" backTo="/reviews?tab=completed" actions={<ProfilePopover />} />
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Review not found</div>
      </div>
    );
  }

  const { comparisonResult, usage, urlResults } = review;

  // Count issues per tab for badges
  const cardDetailCounts = {
    mismatch: comparisonResult?.cardDetails.filter(f => f.status === 'mismatch').length ?? 0,
    questionable: comparisonResult?.cardDetails.filter(f => f.status === 'questionable').length ?? 0,
  };

  const getComponentCounts = (items: ComponentComparisonResult[] | undefined) => ({
    outdated: items?.filter(c => c.status === 'outdated').length ?? 0,
    new: items?.filter(c => c.status === 'new').length ?? 0,
    missing: items?.filter(c => c.status === 'missing').length ?? 0,
    questionable: items?.filter(c => c.status === 'questionable').length ?? 0,
  });

  const creditCounts = getComponentCounts(comparisonResult?.credits);
  const perkCounts = getComponentCounts(comparisonResult?.perks);
  const multiplierCounts = getComponentCounts(comparisonResult?.multipliers);

  const urlCounts = {
    broken: urlResults?.filter(r => r.status === 'broken' || r.status === 'stale').length ?? 0,
    truncated: urlResults?.filter(r => r.status === 'ok' && r.truncated).length ?? 0,
  };

  type TabCounts = { mismatch?: number; outdated?: number; new?: number; missing?: number; questionable?: number; broken?: number; truncated?: number };
  const comparisonTabs: { id: ComparisonTab; label: string; counts: TabCounts }[] = [
    { id: 'cardDetails', label: 'Details', counts: cardDetailCounts },
    { id: 'credits', label: 'Credits', counts: creditCounts },
    { id: 'perks', label: 'Perks', counts: perkCounts },
    { id: 'multipliers', label: 'Multipliers', counts: multiplierCounts },
  ];

  const urlTab = { id: 'urls' as ComparisonTab, label: 'URLs', counts: urlCounts };

  const renderTabBadges = (counts: TabCounts) => {
    const hasAny = Object.values(counts).some(v => (v ?? 0) > 0);
    if (!hasAny) return null;
    return (
      <span className="tab-badges">
        {(counts.mismatch ?? 0) > 0 && <span className="tab-icon mismatch"><XCircle size={10} />{counts.mismatch}</span>}
        {(counts.outdated ?? 0) > 0 && <span className="tab-icon mismatch"><XCircle size={10} />{counts.outdated}</span>}
        {(counts.new ?? 0) > 0 && <span className="tab-icon new"><Plus size={10} />{counts.new}</span>}
        {(counts.missing ?? 0) > 0 && <span className="tab-icon missing"><Minus size={10} />{counts.missing}</span>}
        {(counts.questionable ?? 0) > 0 && <span className="tab-icon questionable"><AlertTriangle size={10} />{counts.questionable}</span>}
        {(counts.broken ?? 0) > 0 && <span className="tab-icon mismatch"><XCircle size={10} />{counts.broken}</span>}
        {(counts.truncated ?? 0) > 0 && <span className="tab-icon questionable"><AlertTriangle size={10} />{counts.truncated}</span>}
      </span>
    );
  };

  const editingCredit: CardCredit | null =
    editModalType === 'credits' ? (editingComponent as CardCredit | null) : null;
  const editingPerk: CardPerk | null =
    editModalType === 'perks' ? (editingComponent as CardPerk | null) : null;
  const editingMultiplier: CardMultiplier | null =
    editModalType === 'multipliers'
      ? (editingComponent as CardMultiplier | null)
      : null;

  return (
    <div className="card-review-detail-page">
      <PageHeader
        title="Review Details"
        backTo="/reviews?tab=completed"
        actions={<ProfilePopover />}
      />

      {/* Card info + action buttons */}
      <div className="review-card-info">
        <div className="review-card-info-left">
          <div className="review-card-name-row">
            <h2 className="review-card-name">{review.cardName}</h2>
            <Button size="sm" variant="ghost" onClick={handleOpenCard} title="Open card in new tab">
              <ExternalLink size={14} />
            </Button>
          </div>
          <span className="review-card-timestamp">{formatTimestamp(review.reviewedAt || review.queuedAt)}</span>
          <div className="review-status-select">
            <Select
              value={reviewStatus}
              onChange={handleReviewStatusChange}
              className={reviewStatus === 'reviewed' ? 'review-select-reviewed' : 'review-select-not-reviewed'}
              options={[
                { value: 'not_reviewed', label: 'Not Reviewed' },
                { value: 'reviewed', label: 'Reviewed' },
              ]}
            />
          </div>
        </div>
        <div className="review-card-info-actions">
          <Button size="sm" variant="outline" onClick={handleRerun}>
            <RotateCcw size={14} />
            Re-run Review
          </Button>
          <Button size="sm" variant="outline" onClick={handleDelete} style={{ color: '#dc2626', borderColor: '#fecaca' }}>
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>

      {/* Failed/Skipped State */}
      {(review.status === 'failed' || review.status === 'skipped') && (
        <div className="failed-state">
          <div className="failed-reason">
            {review.status === 'failed' ? review.failureReason : review.skipReason}
          </div>
        </div>
      )}

      {/* Usage & Cost Section */}
      {usage && (
        <div className="usage-cost-section">
          <div className="usage-header" onClick={() => setUsageSectionOpen(!usageSectionOpen)}>
            <h3>Usage & Cost</h3>
            {usageSectionOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {usageSectionOpen && (
            <div className="usage-content">
              {/* Sources */}
              <div className="usage-group">
                <div className="usage-group-title">Sources</div>
                <div className="sources-table">
                  <div className="sources-header">
                    <span className="col-url">URL</span>
                    <span className="col-source">Source</span>
                    <span className="col-tokens">Tokens</span>
                    <span className="col-time">Time</span>
                    <span className="col-action"></span>
                  </div>
                  {usage.scraping.urlBreakdown.map((entry, i) => {
                    const matchingUrlResult = urlResults?.find(r => r.url === entry.url);
                    const hasContent = !!matchingUrlResult?.scrapedContent;

                    return (
                      <div key={i} className="sources-row">
                        <span className="col-url">{entry.url}</span>
                        <span className="col-source">{entry.source.replace('cloudflare-', 'CF /')}</span>
                        <span className="col-tokens">{formatTokenCount(entry.contentTokens)}</span>
                        <span className="col-time">{entry.browserTimeMs ? `${entry.browserTimeMs}ms` : '--'}</span>
                        <span className="col-action">
                          {hasContent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setContentViewerUrl(entry.url);
                                setContentViewerText(matchingUrlResult!.scrapedContent!);
                                setContentCopied(false);
                                setContentViewerOpen(true);
                              }}
                              title="View scraped content"
                            >
                              <Eye size={14} />
                            </Button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="usage-row">
                  <span className="usage-label">Total scraped:</span>
                  <span className="usage-value">{formatTokenCount(usage.scraping.totalContentTokens)} tokens</span>
                </div>
              </div>

              {/* Gemini */}
              <div className="usage-group">
                <div className="usage-group-title">{usage.gemini.model}</div>
                <div className="usage-row">
                  <span className="usage-label">Input:</span>
                  <span className="usage-value">{formatTokenCount(usage.gemini.inputTokens)} tokens</span>
                </div>
                <div className="usage-row">
                  <span className="usage-label">Output:</span>
                  <span className="usage-value">{formatTokenCount(usage.gemini.outputTokens)} tokens</span>
                </div>
                {usage.gemini.thinkingTokens && (
                  <div className="usage-row">
                    <span className="usage-label">Thinking:</span>
                    <span className="usage-value">{formatTokenCount(usage.gemini.thinkingTokens)} tokens</span>
                  </div>
                )}
              </div>

              {/* Cost */}
              <div className="usage-group">
                <div className="usage-group-title">Cost</div>
                <div className="cost-divider" />
                <div className="usage-row">
                  <span className="usage-label">Input:</span>
                  <span className="usage-value">{formatCost(usage.cost.geminiInput)}</span>
                </div>
                <div className="usage-row">
                  <span className="usage-label">Output:</span>
                  <span className="usage-value">{formatCost(usage.cost.geminiOutput)} (incl. thinking)</span>
                </div>
                {usage.cost.searchGrounding > 0 && (
                  <div className="usage-row">
                    <span className="usage-label">Search:</span>
                    <span className="usage-value">{formatCost(usage.cost.searchGrounding)}</span>
                  </div>
                )}
                <div className="cost-divider" />
                <div className="usage-row cost-total">
                  <span className="usage-label">Total:</span>
                  <span className="usage-value">{formatCost(usage.cost.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Summary */}
      {comparisonResult && (
        <>
          <div className="summary-section">
            <p className="summary-text">{comparisonResult.summary}</p>

            <div className="status-overview">
              <div className="overview-row">
                <span className="overview-label">Card Details</span>
                <div className="overview-counts">
                  {comparisonResult.cardDetails.filter(f => f.status === 'match').length > 0 && (
                    <span className="count-item match"><CheckCircle size={14} /> {comparisonResult.cardDetails.filter(f => f.status === 'match').length}</span>
                  )}
                  {comparisonResult.cardDetails.filter(f => f.status === 'mismatch').length > 0 && (
                    <span className="count-item mismatch"><XCircle size={14} /> {comparisonResult.cardDetails.filter(f => f.status === 'mismatch').length}</span>
                  )}
                  {comparisonResult.cardDetails.filter(f => f.status === 'questionable').length > 0 && (
                    <span className="count-item questionable"><AlertTriangle size={14} /> {comparisonResult.cardDetails.filter(f => f.status === 'questionable').length}</span>
                  )}
                </div>
              </div>
              {(['credits', 'perks', 'multipliers'] as const).map(section => {
                const items = comparisonResult[section];
                return (
                  <div key={section} className="overview-row">
                    <span className="overview-label">{section.charAt(0).toUpperCase() + section.slice(1)}</span>
                    <div className="overview-counts">
                      {items.filter(c => c.status === 'match').length > 0 && (
                        <span className="count-item match"><CheckCircle size={14} /> {items.filter(c => c.status === 'match').length}</span>
                      )}
                      {items.filter(c => c.status === 'outdated').length > 0 && (
                        <span className="count-item outdated"><XCircle size={14} /> {items.filter(c => c.status === 'outdated').length}</span>
                      )}
                      {items.filter(c => c.status === 'new').length > 0 && (
                        <span className="count-item new"><Plus size={14} /> {items.filter(c => c.status === 'new').length}</span>
                      )}
                      {items.filter(c => c.status === 'missing').length > 0 && (
                        <span className="count-item missing"><Minus size={14} /> {items.filter(c => c.status === 'missing').length}</span>
                      )}
                      {items.filter(c => c.status === 'questionable').length > 0 && (
                        <span className="count-item questionable"><AlertTriangle size={14} /> {items.filter(c => c.status === 'questionable').length}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* URL Status */}
              {urlResults && urlResults.length > 0 && (<div className="overview-divider" />)}
              {urlResults && urlResults.length > 0 && (
                <div className="overview-row url-status-overview">
                  <span className="overview-label">URLs</span>
                  <div className="overview-counts">
                    {urlResults.filter(r => r.status === 'ok' && !r.truncated).length > 0 && (
                      <span className="count-item match"><CheckCircle size={14} /> {urlResults.filter(r => r.status === 'ok' && !r.truncated).length}</span>
                    )}
                    {urlResults.filter(r => r.status === 'ok' && r.truncated).length > 0 && (
                      <span className="count-item questionable"><AlertTriangle size={14} /> {urlResults.filter(r => r.status === 'ok' && r.truncated).length}</span>
                    )}
                    {urlResults.filter(r => r.status === 'broken' || r.status === 'stale').length > 0 && (
                      <span className="count-item mismatch"><XCircle size={14} /> {urlResults.filter(r => r.status === 'broken' || r.status === 'stale').length}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabbed Comparison View */}
          <div className="comparison-tabs">
            <div className="comparison-tab-list">
              {comparisonTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`comparison-tab-trigger ${activeComparisonTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveComparisonTab(tab.id)}
                >
                  {tab.label}
                  {renderTabBadges(tab.counts)}
                </button>
              ))}
              {urlResults && urlResults.length > 0 && (
                <>
                <span className="tab-divider" />
                <button
                  className={`comparison-tab-trigger ${activeComparisonTab === 'urls' ? 'active' : ''}`}
                  onClick={() => setActiveComparisonTab('urls')}
                >
                  {urlTab.label}
                  {renderTabBadges(urlTab.counts)}
                </button>
                </>
              )}
            </div>

            {activeComparisonTab === 'cardDetails' && (
              <div>
                {comparisonResult.cardDetails.some(f => f.status !== 'match' && f.status !== 'missing_from_website') && (
                  <div className="mark-all-bar">
                    <span className={`review-count ${reviewedItems.cardDetails.length >= comparisonResult.cardDetails.filter(f => f.status !== 'match' && f.status !== 'missing_from_website').length ? 'all-done' : ''}`}>
                      {reviewedItems.cardDetails.length}/{comparisonResult.cardDetails.filter(f => f.status !== 'match' && f.status !== 'missing_from_website').length} reviewed
                    </span>
                    <Button size="sm" variant="outline" onClick={() => markAllInSection('cardDetails')}
                      disabled={comparisonResult.cardDetails.every((f, i) => f.status === 'match' || f.status === 'missing_from_website' || reviewedItems.cardDetails.includes(i))}
                    ><Check size={14} /> Mark all reviewed</Button>
                    {reviewedItems.cardDetails.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => clearAllInSection('cardDetails')}
                      ><X size={14} /> Clear all</Button>
                    )}
                  </div>
                )}
                {comparisonResult.cardDetails.map((field, index) => {
                  const needsReview = field.status !== 'match' && field.status !== 'missing_from_website';
                  return (
                    <FieldComparisonCard
                      key={field.fieldName || index}
                      field={field}
                      {...(needsReview ? {
                        reviewed: reviewedItems.cardDetails.includes(index),
                        onToggleReview: () => toggleReviewedItem('cardDetails', index),
                      } : {})}
                    />
                  );
                })}
              </div>
            )}

            {activeComparisonTab === 'credits' && (
              <div className="components-list">
                {comparisonResult.credits.some(c => c.status !== 'match') && (
                  <div className="mark-all-bar">
                    <span className={`review-count ${reviewedItems.credits.length >= comparisonResult.credits.filter(c => c.status !== 'match').length ? 'all-done' : ''}`}>
                      {reviewedItems.credits.length}/{comparisonResult.credits.filter(c => c.status !== 'match').length} reviewed
                    </span>
                    <Button size="sm" variant="outline" onClick={() => markAllInSection('credits')}
                      disabled={comparisonResult.credits.every((c, i) => c.status === 'match' || reviewedItems.credits.includes(i))}
                    ><Check size={14} /> Mark all reviewed</Button>
                    {reviewedItems.credits.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => clearAllInSection('credits')}
                      ><X size={14} /> Clear all</Button>
                    )}
                  </div>
                )}
                {comparisonResult.credits.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>No credits in database</div>
                ) : (
                  comparisonResult.credits.map((component, index) => {
                    const needsReview = component.status !== 'match';
                    return (
                      <ComponentCard key={component.id || index} component={component}
                        onEdit={(c) => handleEditComponent('credits', c)}
                        {...(needsReview ? { reviewed: reviewedItems.credits.includes(index), onToggleReview: () => toggleReviewedItem('credits', index) } : {})}
                      />
                    );
                  })
                )}
              </div>
            )}

            {activeComparisonTab === 'perks' && (
              <div className="components-list">
                {comparisonResult.perks.some(p => p.status !== 'match') && (
                  <div className="mark-all-bar">
                    <span className={`review-count ${reviewedItems.perks.length >= comparisonResult.perks.filter(p => p.status !== 'match').length ? 'all-done' : ''}`}>
                      {reviewedItems.perks.length}/{comparisonResult.perks.filter(p => p.status !== 'match').length} reviewed
                    </span>
                    <Button size="sm" variant="outline" onClick={() => markAllInSection('perks')}
                      disabled={comparisonResult.perks.every((p, i) => p.status === 'match' || reviewedItems.perks.includes(i))}
                    ><Check size={14} /> Mark all reviewed</Button>
                    {reviewedItems.perks.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => clearAllInSection('perks')}
                      ><X size={14} /> Clear all</Button>
                    )}
                  </div>
                )}
                {comparisonResult.perks.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>No perks in database</div>
                ) : (
                  comparisonResult.perks.map((component, index) => {
                    const needsReview = component.status !== 'match';
                    return (
                      <ComponentCard key={component.id || index} component={component}
                        onEdit={(c) => handleEditComponent('perks', c)}
                        {...(needsReview ? { reviewed: reviewedItems.perks.includes(index), onToggleReview: () => toggleReviewedItem('perks', index) } : {})}
                      />
                    );
                  })
                )}
              </div>
            )}

            {activeComparisonTab === 'multipliers' && (
              <div className="components-list">
                {comparisonResult.multipliers.some(m => m.status !== 'match') && (
                  <div className="mark-all-bar">
                    <span className={`review-count ${reviewedItems.multipliers.length >= comparisonResult.multipliers.filter(m => m.status !== 'match').length ? 'all-done' : ''}`}>
                      {reviewedItems.multipliers.length}/{comparisonResult.multipliers.filter(m => m.status !== 'match').length} reviewed
                    </span>
                    <Button size="sm" variant="outline" onClick={() => markAllInSection('multipliers')}
                      disabled={comparisonResult.multipliers.every((m, i) => m.status === 'match' || reviewedItems.multipliers.includes(i))}
                    ><Check size={14} /> Mark all reviewed</Button>
                    {reviewedItems.multipliers.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => clearAllInSection('multipliers')}
                      ><X size={14} /> Clear all</Button>
                    )}
                  </div>
                )}
                {comparisonResult.multipliers.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>No multipliers in database</div>
                ) : (
                  comparisonResult.multipliers.map((component, index) => {
                    const needsReview = component.status !== 'match';
                    return (
                      <ComponentCard key={component.id || index} component={component}
                        onEdit={(c) => handleEditComponent('multipliers', c)}
                        {...(needsReview ? { reviewed: reviewedItems.multipliers.includes(index), onToggleReview: () => toggleReviewedItem('multipliers', index) } : {})}
                      />
                    );
                  })
                )}
              </div>
            )}

            {activeComparisonTab === 'urls' && urlResults && (
              <div className="url-list">
                {urlResults.some(u => u.status !== 'ok' || u.truncated) && (
                  <div className="mark-all-bar">
                    <span className={`review-count ${reviewedItems.urls.length >= urlResults.filter(u => u.status !== 'ok' || u.truncated).length ? 'all-done' : ''}`}>
                      {reviewedItems.urls.length}/{urlResults.filter(u => u.status !== 'ok' || u.truncated).length} reviewed
                    </span>
                    <Button size="sm" variant="outline" onClick={() => markAllInSection('urls')}
                      disabled={urlResults.every((u, i) => (u.status === 'ok' && !u.truncated) || reviewedItems.urls.includes(i))}
                    ><Check size={14} /> Mark all reviewed</Button>
                    {reviewedItems.urls.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => clearAllInSection('urls')}
                      ><X size={14} /> Clear all</Button>
                    )}
                  </div>
                )}
                {urlResults.map((urlResult, index) => {
                  const needsReview = urlResult.status !== 'ok' || urlResult.truncated;
                  return (
                  <div key={index} className="url-row">
                    <span className="url-status-icon">
                      {urlResult.status === 'ok' && !urlResult.truncated && (
                        <CheckCircle size={16} style={{ color: '#16a34a' }} />
                      )}
                      {urlResult.status === 'ok' && urlResult.truncated && (
                        <AlertTriangle size={16} style={{ color: '#ca8a04' }} />
                      )}
                      {(urlResult.status === 'broken' || urlResult.status === 'stale') && (
                        <XCircle size={16} style={{ color: '#dc2626' }} />
                      )}
                    </span>
                    <div className="url-details">
                      <div className="url-text">{urlResult.url}</div>
                      <div className="url-meta">
                        {urlResult.source.replace('cloudflare-', 'CF /')} - {formatTokenCount(urlResult.contentTokens)} tokens
                        {urlResult.status !== 'ok' && ` - ${urlResult.status.toUpperCase()}`}
                      </div>
                      {urlResult.truncated && urlResult.contentTokensOriginal && (
                        <div className="url-meta" style={{ color: '#ca8a04' }}>
                          Truncated: {formatTokenCount(urlResult.contentTokens)} of {formatTokenCount(urlResult.contentTokensOriginal)} tokens used
                        </div>
                      )}
                      {urlResult.error && (
                        <div className="url-meta" style={{ color: '#dc2626' }}>{urlResult.error}</div>
                      )}
                      {(urlResult.status === 'broken' || urlResult.status === 'stale') && (
                        <div className="url-actions" style={{ marginTop: '0.375rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {urlResult.suggestedUrl && !urlResult.suggestedUrlDismissed && (
                            <>
                              <div className="url-meta" style={{ color: '#374151', width: '100%' }}>
                                Suggested: {urlResult.suggestedUrl}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveSuggestedUrl(index)}
                                disabled={updatingUrlIndex === index}
                              >
                                Approve New URL
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEnterManualUrl()}
                                disabled={updatingUrlIndex === index}
                              >
                                Enter Manually
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDismissSuggestedUrl(index)}
                                disabled={updatingUrlIndex === index}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          {(!urlResult.suggestedUrl || urlResult.suggestedUrlDismissed) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEnterManualUrl()}
                            >
                              Enter Manually
                            </Button>
                          )}
                        </div>
                      )}
                      {needsReview && (
                        <label className="review-toggle" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={reviewedItems.urls.includes(index)} onChange={() => toggleReviewedItem('urls', index)} />
                          <span>Reviewed</span>
                        </label>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}


      {/* Inline Edit Modals */}
      {review && editModalType === 'credits' && (
        <CreditModal
          key={`credit-modal-${editModalKey}`}
          open={true}
          onOpenChange={(open) => { if (!open) setEditModalType(null); }}
          referenceCardId={review.referenceCardId}
          credit={editingCredit}
          onSuccess={() => {
            setEditModalType(null);
            toast.success('Credit saved');
          }}
          initialJson={editInitialJson}
        />
      )}

      {review && editModalType === 'perks' && (
        <PerkModal
          key={`perk-modal-${editModalKey}`}
          open={true}
          onOpenChange={(open) => { if (!open) setEditModalType(null); }}
          referenceCardId={review.referenceCardId}
          perk={editingPerk}
          onSuccess={() => {
            setEditModalType(null);
            toast.success('Perk saved');
          }}
          initialJson={editInitialJson}
        />
      )}

      {review && editModalType === 'multipliers' && (
        <MultiplierModal
          key={`multiplier-modal-${editModalKey}`}
          open={true}
          onOpenChange={(open) => { if (!open) setEditModalType(null); }}
          referenceCardId={review.referenceCardId}
          multiplier={editingMultiplier}
          onSuccess={() => {
            setEditModalType(null);
            toast.success('Multiplier saved');
          }}
          initialJson={editInitialJson}
        />
      )}

      {/* Scraped Content Viewer Modal */}
      <Dialog
        open={contentViewerOpen}
        onOpenChange={setContentViewerOpen}
        title="Scraped Content"
        description={contentViewerUrl}
      >
        <textarea
          readOnly
          value={contentViewerText}
          style={{
            width: '100%',
            minHeight: '400px',
            padding: '0.75rem',
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            resize: 'vertical',
            background: '#f8fafc',
          }}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(contentViewerText);
                setContentCopied(true);
                toast.success('Content copied to clipboard');
                setTimeout(() => setContentCopied(false), 2000);
              } catch {
                toast.error('Failed to copy');
              }
            }}
          >
            {contentCopied ? <Check size={14} /> : <Copy size={14} />}
            {contentCopied ? 'Copied' : 'Copy All'}
          </Button>
          <Button onClick={() => setContentViewerOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {urlModalCardName && (
        <UrlManagementModal
          open={urlModalOpen}
          onOpenChange={setUrlModalOpen}
          cardName={urlModalCardName}
          onSuccess={(updatedCardName) => {
            setUrlModalCardName(updatedCardName);
          }}
        />
      )}
    </div>
  );
}
