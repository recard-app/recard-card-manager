import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { API_ROUTES } from './api-routes';
import { DEFAULT_PERMISSIONS } from '@/types/permissions';
import type { FeaturePermissions } from '@/types/permissions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// API base URL for permission checks
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

/**
 * Get feature permissions for an email.
 * Calls the backend to check all feature permissions.
 */
export const getUserPermissions = async (email: string | null | undefined): Promise<FeaturePermissions> => {
  if (!email) return { ...DEFAULT_PERMISSIONS };

  try {
    const response = await fetch(`${API_BASE_URL}${API_ROUTES.PERMISSIONS.CHECK(email)}`);
    if (!response.ok) {
      console.error('Permission check failed:', response.status);
      return { ...DEFAULT_PERMISSIONS };
    }
    const data = await response.json();
    return data.permissions ?? { ...DEFAULT_PERMISSIONS };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { ...DEFAULT_PERMISSIONS };
  }
};
