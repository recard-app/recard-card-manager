/**
 * One-time migration script to backfill CardCharacteristics field
 * for all cards in credit_cards_names collection.
 *
 * Run with: npx ts-node scripts/backfill-card-characteristics.ts
 */

import { db } from '../firebase-admin';

async function backfillCardCharacteristics() {
  console.log('Starting CardCharacteristics backfill...');

  const snapshot = await db.collection('credit_cards_names').get();

  if (snapshot.empty) {
    console.log('No cards found in credit_cards_names collection.');
    return;
  }

  console.log(`Found ${snapshot.size} cards. Checking for missing CardCharacteristics...`);

  const batch = db.batch();
  let updateCount = 0;
  const updatedCards: string[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.CardCharacteristics) {
      batch.update(doc.ref, { CardCharacteristics: 'standard' });
      updateCount++;
      updatedCards.push(doc.id);
    }
  });

  if (updateCount === 0) {
    console.log('All cards already have CardCharacteristics set. No updates needed.');
    return;
  }

  console.log(`Updating ${updateCount} cards...`);
  await batch.commit();

  console.log('Backfill complete!');
  console.log(`Updated cards: ${updatedCards.join(', ')}`);
}

backfillCardCharacteristics()
  .then(() => {
    console.log('Script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during backfill:', error);
    process.exit(1);
  });
