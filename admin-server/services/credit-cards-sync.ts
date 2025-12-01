/**
 * Credit Cards Sync Service
 * 
 * Handles synchronization between credit_cards_history (versions) and 
 * the production credit_cards collection.
 * 
 * Rules:
 * - Only ONE active version can exist per card at a time
 * - When a version is made active, it's synced to credit_cards
 * - When a version is deactivated or deleted, the card is removed from credit_cards
 * - Only cards with active versions should exist in credit_cards
 */

import { db } from '../firebase-admin';
import { CreditCardDetails } from '../types';

const CREDIT_CARDS_COLLECTION = 'credit_cards';
const CREDIT_CARDS_HISTORY_COLLECTION = 'credit_cards_history';

export interface SyncAllResult {
  synced: number;
  removed: number;
  syncedCards: string[];
  removedCards: string[];
}

/**
 * Sync an active version to the credit_cards collection.
 * Uses ReferenceCardId as the document ID.
 * 
 * @param referenceCardId - The card's reference ID (used as document ID)
 * @param versionData - The full version data to sync
 */
export async function syncActiveVersionToCreditCards(
  referenceCardId: string,
  versionData: CreditCardDetails
): Promise<void> {
  try {
    // Remove the version-specific 'id' field if present (it's the history doc ID)
    const { ...dataToSync } = versionData;
    
    // Ensure ReferenceCardId is set correctly
    dataToSync.ReferenceCardId = referenceCardId;
    
    await db.collection(CREDIT_CARDS_COLLECTION).doc(referenceCardId).set(dataToSync);
    
    console.log(`Synced active version to credit_cards: ${referenceCardId}`);
  } catch (error) {
    console.error(`Error syncing to credit_cards collection:`, error);
    throw error;
  }
}

/**
 * Remove a card from the credit_cards collection.
 * Called when:
 * - A version is deactivated
 * - An active version is deleted
 * - All versions are deleted
 * - The card is deleted
 * 
 * @param referenceCardId - The card's reference ID (document ID to delete)
 */
export async function removeFromCreditCards(referenceCardId: string): Promise<void> {
  try {
    await db.collection(CREDIT_CARDS_COLLECTION).doc(referenceCardId).delete();
    
    console.log(`Removed from credit_cards: ${referenceCardId}`);
  } catch (error) {
    console.error(`Error removing from credit_cards collection:`, error);
    throw error;
  }
}

/**
 * Sync all active versions to credit_cards collection and remove orphaned entries.
 * This performs a full reconciliation:
 * 1. Gets all active versions from credit_cards_history
 * 2. Syncs each active version to credit_cards
 * 3. Removes any entries in credit_cards that don't have a corresponding active version
 * 
 * @returns Summary of sync operation
 */
export async function syncAllCards(): Promise<SyncAllResult> {
  try {
    // Step 1: Get all active versions from credit_cards_history
    const activeVersionsSnapshot = await db
      .collection(CREDIT_CARDS_HISTORY_COLLECTION)
      .where('IsActive', '==', true)
      .get();

    const activeReferenceCardIds = new Set<string>();
    const syncedCards: string[] = [];

    // Step 2: Sync each active version to credit_cards
    const batch = db.batch();
    
    activeVersionsSnapshot.forEach((doc) => {
      const versionData = doc.data() as CreditCardDetails;
      const referenceCardId = versionData.ReferenceCardId;
      
      activeReferenceCardIds.add(referenceCardId);
      syncedCards.push(referenceCardId);
      
      // Prepare the data to sync (include version data)
      const dataToSync = {
        ...versionData,
        ReferenceCardId: referenceCardId,
      };
      
      const creditCardRef = db.collection(CREDIT_CARDS_COLLECTION).doc(referenceCardId);
      batch.set(creditCardRef, dataToSync);
    });

    // Step 3: Get all current entries in credit_cards
    const currentCreditCardsSnapshot = await db.collection(CREDIT_CARDS_COLLECTION).get();
    const removedCards: string[] = [];

    // Step 4: Find and remove orphaned entries (cards in credit_cards without active versions)
    currentCreditCardsSnapshot.forEach((doc) => {
      if (!activeReferenceCardIds.has(doc.id)) {
        removedCards.push(doc.id);
        batch.delete(doc.ref);
      }
    });

    // Commit all changes in a single batch
    await batch.commit();

    console.log(`Sync complete: ${syncedCards.length} synced, ${removedCards.length} removed`);

    return {
      synced: syncedCards.length,
      removed: removedCards.length,
      syncedCards,
      removedCards,
    };
  } catch (error) {
    console.error('Error syncing all cards:', error);
    throw error;
  }
}


