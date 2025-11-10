# Card Manager Implementation Plan - LLM Execution Guide

## Document Purpose

This is a **step-by-step implementation guide** for building the Credit Card Manager Dashboard. Follow these steps sequentially to build the complete application.

## Prerequisites

Before starting, familiarize yourself with these documents:

1. **[design_proposal.md](./design_proposal.md)** - Complete UI/UX specifications for all screens
2. **[DATA_STRUCTURE_AND_RELATIONSHIPS.md](./DATA_STRUCTURE_AND_RELATIONSHIPS.md)** - Database schema and query patterns
3. **[NO_ACTIVE_VERSION_FEATURE.md](./NO_ACTIVE_VERSION_FEATURE.md)** - Version management specifications
4. **[../../Server/types/credit-card-types.ts](../../Server/types/credit-card-types.ts)** - Type definitions
5. **[../../Server/constants/dates.ts](../../Server/constants/dates.ts)** - Date constants including ONGOING_SENTINEL_DATE

## Key Architecture Decisions

- **Framework**: React 18.3.1 + Vite + TypeScript (matching existing Client)
- **Routing**: React Router DOM v7
- **Database**: Server admin API endpoints (Server uses Firebase Admin SDK)
- **Styling**: SCSS with variables and mixins (matching Client, NO Tailwind)
- **UI Components**: Radix UI headless components + custom styling
- **State Management**: React Context API
- **Data Pattern**: ReferenceCardId-based queries with date overlap logic
- **Date Sentinel**: Use `"9999-12-31"` for all ongoing effectiveTo dates

---

## Implementation Phases

### Phase 1: Project Setup and Configuration

#### Step 1.1: Initialize Vite + React Project

```bash
# Create new Vite project in CardManager directory
cd /Users/evaneckels/Documents/Projects/ReCard/CardManager
npm create vite@latest card-manager-app -- --template react-ts
cd card-manager-app
```

**Configuration choices:**
- ✅ React
- ✅ TypeScript
- ✅ Vite

#### Step 1.2: Install Dependencies

```bash
# Core dependencies (matching Client stack)
npm install react@^18.3.1 react-dom@^18.3.1
npm install react-router-dom@^7.1.1
npm install axios@^1.9.0

# UI Components (matching Client stack)
npm install @radix-ui/react-alert-dialog@^1.1.14
npm install @radix-ui/react-dialog@^1.1.14
npm install @radix-ui/react-dropdown-menu@^2.1.15
npm install @radix-ui/react-select@^2.2.6
npm install @radix-ui/react-slot@^1.2.3
npm install lucide-react@^0.513.0

# Styling (matching Client stack - SCSS only, no Tailwind)
npm install sass@^1.83.0
npm install clsx@^2.1.1

# Dev dependencies
npm install -D @types/node@^22
npm install -D @types/react@^19.1.2
npm install -D @types/react-dom@^19.1.2
npm install -D typescript@^5.8.3
npm install -D @vitejs/plugin-react@^4.4.1
```

**Packages explained:**
- `react` + `react-dom` - React 18.3.1 (matches Client)
- `react-router-dom` - Client-side routing v7
- `axios` - HTTP client to call Server admin APIs
- `@radix-ui/*` - Headless UI components (same as Client)
- `lucide-react` - Icons (same as Client)
- `sass` - SCSS preprocessor (same as Client)
- `clsx` - Conditional classnames utility

#### Step 1.3: Create Environment Variables

Create `.env`:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
```

**Architecture Note**:
The CardManager follows the same pattern as the Client:
- Frontend: Vite + React + SCSS (browser-based)
- Backend: Server provides admin-only API endpoints
- Communication: axios calls to Server APIs at `/admin/*`
- Firebase Admin SDK stays in the Server (secure)

Create `.env.example` (template for version control):

```bash
# .env.example
VITE_API_BASE_URL=http://localhost:8000
```

Update `.gitignore` (if not already present):

```
# .gitignore
.env
.env.local
node_modules
dist
```

#### Step 1.4: Create Folder Structure

```bash
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/services
mkdir -p src/components/ui
mkdir -p src/components/cards
mkdir -p src/components/versions
mkdir -p src/components/components
mkdir -p src/utils
mkdir -p src/pages
mkdir -p src/contexts
```

**Folder purposes:**
- `src/lib` - Axios config, shared utilities
- `src/types` - TypeScript type definitions (mostly imports from Server)
- `src/services` - API service layer (axios calls to Server)
- `src/components/ui` - Reusable UI components (buttons, dialogs, etc.)
- `src/components/cards` - Card-specific components
- `src/components/versions` - Version management components
- `src/components/components` - Component (perks/credits/multipliers) components
- `src/utils` - Helper functions
- `src/pages` - Page components for React Router
- `src/contexts` - React Context for state management

#### Step 1.5: Configure Vite

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174, // Different port from main Client (5173)
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styling/variables" as *; @use "@/styling/mixins" as *;`,
      },
    },
  },
})
```

#### Step 1.6: Configure TypeScript

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### Step 1.7: Setup SCSS Styling Structure

Create `src/styling` folder:

```bash
mkdir -p src/styling
```

Create `src/styling/variables.scss`:

```scss
// Colors
$primary-blue: #1a73e8;
$primary-blue-hover: #1557b0;
$neutral-white: #ffffff;
$neutral-gray-100: #f5f5f5;
$neutral-gray-200: #e0e0e0;
$neutral-gray-300: #cccccc;
$neutral-gray-600: #757575;
$neutral-gray-800: #424242;
$neutral-black: #000000;

$success-green: #34a853;
$warning-yellow: #fbbc04;
$error-red: #ea4335;

// Spacing
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// Typography
$font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-base: 16px;
$font-size-lg: 18px;
$font-size-xl: 24px;

// Border radius
$border-radius-sm: 4px;
$border-radius-md: 8px;
$border-radius-lg: 12px;

// Shadows
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

Create `src/styling/mixins.scss`:

```scss
// Flexbox utilities
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-column {
  display: flex;
  flex-direction: column;
}

@mixin flex-row {
  display: flex;
  flex-direction: row;
}

// Button base styles
@mixin button-base {
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius-md;
  font-size: $font-size-sm;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Card styles
@mixin card {
  background: $neutral-white;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-md;
  padding: $spacing-lg;
}
```

Create `src/styling/globals.scss`:

```scss
@use './variables' as *;
@use './mixins' as *;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: $font-family-base;
  font-size: $font-size-base;
  color: $neutral-gray-800;
  background-color: $neutral-gray-100;
}

#root {
  height: 100%;
}
```

Update `src/main.tsx` to import global styles:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styling/globals.scss'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Checkpoint**: Verify project structure is created, dependencies are installed, Vite config is correct, and SCSS files are in place.

---

### Phase 2: API Client Configuration

#### Step 2.1: Create Axios Client

**File**: `src/lib/api-client.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Add authentication token when implemented
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);
```

**Reference**: Matches Client axios pattern

#### Step 2.2: Create API Constants

**File**: `src/lib/api-routes.ts`

```typescript
// API route constants for card manager admin endpoints
export const API_ROUTES = {
  // Card routes (will be implemented in Server)
  CARDS: {
    LIST: '/admin/cards',
    DETAILS: (id: string) => `/admin/cards/${id}`,
    CREATE: '/admin/cards',
    UPDATE: (id: string) => `/admin/cards/${id}`,
    DELETE: (id: string) => `/admin/cards/${id}`,
  },
  // Version routes
  VERSIONS: {
    LIST: (referenceCardId: string) => `/admin/cards/${referenceCardId}/versions`,
    CREATE: (referenceCardId: string) => `/admin/cards/${referenceCardId}/versions`,
    ACTIVATE: (referenceCardId: string, versionId: string) =>
      `/admin/cards/${referenceCardId}/versions/${versionId}/activate`,
    DEACTIVATE: (referenceCardId: string) =>
      `/admin/cards/${referenceCardId}/deactivate`,
  },
  // Component routes
  COMPONENTS: {
    LIST: (referenceCardId: string) => `/admin/cards/${referenceCardId}/components`,
    CREATE: (type: string) => `/admin/components/${type}`,
    UPDATE: (type: string, id: string) => `/admin/components/${type}/${id}`,
    DELETE: (type: string, id: string) => `/admin/components/${type}/${id}`,
  },
} as const;
```

**Checkpoint**: Verify axios client is configured and can make requests to Server.

---

### Phase 3: Type System Setup

#### Step 3.1: Import Server Types

**File**: `src/types/index.ts`

```typescript
// Re-export types from Server
export type {
  CreditCard,
  CreditCardDetails,
  CreditCardDetailsEnhanced,
  CardCredit,
  CardPerk,
  CardMultiplier
} from '../../../Server/types/credit-card-types';

// Re-export constants
export { ONGOING_SENTINEL_DATE } from '../../../Server/constants/dates';
export { isOngoingDate, normalizeEffectiveTo, denormalizeEffectiveTo } from '../../../Server/constants/dates';
```

**Reference**: [design_proposal.md - Shared Code with Server](./design_proposal.md#architecture-direct-firestore-access)

#### Step 3.2: Create UI-Specific Types

**File**: `src/types/ui-types.ts`

```typescript
import { CreditCardDetails, CardCredit, CardPerk, CardMultiplier } from './index';

/**
 * Component type discriminator
 */
export type ComponentType = 'credits' | 'perks' | 'multipliers';

/**
 * Union of all component types
 */
export type CardComponent = CardCredit | CardPerk | CardMultiplier;

/**
 * Card with status for list view
 */
export interface CardWithStatus extends CreditCardDetails {
  status: 'active' | 'inactive' | 'no_active_version';
  source: 'credit_cards' | 'credit_cards_history';
}

/**
 * Version summary for version list
 */
export interface VersionSummary {
  id: string;
  VersionName: string;
  effectiveFrom: string;
  effectiveTo: string;
  IsActive: boolean;
  lastUpdated: string;
  componentCounts: {
    credits: number;
    perks: number;
    multipliers: number;
  };
}

/**
 * Component with version associations
 */
export interface ComponentWithVersions {
  component: CardComponent;
  appliesTo: VersionSummary[];
}

/**
 * Form data for creating/editing cards
 */
export interface CardFormData {
  CardName: string;
  CardIssuer: string;
  CardNetwork: string;
  CardDetails: string;
  CardImage?: string;
  CardPrimaryColor?: string;
  CardSecondaryColor?: string;
  AnnualFee: number | null;
  ForeignExchangeFee: string;
  ForeignExchangeFeePercentage: number | null;
  RewardsCurrency: string;
  PointsPerDollar: number | null;
  VersionName: string;
  effectiveFrom: string;
  effectiveTo: string;
}

/**
 * Form data for creating/editing components
 */
export interface ComponentFormData {
  ReferenceCardId: string;
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;
  EffectiveTo: string;
  // Component-specific fields
  Value?: string;        // Credits only
  TimePeriod?: string;   // Credits only
  Multiplier?: number;   // Multipliers only
  Name?: string;         // Multipliers only
}
```

**Reference**: [design_proposal.md - Data Structure](./design_proposal.md#data-structure)

**Checkpoint**: Verify all types are properly imported and no TypeScript errors.

---

### Phase 4: Database Service Layer

#### Step 4.1: Create Card Service

**File**: `src/services/card.service.ts`

```typescript
import { db } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/collections';
import { CreditCardDetails, ONGOING_SENTINEL_DATE } from '@/types';
import { CardWithStatus, VersionSummary } from '@/types/ui-types';

export class CardService {
  /**
   * Get all cards with their status
   * Combines cards from credit_cards and credit_cards_history
   */
  static async getAllCardsWithStatus(): Promise<CardWithStatus[]> {
    const cards = new Map<string, CardWithStatus>();

    // 1. Get all active cards from credit_cards collection
    const activeSnapshot = await db.collection(COLLECTIONS.CREDIT_CARDS).get();

    activeSnapshot.forEach(doc => {
      const data = doc.data() as CreditCardDetails;
      cards.set(doc.id, {
        ...data,
        status: data.IsActive ? 'active' : 'inactive',
        source: 'credit_cards'
      });
    });

    // 2. Get all unique ReferenceCardIds from history
    const historySnapshot = await db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY).get();
    const historyReferenceIds = new Set<string>();

    historySnapshot.forEach(doc => {
      historyReferenceIds.add(doc.data().ReferenceCardId);
    });

    // 3. Find cards that exist ONLY in history (no active version)
    for (const refId of historyReferenceIds) {
      if (!cards.has(refId)) {
        const mostRecentQuery = await db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY)
          .where('ReferenceCardId', '==', refId)
          .orderBy('effectiveFrom', 'desc')
          .limit(1)
          .get();

        if (!mostRecentQuery.empty) {
          const data = mostRecentQuery.docs[0].data() as CreditCardDetails;
          cards.set(refId, {
            ...data,
            status: 'no_active_version',
            source: 'credit_cards_history'
          });
        }
      }
    }

    return Array.from(cards.values());
  }

  /**
   * Get a card by ID from either active or history collection
   */
  static async getCardById(cardId: string): Promise<CreditCardDetails | null> {
    // Try active collection first
    const activeDoc = await db.collection(COLLECTIONS.CREDIT_CARDS).doc(cardId).get();

    if (activeDoc.exists) {
      return { id: activeDoc.id, ...activeDoc.data() } as CreditCardDetails;
    }

    // Try history collection
    const historyDoc = await db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY).doc(cardId).get();

    if (historyDoc.exists) {
      return { id: historyDoc.id, ...historyDoc.data() } as CreditCardDetails;
    }

    return null;
  }

  /**
   * Get all versions for a card by ReferenceCardId
   */
  static async getVersionsByReferenceCardId(referenceCardId: string): Promise<VersionSummary[]> {
    const versions: VersionSummary[] = [];

    // Get active version from credit_cards
    const activeDoc = await db.collection(COLLECTIONS.CREDIT_CARDS).doc(referenceCardId).get();

    if (activeDoc.exists) {
      const data = activeDoc.data() as CreditCardDetails;

      // Get component counts
      const counts = await this.getComponentCountsForCard(referenceCardId, data.effectiveFrom, data.effectiveTo);

      versions.push({
        id: activeDoc.id,
        VersionName: data.VersionName,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        IsActive: data.IsActive,
        lastUpdated: data.lastUpdated,
        componentCounts: counts
      });
    }

    // Get all versions from history
    const historySnapshot = await db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY)
      .where('ReferenceCardId', '==', referenceCardId)
      .orderBy('effectiveFrom', 'desc')
      .get();

    for (const doc of historySnapshot.docs) {
      const data = doc.data() as CreditCardDetails;
      const counts = await this.getComponentCountsForCard(referenceCardId, data.effectiveFrom, data.effectiveTo);

      versions.push({
        id: doc.id,
        VersionName: data.VersionName,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        IsActive: false, // History versions are never active
        lastUpdated: data.lastUpdated,
        componentCounts: counts
      });
    }

    return versions;
  }

  /**
   * Create a new card
   */
  static async createCard(
    cardData: CreditCardDetails,
    setAsActive: boolean
  ): Promise<string> {
    const batch = db.batch();

    // Ensure effectiveTo uses sentinel value if empty
    const normalizedData = {
      ...cardData,
      effectiveTo: cardData.effectiveTo || ONGOING_SENTINEL_DATE,
      IsActive: setAsActive,
      lastUpdated: new Date().toISOString()
    };

    if (setAsActive) {
      // Add to credit_cards (active collection)
      const activeRef = db.collection(COLLECTIONS.CREDIT_CARDS).doc(cardData.ReferenceCardId);
      batch.set(activeRef, normalizedData);
    }

    // Always add to history
    const historyRef = db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY).doc();
    batch.set(historyRef, normalizedData);

    await batch.commit();

    return cardData.ReferenceCardId;
  }

  /**
   * Create a new version of an existing card
   */
  static async createNewVersion(
    referenceCardId: string,
    newVersionData: CreditCardDetails
  ): Promise<void> {
    const batch = db.batch();

    // 1. Get current active version
    const currentDoc = await db.collection(COLLECTIONS.CREDIT_CARDS).doc(referenceCardId).get();

    if (currentDoc.exists) {
      // 2. Copy current to history with effectiveTo date
      const currentData = currentDoc.data() as CreditCardDetails;
      const historyRef = db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY).doc();

      batch.set(historyRef, {
        ...currentData,
        IsActive: false,
        effectiveTo: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }

    // 3. Set new version as active
    const activeRef = db.collection(COLLECTIONS.CREDIT_CARDS).doc(referenceCardId);
    batch.set(activeRef, {
      ...newVersionData,
      effectiveTo: newVersionData.effectiveTo || ONGOING_SENTINEL_DATE,
      IsActive: true,
      lastUpdated: new Date().toISOString()
    });

    await batch.commit();
  }

  /**
   * Deactivate a card version (remove from credit_cards)
   */
  static async deactivateVersion(
    referenceCardId: string,
    options: {
      effectiveTo?: string;
      reason?: string;
      preserveInHistory?: boolean;
    }
  ): Promise<void> {
    const batch = db.batch();

    // Get active version
    const activeDoc = await db.collection(COLLECTIONS.CREDIT_CARDS).doc(referenceCardId).get();

    if (!activeDoc.exists) {
      throw new Error('No active version found to deactivate');
    }

    const activeData = activeDoc.data() as CreditCardDetails;

    // Preserve in history if requested
    if (options.preserveInHistory !== false) {
      const historyRef = db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY).doc();
      batch.set(historyRef, {
        ...activeData,
        IsActive: false,
        effectiveTo: options.effectiveTo || activeData.effectiveTo || ONGOING_SENTINEL_DATE,
        lastUpdated: new Date().toISOString(),
        deactivationReason: options.reason
      });
    }

    // Delete from credit_cards
    batch.delete(db.collection(COLLECTIONS.CREDIT_CARDS).doc(referenceCardId));

    await batch.commit();
  }

  /**
   * Activate a version from history
   */
  static async activateVersion(
    versionId: string,
    options: {
      newEffectiveFrom?: string;
      clearEffectiveTo?: boolean;
      archiveCurrent?: boolean;
    }
  ): Promise<void> {
    const batch = db.batch();

    // Get version from history
    const versionDoc = await db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY).doc(versionId).get();

    if (!versionDoc.exists) {
      throw new Error('Version not found in history');
    }

    const versionData = versionDoc.data() as CreditCardDetails;
    const refId = versionData.ReferenceCardId;

    // Check for current active version
    const currentActive = await db.collection(COLLECTIONS.CREDIT_CARDS).doc(refId).get();

    if (currentActive.exists && options.archiveCurrent) {
      // Move current to history
      const historyRef = db.collection(COLLECTIONS.CREDIT_CARDS_HISTORY).doc();
      batch.set(historyRef, {
        ...currentActive.data(),
        IsActive: false,
        effectiveTo: new Date().toISOString()
      });
    }

    // Activate new version
    const activeRef = db.collection(COLLECTIONS.CREDIT_CARDS).doc(refId);
    batch.set(activeRef, {
      ...versionData,
      IsActive: true,
      effectiveFrom: options.newEffectiveFrom || versionData.effectiveFrom,
      effectiveTo: options.clearEffectiveTo ? ONGOING_SENTINEL_DATE : versionData.effectiveTo,
      lastUpdated: new Date().toISOString()
    });

    await batch.commit();
  }

  /**
   * Get component counts for a card version by date overlap
   */
  private static async getComponentCountsForCard(
    referenceCardId: string,
    effectiveFrom: string,
    effectiveTo: string
  ): Promise<{ credits: number; perks: number; multipliers: number }> {
    const [creditsSnapshot, perksSnapshot, multipliersSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.CREDIT_CARDS_CREDITS)
        .where('ReferenceCardId', '==', referenceCardId)
        .get(),
      db.collection(COLLECTIONS.CREDIT_CARDS_PERKS)
        .where('ReferenceCardId', '==', referenceCardId)
        .get(),
      db.collection(COLLECTIONS.CREDIT_CARDS_MULTIPLIERS)
        .where('ReferenceCardId', '==', referenceCardId)
        .get()
    ]);

    // Filter by date overlap
    const creditsCount = creditsSnapshot.docs.filter(doc =>
      this.datesOverlap(effectiveFrom, effectiveTo, doc.data().EffectiveFrom, doc.data().EffectiveTo)
    ).length;

    const perksCount = perksSnapshot.docs.filter(doc =>
      this.datesOverlap(effectiveFrom, effectiveTo, doc.data().EffectiveFrom, doc.data().EffectiveTo)
    ).length;

    const multipliersCount = multipliersSnapshot.docs.filter(doc =>
      this.datesOverlap(effectiveFrom, effectiveTo, doc.data().EffectiveFrom, doc.data().EffectiveTo)
    ).length;

    return {
      credits: creditsCount,
      perks: perksCount,
      multipliers: multipliersCount
    };
  }

  /**
   * Check if two date ranges overlap
   */
  private static datesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const s1 = new Date(start1);
    const e1 = new Date(end1 || ONGOING_SENTINEL_DATE);
    const s2 = new Date(start2);
    const e2 = new Date(end2 || ONGOING_SENTINEL_DATE);

    return s1 <= e2 && s2 <= e1;
  }
}
```

**Reference**:
- [design_proposal.md - Service Layer](./design_proposal.md#service-layer)
- [NO_ACTIVE_VERSION_FEATURE.md - Service Layer](./NO_ACTIVE_VERSION_FEATURE.md#service-layer---new-methods)

#### Step 4.2: Create Component Service

**File**: `src/services/component.service.ts`

```typescript
import { db } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/collections';
import { CardCredit, CardPerk, CardMultiplier, ONGOING_SENTINEL_DATE } from '@/types';
import { ComponentType, CardComponent, VersionSummary } from '@/types/ui-types';

export class ComponentService {
  /**
   * Get all components for a card by ReferenceCardId
   */
  static async getAllComponentsByCardId(referenceCardId: string): Promise<{
    credits: CardCredit[];
    perks: CardPerk[];
    multipliers: CardMultiplier[];
  }> {
    const [creditsSnapshot, perksSnapshot, multipliersSnapshot] = await Promise.all([
      db.collection(COLLECTIONS.CREDIT_CARDS_CREDITS)
        .where('ReferenceCardId', '==', referenceCardId)
        .orderBy('EffectiveFrom', 'desc')
        .get(),
      db.collection(COLLECTIONS.CREDIT_CARDS_PERKS)
        .where('ReferenceCardId', '==', referenceCardId)
        .orderBy('EffectiveFrom', 'desc')
        .get(),
      db.collection(COLLECTIONS.CREDIT_CARDS_MULTIPLIERS)
        .where('ReferenceCardId', '==', referenceCardId)
        .orderBy('EffectiveFrom', 'desc')
        .get()
    ]);

    return {
      credits: creditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CardCredit)),
      perks: perksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CardPerk)),
      multipliers: multipliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CardMultiplier))
    };
  }

  /**
   * Get components for a specific version by date overlap
   */
  static async getComponentsForVersion(
    referenceCardId: string,
    effectiveFrom: string,
    effectiveTo: string
  ): Promise<{
    credits: CardCredit[];
    perks: CardPerk[];
    multipliers: CardMultiplier[];
  }> {
    const allComponents = await this.getAllComponentsByCardId(referenceCardId);

    // Filter by date overlap
    const credits = allComponents.credits.filter(c =>
      this.datesOverlap(effectiveFrom, effectiveTo, c.EffectiveFrom, c.EffectiveTo)
    );

    const perks = allComponents.perks.filter(p =>
      this.datesOverlap(effectiveFrom, effectiveTo, p.EffectiveFrom, p.EffectiveTo)
    );

    const multipliers = allComponents.multipliers.filter(m =>
      this.datesOverlap(effectiveFrom, effectiveTo, m.EffectiveFrom, m.EffectiveTo)
    );

    return { credits, perks, multipliers };
  }

  /**
   * Create or update a component
   */
  static async saveComponent(
    componentData: CardComponent,
    componentType: ComponentType
  ): Promise<string> {
    const collectionName = this.getCollectionName(componentType);
    const componentId = componentData.id || db.collection(collectionName).doc().id;

    // Ensure EffectiveTo uses sentinel value if empty
    const normalizedData = {
      ...componentData,
      id: componentId,
      EffectiveTo: componentData.EffectiveTo || ONGOING_SENTINEL_DATE,
      LastUpdated: new Date().toISOString()
    };

    await db.collection(collectionName).doc(componentId).set(normalizedData);

    return componentId;
  }

  /**
   * Delete a component
   */
  static async deleteComponent(
    componentId: string,
    componentType: ComponentType
  ): Promise<void> {
    const collectionName = this.getCollectionName(componentType);
    await db.collection(collectionName).doc(componentId).delete();
  }

  /**
   * Get a single component by ID
   */
  static async getComponentById(
    componentId: string,
    componentType: ComponentType
  ): Promise<CardComponent | null> {
    const collectionName = this.getCollectionName(componentType);
    const doc = await db.collection(collectionName).doc(componentId).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as CardComponent;
  }

  /**
   * Get all versions that a component applies to
   */
  static async getVersionsForComponent(
    component: CardComponent,
    allVersions: VersionSummary[]
  ): VersionSummary[] {
    return allVersions.filter(version =>
      this.datesOverlap(
        component.EffectiveFrom,
        component.EffectiveTo,
        version.effectiveFrom,
        version.effectiveTo
      )
    );
  }

  /**
   * Get collection name from component type
   */
  private static getCollectionName(type: ComponentType): string {
    switch (type) {
      case 'credits':
        return COLLECTIONS.CREDIT_CARDS_CREDITS;
      case 'perks':
        return COLLECTIONS.CREDIT_CARDS_PERKS;
      case 'multipliers':
        return COLLECTIONS.CREDIT_CARDS_MULTIPLIERS;
    }
  }

  /**
   * Check if two date ranges overlap
   */
  private static datesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const s1 = new Date(start1);
    const e1 = new Date(end1 || ONGOING_SENTINEL_DATE);
    const s2 = new Date(start2);
    const e2 = new Date(end2 || ONGOING_SENTINEL_DATE);

    return s1 <= e2 && s2 <= e1;
  }
}
```

**Reference**: [design_proposal.md - Service Layer](./design_proposal.md#service-layer)

**Checkpoint**: Test services by creating a test script that:
1. Fetches all cards
2. Gets versions for a specific card
3. Fetches components for a card

---

### Phase 5: UI Foundation Components

#### Step 5.1: Install and Configure shadcn/ui

```bash
npx shadcn-ui@latest init
```

Configuration:
- Style: Default
- Base color: Slate
- Global CSS: src/app/globals.css
- CSS variables: Yes
- Tailwind config: tailwind.config.ts
- Import alias: @/components

Install required components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
```

#### Step 5.2: Create Utility Functions

**File**: `src/utils/date-utils.ts`

```typescript
import { format, parseISO } from 'date-fns';
import { ONGOING_SENTINEL_DATE, isOngoingDate } from '@/types';

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  if (isOngoingDate(dateString)) {
    return 'Ongoing';
  }

  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(from: string, to: string): string {
  const fromFormatted = formatDate(from);
  const toFormatted = formatDate(to);

  if (toFormatted === 'Ongoing') {
    return `${fromFormatted} - Present`;
  }

  return `${fromFormatted} - ${toFormatted}`;
}

/**
 * Get current date in ISO format
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}
```

**File**: `src/utils/cn.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Checkpoint**: Verify shadcn/ui components are installed and utilities work correctly.

---

### Phase 6: Screen 1 - Card List View

#### Step 6.1: Create Card List Page

**File**: `src/app/cards/page.tsx`

```typescript
import { CardService } from '@/services/card.service';
import { CardList } from '@/components/cards/card-list';

export default async function CardsPage() {
  const cards = await CardService.getAllCardsWithStatus();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Credit Cards</h1>
      </div>
      <CardList cards={cards} />
    </div>
  );
}
```

**Reference**: [design_proposal.md - Screen 1: Card List View](./design_proposal.md#screen-1-card-list-view)

#### Step 6.2: Create Card List Component

**File**: `src/components/cards/card-list.tsx`

```typescript
'use client';

import { useState, useMemo } from 'react';
import { CardWithStatus } from '@/types/ui-types';
import { CardListItem } from './card-list-item';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';

interface CardListProps {
  cards: CardWithStatus[];
}

export function CardList({ cards }: CardListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        card.CardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.CardIssuer.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && card.status === 'active') ||
        (statusFilter === 'inactive' && card.status === 'no_active_version');

      return matchesSearch && matchesStatus;
    });
  }, [cards, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cards</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">No Active Version</SelectItem>
          </SelectContent>
        </Select>

        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Card
        </Button>
      </div>

      {/* Card List */}
      <div className="space-y-2">
        {filteredCards.map(card => (
          <CardListItem key={card.id} card={card} />
        ))}

        {filteredCards.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No cards found matching your filters
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500">
        Showing {filteredCards.length} of {cards.length} cards
      </div>
    </div>
  );
}
```

#### Step 6.3: Create Card List Item Component

**File**: `src/components/cards/card-list-item.tsx`

```typescript
'use client';

import Link from 'next/link';
import { CardWithStatus } from '@/types/ui-types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/utils/date-utils';

interface CardListItemProps {
  card: CardWithStatus;
}

export function CardListItem({ card }: CardListItemProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    no_active_version: 'bg-yellow-100 text-yellow-800'
  };

  const statusLabels = {
    active: 'Active',
    inactive: 'Inactive',
    no_active_version: 'No Active Version'
  };

  return (
    <Link href={`/cards/${card.ReferenceCardId}`}>
      <Card className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {card.CardImage && (
              <img
                src={card.CardImage}
                alt={card.CardName}
                className="w-16 h-10 object-cover rounded"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{card.CardName}</h3>
                <Badge className={statusColors[card.status]}>
                  {statusLabels[card.status]}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{card.CardIssuer}</p>
            </div>
          </div>

          <div className="text-right text-sm text-gray-500">
            <div>Version: {card.VersionName}</div>
            <div>Updated: {formatDate(card.lastUpdated)}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

**Reference**: [design_proposal.md - Screen 1: Card List View](./design_proposal.md#screen-1-card-list-view)

**Checkpoint**: Navigate to `/cards` and verify:
1. Card list displays all cards
2. Search filter works
3. Status filter works
4. Clicking a card navigates to detail page

---

### Phase 7: Screen 2 - Card Detail View

#### Step 7.1: Create Card Detail Page

**File**: `src/app/cards/[cardId]/page.tsx`

```typescript
import { notFound } from 'next/navigation';
import { CardService } from '@/services/card.service';
import { ComponentService } from '@/services/component.service';
import { CardDetailView } from '@/components/cards/card-detail-view';

interface CardDetailPageProps {
  params: {
    cardId: string;
  };
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const card = await CardService.getCardById(params.cardId);

  if (!card) {
    notFound();
  }

  const versions = await CardService.getVersionsByReferenceCardId(card.ReferenceCardId);
  const components = await ComponentService.getAllComponentsByCardId(card.ReferenceCardId);

  return (
    <CardDetailView
      card={card}
      versions={versions}
      components={components}
    />
  );
}
```

**Reference**: [design_proposal.md - Screen 2: Card Detail View](./design_proposal.md#screen-2-card-detail-view)

#### Step 7.2: Create Card Detail View Component

**File**: `src/components/cards/card-detail-view.tsx`

```typescript
'use client';

import { useState } from 'react';
import { CreditCardDetails, CardCredit, CardPerk, CardMultiplier } from '@/types';
import { VersionSummary } from '@/types/ui-types';
import { VersionSidebar } from '@/components/versions/version-sidebar';
import { VersionHeader } from '@/components/versions/version-header';
import { ComponentTabs } from '@/components/components/component-tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface CardDetailViewProps {
  card: CreditCardDetails;
  versions: VersionSummary[];
  components: {
    credits: CardCredit[];
    perks: CardPerk[];
    multipliers: CardMultiplier[];
  };
}

export function CardDetailView({ card, versions, components }: CardDetailViewProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(card.id);

  // Find selected version
  const selectedVersion = versions.find(v => v.id === selectedVersionId) || versions[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/cards">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cards
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{card.CardName}</h1>
            <p className="text-gray-600">{card.CardIssuer}</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar - Versions */}
        <VersionSidebar
          versions={versions}
          selectedVersionId={selectedVersionId}
          onSelectVersion={setSelectedVersionId}
        />

        {/* Main Content */}
        <div className="flex-1 p-6">
          <VersionHeader version={selectedVersion} card={card} />

          <div className="mt-6">
            <ComponentTabs
              version={selectedVersion}
              allComponents={components}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Step 7.3: Create Version Sidebar Component

**File**: `src/components/versions/version-sidebar.tsx`

```typescript
'use client';

import { VersionSummary } from '@/types/ui-types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateRange } from '@/utils/date-utils';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface VersionSidebarProps {
  versions: VersionSummary[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
}

export function VersionSidebar({ versions, selectedVersionId, onSelectVersion }: VersionSidebarProps) {
  const hasActiveVersion = versions.some(v => v.IsActive);

  return (
    <div className="w-80 bg-white border-r p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Versions</h2>
        {!hasActiveVersion && (
          <Badge variant="outline" className="bg-yellow-50">
            No Active Version
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {versions.map(version => (
          <Card
            key={version.id}
            className={cn(
              'p-3 cursor-pointer hover:bg-gray-50 transition-colors',
              selectedVersionId === version.id && 'ring-2 ring-blue-500'
            )}
            onClick={() => onSelectVersion(version.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{version.VersionName}</span>
                  {version.IsActive && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDateRange(version.effectiveFrom, version.effectiveTo)}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {version.componentCounts.credits} credits, {version.componentCounts.perks} perks, {version.componentCounts.multipliers} multipliers
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### Step 7.4: Create Version Header Component

**File**: `src/components/versions/version-header.tsx`

```typescript
'use client';

import { CreditCardDetails } from '@/types';
import { VersionSummary } from '@/types/ui-types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/date-utils';
import { Edit, Copy, Power, Trash2 } from 'lucide-react';

interface VersionHeaderProps {
  version: VersionSummary;
  card: CreditCardDetails;
}

export function VersionHeader({ version, card }: VersionHeaderProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">{version.VersionName}</h2>
            {version.IsActive ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge variant="outline">Historical</Badge>
            )}
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <div>Version ID: <span className="font-mono">{version.id}</span></div>
            <div>Effective: {formatDate(version.effectiveFrom)} - {formatDate(version.effectiveTo)}</div>
            <div>Last updated: {formatDate(version.lastUpdated)}</div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Annual Fee</div>
              <div className="font-semibold">${card.AnnualFee || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Rewards</div>
              <div className="font-semibold">{card.PointsPerDollar}x {card.RewardsCurrency}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">FX Fee</div>
              <div className="font-semibold">{card.ForeignExchangeFeePercentage}%</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          {version.IsActive ? (
            <Button variant="outline" size="sm">
              <Power className="h-4 w-4 mr-2" />
              Deactivate
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <Power className="h-4 w-4 mr-2" />
              Set as Active
            </Button>
          )}
          {!version.IsActive && (
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
```

#### Step 7.5: Create Component Tabs Component

**File**: `src/components/components/component-tabs.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import { CardCredit, CardPerk, CardMultiplier } from '@/types';
import { VersionSummary } from '@/types/ui-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComponentList } from './component-list';
import { ComponentService } from '@/services/component.service';

interface ComponentTabsProps {
  version: VersionSummary;
  allComponents: {
    credits: CardCredit[];
    perks: CardPerk[];
    multipliers: CardMultiplier[];
  };
}

export function ComponentTabs({ version, allComponents }: ComponentTabsProps) {
  // Filter components by date overlap with version
  const versionComponents = useMemo(() => {
    const datesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      const s1 = new Date(start1);
      const e1 = new Date(end1 || '9999-12-31');
      const s2 = new Date(start2);
      const e2 = new Date(end2 || '9999-12-31');
      return s1 <= e2 && s2 <= e1;
    };

    return {
      credits: allComponents.credits.filter(c =>
        datesOverlap(version.effectiveFrom, version.effectiveTo, c.EffectiveFrom, c.EffectiveTo)
      ),
      perks: allComponents.perks.filter(p =>
        datesOverlap(version.effectiveFrom, version.effectiveTo, p.EffectiveFrom, p.EffectiveTo)
      ),
      multipliers: allComponents.multipliers.filter(m =>
        datesOverlap(version.effectiveFrom, version.effectiveTo, m.EffectiveFrom, m.EffectiveTo)
      )
    };
  }, [version, allComponents]);

  return (
    <Tabs defaultValue="credits">
      <TabsList>
        <TabsTrigger value="credits">
          Credits ({versionComponents.credits.length})
        </TabsTrigger>
        <TabsTrigger value="perks">
          Perks ({versionComponents.perks.length})
        </TabsTrigger>
        <TabsTrigger value="multipliers">
          Multipliers ({versionComponents.multipliers.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="credits">
        <ComponentList
          components={versionComponents.credits}
          componentType="credits"
        />
      </TabsContent>

      <TabsContent value="perks">
        <ComponentList
          components={versionComponents.perks}
          componentType="perks"
        />
      </TabsContent>

      <TabsContent value="multipliers">
        <ComponentList
          components={versionComponents.multipliers}
          componentType="multipliers"
        />
      </TabsContent>
    </Tabs>
  );
}
```

#### Step 7.6: Create Component List Component

**File**: `src/components/components/component-list.tsx`

```typescript
'use client';

import { CardComponent, ComponentType } from '@/types/ui-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateRange } from '@/utils/date-utils';
import { Edit, Trash2, Plus } from 'lucide-react';

interface ComponentListProps {
  components: CardComponent[];
  componentType: ComponentType;
}

export function ComponentList({ components, componentType }: ComponentListProps) {
  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">
          {componentType === 'credits' && 'Card Credits'}
          {componentType === 'perks' && 'Card Perks'}
          {componentType === 'multipliers' && 'Rewards Multipliers'}
        </h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add {componentType === 'credits' ? 'Credit' : componentType === 'perks' ? 'Perk' : 'Multiplier'}
        </Button>
      </div>

      {components.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No {componentType} for this version
        </Card>
      ) : (
        <div className="space-y-2">
          {components.map(component => (
            <Card key={component.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{component.Title || (component as any).Name}</h4>
                    <Badge variant="outline">{component.Category}</Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{component.Description}</p>

                  {componentType === 'credits' && (
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Value:</span>{' '}
                        <span className="font-medium">{(component as any).Value}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Period:</span>{' '}
                        <span className="font-medium">{(component as any).TimePeriod}</span>
                      </div>
                    </div>
                  )}

                  {componentType === 'multipliers' && (
                    <div className="text-sm">
                      <span className="text-gray-500">Multiplier:</span>{' '}
                      <span className="font-medium">{(component as any).Multiplier}x</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Active: {formatDateRange(component.EffectiveFrom, component.EffectiveTo)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Reference**: [design_proposal.md - Screen 2: Card Detail View](./design_proposal.md#screen-2-card-detail-view)

**Checkpoint**: Navigate to a card detail page and verify:
1. Version sidebar displays all versions
2. Selecting a version updates the main view
3. Component tabs show correct filtered components
4. Version header displays correct information
5. Active version is marked with badge

---

## Summary

This implementation plan provides a comprehensive, step-by-step guide for building the Card Manager application. The plan is structured to be executed sequentially by an LLM or developer.

### Completed Phases
- ✅ Phase 1: Project Setup
- ✅ Phase 2: Firebase Configuration
- ✅ Phase 3: Type System
- ✅ Phase 4: Database Services
- ✅ Phase 5: UI Foundation
- ✅ Phase 6: Card List View
- ✅ Phase 7: Card Detail View (Partial)

### Remaining Phases
The following phases need to be added:

- **Phase 8**: Component Modals (Create/Edit/Delete)
- **Phase 9**: Create New Card Flow
- **Phase 10**: Version Management Operations
- **Phase 11**: Component Library View
- **Phase 12**: Date-Based Association Logic
- **Phase 13**: Server Actions for Mutations
- **Phase 14**: Error Handling and Validation
- **Phase 15**: Testing and Deployment

### Next Steps

Continue building from Phase 8 onward, following the same pattern:
1. Create page/route
2. Create client components
3. Implement mutations via Server Actions
4. Add validation and error handling
5. Test functionality
6. Add checkpoints

Each phase should reference the appropriate sections in:
- `design_proposal.md`
- `DATA_STRUCTURE_AND_RELATIONSHIPS.md`
- `NO_ACTIVE_VERSION_FEATURE.md`

### Key Principles to Maintain

1. **Direct Firestore Access**: Use Firebase Admin SDK directly
2. **Sentinel Values**: Always use `"9999-12-31"` for ongoing dates
3. **No Pointer Arrays**: Components link to cards via `ReferenceCardId`
4. **Date Overlap Logic**: Filter components by date overlap with versions
5. **Atomic Operations**: Use batch writes for multi-document updates
6. **Type Safety**: Import and use Server types consistently
