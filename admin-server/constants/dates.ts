/**
 * ================================================================================================
 * DATE CONSTANTS
 * ================================================================================================
 *
 * Constants for date handling across the application
 *
 * ================================================================================================
 */

/**
 * Sentinel value for ongoing/present effectiveTo dates
 *
 * Used to represent components or versions that have no end date (are "ongoing").
 *
 * Why "9999-12-31"?
 * - Sorts correctly in Firestore queries (ongoing items appear last when sorted ASC)
 * - Works with composite indexes like (ReferenceCardId ASC, effectiveTo DESC)
 * - Simplifies date overlap calculations
 * - Standard practice in temporal databases
 *
 * Usage:
 * - When a component/version has no end date, set effectiveTo = ONGOING_SENTINEL_DATE
 * - When querying for currently active items, compare against this date
 * - In date overlap calculations, this value represents "far future"
 *
 * @example
 * ```typescript
 * // Creating an ongoing credit
 * const credit: CardCredit = {
 *   id: 'credit-1',
 *   EffectiveFrom: '2025-01-01',
 *   EffectiveTo: ONGOING_SENTINEL_DATE,  // This credit is ongoing
 *   // ... other fields
 * };
 *
 * // Querying for active components
 * const today = new Date().toISOString().split('T')[0];
 * db.collection('credit_cards_credits')
 *   .where('EffectiveTo', '>=', today)  // Includes ongoing items
 *   .get();
 * ```
 */
export const ONGOING_SENTINEL_DATE = '9999-12-31';

/**
 * Type guard to check if a date string represents an ongoing date
 *
 * @param dateString The date string to check
 * @returns true if the date is the ongoing sentinel value
 */
export function isOngoingDate(dateString: string): boolean {
  return dateString === ONGOING_SENTINEL_DATE;
}

/**
 * Converts an empty string or null to the ongoing sentinel date
 *
 * Use this when accepting date input that may use empty string for "ongoing"
 *
 * @param dateString The date string (may be empty or null)
 * @returns The sentinel date if empty/null, otherwise the original date
 */
export function normalizeEffectiveTo(dateString: string | null | undefined): string {
  if (!dateString || dateString === '') {
    return ONGOING_SENTINEL_DATE;
  }
  return dateString;
}

/**
 * Converts the ongoing sentinel date to empty string for API responses
 *
 * Use this if you want to hide the sentinel value from API clients
 *
 * @param dateString The date string
 * @returns Empty string if it's the sentinel, otherwise the original date
 */
export function denormalizeEffectiveTo(dateString: string): string {
  if (dateString === ONGOING_SENTINEL_DATE) {
    return '';
  }
  return dateString;
}

