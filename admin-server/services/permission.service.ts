import { db } from '../firebase-admin';
import { FEATURES, PERMISSIONS_COLLECTION } from '../constants/features';
import type { FeatureKey } from '../constants/features';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FeatureCache {
  emails: string[];
  timestamp: number;
}

const featureCaches = new Map<FeatureKey, FeatureCache>();

/**
 * Get the list of authorized emails for a specific feature from Firestore with caching.
 * Emails are normalized to lowercase.
 */
export async function getFeatureEmails(feature: FeatureKey): Promise<string[]> {
  const now = Date.now();
  const cached = featureCaches.get(feature);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.emails;
  }

  try {
    const doc = await db.collection(PERMISSIONS_COLLECTION).doc(feature).get();

    let emails: string[] = [];
    if (doc.exists) {
      const data = doc.data();
      const allowed = data?.allowed || [];
      emails = allowed.map((email: string) => email.toLowerCase());
    } else {
      console.warn(`Permission document ${PERMISSIONS_COLLECTION}/${feature} not found`);
    }

    featureCaches.set(feature, { emails, timestamp: now });
    return emails;
  } catch (error) {
    console.error(`Error fetching emails for feature ${feature}:`, error);
    return cached?.emails || [];
  }
}

/**
 * Check if an email has access to a specific feature.
 */
export async function hasFeatureAccess(email: string | null | undefined, feature: FeatureKey): Promise<boolean> {
  if (!email) return false;
  const allowed = await getFeatureEmails(feature);
  return allowed.includes(email.toLowerCase());
}

/**
 * Get all feature permissions for a given email.
 * Returns a record mapping each feature key to a boolean.
 */
export async function getUserPermissions(email: string | null | undefined): Promise<Record<FeatureKey, boolean>> {
  const result = {} as Record<FeatureKey, boolean>;

  if (!email) {
    for (const feature of FEATURES) {
      result[feature] = false;
    }
    return result;
  }

  const checks = await Promise.all(
    FEATURES.map(async (feature) => ({
      feature,
      allowed: await hasFeatureAccess(email, feature),
    }))
  );

  for (const { feature, allowed } of checks) {
    result[feature] = allowed;
  }

  return result;
}

/**
 * Check if an email has access to any feature.
 */
export async function hasAnyAccess(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const permissions = await getUserPermissions(email);
  return Object.values(permissions).some(Boolean);
}

/**
 * Check if an email is in the card-manager whitelist.
 * @deprecated Use hasFeatureAccess(email, 'card-manager') instead.
 */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  return hasFeatureAccess(email, 'card-manager');
}

/**
 * Force refresh the cached emails for a specific feature, or all features.
 */
export async function refreshPermissionCache(feature?: FeatureKey): Promise<void> {
  if (feature) {
    featureCaches.delete(feature);
    await getFeatureEmails(feature);
  } else {
    featureCaches.clear();
    await Promise.all(FEATURES.map((f) => getFeatureEmails(f)));
  }
}
