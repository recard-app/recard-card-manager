import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';

export type GenerationType = 'card' | 'credit' | 'perk' | 'multiplier' | 'rotating-categories' | 'generate-all';

// Available models for selection
export const AI_MODELS = {
  GEMINI_31_PRO_PREVIEW: 'gemini-3.1-pro-preview',
  GEMINI_25_PRO: 'gemini-2.5-pro',
  GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview',
} as const;

export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];

export const AI_MODEL_OPTIONS = [
  { value: AI_MODELS.GEMINI_31_PRO_PREVIEW, label: 'Gemini 3.1 Pro' },
  { value: AI_MODELS.GEMINI_25_PRO, label: 'Gemini 2.5 Pro' },
  { value: AI_MODELS.GEMINI_3_FLASH_PREVIEW, label: 'Gemini 3 Flash' },
];

// Pro-only models (for primary generation in generate-all)
export const AI_PRO_MODEL_OPTIONS = [
  { value: AI_MODELS.GEMINI_31_PRO_PREVIEW, label: 'Gemini 3.1 Pro' },
  { value: AI_MODELS.GEMINI_25_PRO, label: 'Gemini 2.5 Pro' },
];

// Flash-only models (for validation/checking in generate-all)
export const AI_FLASH_MODEL_OPTIONS = [
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
  json: Record<string, unknown> | unknown[];
  isValid?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// Token breakdown interfaces for detailed per-call reporting
export interface TokenBreakdownEntry {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  model: string;
}

export interface TokenBreakdown {
  generation: TokenBreakdownEntry;
  validation?: TokenBreakdownEntry;
}

// Warning interfaces for programmatic post-generation checks
export type ComponentType = 'credit' | 'perk' | 'multiplier';

export interface CategoryWarning {
  componentType: ComponentType;
  itemIndex: number;
  field: 'Category' | 'SubCategory';
  value: string;
  message: string;
}

export interface DuplicateWarning {
  itemA: { type: ComponentType; index: number; title: string };
  itemB: { type: ComponentType; index: number; title: string };
  confidence: 'high' | 'medium';
}

export interface GenerationWarnings {
  categoryWarnings: CategoryWarning[];
  duplicateWarnings: DuplicateWarning[];
}

// Generate-all component group structure
export interface GenerateAllComponentGroup {
  _componentType: ComponentType;
  items: Record<string, unknown>[];
}

export interface GenerationResult {
  items: GeneratedItem[];
  modelUsed: string;
  tokenUsage?: TokenUsage;
  tokenBreakdown?: TokenBreakdown;
  warnings?: GenerationWarnings;
}

export interface GenerateRequest {
  rawData: string;
  generationType: GenerationType;
  batchMode?: boolean;
  refinementPrompt?: string;
  previousOutput?: Record<string, unknown> | Record<string, unknown>[];
  model?: AIModel;
  checkerModel?: AIModel;
  cardName?: string;
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

