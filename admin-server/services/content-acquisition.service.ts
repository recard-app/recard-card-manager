/**
 * Content Acquisition Service
 *
 * Scrapes credit card issuer websites to extract content for automated reviews.
 * Uses a multi-tier approach:
 *   1. Cloudflare Browser Rendering /markdown (primary)
 *   2. Cloudflare Browser Rendering /content + turndown (fallback for hidden content)
 *   3. Jina Reader (final fallback)
 *
 * Handles content validation, token estimation, truncation, and URL status detection.
 */

import TurndownService from 'turndown';
import dns from 'node:dns';
import net from 'node:net';
import { GoogleGenAI } from '@google/genai';
import type { UrlResult, ScrapeSource, UrlStatus } from '../types/review-types';

// ============================================
// CONSTANTS
// ============================================

/** Timeout for individual scraper fetch calls (ms) */
const SCRAPE_FETCH_TIMEOUT = 30_000; // 30 seconds

/** Minimum content length (chars) to consider a scrape successful */
const MIN_CONTENT_LENGTH = 200;

/**
 * Content below this threshold from /markdown triggers a /content fallback.
 * If /markdown returns less than this, the page likely has hidden content
 * (accordions, tabs, collapsed sections) that /content can capture.
 */
const MARKDOWN_FALLBACK_THRESHOLD = 500;

/** Total combined content cap in estimated tokens (~120K chars) */
const MAX_TOTAL_TOKENS = 30_000;

/** Approximate chars per token for English text */
const CHARS_PER_TOKEN = 4;

/** Max total content in chars (derived from token cap) */
const MAX_TOTAL_CHARS = MAX_TOTAL_TOKENS * CHARS_PER_TOKEN;

/** Cloudflare Browser Rendering base URL */
const CF_BASE_URL = 'https://api.cloudflare.com/client/v4/accounts';
const URL_SEARCH_MODEL = 'gemini-2.5-pro';

/**
 * Request body options shared across Cloudflare endpoints.
 * networkidle0 waits for no network connections for 500ms (handles SPAs).
 * rejectRequestPattern skips assets we don't need (faster, less browser time).
 */
const CF_REQUEST_OPTIONS = {
  gotoOptions: {
    waitUntil: 'networkidle0' as const,
  },
  rejectRequestPattern: ['.*\\.(css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)'],
};

/** Common error page indicators */
const ERROR_PAGE_PATTERNS = [
  'page not found',
  '404 not found',
  'access denied',
  'please enable javascript',
  'please verify you are a human',
  'captcha',
  'cloudflare ray id',
  'just a moment',
];

// ============================================
// TYPES
// ============================================

/**
 * Result of scraping a single URL
 */
export interface ScrapeResult {
  content: string;
  source: ScrapeSource;
  browserTimeMs?: number;
  error?: string;
  success: boolean;
  redirectedTo?: string;  // Final URL if redirect was detected
  blocked?: boolean;      // True if blocked by SSRF/DNS validation (source field is not meaningful)
}

/**
 * Result of scraping all URLs for a card
 */
export interface CardScrapeResult {
  combinedContent: string;
  urlResults: UrlResult[];
  totalContentLength: number;
  totalContentTokens: number;
}

/**
 * Content validation result
 */
export interface ContentValidation {
  isValid: boolean;
  reason?: string;
}

// ============================================
// TURNDOWN INSTANCE
// ============================================

/** Reusable turndown instance for HTML-to-markdown conversion */
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Estimates the token count for a piece of text.
 * Uses a simple character-based approximation: tokens ~ content.length / 4.
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / CHARS_PER_TOKEN);
}

// ============================================
// URL VALIDATION (SSRF Prevention)
// ============================================

/**
 * Validates a URL before scraping. Checks:
 * - Must use https:// protocol
 * - Hostname must not resolve to private IP ranges
 *
 * Since Cloudflare and Jina run in their own sandboxed environments,
 * this is defense-in-depth for admin-only users.
 */
export function validateUrlForScraping(url: string): ContentValidation {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { isValid: false, reason: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:') {
    return { isValid: false, reason: 'URL must use https://' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block private/internal hostnames
  const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
  if (blockedHostnames.includes(hostname)) {
    return { isValid: false, reason: 'URL points to a local address' };
  }

  // Block private IP ranges
  const privatePatterns = [
    /^10\./,           // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
    /^192\.168\./,     // 192.168.0.0/16
    /^169\.254\./,     // Link-local
  ];

  for (const pattern of privatePatterns) {
    if (pattern.test(hostname)) {
      return { isValid: false, reason: 'URL points to a private IP address' };
    }
  }

  return { isValid: true };
}

/**
 * Returns true when an IP (v4 or v6) is local/private/reserved.
 */
function isPrivateOrReservedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 0) return false;

  // Handle IPv4-mapped IPv6 notation, e.g. ::ffff:127.0.0.1
  if (version === 6 && ip.toLowerCase().startsWith('::ffff:')) {
    const mapped = ip.substring(7);
    if (net.isIP(mapped) === 4) {
      return isPrivateOrReservedIp(mapped);
    }
  }

  if (version === 4) {
    return (
      /^0\./.test(ip) ||
      /^10\./.test(ip) ||
      /^127\./.test(ip) ||
      /^169\.254\./.test(ip) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^198\.(1[8-9])\./.test(ip) ||
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)
    );
  }

  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') || // fc00::/7 (ULA)
    normalized.startsWith('fd') || // fc00::/7 (ULA)
    normalized.startsWith('fe8') || // fe80::/10 (link-local)
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

/**
 * Best-effort DNS resolution check for private IP targets.
 */
async function resolvesToPrivateAddress(hostname: string): Promise<boolean> {
  const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) return false;
  return records.some(record => isPrivateOrReservedIp(record.address));
}

// ============================================
// CONTENT VALIDATION
// ============================================

/**
 * Validates scraped content for quality and relevance.
 * Checks minimum length, card name presence, and error page detection.
 */
export function validateContent(content: string, cardName: string): ContentValidation {
  if (!content || content.trim().length === 0) {
    return { isValid: false, reason: 'Empty content' };
  }

  if (content.trim().length < MIN_CONTENT_LENGTH) {
    return { isValid: false, reason: `Content too short (${content.trim().length} chars, minimum ${MIN_CONTENT_LENGTH})` };
  }

  // Check for error page indicators
  const lowerContent = content.toLowerCase();
  for (const pattern of ERROR_PAGE_PATTERNS) {
    if (lowerContent.includes(pattern) && content.trim().length < 1000) {
      return { isValid: false, reason: `Content appears to be an error page (contains "${pattern}")` };
    }
  }

  // Check if card name is mentioned (case-insensitive)
  // Split card name into words and check if most key words appear
  const cardWords = cardName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const matchedWords = cardWords.filter(word => lowerContent.includes(word));
  const matchRatio = cardWords.length > 0 ? matchedWords.length / cardWords.length : 0;

  if (matchRatio < 0.5) {
    return {
      isValid: false,
      reason: `Content does not appear to mention "${cardName}" (matched ${matchedWords.length}/${cardWords.length} key words)`,
    };
  }

  return { isValid: true };
}

// ============================================
// SCRAPING FUNCTIONS
// ============================================

/**
 * Scrapes a URL using Cloudflare Browser Rendering /markdown endpoint.
 */
async function scrapeWithCloudflareMarkdown(url: string): Promise<ScrapeResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return { content: '', source: 'cloudflare-markdown', success: false, error: 'CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not set' };
  }

  try {
    const response = await fetch(`${CF_BASE_URL}/${accountId}/browser-rendering/markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        url,
        ...CF_REQUEST_OPTIONS,
      }),
      signal: AbortSignal.timeout(SCRAPE_FETCH_TIMEOUT),
    });

    const browserTimeMs = parseInt(response.headers.get('x-browser-ms-used') || '0', 10) || undefined;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        content: '',
        source: 'cloudflare-markdown',
        browserTimeMs,
        success: false,
        error: `Cloudflare /markdown returned ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json() as { success: boolean; result: string };

    if (!data.success || !data.result) {
      return {
        content: '',
        source: 'cloudflare-markdown',
        browserTimeMs,
        success: false,
        error: 'Cloudflare /markdown returned success=false or empty result',
      };
    }

    return {
      content: data.result,
      source: 'cloudflare-markdown',
      browserTimeMs,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: '', source: 'cloudflare-markdown', success: false, error: `Cloudflare /markdown error: ${message}` };
  }
}

/**
 * Scrapes a URL using Cloudflare Browser Rendering /content endpoint.
 * Returns full rendered HTML including CSS-hidden DOM elements (accordions, tabs, collapsed sections).
 * Converts HTML to markdown using turndown.
 */
async function scrapeWithCloudflareContent(url: string): Promise<ScrapeResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return { content: '', source: 'cloudflare-content', success: false, error: 'CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not set' };
  }

  try {
    const response = await fetch(`${CF_BASE_URL}/${accountId}/browser-rendering/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        url,
        ...CF_REQUEST_OPTIONS,
      }),
      signal: AbortSignal.timeout(SCRAPE_FETCH_TIMEOUT),
    });

    const browserTimeMs = parseInt(response.headers.get('x-browser-ms-used') || '0', 10) || undefined;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        content: '',
        source: 'cloudflare-content',
        browserTimeMs,
        success: false,
        error: `Cloudflare /content returned ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json() as { success: boolean; result: string };

    if (!data.success || !data.result) {
      return {
        content: '',
        source: 'cloudflare-content',
        browserTimeMs,
        success: false,
        error: 'Cloudflare /content returned success=false or empty result',
      };
    }

    // Convert HTML to markdown
    const markdown = turndownService.turndown(data.result);

    return {
      content: markdown,
      source: 'cloudflare-content',
      browserTimeMs,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: '', source: 'cloudflare-content', success: false, error: `Cloudflare /content error: ${message}` };
  }
}

/**
 * Scrapes a URL using Jina Reader API.
 * Simple GET request: https://r.jina.ai/{url}
 * Free: 10M tokens with API key (100 RPM), 20 RPM without key.
 */
async function scrapeWithJina(url: string): Promise<ScrapeResult> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'text/markdown',
    };

    const jinaApiKey = process.env.JINA_API_KEY;
    if (jinaApiKey) {
      headers['Authorization'] = `Bearer ${jinaApiKey}`;
    }

    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers,
      signal: AbortSignal.timeout(SCRAPE_FETCH_TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        content: '',
        source: 'jina',
        success: false,
        error: `Jina Reader returned ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const content = await response.text();

    return {
      content,
      source: 'jina',
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: '', source: 'jina', success: false, error: `Jina Reader error: ${message}` };
  }
}

// ============================================
// MAIN SCRAPING PIPELINE
// ============================================

/**
 * Scrapes a single URL using the multi-tier fallback pipeline:
 * 1. Cloudflare /markdown
 * 2. Cloudflare /content (if /markdown returns too little)
 * 3. Jina Reader (final fallback)
 *
 * Validates the URL for SSRF before scraping.
 * Validates the content quality after scraping.
 */
export async function scrapeUrl(url: string, cardName: string): Promise<ScrapeResult> {
  // SSRF validation
  const urlValidation = validateUrlForScraping(url);
  if (!urlValidation.isValid) {
    return { content: '', source: 'cloudflare-markdown', success: false, error: urlValidation.reason, blocked: true };
  }

  // Defense-in-depth DNS resolution check to block private targets behind public hostnames.
  try {
    const hostname = new URL(url).hostname;
    const resolvesPrivate = await resolvesToPrivateAddress(hostname);
    if (resolvesPrivate) {
      return {
        content: '',
        source: 'cloudflare-markdown',
        success: false,
        error: 'URL resolves to a private or reserved IP address',
        blocked: true,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: '',
      source: 'cloudflare-markdown',
      success: false,
      error: `Failed DNS safety check: ${message}`,
      blocked: true,
    };
  }

  // Check for redirects via HEAD request (best-effort, non-blocking)
  let redirectedTo: string | undefined;
  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    // If the final URL differs from the original, it was redirected
    if (headResponse.url && headResponse.url !== url) {
      const originalHost = new URL(url).hostname;
      const finalHost = new URL(headResponse.url).hostname;
      // Only count as redirect if the URL actually changed meaningfully
      // (ignore trailing slash differences)
      const normalize = (u: string) => u.replace(/\/+$/, '').toLowerCase();
      if (normalize(headResponse.url) !== normalize(url)) {
        redirectedTo = headResponse.url;
        console.log(`[scrapeUrl] Redirect detected: ${url} -> ${redirectedTo}`);
      }
    }
  } catch {
    // HEAD request failed -- proceed without redirect info
  }

  // Tier 1: Cloudflare /markdown
  console.log(`[scrapeUrl] Trying Cloudflare /markdown for: ${url}`);
  const markdownResult = await scrapeWithCloudflareMarkdown(url);

  if (markdownResult.success) {
    const validation = validateContent(markdownResult.content, cardName);
    if (validation.isValid && markdownResult.content.length >= MARKDOWN_FALLBACK_THRESHOLD) {
      console.log(`[scrapeUrl] Cloudflare /markdown succeeded: ${markdownResult.content.length} chars`);
      return { ...markdownResult, redirectedTo };
    }
    console.log(`[scrapeUrl] Cloudflare /markdown content insufficient (${markdownResult.content.length} chars), trying /content fallback`);
  } else {
    console.log(`[scrapeUrl] Cloudflare /markdown failed: ${markdownResult.error}`);
  }

  // Tier 2: Cloudflare /content (HTML -> turndown)
  console.log(`[scrapeUrl] Trying Cloudflare /content for: ${url}`);
  const contentResult = await scrapeWithCloudflareContent(url);

  if (contentResult.success) {
    const validation = validateContent(contentResult.content, cardName);
    if (validation.isValid) {
      console.log(`[scrapeUrl] Cloudflare /content succeeded: ${contentResult.content.length} chars`);
      return { ...contentResult, redirectedTo };
    }
    console.log(`[scrapeUrl] Cloudflare /content content invalid: ${validation.reason}`);
  } else {
    console.log(`[scrapeUrl] Cloudflare /content failed: ${contentResult.error}`);
  }

  // Tier 3: Jina Reader
  console.log(`[scrapeUrl] Trying Jina Reader for: ${url}`);
  const jinaResult = await scrapeWithJina(url);

  if (jinaResult.success) {
    const validation = validateContent(jinaResult.content, cardName);
    if (validation.isValid) {
      console.log(`[scrapeUrl] Jina Reader succeeded: ${jinaResult.content.length} chars`);
      return { ...jinaResult, redirectedTo };
    }
    console.log(`[scrapeUrl] Jina Reader content invalid: ${validation.reason}`);
  } else {
    console.log(`[scrapeUrl] Jina Reader failed: ${jinaResult.error}`);
  }

  // All tiers failed -- return the best error info we have
  // Prefer the Cloudflare /markdown error since it's the primary
  const bestError = markdownResult.error || contentResult.error || jinaResult.error || 'All scraping methods failed';
  return { content: '', source: 'cloudflare-markdown', success: false, error: bestError };
}

/**
 * Scrapes all URLs for a card, validates content, concatenates results,
 * and enforces the total content token cap.
 *
 * Content budget policy:
 * - Total combined cap: ~30K tokens (~120K chars)
 * - If over budget, truncate the last URL's content first
 *   (first URLs are the most important -- primary benefits page)
 * - Individual URL content is NOT truncated before concatenation
 */
export async function scrapeCardUrls(
  urls: string[],
  cardName: string
): Promise<CardScrapeResult> {
  const urlResults: UrlResult[] = [];
  const contentParts: { url: string; content: string; source: ScrapeSource; browserTimeMs?: number }[] = [];

  for (const url of urls) {
    const result = await scrapeUrl(url, cardName);

    if (result.success) {
      const tokens = estimateTokens(result.content);

      urlResults.push({
        url,
        status: result.redirectedTo ? 'redirected' as UrlStatus : 'ok' as UrlStatus,
        source: result.source,
        contentTokens: tokens,
        truncated: false,
        browserTimeMs: result.browserTimeMs,
        redirectedTo: result.redirectedTo,
        scrapedContent: result.content,
      });

      contentParts.push({
        url,
        content: result.content,
        source: result.source,
        browserTimeMs: result.browserTimeMs,
      });
    } else {
      // Determine URL status from the error
      const status = detectUrlStatus(result.error);

      urlResults.push({
        url,
        status,
        source: result.source,
        contentTokens: 0,
        truncated: false,
        browserTimeMs: result.browserTimeMs,
        error: result.error,
      });
    }
  }

  // Concatenate content with source separators
  let combinedContent = '';
  let totalChars = 0;

  for (let i = 0; i < contentParts.length; i++) {
    const part = contentParts[i];
    let partContent = part.content;

    // Account for separator length in remaining budget
    const separatorLength = combinedContent.length > 0
      ? `\n\n--- Source: ${part.url} ---\n\n`.length
      : 0;
    const remainingChars = MAX_TOTAL_CHARS - totalChars - separatorLength;

    if (remainingChars <= 0) {
      // No room left -- mark this and all remaining parts as truncated
      for (let j = i; j < contentParts.length; j++) {
        const truncatedUrl = contentParts[j].url;
        const urlResult = urlResults.find(
          r => r.url === truncatedUrl && (r.status === 'ok' || r.status === 'redirected')
        );
        if (urlResult) {
          urlResult.contentTokensOriginal = urlResult.contentTokens;
          urlResult.contentTokens = 0;
          urlResult.truncated = true;
        }
      }
      console.warn(`[scrapeCardUrls] Content cap reached. Truncated content from ${contentParts.length - i} remaining URL(s).`);
      break;
    }

    if (partContent.length > remainingChars) {
      // Truncate this part to fit
      const originalTokens = estimateTokens(partContent);
      partContent = partContent.substring(0, remainingChars);
      const truncatedTokens = estimateTokens(partContent);

      const urlResult = urlResults.find(
        r => r.url === part.url && (r.status === 'ok' || r.status === 'redirected')
      );
      if (urlResult) {
        urlResult.contentTokensOriginal = originalTokens;
        urlResult.contentTokens = truncatedTokens;
        urlResult.truncated = true;
      }

      console.warn(`[scrapeCardUrls] Truncated content from ${part.url}: ${originalTokens} -> ${truncatedTokens} tokens`);
    }

    // Add separator between parts
    const separator = combinedContent.length > 0
      ? `\n\n--- Source: ${part.url} ---\n\n`
      : '';

    combinedContent += separator + partContent;
    totalChars += separator.length + partContent.length;
  }

  const totalTokens = estimateTokens(combinedContent);

  return {
    combinedContent,
    urlResults,
    totalContentLength: combinedContent.length,
    totalContentTokens: totalTokens,
  };
}

// ============================================
// URL STATUS DETECTION
// ============================================

/**
 * Determines the URL status from a scraping error message.
 * Used when all scraping tiers fail for a URL.
 */
function detectUrlStatus(error?: string): UrlStatus {
  if (!error) return 'broken';

  const lowerError = error.toLowerCase();

  if (lowerError.includes('404') || lowerError.includes('not found')) {
    return 'broken';
  }
  if (lowerError.includes('403') || lowerError.includes('forbidden') || lowerError.includes('access denied')) {
    return 'broken';
  }
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 'broken';
  }
  if (lowerError.includes('does not appear to mention') || lowerError.includes('card name')) {
    return 'stale';
  }
  if (lowerError.includes('error page') || lowerError.includes('captcha')) {
    return 'broken';
  }

  return 'broken';
}

// ============================================
// URL REPLACEMENT SEARCH
// ============================================

/**
 * Extracts all HTTPS URLs from text and removes trailing punctuation.
 */
function extractHttpsUrls(text: string): string[] {
  const matches = text.match(/https:\/\/[^\s<>"'`)\]}]+/gi) ?? [];
  return matches.map(url => url.replace(/[.,;:!?]+$/g, ''));
}

/**
 * Validates that a suggested URL is on the expected issuer domain.
 */
function isValidSuggestionUrl(url: string, issuerDomain: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const normalizedIssuer = issuerDomain.toLowerCase().replace(/^www\./, '');
    const onExpectedDomain =
      hostname === normalizedIssuer || hostname.endsWith(`.${normalizedIssuer}`);

    return parsed.protocol === 'https:' && onExpectedDomain;
  } catch {
    return false;
  }
}

/**
 * Searches for a replacement URL when an existing one is broken or stale.
 * Uses Gemini with search grounding to find the correct page.
 */
export async function searchForReplacementUrl(
  cardName: string,
  issuerDomain: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const normalizedIssuerDomain = issuerDomain.toLowerCase().replace(/^www\./, '').trim();
  if (!normalizedIssuerDomain) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: URL_SEARCH_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                `Find the OFFICIAL public benefits page URL for the credit card "${cardName}".`,
                `The URL must be on the issuer domain "${normalizedIssuerDomain}".`,
                'Return only one HTTPS URL. Do not include markdown or any other text.',
              ].join(' '),
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        maxOutputTokens: 256,
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      return null;
    }

    const candidateUrls = extractHttpsUrls(responseText);
    for (const candidate of candidateUrls) {
      if (isValidSuggestionUrl(candidate, normalizedIssuerDomain)) {
        return candidate;
      }
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[searchForReplacementUrl] Failed to find replacement URL for "${cardName}": ${message}`);
    return null;
  }
}
