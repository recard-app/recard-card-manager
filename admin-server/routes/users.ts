import { Router, Request, Response } from 'express';
import admin from '../firebase-admin';
import { db } from '../firebase-admin';
import { verifyToken, requireFeature } from '../middleware/auth';
import { SubscriptionUpdateSchema, parseOr400 } from '../validation/schemas';
import type { UserListItem, UserDetail } from '../types';

const router = Router();

router.use(verifyToken, requireFeature('user-manager'));

// GET /admin/users -- List all users
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Collect all Firebase Auth users
    const authUsers: admin.auth.UserRecord[] = [];
    let pageToken: string | undefined;
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      authUsers.push(...result.users);
      pageToken = result.pageToken;
    } while (pageToken);

    // Batch-fetch Firestore user docs (chunks of 100)
    const uids = authUsers.map((u) => u.uid);
    const userDocsMap = new Map<string, FirebaseFirestore.DocumentData>();

    for (let i = 0; i < uids.length; i += 100) {
      const chunk = uids.slice(i, i + 100);
      const refs = chunk.map((uid) => db.collection('users').doc(uid));
      const snapshots = await db.getAll(...refs);
      for (const snap of snapshots) {
        if (snap.exists) {
          userDocsMap.set(snap.id, snap.data()!);
        }
      }
    }

    // Join Auth + Firestore
    const users: UserListItem[] = authUsers.map((authUser) => {
      const fsData = userDocsMap.get(authUser.uid);
      return {
        uid: authUser.uid,
        email: authUser.email || '',
        displayName: authUser.displayName || null,
        createdAt: authUser.metadata.creationTime || null,
        subscriptionPlan: fsData?.subscriptionPlan || 'free',
        role: fsData?.role || 'user',
      };
    });

    users.sort((a, b) => a.email.localeCompare(b.email));
    res.json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// GET /admin/users/:userId -- User detail
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Fetch Auth record
    let authUser: admin.auth.UserRecord;
    try {
      authUser = await admin.auth().getUser(userId);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw err;
    }

    // Fetch Firestore user doc
    const userDoc = await db.collection('users').doc(userId).get();
    const fsData = userDoc.exists ? userDoc.data()! : {};

    // Fetch credit_cards subcollection
    const cardsSnap = await db.collection('users').doc(userId).collection('credit_cards').get();
    const cardRefIds = cardsSnap.docs.map((d) => d.data().referenceCardId || d.id);

    // Resolve card names from credit_cards_names collection
    const cardNames: string[] = [];
    if (cardRefIds.length > 0) {
      for (let i = 0; i < cardRefIds.length; i += 100) {
        const chunk = cardRefIds.slice(i, i + 100);
        const refs = chunk.map((id: string) => db.collection('credit_cards_names').doc(id));
        const snapshots = await db.getAll(...refs);
        for (const snap of snapshots) {
          if (snap.exists) {
            cardNames.push(snap.data()!.CardName || snap.id);
          } else {
            cardNames.push(snap.id);
          }
        }
      }
    }

    // Count chats
    const chatCountSnap = await db
      .collection('chats')
      .where('userId', '==', userId)
      .count()
      .get();
    const chatCount = chatCountSnap.data().count;

    // Helper to convert Firestore timestamps
    const toISOString = (val: any): string | null => {
      if (!val) return null;
      if (typeof val.toDate === 'function') return val.toDate().toISOString();
      if (typeof val === 'string') return val;
      return null;
    };

    const detail: UserDetail = {
      uid: authUser.uid,
      email: authUser.email || '',
      displayName: authUser.displayName || null,
      createdAt: authUser.metadata.creationTime || null,
      lastLoginAt: authUser.metadata.lastSignInTime || null,
      role: fsData.role || 'user',
      subscriptionPlan: fsData.subscriptionPlan || 'free',
      subscriptionStatus: fsData.subscriptionStatus || 'none',
      subscriptionBillingPeriod: fsData.subscriptionBillingPeriod || null,
      subscriptionStartedAt: toISOString(fsData.subscriptionStartedAt),
      subscriptionExpiresAt: toISOString(fsData.subscriptionExpiresAt),
      preferences: fsData.preferences || {},
      wallet: {
        cardCount: cardsSnap.size,
        cardNames,
      },
      chatCount,
    };

    res.json(detail);
  } catch (error) {
    console.error('Error fetching user detail:', error);
    res.status(500).json({ error: 'Failed to fetch user detail' });
  }
});

// PATCH /admin/users/:userId/subscription -- Update subscription
router.patch('/:userId/subscription', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const parsed = parseOr400(SubscriptionUpdateSchema, req.body);
  if (!parsed.ok) {
    return res.status(400).json({ errors: parsed.errors });
  }

  try {
    // Verify user exists
    try {
      await admin.auth().getUser(userId);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw err;
    }

    // Build update object -- no undefined values (Firestore restriction)
    const updateData: Record<string, any> = {};
    const data = parsed.data;

    if (data.subscriptionPlan !== undefined) {
      updateData.subscriptionPlan = data.subscriptionPlan;
    }
    if (data.subscriptionStatus !== undefined) {
      updateData.subscriptionStatus = data.subscriptionStatus;
    }
    if (data.subscriptionBillingPeriod !== undefined) {
      updateData.subscriptionBillingPeriod = data.subscriptionBillingPeriod;
    }
    if (data.subscriptionStartedAt !== undefined) {
      updateData.subscriptionStartedAt = data.subscriptionStartedAt;
    }
    if (data.subscriptionExpiresAt !== undefined) {
      updateData.subscriptionExpiresAt = data.subscriptionExpiresAt;
    }

    await db.collection('users').doc(userId).set(updateData, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// DELETE /admin/users/:userId -- Delete user account
router.delete('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Verify user exists
    try {
      await admin.auth().getUser(userId);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw err;
    }

    // Helper: delete all docs in a query using chunked batches of 500
    const deleteInBatches = async (query: FirebaseFirestore.Query) => {
      let snap = await query.limit(500).get();
      while (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        snap = await query.limit(500).get();
      }
    };

    // Delete credit_cards subcollection
    await deleteInBatches(db.collection('users').doc(userId).collection('credit_cards'));

    // Delete credit_history subcollection
    await deleteInBatches(db.collection('users').doc(userId).collection('credit_history'));

    // Delete all chats for this user
    await deleteInBatches(db.collection('chats').where('userId', '==', userId));

    // Delete user document
    await db.collection('users').doc(userId).delete();

    // Delete Firebase Auth user
    await admin.auth().deleteUser(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
