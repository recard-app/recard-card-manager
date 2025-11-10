import express, { Request, Response } from 'express';
import { db } from '../firebase-admin';
import { CardCredit, CardPerk, CardMultiplier } from '../types';
import { verifyAuth } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyAuth);

// ===== CREDITS =====

/**
 * GET /admin/cards/:cardId/credits
 * Get all credits for a specific card version
 */
router.get('/cards/:cardId/credits', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const snapshot = await db
      .collection('cardCredits')
      .where('ReferenceCardId', '==', cardId)
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
    const creditData = req.body;
    const docRef = await db.collection('cardCredits').add(creditData);

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
    const creditData = req.body;

    await db.collection('cardCredits').doc(creditId).update(creditData);

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
    await db.collection('cardCredits').doc(creditId).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit:', error);
    res.status(500).json({ error: 'Failed to delete credit' });
  }
});

// ===== PERKS =====

/**
 * GET /admin/cards/:cardId/perks
 * Get all perks for a specific card version
 */
router.get('/cards/:cardId/perks', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const snapshot = await db
      .collection('cardPerks')
      .where('ReferenceCardId', '==', cardId)
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
    const perkData = req.body;
    const docRef = await db.collection('cardPerks').add(perkData);

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
    const perkData = req.body;

    await db.collection('cardPerks').doc(perkId).update(perkData);

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
    await db.collection('cardPerks').doc(perkId).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting perk:', error);
    res.status(500).json({ error: 'Failed to delete perk' });
  }
});

// ===== MULTIPLIERS =====

/**
 * GET /admin/cards/:cardId/multipliers
 * Get all multipliers for a specific card version
 */
router.get('/cards/:cardId/multipliers', async (req: Request, res: Response) => {
  try {
    const { cardId } = req.params;
    const snapshot = await db
      .collection('cardMultipliers')
      .where('ReferenceCardId', '==', cardId)
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
    const multiplierData = req.body;
    const docRef = await db.collection('cardMultipliers').add(multiplierData);

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
    const multiplierData = req.body;

    await db.collection('cardMultipliers').doc(multiplierId).update(multiplierData);

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
    await db.collection('cardMultipliers').doc(multiplierId).delete();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting multiplier:', error);
    res.status(500).json({ error: 'Failed to delete multiplier' });
  }
});

export default router;
