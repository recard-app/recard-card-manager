import express, { Request, Response } from 'express';
import { db } from '../firebase-admin';
import { CardCredit, CardPerk, CardMultiplier, ONGOING_SENTINEL_DATE } from '../types';
import { verifyAuth } from '../middleware/auth';
import { CreditSchema, CreditUpdateSchema, PerkSchema, MultiplierSchema, parseOr400 } from '../validation/schemas';
import { isValidCategory, isValidSubCategory } from '../constants/categories';
import { z } from 'zod';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAuth);

/**
 * Helper: Update parent card's componentsLastUpdated timestamp
 * Finds the active version for the given ReferenceCardId and updates its timestamp
 */
async function updateCardComponentsTimestamp(referenceCardId: string): Promise<void> {
  try {
    // Find active version(s) for this card
    const snapshot = await db
      .collection('credit_cards_history')
      .where('ReferenceCardId', '==', referenceCardId)
      .where('effectiveTo', '==', ONGOING_SENTINEL_DATE)
      .get();

    if (snapshot.empty) {
      console.warn(`No active version found for ReferenceCardId: ${referenceCardId}`);
      return;
    }

    const now = new Date().toISOString();
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { componentsLastUpdated: now });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error updating card componentsLastUpdated:', error);
    // Don't throw - this is a secondary operation, component save should still succeed
  }
}

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
    const referenceCardId = parsed.data.ReferenceCardId;
    const docId = await createCreditDoc(parsed.data as Record<string, unknown>, referenceCardId);
    await updateCardComponentsTimestamp(referenceCardId);
    res.status(201).json({ id: docId });
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
    if ('TimePeriod' in req.body || 'isAnniversaryBased' in req.body || 'isNonMonetary' in req.body) {
      return res.status(400).json({
        error: 'TimePeriod, isAnniversaryBased, and isNonMonetary cannot be modified after creation. Delete and recreate the credit instead.',
      });
    }
    const parsed = parseOr400(CreditUpdateSchema, req.body);
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
    // Set LastUpdated timestamp
    (creditData as any).LastUpdated = new Date().toISOString();

    // Get ReferenceCardId before update
    const creditDoc = await db.collection('credit_cards_credits').doc(creditId).get();
    const referenceCardId = creditDoc.data()?.ReferenceCardId;

    await db.collection('credit_cards_credits').doc(creditId).update(creditData);

    // Update parent card's componentsLastUpdated
    if (referenceCardId) {
      await updateCardComponentsTimestamp(referenceCardId);
    }

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

    // Get ReferenceCardId before delete
    const creditDoc = await db.collection('credit_cards_credits').doc(creditId).get();
    const referenceCardId = creditDoc.data()?.ReferenceCardId;

    await db.collection('credit_cards_credits').doc(creditId).delete();

    // Update parent card's componentsLastUpdated
    if (referenceCardId) {
      await updateCardComponentsTimestamp(referenceCardId);
    }

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
    const referenceCardId = parsed.data.ReferenceCardId;
    const docId = await createPerkDoc(parsed.data as Record<string, unknown>, referenceCardId);
    await updateCardComponentsTimestamp(referenceCardId);
    res.status(201).json({ id: docId });
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
    // Set LastUpdated timestamp
    (perkData as any).LastUpdated = new Date().toISOString();

    // Get ReferenceCardId before update
    const perkDoc = await db.collection('credit_cards_perks').doc(perkId).get();
    const referenceCardId = perkDoc.data()?.ReferenceCardId;

    await db.collection('credit_cards_perks').doc(perkId).update(perkData);

    // Update parent card's componentsLastUpdated
    if (referenceCardId) {
      await updateCardComponentsTimestamp(referenceCardId);
    }

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

    // Get ReferenceCardId before delete
    const perkDoc = await db.collection('credit_cards_perks').doc(perkId).get();
    const referenceCardId = perkDoc.data()?.ReferenceCardId;

    await db.collection('credit_cards_perks').doc(perkId).delete();

    // Update parent card's componentsLastUpdated
    if (referenceCardId) {
      await updateCardComponentsTimestamp(referenceCardId);
    }

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
    const referenceCardId = parsed.data.ReferenceCardId;
    const docId = await createMultiplierDoc(parsed.data as Record<string, unknown>, referenceCardId);
    await updateCardComponentsTimestamp(referenceCardId);
    res.status(201).json({ id: docId });
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
    // Set LastUpdated timestamp
    (multiplierData as any).LastUpdated = new Date().toISOString();

    // Get ReferenceCardId before update
    const multiplierDoc = await db.collection('credit_cards_multipliers').doc(multiplierId).get();
    const referenceCardId = multiplierDoc.data()?.ReferenceCardId;

    await db.collection('credit_cards_multipliers').doc(multiplierId).update(multiplierData);

    // Update parent card's componentsLastUpdated
    if (referenceCardId) {
      await updateCardComponentsTimestamp(referenceCardId);
    }

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

    // Get ReferenceCardId before delete
    const multiplierDoc = await db.collection('credit_cards_multipliers').doc(multiplierId).get();
    const referenceCardId = multiplierDoc.data()?.ReferenceCardId;

    await db.collection('credit_cards_multipliers').doc(multiplierId).delete();

    // Update parent card's componentsLastUpdated
    if (referenceCardId) {
      await updateCardComponentsTimestamp(referenceCardId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting multiplier:', error);
    res.status(500).json({ error: 'Failed to delete multiplier' });
  }
});

// ===== SHARED CREATION HELPERS =====

/**
 * Normalizes EffectiveTo and sets LastUpdated on a component data object.
 * Returns a new object (does not mutate input).
 */
function prepareComponentData(data: Record<string, unknown>, referenceCardId: string): Record<string, unknown> {
  const prepared: Record<string, unknown> = { ...data, ReferenceCardId: referenceCardId };
  if (Object.prototype.hasOwnProperty.call(prepared, 'EffectiveTo')) {
    prepared.EffectiveTo =
      prepared.EffectiveTo === '' || prepared.EffectiveTo == null
        ? ONGOING_SENTINEL_DATE
        : prepared.EffectiveTo;
  }
  prepared.LastUpdated = new Date().toISOString();
  return prepared;
}

/**
 * Creates a credit document in Firestore.
 */
async function createCreditDoc(data: Record<string, unknown>, referenceCardId: string): Promise<string> {
  const creditData = prepareComponentData(data, referenceCardId);
  const docRef = await db.collection('credit_cards_credits').add(creditData);
  return docRef.id;
}

/**
 * Creates a perk document in Firestore.
 */
async function createPerkDoc(data: Record<string, unknown>, referenceCardId: string): Promise<string> {
  const perkData = prepareComponentData(data, referenceCardId);
  const docRef = await db.collection('credit_cards_perks').add(perkData);
  return docRef.id;
}

/**
 * Creates a standard multiplier document in Firestore.
 * Does NOT handle schedule or allowed_categories subcollections.
 */
async function createMultiplierDoc(data: Record<string, unknown>, referenceCardId: string): Promise<string> {
  const multiplierData = prepareComponentData(data, referenceCardId);
  const docRef = await db.collection('credit_cards_multipliers').add(multiplierData);
  return docRef.id;
}

// ===== BULK CREATE =====

const BulkCreateItemSchema = z.object({
  type: z.enum(['credit', 'perk', 'multiplier']),
  data: z.record(z.string(), z.unknown()),
});

const BulkCreateSchema = z.object({
  referenceCardId: z.string().min(1),
  items: z.array(BulkCreateItemSchema).min(1),
});

interface BulkCreateResult {
  index: number;
  type: string;
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * POST /admin/components/bulk-create
 * Create multiple components in one request.
 * Supports partial success - items that pass validation are created even if others fail.
 */
router.post('/components/bulk-create', async (req: Request, res: Response) => {
  try {
    const parsed = BulkCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error?.issues });
    }

    const { referenceCardId, items } = parsed.data;

    // Verify the card exists
    const cardDoc = await db.collection('credit_cards_names').doc(referenceCardId).get();
    if (!cardDoc.exists) {
      return res.status(404).json({ error: `Card not found: ${referenceCardId}` });
    }

    const results: BulkCreateResult[] = [];
    let createdCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Reject rotating/selectable multipliers
        if (item.type === 'multiplier') {
          const multiplierType = item.data.multiplierType as string | undefined;
          if (multiplierType === 'rotating' || multiplierType === 'selectable') {
            results.push({
              index: i,
              type: item.type,
              success: false,
              error: 'Rotating/selectable multipliers must be created individually (requires subcollection setup)',
            });
            continue;
          }
        }

        // Inject ReferenceCardId into data before Zod validation
        const dataWithRef = { ...item.data, ReferenceCardId: referenceCardId };

        // Validate against appropriate Zod schema
        let validationResult;
        if (item.type === 'credit') {
          validationResult = CreditSchema.safeParse(dataWithRef);
        } else if (item.type === 'perk') {
          validationResult = PerkSchema.safeParse(dataWithRef);
        } else {
          validationResult = MultiplierSchema.safeParse(dataWithRef);
        }

        if (!validationResult.success) {
          const flat = validationResult.error.flatten();
          results.push({
            index: i,
            type: item.type,
            success: false,
            error: `Validation failed: ${JSON.stringify(flat.fieldErrors)}`,
          });
          continue;
        }

        // Hard-gate category validation against AI-facing categories
        const category = (item.data.Category || item.data.category) as string | undefined;
        const subCategory = (item.data.SubCategory || item.data.subCategory) as string | undefined;

        if (category && !isValidCategory(category)) {
          results.push({
            index: i,
            type: item.type,
            success: false,
            error: `Invalid category: "${category}"`,
          });
          continue;
        }

        if (category && subCategory && subCategory !== '' && !isValidSubCategory(category, subCategory)) {
          results.push({
            index: i,
            type: item.type,
            success: false,
            error: `Invalid subcategory "${subCategory}" for category "${category}"`,
          });
          continue;
        }

        // Create the component
        let docId: string;
        if (item.type === 'credit') {
          docId = await createCreditDoc(item.data, referenceCardId);
        } else if (item.type === 'perk') {
          docId = await createPerkDoc(item.data, referenceCardId);
        } else {
          docId = await createMultiplierDoc(item.data, referenceCardId);
        }

        results.push({ index: i, type: item.type, success: true, id: docId });
        createdCount++;
      } catch (error) {
        results.push({
          index: i,
          type: item.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update componentsLastUpdated only if at least one item was created
    if (createdCount > 0) {
      await updateCardComponentsTimestamp(referenceCardId);
    }

    const failedCount = items.length - createdCount;
    res.status(createdCount > 0 ? 201 : 400).json({
      results,
      summary: { created: createdCount, failed: failedCount },
    });
  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({ error: 'Failed to process bulk create' });
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
