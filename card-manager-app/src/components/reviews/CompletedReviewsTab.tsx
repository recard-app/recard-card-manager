import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronRight, ChevronDown, RotateCcw, CheckCircle, XCircle,
  AlertTriangle, Plus, Minus, X, ClipboardCheck, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ReviewService } from '@/services/review.service';
import type { ReviewResult } from '@/types/review-types';
import './CompletedReviewsTab.scss';

type FilterMode = 'all' | 'attention' | 'failed' | 'healthy' | 'successful';

/** Default window: last 90 days */
function get90DaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

/** Group reviews by day (local timezone) */
function groupByDay(reviews: ReviewResult[]): { date: string; label: string; reviews: ReviewResult[] }[] {
  const groups = new Map<string, ReviewResult[]>();

  for (const review of reviews) {
    const timestamp = review.reviewedAt || review.queuedAt;
    if (!timestamp) continue;

    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) continue;

    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(review);
  }

  // Sort days descending
  const sortedDays = Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, reviews]) => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      let label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      if (isToday) label = `Today - ${label}`;
      else if (isYesterday) label = `Yesterday - ${label}`;

      // Sort reviews within each day by reviewedAt descending (newest first)
      reviews.sort((a, b) => {
        const aTime = new Date(a.reviewedAt || a.queuedAt).getTime();
        const bTime = new Date(b.reviewedAt || b.queuedAt).getTime();
        return bTime - aTime;
      });

      return { date: dateKey, label, reviews };
    });

  return sortedDays;
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getHealthBadge(review: ReviewResult): { label: string; className: string } {
  if (review.status === 'failed') return { label: 'FAIL', className: 'failed' };
  if (review.status === 'skipped') return { label: 'SKIP', className: 'failed' };
  if (!review.health) return { label: '?', className: 'attention' };

  const score = review.health.score;
  if (score === 100) return { label: `${score}%`, className: 'healthy' };
  if (score >= 80) return { label: `${score}%`, className: 'attention' };
  return { label: `${score}%`, className: 'poor' };
}

function IssueSummary({ review }: { review: ReviewResult }) {
  if (review.status === 'failed' || review.status === 'skipped') {
    return null;
  }
  if (!review.health) return null;

  const { health } = review;
  const hasIssues = health.mismatches > 0 || health.outdated > 0 || health.new > 0 || health.missing > 0 || health.questionable > 0;

  if (!hasIssues) {
    return <span className="issue-item match"><CheckCircle size={13} /> 0 issues</span>;
  }

  return (
    <>
      {(health.mismatches > 0 || health.outdated > 0) && (
        <span className="issue-item mismatch"><XCircle size={13} /> {health.mismatches + health.outdated}</span>
      )}
      {health.new > 0 && (
        <span className="issue-item new"><Plus size={13} /> {health.new}</span>
      )}
      {health.missing > 0 && (
        <span className="issue-item missing"><Minus size={13} /> {health.missing}</span>
      )}
      {health.questionable > 0 && (
        <span className="issue-item questionable"><AlertTriangle size={13} /> {health.questionable}</span>
      )}
    </>
  );
}

export function CompletedReviewsTab() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const fetchIdRef = useRef(0);

  const fetchReviews = useCallback(async (
    cursor?: string,
    useRecentWindow: boolean = !cursor
  ) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    // Track fetch ID to discard stale responses from concurrent requests
    const fetchId = ++fetchIdRef.current;

    try {
      // Map filter mode to backend status param
      // 'attention' fetches all statuses and filters client-side
      let statusParam: string;
      switch (filterMode) {
        case 'failed':
          statusParam = 'failed,skipped';
          break;
        case 'healthy':
        case 'successful':
          statusParam = 'success';
          break;
        case 'all':
        case 'attention':
        default:
          statusParam = 'success,failed,skipped';
          break;
      }

      const result = await ReviewService.getResults({
        limit: 100,
        cursor,
        status: statusParam,
        dateFrom: useRecentWindow ? get90DaysAgo() : undefined,
      });

      // Discard result if a newer fetch has been started
      if (fetchId !== fetchIdRef.current) return;

      if (isLoadMore) {
        setReviews(prev => [...prev, ...result.results]);
      } else {
        setReviews(result.results);
      }
      setNextCursor(result.nextCursor);
    } catch {
      if (fetchId !== fetchIdRef.current) return;
      toast.error('Failed to load reviews');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filterMode]);

  // Reset collapsed state and refetch when filter changes
  useEffect(() => {
    setCollapsedDays(new Set());
    fetchReviews();
  }, [fetchReviews]);

  const handleRetry = async (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await ReviewService.queueReviews([cardId]);
      if (result.reviewIds.length > 0) {
        toast.success('Review queued');
      } else {
        const reason = result.skipped[0]?.reason ?? 'Card was skipped';
        toast.info(`Review not queued: ${reason}`);
      }
    } catch {
      toast.error('Failed to queue review');
    }
  };

  const handleDelete = async (reviewId: string, cardName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete review for "${cardName}"? This cannot be undone.`)) return;

    try {
      await ReviewService.deleteReview(reviewId);
      toast.success('Review deleted');
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch {
      toast.error('Failed to delete review');
    }
  };

  // Client-side search filter
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // Search filter (client-side)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.cardName.toLowerCase().includes(q) ||
        r.cardIssuer.toLowerCase().includes(q)
      );
    }

    // Attention filter (client-side -- can't do this server-side easily)
    if (filterMode === 'attention') {
      filtered = filtered.filter(r =>
        r.status === 'failed' || r.status === 'skipped' ||
        (r.health && r.health.score < 100)
      );
    } else if (filterMode === 'healthy') {
      filtered = filtered.filter(r => r.status === 'success' && r.health?.score === 100);
    }

    return filtered;
  }, [reviews, searchQuery, filterMode]);

  const dayGroups = useMemo(() => groupByDay(filteredReviews), [filteredReviews]);

  // Default collapse behavior: auto-collapse day groups beyond the first two
  // only when collapsedDays is empty (fresh load / filter change).
  useEffect(() => {
    setCollapsedDays(prev => {
      // Don't override user's manual expand/collapse choices
      if (prev.size > 0 || dayGroups.length <= 2) {
        return prev;
      }

      const next = new Set<string>();
      dayGroups.slice(2).forEach(group => next.add(group.date));
      return next;
    });
  }, [dayGroups]);

  const toggleDay = (date: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="completed-reviews-tab">
        <div className="loading-state">
          <Loader2 size={24} className="spinner" />
          <span>Loading reviews...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="completed-reviews-tab">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={14} className="search-icon" />
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
            { value: 'all', label: 'All' },
            { value: 'attention', label: 'Needs Attention' },
            { value: 'successful', label: 'Successful' },
            { value: 'failed', label: 'Failed' },
            { value: 'healthy', label: 'Healthy (100%)' },
          ]}
        />
      </div>

      {dayGroups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ClipboardCheck size={40} />
          </div>
          <h3>No reviews found</h3>
          <p>
            {searchQuery || filterMode !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Completed reviews will appear here.'}
          </p>
        </div>
      ) : (
        <div className="day-groups">
          {dayGroups.map(group => {
            const isCollapsed = collapsedDays.has(group.date);

            const dayCost = group.reviews.reduce((sum, r) => sum + (r.usage?.cost?.total ?? 0), 0);

            return (
              <div key={group.date} className={`day-group ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="day-header" onClick={() => toggleDay(group.date)}>
                  <div className="day-header-left">
                    {isCollapsed
                      ? <ChevronRight size={16} className="chevron" />
                      : <ChevronDown size={16} className="chevron" />
                    }
                    <span className="day-label">{group.label}</span>
                  </div>
                  <div className="day-header-right">
                    {dayCost > 0 && (
                      <span className="day-cost">${dayCost.toFixed(2)}</span>
                    )}
                    <span className="day-count">{group.reviews.length} review{group.reviews.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="day-table">
                    <div className="table-header">
                      <span className="col-time">Time</span>
                      <span className="col-card">Card</span>
                      <span className="col-review-status">Status</span>
                      <span className="col-health">Health</span>
                      <span className="col-issues">Issues</span>
                      <span className="col-cost">Cost</span>
                      <span className="col-actions"></span>
                    </div>
                    <div className="table-body">
                      {group.reviews.map(review => {
                        const badge = getHealthBadge(review);

                        return (
                          <div
                            key={review.id}
                            className="review-row"
                            onClick={() => navigate(`/reviews/${review.id}`)}
                          >
                            <span className="col-time">{formatTime(review.reviewedAt || review.queuedAt)}</span>
                            <span className="col-card">
                              <span
                                className="card-color-dot"
                                style={{
                                  background: review.cardPrimaryColor
                                    ? `linear-gradient(135deg, ${review.cardPrimaryColor} 50%, ${review.cardSecondaryColor || review.cardPrimaryColor} 50%)`
                                    : '#d1d5db',
                                }}
                              />
                              <span className="card-name-text">{review.cardName}</span>
                              <span className="card-issuer-text">{review.cardIssuer}</span>
                            </span>
                            <span className="col-review-status">
                              <span className={`review-status-badge ${review.reviewStatus === 'reviewed' ? 'reviewed' : 'not-reviewed'}`}>
                                {review.reviewStatus === 'reviewed' ? 'Reviewed' : 'Not Reviewed'}
                              </span>
                            </span>
                            <span className="col-health">
                              <span className={`health-badge ${badge.className}`}>{badge.label}</span>
                            </span>
                            <span className="col-issues">
                              <IssueSummary review={review} />
                              {(review.status === 'failed' || review.status === 'skipped') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleRetry(review.referenceCardId, e)}
                                  title="Retry review"
                                >
                                  <RotateCcw size={14} />
                                  Retry
                                </Button>
                              )}
                            </span>
                            <span className="col-cost">
                              {review.usage?.cost?.total != null
                                ? `$${review.usage.cost.total.toFixed(2)}`
                                : '--'}
                            </span>
                            <span className="col-actions">
                              <button
                                className="delete-btn"
                                onClick={(e) => handleDelete(review.id, review.cardName, e)}
                                title="Delete review"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {nextCursor && (
        <div className="load-more">
          <Button
            variant="outline"
            onClick={() => fetchReviews(nextCursor, false)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load older reviews'}
          </Button>
        </div>
      )}

      {dayGroups.length > 0 && (
        <div className="date-range-footer">
          Showing reviews from {dayGroups[dayGroups.length - 1].label.replace(/^(Today|Yesterday) - /, '')} to {dayGroups[0].label.replace(/^(Today|Yesterday) - /, '')}
        </div>
      )}
    </div>
  );
}
