/**
 * Shared URL utilities for the review system.
 */

/**
 * Normalizes an array of website URLs:
 * - Filters to HTTPS only
 * - Deduplicates
 * - Trims whitespace
 * - Validates URL format
 */
export function normalizeWebsiteUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    let normalizedUrl: string;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') continue;
      normalizedUrl = parsed.toString();
    } catch {
      continue;
    }

    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);
    urls.push(normalizedUrl);
  }

  return urls;
}
