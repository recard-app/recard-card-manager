/**
 * AI-facing categories and subcategories.
 *
 * This is the authoritative source of truth for category validation in:
 * - AI prompt construction (ai.service.ts)
 * - Programmatic category validation (ai.service.ts validateCategories)
 * - Bulk create category validation (routes/components.ts)
 *
 * NOTE: The frontend form-options.ts has a separate category list that includes
 * "custom category" for manual form editing. That is NOT used for AI validation.
 * Bulk create only accepts categories from THIS list.
 */
export const CATEGORIES: Record<string, readonly string[]> = {
  travel: ['flights', 'hotels', 'portal', 'lounge access', 'ground transportation', 'car rental', 'tsa'],
  dining: [],
  shopping: ['supermarkets', 'online shopping', 'online grocery', 'drugstores', 'retail', 'department stores'],
  gas: ['gas stations', 'ev charging'],
  entertainment: ['streaming'],
  transportation: ['rideshare'],
  transit: [],
  general: ['entertainment'],
  portal: [],
  rent: [],
  insurance: ['purchase', 'travel', 'car rental', 'cell phone protection', 'rental car protection'],
  'rewards boost': [],
};

export const VALID_CATEGORIES = Object.keys(CATEGORIES);

/**
 * Checks if a category is valid in the AI-facing category list.
 */
export function isValidCategory(category: string): boolean {
  return VALID_CATEGORIES.includes(category);
}

/**
 * Checks if a subcategory is valid for a given category.
 * Returns true if the category has no defined subcategories (empty array).
 */
export function isValidSubCategory(category: string, subCategory: string): boolean {
  const validSubs = CATEGORIES[category];
  if (!validSubs || validSubs.length === 0) return true;
  return validSubs.includes(subCategory);
}
