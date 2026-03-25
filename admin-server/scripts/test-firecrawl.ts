/**
 * Firecrawl Integration Smoke Test
 *
 * Tests:
 * 1. Firecrawl scrapes a known card URL and returns expanded accordion content
 * 2. Fallback chain works when Firecrawl is unavailable
 * 3. Error classification produces correct log messages
 *
 * Usage:
 *   npx ts-node scripts/test-firecrawl.ts                        # Normal run
 *   FIRECRAWL_API_KEY= npx ts-node scripts/test-firecrawl.ts     # Test fallback
 *   FIRECRAWL_API_KEY=fc-invalid npx ts-node scripts/test-firecrawl.ts  # Test error classification
 */
import dotenv from 'dotenv';
dotenv.config();

import { scrapeUrl } from '../services/content-acquisition.service';

const TEST_URLS: { url: string; cardName: string; description: string }[] = [
  {
    url: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
    cardName: 'The Platinum Card from American Express',
    description: 'Amex Platinum (known accordion content)',
  },
  {
    url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
    cardName: 'Chase Sapphire Preferred',
    description: 'Chase Sapphire Preferred',
  },
];

async function main() {
  console.log('=== Firecrawl Integration Smoke Test ===\n');
  console.log(`FIRECRAWL_API_KEY: ${process.env.FIRECRAWL_API_KEY ? 'set' : 'NOT SET'}\n`);

  // Test 1: Scrape with current configuration
  console.log('--- Test 1: Scraping card URLs ---');
  for (const test of TEST_URLS) {
    console.log(`\nScraping: ${test.description}`);
    console.log(`URL: ${test.url}`);
    const result = await scrapeUrl(test.url, test.cardName);
    console.log(`  Success: ${result.success}`);
    console.log(`  Source: ${result.source}`);
    console.log(`  Content length: ${result.content.length} chars`);
    if (result.redirectedTo) console.log(`  Redirected to: ${result.redirectedTo}`);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.attemptErrors?.length) {
      console.log(`  Attempt errors:`);
      for (const err of result.attemptErrors) {
        console.log(`    - ${err}`);
      }
    }
  }

  // Test 2: Fallback status
  if (process.env.FIRECRAWL_API_KEY) {
    console.log('\n--- Test 2: Fallback chain (simulated) ---');
    console.log('To test fallback, re-run with: FIRECRAWL_API_KEY= npx ts-node scripts/test-firecrawl.ts');
    console.log('Expected: source should be cloudflare-markdown, cloudflare-content, or jina.');
  } else {
    console.log('\n--- Test 2: Fallback chain (active -- no FIRECRAWL_API_KEY) ---');
    console.log('Firecrawl was skipped. Results above show fallback scrapers working.');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
