import { Router, Request, Response } from 'express';
import { verifyAuth } from '../middleware/auth';
import { generateData, GenerationType } from '../services/ai.service';
import { z } from 'zod';

const router = Router();

// Validation schema for generate request
const GenerateRequestSchema = z.object({
  rawData: z.string().min(1, 'Raw data is required'),
  generationType: z.enum(['card', 'credit', 'perk', 'multiplier']),
  batchMode: z.boolean().optional(),
  refinementPrompt: z.string().optional(),
  previousOutput: z.record(z.unknown()).optional(),
});

// POST /admin/ai/generate - Generate structured data from raw text using AI
router.post('/generate', verifyAuth, async (req: Request, res: Response) => {
  try {
    const parsed = GenerateRequestSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.errors,
      });
    }

    const { rawData, generationType, batchMode, refinementPrompt, previousOutput } = parsed.data;

    const result = await generateData({
      rawData,
      generationType: generationType as GenerationType,
      batchMode,
      refinementPrompt,
      previousOutput,
    });

    res.json(result);
  } catch (error: any) {
    console.error('AI generation error:', error);
    
    // Handle specific error types
    if (error.message?.includes('GEMINI_API_KEY')) {
      return res.status(500).json({
        error: 'AI service not configured. Please set the GEMINI_API_KEY environment variable.',
      });
    }
    
    if (error.message?.includes('JSON')) {
      return res.status(500).json({
        error: 'Failed to parse AI response. Please try again.',
      });
    }

    res.status(500).json({
      error: 'Failed to generate data',
      message: error.message || 'Unknown error',
    });
  }
});

export default router;
