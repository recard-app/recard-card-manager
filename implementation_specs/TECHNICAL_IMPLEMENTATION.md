# Card Manager - Technical Implementation Specification

## Document Purpose

This document defines the **technical architecture and implementation approach** for the Credit Card Manager Dashboard, specifically addressing the frontend/backend split and technical stack decisions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Options Analysis](#implementation-options-analysis)
3. [Recommended Architecture](#recommended-architecture)
4. [Technology Stack](#technology-stack)
5. [Backend API Layer Specification](#backend-api-layer-specification)
6. [Frontend Architecture](#frontend-architecture)
7. [Security Implementation](#security-implementation)
8. [Development Workflow](#development-workflow)
9. [Deployment Strategy](#deployment-strategy)
10. [Code Organization](#code-organization)

---

## Architecture Overview

### Design Philosophy

The Card Manager is an **internal administrative tool** designed with the following principles:

- **Simplicity First**: Avoid building complex CRUD APIs with business logic
- **Direct Data Access**: Leverage Firebase Admin SDK for full Firestore control
- **Minimal Backend**: Backend acts as a thin proxy layer, not a business logic layer
- **Frontend-Driven Logic**: All data calculations, validations, and UI logic live in the frontend
- **Security by Design**: Admin SDK credentials never exposed to the browser

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CARD MANAGER FRONTEND                     │
│                      (React + TypeScript)                    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  UI Components                                      │    │
│  │  - Card List View                                   │    │
│  │  - Card Detail View                                 │    │
│  │  - Component Modals                                 │    │
│  │  - Version History                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Business Logic (Frontend)                          │    │
│  │  - Date overlap calculations                        │    │
│  │  - Component association logic                      │    │
│  │  - Form validation                                  │    │
│  │  - Data transformations                             │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  API Client                                         │    │
│  │  - HTTP requests to backend proxy                   │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP/REST
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              MINIMAL BACKEND PROXY LAYER                     │
│                   (Node.js + Express)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Proxy Routes (No Business Logic)                   │    │
│  │  - GET /cards → firestore.collection('cards')       │    │
│  │  - POST /cards → firestore.collection('cards')      │    │
│  │  - PUT /cards/:id → firestore.doc().update()        │    │
│  │  - DELETE /cards/:id → firestore.doc().delete()     │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Firebase Admin SDK                                 │    │
│  │  - Direct Firestore access                          │    │
│  │  - Batch operations                                 │    │
│  │  - Transaction support                              │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │ Firebase Admin SDK
                           ↓
                    ┌──────────────┐
                    │   FIRESTORE  │
                    │   Database   │
                    └──────────────┘
```

---

## Implementation Options Analysis

### Option 1: Electron Desktop App (True Frontend Only)

**Description**: Build the Card Manager as an Electron desktop application that runs Node.js natively.

**Architecture**:
```
Electron App (React + Node.js)
    ↓
Firebase Admin SDK (runs in Electron's Node.js environment)
    ↓
Firestore
```

**Pros**:
- ✅ True "frontend only" solution (no separate backend server)
- ✅ Can use Firebase Admin SDK directly in the app
- ✅ Full security (credentials embedded in desktop app, not web-exposed)
- ✅ Offline-capable
- ✅ Matches the spec's design intent of "no backend APIs"

**Cons**:
- ❌ Must distribute and install on admin machines
- ❌ Requires code signing for macOS/Windows distribution
- ❌ Updates require app redistribution
- ❌ Platform-specific builds (macOS, Windows, Linux)
- ❌ Overkill for a simple admin tool
- ❌ Adds Electron dependency to project

**When to Use**:
- If you need offline access
- If security is paramount (air-gapped environments)
- If you want native OS integration

---

### Option 2: Web App + Minimal Backend Proxy (Recommended)

**Description**: Build a React web app with a thin Express backend that only proxies Firebase Admin SDK calls.

**Architecture**:
```
React Frontend (Browser)
    ↓ HTTP/REST
Express Backend (Thin Proxy)
    ↓ Firebase Admin SDK
Firestore
```

**Pros**:
- ✅ Web-based (accessible from anywhere)
- ✅ Easy deployment (deploy once, accessible to all admins)
- ✅ No installation required
- ✅ Secure (Admin SDK credentials stay server-side)
- ✅ Integrates with existing ReCard server infrastructure
- ✅ Simple backend (just proxies, no business logic)
- ✅ Can reuse Server type definitions and constants
- ✅ Matches project context (already have Node.js server)

**Cons**:
- ❌ Technically not "pure frontend only" (requires backend proxy)
- ❌ Requires server hosting (but ReCard already has this)
- ❌ Online-only (requires internet connection)

**When to Use**:
- When you already have backend infrastructure (ReCard does)
- When you want web accessibility
- When simplicity and maintenance are priorities
- **This is the recommended approach for ReCard**

---

### Option 3: Pure Frontend with Firebase Client SDK

**Description**: Build a pure React frontend using Firebase Client SDK with Firestore security rules.

**Architecture**:
```
React Frontend (Browser)
    ↓ Firebase Client SDK
Firestore (with security rules)
```

**Pros**:
- ✅ True frontend-only (no backend at all)
- ✅ Simplest deployment (static hosting)
- ✅ Real-time listeners built-in
- ✅ Automatic offline support

**Cons**:
- ❌ Less secure (security rules can be complex and error-prone)
- ❌ Cannot use Firebase Admin SDK features (batch writes, server timestamps)
- ❌ Security rules must be carefully designed to prevent data leaks
- ❌ Firestore security rules visible to anyone (potential attack vectors)
- ❌ Doesn't match spec's design intent (spec assumes Admin SDK)
- ❌ Limited control over Firestore operations
- ❌ Cannot perform some admin operations (user management, etc.)

**When to Use**:
- For public-facing features (not admin tools)
- When you have no backend infrastructure
- **Not recommended for admin tools like Card Manager**

---

## Recommended Architecture

### **Option 2: Web App + Minimal Backend Proxy**

This is the recommended approach for the following reasons:

1. **Project Context**: ReCard already has a Node.js/Express server (`Server/`)
2. **Security**: Firebase Admin SDK credentials stay server-side
3. **Simplicity**: Backend is just a thin proxy with no business logic
4. **Accessibility**: Web-based tool accessible from anywhere
5. **Maintenance**: Single deployment, no distribution needed
6. **Spec Alignment**: Avoids complex CRUD APIs while maintaining security

### What "Minimal Backend" Means

The backend is **NOT** a traditional API with business logic. It's a **thin proxy layer** that:

- ✅ Accepts HTTP requests from frontend
- ✅ Validates authentication (admin users only)
- ✅ Proxies requests to Firestore via Admin SDK
- ✅ Returns raw Firestore responses
- ❌ NO business logic (date calculations, validations, etc.)
- ❌ NO data transformations (except type conversions)
- ❌ NO complex query building (frontend decides queries)

**Example - What the Backend DOES**:
```typescript
// Simple proxy - just pass data to Firestore
app.post('/card-manager/cards', authenticateAdmin, async (req, res) => {
  await db.collection('credit_cards').doc(req.body.id).set(req.body.data);
  res.json({ success: true });
});
```

**Example - What the Backend DOES NOT DO**:
```typescript
// ❌ NO business logic like this in backend
app.post('/card-manager/cards', async (req, res) => {
  // ❌ NO date calculations
  const components = calculateComponentsForVersion(req.body.version);

  // ❌ NO complex validations
  if (!validateCardData(req.body.data)) { ... }

  // ❌ NO data enrichment
  const enrichedCard = await enrichCardWithComponents(req.body.id);

  // All of the above happens in FRONTEND
});
```

---

## Technology Stack

### Frontend

**Core Framework**:
- **React 18** with TypeScript
- **Vite** for build tooling and dev server
- **React Router** for navigation between views

**UI Components**:
- **Tailwind CSS** for styling (consistent with ReCard client)
- **Radix UI** or **shadcn/ui** for accessible components
- **React Hook Form** for form management
- **Zod** for schema validation

**State Management**:
- **React Context** for global state (selected card, filters)
- **React Query (TanStack Query)** for server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates

**Data Fetching**:
- **Axios** or **fetch** for HTTP requests to backend proxy
- **React Query** hooks for data fetching patterns

**Date Handling**:
- **date-fns** for date calculations and formatting
- Reuse `Server/constants/dates.ts` for sentinel date logic

**Type Safety**:
- Reuse types from `Server/types/credit-card-types.ts`
- Shared type definitions between frontend and backend

---

### Backend (Minimal Proxy Layer)

**Runtime**:
- **Node.js 18+**
- **Express.js** for HTTP server

**Firebase Integration**:
- **Firebase Admin SDK** for Firestore access
- Service account credentials (environment variables)

**Middleware**:
- **CORS** for cross-origin requests (dev only)
- **express-validator** for basic input validation
- **helmet** for security headers

**Authentication**:
- **Firebase Auth** to verify admin tokens
- Custom middleware to check admin claims

**Type Safety**:
- **TypeScript** for all backend code
- Reuse types from `Server/types/`

---

## Firebase Configuration and Setup

### Firebase Project Overview

The Card Manager uses the same Firebase project as the main ReCard application, with the following services:

- **Firestore**: Primary database for all credit card data
- **Firebase Auth**: Authentication for admin users
- **Firebase Admin SDK**: Server-side SDK for privileged operations

### Firebase Admin SDK Setup

#### Installation

```bash
cd Server
npm install firebase-admin
```

#### Configuration File

```typescript
// Server/config/firebase-admin.ts
import admin from 'firebase-admin';

// Check if already initialized (prevents errors in dev with hot reload)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines in private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export { admin };
```

#### Alternative: Service Account JSON File

For local development, you can use a service account JSON file:

```typescript
// Server/config/firebase-admin.ts
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
```

**⚠️ Important**: Add `serviceAccountKey.json` to `.gitignore`

### Service Account Credentials

#### Obtaining Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Project Settings** (gear icon)
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file securely

#### Environment Variables Setup

**Server/.env**:
```bash
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"

# API Configuration
PORT=8000
CORS_ORIGIN=http://localhost:5173
```

**Important Notes**:
- The private key must include `\n` characters for line breaks
- Wrap the entire private key in double quotes
- Never commit `.env` file to version control
- Add `.env` to `.gitignore`

#### Verifying Setup

```typescript
// Server/scripts/verify-firebase.ts
import { db } from './config/firebase-admin';

async function verifyConnection() {
  try {
    // Test read access
    const testDoc = await db.collection('credit_cards').limit(1).get();
    console.log('✅ Firebase Admin SDK connected successfully');
    console.log(`📊 Found ${testDoc.size} documents in credit_cards collection`);
  } catch (error) {
    console.error('❌ Firebase Admin SDK connection failed:', error);
  }
}

verifyConnection();
```

Run with: `npx ts-node Server/scripts/verify-firebase.ts`

---

### Firebase Auth Configuration

#### Admin User Setup

Card Manager requires users to have an **admin custom claim** for access.

**Setting Admin Claims**:

```typescript
// Server/scripts/set-admin-claim.ts
import { auth } from './config/firebase-admin';

async function setAdminClaim(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Admin claim set for user: ${email}`);
  } catch (error) {
    console.error('❌ Error setting admin claim:', error);
  }
}

// Usage
setAdminClaim('admin@yourdomain.com');
```

Run with:
```bash
npx ts-node Server/scripts/set-admin-claim.ts
```

**Verifying Admin Claim**:

```typescript
// Check if user has admin claim
const user = await auth.getUser(uid);
console.log('Custom claims:', user.customClaims);
// Output: { admin: true }
```

#### Frontend Firebase Auth Configuration

**CardManager/.env.local**:
```bash
# Firebase Web SDK Configuration (for frontend auth)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API URL
VITE_API_BASE_URL=http://localhost:8000
```

**Frontend Firebase Initialization**:

```typescript
// CardManager/src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

**Getting ID Token for API Requests**:

```typescript
// CardManager/src/services/api/client.ts
import axios from 'axios';
import { auth } from '@/config/firebase';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
});

// Add Firebase ID token to all requests
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

### Required Firestore Indexes

The Card Manager requires composite indexes for efficient querying of components by `ReferenceCardId` and date fields.

#### Index Definitions

Create these indexes in Firebase Console or via `firestore.indexes.json`:

**firestore.indexes.json**:
```json
{
  "indexes": [
    {
      "collectionGroup": "credit_cards_credits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ReferenceCardId", "order": "ASCENDING" },
        { "fieldPath": "EffectiveFrom", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "credit_cards_credits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ReferenceCardId", "order": "ASCENDING" },
        { "fieldPath": "EffectiveTo", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "credit_cards_perks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ReferenceCardId", "order": "ASCENDING" },
        { "fieldPath": "EffectiveFrom", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "credit_cards_perks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ReferenceCardId", "order": "ASCENDING" },
        { "fieldPath": "EffectiveTo", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "credit_cards_multipliers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ReferenceCardId", "order": "ASCENDING" },
        { "fieldPath": "EffectiveFrom", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "credit_cards_multipliers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ReferenceCardId", "order": "ASCENDING" },
        { "fieldPath": "EffectiveTo", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "credit_cards_history",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ReferenceCardId", "order": "ASCENDING" },
        { "fieldPath": "effectiveFrom", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

#### Deploying Indexes

**Option 1: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes**
4. Click **Create Index** and add each composite index manually

**Option 2: Firebase CLI**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes
```

#### Index Creation Status

After creating indexes, they may take a few minutes to build. Check status:
- Firebase Console → Firestore Database → Indexes
- Status will show "Building" → "Enabled"

**⚠️ Important**: Queries will fail until indexes are fully built

---

### Firestore Security Rules

Since the Card Manager uses Firebase Admin SDK (server-side), Firestore security rules are **bypassed** for backend operations.

However, for defense-in-depth, you should still have security rules:

**firestore.rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Credit cards - public read, admin write
    match /credit_cards/{cardId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Card history - admin only
    match /credit_cards_history/{versionId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Components - admin only (Card Manager uses these)
    match /credit_cards_credits/{creditId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    match /credit_cards_perks/{perkId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    match /credit_cards_multipliers/{multiplierId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // User data - users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Deploy Security Rules**:
```bash
firebase deploy --only firestore:rules
```

**Note**: Admin SDK operations bypass these rules, but they protect against:
- Accidental client SDK usage
- Direct Firestore access from browser console
- Other applications using same Firebase project

---

### Firebase Emulator Suite (Optional for Development)

For local development without touching production data:

#### Setup

```bash
npm install -g firebase-tools
firebase init emulators
```

Select:
- ✅ Firestore
- ✅ Authentication
- ✅ Functions (if using Cloud Functions)

#### Configuration

**firebase.json**:
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

#### Running Emulators

```bash
firebase emulators:start
```

Access:
- Firestore Emulator UI: http://localhost:4000
- Firestore: localhost:8080
- Auth: localhost:9099

#### Connect to Emulators

**Backend**:
```typescript
// Server/config/firebase-admin.ts
import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'demo-project-id', // Use any ID for emulator
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

// Connect to emulator if in development
if (process.env.NODE_ENV === 'development') {
  db.settings({
    host: 'localhost:8080',
    ssl: false
  });
}

export { db };
```

**Frontend**:
```typescript
// CardManager/src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { auth, db };
```

---

### Firebase Best Practices for Card Manager

#### 1. Connection Pooling
- Firebase Admin SDK automatically pools connections
- Reuse `db` instance across all routes
- Don't create new admin instances per request

#### 2. Batch Operations
Use batch writes for multi-document operations:

```typescript
// Creating new version (copy to history + update current)
const batch = db.batch();

const historyRef = db.collection('credit_cards_history').doc(newVersionId);
batch.set(historyRef, historicalVersion);

const currentRef = db.collection('credit_cards').doc(cardId);
batch.update(currentRef, newVersion);

await batch.commit(); // Single round-trip to Firestore
```

#### 3. Error Handling
Always handle Firestore errors:

```typescript
try {
  await db.collection('credit_cards').doc(id).get();
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle permission error
  } else if (error.code === 'not-found') {
    // Handle missing document
  } else {
    // Handle other errors
  }
}
```

#### 4. Query Optimization
- Always use indexes for compound queries
- Limit results when possible (`.limit(100)`)
- Use `where` filters before `orderBy`
- Cache frequently accessed data in frontend

---

## Backend API Layer Specification

### Principles

1. **Thin Proxy**: Backend only translates HTTP requests to Firestore operations
2. **No Business Logic**: All calculations, validations, and transformations happen in frontend
3. **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
4. **Minimal Validation**: Only validate auth and basic input types
5. **Raw Data**: Return Firestore documents as-is (no enrichment)

### API Endpoints

#### Cards

```typescript
// Get all active cards
GET /api/card-manager/cards
Response: CreditCardDetails[]

// Get card by ID
GET /api/card-manager/cards/:id
Response: CreditCardDetails

// Create new card
POST /api/card-manager/cards
Body: CreditCardDetails
Response: { success: true, id: string }

// Update card
PUT /api/card-manager/cards/:id
Body: Partial<CreditCardDetails>
Response: { success: true }

// Delete card
DELETE /api/card-manager/cards/:id
Response: { success: true }
```

#### Card History (Versions)

```typescript
// Get all versions for a card
GET /api/card-manager/cards/:referenceCardId/versions
Response: CreditCardDetails[]

// Get specific version
GET /api/card-manager/history/:versionId
Response: CreditCardDetails

// Create new version (batch operation)
POST /api/card-manager/cards/:id/versions
Body: { currentVersion: CreditCardDetails, newVersion: CreditCardDetails }
Response: { success: true, versionId: string }
```

#### Components (Credits, Perks, Multipliers)

```typescript
// Get all components by card reference ID
GET /api/card-manager/components/:referenceCardId
Query params: ?type=credits|perks|multipliers (optional)
Response: { credits: CardCredit[], perks: CardPerk[], multipliers: CardMultiplier[] }

// Create component
POST /api/card-manager/components/:type
Body: CardCredit | CardPerk | CardMultiplier
Response: { success: true, id: string }

// Update component
PUT /api/card-manager/components/:type/:id
Body: Partial<CardCredit | CardPerk | CardMultiplier>
Response: { success: true }

// Delete component
DELETE /api/card-manager/components/:type/:id
Response: { success: true }
```

### Example Backend Implementation

```typescript
// Server/routes/card-manager.routes.ts
import { Router } from 'express';
import { db } from '../config/firebase-admin';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all cards
router.get('/cards', async (req, res) => {
  try {
    const snapshot = await db.collection('credit_cards').get();
    const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create card
router.post('/cards', async (req, res) => {
  try {
    const cardData = req.body;
    await db.collection('credit_cards').doc(cardData.id).set(cardData);
    res.json({ success: true, id: cardData.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get components for a card
router.get('/components/:referenceCardId', async (req, res) => {
  try {
    const { referenceCardId } = req.params;
    const type = req.query.type;

    if (type) {
      // Get specific component type
      const collectionName = `credit_cards_${type}`;
      const snapshot = await db.collection(collectionName)
        .where('ReferenceCardId', '==', referenceCardId)
        .get();
      const components = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ [type]: components });
    } else {
      // Get all component types
      const [credits, perks, multipliers] = await Promise.all([
        db.collection('credit_cards_credits').where('ReferenceCardId', '==', referenceCardId).get(),
        db.collection('credit_cards_perks').where('ReferenceCardId', '==', referenceCardId).get(),
        db.collection('credit_cards_multipliers').where('ReferenceCardId', '==', referenceCardId).get()
      ]);

      res.json({
        credits: credits.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        perks: perks.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        multipliers: multipliers.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create component
router.post('/components/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const componentData = req.body;
    const collectionName = `credit_cards_${type}`;

    const docRef = db.collection(collectionName).doc(componentData.id || undefined);
    await docRef.set(componentData);

    res.json({ success: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch operation: Create new version
router.post('/cards/:id/versions', async (req, res) => {
  try {
    const { currentVersion, newVersion } = req.body;
    const batch = db.batch();

    // Copy current to history
    const historyRef = db.collection('credit_cards_history').doc();
    batch.set(historyRef, { ...currentVersion, IsActive: false });

    // Update current card
    const currentRef = db.collection('credit_cards').doc(req.params.id);
    batch.set(currentRef, newVersion);

    await batch.commit();

    res.json({ success: true, versionId: historyRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Authentication Middleware

```typescript
// Server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export async function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user has admin claim
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## Frontend Architecture

### Directory Structure

```
CardManager/
├── src/
│   ├── components/
│   │   ├── CardList/
│   │   │   ├── CardList.tsx
│   │   │   ├── CardListItem.tsx
│   │   │   └── CardListFilters.tsx
│   │   ├── CardDetail/
│   │   │   ├── CardDetail.tsx
│   │   │   ├── VersionSidebar.tsx
│   │   │   ├── ComponentList.tsx
│   │   │   └── ComponentQuickView.tsx
│   │   ├── ComponentModal/
│   │   │   ├── ComponentModal.tsx
│   │   │   ├── CreditForm.tsx
│   │   │   ├── PerkForm.tsx
│   │   │   └── MultiplierForm.tsx
│   │   ├── CreateCardFlow/
│   │   │   ├── CreateCardWizard.tsx
│   │   │   ├── Step1BasicInfo.tsx
│   │   │   ├── Step2FinancialInfo.tsx
│   │   │   └── Step3VersionStatus.tsx
│   │   └── common/
│   │       ├── DatePicker.tsx
│   │       ├── SearchInput.tsx
│   │       └── StatusBadge.tsx
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── cardApi.ts           # API calls to backend
│   │   │   ├── componentApi.ts
│   │   │   └── versionApi.ts
│   │   ├── cardService.ts           # Business logic (frontend)
│   │   ├── componentService.ts      # Component association logic
│   │   └── dateService.ts           # Date overlap calculations
│   │
│   ├── hooks/
│   │   ├── useCards.ts              # React Query hooks for cards
│   │   ├── useComponents.ts         # React Query hooks for components
│   │   ├── useVersions.ts           # React Query hooks for versions
│   │   └── useComponentAssociation.ts # Date-based association logic
│   │
│   ├── utils/
│   │   ├── dateOverlap.ts           # Date overlap calculation
│   │   ├── validation.ts            # Form validation with Zod
│   │   └── constants.ts             # Reuse from Server/constants/
│   │
│   ├── types/
│   │   └── index.ts                 # Re-export from Server/types/
│   │
│   ├── pages/
│   │   ├── CardListPage.tsx
│   │   ├── CardDetailPage.tsx
│   │   └── ComponentLibraryPage.tsx
│   │
│   ├── context/
│   │   └── CardManagerContext.tsx   # Global state (filters, selection)
│   │
│   └── App.tsx
│
├── types/                            # Shared types
│   └── types.ts                      # Reuse Server/types/
│
└── implementation_specs/             # Documentation
    ├── design_proposal.md
    ├── DATA_STRUCTURE_AND_RELATIONSHIPS.md
    └── TECHNICAL_IMPLEMENTATION.md
```

### Frontend Business Logic Examples

#### Date Overlap Service (Frontend)

```typescript
// CardManager/src/services/dateService.ts
import { ONGOING_SENTINEL_DATE } from '@/utils/constants';

/**
 * Check if two date ranges overlap
 * This logic runs in the FRONTEND, not backend
 */
export function datesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = new Date(start1);
  const e1 = end1 === ONGOING_SENTINEL_DATE ? new Date(end1) : new Date(end1);
  const s2 = new Date(start2);
  const e2 = end2 === ONGOING_SENTINEL_DATE ? new Date(end2) : new Date(end2);

  return s1 <= e2 && s2 <= e1;
}

/**
 * Get components that apply to a version based on date overlap
 * This is a FRONTEND calculation
 */
export function getComponentsForVersion(
  version: CreditCardDetails,
  allComponents: { credits: CardCredit[], perks: CardPerk[], multipliers: CardMultiplier[] }
): { credits: CardCredit[], perks: CardPerk[], multipliers: CardMultiplier[] } {

  const credits = allComponents.credits.filter(c =>
    c.ReferenceCardId === version.ReferenceCardId &&
    datesOverlap(c.EffectiveFrom, c.EffectiveTo, version.effectiveFrom, version.effectiveTo)
  );

  const perks = allComponents.perks.filter(p =>
    p.ReferenceCardId === version.ReferenceCardId &&
    datesOverlap(p.EffectiveFrom, p.EffectiveTo, version.effectiveFrom, version.effectiveTo)
  );

  const multipliers = allComponents.multipliers.filter(m =>
    m.ReferenceCardId === version.ReferenceCardId &&
    datesOverlap(m.EffectiveFrom, m.EffectiveTo, version.effectiveFrom, version.effectiveTo)
  );

  return { credits, perks, multipliers };
}
```

#### React Query Hooks (Frontend)

```typescript
// CardManager/src/hooks/useVersionComponents.ts
import { useQuery } from '@tanstack/react-query';
import { getComponentsForVersion } from '@/services/dateService';
import { getComponentsByCardId } from '@/services/api/componentApi';

/**
 * Hook to get components for a specific version
 * Fetches all components from backend, filters in frontend
 */
export function useVersionComponents(version: CreditCardDetails | null) {
  const componentsQuery = useQuery({
    queryKey: ['components', version?.ReferenceCardId],
    queryFn: () => getComponentsByCardId(version!.ReferenceCardId),
    enabled: !!version
  });

  // Frontend calculation: filter by date overlap
  const filteredComponents = version && componentsQuery.data
    ? getComponentsForVersion(version, componentsQuery.data)
    : { credits: [], perks: [], multipliers: [] };

  return {
    components: filteredComponents,
    loading: componentsQuery.isLoading,
    error: componentsQuery.error
  };
}
```

---

## Security Implementation

### Backend Security

1. **Firebase Admin SDK Credentials**:
   - Store in environment variables (`.env` file)
   - Never commit to version control
   - Use service account JSON from Firebase Console

2. **Authentication Middleware**:
   - Verify Firebase ID tokens on every request
   - Check for admin custom claims
   - Reject unauthenticated requests

3. **CORS Configuration**:
   - Restrict to specific origins in production
   - Allow all origins in development only

4. **Input Validation**:
   - Basic type checking (string, number, etc.)
   - Required field validation
   - No complex business logic validation (frontend's job)

### Frontend Security

1. **Authentication**:
   - Use Firebase Auth to get ID token
   - Send token in `Authorization: Bearer <token>` header
   - Automatically refresh expired tokens

2. **Admin Access Control**:
   - Check user's admin claim before allowing access
   - Redirect non-admins to main app
   - Show "Unauthorized" message if claim missing

3. **Data Validation**:
   - Validate all form inputs with Zod schemas
   - Prevent invalid data from reaching backend
   - Show clear error messages to users

### Environment Variables

```bash
# Backend .env (CardManager/.env or Server/.env)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Frontend .env (CardManager/.env.local)
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

---

## Development Workflow

### Local Development Setup

1. **Backend Setup**:
   ```bash
   cd Server
   npm install
   # Add Firebase service account credentials to .env
   npm run dev  # Starts on port 8000
   ```

2. **Frontend Setup**:
   ```bash
   cd CardManager
   npm install
   npm run dev  # Starts on port 5174 (or next available)
   ```

3. **Access Card Manager**:
   - Open browser to `http://localhost:5174`
   - Sign in with admin user (Firebase Auth)
   - Backend proxy at `http://localhost:8000/api/card-manager/`

### Development Modes

**Hot Reload**:
- Frontend: Vite provides instant hot module replacement
- Backend: Use `ts-node-dev` for auto-restart on file changes

**Type Safety**:
- Shared types between frontend and backend
- TypeScript compilation errors prevent builds
- Zod schema validation at runtime

**API Testing**:
- Use Postman or Thunder Client for backend testing
- Include Firebase ID token in `Authorization` header
- Test CRUD operations independently

---

## Deployment Strategy

### Deployment Options

#### Option A: Separate Deployment (Recommended for Development)

**Backend**:
- Deploy as part of main ReCard server
- Add `/api/card-manager/*` routes to existing Express app
- No additional hosting cost

**Frontend**:
- Deploy to Vercel, Netlify, or Cloudflare Pages
- Static hosting with environment variables
- Auto-deploy on git push

**Cost**: Free (uses existing infrastructure)

#### Option B: Integrated Deployment (Recommended for Production)

**Single Deployment**:
- Build frontend to static files
- Serve from Express using `express.static`
- Single deployment target

```typescript
// Server/index.ts
import express from 'express';
import path from 'path';

const app = express();

// Serve Card Manager static files
app.use('/card-manager', express.static(path.join(__dirname, '../CardManager/dist')));

// API routes
app.use('/api/card-manager', cardManagerRoutes);

// Fallback to Card Manager index.html for client-side routing
app.get('/card-manager/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../CardManager/dist/index.html'));
});
```

**Cost**: Free (single server deployment)

### Build Process

```bash
# Frontend build
cd CardManager
npm run build  # Output to CardManager/dist/

# Backend build (if using integrated deployment)
cd Server
npm run build  # Output to Server/dist/

# Combined deployment
# Copy CardManager/dist/ to Server/dist/public/card-manager/
```

---

## Code Organization

### Shared Code Between Server and Card Manager

**Type Definitions**:
```typescript
// Server/types/credit-card-types.ts
export interface CreditCardDetails { ... }
export interface CardCredit { ... }
export interface CardPerk { ... }
export interface CardMultiplier { ... }

// CardManager/src/types/index.ts
export * from '../../../Server/types/credit-card-types';
```

**Constants**:
```typescript
// Server/constants/dates.ts
export const ONGOING_SENTINEL_DATE = '9999-12-31';

// CardManager/src/utils/constants.ts
export { ONGOING_SENTINEL_DATE } from '../../../Server/constants/dates';
```

**Utilities**:
```typescript
// Server/utils/date-helpers.ts
export function isOngoingDate(date: string): boolean { ... }

// CardManager can import from Server if needed
// Or duplicate simple utilities to avoid tight coupling
```

### Avoiding Tight Coupling

**Good**:
- Share type definitions (types-only imports)
- Share constants (simple values)
- Backend doesn't import from CardManager
- CardManager doesn't import backend services

**Bad**:
- CardManager importing backend services
- Backend importing CardManager components
- Circular dependencies between projects

---

## Summary

### Architecture Decision: **Web App + Minimal Backend Proxy**

**Backend Role**:
- Thin proxy layer for Firebase Admin SDK
- Authentication and authorization
- No business logic
- Returns raw Firestore data

**Frontend Role**:
- All UI components and views
- All business logic (date calculations, validations, associations)
- Data transformations
- User interactions

**Why This Works**:
- ✅ Secure (Admin SDK credentials stay server-side)
- ✅ Simple (backend is just proxy routes)
- ✅ Maintainable (logic in one place: frontend)
- ✅ Integrates with existing ReCard infrastructure
- ✅ Web-accessible (no installation needed)
- ✅ Matches spec intent (no complex CRUD APIs)

### Key Takeaway

The backend exists **only** to securely access Firebase Admin SDK. It's not a traditional API with business logic—it's a **credential gateway**. All intelligence lives in the frontend.
