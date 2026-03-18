/**
 * Diagnostic script: Print effectiveFrom and effectiveTo for all card versions
 * and components (credits, perks, multipliers).
 *
 * Usage:
 *   npx ts-node scripts/print-effective-dates.ts
 */

import { db } from '../firebase-admin';

interface DateEntry {
  id: string;
  refCardId: string;
  label: string;
  effectiveFrom: string;
  effectiveTo: string;
}

async function printCollection(
  collectionName: string,
  fromField: string,
  toField: string,
  labelField: string,
  refCardField: string,
): Promise<DateEntry[]> {
  const snapshot = await db.collection(collectionName).get();
  const entries: DateEntry[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    entries.push({
      id: doc.id,
      refCardId: data[refCardField] ?? '',
      label: data[labelField] ?? '',
      effectiveFrom: data[fromField] ?? '(missing)',
      effectiveTo: data[toField] ?? '(missing)',
    });
  }

  // Sort by refCardId then effectiveFrom for readability
  entries.sort((a, b) => a.refCardId.localeCompare(b.refCardId) || a.effectiveFrom.localeCompare(b.effectiveFrom));

  return entries;
}

function printTable(title: string, entries: DateEntry[]) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${title} (${entries.length} documents)`);
  console.log('='.repeat(80));

  if (entries.length === 0) {
    console.log('  (none)');
    return;
  }

  // Column widths
  const idW = 24;
  const refW = 24;
  const labelW = 30;
  const dateW = 12;

  const header = [
    'ID'.padEnd(idW),
    'ReferenceCardId'.padEnd(refW),
    'Label'.padEnd(labelW),
    'From'.padEnd(dateW),
    'To'.padEnd(dateW),
  ].join(' | ');

  console.log(header);
  console.log('-'.repeat(header.length));

  for (const e of entries) {
    const to = e.effectiveTo === '9999-12-31' ? 'Ongoing' : e.effectiveTo;
    console.log([
      e.id.slice(0, idW).padEnd(idW),
      e.refCardId.slice(0, refW).padEnd(refW),
      e.label.slice(0, labelW).padEnd(labelW),
      e.effectiveFrom.padEnd(dateW),
      to.padEnd(dateW),
    ].join(' | '));
  }
}

async function main() {
  console.log('Fetching effective dates for all card versions and components...\n');

  const [versions, credits, perks, multipliers] = await Promise.all([
    printCollection('credit_cards_history', 'effectiveFrom', 'effectiveTo', 'VersionName', 'ReferenceCardId'),
    printCollection('credit_cards_credits', 'EffectiveFrom', 'EffectiveTo', 'Title', 'ReferenceCardId'),
    printCollection('credit_cards_perks', 'EffectiveFrom', 'EffectiveTo', 'Title', 'ReferenceCardId'),
    printCollection('credit_cards_multipliers', 'EffectiveFrom', 'EffectiveTo', 'Category', 'ReferenceCardId'),
  ]);

  printTable('Card Versions (credit_cards_history)', versions);
  printTable('Credits (credit_cards_credits)', credits);
  printTable('Perks (credit_cards_perks)', perks);
  printTable('Multipliers (credit_cards_multipliers)', multipliers);

  // Quick stats
  const all = [...versions, ...credits, ...perks, ...multipliers];
  const fromValues = new Map<string, number>();
  for (const e of all) {
    fromValues.set(e.effectiveFrom, (fromValues.get(e.effectiveFrom) ?? 0) + 1);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('effectiveFrom value distribution:');
  console.log('='.repeat(80));
  for (const [value, count] of [...fromValues.entries()].sort()) {
    console.log(`  ${value}: ${count} documents`);
  }
  console.log(`\nTotal: ${all.length} documents`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
