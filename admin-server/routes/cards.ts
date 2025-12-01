import express, { Request, Response } from 'express';
import { db } from '../firebase-admin';
import { CreditCardDetails, CreditCardName, ONGOING_SENTINEL_DATE } from '../types';
import { verifyAuth } from '../middleware/auth';
import {
  syncActiveVersionToCreditCards,
  removeFromCreditCards,
  syncAllCards,
} from '../services/credit-cards-sync';
import { CardNameSchema, CreditCardCreateSchema, CreditCardUpdateSchema, parseOr400 } from '../validation/schemas';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAuth);

// ===== CARD NAMES MANAGEMENT (credit_cards_names collection) =====

/**
 * GET /admin/card-names
 * Get all card names from credit_cards_names collection
 */
router.get('/card-names', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('credit_cards_names').get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const cardNames: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as CreditCardName;
      cardNames.push({
        ReferenceCardId: doc.id,
        ...data,
      });
    });

    res.json(cardNames);
  } catch (error) {
    console.error('Error fetching card names:', error);
    res.status(500).json({ error: 'Failed to fetch card names' });
  }
});

/**
 * GET /admin/card-names/:referenceCardId
 * Get a single card name entry
 */
router.get('/card-names/:referenceCardId', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;
    const doc = await db.collection('credit_cards_names').doc(referenceCardId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const data = doc.data() as CreditCardName;
    res.json({
      ReferenceCardId: doc.id,
      ...data,
    });
  } catch (error) {
    console.error('Error fetching card name:', error);
    res.status(500).json({ error: 'Failed to fetch card name' });
  }
});

/**
 * POST /admin/card-names/:referenceCardId
 * Create a new card name entry (top-level card identity)
 */
router.post('/card-names/:referenceCardId', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;
    const parsed = parseOr400(CardNameSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    }
    const { CardName, CardIssuer } = parsed.data;

    // Validate required fields
    // (Already validated above)

    // Check if a card with this ID already exists
    const existing = await db.collection('credit_cards_names').doc(referenceCardId).get();
    if (existing.exists) {
      return res.status(409).json({ error: 'A card with this ID already exists' });
    }

    const newCardName: CreditCardName = {
      CardName,
      CardIssuer,
    };

    await db.collection('credit_cards_names').doc(referenceCardId).set(newCardName);

    res.status(201).json({ ReferenceCardId: referenceCardId, ...newCardName });
  } catch (error) {
    console.error('Error creating card name:', error);
    res.status(500).json({ error: 'Failed to create card name' });
  }
});

/**
 * PUT /admin/card-names/:referenceCardId
 * Update an existing card name entry
 */
router.put('/card-names/:referenceCardId', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;
    const parsed = parseOr400(CardNameSchema.partial(), req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    }
    const { CardName, CardIssuer } = parsed.data;

    const doc = await db.collection('credit_cards_names').doc(referenceCardId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updateData: Partial<CreditCardName> = {};
    if (CardName !== undefined) updateData.CardName = CardName;
    if (CardIssuer !== undefined) updateData.CardIssuer = CardIssuer;

    await db.collection('credit_cards_names').doc(referenceCardId).update(updateData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating card name:', error);
    res.status(500).json({ error: 'Failed to update card name' });
  }
});

/**
 * DELETE /admin/card-names/:referenceCardId
 * Delete a card name entry and all associated versions/components
 * Also removes from credit_cards collection
 */
router.delete('/card-names/:referenceCardId', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;

    const batch = db.batch();

    // Delete the card name entry
    const cardNameRef = db.collection('credit_cards_names').doc(referenceCardId);
    const cardNameDoc = await cardNameRef.get();
    if (cardNameDoc.exists) {
      batch.delete(cardNameRef);
    }

    // Delete all versions with this ReferenceCardId
    const versionsSnapshot = await db
      .collection('credit_cards_history')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();

    const versionIds: string[] = [];
    versionsSnapshot.forEach((doc) => {
      versionIds.push(doc.id);
      batch.delete(doc.ref);
    });

    // Delete all associated components
    for (const versionId of versionIds) {
      const creditsSnapshot = await db
        .collection('card_credits')
        .where('CardId', '==', versionId)
        .get();
      creditsSnapshot.forEach((doc) => batch.delete(doc.ref));

      const perksSnapshot = await db
        .collection('card_perks')
        .where('CardId', '==', versionId)
        .get();
      perksSnapshot.forEach((doc) => batch.delete(doc.ref));

      const multipliersSnapshot = await db
        .collection('card_multipliers')
        .where('CardId', '==', versionId)
        .get();
      multipliersSnapshot.forEach((doc) => batch.delete(doc.ref));
    }

    await batch.commit();

    // Remove from credit_cards collection (production)
    await removeFromCreditCards(referenceCardId);

    res.json({ success: true, deletedVersions: versionIds.length });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// ===== SYNC OPERATIONS =====

/**
 * POST /admin/cards/sync-all
 * Sync all active versions to credit_cards collection and remove orphaned entries.
 * This ensures the production credit_cards collection matches the active versions in the dashboard.
 */
router.post('/sync-all', async (req: Request, res: Response) => {
  try {
    const result = await syncAllCards();
    
    res.json({
      success: true,
      message: `Synced ${result.synced} cards, removed ${result.removed} orphaned entries`,
      ...result,
    });
  } catch (error) {
    console.error('Error syncing all cards:', error);
    res.status(500).json({ error: 'Failed to sync cards' });
  }
});

// ===== CARD MANAGEMENT =====

/**
 * GET /admin/cards
 * Get all cards with their status (from both credit_cards_names and credit_cards_history)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Fetch all card names (top-level identities)
    const cardNamesSnapshot = await db.collection('credit_cards_names').get();
    
    // Fetch all versions
    const versionsSnapshot = await db.collection('credit_cards_history').get();

    // Build a map of ReferenceCardId -> versions
    const versionsMap = new Map<string, any[]>();
    versionsSnapshot.forEach((doc) => {
      const data = doc.data() as CreditCardDetails;
      const version = {
        ...data,
        id: doc.id,
      };

      const refId = data.ReferenceCardId;
      if (!versionsMap.has(refId)) {
        versionsMap.set(refId, []);
      }
      versionsMap.get(refId)!.push(version);
    });

    const results: any[] = [];

    // Process each card name entry
    cardNamesSnapshot.forEach((doc) => {
      const cardNameData = doc.data() as CreditCardName;
      const referenceCardId = doc.id;
      const versions = versionsMap.get(referenceCardId) || [];

      if (versions.length === 0) {
        // Card with no versions
        results.push({
          ReferenceCardId: referenceCardId,
          CardName: cardNameData.CardName,
          CardIssuer: cardNameData.CardIssuer,
          status: 'no_versions',
          ActiveVersionName: null,
          versionCount: 0,
        });
      } else {
        // Card with versions - determine status
        let hasActiveVersion = false;
        let activeVersion: any = null;

        for (const version of versions) {
          // Check for truthy IsActive (handles boolean true, "true", 1, etc.)
          if (version.IsActive === true || version.IsActive === 'true') {
            hasActiveVersion = true;
            activeVersion = version;
            break;
          }
        }

        // Get most recent version for display
        const mostRecent = versions.sort((a, b) =>
          (b.lastUpdated || '').localeCompare(a.lastUpdated || '')
        )[0];

        results.push({
          // Core identity from credit_cards_names
          ReferenceCardId: referenceCardId,
          CardName: cardNameData.CardName,
          CardIssuer: cardNameData.CardIssuer,
          // Version data from most recent version
          ...mostRecent,
          // Status info
          status: hasActiveVersion ? 'active' : 'no_active_version',
          ActiveVersionName: activeVersion ? activeVersion.VersionName : null,
          versionCount: versions.length,
        });
      }

      // Remove this referenceCardId from the map so we can track orphaned versions
      versionsMap.delete(referenceCardId);
    });

    // Handle orphaned versions (versions without a card name entry - for backwards compatibility)
    versionsMap.forEach((versions, referenceCardId) => {
      let hasActiveVersion = false;
      let activeVersion: any = null;

      for (const version of versions) {
        // Check for truthy IsActive (handles boolean true, "true", 1, etc.)
        if (version.IsActive === true || version.IsActive === 'true') {
          hasActiveVersion = true;
          activeVersion = version;
          break;
        }
      }

      const mostRecent = versions.sort((a, b) =>
        (b.lastUpdated || '').localeCompare(a.lastUpdated || '')
      )[0];

      results.push({
        ReferenceCardId: referenceCardId,
        CardName: mostRecent.CardName,
        CardIssuer: mostRecent.CardIssuer,
        ...mostRecent,
        status: hasActiveVersion ? 'active' : 'no_active_version',
        ActiveVersionName: activeVersion ? activeVersion.VersionName : null,
        versionCount: versions.length,
      });
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
 * Create a new card with auto-generated ID
 * New cards/versions are NOT active by default - must be activated manually
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Lenient server-side validation: allow partial but enforce types/dates if present
    const parsed = parseOr400(CreditCardUpdateSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    }
    const cardData = parsed.data;
    const now = new Date().toISOString();

    const newCard = {
      ...cardData,
      // Normalize blank/undefined effectiveTo to the ongoing sentinel
      effectiveTo:
        cardData?.effectiveTo === '' || cardData?.effectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : cardData.effectiveTo,
      lastUpdated: now,
      // Ensure new versions are NOT active by default
      IsActive: cardData.IsActive === true ? true : false,
    };

    const docRef = await db.collection('credit_cards_history').add(newCard);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

/**
 * POST /admin/cards/:cardId
 * Create a new card with a specific cardId (for the first version, use ReferenceCardId as the card ID)
 * New cards/versions are NOT active by default - must be activated manually
 */
router.post('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const parsed = parseOr400(CreditCardUpdateSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    }
    const cardData = parsed.data;
    const now = new Date().toISOString();

    // Check if a card with this ID already exists
    const existing = await db.collection('credit_cards_history').doc(cardId).get();
    if (existing.exists) {
      return res.status(409).json({ error: 'A card with this ID already exists' });
    }

    const newCard = {
      ...cardData,
      // Normalize blank/undefined effectiveTo to the ongoing sentinel
      effectiveTo:
        cardData?.effectiveTo === '' || cardData?.effectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : cardData.effectiveTo,
      lastUpdated: now,
      // Ensure new versions are NOT active by default
      IsActive: cardData.IsActive === true ? true : false,
    };

    await db.collection('credit_cards_history').doc(cardId).set(newCard);

    res.status(201).json({ id: cardId });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

/**
 * PUT /admin/cards/:cardId
 * Update an existing card
 * Also syncs to credit_cards collection if the updated version is active
 */
router.put('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const parsed = parseOr400(CreditCardUpdateSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    }
    const cardData = parsed.data;
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

    // If this version is active, sync the updated data to credit_cards collection
    const updatedDoc = await db.collection('credit_cards_history').doc(cardId).get();
    if (updatedDoc.exists) {
      const updatedData = updatedDoc.data() as CreditCardDetails;
      if (updatedData.IsActive === true) {
        await syncActiveVersionToCreditCards(updatedData.ReferenceCardId, {
          ...updatedData,
          id: cardId,
        } as CreditCardDetails);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

/**
 * DELETE /admin/cards/:cardId
 * Delete a card version
 * Also removes from credit_cards collection if the deleted version was active
 */
router.delete('/:cardId', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    // Get the version before deleting to check if it was active
    const versionDoc = await db.collection('credit_cards_history').doc(cardId).get();
    const wasActive = versionDoc.exists && (versionDoc.data() as CreditCardDetails).IsActive === true;
    const referenceCardId = versionDoc.exists ? (versionDoc.data() as CreditCardDetails).ReferenceCardId : null;

    await db.collection('credit_cards_history').doc(cardId).delete();

    // If the deleted version was active, remove from credit_cards
    if (wasActive && referenceCardId) {
      await removeFromCreditCards(referenceCardId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

/**
 * DELETE /admin/cards/reference/:referenceCardId/all
 * Delete ALL versions of a card by ReferenceCardId, plus all associated components
 * Also deletes the entry from credit_cards_names collection and credit_cards collection
 */
router.delete('/reference/:referenceCardId/all', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;

    const batch = db.batch();

    // Delete the card name entry from credit_cards_names
    const cardNameRef = db.collection('credit_cards_names').doc(referenceCardId);
    const cardNameDoc = await cardNameRef.get();
    if (cardNameDoc.exists) {
      batch.delete(cardNameRef);
    }

    // Get all versions with this ReferenceCardId
    const versionsSnapshot = await db
      .collection('credit_cards_history')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();

    const versionIds: string[] = [];

    // Delete all version documents
    versionsSnapshot.forEach((doc) => {
      versionIds.push(doc.id);
      batch.delete(doc.ref);
    });

    // Delete all associated components by ReferenceCardId
    // Credits
    const creditsSnapshot = await db
      .collection('credit_cards_credits')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();
    creditsSnapshot.forEach((doc) => batch.delete(doc.ref));

    // Perks
    const perksSnapshot = await db
      .collection('credit_cards_perks')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();
    perksSnapshot.forEach((doc) => batch.delete(doc.ref));

    // Multipliers
    const multipliersSnapshot = await db
      .collection('credit_cards_multipliers')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();
    multipliersSnapshot.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    // Remove from credit_cards collection (production)
    await removeFromCreditCards(referenceCardId);

    res.json({ success: true, deletedVersions: versionIds.length });
  } catch (error) {
    console.error('Error deleting entire card:', error);
    res.status(500).json({ error: 'Failed to delete entire card' });
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
 * Create a new version of a card with provided data (does not copy from existing versions)
 * New versions are NOT active by default - must be activated manually
 */
router.post('/:referenceCardId/versions', async (req: Request, res: Response) => {
  try {
    const { referenceCardId } = req.params;
    const parseCreate = parseOr400(CreditCardCreateSchema.partial(), req.body);
    if (!parseCreate.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parseCreate.errors });
    }
    const newVersionData = parseCreate.data;
    const now = new Date().toISOString();

    // Create new version with the provided data
    const normalizedEffectiveTo =
      !newVersionData?.effectiveTo || newVersionData.effectiveTo === ''
        ? ONGOING_SENTINEL_DATE
        : newVersionData.effectiveTo;

    const newCard: CreditCardDetails = {
      ...newVersionData,
      ReferenceCardId: referenceCardId,
      effectiveTo: normalizedEffectiveTo,
      lastUpdated: now,
      // Ensure new versions are NOT active by default
      IsActive: newVersionData.IsActive === true ? true : false,
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
 * New versions are NOT active by default - must be activated manually
 */
router.post('/:referenceCardId/versions/:versionId', async (req: Request, res: Response) => {
  try {
    const { referenceCardId, versionId } = req.params;
    const parseCreate = parseOr400(CreditCardCreateSchema.partial(), req.body);
    if (!parseCreate.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parseCreate.errors });
    }
    const newVersionData = parseCreate.data as Partial<CreditCardDetails>;
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
      // Ensure new versions are NOT active by default
      IsActive: newVersionData.IsActive === true ? true : false,
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
 * Also syncs the active version to the credit_cards collection
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

    const now = new Date().toISOString();

    // Set IsActive to true
    await db.collection('credit_cards_history').doc(versionId).update({
      IsActive: true,
      lastUpdated: now,
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
            lastUpdated: now,
          });
        }
      });

      await batch.commit();
    }

    // Sync the activated version to credit_cards collection
    const activatedVersionData = {
      ...versionDoc.data(),
      IsActive: true,
      lastUpdated: now,
    } as CreditCardDetails;
    await syncActiveVersionToCreditCards(referenceCardId, activatedVersionData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error activating version:', error);
    res.status(500).json({ error: 'Failed to activate version' });
  }
});

/**
 * POST /admin/cards/:referenceCardId/versions/:versionId/deactivate
 * Deactivate a specific version by setting IsActive to false
 * Also removes from credit_cards collection (only active versions are in credit_cards)
 */
router.post('/:referenceCardId/versions/:versionId/deactivate', async (req: Request, res: Response) => {
  try {
    const { referenceCardId, versionId } = req.params;

    const versionDoc = await db.collection('credit_cards_history').doc(versionId).get();
    if (!versionDoc.exists) {
      return res.status(404).json({ error: 'Version not found' });
    }

    await db.collection('credit_cards_history').doc(versionId).update({
      IsActive: false,
      lastUpdated: new Date().toISOString(),
    });

    // Remove from credit_cards since only active versions should be there
    await removeFromCreditCards(referenceCardId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating version:', error);
    res.status(500).json({ error: 'Failed to deactivate version' });
  }
});

export default router;
