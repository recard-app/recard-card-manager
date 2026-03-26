/**
 * Firecrawl Debug Script
 *
 * Tests multiple Firecrawl configurations against a single Amex URL
 * to find the combination that captures accordion/benefit content.
 *
 * Usage: npx ts-node scripts/test-firecrawl-debug.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import Firecrawl from '@mendable/firecrawl-js';

const TEST_URL = 'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-platinum-american-express-card/';

const client = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! });

async function testConfig(name: string, options: Record<string, unknown>) {
  console.log(`\n=== ${name} ===`);
  try {
    const result = await client.scrape(TEST_URL, options as any);
    const md = result.markdown || '';
    const hasMultipliers = md.includes('3X') || md.includes('2X') || md.includes('1X');
    const hasBenefits = md.toLowerCase().includes('companion certificate') || md.toLowerCase().includes('takeoff 15');
    const hasAllBenefits = md.toLowerCase().includes('all benefits');
    const hasFeaturedBenefits = md.toLowerCase().includes('featured benefits');
    const hasInsurance = md.toLowerCase().includes('trip delay') || md.toLowerCase().includes('baggage insurance');

    console.log(`  Length: ${md.length} chars`);
    console.log(`  Has multipliers (3X/2X/1X): ${hasMultipliers}`);
    console.log(`  Has featured benefits section: ${hasFeaturedBenefits}`);
    console.log(`  Has all benefits section: ${hasAllBenefits}`);
    console.log(`  Has specific benefits (companion cert / takeoff): ${hasBenefits}`);
    console.log(`  Has insurance details: ${hasInsurance}`);
    console.log(`  First 500 chars: ${md.substring(0, 500).replace(/\n/g, ' ')}`);
    console.log(`  Last 500 chars: ${md.substring(md.length - 500).replace(/\n/g, ' ')}`);
  } catch (err) {
    console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log('Firecrawl Debug: Testing configurations against Amex Delta Platinum');
  console.log(`URL: ${TEST_URL}\n`);

  // Test 1: Default (what we currently have)
  await testConfig('Test 1: onlyMainContent=true + accordion actions', {
    formats: ['markdown'],
    onlyMainContent: true,
    maxAge: 0,
    timeout: 30000,
    actions: [
      { type: 'wait', milliseconds: 2000 },
      { type: 'click', selector: '[aria-expanded="false"], details:not([open]) summary, [data-toggle="collapse"], [data-bs-toggle="collapse"]', all: true },
      { type: 'wait', milliseconds: 1000 },
    ],
  });

  // Test 2: onlyMainContent=false (get everything)
  await testConfig('Test 2: onlyMainContent=false + accordion actions', {
    formats: ['markdown'],
    onlyMainContent: false,
    maxAge: 0,
    timeout: 30000,
    actions: [
      { type: 'wait', milliseconds: 2000 },
      { type: 'click', selector: '[aria-expanded="false"], details:not([open]) summary, [data-toggle="collapse"], [data-bs-toggle="collapse"]', all: true },
      { type: 'wait', milliseconds: 1000 },
    ],
  });

  // Test 3: onlyMainContent=false, no actions (just see what the page gives us)
  await testConfig('Test 3: onlyMainContent=false, NO actions', {
    formats: ['markdown'],
    onlyMainContent: false,
    maxAge: 0,
    timeout: 30000,
  });

  // Test 4: onlyMainContent=false, longer wait, scroll down first
  await testConfig('Test 4: onlyMainContent=false + scroll + longer wait', {
    formats: ['markdown'],
    onlyMainContent: false,
    maxAge: 0,
    timeout: 45000,
    actions: [
      { type: 'wait', milliseconds: 3000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1000 },
      { type: 'click', selector: '[aria-expanded="false"]', all: true },
      { type: 'wait', milliseconds: 1000 },
    ],
  });

  // Test 5: Use executeJavascript to find all clickable elements and expand them
  await testConfig('Test 5: onlyMainContent=false + JS to expand everything', {
    formats: ['markdown'],
    onlyMainContent: false,
    maxAge: 0,
    timeout: 45000,
    actions: [
      { type: 'wait', milliseconds: 3000 },
      {
        type: 'executeJavascript',
        script: `
          // Scroll to bottom to trigger lazy loading
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise(r => setTimeout(r, 2000));

          // Click all elements with aria-expanded="false"
          document.querySelectorAll('[aria-expanded="false"]').forEach(el => el.click());

          // Click all buttons/links that look like expand triggers
          document.querySelectorAll('button, a, [role="button"]').forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            if (text.includes('show') || text.includes('expand') || text.includes('more') || text.includes('all benefits') || text.includes('view all')) {
              el.click();
            }
          });

          await new Promise(r => setTimeout(r, 2000));
          'done';
        `,
      },
      { type: 'wait', milliseconds: 2000 },
    ],
  });

  // Test 6: Use includeTags to target benefit content specifically
  await testConfig('Test 6: onlyMainContent=false + includeTags for common benefit containers', {
    formats: ['markdown'],
    onlyMainContent: false,
    maxAge: 0,
    timeout: 30000,
    excludeTags: ['nav', 'footer', 'header', '[class*="subnav"]', '[class*="filmstrip"]', '[class*="browse-card"]'],
    actions: [
      { type: 'wait', milliseconds: 3000 },
    ],
  });

  console.log('\n=== Done ===');
}

main().catch(console.error);
