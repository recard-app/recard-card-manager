import * as admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();

function loadServiceAccount(): admin.ServiceAccount | null {
  const pathFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (pathFromEnv) {
    const resolved = resolve(pathFromEnv);
    if (existsSync(resolved)) {
      try {
        return JSON.parse(readFileSync(resolved, 'utf8')) as admin.ServiceAccount;
      } catch (error) {
        console.error('Failed to read service account from file:', error);
      }
    }
  }

  // Fallback paths
  const candidates = [
    join(__dirname, '../../Server/config/firebase-service-account.json'),
    join(__dirname, '../../../Server/config/firebase-service-account.json'),
    '/etc/secrets/firebase-service-account.json',
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      try {
        return JSON.parse(readFileSync(candidate, 'utf8')) as admin.ServiceAccount;
      } catch (error) {
        console.error(`Failed to read service account from ${candidate}:`, error);
      }
    }
  }

  return null;
}

// Initialize Admin SDK
if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.warn('No Firebase service account found, using Application Default Credentials');
    admin.initializeApp();
  }
}

export const db = admin.firestore();
export { admin };
