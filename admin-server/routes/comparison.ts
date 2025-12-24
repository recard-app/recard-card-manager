import { Router, Request, Response } from 'express';
import { verifyAuth } from '../middleware/auth';
import { analyzeComparison } from '../services/comparison.service';
import { z } from 'zod';

const router = Router();

// Validation schema for comparison request
const ComparisonRequestSchema = z.object({
  referenceCardId: z.string().min(1, 'Reference Card ID is required'),
  versionId: z.string().min(1, 'Version ID is required'),
  websiteText: z.string().min(1, 'Website text is required'),
});

/**
 * POST /admin/comparison/analyze
 * Compare database card data against website text to identify discrepancies
 */
router.post('/analyze', verifyAuth, async (req: Request, res: Response) => {
  try {
    const parsed = ComparisonRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    const { referenceCardId, versionId, websiteText } = parsed.data;

    const result = await analyzeComparison({
      referenceCardId,
      versionId,
      websiteText,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Comparison analysis error:', error);
    console.error('Error stack:', error.stack);

    // Handle specific error types
    if (error.message?.includes('GEMINI_API_KEY')) {
      return res.status(500).json({
        error:
          'AI service not configured. Please set the GEMINI_API_KEY environment variable.',
      });
    }

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: error.message,
      });
    }

    if (error.message?.includes('does not belong')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    if (error.message?.includes('JSON')) {
      return res.status(500).json({
        error: 'Failed to parse AI response. Please try again.',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to analyze comparison',
      message: error.message || 'Unknown error',
    });
  }
});

export default router;
