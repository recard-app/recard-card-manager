/**
 * Migration script: Set effectiveFrom to TARGET_DATE (2024-01-01)
 * for all card versions and all components (credits, perks, multipliers).
 *
 * Dry-run by default -- pass --commit to actually write changes.
 *
 * Usage:
 *   npx ts-node scripts/migrate-effective-from.ts           # dry run
 *   npx ts-node scripts/migrate-effective-from.ts --commit  # apply changes
 */

import { db } from '../firebase-admin';
/**
 * Target date for this migration (2024-01-01).
 */
const TARGET_DATE = '2024-01-01';

const COMMIT = process.argv.includes('--commit');
const BATCH_LIMIT = 500; // Firestore batch limit

interface MigrationChange {
  collection: string;
  docId: string;
  oldValue: string;
  field: string;
}

/**
 * Collects and optionally applies effectiveFrom updates for a single collection.
 *
 * @param collectionName Firestore collection name
 * @param fieldName      The effectiveFrom field name (lowercase for versions, PascalCase for components)
 * @param timestampField The lastUpdated field name to set on update
 */
async function migrateCollection(
  collectionName: string,
  fieldName: string,
  timestampField: string,
): Promise<MigrationChange[]> {
  const snapshot = await db.collection(collectionName).get();
  const changes: MigrationChange[] = [];

  if (snapshot.empty) {
    console.log(`  ${collectionName}: empty collection, skipping.`);
    return changes;
  }

  // Identify documents that need updating
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const currentValue = data[fieldName] as string | undefined;

    if (currentValue === TARGET_DATE) {
      continue; // already correct
    }

    changes.push({
      collection: collectionName,
      docId: doc.id,
      oldValue: currentValue ?? '(missing)',
      field: fieldName,
    });
  }

  if (changes.length === 0) {
    console.log(`  ${collectionName}: ${snapshot.size} docs, 0 need updating.`);
    return changes;
  }

  console.log(`  ${collectionName}: ${snapshot.size} docs, ${changes.length} to update.`);

  if (!COMMIT) {
    return changes;
  }

  // Apply in batches of BATCH_LIMIT
  const now = new Date().toISOString();
  for (let i = 0; i < changes.length; i += BATCH_LIMIT) {
    const chunk = changes.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();

    for (const change of chunk) {
      const ref = db.collection(change.collection).doc(change.docId);
      batch.update(ref, {
        [fieldName]: TARGET_DATE,
        [timestampField]: now,
      });
    }

    await batch.commit();
    console.log(`    Committed batch ${Math.floor(i / BATCH_LIMIT) + 1} (${chunk.length} docs)`);
  }

  return changes;
}

async function main() {
  console.log(`\nMigrate effectiveFrom -> ${TARGET_DATE}`);
  console.log(`Mode: ${COMMIT ? 'COMMIT (changes will be written)' : 'DRY RUN (no changes)'}\n`);

  const allChanges: MigrationChange[] = [];

  // 1. Card versions (lowercase field names)
  console.log('Card versions (credit_cards_history):');
  allChanges.push(
    ...(await migrateCollection('credit_cards_history', 'effectiveFrom', 'lastUpdated')),
  );

  // 2. Credits (PascalCase field names)
  console.log('Credits (credit_cards_credits):');
  allChanges.push(
    ...(await migrateCollection('credit_cards_credits', 'EffectiveFrom', 'LastUpdated')),
  );

  // 3. Perks (PascalCase field names)
  console.log('Perks (credit_cards_perks):');
  allChanges.push(
    ...(await migrateCollection('credit_cards_perks', 'EffectiveFrom', 'LastUpdated')),
  );

  // 4. Multipliers (PascalCase field names)
  console.log('Multipliers (credit_cards_multipliers):');
  allChanges.push(
    ...(await migrateCollection('credit_cards_multipliers', 'EffectiveFrom', 'LastUpdated')),
  );

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Total documents to update: ${allChanges.length}`);

  if (allChanges.length > 0) {
    console.log('\nChanges by collection:');
    const grouped = allChanges.reduce<Record<string, MigrationChange[]>>((acc, c) => {
      (acc[c.collection] ??= []).push(c);
      return acc;
    }, {});

    for (const [collection, items] of Object.entries(grouped)) {
      console.log(`  ${collection}: ${items.length}`);
      for (const item of items) {
        console.log(`    ${item.docId}: ${item.oldValue} -> ${TARGET_DATE}`);
      }
    }
  }

  if (!COMMIT && allChanges.length > 0) {
    console.log('\nThis was a dry run. Re-run with --commit to apply changes.');
  } else if (COMMIT && allChanges.length > 0) {
    console.log('\nAll changes committed successfully.');
    console.log('NOTE: Run a sync-all afterward if active versions were updated.');
  } else {
    console.log('\nNothing to update.');
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
