import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { API_ROUTES } from './api-routes';

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
 * Check if an email is in the admin whitelist.
 * Calls the backend to verify against Firestore permissions.
 * @param email The email to check
 * @returns true if the email is authorized
 */
export const isAdminEmail = async (email: string | null | undefined): Promise<boolean> => {
  if (!email) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}${API_ROUTES.PERMISSIONS.CHECK(email)}`);
    if (!response.ok) {
      console.error('Permission check failed:', response.status);
      return false;
    }
    const data = await response.json();
    return data.allowed === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};
