import { ONGOING_SENTINEL_DATE, isOngoingDate } from '@/types';

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) {
    return 'N/A';
  }

  if (isOngoingDate(dateString)) {
    return 'Ongoing';
  }

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(from: string, to: string): string {
  const fromFormatted = formatDate(from);
  const toFormatted = formatDate(to);

  if (toFormatted === 'Ongoing') {
    return `${fromFormatted} - Present`;
  }

  return `${fromFormatted} - ${toFormatted}`;
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current date in full ISO format
 */
export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

/**
 * Check if two date ranges overlap
 */
export function datesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = new Date(start1);
  const e1 = new Date(end1 || ONGOING_SENTINEL_DATE);
  const s2 = new Date(start2);
  const e2 = new Date(end2 || ONGOING_SENTINEL_DATE);

  return s1 <= e2 && s2 <= e1;
}

/**
 * Convert date string to YYYY-MM-DD format
 */
export function toISODate(date: Date | string): string {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return date.toISOString().split('T')[0];
}
