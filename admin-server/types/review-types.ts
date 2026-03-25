/**
 * ================================================================================================
 * REVIEW TYPES
 * ================================================================================================
 *
 * Type definitions for the automated card review system.
 * These types define the data model for review batches, individual card review results,
 * URL scraping results, health scoring, and usage/cost tracking.
 *
 * Firestore collections:
 * - card_review_batches: Backend orchestration for batch processing
 * - card_review_results: Individual card review results (primary collection, drives the UI)
 *
 * ================================================================================================
 */

import type {
  FieldComparisonResult,
  ComponentComparisonResult,
} from '../constants/ai-response-schema/comparison-schema';

// ============================================
// STATUS TYPES
// ============================================

/**
 * Status of an individual card review
 */
export type ReviewStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped';

/**
 * Status of a review batch (backend orchestration)
 */
export type BatchStatus = 'queued' | 'running' | 'completed' | 'failed' | 'partial';

/**
 * How a review was triggered
 */
export type ReviewTrigger = 'scheduled' | 'manual';

/**
 * Status of a scraped URL
 */
export type UrlStatus = 'ok' | 'redirected' | 'broken' | 'stale';

/**
 * Which scraping source was used for a URL
 */
export type ScrapeSource = 'firecrawl' | 'cloudflare-markdown' | 'cloudflare-content' | 'jina';

// ============================================
// URL SCRAPING RESULTS
// ============================================

/**
 * Result of scraping a single URL during a review
 */
export interface UrlResult {
  url: string;
  status: UrlStatus;
  source: ScrapeSource;                  // Which scraper succeeded
  contentTokens: number;                 // Estimated token count of scraped content
  contentTokensOriginal?: number;        // Original token count before truncation (only set if truncated)
  truncated: boolean;                    // True if content was truncated to fit the 30K total budget
  browserTimeMs?: number;               // Cloudflare X-Browser-Ms-Used header value (Cloudflare sources only)
  redirectedTo?: string;                 // Final URL after redirect (if status is "redirected")
  suggestedUrl?: string;                 // Auto-discovered replacement URL (if status is "broken" or "stale")
  suggestedUrlDismissed?: boolean;       // True if user dismissed the suggestion
  error?: string;                        // Error message if scraping failed for this URL
  attemptErrors?: string[];              // Ordered errors from each scraper attempt (Firecrawl, Cloudflare markdown/content, Jina)
  scrapedContent?: string;               // The actual scraped markdown content from this URL
}

// ============================================
// HEALTH SCORING
// ============================================

/**
 * Computed health metrics for a card review result.
 * Used for quick filtering and sorting in the UI.
 *
 * Health score formula: (matchCount / totalItemCount) * 100
 * - matchCount = card detail fields with status "match" + components with status "match"
 * - totalItemCount = all card detail fields + all components
 * - Items with status "missing_from_website" on card details are excluded from the total
 * - Rounded to nearest integer
 */
export interface ReviewHealth {
  score: number;               // 0-100, percentage of matches
  mismatches: number;          // Card detail mismatches + component mismatches
  outdated: number;            // Components with status "outdated"
  new: number;                 // Components found on website but not in database
  missing: number;             // Components in database but not on website
  questionable: number;        // Items needing human review
}

// ============================================
// USAGE & COST TRACKING
// ============================================

/**
 * Gemini API pricing constants (per 1M tokens, in USD)
 *
 * Source: https://ai.google.dev/gemini-api/docs/pricing
 */
export const GEMINI_MODEL_PRICING: Record<string, {
  inputPerMToken: number;
  inputLargePerMToken: number;
  outputPerMToken: number;
  outputLargePerMToken: number;
}> = {
  'gemini-3.1-pro-preview': { inputPerMToken: 2.00, inputLargePerMToken: 4.00, outputPerMToken: 12.00, outputLargePerMToken: 18.00 },
  'gemini-2.5-pro':         { inputPerMToken: 1.25, inputLargePerMToken: 2.50, outputPerMToken: 10.00, outputLargePerMToken: 15.00 },
  'gemini-3-flash-preview': { inputPerMToken: 0.50, inputLargePerMToken: 0.50, outputPerMToken: 3.00,  outputLargePerMToken: 3.00  },
};

/** Default pricing (gemini-3.1-pro-preview) for backwards compatibility */
export const GEMINI_PRICING = GEMINI_MODEL_PRICING['gemini-3.1-pro-preview'];

export const SEARCH_GROUNDING_PRICING = {
  freeQueries: 5000,
  perKQueries: 14.00,
} as const;

/**
 * Per-URL scraping usage detail
 */
export interface ScrapeUsageEntry {
  url: string;
  source: ScrapeSource;
  contentTokens: number;
  browserTimeMs?: number;                // Cloudflare only
}

/**
 * Full usage and cost tracking for a single card review
 */
export interface ReviewUsage {
  // Scraping
  scraping: {
    totalContentTokens: number;
    urlBreakdown: ScrapeUsageEntry[];
  };
  // Gemini comparison
  gemini: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    model: string;
  };
  // Gemini search grounding (URL replacement, if triggered)
  searchGrounding?: {
    inputTokens: number;
    outputTokens: number;
    searchQueries: number;               // Number of Google Search queries executed
  };
  // Computed cost (USD)
  cost: {
    geminiInput: number;
    geminiOutput: number;
    searchGrounding: number;
    total: number;
  };
}

/**
 * Calculates the cost of a review from token counts using Gemini pricing.
 */
export function calculateReviewCost(
  geminiInputTokens: number,
  geminiOutputTokens: number,
  searchGroundingQueries: number = 0,
  model?: string
): ReviewUsage['cost'] {
  const pricing = (model && GEMINI_MODEL_PRICING[model]) || GEMINI_PRICING;

  // Determine pricing tier based on input size
  const inputRate = geminiInputTokens > 200_000
    ? pricing.inputLargePerMToken
    : pricing.inputPerMToken;
  const outputRate = geminiInputTokens > 200_000
    ? pricing.outputLargePerMToken
    : pricing.outputPerMToken;

  const geminiInput = (geminiInputTokens / 1_000_000) * inputRate;
  const geminiOutput = (geminiOutputTokens / 1_000_000) * outputRate;

  // Search grounding: $0.014 per query ($14/1K queries)
  const searchGrounding = searchGroundingQueries * (SEARCH_GROUNDING_PRICING.perKQueries / 1000);

  return {
    geminiInput: Math.round(geminiInput * 1000) / 1000,
    geminiOutput: Math.round(geminiOutput * 1000) / 1000,
    searchGrounding,
    total: Math.round((geminiInput + geminiOutput + searchGrounding) * 1000) / 1000,
  };
}

// ============================================
// REVIEW RESULT (Primary collection)
// ============================================

/**
 * A single card review result stored in card_review_results collection.
 * This is the primary data model -- the UI displays these directly,
 * grouped by day using the queuedAt timestamp.
 */
export interface ReviewResult {
  id: string;
  batchId?: string;                      // Optional link to parent batch (for progress tracking)
  referenceCardId: string;
  versionId: string;                     // Active version at queue time (snapshotted)
  cardName: string;                      // Denormalized for display
  cardIssuer: string;                    // Denormalized for display
  cardPrimaryColor?: string;             // Denormalized for display
  cardSecondaryColor?: string;           // Denormalized for display
  status: ReviewStatus;
  currentStep?: string;                  // E.g., "Scraping URLs...", "Running comparison..." (set while running, cleared on completion)
  failureReason?: string;               // If status is "failed"
  skipReason?: string;                   // If status is "skipped" (e.g., "No website URLs configured")
  triggeredBy: ReviewTrigger;
  queuedAt: string;                      // ISO timestamp (when the review was requested)
  reviewedAt?: string;                   // ISO timestamp (when comparison completed)
  websiteUrls: string[];                 // URLs that were scraped
  contentLength: number;                 // Total chars of text fed to comparison

  // Per-URL scraping results
  urlResults?: UrlResult[];

  // Comparison result (same structure as ComparisonResponse, with proposed fixes)
  comparisonResult?: {
    summary: string;
    modelUsed: string;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
      thinkingTokens?: number;
    };
    cardDetails: FieldComparisonResult[];
    perks: ComponentComparisonResult[];
    credits: ComponentComparisonResult[];
    multipliers: ComponentComparisonResult[];
  };

  // Computed health metrics for quick filtering
  health?: ReviewHealth;

  // Usage and cost tracking
  usage?: ReviewUsage;

  // Human review tracking
  reviewStatus?: 'not_reviewed' | 'reviewed';
  reviewedItems?: {
    cardDetails?: number[];
    credits?: number[];
    perks?: number[];
    multipliers?: number[];
    urls?: number[];
  };
}

// ============================================
// REVIEW BATCH (Backend orchestration)
// ============================================

/**
 * A review batch in the card_review_batches collection.
 * This is a backend concept for tracking background processing.
 * NOT exposed in the UI as a grouping unit -- the UI shows individual card reviews.
 */
export interface ReviewBatch {
  id: string;
  status: BatchStatus;
  triggeredBy: ReviewTrigger;
  triggeredByUser?: string;              // Email, if manually triggered
  createdAt: string;                     // ISO timestamp (when batch was queued)
  startedAt?: string;                    // ISO timestamp (when processing began)
  completedAt?: string;                  // ISO timestamp (when all cards done)
  cardIds: string[];                     // Which cards to review (referenceCardIds)
  totalCards: number;
  completedCards: number;
  failedCards: number;
  skippedCards: number;
}

// ============================================
// API TYPES
// ============================================

/**
 * Request body for POST /admin/reviews/queue
 */
export interface QueueReviewsRequest {
  cardIds?: string[];                    // Specific card IDs to review
  scope?: 'all';                         // Review all active cards with URLs
}

/**
 * Response body for POST /admin/reviews/queue
 */
export interface QueueReviewsResponse {
  batchId: string;
  reviewIds: string[];
  skipped: { cardId: string; reason: string }[];
}

/**
 * Query params for GET /admin/reviews/results
 */
export interface ReviewResultsQuery {
  limit?: number;
  cursor?: string;                       // Composite cursor: base64({ queuedAt, id })
  status?: string;                       // Comma-separated: "success,failed"
  dateFrom?: string;                     // ISO date string
  dateTo?: string;                       // ISO date string
}

/**
 * Response body for GET /admin/reviews/results
 */
export interface ReviewResultsResponse {
  results: ReviewResult[];
  nextCursor?: string;
}
