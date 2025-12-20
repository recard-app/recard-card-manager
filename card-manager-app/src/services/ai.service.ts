import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';

export type GenerationType = 'card' | 'credit' | 'perk' | 'multiplier';

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

export interface GenerationResult {
  items: GeneratedItem[];
  modelUsed: string;
}

export interface GenerateRequest {
  rawData: string;
  generationType: GenerationType;
  batchMode?: boolean;
  refinementPrompt?: string;
  previousOutput?: Record<string, unknown> | Record<string, unknown>[];
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

