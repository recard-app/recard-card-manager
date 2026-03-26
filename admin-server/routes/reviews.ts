/**
 * Review Routes
 *
 * API endpoints for the automated card review system.
 * All endpoints require card-manager authentication (verifyAuth).
 */

import { Router, Request, Response } from 'express';
import { verifyAuth } from '../middleware/auth';
import { z } from 'zod';
import { db } from '../firebase-admin';
import { queueReviews } from '../services/review-queue.service';
import {
  getReviewResults,
  getReviewResult,
  getActiveReviews,
  getLatestReviewForCard,
  getLastReviewedDates,
  getLastRunDates,
  dismissSuggestedUrl,
  updateReviewStatus,
  cancelReview,
  cancelAllActiveReviews,
  deleteReviewResult,
} from '../services/review-storage.service';

const router = Router();
type AuthenticatedRequest = Request & { user?: { email?: string } };

/** Safely extract message from an unknown error */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Safely extract code from an unknown error (Firestore errors have numeric codes) */
function getErrorCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return typeof (error as { code: unknown }).code === 'number'
      ? (error as { code: number }).code
      : undefined;
  }
  return undefined;
}

// Apply auth middleware to all routes
router.use(verifyAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const SCRAPE_SOURCE_VALUES = ['firecrawl', 'cloudflare-markdown', 'cloudflare-content', 'jina', 'cloudflare'] as const;

const ScrapeStrategySchema = z.object({
  primary: z.array(z.enum(SCRAPE_SOURCE_VALUES)).min(1),
  fallback: z.array(z.enum(SCRAPE_SOURCE_VALUES)),
}).refine(
  data => {
    const allSources = [...data.primary, ...data.fallback];
    return new Set(allSources).size === allSources.length;
  },
  { message: 'Duplicate sources are not allowed in a strategy' }
);

/**
 * Validates that bundled 'cloudflare' is not used alongside its atomic
 * variants 'cloudflare-markdown' or 'cloudflare-content' in the same strategy.
 */
function hasOverlappingCloudflareSources(strategy: { primary: string[]; fallback: string[] }): boolean {
  const allSources = [...strategy.primary, ...strategy.fallback];
  const hasBundled = allSources.includes('cloudflare');
  const hasAtomic = allSources.includes('cloudflare-markdown') || allSources.includes('cloudflare-content');
  return hasBundled && hasAtomic;
}

const QueueReviewsSchema = z.object({
  cardIds: z.array(z.string().min(1)).optional(),
  scope: z.enum(['all']).optional(),
  scrapePreset: z.enum(['default', 'max', 'thorough', 'cheap-thorough', 'cheap']).optional(),
  scrapeStrategy: ScrapeStrategySchema.optional(),
}).refine(
  data => data.cardIds || data.scope,
  { message: 'Either cardIds or scope must be provided' }
).refine(
  data => !(data.scrapePreset && data.scrapeStrategy),
  { message: 'Cannot specify both scrapePreset and scrapeStrategy' }
).refine(
  data => !data.scrapeStrategy || !hasOverlappingCloudflareSources(data.scrapeStrategy),
  { message: 'Cannot use bundled "cloudflare" with "cloudflare-markdown" or "cloudflare-content" in the same strategy' }
);

const DismissUrlSchema = z.object({
  urlIndex: z.number().int().min(0),
});

const ReviewedItemsSchema = z.object({
  cardDetails: z.array(z.number().int().min(0)).optional(),
  credits: z.array(z.number().int().min(0)).optional(),
  perks: z.array(z.number().int().min(0)).optional(),
  multipliers: z.array(z.number().int().min(0)).optional(),
  urls: z.array(z.number().int().min(0)).optional(),
});

const UpdateReviewStatusSchema = z.object({
  reviewStatus: z.enum(['not_reviewed', 'reviewed']).optional(),
  reviewedItems: ReviewedItemsSchema.optional(),
});

const ReviewResultsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /admin/reviews/queue
 * Queue reviews for selected cards or all cards.
 */
router.post('/queue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = QueueReviewsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    const { cardIds, scope, scrapePreset, scrapeStrategy } = parsed.data;
    const user = req.user;

    let resolvedCardIds: string[];

    if (scope === 'all') {
      // Get all card IDs from credit_cards_names
      const snapshot = await db.collection('credit_cards_names').get();
      resolvedCardIds = snapshot.docs.map(doc => doc.id);
    } else {
      resolvedCardIds = cardIds!;
    }

    if (resolvedCardIds.length === 0) {
      return res.status(400).json({ error: 'No cards to review' });
    }

    const result = await queueReviews(
      resolvedCardIds,
      'manual',
      user?.email,
      scrapePreset,
      scrapeStrategy
    );

    res.json(result);
  } catch (error: unknown) {
    console.error('Queue reviews error:', error);
    res.status(500).json({
      error: 'Failed to queue reviews',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /admin/reviews/results
 * List review results with cursor-based pagination and filters.
 */
router.get('/results', async (req: Request, res: Response) => {
  try {
    const parsedQuery = ReviewResultsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parsedQuery.error.issues,
      });
    }

    const { limit, cursor, status, dateFrom, dateTo } = parsedQuery.data;

    const result = await getReviewResults({
      limit,
      cursor,
      status,
      dateFrom,
      dateTo,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Get review results error:', error);

    const msg = getErrorMessage(error);

    if (
      msg.includes('Invalid limit') ||
      msg.includes('Invalid status filter') ||
      msg.includes('Too many status filters') ||
      msg.includes('Invalid dateFrom') ||
      msg.includes('Invalid dateTo') ||
      msg.includes('dateFrom cannot be after dateTo')
    ) {
      return res.status(400).json({ error: msg });
    }

    // Firestore index errors include a URL to create the needed index
    if (msg.includes('requires an index') || getErrorCode(error) === 9) {
      console.error('Missing Firestore index. Create it using the link above.');
      return res.status(500).json({
        error: 'Missing Firestore index. Check server logs for the creation link.',
        message: msg,
      });
    }

    res.status(500).json({
      error: 'Failed to get review results',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /admin/reviews/results/:id
 * Get a single review result with full comparison data.
 */
router.get('/results/:id', async (req: Request, res: Response) => {
  try {
    const result = await getReviewResult(req.params.id);

    if (!result) {
      return res.status(404).json({ error: 'Review result not found' });
    }

    res.json(result);
  } catch (error: unknown) {
    console.error('Get review result error:', error);
    res.status(500).json({
      error: 'Failed to get review result',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /admin/reviews/active
 * Get currently queued + running reviews (for Queue Reviews tab).
 */
router.get('/active', async (_req: Request, res: Response) => {
  try {
    const results = await getActiveReviews();
    res.json(results);
  } catch (error: unknown) {
    console.error('Get active reviews error:', error);
    res.status(500).json({
      error: 'Failed to get active reviews',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /admin/reviews/latest/:cardId
 * Get latest successful review for a specific card.
 */
router.get('/latest/:cardId', async (req: Request, res: Response) => {
  try {
    const result = await getLatestReviewForCard(req.params.cardId);

    if (!result) {
      return res.json(null);
    }

    res.json(result);
  } catch (error: unknown) {
    console.error('Get latest review error:', error);
    res.status(500).json({
      error: 'Failed to get latest review',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /admin/reviews/last-reviewed-dates
 * Returns a map of referenceCardId -> latest successful reviewedAt timestamp.
 * Used by the cards list page for the "Last Reviewed" column.
 */
router.get('/last-reviewed-dates', async (_req: Request, res: Response) => {
  try {
    const dates = await getLastReviewedDates();
    res.json(dates);
  } catch (error: unknown) {
    console.error('Get last reviewed dates error:', error);
    res.status(500).json({
      error: 'Failed to get last reviewed dates',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /admin/reviews/last-run-dates
 * Returns a map of referenceCardId -> latest successful reviewedAt timestamp.
 * Includes ALL successful reviews regardless of human review status.
 * Used by the queue modal for the "Last Run" column.
 */
router.get('/last-run-dates', async (_req: Request, res: Response) => {
  try {
    const dates = await getLastRunDates();
    res.json(dates);
  } catch (error: unknown) {
    console.error('Get last run dates error:', error);
    res.status(500).json({
      error: 'Failed to get last run dates',
      message: getErrorMessage(error),
    });
  }
});

/**
 * PATCH /admin/reviews/results/:id/dismiss-url
 * Dismiss a suggested URL replacement on a review result.
 */
router.patch('/results/:id/dismiss-url', async (req: Request, res: Response) => {
  try {
    const parsed = DismissUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    await dismissSuggestedUrl(req.params.id, parsed.data.urlIndex);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Dismiss URL error:', error);

    const msg = getErrorMessage(error);

    if (msg.includes('not found')) {
      return res.status(404).json({ error: msg });
    }
    if (msg.includes('Invalid URL index')) {
      return res.status(400).json({ error: msg });
    }

    res.status(500).json({
      error: 'Failed to dismiss URL',
      message: msg,
    });
  }
});

/**
 * PATCH /admin/reviews/results/:id/review-status
 * Update the human review status and/or reviewed item indices.
 */
router.patch('/results/:id/review-status', async (req: Request, res: Response) => {
  try {
    const parsed = UpdateReviewStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    await updateReviewStatus(req.params.id, parsed.data);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Update review status error:', error);

    const msg = getErrorMessage(error);

    if (msg.includes('not found')) {
      return res.status(404).json({ error: msg });
    }

    res.status(500).json({
      error: 'Failed to update review status',
      message: msg,
    });
  }
});

/**
 * POST /admin/reviews/results/:id/cancel
 * Cancel a single queued or running review.
 */
router.post('/results/:id/cancel', async (req: Request, res: Response) => {
  try {
    const cancelled = await cancelReview(req.params.id);

    if (!cancelled) {
      return res.status(400).json({ error: 'Review is not in a cancellable state' });
    }

    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Cancel review error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: 'Failed to cancel review', message });
  }
});

/**
 * POST /admin/reviews/cancel-all
 * Cancel all queued and running reviews.
 */
router.post('/cancel-all', async (_req: Request, res: Response) => {
  try {
    const count = await cancelAllActiveReviews();
    res.json({ success: true, cancelled: count });
  } catch (error: unknown) {
    console.error('Cancel all reviews error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to cancel reviews', message });
  }
});

/**
 * DELETE /admin/reviews/results/:id
 * Delete a completed review result.
 */
router.delete('/results/:id', async (req: Request, res: Response) => {
  try {
    await deleteReviewResult(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete review error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    if (message.includes('Cannot delete a review that is queued or running')) {
      return res.status(400).json({ error: message });
    }

    res.status(500).json({ error: 'Failed to delete review', message });
  }
});

export default router;
