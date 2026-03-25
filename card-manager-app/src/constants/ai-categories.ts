/**
 * AI-facing categories and subcategories.
 *
 * This MUST match the backend source of truth at:
 * CardManager/admin-server/constants/categories.ts
 *
 * These are used for:
 * - Frontend schema validation (check/X marks on AI output)
 * - Generate-all programmatic warning display
 *
 * The frontend form-options.ts has a separate list that includes "custom category"
 * for manual editing. This file is strictly for validating AI-generated data.
 */
export const AI_CATEGORIES: Record<string, readonly string[]> = {
  travel: ['flights', 'hotels', 'portal', 'lounge access', 'ground transportation', 'car rental', 'tsa'],
  dining: [],
  shopping: ['supermarkets', 'online shopping', 'online grocery', 'drugstores', 'retail', 'department stores'],
  gas: ['gas stations', 'ev charging'],
  entertainment: ['streaming'],
  lifestyle: ['gyms', 'wellness'],
  transportation: ['rideshare'],
  transit: [],
  general: ['entertainment'],
  portal: [],
  rent: [],
  insurance: ['purchase', 'travel', 'car rental', 'cell phone protection', 'rental car protection'],
  'rewards boost': [],
};

export const VALID_AI_CATEGORIES = Object.keys(AI_CATEGORIES);

export function isValidAICategory(category: string): boolean {
  return VALID_AI_CATEGORIES.includes(category);
}

export function isValidAISubCategory(category: string, subCategory: string): boolean {
  if (subCategory === '') return true;
  const validSubs = AI_CATEGORIES[category];
  if (!validSubs || validSubs.length === 0) return true;
  return validSubs.includes(subCategory);
}
