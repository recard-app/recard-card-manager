/**
 * Gemini API pricing constants (per 1M tokens, in USD)
 *
 * These are frontend-only copies of the pricing rates.
 * Do NOT import from admin-server/types/review-types.ts — that file uses backend-only paths.
 *
 * Source: https://ai.google.dev/gemini-api/docs/pricing
 * Last verified: March 2026
 * Rates should be verified at implementation time as Google may update pricing.
 */

export const GEMINI_PRO_PRICING = {
  inputPerMToken: 2.00,                  // Prompts <= 200K tokens
  inputLargePerMToken: 4.00,             // Prompts > 200K tokens
  outputPerMToken: 12.00,                // Includes thinking tokens, prompts <= 200K
  outputLargePerMToken: 18.00,           // Includes thinking tokens, prompts > 200K
} as const;

export const GEMINI_FLASH_PRICING = {
  inputPerMToken: 0.15,
  outputPerMToken: 0.60,                 // Includes thinking tokens
} as const;

/**
 * Calculate cost for a single API call.
 */
export function calculateCallCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const isFlash = model.includes('flash');
  const isLargePrompt = inputTokens > 200_000;

  if (isFlash) {
    const inputCost = (inputTokens / 1_000_000) * GEMINI_FLASH_PRICING.inputPerMToken;
    const outputCost = (outputTokens / 1_000_000) * GEMINI_FLASH_PRICING.outputPerMToken;
    return inputCost + outputCost;
  }

  const inputRate = isLargePrompt
    ? GEMINI_PRO_PRICING.inputLargePerMToken
    : GEMINI_PRO_PRICING.inputPerMToken;
  const outputRate = isLargePrompt
    ? GEMINI_PRO_PRICING.outputLargePerMToken
    : GEMINI_PRO_PRICING.outputPerMToken;

  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * outputRate;
  return inputCost + outputCost;
}

/**
 * Format a cost value for display.
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '<$0.01';
  }
  return `$${cost.toFixed(2)}`;
}
