import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';

export type GenerationType = 'card' | 'credit' | 'perk' | 'multiplier';

// Available models for selection
export const AI_MODELS = {
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',
  GEMINI_25_PRO: 'gemini-2.5-pro',
  GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview',
} as const;

export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];

export const AI_MODEL_OPTIONS = [
  { value: AI_MODELS.GEMINI_3_PRO_PREVIEW, label: 'Gemini 3 Pro' },
  { value: AI_MODELS.GEMINI_25_PRO, label: 'Gemini 2.5 Pro' },
  { value: AI_MODELS.GEMINI_3_FLASH_PREVIEW, label: 'Gemini 3 Flash' },
];

export interface GeneratedField {
  key: string;
  label: string;
  value: string | number | null;
  isValid?: boolean;
  validationError?: string;
}

export interface GeneratedItem {
  fields: GeneratedField[];
  json: Record<string, unknown>;
  isValid?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerationResult {
  items: GeneratedItem[];
  modelUsed: string;
  tokenUsage?: TokenUsage;
}

export interface GenerateRequest {
  rawData: string;
  generationType: GenerationType;
  batchMode?: boolean;
  refinementPrompt?: string;
  previousOutput?: Record<string, unknown> | Record<string, unknown>[];
  model?: AIModel;
}

export const AIService = {
  /**
   * Generate structured data from raw text using AI
   */
  async generate(request: GenerateRequest): Promise<GenerationResult> {
    const response = await apiClient.post<GenerationResult>(
      API_ROUTES.AI.GENERATE,
      request
    );
    return response.data;
  },
};

