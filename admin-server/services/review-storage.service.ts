/**
 * Review Storage Service
 *
 * Firestore CRUD operations for card review batches and results.
 * Handles creating, updating, and querying review data.
 */

import firebaseAdmin, { db } from '../firebase-admin';
import { FieldPath } from 'firebase-admin/firestore';
import type {
  ReviewResult,
  ReviewBatch,
  ReviewResultsResponse,
} from '../types/review-types';

// ============================================
// CONSTANTS
// ============================================

const BATCHES_COLLECTION = 'card_review_batches';
const RESULTS_COLLECTION = 'card_review_results';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const VALID_REVIEW_STATUSES = new Set<ReviewResult['status']>([
  'queued',
  'running',
  'success',
  'failed',
  'skipped',
]);

/**
 * Recursively strips undefined values from an object/array for Firestore compatibility.
 * Top-level undefined values are converted to FieldValue.delete() (removes the field).
 * Nested undefined values are simply omitted from the output.
 */
function stripUndefined(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) {
    return value.map(item => stripUndefined(item));
  }
  if (typeof value === 'object' && !(value instanceof firebaseAdmin.firestore.FieldValue)) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned;
  }
  return value;
}

function toFirestoreUpdatePayload<T extends Record<string, unknown>>(
  updates: T
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      payload[key] = firebaseAdmin.firestore.FieldValue.delete();
    } else {
      payload[key] = stripUndefined(value);
    }
  }
  return payload;
}

function sanitizeReviewedIndexArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter((item): item is number =>
        Number.isInteger(item) && item >= 0
      )
    )
  );
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Creates a new review batch document.
 * Returns the auto-generated batch ID.
 */
export async function createBatch(
  batch: Omit<ReviewBatch, 'id'>
): Promise<string> {
  const docRef = await db.collection(BATCHES_COLLECTION).add(stripUndefined(batch) as Record<string, unknown>);
  return docRef.id;
}

/**
 * Updates a batch document with partial data.
 */
export async function updateBatchProgress(
  batchId: string,
  updates: Partial<ReviewBatch>
): Promise<void> {
  await db
    .collection(BATCHES_COLLECTION)
    .doc(batchId)
    .update(toFirestoreUpdatePayload(updates as Record<string, unknown>));
}

/**
 * Gets a batch by ID.
 */
export async function getBatch(batchId: string): Promise<ReviewBatch | null> {
  const doc = await db.collection(BATCHES_COLLECTION).doc(batchId).get();
  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as ReviewBatch;
}

/**
 * Finds batches with the given status (for startup recovery).
 */
export async function getBatchesByStatus(
  status: ReviewBatch['status']
): Promise<ReviewBatch[]> {
  const snapshot = await db.collection(BATCHES_COLLECTION)
    .where('status', '==', status)
    .get();

  const batches: ReviewBatch[] = [];
  snapshot.forEach(doc => {
    batches.push({ ...doc.data(), id: doc.id } as ReviewBatch);
  });
  return batches;
}

// ============================================
// REVIEW RESULT OPERATIONS
// ============================================

/**
 * Creates a new review result document.
 * Returns the auto-generated result ID.
 */
export async function createReviewResult(
  result: Omit<ReviewResult, 'id'>
): Promise<string> {
  const docRef = await db.collection(RESULTS_COLLECTION).add(stripUndefined(result) as Record<string, unknown>);
  return docRef.id;
}

/**
 * Updates a review result document with partial data.
 */
export async function updateReviewResult(
  resultId: string,
  updates: Partial<ReviewResult>
): Promise<void> {
  await db
    .collection(RESULTS_COLLECTION)
    .doc(resultId)
    .update(toFirestoreUpdatePayload(updates as Record<string, unknown>));
}

/**
 * Gets a single review result by ID.
 */
export async function getReviewResult(
  resultId: string
): Promise<ReviewResult | null> {
  const doc = await db.collection(RESULTS_COLLECTION).doc(resultId).get();
  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as ReviewResult;
}

/**
 * Gets review results with cursor-based pagination and optional filters.
 *
 * Ordering: queuedAt DESC, document ID ASC (tie-breaker for duplicate timestamps).
 * Cursor: composite of queuedAt + id (base64 encoded JSON).
 * Search is handled client-side on the frontend -- not a backend param.
 */
export async function getReviewResults(options: {
  limit?: number;
  cursor?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ReviewResultsResponse> {
  const requestedPageSize = options.limit ?? DEFAULT_PAGE_SIZE;
  if (
    !Number.isInteger(requestedPageSize) ||
    requestedPageSize < 1 ||
    requestedPageSize > MAX_PAGE_SIZE
  ) {
    throw new Error(`Invalid limit: must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
  const pageSize = requestedPageSize;

  let query = db.collection(RESULTS_COLLECTION)
    .orderBy('queuedAt', 'desc')
    .orderBy(FieldPath.documentId(), 'asc');

  // Apply status filter (comma-separated: "success,failed")
  if (options.status) {
    const rawStatuses = options.status
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const statuses = Array.from(new Set(rawStatuses)).filter(
      (status): status is ReviewResult['status'] => VALID_REVIEW_STATUSES.has(status as ReviewResult['status'])
    );

    if (rawStatuses.length > 0 && statuses.length === 0) {
      throw new Error('Invalid status filter');
    }
    if (rawStatuses.length !== statuses.length) {
      throw new Error('Invalid status filter');
    }
    if (statuses.length > 10) {
      throw new Error('Too many status filters (max 10)');
    }
    if (statuses.length > 0) {
      query = query.where('status', 'in', statuses);
    }
  }

  // Apply date range filters
  const normalizeDateBound = (
    value: string | undefined,
    bound: 'start' | 'end'
  ): string | undefined => {
    if (!value) return undefined;

    // Date-only input (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return bound === 'start'
        ? `${value}T00:00:00.000Z`
        : `${value}T23:59:59.999Z`;
    }

    // Full ISO timestamp input
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid ${bound === 'start' ? 'dateFrom' : 'dateTo'} format`);
    }
    return parsed.toISOString();
  };

  const normalizedDateFrom = normalizeDateBound(options.dateFrom, 'start');
  const normalizedDateTo = normalizeDateBound(options.dateTo, 'end');

  if (normalizedDateFrom && normalizedDateTo && normalizedDateFrom > normalizedDateTo) {
    throw new Error('dateFrom cannot be after dateTo');
  }

  if (options.dateFrom) {
    query = query.where('queuedAt', '>=', normalizedDateFrom!);
  }
  if (normalizedDateTo) {
    query = query.where('queuedAt', '<=', normalizedDateTo);
  }

  // Apply cursor for pagination
  // Composite cursor: queuedAt + id
  if (options.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(options.cursor, 'base64').toString());
      if (typeof decoded.queuedAt === 'string' && typeof decoded.id === 'string') {
        query = query.startAfter(decoded.queuedAt, decoded.id);
      }
    } catch {
      console.warn('Invalid pagination cursor, ignoring');
    }
  }

  // Fetch one extra to determine if there are more results
  const snapshot = await query.limit(pageSize + 1).get();

  const results: ReviewResult[] = [];
  snapshot.forEach(doc => {
    results.push({ ...doc.data(), id: doc.id } as ReviewResult);
  });

  // Determine if there's a next page
  const hasMore = results.length > pageSize;
  if (hasMore) {
    results.pop(); // Remove the extra result
  }

  // Build next cursor from the last result
  let nextCursor: string | undefined;
  if (hasMore && results.length > 0) {
    const lastResult = results[results.length - 1];
    nextCursor = Buffer.from(JSON.stringify({
      queuedAt: lastResult.queuedAt,
      id: lastResult.id,
    })).toString('base64');
  }

  return { results, nextCursor };
}

/**
 * Gets the latest successful review for a specific card.
 */
export async function getLatestReviewForCard(
  referenceCardId: string
): Promise<ReviewResult | null> {
  const snapshot = await db.collection(RESULTS_COLLECTION)
    .where('referenceCardId', '==', referenceCardId)
    .where('status', '==', 'success')
    .orderBy('reviewedAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { ...doc.data(), id: doc.id } as ReviewResult;
}

/**
 * Gets all currently queued or running reviews (for the Queue Reviews tab).
 */
export async function getActiveReviews(): Promise<ReviewResult[]> {
  const snapshot = await db.collection(RESULTS_COLLECTION)
    .where('status', 'in', ['queued', 'running'])
    .orderBy('queuedAt', 'asc')
    .get();

  const results: ReviewResult[] = [];
  snapshot.forEach(doc => {
    results.push({ ...doc.data(), id: doc.id } as ReviewResult);
  });
  return results;
}

/**
 * Returns a map of referenceCardId -> latest successful reviewedAt timestamp.
 * Used by the cards list page for the "Last Reviewed" column.
 */
export async function getLastReviewedDates(): Promise<Record<string, string>> {
  // Query recent successful reviews ordered by reviewedAt desc.
  // Cap at 500 docs to avoid unbounded reads as review history grows.
  // With ~100 cards and reviews weekly, 500 docs covers ~5 weeks of history,
  // which is more than enough to find the latest review per card.
  const snapshot = await db.collection(RESULTS_COLLECTION)
    .where('status', '==', 'success')
    .where('reviewStatus', '==', 'reviewed')
    .orderBy('reviewedAt', 'desc')
    .limit(500)
    .get();

  const dates: Record<string, string> = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    const cardId = data.referenceCardId as string;
    // Only keep the first (latest) entry per card
    if (!dates[cardId] && data.reviewedAt) {
      dates[cardId] = data.reviewedAt as string;
    }
  });

  return dates;
}

/**
 * Checks if a card already has a queued or running review (for deduplication).
 */
export async function hasActiveReviewForCard(
  referenceCardId: string
): Promise<boolean> {
  const snapshot = await db.collection(RESULTS_COLLECTION)
    .where('referenceCardId', '==', referenceCardId)
    .where('status', 'in', ['queued', 'running'])
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Gets all review results for a specific batch (for queue processing).
 */
export async function getResultsByBatchId(
  batchId: string
): Promise<ReviewResult[]> {
  const snapshot = await db.collection(RESULTS_COLLECTION)
    .where('batchId', '==', batchId)
    .orderBy('queuedAt', 'asc')
    .get();

  const results: ReviewResult[] = [];
  snapshot.forEach(doc => {
    results.push({ ...doc.data(), id: doc.id } as ReviewResult);
  });
  return results;
}

/**
 * Dismisses a suggested URL on a review result.
 * Sets suggestedUrlDismissed: true on the urlResult at the given index.
 */
export async function dismissSuggestedUrl(
  resultId: string,
  urlIndex: number
): Promise<void> {
  const doc = await db.collection(RESULTS_COLLECTION).doc(resultId).get();
  if (!doc.exists) {
    throw new Error(`Review result ${resultId} not found`);
  }

  const data = doc.data() as ReviewResult;
  if (!data.urlResults || urlIndex < 0 || urlIndex >= data.urlResults.length) {
    throw new Error(`Invalid URL index ${urlIndex}`);
  }

  // Update the specific urlResult entry
  const updatedUrlResults = [...data.urlResults];
  updatedUrlResults[urlIndex] = {
    ...updatedUrlResults[urlIndex],
    suggestedUrlDismissed: true,
  };

  await db.collection(RESULTS_COLLECTION).doc(resultId).update({
    urlResults: updatedUrlResults,
  });
}

/**
 * Updates the human review status and/or reviewed item indices on a review result.
 */
export async function updateReviewStatus(
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
  const doc = await db.collection(RESULTS_COLLECTION).doc(resultId).get();
  if (!doc.exists) {
    throw new Error(`Review result ${resultId} not found`);
  }
  const existing = doc.data() as ReviewResult;

  const update: Record<string, unknown> = {};
  if (payload.reviewStatus !== undefined) {
    update.reviewStatus = payload.reviewStatus;
  }
  if (payload.reviewedItems !== undefined) {
    const sections: Array<keyof NonNullable<typeof payload.reviewedItems>> = [
      'cardDetails',
      'credits',
      'perks',
      'multipliers',
      'urls',
    ];
    const sanitizedReviewedItems: Record<string, number[]> = {};
    for (const section of sections) {
      const existingValue = existing.reviewedItems?.[section];
      sanitizedReviewedItems[section] = sanitizeReviewedIndexArray(existingValue);
    }
    for (const section of sections) {
      const value = payload.reviewedItems[section];
      if (value !== undefined) {
        sanitizedReviewedItems[section] = sanitizeReviewedIndexArray(value);
      }
    }
    update.reviewedItems = sanitizedReviewedItems;
  }

  if (Object.keys(update).length > 0) {
    await db.collection(RESULTS_COLLECTION).doc(resultId).update(update);
  }
}

/**
 * Cancels a single queued or running review.
 * Sets status to "failed" with reason "Cancelled by user".
 * Returns true if the review was cancelled, false if it wasn't in a cancellable state.
 */
export async function cancelReview(resultId: string): Promise<boolean> {
  const doc = await db.collection(RESULTS_COLLECTION).doc(resultId).get();
  if (!doc.exists) {
    throw new Error(`Review result ${resultId} not found`);
  }

  const data = doc.data() as ReviewResult;
  if (data.status !== 'queued' && data.status !== 'running') {
    return false;
  }

  if (data.status === 'queued') {
    // Queued reviews just disappear
    await db.collection(RESULTS_COLLECTION).doc(resultId).delete();
  } else {
    // Running reviews get marked as failed so they show in reviews history
    await db.collection(RESULTS_COLLECTION).doc(resultId).update(
      toFirestoreUpdatePayload({
        status: 'failed',
        currentStep: firebaseAdmin.firestore.FieldValue.delete(),
        failureReason: 'Cancelled by user',
        reviewedAt: new Date().toISOString(),
      } as Record<string, unknown>)
    );
  }

  return true;
}

/**
 * Cancels all queued and running reviews.
 * Returns the number of reviews cancelled.
 */
export async function cancelAllActiveReviews(): Promise<number> {
  const snapshot = await db.collection(RESULTS_COLLECTION)
    .where('status', 'in', ['queued', 'running'])
    .get();

  if (snapshot.empty) return 0;

  const now = new Date().toISOString();

  // Firestore batches have a 500-operation limit -- chunk if needed
  const BATCH_LIMIT = 500;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const chunk = docs.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();

    for (const doc of chunk) {
      const data = doc.data() as ReviewResult;
      if (data.status === 'queued') {
        batch.delete(doc.ref);
      } else {
        batch.update(doc.ref, {
          status: 'failed',
          currentStep: firebaseAdmin.firestore.FieldValue.delete(),
          failureReason: 'Cancelled by user',
          reviewedAt: now,
        });
      }
    }

    await batch.commit();
  }

  return snapshot.size;
}

/**
 * Deletes a single review result.
 */
export async function deleteReviewResult(resultId: string): Promise<void> {
  const doc = await db.collection(RESULTS_COLLECTION).doc(resultId).get();
  if (!doc.exists) {
    throw new Error(`Review result ${resultId} not found`);
  }

  const data = doc.data() as ReviewResult;
  if (data.status === 'queued' || data.status === 'running') {
    throw new Error('Cannot delete a review that is queued or running. Cancel it first.');
  }

  await db.collection(RESULTS_COLLECTION).doc(resultId).delete();
}
