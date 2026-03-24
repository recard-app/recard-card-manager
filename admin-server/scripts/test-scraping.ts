/**
 * Test script: Scrape real card issuer URLs using all three approaches.
 *
 * Tests Cloudflare /markdown, Cloudflare /content (HTML -> turndown), and Jina Reader
 * against real card issuer URLs. Compares results to determine which approach works
 * best for each issuer.
 *
 * Usage:
 *   npx ts-node scripts/test-scraping.ts
 *
 * Requires environment variables:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (required for Cloudflare tests)
 *   JINA_API_KEY (optional, improves Jina rate limits)
 */

import dotenv from 'dotenv';
dotenv.config();

import TurndownService from 'turndown';
import { estimateTokens, validateContent, validateUrlForScraping } from '../services/content-acquisition.service';

// ============================================
// CONFIG
// ============================================

const CF_BASE_URL = 'https://api.cloudflare.com/client/v4/accounts';

const CF_REQUEST_OPTIONS = {
  gotoOptions: {
    waitUntil: 'networkidle0' as const,
  },
  rejectRequestPattern: ['.*\\.(css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)'],
};

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

/** Test URLs provided by the user */
const TEST_URLS: { issuer: string; cardName: string; url: string }[] = [
  {
    issuer: 'American Express',
    cardName: 'American Express Gold Card',
    url: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
  },
  {
    issuer: 'American Express',
    cardName: 'American Express Platinum Card',
    url: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
  },
  {
    issuer: 'Chase',
    cardName: 'Chase Sapphire Preferred',
    url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
  },
  {
    issuer: 'Chase',
    cardName: 'Chase Sapphire Reserve',
    url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
  },
  {
    issuer: 'Citi',
    cardName: 'Citi Strata Premier Card',
    url: 'https://www.citi.com/credit-cards/citi-strata-premier-credit-card',
  },
  {
    issuer: 'Capital One',
    cardName: 'Capital One Venture X Rewards Credit Card',
    url: 'https://www.capitalone.com/credit-cards/venture-x/',
  },
  {
    issuer: 'Bank of America',
    cardName: 'Bank of America Premium Rewards Credit Card',
    url: 'https://www.bankofamerica.com/credit-cards/products/premium-rewards-credit-card/',
  },
  {
    issuer: 'Discover',
    cardName: 'Discover it Cash Back',
    url: 'https://www.discover.com/credit-cards/cash-back/it-card.html',
  },
  {
    issuer: 'US Bank',
    cardName: 'U.S. Bank Altitude Reserve Visa Infinite Card',
    url: 'https://www.usbank.com/credit-cards/altitude-reserve-visa-infinite-credit-card.html',
  },
  {
    issuer: 'Wells Fargo',
    cardName: 'Wells Fargo Active Cash Card',
    url: 'https://creditcards.wellsfargo.com/active-cash-credit-card/',
  },
];

// ============================================
// SCRAPING FUNCTIONS (isolated for testing)
// ============================================

interface TestResult {
  success: boolean;
  content: string;
  contentLength: number;
  tokens: number;
  error?: string;
  browserTimeMs?: number;
  cardNameFound: boolean;
}

async function testCloudflareMarkdown(url: string, cardName: string): Promise<TestResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return { success: false, content: '', contentLength: 0, tokens: 0, error: 'Missing CLOUDFLARE env vars', cardNameFound: false };
  }

  try {
    const response = await fetch(`${CF_BASE_URL}/${accountId}/browser-rendering/markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiToken}` },
      body: JSON.stringify({ url, ...CF_REQUEST_OPTIONS }),
    });

    const browserTimeMs = parseInt(response.headers.get('x-browser-ms-used') || '0', 10) || undefined;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { success: false, content: '', contentLength: 0, tokens: 0, error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`, browserTimeMs, cardNameFound: false };
    }

    const data = await response.json() as { success: boolean; result: string };
    if (!data.success || !data.result) {
      return { success: false, content: '', contentLength: 0, tokens: 0, error: 'Empty result', browserTimeMs, cardNameFound: false };
    }

    const validation = validateContent(data.result, cardName);
    return {
      success: true,
      content: data.result,
      contentLength: data.result.length,
      tokens: estimateTokens(data.result),
      browserTimeMs,
      cardNameFound: validation.isValid,
    };
  } catch (error) {
    return { success: false, content: '', contentLength: 0, tokens: 0, error: String(error), cardNameFound: false };
  }
}

async function testCloudflareContent(url: string, cardName: string): Promise<TestResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return { success: false, content: '', contentLength: 0, tokens: 0, error: 'Missing CLOUDFLARE env vars', cardNameFound: false };
  }

  try {
    const response = await fetch(`${CF_BASE_URL}/${accountId}/browser-rendering/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiToken}` },
      body: JSON.stringify({ url, ...CF_REQUEST_OPTIONS }),
    });

    const browserTimeMs = parseInt(response.headers.get('x-browser-ms-used') || '0', 10) || undefined;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { success: false, content: '', contentLength: 0, tokens: 0, error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`, browserTimeMs, cardNameFound: false };
    }

    const data = await response.json() as { success: boolean; result: string };
    if (!data.success || !data.result) {
      return { success: false, content: '', contentLength: 0, tokens: 0, error: 'Empty result', browserTimeMs, cardNameFound: false };
    }

    const markdown = turndownService.turndown(data.result);
    const validation = validateContent(markdown, cardName);

    return {
      success: true,
      content: markdown,
      contentLength: markdown.length,
      tokens: estimateTokens(markdown),
      browserTimeMs,
      cardNameFound: validation.isValid,
    };
  } catch (error) {
    return { success: false, content: '', contentLength: 0, tokens: 0, error: String(error), cardNameFound: false };
  }
}

async function testJinaReader(url: string, cardName: string): Promise<TestResult> {
  try {
    const headers: Record<string, string> = { 'Accept': 'text/markdown' };
    const jinaApiKey = process.env.JINA_API_KEY;
    if (jinaApiKey) {
      headers['Authorization'] = `Bearer ${jinaApiKey}`;
    }

    const response = await fetch(`https://r.jina.ai/${url}`, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { success: false, content: '', contentLength: 0, tokens: 0, error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`, cardNameFound: false };
    }

    const content = await response.text();
    const validation = validateContent(content, cardName);

    return {
      success: true,
      content,
      contentLength: content.length,
      tokens: estimateTokens(content),
      cardNameFound: validation.isValid,
    };
  } catch (error) {
    return { success: false, content: '', contentLength: 0, tokens: 0, error: String(error), cardNameFound: false };
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Card Issuer Scraping Test ===\n');

  // Check env vars
  const hasCf = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
  const hasJina = !!process.env.JINA_API_KEY;
  console.log(`Cloudflare credentials: ${hasCf ? 'SET' : 'MISSING'}`);
  console.log(`Jina API key: ${hasJina ? 'SET' : 'NOT SET (will use free tier at 20 RPM)'}\n`);

  if (!hasCf) {
    console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.');
    console.error('Set them in CardManager/admin-server/.env');
    process.exit(1);
  }

  const results: {
    issuer: string;
    cardName: string;
    url: string;
    markdown: TestResult;
    content: TestResult;
    jina: TestResult;
  }[] = [];

  for (const testUrl of TEST_URLS) {
    console.log(`\n--- ${testUrl.issuer}: ${testUrl.cardName} ---`);
    console.log(`URL: ${testUrl.url}\n`);

    // Validate URL first
    const urlValidation = validateUrlForScraping(testUrl.url);
    if (!urlValidation.isValid) {
      console.log(`  URL VALIDATION FAILED: ${urlValidation.reason}`);
      continue;
    }

    // Test all three approaches
    console.log('  Testing Cloudflare /markdown...');
    const markdown = await testCloudflareMarkdown(testUrl.url, testUrl.cardName);
    console.log(`    ${markdown.success ? 'OK' : 'FAIL'} | ${markdown.contentLength} chars | ${markdown.tokens} tokens | Card name: ${markdown.cardNameFound ? 'YES' : 'NO'}${markdown.browserTimeMs ? ` | Browser: ${markdown.browserTimeMs}ms` : ''}${markdown.error ? ` | Error: ${markdown.error}` : ''}`);

    console.log('  Testing Cloudflare /content...');
    const content = await testCloudflareContent(testUrl.url, testUrl.cardName);
    console.log(`    ${content.success ? 'OK' : 'FAIL'} | ${content.contentLength} chars | ${content.tokens} tokens | Card name: ${content.cardNameFound ? 'YES' : 'NO'}${content.browserTimeMs ? ` | Browser: ${content.browserTimeMs}ms` : ''}${content.error ? ` | Error: ${content.error}` : ''}`);

    console.log('  Testing Jina Reader...');
    const jina = await testJinaReader(testUrl.url, testUrl.cardName);
    console.log(`    ${jina.success ? 'OK' : 'FAIL'} | ${jina.contentLength} chars | ${jina.tokens} tokens | Card name: ${jina.cardNameFound ? 'YES' : 'NO'}${jina.error ? ` | Error: ${jina.error}` : ''}`);

    // Compare /markdown vs /content
    if (markdown.success && content.success) {
      const ratio = content.contentLength / Math.max(markdown.contentLength, 1);
      if (ratio > 1.5) {
        console.log(`  ** /content returned ${ratio.toFixed(1)}x more content than /markdown -- page likely has hidden/accordion content`);
      }
    }

    results.push({ ...testUrl, markdown, content, jina });

    // Small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary table
  console.log('\n\n=== SUMMARY ===\n');
  console.log('Card Name                     | /markdown    | /content     | Jina Reader  | Best');
  console.log('------------------------------+--------------+--------------+--------------+---------');

  for (const r of results) {
    const mdStatus = r.markdown.success ? `${r.markdown.tokens}tk` : 'FAIL';
    const ctStatus = r.content.success ? `${r.content.tokens}tk` : 'FAIL';
    const jinaStatus = r.jina.success ? `${r.jina.tokens}tk` : 'FAIL';

    // Determine best source
    let best = 'NONE';
    const successResults = [
      r.markdown.success && r.markdown.cardNameFound ? { name: '/markdown', tokens: r.markdown.tokens } : null,
      r.content.success && r.content.cardNameFound ? { name: '/content', tokens: r.content.tokens } : null,
      r.jina.success && r.jina.cardNameFound ? { name: 'Jina', tokens: r.jina.tokens } : null,
    ].filter(Boolean) as { name: string; tokens: number }[];

    if (successResults.length > 0) {
      // Best = most content (more tokens = more data for comparison)
      best = successResults.sort((a, b) => b.tokens - a.tokens)[0].name;
    }

    const name = r.cardName.substring(0, 29).padEnd(29);
    console.log(`${name} | ${mdStatus.padEnd(12)} | ${ctStatus.padEnd(12)} | ${jinaStatus.padEnd(12)} | ${best}`);
  }

  console.log('\nDone.');
}

main().catch(console.error);
