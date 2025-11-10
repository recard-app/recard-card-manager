import express, { Request, Response } from 'express';
import { db } from '../firebase-admin';
import { CreditCardDetails, ONGOING_SENTINEL_DATE } from '../types';
import { verifyAuth } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAuth);

// ===== CARD MANAGEMENT =====

/**
 * GET /admin/cards
 * Get all cards with their status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('credit_cards_history').get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const cardsMap = new Map<string, any[]>();
    const today = new Date().toISOString().split('T')[0];

    // Group cards by ReferenceCardId
    snapshot.forEach((doc) => {
      const data = doc.data() as CreditCardDetails;
      const card = {
        ...data,
        id: doc.id,
        status: 'inactive',
      };

      const refId = data.ReferenceCardId;
      if (!cardsMap.has(refId)) {
        cardsMap.set(refId, []);
      }
      cardsMap.get(refId)!.push(card);
    });

    // Determine status for each group
    const results: any[] = [];

    cardsMap.forEach((versions) => {
      let hasActiveVersion = false;

      for (const version of versions) {
        const effectiveFrom = version.EffectiveFrom;
        const effectiveTo = version.EffectiveTo;

        if (effectiveFrom <= today && (effectiveTo === ONGOING_SENTINEL_DATE || effectiveTo >= today)) {
          hasActiveVersion = true;
          version.status = 'active';
        }
      }

      if (!hasActiveVersion) {
        versions.forEach((v) => {
          v.status = 'no_active_version';
        });
      }

      // Add the most recent version for each ReferenceCardId
      const mostRecent = versions.sort((a, b) =>
        b.lastUpdated.localeCompare(a.lastUpdated)
      )[0];
      results.push(mostRecent);
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

/**
 * GET /admin/cards/:cardId
 * Get a single card by ID
 */
router.get('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const doc = await db.collection('credit_cards_history').doc(cardId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const data = doc.data() as CreditCardDetails;
    res.json({
      ...data,
      id: doc.id,
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

/**
 * POST /admin/cards
 * Create a new card
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const cardData = req.body;
    const now = new Date().toISOString();

    const newCard = {
      ...cardData,
      lastUpdated: now,
    };

    const docRef = await db.collection('credit_cards_history').add(newCard);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

/**
 * PUT /admin/cards/:cardId
 * Update an existing card
 */
router.put('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const cardData = req.body;
    const now = new Date().toISOString();

    await db.collection('credit_cards_history').doc(cardId).update({
      ...cardData,
      lastUpdated: now,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

/**
 * DELETE /admin/cards/:cardId
 * Delete a card
 */
router.delete('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    await db.collection('credit_cards_history').doc(cardId).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// ===== VERSION MANAGEMENT =====

/**
 * GET /admin/cards/:referenceCardId/versions
 * Get all versions for a ReferenceCardId
 */
router.get('/:referenceCardId/versions', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;
    const snapshot = await db
      .collection('credit_cards_history')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const today = new Date().toISOString().split('T')[0];
    const versions: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as CreditCardDetails;
      const effectiveFrom = data.EffectiveFrom;
      const effectiveTo = data.EffectiveTo;

      const isActive =
        effectiveFrom <= today &&
        (effectiveTo === ONGOING_SENTINEL_DATE || effectiveTo >= today);

      versions.push({
        id: doc.id,
        versionName: data.VersionName,
        effectiveFrom: data.EffectiveFrom,
        effectiveTo: data.EffectiveTo,
        lastUpdated: data.lastUpdated,
        isActive,
      });
    });

    // Sort by effectiveFrom descending (most recent first)
    versions.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

/**
 * POST /admin/cards/:referenceCardId/versions
 * Create a new version of a card
 */
router.post('/:referenceCardId/versions', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;
    const newVersionData = req.body;
    const now = new Date().toISOString();

    // Get the existing card to copy from
    const snapshot = await db
      .collection('creditCards')
      .where('ReferenceCardId', '==', referenceCardId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Reference card not found' });
    }

    const baseCard = snapshot.docs[0].data() as CreditCardDetails;

    // Create new version with the provided data
    const newCard: CreditCardDetails = {
      ...baseCard,
      ...newVersionData,
      ReferenceCardId: referenceCardId,
      lastUpdated: now,
    };

    const docRef = await db.collection('credit_cards_history').add(newCard);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating new version:', error);
    res.status(500).json({ error: 'Failed to create new version' });
  }
});

/**
 * POST /admin/cards/:referenceCardId/versions/:versionId/activate
 * Activate a specific version
 */
router.post('/:referenceCardId/versions/:versionId/activate', async (req: Request, res: Response) => {
  try {
    const { referenceCardId, versionId } = req.params;
    const { deactivateOthers } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Get the version to activate
    const versionDoc = await db.collection('credit_cards_history').doc(versionId).get();
    if (!versionDoc.exists) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Update EffectiveTo to be ongoing
    await db.collection('credit_cards_history').doc(versionId).update({
      EffectiveTo: ONGOING_SENTINEL_DATE,
      lastUpdated: new Date().toISOString(),
    });

    // Deactivate other versions if requested
    if (deactivateOthers) {
      const snapshot = await db
        .collection('creditCards')
        .where('ReferenceCardId', '==', referenceCardId)
        .get();

      const batch = db.batch();
      snapshot.forEach((doc) => {
        if (doc.id !== versionId) {
          const data = doc.data() as CreditCardDetails;
          // Only update if currently active
          if (data.EffectiveTo === ONGOING_SENTINEL_DATE) {
            batch.update(doc.ref, {
              EffectiveTo: today,
              lastUpdated: new Date().toISOString(),
            });
          }
        }
      });

      await batch.commit();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error activating version:', error);
    res.status(500).json({ error: 'Failed to activate version' });
  }
});

/**
 * POST /admin/cards/:referenceCardId/deactivate
 * Deactivate the currently active version
 */
router.post('/:referenceCardId/deactivate', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;
    const { effectiveTo } = req.body;

    const snapshot = await db
      .collection('creditCards')
      .where('ReferenceCardId', '==', referenceCardId)
      .where('EffectiveTo', '==', ONGOING_SENTINEL_DATE)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'No active version found' });
    }

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        EffectiveTo: effectiveTo,
        lastUpdated: new Date().toISOString(),
      });
    });

    await batch.commit();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating version:', error);
    res.status(500).json({ error: 'Failed to deactivate version' });
  }
});

export default router;
