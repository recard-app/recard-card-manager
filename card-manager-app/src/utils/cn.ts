import clsx from 'clsx';
import type { ClassValue } from 'clsx';

/**
 * Utility for conditional classnames
 * Uses clsx for combining class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
