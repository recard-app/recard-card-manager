/**
 * Review Types (Frontend)
 *
 * TypeScript types for the automated card review system.
 * These mirror the server-side types for API responses.
 */

import type {
  FieldComparisonResult,
  ComponentComparisonResult,
} from './comparison-types';

// ============================================
// STATUS TYPES
// ============================================

export type ReviewStatus = 'queued' | 'running' | 'success' | 'failed' | 'skipped';

export type BatchStatus = 'queued' | 'running' | 'completed' | 'failed' | 'partial';

export type ReviewTrigger = 'scheduled' | 'manual';

export type UrlStatus = 'ok' | 'redirected' | 'broken' | 'stale';

export type ScrapeSource = 'cloudflare-markdown' | 'cloudflare-content' | 'jina';

// ============================================
// URL SCRAPING RESULTS
// ============================================

export interface UrlResult {
  url: string;
  status: UrlStatus;
  source: ScrapeSource;
  contentTokens: number;
  contentTokensOriginal?: number;        // Only set if truncated
  truncated: boolean;
  browserTimeMs?: number;                // Cloudflare sources only
  redirectedTo?: string;
  suggestedUrl?: string;
  suggestedUrlDismissed?: boolean;
  error?: string;
  attemptErrors?: string[];
  scrapedContent?: string;               // The actual scraped markdown content from this URL
}

// ============================================
// HEALTH SCORING
// ============================================

/**
 * Health score: (matchCount / totalItemCount) * 100
 */
export interface ReviewHealth {
  score: number;
  mismatches: number;
  outdated: number;
  new: number;
  missing: number;
  questionable: number;
}

// ============================================
// USAGE & COST TRACKING
// ============================================

export interface ScrapeUsageEntry {
  url: string;
  source: ScrapeSource;
  contentTokens: number;
  browserTimeMs?: number;
}

export interface ReviewUsage {
  scraping: {
    totalContentTokens: number;
    urlBreakdown: ScrapeUsageEntry[];
  };
  gemini: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    model: string;
  };
  searchGrounding?: {
    inputTokens: number;
    outputTokens: number;
    searchQueries: number;
  };
  cost: {
    geminiInput: number;
    geminiOutput: number;
    searchGrounding: number;
    total: number;
  };
}

// ============================================
// REVIEW RESULT
// ============================================

export interface ReviewResult {
  id: string;
  batchId?: string;
  referenceCardId: string;
  versionId: string;
  cardName: string;
  cardIssuer: string;
  cardPrimaryColor?: string;
  cardSecondaryColor?: string;
  status: ReviewStatus;
  currentStep?: string;
  failureReason?: string;
  skipReason?: string;
  triggeredBy: ReviewTrigger;
  queuedAt: string;
  reviewedAt?: string;
  websiteUrls: string[];
  contentLength: number;

  urlResults?: UrlResult[];

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

  health?: ReviewHealth;
  usage?: ReviewUsage;

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
// API TYPES
// ============================================

export interface QueueReviewsResponse {
  batchId: string;
  reviewIds: string[];
  skipped: { cardId: string; reason: string }[];
}

export interface ReviewResultsResponse {
  results: ReviewResult[];
  nextCursor?: string;
}
