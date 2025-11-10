# Credit Card Manager Dashboard - REFINED Design Specification v2.0

## Document Purpose

This is the **official implementation specification** for the Credit Card Manager Dashboard.

**Key Design Principles:**
- **Automatic Date-Based Component Association** - Components are automatically associated with card versions based on date overlap calculations. No manual linking required.
- **Sentinel Date for Ongoing Items** - All `effectiveTo`/`EffectiveTo` fields use `"9999-12-31"` to represent ongoing/present items with no end date (instead of empty strings).

---

## Table of Contents

1. [Ongoing Date Sentinel Value](#ongoing-date-sentinel-value)
2. [Data Structure](#data-structure)
3. [Screen 1: Card List View](#screen-1-card-list-view)
4. [Screen 2: Card Detail View](#screen-2-card-detail-view)
5. [Screen 3: Component Modal](#screen-3-component-modal)
6. [Screen 4: Create New Card Flow](#screen-4-create-new-card-flow)
7. [Screen 5: Component Library View](#screen-5-component-library-view)
8. [Automatic Date-Based Association System](#automatic-date-based-association-system)
9. [Edge Cases and Error Handling](#edge-cases-and-error-handling)
10. [Technical Implementation](#technical-implementation)

---

## Ongoing Date Sentinel Value

### Feature Overview

All `effectiveTo` and `EffectiveTo` date fields throughout the system use **`"9999-12-31"`** as a sentinel value to represent ongoing/present items with no end date.

### Why Use a Sentinel Value Instead of Empty String?

**Problem with Empty Strings:**
- Empty strings sort **before** all dates in Firestore
- Breaks expected sort order (ongoing items should appear last when sorted ascending)
- Complicates composite index behavior
- Makes queries for "currently active" items more complex

**Benefits of `"9999-12-31"`:**
1. **Firestore Index Efficiency** - Composite indexes like `(ReferenceCardId ASC, effectiveTo DESC)` work predictably
2. **Natural Sorting** - Ongoing items appear last when sorted ASC, first when sorted DESC
3. **Simpler Queries** - `where('effectiveTo', '>=', '2025-01-01')` correctly includes ongoing items
4. **Simpler Date Logic** - No need for null checks in date overlap calculations
5. **Standard Practice** - Common pattern in temporal databases

### Examples

**Component with End Date:**
```typescript
{
  id: "credit-123",
  Title: "Uber Credit",
  EffectiveFrom: "2025-01-01",
  EffectiveTo: "2025-12-31",  // Expires end of 2025
  // ...
}
```

**Ongoing Component:**
```typescript
{
  id: "credit-456",
  Title: "Dining Credit",
  EffectiveFrom: "2024-01-01",
  EffectiveTo: "9999-12-31",  // Ongoing, no end date
  // ...
}
```

**Card Version with End Date:**
```typescript
{
  id: "amex-gold",
  VersionName: "2024 Benefits",
  effectiveFrom: "2024-01-01",
  effectiveTo: "2024-12-31",  // This version ended
  // ...
}
```

**Current/Ongoing Card Version:**
```typescript
{
  id: "amex-gold",
  VersionName: "2025 Benefits",
  effectiveFrom: "2025-01-01",
  effectiveTo: "9999-12-31",  // Current version, ongoing
  IsActive: true,
  // ...
}
```

### Usage in UI

**Date Picker:**
- When users leave "Effective To" blank, store as `"9999-12-31"`
- When displaying, show `"9999-12-31"` as "Ongoing" or "No end date"

**Component List Display:**
```
Uber Credit
Jan 1, 2025 - Dec 31, 2025

Dining Credit
Jan 1, 2024 - Ongoing  ← Display "9999-12-31" as "Ongoing"
```

**Date Range Queries:**
```typescript
// Find all components active today
const today = new Date().toISOString().split('T')[0];
db.collection('credit_cards_credits')
  .where('EffectiveFrom', '<=', today)
  .where('EffectiveTo', '>=', today)  // Includes "9999-12-31"
  .get();
```

### Implementation Details

See `Server/constants/dates.ts` for:
- `ONGOING_SENTINEL_DATE` constant
- `isOngoingDate()` helper function
- `normalizeEffectiveTo()` conversion helper
- `denormalizeEffectiveTo()` display helper

### Required Firestore Indexes

```
Collection: credit_cards_credits
Index: (ReferenceCardId ASC, EffectiveTo DESC)

Collection: credit_cards_perks
Index: (ReferenceCardId ASC, EffectiveTo DESC)

Collection: credit_cards_multipliers
Index: (ReferenceCardId ASC, EffectiveTo DESC)

Collection: credit_cards_history
Index: (ReferenceCardId ASC, effectiveTo DESC)
```

---

## Data Structure

### Core Principles

**1. Pointer arrays are calculated on read, not stored**
- Components and versions are stored WITHOUT pointer arrays in Firestore
- When the API fetches a version, it calculates pointer arrays based on date overlap
- This ensures date ranges are the single source of truth

**2. Date overlap determines component association**
- Components have a `ReferenceCardId` and date range (`EffectiveFrom`, `EffectiveTo`)
- Versions have a date range (`effectiveFrom`, `effectiveTo`)
- If date ranges overlap, component appears on that version
- No manual linking in the UI

**3. Ongoing dates use sentinel value "9999-12-31"**
- Components/versions with no end date use `"9999-12-31"` for `effectiveTo`
- Enables efficient Firestore indexes and natural sorting
- See [Ongoing Date Sentinel Value](#ongoing-date-sentinel-value) section for details

### Collections

**credit_cards**
```typescript
{
  id: string;                 // e.g., "amex-gold"
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
  ReferenceCardId: string;
  IsActive: boolean;
  effectiveFrom: string;      // ISO date: "2025-01-01"
  effectiveTo: string;        // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  lastUpdated: string;
  // NOTE: Pointer arrays below are NOT stored - calculated on API read
  Perks: Array<{id: string}>;      // Calculated based on date overlap
  Credits: Array<{id: string}>;    // Calculated based on date overlap
  Multipliers: Array<{id: string}>; // Calculated based on date overlap
}
```

**credit_cards_history**
```typescript
{
  id: string;                 // UUID
  // ... same fields as credit_cards
  ReferenceCardId: string;    // Links to card family
  effectiveFrom: string;      // ISO date: "2025-01-01"
  effectiveTo: string;        // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  // NOTE: Pointer arrays below are NOT stored - calculated on API read
  Perks: Array<{id: string}>;      // Calculated based on date overlap
  Credits: Array<{id: string}>;    // Calculated based on date overlap
  Multipliers: Array<{id: string}>; // Calculated based on date overlap
}
```

**credit_cards_credits** (and perks, multipliers)
```typescript
{
  id: string;
  ReferenceCardId: string;    // Which card family this belongs to
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Value: string;              // For credits
  TimePeriod: string;         // For credits
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;      // ISO date: "2025-01-01"
  EffectiveTo: string;        // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  LastUpdated: string;
}
```

### Key Relationships

```
Card Version (Jan 1 - Dec 31, 2025)
    ↓ (automatic calculation)
    Shows components where:
    - Component.ReferenceCardId === Version.ReferenceCardId
    - Component dates overlap with Version dates
```

**Example:**
```typescript
// Version
{
  ReferenceCardId: "amex-gold",
  effectiveFrom: "2025-01-01",
  effectiveTo: "2025-12-31"
}

// Components that will appear
Credit 1: { ReferenceCardId: "amex-gold", EffectiveFrom: "2025-01-01", EffectiveTo: "2025-12-31" } ✓
Credit 2: { ReferenceCardId: "amex-gold", EffectiveFrom: "2024-01-01", EffectiveTo: "" } ✓ (ongoing)
Credit 3: { ReferenceCardId: "amex-gold", EffectiveFrom: "2026-01-01", EffectiveTo: "" } ✗ (future)
```

---

## Screen 1: Card List View

### Purpose
Display all unique credit cards (by ReferenceCardId) with ability to search, filter, and navigate.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Credit Card Manager                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ [Search]  [Filter by Issuer ▼]  [Status ▼]         [+ Add Card]    │
├─────────────────────────────────────────────────────────────────────┤
│ Sort By: [Most Recent ▼]                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Chase Sapphire Reserve              [Active]                  │  │
│  │ Chase • Visa                        Last Updated: Jan 15, 2025│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ American Express Gold            [No Active Version]          │  │
│  │ American Express • Amex          Last Updated: Dec 1, 2024   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Loading

```typescript
async function loadCardList(): Promise<CardListItem[]> {
  const cards: Map<string, CardListItem> = new Map();

  // 1. Get all active cards
  const activeCards = await db.collection('credit_cards').get();
  activeCards.forEach(doc => {
    const data = doc.data();
    cards.set(doc.id, {
      referenceCardId: doc.id,
      cardName: data.CardName,
      cardIssuer: data.CardIssuer,
      cardNetwork: data.CardNetwork,
      lastUpdated: data.lastUpdated,
      status: data.IsActive ? 'active' : 'inactive'
    });
  });

  // 2. Get cards with no active version (only in history)
  const historyCards = await db.collection('credit_cards_history').get();
  const historyRefIds = new Set<string>();

  historyCards.forEach(doc => {
    historyRefIds.add(doc.data().ReferenceCardId);
  });

  // 3. Find cards that exist only in history
  for (const refId of historyRefIds) {
    if (!cards.has(refId)) {
      // Get most recent version from history
      const recentVersion = await db.collection('credit_cards_history')
        .where('ReferenceCardId', '==', refId)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (!recentVersion.empty) {
        const data = recentVersion.docs[0].data();
        cards.set(refId, {
          referenceCardId: refId,
          cardName: data.CardName,
          cardIssuer: data.CardIssuer,
          cardNetwork: data.CardNetwork,
          lastUpdated: data.lastUpdated,
          status: 'no_active_version'
        });
      }
    }
  }

  return Array.from(cards.values());
}
```

### Filters & Sort

**Status Filter:**
- All Cards
- Active Only
- No Active Version
- Inactive

**Issuer Filter:**
- All Issuers
- [Dynamic list of issuers]

**Sort Options:**
- Most Recently Updated
- Oldest Updated
- Alphabetical (A-Z)
- Alphabetical (Z-A)
- Issuer Name

---

## Screen 2: Card Detail View

### Purpose
View and manage all versions of a card and see components that apply to each version (calculated automatically based on dates).

### Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Credit Card Manager                              [← Back to All Cards]     │
├────────────────────────────────────────────────────────────────────────────┤
│ [Chase Sapphire Reserve ▼]                                                 │
├───────────────┬────────────────────────────────────────┬───────────────────┤
│               │                                        │                   │
│ [Search]      │  2025 Benefits              [Active]  │  Credits      [▼] │
│               │  Version ID: current                   │                   │
│ ┌───────────┐ │  Last updated: Jan 15, 2025           │  [Search]         │
│ │2025       │ │  Effective: Jan 1, 2025 - ongoing     │                   │
│ │Benefits│✓││ │                                        │  ┌─────────────┐ │
│ │Jan 1 -    │ │  [Edit] [Duplicate] [Deactivate]      │  │Uber Credit  │ │
│ │ongoing    │ │                                        │  │Jan-Dec 2025 │ │
│ │3 credits  │ │  Fields                                │  │$200 annual  │ │
│ └───────────┘ │  ┌──────────────────────────────────┐ │  └─────────────┘ │
│               │  │                                  │ │                   │
│ ┌───────────┐ │  │  Card Name: [____________]      │ │  ┌─────────────┐ │
│ │2024       │ │  │  Card Issuer: [__________]      │ │  │Dining Cr.   │ │
│ │Benefits   │ │  │  Annual Fee: [$___]             │ │  │Jan - ongoing│ │
│ │Jan 1 -    │ │  │  ...                            │ │  │$120 annual  │ │
│ │Dec 31 2024│ │  │                                  │ │  └─────────────┘ │
│ │3 credits  │ │  └──────────────────────────────────┘ │                   │
│ └───────────┘ │                                        │  [+ Add Credit] │
│               │  Active Components (3)                 │                   │
│[+ Add Version]│  Credits (2)                           │                   │
│               │  • Uber Credit (Jan - Dec 2025)        │                   │
│               │  • Dining Credit (Jan 2025 - ongoing)  │                   │
│               │                                        │                   │
│               │  Perks (0)                             │                   │
│               │  No perks for this period              │                   │
│               │                                        │                   │
│               │  Multipliers (1)                       │                   │
│               │  • Dining 4x (Jan 2025 - ongoing)      │                   │
│               │                                        │                   │
└───────────────┴────────────────────────────────────────┴───────────────────┘
```

### Left Sidebar: Version List

**Shows:**
- All versions for this card (from both credit_cards and credit_cards_history)
- Active version marked with [✓]
- Version name, date range, component count

**Component Count:**
- Calculated dynamically: count of components with overlapping dates
- Updates automatically when component dates change

```typescript
async function getVersionWithComponentCount(version: CreditCardDetails): Promise<VersionListItem> {
  // Calculate component counts
  const components = await getComponentsForVersion(version);

  return {
    id: version.id,
    versionName: version.VersionName,
    effectiveFrom: version.effectiveFrom,
    effectiveTo: version.effectiveTo,
    isActive: version.IsActive,
    componentCounts: {
      credits: components.credits.length,
      perks: components.perks.length,
      multipliers: components.multipliers.length
    }
  };
}
```

### Center Panel: Version Details

**Version Header:**
- Version name, ID, status, dates
- Action buttons: Edit, Duplicate, Deactivate (if active) or Set as Active (if not)

**Fields Section:**
- All card properties (editable in edit mode)
- Standard form fields

**Active Components Section:**
- **Automatically calculated** list of components with overlapping dates
- Grouped by type (Credits, Perks, Multipliers)
- Shows component name and date range
- **Read-only display** - no link/unlink buttons

```typescript
async function getComponentsForVersion(version: CreditCardDetails): Promise<{
  credits: CardCredit[];
  perks: CardPerk[];
  multipliers: CardMultiplier[];
}> {

  const [credits, perks, multipliers] = await Promise.all([
    getComponentsWithOverlap('credit_cards_credits', version),
    getComponentsWithOverlap('credit_cards_perks', version),
    getComponentsWithOverlap('credit_cards_multipliers', version)
  ]);

  return { credits, perks, multipliers };
}

async function getComponentsWithOverlap(
  collection: string,
  version: CreditCardDetails
): Promise<any[]> {

  // Get all components for this card family
  const snapshot = await db.collection(collection)
    .where('ReferenceCardId', '==', version.ReferenceCardId)
    .get();

  // Filter to only components with overlapping dates
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(component => {
      return datesOverlap(
        component.EffectiveFrom,
        component.EffectiveTo,
        version.effectiveFrom,
        version.effectiveTo
      );
    });
}

function datesOverlap(
  compStart: string,
  compEnd: string,
  verStart: string,
  verEnd: string
): boolean {
  const cs = new Date(compStart);
  const ce = compEnd ? new Date(compEnd) : new Date('9999-12-31');
  const vs = new Date(verStart);
  const ve = verEnd ? new Date(verEnd) : new Date('9999-12-31');

  return cs <= ve && vs <= ce;
}
```

### Right Sidebar: Component Quick View

**Purpose:**
- Browse all components for this card family
- Filter by type (Credits/Perks/Multipliers)
- See which components apply to current version

**Display:**
- Component name, date range, description
- Visual indicator if component applies to currently selected version
- Click to view/edit component details

```
Credits [▼]

[Search]

┌───────────────────────┐
│ Uber Credit       [✓] │ ← Applies to current version
│ Jan - Dec 2025        │
│ $200 annual credit    │
└───────────────────────┘

┌───────────────────────┐
│ Dining Credit     [✓] │ ← Applies to current version
│ Jan 2025 - ongoing    │
│ $120 annual credit    │
└───────────────────────┘

┌───────────────────────┐
│ Streaming Credit  [ ] │ ← Does NOT apply (dates don't overlap)
│ Jan - Dec 2024        │
│ $180 annual credit    │
└───────────────────────┘

[+ Add New Credit]
```

**Indicator Logic:**
```typescript
function componentAppliestoVersion(
  component: CardCredit,
  version: CreditCardDetails
): boolean {
  return datesOverlap(
    component.EffectiveFrom,
    component.EffectiveTo,
    version.effectiveFrom,
    version.effectiveTo
  );
}
```

---

## Screen 3: Component Modal

### Purpose
Create or edit a component. The component's date range determines which versions it appears on automatically.

### Layout

```
┌────────────────────────────────────────────────┐
│                                                │
│  Create New Credit                             │
│  Last updated: [Date]                          │
│                                                │
│  [Delete Credit]                               │
│                                                │
│  Fields                                        │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │ Which card does this belong to? *       │ │
│  │ [Chase Sapphire Reserve ▼__________]    │ │
│  │                                          │ │
│  │ Title *                                  │ │
│  │ [Uber Credit_______________________]    │ │
│  │                                          │ │
│  │ Category *                               │ │
│  │ [Transportation ▼__________________]    │ │
│  │                                          │ │
│  │ Value *                                  │ │
│  │ [$__200____________________________]    │ │
│  │                                          │ │
│  │ Time Period *                            │ │
│  │ [Annual ▼__________________________]    │ │
│  │                                          │ │
│  │ Effective From *                         │ │
│  │ [Jan 1, 2025___________] [📅]           │ │
│  │                                          │ │
│  │ Effective To                             │ │
│  │ [Dec 31, 2025__________] [📅]           │ │
│  │ Leave blank for ongoing                  │ │
│  │                                          │ │
│  │ Requirements                             │ │
│  │ [Must enroll in Uber benefit_______     │ │
│  │  ___________________________________]    │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  This component will automatically appear on:  │
│  • 2025 Benefits (Jan 1 - ongoing)            │
│  • 2026 Benefits (Jan 1 - Dec 31, 2026)       │
│                                                │
│  Based on date overlap calculation             │
│                                                │
│                       [Cancel]  [Save]         │
└────────────────────────────────────────────────┘
```

### Key Features

**ReferenceCardId Selection:**
- Dropdown showing all cards
- Required field
- Determines which card family this component belongs to

**Date Range Fields:**
- EffectiveFrom: Required
- EffectiveTo: Optional (blank = ongoing)
- Dates determine automatic version association

**Affected Versions Display (Read-Only):**
- Shows which versions will include this component
- **Informational only** - user cannot manually select
- Recalculates when dates change
- Helps user understand impact

```typescript
// Real-time calculation as user types dates
function calculateAffectedVersions(
  referenceCardId: string,
  effectiveFrom: string,
  effectiveTo: string
): VersionSummary[] {

  const versions = getVersionsByReferenceCardId(referenceCardId);

  return versions.filter(version =>
    datesOverlap(
      effectiveFrom,
      effectiveTo,
      version.effectiveFrom,
      version.effectiveTo
    )
  );
}
```

### Save Behavior

```typescript
async function saveComponent(formData: ComponentFormData): Promise<void> {
  const componentRef = formData.id ?
    db.collection('credit_cards_credits').doc(formData.id) :
    db.collection('credit_cards_credits').doc(generateId());

  // Just save the component - no linking needed
  await componentRef.set({
    id: componentRef.id,
    ReferenceCardId: formData.referenceCardId,
    Title: formData.title,
    Category: formData.category,
    SubCategory: formData.subCategory,
    Description: formData.description,
    Value: formData.value,
    TimePeriod: formData.timePeriod,
    Requirements: formData.requirements,
    Details: formData.details,
    EffectiveFrom: formData.effectiveFrom,
    EffectiveTo: formData.effectiveTo || '',
    LastUpdated: new Date().toISOString()
  });

  // That's it! Automatic association handles the rest
}
```

---

## Screen 4: Create New Card Flow

### Step 1: Basic Information

```
┌─────────────────────────────────────────────────────────────┐
│                    Create New Credit Card                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1 of 3: Basic Information                             │
│                                                             │
│ Card Name *                                                 │
│ [Chase Sapphire Reserve_________________________]          │
│                                                             │
│ Card Issuer *                                               │
│ [Chase___________________________________________]          │
│                                                             │
│ Card Network *                                              │
│ [Visa ▼__________________________________________]          │
│                                                             │
│ ReferenceCardId *                                           │
│ [chase-sapphire-reserve______________________]             │
│ (Auto-generated, can edit)                                  │
│                                                             │
│                              [Cancel]  [Next →]             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Financial Details

```
┌─────────────────────────────────────────────────────────────┐
│                    Create New Credit Card                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 2 of 3: Financial & Rewards Information               │
│                                                             │
│ Annual Fee                                                  │
│ [$__550.00_______________________________________]          │
│                                                             │
│ Foreign Exchange Fee Percentage                             │
│ [__0.00___%_______________________________________]         │
│                                                             │
│ Rewards Currency                                            │
│ [Ultimate Rewards Points__________________________]        │
│                                                             │
│ Points Per Dollar                                           │
│ [__1.0____________________________________________]         │
│                                                             │
│                         [← Back]  [Cancel]  [Next →]        │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Version & Status

```
┌─────────────────────────────────────────────────────────────┐
│                    Create New Credit Card                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 3 of 3: Initial Version & Status                      │
│                                                             │
│ Card Image URL                                              │
│ [https://______________________________________]            │
│                                                             │
│ Primary Color        Secondary Color                        │
│ [#0055A5] [🎨]      [#FFFFFF] [🎨]                         │
│                                                             │
│ Initial Version Name *                                      │
│ [2025 Benefits__________________________________]          │
│                                                             │
│ Effective From *                                            │
│ [Jan 1, 2025___________] [📅]                              │
│                                                             │
│ Effective To (optional)                                     │
│ [___________________] [📅]                                 │
│                                                             │
│ Card Status                                                 │
│ ○ Set as active (visible to users)                         │
│ ○ Save as draft (no active version)                        │
│                                                             │
│                         [← Back]  [Cancel]  [Create Card]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Screen 5: Component Library View

### Purpose
Global view of all components across all cards. Browse, search, filter components independently of cards.

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Component Library                               [← Back to Cards]      │
├────────────────────────────────────────────────────────────────────────┤
│ [Credits ▼]  [Search...]  [Card: All ▼]  [Status ▼]  [+ Add Component]│
├────────────────────────────────────────────────────────────────────────┤
│ Sort By: [Most Recent ▼]                                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ Uber Credit                                    [Edit] [Duplicate] │  │
│ │ Chase Sapphire Reserve                                            │  │
│ │ Jan 1, 2025 - Dec 31, 2025                                        │  │
│ │ $200 annual Uber credit                                           │  │
│ │                                                                   │  │
│ │ Appears on 2 versions:                                            │  │
│ │ • 2025 Benefits (Jan 1 - ongoing)                                 │  │
│ │ • 2024 H2 (Jul 1 - Dec 31, 2024)                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ Dining Credit                                  [Edit] [Duplicate] │  │
│ │ Chase Sapphire Reserve                                            │  │
│ │ Jan 1, 2025 - ongoing                                             │  │
│ │ $120 annual dining credit                                         │  │
│ │                                                                   │  │
│ │ Appears on 1 version:                                             │  │
│ │ • 2025 Benefits (Jan 1 - ongoing)                                 │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Filters

**Component Type:**
- Credits
- Perks
- Multipliers

**Card Filter:**
- All Cards
- [List of all cards]

**Status Filter:**
- All
- Currently Active (EffectiveTo is blank or future)
- Expired (EffectiveTo in past)
- Future (EffectiveFrom in future)

### Version Association Display

Each component card shows:
- "Appears on X versions:" with list
- Calculated dynamically based on date overlap
- Click version name to navigate to that version

---

## Automatic Date-Based Association System

### Core Algorithm

```typescript
/**
 * Determines if a component should appear on a version
 */
function componentAppliesTo(
  component: Component,
  version: CardVersion
): boolean {

  // Must belong to same card family
  if (component.ReferenceCardId !== version.ReferenceCardId) {
    return false;
  }

  // Must have overlapping dates
  return datesOverlap(
    component.EffectiveFrom,
    component.EffectiveTo,
    version.effectiveFrom,
    version.effectiveTo
  );
}

/**
 * Check if two date ranges overlap
 */
function datesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {

  const s1 = new Date(start1);
  const e1 = end1 ? new Date(end1) : new Date('9999-12-31');
  const s2 = new Date(start2);
  const e2 = end2 ? new Date(end2) : new Date('9999-12-31');

  // No overlap if one range ends before the other starts
  return s1 <= e2 && s2 <= e1;
}
```

### Examples

**Example 1: Ongoing Component**
```
Component:  Jan 1, 2024 → [ongoing]
Version 1:  Jan 1, 2024 → Dec 31, 2024   ✓ Appears
Version 2:  Jan 1, 2025 → Dec 31, 2025   ✓ Appears
Version 3:  Jan 1, 2026 → Dec 31, 2026   ✓ Appears
```

**Example 2: Limited Time Component**
```
Component:  Jul 1, 2025 → Sep 30, 2025
Version 1:  Jan 1, 2025 → Dec 31, 2025   ✓ Appears (partial overlap)
Version 2:  Jan 1, 2026 → Dec 31, 2026   ✗ Does not appear
```

**Example 3: Future Component**
```
Component:  Jan 1, 2026 → [ongoing]
Version 1:  Jan 1, 2025 → Dec 31, 2025   ✗ Does not appear
Version 2:  Jan 1, 2026 → Dec 31, 2026   ✓ Appears
```

### UI Implications

**When Creating/Editing Component:**
- User sets dates
- System shows which versions will include this component
- **Informational only** - user accepts or changes dates

**When Viewing Version:**
- System automatically loads components with overlapping dates
- No manual selection needed
- Changes to component dates immediately affect which versions show it

---

## Edge Cases and Error Handling

### 1. Component Date Changes

**Case: Component dates changed, now applies to different versions**
```typescript
// Before: Component Jan 1 - Dec 31, 2025
// Appears on: 2025 Version

// User changes to: Jan 1 - Dec 31, 2026
// Now appears on: 2026 Version

// No manual linking needed - automatically handled
```

**UI Behavior:**
- When saving component, show which versions are affected
- "This will add/remove the component from X versions"
- User can confirm or adjust dates

### 2. Version Date Changes

**Case: Version dates changed, now includes different components**
```typescript
// Before: Version Jan 1 - Dec 31, 2025
// Includes: Component A (Jan - Dec 2025)

// User changes version to: Jan 1 - Jun 30, 2025
// Now includes: Component A (partial overlap still counts)
// May exclude: Component B (Jul - Dec 2025) if dates no longer overlap
```

**UI Behavior:**
- Show component count change in real-time
- "This will affect X components (Y added, Z removed)"

### 3. No Components for Version

**Case: Version has no components with overlapping dates**
```
Active Components (0)
Credits (0)
  No credits available for this period

Perks (0)
  No perks available for this period

Multipliers (0)
  No multipliers available for this period
```

**Action:**
- Show message encouraging creation of components
- Link to create new component with pre-filled dates

### 4. Component Without ReferenceCardId

**Case: Data integrity issue - component missing ReferenceCardId**
```typescript
// Component with no ReferenceCardId won't appear on any version
// Validation prevents this at creation
async function validateComponent(data: ComponentFormData): ValidationResult {
  if (!data.referenceCardId) {
    return { valid: false, error: 'Card selection is required' };
  }
  return { valid: true };
}
```

### 5. Deleting Component

**Case: Component is being used by multiple versions**
```
⚠️ Delete Component

This component appears on 3 versions:
• 2024 Benefits (Jan 1 - Dec 31, 2024)
• 2025 Benefits (Jan 1 - ongoing)  [Active]
• 2026 Benefits (Jan 1 - Dec 31, 2026)

Deleting this component will remove it from all these versions.

[Cancel] [Delete Component]
```

### 6. Date Validation

**Required Validations:**
- EffectiveFrom must be valid date
- EffectiveTo must be after EffectiveFrom (if provided)
- Warn if creating component for past dates
- Warn if component dates span multiple years

---

## Technical Implementation

### Service Layer

```typescript
// services/ComponentService.ts

export class ComponentService {

  /**
   * Save component and automatically update pointer arrays
   */
  static async saveComponent(
    componentData: CardCredit | CardPerk | CardMultiplier,
    componentType: 'credits' | 'perks' | 'multipliers'
  ): Promise<void> {

    const batch = db.batch();
    const collectionName = this.getCollectionName(componentType);

    // 1. Save component
    const componentRef = db.collection(collectionName).doc(componentData.id);
    batch.set(componentRef, componentData);

    // 2. Get all versions for this card
    const versions = await CardService.getVersionsByReferenceCardId(
      componentData.ReferenceCardId
    );

    // 3. Update pointer arrays based on date overlap
    for (const version of versions) {
      const shouldInclude = this.datesOverlap(
        componentData.EffectiveFrom,
        componentData.EffectiveTo,
        version.effectiveFrom,
        version.effectiveTo
      );

      const versionRef = version.source === 'credit_cards' ?
        db.collection('credit_cards').doc(version.id) :
        db.collection('credit_cards_history').doc(version.id);

      const arrayField = this.getArrayFieldName(componentType);

      if (shouldInclude) {
        // Add to pointer array if dates overlap
        batch.update(versionRef, {
          [arrayField]: arrayUnion({ id: componentData.id }),
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Remove from pointer array if dates don't overlap
        batch.update(versionRef, {
          [arrayField]: arrayRemove({ id: componentData.id }),
          lastUpdated: new Date().toISOString()
        });
      }
    }

    await batch.commit();
  }

  /**
   * Delete component and remove from all pointer arrays
   */
  static async deleteComponent(
    componentId: string,
    componentType: 'credits' | 'perks' | 'multipliers'
  ): Promise<void> {

    const batch = db.batch();
    const collectionName = this.getCollectionName(componentType);
    const arrayField = this.getArrayFieldName(componentType);

    // 1. Get component to find ReferenceCardId
    const componentDoc = await db.collection(collectionName).doc(componentId).get();
    if (!componentDoc.exists) {
      throw new Error('Component not found');
    }

    const referenceCardId = componentDoc.data()!.ReferenceCardId;

    // 2. Get all versions for this card
    const versions = await CardService.getVersionsByReferenceCardId(referenceCardId);

    // 3. Remove from all pointer arrays
    for (const version of versions) {
      const versionRef = version.source === 'credit_cards' ?
        db.collection('credit_cards').doc(version.id) :
        db.collection('credit_cards_history').doc(version.id);

      batch.update(versionRef, {
        [arrayField]: arrayRemove({ id: componentId }),
        lastUpdated: new Date().toISOString()
      });
    }

    // 4. Delete component document
    batch.delete(db.collection(collectionName).doc(componentId));

    await batch.commit();
  }

  /**
   * Get all components for a version (using pointer arrays)
   */
  static async getComponentsForVersion(
    version: CreditCardDetails
  ): Promise<{
    credits: CardCredit[];
    perks: CardPerk[];
    multipliers: CardMultiplier[];
  }> {

    // Use pointer arrays for efficient lookup
    const creditIds = version.Credits.map(c => c.id);
    const perkIds = version.Perks.map(p => p.id);
    const multiplierIds = version.Multipliers.map(m => m.id);

    const [credits, perks, multipliers] = await Promise.all([
      this.getComponentsByIds('credit_cards_credits', creditIds),
      this.getComponentsByIds('credit_cards_perks', perkIds),
      this.getComponentsByIds('credit_cards_multipliers', multiplierIds)
    ]);

    return { credits, perks, multipliers };
  }

  /**
   * Get components by IDs
   */
  private static async getComponentsByIds(
    collection: string,
    ids: string[]
  ): Promise<any[]> {

    if (ids.length === 0) return [];

    // Firestore 'in' query limit is 10, so batch if needed
    const components: any[] = [];

    for (let i = 0; i < ids.length; i += 10) {
      const batchIds = ids.slice(i, i + 10);
      const snapshot = await db.collection(collection)
        .where(FieldPath.documentId(), 'in', batchIds)
        .get();

      components.push(...snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    }

    return components;
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
    const e1 = end1 ? new Date(end1) : new Date('9999-12-31');
    const s2 = new Date(start2);
    const e2 = end2 ? new Date(end2) : new Date('9999-12-31');

    return s1 <= e2 && s2 <= e1;
  }

  private static getCollectionName(type: string): string {
    return type === 'credits' ? 'credit_cards_credits' :
           type === 'perks' ? 'credit_cards_perks' :
           'credit_cards_multipliers';
  }

  private static getArrayFieldName(type: string): string {
    return type === 'credits' ? 'Credits' :
           type === 'perks' ? 'Perks' :
           'Multipliers';
  }
}

  /**
   * Get all versions that a component applies to
   */
  static async getVersionsForComponent(
    component: CardCredit | CardPerk | CardMultiplier
  ): Promise<CreditCardVersionSummary[]> {

    // Get all versions for this card
    const versions = await CardService.getVersionsByReferenceCardId(
      component.ReferenceCardId
    );

    // Filter by date overlap
    return versions.filter(version =>
      this.datesOverlap(
        component.EffectiveFrom,
        component.EffectiveTo,
        version.effectiveFrom,
        version.effectiveTo
      )
    );
  }

  /**
   * Check if two date ranges overlap
   */
  static datesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {

    const s1 = new Date(start1);
    const e1 = end1 ? new Date(end1) : new Date('9999-12-31');
    const s2 = new Date(start2);
    const e2 = end2 ? new Date(end2) : new Date('9999-12-31');

    return s1 <= e2 && s2 <= e1;
  }

  /**
   * Preview which versions will be affected by component date change
   */
  static async previewComponentDateChange(
    componentId: string,
    newEffectiveFrom: string,
    newEffectiveTo: string
  ): Promise<{
    versionsAdded: CreditCardVersionSummary[];
    versionsRemoved: CreditCardVersionSummary[];
  }> {

    const component = await this.getComponent(componentId);
    const allVersions = await CardService.getVersionsByReferenceCardId(
      component.ReferenceCardId
    );

    // Current associations
    const currentVersions = allVersions.filter(v =>
      this.datesOverlap(
        component.EffectiveFrom,
        component.EffectiveTo,
        v.effectiveFrom,
        v.effectiveTo
      )
    );

    // New associations
    const newVersions = allVersions.filter(v =>
      this.datesOverlap(
        newEffectiveFrom,
        newEffectiveTo,
        v.effectiveFrom,
        v.effectiveTo
      )
    );

    const currentIds = new Set(currentVersions.map(v => v.id));
    const newIds = new Set(newVersions.map(v => v.id));

    const versionsAdded = newVersions.filter(v => !currentIds.has(v.id));
    const versionsRemoved = currentVersions.filter(v => !newIds.has(v.id));

    return { versionsAdded, versionsRemoved };
  }
}
```

### Updated Card Service

```typescript
// services/CardService.ts

export class CardService {

  /**
   * Create new card (updated - no pointer arrays)
   */
  static async createCard(data: CreateCardFormData): Promise<string> {
    const cardData: CreditCardDetails = {
      id: data.referenceCardId,
      CardName: data.cardName,
      CardIssuer: data.cardIssuer,
      CardNetwork: data.cardNetwork,
      CardDetails: data.cardDetails,
      // ... all other fields
      VersionName: data.versionName,
      ReferenceCardId: data.referenceCardId,
      IsActive: data.setAsActive,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || '',
      lastUpdated: new Date().toISOString()
      // NO Perks, Credits, Multipliers arrays!
    };

    const batch = db.batch();

    if (data.setAsActive) {
      batch.set(db.collection('credit_cards').doc(data.referenceCardId), cardData);
    }

    const historyId = this.generateUUID();
    batch.set(db.collection('credit_cards_history').doc(historyId), cardData);

    await batch.commit();

    return data.referenceCardId;
  }

  /**
   * Get card with component counts (calculated)
   */
  static async getCardWithComponents(
    cardId: string,
    isHistory: boolean = false
  ): Promise<CardWithComponents> {

    const card = await this.getCardById(cardId, isHistory);

    if (!card) {
      throw new Error('Card not found');
    }

    const components = await ComponentAssociationService.getComponentsForVersion(card);

    return {
      ...card,
      componentCounts: {
        credits: components.credits.length,
        perks: components.perks.length,
        multipliers: components.multipliers.length
      },
      components
    };
  }
}

interface CardWithComponents extends CreditCardDetails {
  componentCounts: {
    credits: number;
    perks: number;
    multipliers: number;
  };
  components: {
    credits: CardCredit[];
    perks: CardPerk[];
    multipliers: CardMultiplier[];
  };
}
```

### React Hooks

```typescript
// hooks/useVersionComponents.ts

export function useVersionComponents(version: CreditCardDetails | null) {
  const [components, setComponents] = useState<{
    credits: CardCredit[];
    perks: CardPerk[];
    multipliers: CardMultiplier[];
  }>({
    credits: [],
    perks: [],
    multipliers: []
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!version) return;

    setLoading(true);

    ComponentAssociationService.getComponentsForVersion(version)
      .then(setComponents)
      .finally(() => setLoading(false));

  }, [version?.id, version?.effectiveFrom, version?.effectiveTo]);

  return { components, loading };
}

// hooks/useComponentVersions.ts

export function useComponentVersions(component: CardCredit | CardPerk | CardMultiplier | null) {
  const [versions, setVersions] = useState<CreditCardVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!component) return;

    setLoading(true);

    ComponentAssociationService.getVersionsForComponent(component)
      .then(setVersions)
      .finally(() => setLoading(false));

  }, [component?.id, component?.EffectiveFrom, component?.EffectiveTo]);

  return { versions, loading };
}
```

---

## Summary

### Key Principles

1. **No Manual Linking** - All component-version associations are calculated automatically
2. **Dates Are Truth** - Date overlap is the single source of truth for which components appear on which versions
3. **Real-Time Calculation** - Component lists are calculated on-demand based on current date ranges
4. **Simplified Data Model** - No pointer arrays, no explicit linking tables

### What This Means for Users

**Creating a Component:**
1. Select which card it belongs to (ReferenceCardId)
2. Set date range (EffectiveFrom, EffectiveTo)
3. Save
4. Component automatically appears on all versions with overlapping dates

**Creating a Version:**
1. Set version date range
2. Components with overlapping dates automatically appear
3. No manual selection needed

**Editing Dates:**
- Change component dates → automatically adds/removes from versions
- Change version dates → automatically includes/excludes components
- System shows preview of changes before saving

### Benefits

- **Simpler to use** - No linking UI complexity
- **Fewer errors** - Can't forget to link/unlink components
- **Date-driven** - Dates are already required, so no extra data needed
- **Easier to maintain** - No pointer arrays to keep in sync
- **Automatic updates** - Change dates once, associations update everywhere

### Trade-offs

**Pro:**
- Extremely simple and logical
- Impossible to have component "linked" to wrong version by mistake
- Dates drive everything

**Con:**
- Cannot have component appear on version outside its date range (edge case)
- Cannot manually exclude component from a version even if dates overlap (edge case)

**Solution for edge cases:**
- Create separate components with specific date ranges
- Use more precise dates to control exactly when components appear

This design is optimized for the 99% case where date-based association is exactly what's needed.
