/**
 * Sentinel value for ongoing/present effectiveTo dates
 */
export const ONGOING_SENTINEL_DATE = '9999-12-31';

/**
 * Type guard to check if a date string represents an ongoing date
 */
export function isOngoingDate(dateString: string): boolean {
  return dateString === ONGOING_SENTINEL_DATE;
}

/**
 * Converts an empty string or null to the ongoing sentinel date
 */
export function normalizeEffectiveTo(dateString: string | null | undefined): string {
  if (!dateString || dateString === '') {
    return ONGOING_SENTINEL_DATE;
  }
  return dateString;
}

/**
 * Converts the ongoing sentinel date to empty string for display
 */
export function denormalizeEffectiveTo(dateString: string): string {
  if (dateString === ONGOING_SENTINEL_DATE) {
    return '';
  }
  return dateString;
}

