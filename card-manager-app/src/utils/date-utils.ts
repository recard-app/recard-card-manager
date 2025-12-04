import { ONGOING_SENTINEL_DATE, isOngoingDate } from '@/types';

/**
 * Parse a YYYY-MM-DD date string as a local calendar date (no timezone shift)
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

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
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
 * Get current date in ISO format (YYYY-MM-DD) using local timezone
 */
export function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const s1 = parseLocalDate(start1);
  const e1 = parseLocalDate(end1 || ONGOING_SENTINEL_DATE);
  const s2 = parseLocalDate(start2);
  const e2 = parseLocalDate(end2 || ONGOING_SENTINEL_DATE);

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
