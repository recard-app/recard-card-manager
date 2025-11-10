# No Active Version Feature - Design Addendum

## Overview

This document extends the refined design to support cards with **no active version**. This allows cards to exist only in `credit_cards_history` without being present in the `credit_cards` collection.

---

## Use Cases

### 1. Work in Progress Cards
- Card is being configured and tested
- Not ready for production/users to see
- All versions exist in history only

### 2. Discontinued Cards
- Card is no longer offered by issuer
- Historical data preserved
- Removed from active rotation

### 3. Seasonal/Temporary Removal
- Card temporarily unavailable
- Can be reactivated later

---

## Data Structure Changes

### Updated Key Concepts

**Active Version (Updated Definition):**
- A card has an active version if:
  - `IsActive: true` AND
  - Document exists in `credit_cards` collection
- A card has NO active version if:
  - No document in `credit_cards` collection
  - All versions exist only in `credit_cards_history`

**Card States:**
1. **Active**: Has version in `credit_cards` with `IsActive: true`
2. **Inactive**: Has version in `credit_cards` with `IsActive: false` (edge case, should be avoided)
3. **No Active Version**: No document in `credit_cards`, all versions in history only

---

## Screen 1: Card List View Updates

### Data Source Logic (Updated)

```typescript
async function getAllCardsWithStatus(): Promise<CardWithStatus[]> {
  const cards: Map<string, CardWithStatus> = new Map();

  // 1. Get all cards from credit_cards collection
  const activeCollection = await db.collection('credit_cards').get();

  activeCollection.forEach(doc => {
    const data = doc.data() as CreditCardDetails;
    cards.set(doc.id, {
      ...data,
      status: data.IsActive ? 'active' : 'inactive',
      source: 'credit_cards'
    });
  });

  // 2. Get all unique ReferenceCardIds from history
  const historyCollection = await db.collection('credit_cards_history').get();

  const historyReferenceIds = new Set<string>();
  historyCollection.forEach(doc => {
    historyReferenceIds.add(doc.data().ReferenceCardId);
  });

  // 3. Find cards that exist ONLY in history (no active version)
  for (const refId of historyReferenceIds) {
    if (!cards.has(refId)) {
      // This card has no active version, get most recent from history
      const mostRecent = await db.collection('credit_cards_history')
        .where('ReferenceCardId', '==', refId)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (!mostRecent.empty) {
        const data = mostRecent.docs[0].data() as CreditCardDetails;
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

interface CardWithStatus extends CreditCardDetails {
  status: 'active' | 'inactive' | 'no_active_version';
  source: 'credit_cards' | 'credit_cards_history';
}
```

### Updated Card Entry Display

```
┌──────────────────────────────────────────────────────────────┐
│ Card Name                    [No Active Version]              │
│ Issuer Name                                                   │
│                              Last Updated: [Date]             │
└──────────────────────────────────────────────────────────────┘
```

**Status Badges (Updated):**
- **Active**: Green badge "Active" (in credit_cards, IsActive: true)
- **Inactive**: Gray badge "Inactive" (in credit_cards, IsActive: false) - rare edge case
- **No Active Version**: Yellow/Orange badge "No Active Version" (not in credit_cards)

### Updated Status Filter

**Filter Options:**
- "All Cards"
- "Active Only" (has active version in credit_cards)
- "No Active Version" (exists only in history)
- "All Inactive" (includes both inactive and no active version)

---

## Screen 2: Card Detail View Updates

### Version Header - Enhanced Actions

**Updated Version Header:**
```
┌────────────────────────────────────────────────────┐
│ Card Version Name                    [Active]      │
│ Version ID: current                                │
│ Last updated: [Timestamp]                          │
│                                                    │
│ [Edit] [Duplicate] [Deactivate] [Delete]          │
└────────────────────────────────────────────────────┘

OR (for version in history):

┌────────────────────────────────────────────────────┐
│ Card Version Name              [No Active Version] │
│ Version ID: uuid-v1                                │
│ Last updated: [Timestamp]                          │
│                                                    │
│ [Edit] [Duplicate] [Set as Active] [Delete]       │
└────────────────────────────────────────────────────┘
```

**Button States:**

For **Active Version** (in credit_cards):
- **Edit**: Edit this version's details
- **Duplicate**: Create new version based on this
- **Deactivate**: Remove from credit_cards (new!)
- **Delete**: Not allowed (must deactivate first)

For **Version in History** (no active version exists):
- **Edit**: Edit this historical version
- **Duplicate**: Create new version based on this
- **Set as Active**: Move to credit_cards and activate
- **Delete**: Allowed if not the only version

### Left Sidebar - Version List (Updated)

**Enhanced Version Display:**
```
┌─────────────────────────┐
│ 2025 Benefits       [✓] │ ← Active version (in credit_cards)
│ Version: current        │
│ Jan 1, 2025 - ongoing   │
│ 3 credits, 5 perks      │
└─────────────────────────┘

┌─────────────────────────┐
│ 2024 Benefits           │
│ Version: uuid-v1        │
│ Jan 1 - Dec 31, 2024    │
│ 3 credits, 4 perks      │
└─────────────────────────┘

OR (when no active version):

[No Active Version Badge]

┌─────────────────────────┐
│ 2025 Benefits           │ ← Most recent, but not active
│ Version: uuid-v1        │
│ Jan 1, 2025 - ongoing   │
│ 3 credits, 5 perks      │
└─────────────────────────┘

┌─────────────────────────┐
│ 2024 Benefits           │
│ Version: uuid-v2        │
│ Jan 1 - Dec 31, 2024    │
│ 3 credits, 4 perks      │
└─────────────────────────┘
```

**Visual Indicators:**
- **[✓]**: Active version indicator (only when version is in credit_cards)
- **[No Active Version Badge]**: Shown at top of version list when no version is active
- **Version ID**: Shows "current" for active, UUID for history

---

## New Flow: Deactivate Version

### Purpose
Remove the active version from `credit_cards` collection, making the card have no active version. The version remains in `credit_cards_history`.

### Trigger
"Deactivate" button in version header (only visible for active version)

### Deactivation Modal

```
┌─────────────────────────────────────────────────────┐
│           Deactivate Card Version                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ You are about to deactivate:                        │
│ • Card: Chase Sapphire Reserve                      │
│ • Version: 2025 Benefits                            │
│ • Version ID: current                               │
│                                                     │
│ ⚠️  What will happen:                               │
│ • This card will be removed from credit_cards       │
│ • Users will NO LONGER see this card in the app    │
│ • The version will be preserved in history          │
│ • You can reactivate a version later               │
│                                                     │
│ Why are you deactivating this card?                 │
│ ○ Card is discontinued                              │
│ ○ Working on updates (in progress)                  │
│ ○ Temporary removal                                 │
│ ○ Other: [___________________________]              │
│                                                     │
│ Set effectiveTo date (when this version ended):     │
│ ○ Today ([Jan 15, 2025])                           │
│ ○ Custom date: [___________] [📅]                  │
│ ○ Leave blank (no end date)                        │
│                                                     │
│ ☑ Preserve version in history                      │
│   (Recommended - keeps historical record)           │
│                                                     │
│                  [Cancel]  [Deactivate Version]     │
└─────────────────────────────────────────────────────┘
```

### Implementation

```typescript
async function deactivateVersion(
  cardId: string,
  reason: string,
  effectiveTo: string | null,
  preserveInHistory: boolean = true
): Promise<void> {

  const batch = db.batch();

  // 1. Get current active version from credit_cards
  const activeDoc = await db.collection('credit_cards').doc(cardId).get();

  if (!activeDoc.exists) {
    throw new Error('No active version found to deactivate');
  }

  const activeData = activeDoc.data() as CreditCardDetails;

  if (preserveInHistory) {
    // 2. Copy to history if not already there
    const historyId = generateUUID();
    batch.set(db.collection('credit_cards_history').doc(historyId), {
      ...activeData,
      IsActive: false,
      effectiveTo: effectiveTo || activeData.effectiveTo || '9999-12-31',
      lastUpdated: new Date().toISOString(),
      deactivationReason: reason // Add metadata
    });
  }

  // 3. Delete from credit_cards
  batch.delete(db.collection('credit_cards').doc(cardId));

  await batch.commit();
}
```

### After Deactivation

**UI Updates:**
1. Card list shows card with "No Active Version" badge
2. Version list shows no [✓] indicator
3. All versions appear as historical versions
4. "Deactivate" button disappears
5. "Set as Active" button appears on all versions

---

## Updated Flow: Set Version as Active

### Updated Modal (with No Active Version Case)

```
┌─────────────────────────────────────────────────────┐
│           Set Version as Active                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ You are about to activate:                          │
│ • Version: 2024 Benefits                            │
│ • Version ID: uuid-v1                               │
│ • Effective: Jan 1, 2024 - Dec 31, 2024            │
│                                                     │
│ Current status: No Active Version                   │
│                                                     │
│ ✓ What will happen:                                │
│ • This version will be copied to credit_cards       │
│ • Card will become visible to users                 │
│ • Version will remain in history                    │
│                                                     │
│ Set new effectiveFrom date:                         │
│ ○ Use original date (Jan 1, 2024)                  │
│ ○ Start today ([Jan 15, 2025])                     │
│ ○ Custom date: [___________] [📅]                  │
│                                                     │
│ Clear effectiveTo date? (make it ongoing)           │
│ ☑ Yes, make this version ongoing                   │
│                                                     │
│                    [Cancel]  [Activate Version]     │
└─────────────────────────────────────────────────────┘
```

**If Active Version Already Exists:**
```
┌─────────────────────────────────────────────────────┐
│           Set Version as Active                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ You are about to activate:                          │
│ • Version: 2024 Benefits                            │
│ • Effective: Jan 1, 2024 - Dec 31, 2024            │
│                                                     │
│ Current active version:                             │
│ • Version: 2025 Benefits                            │
│ • Will be moved to history                          │
│                                                     │
│ ⚠️  Warning:                                        │
│ This will change which card data users see.         │
│                                                     │
│ What should happen to current active version?       │
│ ○ Move to history (recommended)                    │
│ ○ Deactivate completely (remove from credit_cards) │
│                                                     │
│               [Cancel]  [Activate Version]          │
└─────────────────────────────────────────────────────┘
```

### Updated Implementation

```typescript
async function setVersionAsActive(
  versionId: string,
  options: {
    archiveCurrent: boolean;
    newEffectiveFrom?: string;
    clearEffectiveTo?: boolean;
  }
): Promise<void> {

  const batch = db.batch();

  // 1. Get version to activate from history
  const versionToActivate = await db.collection('credit_cards_history')
    .doc(versionId).get();

  if (!versionToActivate.exists) {
    throw new Error('Version not found in history');
  }

  const versionData = versionToActivate.data() as CreditCardDetails;
  const referenceCardId = versionData.ReferenceCardId;

  // 2. Check if there's currently an active version
  const currentActive = await db.collection('credit_cards')
    .doc(referenceCardId).get();

  if (currentActive.exists) {
    // There IS an active version
    if (options.archiveCurrent) {
      // Move current active to history
      const historyId = generateUUID();
      batch.set(db.collection('credit_cards_history').doc(historyId), {
        ...currentActive.data(),
        IsActive: false,
        effectiveTo: new Date().toISOString()
      });
    }
    // If not archiving, it will just be overwritten
  }
  // If currentActive doesn't exist, there's no active version - just activate this one

  // 3. Set new version as active in credit_cards
  batch.set(db.collection('credit_cards').doc(referenceCardId), {
    ...versionData,
    IsActive: true,
    effectiveFrom: options.newEffectiveFrom || versionData.effectiveFrom,
    effectiveTo: options.clearEffectiveTo ? '9999-12-31' : versionData.effectiveTo,
    lastUpdated: new Date().toISOString()
  });

  await batch.commit();
}
```

---

## Updated Flow: Delete Version

### Updated Safety Checks

**Cannot Delete If:**
1. It's the only version of the card (must have at least one version in history)
2. It's the currently active version (must deactivate first)
3. User data exists referencing this version

**Updated Error Messages:**

```typescript
async function canDeleteVersion(versionId: string): Promise<{
  canDelete: boolean;
  reason?: string;
}> {

  const version = await db.collection('credit_cards_history')
    .doc(versionId).get();

  if (!version.exists) {
    return { canDelete: false, reason: 'Version not found' };
  }

  const versionData = version.data() as CreditCardDetails;

  // Check if it's in credit_cards (active)
  const activeDoc = await db.collection('credit_cards')
    .doc(versionData.ReferenceCardId).get();

  if (activeDoc.exists && activeDoc.id === versionId) {
    return {
      canDelete: false,
      reason: 'Cannot delete active version. Deactivate it first.'
    };
  }

  // Check if it's the only version
  const allVersions = await db.collection('credit_cards_history')
    .where('ReferenceCardId', '==', versionData.ReferenceCardId)
    .get();

  // Count versions: history count + 1 if active exists
  const totalVersions = allVersions.size + (activeDoc.exists ? 1 : 0);

  if (totalVersions === 1) {
    return {
      canDelete: false,
      reason: 'Cannot delete the only version of a card'
    };
  }

  // Check user dependencies
  const userCheck = await checkUserDependencies(versionId);
  if (userCheck.hasUsers) {
    return {
      canDelete: false,
      reason: `This version is used by ${userCheck.userCount} users`
    };
  }

  return { canDelete: true };
}
```

---

## Screen 4: Create New Card - Updated

### Step 3: Initial Version (Updated Options)

```
┌─────────────────────────────────────────────────────────────┐
│                    Create New Credit Card                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 3 of 3: Visual Branding & Initial Version             │
│                                                             │
│ [... image and color fields ...]                           │
│                                                             │
│ Initial Version Name *                                      │
│ [2025 Benefits__________________________________]          │
│                                                             │
│ Effective From Date *                                       │
│ [Jan 1, 2025___________] [📅]                              │
│                                                             │
│ Effective To Date (optional)                                │
│ [___________________] [📅]                                 │
│                                                             │
│ Card Status                                                 │
│ ○ Set as active (visible to users)                         │
│ ○ Save as draft (no active version)                        │
│                                                             │
│ [Info] If you select "Save as draft", this card will       │
│        only exist in history until you activate a version. │
│                                                             │
│                         [← Back]  [Cancel]  [Create Card]   │
└─────────────────────────────────────────────────────────────┘
```

### Updated Implementation

```typescript
async function createNewCard(
  formData: CreateCardFormData,
  setAsActive: boolean
): Promise<string> {

  const batch = db.batch();

  const cardData: CreditCardDetails = {
    id: formData.referenceCardId,
    CardName: formData.cardName,
    // ... all other fields
    VersionName: formData.versionName,
    ReferenceCardId: formData.referenceCardId,
    IsActive: setAsActive,
    effectiveFrom: formData.effectiveFrom,
    effectiveTo: formData.effectiveTo || '9999-12-31',
    lastUpdated: new Date().toISOString()
    // No pointer arrays - components linked via ReferenceCardId
  };

  if (setAsActive) {
    // Add to credit_cards (visible to users)
    batch.set(
      db.collection('credit_cards').doc(formData.referenceCardId),
      cardData
    );
  }

  // ALWAYS add to history
  const historyId = generateUUID();
  batch.set(
    db.collection('credit_cards_history').doc(historyId),
    cardData
  );

  await batch.commit();

  return formData.referenceCardId;
}
```

---

## Edge Cases - Updated

### 1. No Active Version Edge Cases

**Case: User tries to view card with no active version in main app**
- Card doesn't appear in user's card list
- If user had it selected previously, show "Card no longer available"
- Gracefully handle in frontend

**Case: All versions in history have IsActive: false**
- This is the normal state for "no active version"
- UI shows "No Active Version" badge
- Any version can be activated

**Case: Deleting last version when no active version exists**
- Not allowed
- Error: "Cannot delete the only version. Cards must have at least one version in history."
- User must create a new version before deleting the last one

**Case: Creating new version when no active version exists**
- Allowed
- User chooses whether to set new version as active
- If not set as active, card continues to have no active version

### 2. Data Integrity with No Active Version

**Case: Orphaned components**
```typescript
// Components with ReferenceCardId but no active card version
async function findComponentsForInactiveCards(): Promise<{
  referenceCardId: string;
  hasActiveVersion: boolean;
  componentCount: number;
}[]> {

  const results: any[] = [];

  // Get all unique ReferenceCardIds from components
  const creditsSnapshot = await db.collection('credit_cards_credits').get();
  const refIds = new Set<string>();

  creditsSnapshot.forEach(doc => {
    refIds.add(doc.data().ReferenceCardId);
  });

  // Check each ReferenceCardId
  for (const refId of refIds) {
    const activeDoc = await db.collection('credit_cards').doc(refId).get();

    if (!activeDoc.exists) {
      // This card has components but no active version
      const componentCount = creditsSnapshot.docs.filter(
        d => d.data().ReferenceCardId === refId
      ).length;

      results.push({
        referenceCardId: refId,
        hasActiveVersion: false,
        componentCount
      });
    }
  }

  return results;
}
```

**Case: Reactivating after long period**
- Version from 2023 being activated in 2025
- Allow it, but show warning
- Prompt user to update effective dates
- Suggest creating new version based on old one instead

### 3. UI State Management

**Case: Navigating to card detail when no active version**
- Load most recent version from history
- Show "No Active Version" warning banner
- All versions appear in history list
- No [✓] indicator on any version

**Case: Filtering by "Active Only" when card is deactivated**
- Card disappears from list
- Show count: "Showing X active cards (Y total cards)"

**Case: Search finds card with no active version**
- Include in search results
- Show "No Active Version" badge
- Allow clicking to view and manage

---

## Service Layer - New Methods

### Database Access Pattern

**Direct Firestore Access:**
The Card Manager uses Firebase Admin SDK to connect directly to Firestore, providing full control over database operations without requiring an API layer.

```typescript
// config/firebase-admin.ts
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

export const db = admin.firestore();
```

**Shared Code:**
Reuse Server types and constants for consistency:

```typescript
import { CreditCardDetails } from '../../Server/types/credit-card-types';
import { ONGOING_SENTINEL_DATE } from '../../Server/constants/dates';
```

**Data Integrity:**
- Use sentinel value `"9999-12-31"` for ongoing dates
- Follow batch write patterns for atomic operations
- Validate all data before writing to Firestore
- No pointer arrays - components linked via `ReferenceCardId`

### CardService Methods

```typescript
// services/CardService.ts

export class CardService {

  /**
   * Deactivate the active version of a card
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
    const activeDoc = await db.collection('credit_cards')
      .doc(referenceCardId).get();

    if (!activeDoc.exists) {
      throw new Error('No active version found');
    }

    const activeData = activeDoc.data() as CreditCardDetails;

    // Preserve in history if requested
    if (options.preserveInHistory !== false) {
      const historyId = this.generateUUID();
      batch.set(db.collection('credit_cards_history').doc(historyId), {
        ...activeData,
        IsActive: false,
        effectiveTo: options.effectiveTo || activeData.effectiveTo || '9999-12-31',
        lastUpdated: new Date().toISOString(),
        deactivationReason: options.reason
      });
    }

    // Delete from credit_cards
    batch.delete(db.collection('credit_cards').doc(referenceCardId));

    await batch.commit();
  }

  /**
   * Check if a card has an active version
   */
  static async hasActiveVersion(referenceCardId: string): Promise<boolean> {
    const doc = await db.collection('credit_cards').doc(referenceCardId).get();
    return doc.exists;
  }

  /**
   * Get card status
   */
  static async getCardStatus(referenceCardId: string): Promise<CardStatus> {
    const activeDoc = await db.collection('credit_cards')
      .doc(referenceCardId).get();

    if (!activeDoc.exists) {
      return {
        status: 'no_active_version',
        hasVersions: await this.hasVersionsInHistory(referenceCardId)
      };
    }

    const data = activeDoc.data() as CreditCardDetails;

    return {
      status: data.IsActive ? 'active' : 'inactive',
      hasVersions: true,
      activeVersion: data
    };
  }

  /**
   * Check if card has any versions in history
   */
  private static async hasVersionsInHistory(
    referenceCardId: string
  ): Promise<boolean> {
    const snapshot = await db.collection('credit_cards_history')
      .where('ReferenceCardId', '==', referenceCardId)
      .limit(1)
      .get();

    return !snapshot.empty;
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
    const versionDoc = await db.collection('credit_cards_history')
      .doc(versionId).get();

    if (!versionDoc.exists) {
      throw new Error('Version not found in history');
    }

    const versionData = versionDoc.data() as CreditCardDetails;
    const refId = versionData.ReferenceCardId;

    // Check for current active version
    const currentActive = await db.collection('credit_cards').doc(refId).get();

    if (currentActive.exists && options.archiveCurrent) {
      // Move current to history
      const historyId = this.generateUUID();
      batch.set(db.collection('credit_cards_history').doc(historyId), {
        ...currentActive.data(),
        IsActive: false,
        effectiveTo: new Date().toISOString()
      });
    }

    // Activate new version
    batch.set(db.collection('credit_cards').doc(refId), {
      ...versionData,
      IsActive: true,
      effectiveFrom: options.newEffectiveFrom || versionData.effectiveFrom,
      effectiveTo: options.clearEffectiveTo ? '9999-12-31' : versionData.effectiveTo,
      lastUpdated: new Date().toISOString()
    });

    await batch.commit();
  }
}

interface CardStatus {
  status: 'active' | 'inactive' | 'no_active_version';
  hasVersions: boolean;
  activeVersion?: CreditCardDetails;
}
```

---

## UI Components - New/Updated

### NoActiveVersionBanner Component

```tsx
interface NoActiveVersionBannerProps {
  card: CreditCard;
  onActivate: () => void;
}

function NoActiveVersionBanner({ card, onActivate }: NoActiveVersionBannerProps) {
  return (
    <div className="banner banner-warning">
      <div className="banner-icon">⚠️</div>
      <div className="banner-content">
        <h3>No Active Version</h3>
        <p>
          This card is not currently visible to users.
          Activate a version to make it available in the app.
        </p>
      </div>
      <button onClick={onActivate} className="btn btn-primary">
        Activate a Version
      </button>
    </div>
  );
}
```

### CardStatusBadge Component

```tsx
interface CardStatusBadgeProps {
  status: 'active' | 'inactive' | 'no_active_version';
}

function CardStatusBadge({ status }: CardStatusBadgeProps) {
  const config = {
    active: {
      className: 'badge-success',
      text: 'Active',
      icon: '✓'
    },
    inactive: {
      className: 'badge-secondary',
      text: 'Inactive',
      icon: '○'
    },
    no_active_version: {
      className: 'badge-warning',
      text: 'No Active Version',
      icon: '◌'
    }
  };

  const { className, text, icon } = config[status];

  return (
    <span className={`badge ${className}`}>
      {icon} {text}
    </span>
  );
}
```

---

## Summary of No Active Version Feature

### What This Enables

1. **Draft Mode**: Create and configure cards before making them public
2. **Discontinuation**: Remove cards from active rotation while preserving history
3. **Flexible Management**: Activate/deactivate versions as needed

### Key Behaviors

- **credit_cards collection**: Only contains cards visible to users
- **credit_cards_history collection**: Contains ALL versions, including cards with no active version
- **Card families must have at least one version in history** (cannot delete last version)
- **Cards can transition between states**: active → no active → active

### State Transitions

```
Create Card (Active)    →  credit_cards + history
Create Card (Draft)     →  history only
Activate Version        →  history → credit_cards
Deactivate Version      →  credit_cards → history
Delete Version          →  history → deleted (if not last & not active)
```

### User-Facing Impact

- **Active cards**: Visible in main app, users can select and manage
- **No active version cards**: Not visible to users, admin-only access
- **Smooth transitions**: Activating/deactivating preserves all data and relationships

This feature gives you complete control over card visibility and lifecycle management.
