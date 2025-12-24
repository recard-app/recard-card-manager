import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';
import type { ComparisonRequest, ComparisonResponse } from '@/types/comparison-types';

/**
 * Comparison Service
 * Handles API calls for the card comparison feature
 */
export class ComparisonService {
  /**
   * Analyze card data against website text
   * @param request The comparison request containing card ID, version ID, and website text
   * @returns The comparison analysis results
   */
  static async analyze(request: ComparisonRequest): Promise<ComparisonResponse> {
    const response = await apiClient.post<ComparisonResponse>(
      API_ROUTES.COMPARISON.ANALYZE,
      request
    );
    return response.data;
  }
}
