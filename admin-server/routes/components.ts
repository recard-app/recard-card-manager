import express, { Request, Response } from 'express';
import { db } from '../firebase-admin';
import { CardCredit, CardPerk, CardMultiplier, ONGOING_SENTINEL_DATE } from '../types';
import { verifyAuth } from '../middleware/auth';
import { CreditSchema, PerkSchema, MultiplierSchema, parseOr400 } from '../validation/schemas';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAuth);

// ===== CREDITS =====

/**
 * GET /admin/cards/:cardId/credits
 * Get all credits for a card by ReferenceCardId (or version ID for backwards compatibility)
 */
router.get('/cards/:cardId/credits', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    // Try to determine the ReferenceCardId
    // First, check if cardId is a version ID in credit_cards_history
    let referenceCardId = cardId;
    const cardDoc = await db.collection('credit_cards_history').doc(cardId).get();
    if (cardDoc.exists) {
      referenceCardId = cardDoc.data()?.ReferenceCardId || cardId;
    }
    // If not found as version, use cardId directly as ReferenceCardId

    const snapshot = await db
      .collection('credit_cards_credits')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const credits: CardCredit[] = [];
    snapshot.forEach((doc) => {
      credits.push({
        ...doc.data() as CardCredit,
        id: doc.id,
      });
    });

    res.json(credits);
  } catch (error) {
    console.error('Error fetching credits:', error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

/**
 * POST /admin/credits
 * Create a new credit
 */
router.post('/credits', async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(CreditSchema, req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    }
    const creditData = parsed.data;
    // Normalize EffectiveTo if blank/null/undefined
    if (Object.prototype.hasOwnProperty.call(creditData, 'EffectiveTo')) {
      creditData.EffectiveTo =
        creditData.EffectiveTo === '' || creditData.EffectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : creditData.EffectiveTo;
    }
    const docRef = await db.collection('credit_cards_credits').add(creditData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating credit:', error);
    res.status(500).json({ error: 'Failed to create credit' });
  }
});

/**
 * PUT /admin/credits/:creditId
 * Update an existing credit
 */
router.put('/credits/:creditId', async (req: Request, res: Response) => {
  try {
    const { creditId } = req.params;
    const parsed = parseOr400(CreditSchema.partial(), req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    }
    const creditData = parsed.data;
    // Normalize EffectiveTo if explicitly provided
    if (Object.prototype.hasOwnProperty.call(creditData, 'EffectiveTo')) {
      creditData.EffectiveTo =
        creditData.EffectiveTo === '' || creditData.EffectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : creditData.EffectiveTo;
    }

    await db.collection('credit_cards_credits').doc(creditId).update(creditData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating credit:', error);
    res.status(500).json({ error: 'Failed to update credit' });
  }
});

/**
 * DELETE /admin/credits/:creditId
 * Delete a credit
 */
router.delete('/credits/:creditId', async (req: Request, res: Response) => {
  try {
    const { creditId } = req.params;
    await db.collection('credit_cards_credits').doc(creditId).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit:', error);
    res.status(500).json({ error: 'Failed to delete credit' });
  }
});

// ===== PERKS =====

/**
 * GET /admin/cards/:cardId/perks
 * Get all perks for a card by ReferenceCardId (or version ID for backwards compatibility)
 */
router.get('/cards/:cardId/perks', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    // Try to determine the ReferenceCardId
    // First, check if cardId is a version ID in credit_cards_history
    let referenceCardId = cardId;
    const cardDoc = await db.collection('credit_cards_history').doc(cardId).get();
    if (cardDoc.exists) {
      referenceCardId = cardDoc.data()?.ReferenceCardId || cardId;
    }
    // If not found as version, use cardId directly as ReferenceCardId

    const snapshot = await db
      .collection('credit_cards_perks')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const perks: CardPerk[] = [];
    snapshot.forEach((doc) => {
      perks.push({
        ...doc.data() as CardPerk,
        id: doc.id,
      });
    });

    res.json(perks);
  } catch (error) {
    console.error('Error fetching perks:', error);
    res.status(500).json({ error: 'Failed to fetch perks' });
  }
});

/**
 * POST /admin/perks
 * Create a new perk
 */
router.post('/perks', async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(PerkSchema, req.body);
    if (!parsed.ok) return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    const perkData = parsed.data;
    if (Object.prototype.hasOwnProperty.call(perkData, 'EffectiveTo')) {
      perkData.EffectiveTo =
        perkData.EffectiveTo === '' || perkData.EffectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : perkData.EffectiveTo;
    }
    const docRef = await db.collection('credit_cards_perks').add(perkData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating perk:', error);
    res.status(500).json({ error: 'Failed to create perk' });
  }
});

/**
 * PUT /admin/perks/:perkId
 * Update an existing perk
 */
router.put('/perks/:perkId', async (req: Request, res: Response) => {
  try {
    const { perkId } = req.params;
    const parsed = parseOr400(PerkSchema.partial(), req.body);
    if (!parsed.ok) return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    const perkData = parsed.data;
    if (Object.prototype.hasOwnProperty.call(perkData, 'EffectiveTo')) {
      perkData.EffectiveTo =
        perkData.EffectiveTo === '' || perkData.EffectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : perkData.EffectiveTo;
    }

    await db.collection('credit_cards_perks').doc(perkId).update(perkData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating perk:', error);
    res.status(500).json({ error: 'Failed to update perk' });
  }
});

/**
 * DELETE /admin/perks/:perkId
 * Delete a perk
 */
router.delete('/perks/:perkId', async (req: Request, res: Response) => {
  try {
    const { perkId } = req.params;
    await db.collection('credit_cards_perks').doc(perkId).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting perk:', error);
    res.status(500).json({ error: 'Failed to delete perk' });
  }
});

// ===== MULTIPLIERS =====

/**
 * GET /admin/cards/:cardId/multipliers
 * Get all multipliers for a card by ReferenceCardId (or version ID for backwards compatibility)
 */
router.get('/cards/:cardId/multipliers', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;

    // Try to determine the ReferenceCardId
    // First, check if cardId is a version ID in credit_cards_history
    let referenceCardId = cardId;
    const cardDoc = await db.collection('credit_cards_history').doc(cardId).get();
    if (cardDoc.exists) {
      referenceCardId = cardDoc.data()?.ReferenceCardId || cardId;
    }
    // If not found as version, use cardId directly as ReferenceCardId

    const snapshot = await db
      .collection('credit_cards_multipliers')
      .where('ReferenceCardId', '==', referenceCardId)
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const multipliers: CardMultiplier[] = [];
    snapshot.forEach((doc) => {
      multipliers.push({
        ...doc.data() as CardMultiplier,
        id: doc.id,
      });
    });

    res.json(multipliers);
  } catch (error) {
    console.error('Error fetching multipliers:', error);
    res.status(500).json({ error: 'Failed to fetch multipliers' });
  }
});

/**
 * POST /admin/multipliers
 * Create a new multiplier
 */
router.post('/multipliers', async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(MultiplierSchema, req.body);
    if (!parsed.ok) return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    const multiplierData = parsed.data;
    if (Object.prototype.hasOwnProperty.call(multiplierData, 'EffectiveTo')) {
      multiplierData.EffectiveTo =
        multiplierData.EffectiveTo === '' || multiplierData.EffectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : multiplierData.EffectiveTo;
    }
    const docRef = await db.collection('credit_cards_multipliers').add(multiplierData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating multiplier:', error);
    res.status(500).json({ error: 'Failed to create multiplier' });
  }
});

/**
 * PUT /admin/multipliers/:multiplierId
 * Update an existing multiplier
 */
router.put('/multipliers/:multiplierId', async (req: Request, res: Response) => {
  try {
    const { multiplierId } = req.params;
    const parsed = parseOr400(MultiplierSchema.partial(), req.body);
    if (!parsed.ok) return res.status(400).json({ error: 'Invalid request body', details: parsed.errors });
    const multiplierData = parsed.data;
    if (Object.prototype.hasOwnProperty.call(multiplierData, 'EffectiveTo')) {
      multiplierData.EffectiveTo =
        multiplierData.EffectiveTo === '' || multiplierData.EffectiveTo == null
          ? ONGOING_SENTINEL_DATE
          : multiplierData.EffectiveTo;
    }

    await db.collection('credit_cards_multipliers').doc(multiplierId).update(multiplierData);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating multiplier:', error);
    res.status(500).json({ error: 'Failed to update multiplier' });
  }
});

/**
 * DELETE /admin/multipliers/:multiplierId
 * Delete a multiplier
 */
router.delete('/multipliers/:multiplierId', async (req: Request, res: Response) => {
  try {
    const { multiplierId } = req.params;
    await db.collection('credit_cards_multipliers').doc(multiplierId).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting multiplier:', error);
    res.status(500).json({ error: 'Failed to delete multiplier' });
  }
});

// ===== ROTATING SCHEDULE SUBCOLLECTION =====

/**
 * GET /admin/multipliers/:multiplierId/schedule
 * Get all rotating schedule entries for a multiplier
 */
router.get('/multipliers/:multiplierId/schedule', async (req: Request, res: Response) => {
  try {
    const { multiplierId } = req.params;

    const snapshot = await db
      .collection('credit_cards_multipliers')
      .doc(multiplierId)
      .collection('schedule')
      .orderBy('startDate', 'desc')
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const entries: any[] = [];
    snapshot.forEach((doc) => {
      entries.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * POST /admin/multipliers/:multiplierId/schedule
 * Create a rotating schedule entry
 */
router.post('/multipliers/:multiplierId/schedule', async (req: Request, res: Response) => {
  try {
    const { multiplierId } = req.params;
    const entryData = req.body;

    // Remove any id field if present (Firestore will generate one)
    if (entryData.id) {
      delete entryData.id;
    }

    const docRef = await db
      .collection('credit_cards_multipliers')
      .doc(multiplierId)
      .collection('schedule')
      .add(entryData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating schedule entry:', error);
    res.status(500).json({ error: 'Failed to create schedule entry' });
  }
});

/**
 * DELETE /admin/multipliers/:multiplierId/schedule/:entryId
 * Delete a rotating schedule entry
 */
router.delete('/multipliers/:multiplierId/schedule/:entryId', async (req: Request, res: Response) => {
  try {
    const { multiplierId, entryId } = req.params;

    await db
      .collection('credit_cards_multipliers')
      .doc(multiplierId)
      .collection('schedule')
      .doc(entryId)
      .delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule entry:', error);
    res.status(500).json({ error: 'Failed to delete schedule entry' });
  }
});

// ===== ALLOWED CATEGORIES SUBCOLLECTION =====

/**
 * GET /admin/multipliers/:multiplierId/allowed-categories
 * Get all allowed categories for a selectable multiplier
 */
router.get('/multipliers/:multiplierId/allowed-categories', async (req: Request, res: Response) => {
  try {
    const { multiplierId } = req.params;

    const snapshot = await db
      .collection('credit_cards_multipliers')
      .doc(multiplierId)
      .collection('allowed_categories')
      .orderBy('displayName', 'asc')
      .get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const categories: any[] = [];
    snapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching allowed categories:', error);
    res.status(500).json({ error: 'Failed to fetch allowed categories' });
  }
});

/**
 * POST /admin/multipliers/:multiplierId/allowed-categories
 * Create an allowed category entry
 */
router.post('/multipliers/:multiplierId/allowed-categories', async (req: Request, res: Response) => {
  try {
    const { multiplierId } = req.params;
    const categoryData = req.body;

    // Remove any id field if present (Firestore will generate one)
    if (categoryData.id) {
      delete categoryData.id;
    }

    const docRef = await db
      .collection('credit_cards_multipliers')
      .doc(multiplierId)
      .collection('allowed_categories')
      .add(categoryData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating allowed category:', error);
    res.status(500).json({ error: 'Failed to create allowed category' });
  }
});

/**
 * DELETE /admin/multipliers/:multiplierId/allowed-categories/:categoryId
 * Delete an allowed category entry
 */
router.delete('/multipliers/:multiplierId/allowed-categories/:categoryId', async (req: Request, res: Response) => {
  try {
    const { multiplierId, categoryId } = req.params;

    await db
      .collection('credit_cards_multipliers')
      .doc(multiplierId)
      .collection('allowed_categories')
      .doc(categoryId)
      .delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting allowed category:', error);
    res.status(500).json({ error: 'Failed to delete allowed category' });
  }
});

export default router;
