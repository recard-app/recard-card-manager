/**
 * Review Queue Service
 *
 * Background job queue for processing card reviews.
 * Single-instance deployment -- no distributed lock needed.
 *
 * Queue model:
 * - Batches are queued in memory and processed sequentially
 * - Each card in a batch is processed one at a time with a delay
 * - On server restart, incomplete batches are recovered from Firestore
 * - Individual card failures don't stop the batch
 */

import { db } from '../firebase-admin';
import {
  createBatch,
  updateBatchProgress,
  createReviewResult,
  getReviewResult,
  getBatch,
  getBatchesByStatus,
  getResultsByBatchId,
  hasActiveReviewForCard,
  updateReviewResult,
} from './review-storage.service';
import { executeCardReview } from './review-execution.service';
import type {
  ReviewBatch,
  ReviewTrigger,
  QueueReviewsResponse,
  ScrapePreset,
  ScrapeStrategy,
} from '../types/review-types';
import { SCRAPE_PRESETS, DEFAULT_SCRAPE_PRESET } from '../constants/scrape-presets';
import { normalizeWebsiteUrls } from './url-utils';

// ============================================
// CONSTANTS
// ============================================

/** Delay between processing individual cards (ms) */
const DELAY_BETWEEN_CARDS_MS = 12_000; // 12 seconds

/** Delay between checking for new batches when idle (ms) */
const IDLE_CHECK_INTERVAL_MS = 5_000; // 5 seconds

/** Maximum batch processing time (ms) */
const BATCH_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes

// ============================================
// QUEUE STATE
// ============================================

let isProcessing = false;
const pendingBatchIds: string[] = [];

// ============================================
// PUBLIC API
// ============================================

/**
 * Queues reviews for the given cards.
 *
 * Creates individual review result documents (status: "queued") and a batch document
 * for orchestration. Snapshots the active versionId per card at queue time.
 *
 * Deduplication: skips cards that already have a queued/running review.
 * Skips cards without active versions or without URLs.
 */
export async function queueReviews(
  cardIds: string[],
  triggeredBy: ReviewTrigger,
  triggeredByUser?: string,
  scrapePreset?: ScrapePreset,
  scrapeStrategy?: ScrapeStrategy
): Promise<QueueReviewsResponse> {
  // Resolve the strategy (mutual exclusion enforced by API validation)
  const resolvedPreset: ScrapePreset = scrapePreset ?? (scrapeStrategy ? 'custom' : DEFAULT_SCRAPE_PRESET);
  const resolvedStrategy = scrapeStrategy ?? SCRAPE_PRESETS[(scrapePreset ?? DEFAULT_SCRAPE_PRESET) as Exclude<ScrapePreset, 'custom'>];
  const reviewIds: string[] = [];
  const skipped: { cardId: string; reason: string }[] = [];

  // Deduplicate card IDs while preserving order.
  const seenCardIds = new Set<string>();
  const uniqueCardIds: string[] = [];
  for (const rawCardId of cardIds) {
    const cardId = rawCardId.trim();
    if (!cardId) {
      continue;
    }
    if (seenCardIds.has(cardId)) {
      skipped.push({ cardId, reason: 'Duplicate card ID in request' });
      continue;
    }
    seenCardIds.add(cardId);
    uniqueCardIds.push(cardId);
  }

  // Resolve "all" scope if needed (caller handles this)
  // cardIds should already be resolved by the route handler

  // Look up card data for each card
  const validCards: {
    referenceCardId: string;
    versionId: string;
    cardName: string;
    cardIssuer: string;
    cardPrimaryColor?: string;
    cardSecondaryColor?: string;
    websiteUrls: string[];
  }[] = [];

  for (const cardId of uniqueCardIds) {
    // Check for deduplication
    const hasActive = await hasActiveReviewForCard(cardId);
    if (hasActive) {
      skipped.push({ cardId, reason: 'Review already queued or running' });
      continue;
    }

    // Get card name data
    const cardNameDoc = await db.collection('credit_cards_names').doc(cardId).get();
    if (!cardNameDoc.exists) {
      skipped.push({ cardId, reason: 'Card not found' });
      continue;
    }
    const cardNameData = cardNameDoc.data()!;

    // Check for URLs
    const websiteUrls = normalizeWebsiteUrls(cardNameData.websiteUrls);
    if (websiteUrls.length === 0) {
      skipped.push({ cardId, reason: 'No website URLs configured' });
      continue;
    }

    // Find active version
    const versionsSnapshot = await db.collection('credit_cards_history')
      .where('ReferenceCardId', '==', cardId)
      .where('IsActive', '==', true)
      .limit(1)
      .get();

    if (versionsSnapshot.empty) {
      skipped.push({ cardId, reason: 'No active version' });
      continue;
    }

    const activeVersion = versionsSnapshot.docs[0];
    const versionData = activeVersion.data();

    validCards.push({
      referenceCardId: cardId,
      versionId: activeVersion.id,
      cardName: cardNameData.CardName as string,
      cardIssuer: cardNameData.CardIssuer as string,
      cardPrimaryColor: versionData?.CardPrimaryColor as string | undefined,
      cardSecondaryColor: versionData?.CardSecondaryColor as string | undefined,
      websiteUrls,
    });
  }

  if (validCards.length === 0) {
    // Create a batch even with no cards for audit trail
    const batchId = await createBatch({
      status: 'completed',
      triggeredBy,
      triggeredByUser,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      cardIds: [],
      totalCards: 0,
      completedCards: 0,
      failedCards: 0,
      skippedCards: skipped.length,
      ...(resolvedPreset && { scrapePreset: resolvedPreset }),
      scrapeStrategy: resolvedStrategy,
    });

    return { batchId, reviewIds: [], skipped };
  }

  // Create batch document
  const now = new Date().toISOString();
  const batchId = await createBatch({
    status: 'queued',
    triggeredBy,
    triggeredByUser,
    createdAt: now,
    cardIds: validCards.map(c => c.referenceCardId),
    totalCards: validCards.length,
    completedCards: 0,
    failedCards: 0,
    skippedCards: skipped.length,
    ...(resolvedPreset && { scrapePreset: resolvedPreset }),
    scrapeStrategy: resolvedStrategy,
  });

  // Create individual review result documents
  for (const card of validCards) {
    const resultId = await createReviewResult({
      batchId,
      referenceCardId: card.referenceCardId,
      versionId: card.versionId,
      cardName: card.cardName,
      cardIssuer: card.cardIssuer,
      cardPrimaryColor: card.cardPrimaryColor,
      cardSecondaryColor: card.cardSecondaryColor,
      status: 'queued',
      triggeredBy,
      queuedAt: now,
      websiteUrls: card.websiteUrls,
      contentLength: 0,
      ...(resolvedPreset && { scrapePreset: resolvedPreset }),
    });
    reviewIds.push(resultId);
  }

  console.log(`[queueReviews] Queued ${validCards.length} reviews in batch ${batchId} (${skipped.length} skipped)`);

  // Add to in-memory queue and wake processor
  notifyNewBatch(batchId);

  return { batchId, reviewIds, skipped };
}

/**
 * Starts the queue processor. Call once on server startup.
 */
export function startQueueProcessor(): void {
  console.log('[Queue] Starting review queue processor');
  recoverIncompleteJobs().then(() => {
    processNext();
  }).catch(error => {
    console.error('[Queue] Failed to recover incomplete jobs:', error);
    processNext(); // Start processing anyway
  });
}

// ============================================
// INTERNAL QUEUE PROCESSING
// ============================================

/**
 * Adds a batch to the in-memory queue and wakes the processor if idle.
 */
function notifyNewBatch(batchId: string): void {
  pendingBatchIds.push(batchId);
  if (!isProcessing) {
    processNext();
  }
}

/**
 * Main processing loop. Picks up the next pending batch and processes it.
 * Uses recursive setTimeout (not setInterval) for safe async handling.
 */
async function processNext(): Promise<void> {
  if (isProcessing) return;

  const batchId = pendingBatchIds.shift();
  if (!batchId) {
    // No pending batches -- check again later
    setTimeout(processNext, IDLE_CHECK_INTERVAL_MS);
    return;
  }

  isProcessing = true;

  try {
    await processBatch(batchId);
  } catch (error) {
    console.error(`[Queue] Error processing batch ${batchId}:`, error);
  }

  isProcessing = false;

  // Check for next batch -- yield to event loop to avoid stack growth
  setTimeout(processNext, 0);
}

/**
 * Processes all cards in a batch sequentially.
 */
async function processBatch(batchId: string): Promise<void> {
  const batchStartTime = Date.now();

  console.log(`[Queue] Processing batch ${batchId}`);

  // Update batch status
  await updateBatchProgress(batchId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  // Get all review results for this batch
  const results = await getResultsByBatchId(batchId);
  const pendingResults = results.filter(r => r.status === 'queued');
  const existingBatch = await getBatch(batchId);
  const batchStrategy = existingBatch?.scrapeStrategy;
  const initialSkippedCards = existingBatch?.skippedCards ?? 0;
  const missingResultsCount = existingBatch
    ? Math.max(0, existingBatch.totalCards - results.length)
    : 0;

  let completedCards = 0;
  let failedCards = 0;
  let skippedCards = initialSkippedCards + missingResultsCount;

  if (missingResultsCount > 0) {
    console.log(`[Queue] Batch ${batchId} has ${missingResultsCount} missing review result(s); counting as skipped`);
  }

  for (let i = 0; i < pendingResults.length; i++) {
    const result = pendingResults[i];

    // Check batch timeout
    if (Date.now() - batchStartTime > BATCH_TIMEOUT_MS) {
      console.warn(`[Queue] Batch ${batchId} timed out after ${Math.round((Date.now() - batchStartTime) / 1000)}s`);

      // Mark remaining reviews as failed
      for (let j = i; j < pendingResults.length; j++) {
        try {
          await updateReviewResult(pendingResults[j].id, {
            status: 'failed',
            currentStep: undefined,
            failureReason: 'Batch timed out',
            reviewedAt: new Date().toISOString(),
          });
          failedCards++;
        } catch (timeoutUpdateError) {
          // A queued review might have been cancelled (and deleted) while this batch was running.
          // Count it as skipped so batch progress remains consistent.
          console.warn(`[Queue] Could not mark timed-out review ${pendingResults[j].id} as failed:`, timeoutUpdateError);
          skippedCards++;
        }
      }
      break;
    }

    console.log(`[Queue] Processing card ${i + 1}/${pendingResults.length}: ${result.cardName} (${result.referenceCardId})`);

    try {
      await executeCardReview(result.referenceCardId, result.id, batchStrategy);

      // Re-read the result to check final status
      const updatedResult = await getReviewResult(result.id);
      if (!updatedResult) {
        // The review may have been cancelled while queued (deleted from Firestore).
        skippedCards++;
      } else if (updatedResult.status === 'success') {
        completedCards++;
      } else if (updatedResult.status === 'failed') {
        if (updatedResult.failureReason === 'Cancelled by user') {
          skippedCards++;
        } else {
          failedCards++;
        }
      } else if (updatedResult.status === 'skipped') {
        skippedCards++;
      }
    } catch (error) {
      console.error(`[Queue] Error executing review for ${result.referenceCardId}:`, error);

      // Ensure terminal status if execution threw unexpectedly
      try {
        const current = await getReviewResult(result.id);
        if (!current) {
          skippedCards++;
        } else if (current.status === 'queued' || current.status === 'running') {
          await updateReviewResult(result.id, {
            status: 'failed',
            currentStep: undefined,
            failureReason: 'Unexpected queue processor error',
            reviewedAt: new Date().toISOString(),
          });
          failedCards++;
        } else if (current.status === 'failed' && current.failureReason === 'Cancelled by user') {
          skippedCards++;
        } else if (current.status === 'skipped') {
          skippedCards++;
        } else if (current.status === 'failed') {
          failedCards++;
        }
      } catch (markFailedError) {
        console.error(`[Queue] Failed to mark review ${result.id} as failed:`, markFailedError);
        failedCards++;
      }
    }

    // Update batch progress
    await updateBatchProgress(batchId, {
      completedCards: completedCards + failedCards + (skippedCards - initialSkippedCards),
      failedCards,
      skippedCards,
    });

    // Delay between cards (skip delay after last card)
    if (i < pendingResults.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CARDS_MS));
    }
  }

  // Finalize batch
  let finalStatus: ReviewBatch['status'] = 'completed';
  if (failedCards > 0 && completedCards === 0 && skippedCards === initialSkippedCards) {
    finalStatus = 'failed';
  } else if (failedCards > 0 || skippedCards > initialSkippedCards) {
    finalStatus = 'partial';
  }

  await updateBatchProgress(batchId, {
    status: finalStatus,
    completedAt: new Date().toISOString(),
    completedCards,
    failedCards,
    skippedCards,
  });

  console.log(`[Queue] Batch ${batchId} ${finalStatus}: ${completedCards} completed, ${failedCards} failed, ${skippedCards} skipped`);
}

/**
 * Recovers incomplete jobs on server startup.
 * Finds batches that were queued or running when the server died,
 * resets running reviews to queued, and re-queues the batches.
 */
async function recoverIncompleteJobs(): Promise<void> {
  console.log('[Queue] Checking for incomplete jobs to recover...');

  // Find batches that were in-progress
  const [queuedBatches, runningBatches] = await Promise.all([
    getBatchesByStatus('queued'),
    getBatchesByStatus('running'),
  ]);

  const incompleteBatches = [...queuedBatches, ...runningBatches];

  if (incompleteBatches.length === 0) {
    console.log('[Queue] No incomplete jobs to recover');
    return;
  }

  console.log(`[Queue] Found ${incompleteBatches.length} incomplete batch(es) to recover`);

  for (const batch of incompleteBatches) {
    // Reset any "running" reviews back to "queued"
    const results = await getResultsByBatchId(batch.id);
    for (const result of results) {
      if (result.status === 'running') {
        await updateReviewResult(result.id, {
          status: 'queued',
          currentStep: undefined,
        });
        console.log(`[Queue] Reset running review ${result.id} to queued`);
      }
    }

    // Re-queue the batch
    await updateBatchProgress(batch.id, { status: 'queued' });
    pendingBatchIds.push(batch.id);
    console.log(`[Queue] Re-queued batch ${batch.id}`);
  }
}
