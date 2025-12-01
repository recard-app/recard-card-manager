import { db } from '../firebase-admin';

const PERMISSIONS_COLLECTION = 'permissions';
const CARD_MANAGER_DOC = 'card-manager';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedEmails: string[] = [];
let cacheTimestamp = 0;

/**
 * Get the list of admin emails from Firestore with caching.
 * Emails are normalized to lowercase.
 */
export async function getAdminEmails(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached emails if still valid
  if (cachedEmails.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedEmails;
  }

  try {
    const doc = await db.collection(PERMISSIONS_COLLECTION).doc(CARD_MANAGER_DOC).get();
    
    if (doc.exists) {
      const data = doc.data();
      const allowed = data?.allowed || [];
      // Normalize emails to lowercase
      cachedEmails = allowed.map((email: string) => email.toLowerCase());
    } else {
      console.warn(`Permission document ${PERMISSIONS_COLLECTION}/${CARD_MANAGER_DOC} not found`);
      cachedEmails = [];
    }
    
    cacheTimestamp = now;
    return cachedEmails;
  } catch (error) {
    console.error('Error fetching admin emails from Firestore:', error);
    // Return cached emails if available, otherwise empty array
    return cachedEmails;
  }
}

/**
 * Check if an email is in the admin whitelist.
 * @param email The email to check
 * @returns true if the email is authorized
 */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const allowed = await getAdminEmails();
  return allowed.includes(email.toLowerCase());
}

/**
 * Force refresh the cached emails from Firestore.
 * Useful for immediate permission updates.
 */
export async function refreshPermissionCache(): Promise<string[]> {
  cacheTimestamp = 0; // Invalidate cache
  return getAdminEmails();
}

