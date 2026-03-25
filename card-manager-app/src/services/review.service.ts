import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';
import type {
  ReviewResult,
  QueueReviewsResponse,
  ReviewResultsResponse,
} from '@/types/review-types';

/**
 * Review Service
 * Handles API calls for the automated card review system.
 */
export class ReviewService {
  /**
   * Queue reviews for specific cards.
   */
  static async queueReviews(cardIds: string[]): Promise<QueueReviewsResponse> {
    const response = await apiClient.post<QueueReviewsResponse>(
      API_ROUTES.REVIEWS.QUEUE,
      { cardIds }
    );
    return response.data;
  }

  /**
   * Queue reviews for all cards.
   */
  static async queueAllReviews(): Promise<QueueReviewsResponse> {
    const response = await apiClient.post<QueueReviewsResponse>(
      API_ROUTES.REVIEWS.QUEUE,
      { scope: 'all' }
    );
    return response.data;
  }

  /**
   * Get review results with pagination and filters.
   */
  static async getResults(options?: {
    limit?: number;
    cursor?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ReviewResultsResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.status) params.set('status', options.status);
    if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
    if (options?.dateTo) params.set('dateTo', options.dateTo);

    const queryString = params.toString();
    const url = queryString
      ? `${API_ROUTES.REVIEWS.RESULTS}?${queryString}`
      : API_ROUTES.REVIEWS.RESULTS;

    const response = await apiClient.get<ReviewResultsResponse>(url);
    return response.data;
  }

  /**
   * Get a single review result by ID.
   */
  static async getResult(id: string): Promise<ReviewResult> {
    const response = await apiClient.get<ReviewResult>(
      API_ROUTES.REVIEWS.RESULT_DETAIL(id)
    );
    return response.data;
  }

  /**
   * Get currently active (queued + running) reviews.
   */
  static async getActiveReviews(): Promise<ReviewResult[]> {
    const response = await apiClient.get<ReviewResult[]>(
      API_ROUTES.REVIEWS.ACTIVE
    );
    return response.data;
  }

  /**
   * Get latest successful review for a specific card.
   */
  static async getLatestForCard(cardId: string): Promise<ReviewResult | null> {
    const response = await apiClient.get<ReviewResult | null>(
      API_ROUTES.REVIEWS.LATEST(cardId)
    );
    return response.data;
  }

  /**
   * Get last reviewed dates for all cards.
   * Returns a map of referenceCardId -> ISO timestamp.
   */
  static async getLastReviewedDates(): Promise<Record<string, string>> {
    const response = await apiClient.get<Record<string, string>>(
      API_ROUTES.REVIEWS.LAST_REVIEWED_DATES
    );
    return response.data;
  }

  /**
   * Get last run dates for all cards (any successful review, regardless of human review status).
   * Returns a map of referenceCardId -> ISO timestamp.
   */
  static async getLastRunDates(): Promise<Record<string, string>> {
    const response = await apiClient.get<Record<string, string>>(
      API_ROUTES.REVIEWS.LAST_RUN_DATES
    );
    return response.data;
  }

  /**
   * Dismiss a suggested URL replacement on a review result.
   */
  static async dismissUrl(resultId: string, urlIndex: number): Promise<void> {
    await apiClient.patch(
      API_ROUTES.REVIEWS.DISMISS_URL(resultId),
      { urlIndex }
    );
  }

  /**
   * Update the human review status and/or reviewed item indices.
   */
  static async updateReviewStatus(
    resultId: string,
    payload: {
      reviewStatus?: 'not_reviewed' | 'reviewed';
      reviewedItems?: {
        cardDetails?: number[];
        credits?: number[];
        perks?: number[];
        multipliers?: number[];
        urls?: number[];
      };
    }
  ): Promise<void> {
    await apiClient.patch(
      API_ROUTES.REVIEWS.REVIEW_STATUS(resultId),
      payload
    );
  }

  /**
   * Cancel a single queued or running review.
   */
  static async cancelReview(resultId: string): Promise<void> {
    await apiClient.post(API_ROUTES.REVIEWS.CANCEL(resultId));
  }

  /**
   * Cancel all queued and running reviews.
   */
  static async cancelAllReviews(): Promise<{ cancelled: number }> {
    const response = await apiClient.post<{ cancelled: number }>(
      API_ROUTES.REVIEWS.CANCEL_ALL
    );
    return response.data;
  }

  /**
   * Delete a review result.
   */
  static async deleteReview(resultId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.REVIEWS.DELETE(resultId));
  }
}
