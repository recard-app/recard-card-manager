import { useState, useEffect, useCallback } from 'react';
import { X, ListChecks, Loader2, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ReviewService } from '@/services/review.service';
import { QueueReviewsModal } from '@/components/Modals/QueueReviewsModal';
import type { ReviewResult } from '@/types/review-types';
import './QueueReviewsTab.scss';

/** Polling interval for active reviews (ms) */
const POLL_INTERVAL = 5000;

export function QueueReviewsTab() {
  const [activeReviews, setActiveReviews] = useState<ReviewResult[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);

  const fetchActiveReviews = useCallback(async () => {
    try {
      const reviews = await ReviewService.getActiveReviews();
      setActiveReviews(reviews);
    } catch {
      // Silent failure -- will retry on next poll
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchActiveReviews();
  }, [fetchActiveReviews]);

  // Poll for active reviews -- always poll while on this tab
  // Faster when active (5s), slower when idle (15s)
  useEffect(() => {
    const interval = setInterval(
      fetchActiveReviews,
      activeReviews.length > 0 ? POLL_INTERVAL : POLL_INTERVAL * 3
    );
    return () => clearInterval(interval);
  }, [activeReviews.length, fetchActiveReviews]);

  const handleCancelOne = async (reviewId: string, cardName: string) => {
    if (!window.confirm(`Cancel review for "${cardName}"?`)) return;

    setCancellingId(reviewId);
    try {
      await ReviewService.cancelReview(reviewId);
      toast.success(`Cancelled review for ${cardName}`);
      fetchActiveReviews();
    } catch {
      toast.error('Failed to cancel review');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelAll = async () => {
    if (!window.confirm(`Cancel all ${activeReviews.length} pending review${activeReviews.length !== 1 ? 's' : ''}?`)) return;

    setCancellingAll(true);
    try {
      const result = await ReviewService.cancelAllReviews();
      toast.success(`Cancelled ${result.cancelled} review${result.cancelled !== 1 ? 's' : ''}`);
      fetchActiveReviews();
    } catch {
      toast.error('Failed to cancel reviews');
    } finally {
      setCancellingAll(false);
    }
  };

  const runningReviews = activeReviews.filter(r => r.status === 'running');
  const queuedReviews = activeReviews.filter(r => r.status === 'queued');

  return (
    <div className="queue-reviews-tab">
      {/* Action bar */}
      <div className="queue-actions-bar">
        <Button onClick={() => setModalOpen(true)}>
          Queue Reviews
        </Button>
        {activeReviews.length > 0 && (
          <div className="queue-stats">
            {runningReviews.length > 0 && (
              <span className="stat-item active">
                <span className="stat-number">{runningReviews.length}</span>
                <span className="stat-label">running</span>
              </span>
            )}
            {queuedReviews.length > 0 && (
              <span className="stat-item">
                <span className="stat-number">{queuedReviews.length}</span>
                <span className="stat-label">queued</span>
              </span>
            )}
          </div>
        )}
      </div>

      {activeReviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ListChecks size={40} />
          </div>
          <h3>No reviews in the queue</h3>
          <p>Queue reviews to automatically compare card data against issuer websites.</p>
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Queue Reviews
          </Button>
        </div>
      ) : (
        <div className="queue-sections">
          {/* Running section */}
          {runningReviews.length > 0 && (
            <div className="queue-section">
              <div className="section-header">
                <div className="section-title-group">
                  <Play size={14} className="section-icon running" />
                  <h3>Running</h3>
                  <span className="section-count">{runningReviews.length}</span>
                </div>
                <button
                  className="cancel-all-btn"
                  onClick={handleCancelAll}
                  disabled={cancellingAll}
                >
                  {cancellingAll ? 'Cancelling...' : 'Cancel All'}
                </button>
              </div>
              <div className="section-items">
                {runningReviews.map(review => (
                  <div key={review.id} className="review-item running">
                    <div className="review-item-left">
                      <Loader2 size={16} className="spinner" />
                      <span
                        className="card-color-dot"
                        style={{
                          background: review.cardPrimaryColor
                            ? `linear-gradient(135deg, ${review.cardPrimaryColor} 50%, ${review.cardSecondaryColor || review.cardPrimaryColor} 50%)`
                            : '#d1d5db',
                        }}
                      />
                      <span className="review-card-name">{review.cardName}</span>
                      {review.scrapePreset && review.scrapePreset !== 'default' && (
                        <span className="scrape-preset-badge">{review.scrapePreset}</span>
                      )}
                    </div>
                    <div className="review-item-right">
                      {review.currentStep && (
                        <span className="review-step">{review.currentStep}</span>
                      )}
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelOne(review.id, review.cardName)}
                        disabled={cancellingId === review.id}
                        title="Cancel this review"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queued section */}
          {queuedReviews.length > 0 && (
            <div className="queue-section">
              <div className="section-header">
                <div className="section-title-group">
                  <Clock size={14} className="section-icon queued" />
                  <h3>Waiting</h3>
                  <span className="section-count">{queuedReviews.length}</span>
                </div>
                {runningReviews.length === 0 && (
                  <button
                    className="cancel-all-btn"
                    onClick={handleCancelAll}
                    disabled={cancellingAll}
                  >
                    {cancellingAll ? 'Cancelling...' : 'Cancel All'}
                  </button>
                )}
              </div>
              <div className="section-items">
                {queuedReviews.map((review, index) => (
                  <div key={review.id} className="review-item queued">
                    <div className="review-item-left">
                      <span className="queue-position">{index + 1}</span>
                      <span
                        className="card-color-dot"
                        style={{
                          background: review.cardPrimaryColor
                            ? `linear-gradient(135deg, ${review.cardPrimaryColor} 50%, ${review.cardSecondaryColor || review.cardPrimaryColor} 50%)`
                            : '#d1d5db',
                        }}
                      />
                      <span className="review-card-name">{review.cardName}</span>
                      {review.scrapePreset && review.scrapePreset !== 'default' && (
                        <span className="scrape-preset-badge">{review.scrapePreset}</span>
                      )}
                    </div>
                    <div className="review-item-right">
                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelOne(review.id, review.cardName)}
                        disabled={cancellingId === review.id}
                        title="Cancel this review"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <QueueReviewsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchActiveReviews}
      />
    </div>
  );
}
