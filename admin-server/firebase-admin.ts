import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Support both file path (local dev) and env var (production)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: parse from environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  // Local development: read from file
  serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
} else {
  throw new Error('Firebase service account not configured');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
