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
        const effectiveFrom = version.effectiveFrom;
        const effectiveTo = version.effectiveTo;

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
      // Normalize blank/undefined effectiveTo to the ongoing sentinel
      effectiveTo:
        cardData?.effectiveTo === '' || cardData?.effectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : cardData.effectiveTo,
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

    // Build update payload, normalizing effectiveTo if provided blank/null
    const updateData: Record<string, any> = { ...cardData };
    if (Object.prototype.hasOwnProperty.call(cardData, 'effectiveTo')) {
      updateData.effectiveTo =
        cardData.effectiveTo === '' || cardData.effectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : cardData.effectiveTo;
    }
    updateData.lastUpdated = now;

    await db.collection('credit_cards_history').doc(cardId).update(updateData);

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

    const versions: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as CreditCardDetails;

      versions.push({
        id: doc.id,
        VersionName: data.VersionName,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        lastUpdated: data.lastUpdated,
        IsActive: data.IsActive || false,
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
      .collection('credit_cards_history')
      .where('ReferenceCardId', '==', referenceCardId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Reference card not found' });
    }

    const baseCard = snapshot.docs[0].data() as CreditCardDetails;

    // Create new version with the provided data
    const normalizedEffectiveTo =
      !newVersionData?.effectiveTo || newVersionData.effectiveTo === ''
        ? ONGOING_SENTINEL_DATE
        : newVersionData.effectiveTo;
    const newCard: CreditCardDetails = {
      ...baseCard,
      ...newVersionData,
      ReferenceCardId: referenceCardId,
      effectiveTo: normalizedEffectiveTo,
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
 * POST /admin/cards/:referenceCardId/versions/:versionId
 * Create a new version with a specific versionId
 */
router.post('/:referenceCardId/versions/:versionId', async (req: Request, res: Response) => {
  try {
    const { referenceCardId, versionId } = req.params;
    const newVersionData = req.body as Partial<CreditCardDetails>;
    const now = new Date().toISOString();

    // Disallow overwriting an existing version with the same ID
    const existing = await db.collection('credit_cards_history').doc(versionId).get();
    if (existing.exists) {
      return res.status(409).json({ error: 'Version with this ID already exists' });
    }

    // Persist exactly what the client sends, ensuring ReferenceCardId and lastUpdated are set
    const normalizedEffectiveTo =
      !newVersionData?.effectiveTo || newVersionData.effectiveTo === ''
        ? ONGOING_SENTINEL_DATE
        : newVersionData.effectiveTo;
    const newCard: CreditCardDetails = {
      ...(newVersionData as CreditCardDetails),
      ReferenceCardId: referenceCardId,
      effectiveTo: normalizedEffectiveTo,
      lastUpdated: now,
    };

    await db.collection('credit_cards_history').doc(versionId).set(newCard);

    res.status(201).json({ id: versionId });
  } catch (error) {
    console.error('Error creating new version with custom id:', error);
    res.status(500).json({ error: 'Failed to create new version' });
  }
});

/**
 * POST /admin/cards/:referenceCardId/versions/:versionId/activate
 * Activate a specific version by setting IsActive to true
 */
router.post('/:referenceCardId/versions/:versionId/activate', async (req: Request, res: Response) => {
  try {
    const { referenceCardId, versionId } = req.params;
    const { deactivateOthers } = req.body;

    // Get the version to activate
    const versionDoc = await db.collection('credit_cards_history').doc(versionId).get();
    if (!versionDoc.exists) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Set IsActive to true
    await db.collection('credit_cards_history').doc(versionId).update({
      IsActive: true,
      lastUpdated: new Date().toISOString(),
    });

    // Deactivate other versions if requested
    if (deactivateOthers) {
      const snapshot = await db
        .collection('credit_cards_history')
        .where('ReferenceCardId', '==', referenceCardId)
        .get();

      const batch = db.batch();
      snapshot.forEach((doc) => {
        if (doc.id !== versionId) {
          batch.update(doc.ref, {
            IsActive: false,
            lastUpdated: new Date().toISOString(),
          });
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
 * POST /admin/cards/:referenceCardId/versions/:versionId/deactivate
 * Deactivate a specific version by setting IsActive to false
 */
router.post('/:referenceCardId/versions/:versionId/deactivate', async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const versionDoc = await db.collection('credit_cards_history').doc(versionId).get();
    if (!versionDoc.exists) {
      return res.status(404).json({ error: 'Version not found' });
    }

    await db.collection('credit_cards_history').doc(versionId).update({
      IsActive: false,
      lastUpdated: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating version:', error);
    res.status(500).json({ error: 'Failed to deactivate version' });
  }
});

export default router;
