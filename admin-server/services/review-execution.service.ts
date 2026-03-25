/**
 * Review Execution Service
 *
 * Orchestrates the full review pipeline for a single card:
 * 1. Update status to "running"
 * 2. Fetch card data and filter to active components
 * 3. Scrape URLs
 * 4. Run AI comparison with proposed fixes
 * 5. Compute health score
 * 6. Store results
 */

import { ThinkingLevel } from '@google/genai';
import {
  aggregateCardData,
  analyzeComparison,
  type ComparisonConfig,
} from './comparison.service';
import { scrapeCardUrls, searchForReplacementUrl } from './content-acquisition.service';
import { updateReviewResult, getReviewResult } from './review-storage.service';
import { ONGOING_SENTINEL_DATE } from '../constants/dates';
import type { CreditCardName } from '../types';
import type {
  ReviewHealth,
  ReviewUsage,
  ScrapeUsageEntry,
  UrlResult,
} from '../types/review-types';
import { calculateReviewCost } from '../types/review-types';
import type {
  FieldComparisonResult,
  ComponentComparisonResult,
} from '../constants/ai-response-schema/comparison-schema';
import { db } from '../firebase-admin';
import { normalizeWebsiteUrls } from './url-utils';

// ============================================
// CONSTANTS
// ============================================

/** Timeout for a single card review (ms) */
const CARD_REVIEW_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/** Comparison config for automated reviews */
const AUTOMATED_REVIEW_CONFIG: ComparisonConfig = {
  thinkingLevel: 'HIGH' as ThinkingLevel,
  maxOutputTokens: 65536,
  includeProposedFixes: true,
};

const ISSUER_DOMAIN_MAP: Record<string, string> = {
  'american express': 'americanexpress.com',
  amex: 'americanexpress.com',
  chase: 'chase.com',
  citi: 'citi.com',
  citibank: 'citi.com',
  'capital one': 'capitalone.com',
  discover: 'discover.com',
  'bank of america': 'bankofamerica.com',
  'us bank': 'usbank.com',
  'u.s. bank': 'usbank.com',
  'wells fargo': 'wellsfargo.com',
};

// ============================================
// TEMPORAL FILTERING
// ============================================

/**
 * Returns today's date as YYYY-MM-DD string in local timezone.
 * Used for filtering active components.
 */
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Filters components to only include currently active ones.
 *
 * Active = EffectiveFrom <= today AND (EffectiveTo == sentinel OR EffectiveTo >= today)
 *
 * This ensures the comparison only checks current benefits against the website.
 * Expired components are excluded.
 */
function filterActiveComponents<T extends { EffectiveFrom: string; EffectiveTo: string }>(
  components: T[]
): T[] {
  const today = getTodayDateString();

  return components.filter(component => {
    const isStarted = component.EffectiveFrom <= today;
    const isOngoing = component.EffectiveTo === ONGOING_SENTINEL_DATE || component.EffectiveTo >= today;
    return isStarted && isOngoing;
  });
}

/**
 * Returns the issuer domain to use for URL replacement search.
 */
function resolveIssuerDomain(url: string, cardIssuer: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (hostname) return hostname;
  } catch {
    // Ignore invalid URL and fall back to issuer mapping
  }

  return ISSUER_DOMAIN_MAP[cardIssuer.toLowerCase()] ?? null;
}

/**
 * Adds suggested replacement URLs for broken/stale URL results.
 */
async function enrichBrokenUrlSuggestions(
  urlResults: UrlResult[],
  cardName: string,
  cardIssuer: string
): Promise<void> {
  const suggestionCache = new Map<string, Promise<string | null>>();

  for (const urlResult of urlResults) {
    if (urlResult.status !== 'broken' && urlResult.status !== 'stale') {
      continue;
    }

    const issuerDomain = resolveIssuerDomain(urlResult.url, cardIssuer);
    if (!issuerDomain) {
      continue;
    }

    let suggestionPromise = suggestionCache.get(issuerDomain);
    if (!suggestionPromise) {
      suggestionPromise = searchForReplacementUrl(cardName, issuerDomain);
      suggestionCache.set(issuerDomain, suggestionPromise);
    }

    const suggestedUrl = await suggestionPromise;
    if (suggestedUrl && suggestedUrl !== urlResult.url) {
      urlResult.suggestedUrl = suggestedUrl;
    }
  }
}

// ============================================
// HEALTH SCORE COMPUTATION
// ============================================

/**
 * Computes the health score and metrics from a comparison result.
 *
 * Formula: score = (matchCount / totalItemCount) * 100
 * - matchCount = card details with "match" + components with "match"
 * - totalItemCount = all items except card details with "missing_from_website"
 * - Rounded to nearest integer
 */
export function computeHealthScore(comparisonResult: {
  cardDetails: FieldComparisonResult[];
  perks: ComponentComparisonResult[];
  credits: ComponentComparisonResult[];
  multipliers: ComponentComparisonResult[];
}): ReviewHealth {
  let matchCount = 0;
  let totalCount = 0;
  let mismatches = 0;
  let outdated = 0;
  let newItems = 0;
  let missing = 0;
  let questionable = 0;

  // Card details
  for (const field of comparisonResult.cardDetails) {
    if (field.status === 'missing_from_website') {
      // Excluded from total -- can't verify
      continue;
    }
    totalCount++;
    if (field.status === 'match') {
      matchCount++;
    } else if (field.status === 'mismatch') {
      mismatches++;
    } else if (field.status === 'questionable') {
      questionable++;
    }
  }

  // Components (credits, perks, multipliers)
  const allComponents = [
    ...comparisonResult.credits,
    ...comparisonResult.perks,
    ...comparisonResult.multipliers,
  ];

  for (const component of allComponents) {
    totalCount++;
    switch (component.status) {
      case 'match':
        matchCount++;
        break;
      case 'outdated':
        outdated++;
        break;
      case 'new':
        newItems++;
        break;
      case 'missing':
        missing++;
        break;
      case 'questionable':
        questionable++;
        break;
    }
  }

  // If nothing could be verified (totalCount is 0), report 0 rather than 100
  // to signal "insufficient data" rather than "everything is healthy"
  const score = totalCount > 0 ? Math.round((matchCount / totalCount) * 100) : 0;

  return {
    score,
    mismatches,
    outdated,
    new: newItems,
    missing,
    questionable,
  };
}

// ============================================
// MAIN EXECUTION
// ============================================

/**
 * Executes the full review pipeline for a single card.
 *
 * This function is called by the queue processor for each card in a batch.
 * It updates the review result document in Firestore as it progresses.
 */
export async function executeCardReview(
  referenceCardId: string,
  resultId: string
): Promise<void> {
  const reviewStartedAtMs = Date.now();

  try {
    const withRemainingTimeout = async <T>(
      operation: () => Promise<T>,
      label: string
    ): Promise<T> => {
      const elapsedMs = Date.now() - reviewStartedAtMs;
      const remainingMs = CARD_REVIEW_TIMEOUT - elapsedMs;
      if (remainingMs <= 0) {
        throw new Error(`Card review timed out before ${label}`);
      }

      let timer: ReturnType<typeof setTimeout>;
      return Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Card review timed out during ${label}`)), remainingMs);
        }),
      ]).finally(() => clearTimeout(timer));
    };

    // Check if already cancelled before starting
    const preCheck = await getReviewResult(resultId);
    if (!preCheck || preCheck.status === 'failed') {
      console.log(`[executeCardReview] Review ${resultId} already cancelled or missing, skipping`);
      return;
    }

    // Step 1: Update status to "running"
    await updateReviewResult(resultId, {
      status: 'running',
      currentStep: 'Fetching card data...',
    });

    // Get the review result to access the snapshotted versionId
    const reviewResult = preCheck;
    if (!reviewResult) {
      throw new Error(`Review result ${resultId} not found`);
    }

    const { versionId } = reviewResult;

    // Step 2: Fetch card data and filter to active components
    let aggregatedData;
    try {
      aggregatedData = await aggregateCardData(referenceCardId, versionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateReviewResult(resultId, {
        status: 'failed',
        currentStep: undefined,
        failureReason: `Card or version no longer exists: ${message}`,
        reviewedAt: new Date().toISOString(),
      });
      return;
    }

    // Apply temporal filtering -- only active components
    aggregatedData.credits = filterActiveComponents(aggregatedData.credits);
    aggregatedData.perks = filterActiveComponents(aggregatedData.perks);
    aggregatedData.multipliers = filterActiveComponents(aggregatedData.multipliers);

    // Step 3: Fetch URLs from credit_cards_names (current, not snapshotted)
    await updateReviewResult(resultId, { currentStep: 'Scraping URLs...' });

    const cardNameDoc = await db.collection('credit_cards_names').doc(referenceCardId).get();
    const cardNameData = cardNameDoc.data() as CreditCardName | undefined;
    const urls = normalizeWebsiteUrls(cardNameData?.websiteUrls);

    if (urls.length === 0) {
      await updateReviewResult(resultId, {
        status: 'skipped',
        currentStep: undefined,
        skipReason: 'No website URLs configured',
        websiteUrls: [],
        contentLength: 0,
        reviewedAt: new Date().toISOString(),
      });
      return;
    }

    let scrapeResult;
    try {
      scrapeResult = await withRemainingTimeout(
        () => scrapeCardUrls(urls, aggregatedData.cardDetails.CardName),
        'URL scraping'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateReviewResult(resultId, {
        status: 'failed',
        currentStep: undefined,
        failureReason: `Scraping failed: ${message}`,
        websiteUrls: urls,
        contentLength: 0,
        reviewedAt: new Date().toISOString(),
      });
      return;
    }

    // Step 3.5: Try finding replacement URLs for broken/stale sources
    await updateReviewResult(resultId, { currentStep: 'Checking URL health...' });
    try {
      await enrichBrokenUrlSuggestions(
        scrapeResult.urlResults,
        aggregatedData.cardDetails.CardName,
        reviewResult.cardIssuer
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[executeCardReview] URL suggestion lookup failed for ${referenceCardId}: ${message}`);
    }

    // Step 4: Check if we got any content
    if (!scrapeResult.combinedContent || scrapeResult.combinedContent.trim().length === 0) {
      await updateReviewResult(resultId, {
        status: 'failed',
        currentStep: undefined,
        failureReason: 'No content scraped from any URL',
        websiteUrls: urls,
        urlResults: scrapeResult.urlResults,
        contentLength: 0,
        reviewedAt: new Date().toISOString(),
      });
      return;
    }

    // Step 5: Run AI comparison
    await updateReviewResult(resultId, { currentStep: 'Running comparison...' });

    let comparisonResponse;
    try {
      comparisonResponse = await withRemainingTimeout(
        () => analyzeComparison(
          {
            referenceCardId,
            versionId,
            websiteText: scrapeResult.combinedContent,
          },
          AUTOMATED_REVIEW_CONFIG,
          aggregatedData
        ),
        'AI comparison'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateReviewResult(resultId, {
        status: 'failed',
        currentStep: undefined,
        failureReason: `AI comparison failed: ${message}`,
        websiteUrls: urls,
        urlResults: scrapeResult.urlResults,
        contentLength: scrapeResult.totalContentLength,
        reviewedAt: new Date().toISOString(),
      });
      return;
    }

    // Step 6: Compute health score
    const health = computeHealthScore(comparisonResponse);

    // Step 7: Build usage tracking
    const scrapeUsageBreakdown: ScrapeUsageEntry[] = scrapeResult.urlResults
      .filter(r => r.status === 'ok' || r.status === 'redirected')
      .map(r => ({
        url: r.url,
        source: r.source,
        contentTokens: r.contentTokens,
        browserTimeMs: r.browserTimeMs,
      }));

    const geminiInputTokens = comparisonResponse.tokenUsage?.inputTokens ?? 0;
    const geminiOutputTokens = comparisonResponse.tokenUsage?.outputTokens ?? 0;

    const usage: ReviewUsage = {
      scraping: {
        totalContentTokens: scrapeResult.totalContentTokens,
        urlBreakdown: scrapeUsageBreakdown,
      },
      gemini: {
        inputTokens: geminiInputTokens,
        outputTokens: geminiOutputTokens,
        thinkingTokens: comparisonResponse.tokenUsage?.thinkingTokens,
        model: comparisonResponse.modelUsed,
      },
      cost: calculateReviewCost(geminiInputTokens, geminiOutputTokens, 0, comparisonResponse.modelUsed),
    };

    // Step 8: Check if review was cancelled while processing
    const currentResult = await getReviewResult(resultId);
    if (!currentResult || (currentResult.status === 'failed' && currentResult.failureReason === 'Cancelled by user')) {
      console.log(`[executeCardReview] Review ${resultId} was cancelled during processing, skipping result write`);
      return;
    }

    // Step 9: Update result with all data
    await updateReviewResult(resultId, {
      status: 'success',
      currentStep: undefined,
      reviewedAt: new Date().toISOString(),
      websiteUrls: urls,
      urlResults: scrapeResult.urlResults,
      contentLength: scrapeResult.totalContentLength,
      comparisonResult: {
        summary: comparisonResponse.summary,
        modelUsed: comparisonResponse.modelUsed,
        tokenUsage: comparisonResponse.tokenUsage,
        cardDetails: comparisonResponse.cardDetails,
        perks: comparisonResponse.perks,
        credits: comparisonResponse.credits,
        multipliers: comparisonResponse.multipliers,
      },
      health,
      usage,
    });

    console.log(`[executeCardReview] Completed review for ${referenceCardId}: health score ${health.score}%`);
  } catch (error) {
    // Catch-all for unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[executeCardReview] Unexpected error for ${referenceCardId}:`, message);

    try {
      await updateReviewResult(resultId, {
        status: 'failed',
        currentStep: undefined,
        failureReason: `Unexpected error: ${message}`,
        reviewedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error(`[executeCardReview] Failed to update result status:`, updateError);
    }
  }
}
