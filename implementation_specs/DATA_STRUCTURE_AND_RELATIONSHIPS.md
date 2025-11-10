# ReCard Credit Card Data Structure and Relationships

## Overview

This document describes the complete data structure for credit cards in the ReCard system, including how credit cards, credits, perks, and multipliers are stored and related to each other across multiple Firestore collections.

## High-Level Architecture

The ReCard credit card data is organized using a **ReferenceCardId-based architecture** where:

1. **Credit Cards** store basic card information without embedded components
2. **Components** (credits, perks, multipliers) are stored separately with `ReferenceCardId` linking them to cards
3. **History** maintains versioned snapshots of credit cards over time
4. **Date Ranges** determine which components apply to which card versions

This design allows for:
- Efficient versioning and change tracking through date ranges
- Components automatically associate with card versions based on date overlap
- Independent lifecycle management for each component type
- Historical analysis and rollback capabilities
- No redundant data storage - components are single sources of truth

---

## Database Access Pattern

### Internal Tool with Direct Firestore Access

The Card Manager is an **internal administrative tool** that connects directly to Firestore using the Firebase Admin SDK, bypassing the need for a separate API layer.

**Why Direct Access?**
- **Simplicity**: No need to build/maintain CRUD API endpoints
- **Full Control**: Direct access to batch writes, transactions, and complex queries
- **Real-time Updates**: Leverage Firestore's built-in real-time listeners
- **Faster Development**: Reduced complexity and faster iteration

**Firebase Admin SDK Configuration:**

```typescript
// CardManager/config/firebase-admin.ts
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

**Shared Types and Constants:**

The Card Manager reuses type definitions and constants from the Server codebase:

```typescript
// Import types from Server
import {
  CreditCardDetails,
  CardCredit,
  CardPerk,
  CardMultiplier
} from '../../Server/types/credit-card-types';

// Import constants from Server
import { ONGOING_SENTINEL_DATE } from '../../Server/constants/dates';
```

**Security Considerations:**

1. **Credentials**: Store service account keys outside version control (`.env` file + `.gitignore`)
2. **Access Control**: Tool is for internal administrators only - implement authentication
3. **Validation**: Apply same data validation rules as the production API
4. **Audit Trail**: Consider logging all changes for accountability

**Direct Firestore Operations:**

```typescript
// Read operations
const card = await db.collection('credit_cards').doc('amex-gold').get();

// Query with composite indexes
const credits = await db.collection('credit_cards_credits')
  .where('ReferenceCardId', '==', 'amex-gold')
  .orderBy('EffectiveFrom', 'desc')
  .get();

// Batch writes for atomicity
const batch = db.batch();
batch.set(historyRef, versionData);
batch.update(currentRef, updates);
await batch.commit();
```

---

## Firestore Collections

### 1. `credit_cards` Collection
**Purpose**: Stores the current active version of each credit card

**Document Structure**:
```typescript
{
  id: string;                      // Document ID (e.g., "amex-gold")
  CardName: string;                // Display name
  CardIssuer: string;              // Issuer name
  CardNetwork: string;             // Network (Visa, Mastercard, Amex, etc.)
  CardDetails: string;             // Additional details
  CardImage?: string;              // Image URL
  CardPrimaryColor?: string;       // Primary brand color
  CardSecondaryColor?: string;     // Secondary brand color
  AnnualFee: number | null;        // Annual fee amount
  ForeignExchangeFee: string;      // FX fee description
  ForeignExchangeFeePercentage: number | null;
  RewardsCurrency: string;         // Points/miles currency
  PointsPerDollar: number | null;  // Base earning rate
  VersionName: string;             // Version label
  ReferenceCardId: string;         // Reference to base card
  IsActive: boolean;               // Currently active version
  effectiveFrom: string;           // ISO date when version became active (e.g., "2025-01-01")
  effectiveTo: string;             // ISO date when version ended, or "9999-12-31" for ongoing
  lastUpdated: string;             // ISO date of last modification
  // Note: Perks, Credits, Multipliers are NOT stored here - queried separately by ReferenceCardId
}
```

**Key Points**:
- Document ID is the human-readable card identifier (e.g., "amex-gold")
- `ReferenceCardId` points to the base card this version belongs to
- Components (perks, credits, multipliers) are **NOT stored in cards** - they are separate documents linked by `ReferenceCardId`
- Components are queried separately using composite indexes on `(ReferenceCardId, EffectiveFrom)`

---

### 2. `credit_cards_history` Collection
**Purpose**: Stores historical versions of credit cards for version tracking and rollback

**Document Structure**: Same as `credit_cards` with these differences:
```typescript
{
  id: string;                      // UUID (randomly generated)
  ReferenceCardId: string;         // Points to original card ID (e.g., "amex-gold")
  // ... all other fields same as credit_cards
}
```

**Key Points**:
- Document ID is a UUID (not human-readable)
- `ReferenceCardId` links back to the original credit card
- Contains complete snapshot of card at specific point in time
- Multiple versions can exist for the same `ReferenceCardId`
- Versions are sorted by `effectiveFrom` date (newest first)

**Versioning Flow**:
1. When a card is updated, the current version is copied to history
2. A new UUID is generated as the history document ID
3. The `ReferenceCardId` field stores the original card ID
4. `effectiveFrom` marks when this version became active
5. Previous versions get an `effectiveTo` timestamp

---

### 3. `credit_cards_perks` Collection
**Purpose**: Stores all perk objects referenced by credit cards

**Document Structure**:
```typescript
{
  id: string;              // Document ID (unique perk identifier)
  ReferenceCardId: string; // Links to card (e.g., "amex-gold")
  Title: string;           // Perk title
  Category: string;        // Primary category
  SubCategory: string;     // Sub-category for organization
  Description: string;     // Detailed description
  Requirements: string;    // Eligibility requirements
  Details?: string;        // Additional details (optional)
  EffectiveFrom: string;   // ISO date when perk became available
  EffectiveTo: string;     // ISO date when perk ended, or "9999-12-31" for ongoing
  LastUpdated: string;     // ISO date of last modification
}
```

**Key Points**:
- Each perk is a standalone document
- `ReferenceCardId` links back to the card(s) that have this perk
- Multiple cards can reference the same perk
- Perks have their own lifecycle (EffectiveFrom/To dates)
- Composite index on `(ReferenceCardId ASC, EffectiveFrom DESC)` for efficient queries

---

### 4. `credit_cards_credits` Collection
**Purpose**: Stores all credit/benefit objects referenced by credit cards

**Document Structure**:
```typescript
{
  id: string;              // Document ID (unique credit identifier)
  ReferenceCardId: string; // Links to card (e.g., "amex-gold")
  Title: string;           // Credit title
  Category: string;        // Primary category
  SubCategory: string;     // Sub-category for organization
  Description: string;     // Detailed description
  Value: string;           // Credit value (e.g., "$300")
  TimePeriod: string;      // Frequency (monthly, annually, etc.)
  Requirements: string;    // Eligibility/usage requirements
  Details?: string;        // Additional details (optional)
  EffectiveFrom: string;   // ISO date when credit became available
  EffectiveTo: string;     // ISO date when credit ended, or "9999-12-31" for ongoing
  LastUpdated: string;     // ISO date of last modification
}
```

**Key Points**:
- Each credit is a standalone document
- `ReferenceCardId` links back to the card(s) that have this credit
- Credits track value and time period for user benefit tracking
- Composite index on `(ReferenceCardId ASC, EffectiveFrom DESC)` for efficient queries

---

### 5. `credit_cards_multipliers` Collection
**Purpose**: Stores all rewards multiplier objects referenced by credit cards

**Document Structure**:
```typescript
{
  id: string;              // Document ID (unique multiplier identifier)
  ReferenceCardId: string; // Links to card (e.g., "amex-gold")
  Name: string;            // Multiplier name
  Category: string;        // Spending category
  SubCategory: string;     // Sub-category for organization
  Description: string;     // Detailed description
  Multiplier: number | null; // Multiplier value (e.g., 4 for 4x points)
  Requirements: string;    // Eligibility/activation requirements
  Details?: string;        // Additional details (optional)
  EffectiveFrom: string;   // ISO date when multiplier became active
  EffectiveTo: string;     // ISO date when multiplier ended, or "9999-12-31" for ongoing
  LastUpdated: string;     // ISO date of last modification
}
```

**Key Points**:
- Each multiplier is a standalone document
- `ReferenceCardId` links back to the card(s) that have this multiplier
- Tracks category-specific earning rates
- Composite index on `(ReferenceCardId ASC, EffectiveFrom DESC)` for efficient queries

---

## Data Relationships

### Relationship Diagram

```
credit_cards (current version)
    ├─ id: "amex-gold"
    ├─ VersionName: "2025 Benefits"
    ├─ effectiveFrom: "2025-01-01"
    ├─ effectiveTo: "9999-12-31"
    └─ (No pointer arrays stored)
         │
         │ (Components link TO card via ReferenceCardId)
         │
         ├──> credit_cards_perks
         │    ├─ perk-1 {ReferenceCardId: "amex-gold", EffectiveFrom: "2025-01-01", EffectiveTo: "9999-12-31"}
         │    └─ perk-2 {ReferenceCardId: "amex-gold", EffectiveFrom: "2025-01-01", EffectiveTo: "9999-12-31"}
         │
         ├──> credit_cards_credits
         │    ├─ credit-1 {ReferenceCardId: "amex-gold", EffectiveFrom: "2025-01-01", EffectiveTo: "9999-12-31"}
         │    └─ credit-2 {ReferenceCardId: "amex-gold", EffectiveFrom: "2025-01-01", EffectiveTo: "2025-12-31"}
         │
         └──> credit_cards_multipliers
              ├─ mult-1 {ReferenceCardId: "amex-gold", EffectiveFrom: "2025-01-01", EffectiveTo: "9999-12-31"}
              └─ mult-2 {ReferenceCardId: "amex-gold", EffectiveFrom: "2025-01-01", EffectiveTo: "9999-12-31"}

credit_cards_history (all versions)
    ├─ id: "uuid-v1"
    │  ├─ ReferenceCardId: "amex-gold"
    │  ├─ VersionName: "2024 Benefits"
    │  ├─ effectiveFrom: "2024-01-01"
    │  ├─ effectiveTo: "2024-12-31"
    │  └─ (No pointer arrays - components queried by ReferenceCardId + date overlap)
    │
    └─ id: "uuid-v2"
       ├─ ReferenceCardId: "amex-gold"
       ├─ VersionName: "2025 Benefits"
       ├─ effectiveFrom: "2025-01-01"
       ├─ effectiveTo: "9999-12-31"
       ├─ IsActive: true
       └─ (No pointer arrays - components queried by ReferenceCardId + date overlap)
```

### How Components Link to Cards

**One-Way Reference** (Component → Card):
- Components store `ReferenceCardId` field linking them to a card family
- Cards do NOT store references to components (no pointer arrays)
- Query pattern: `where('ReferenceCardId', '==', 'amex-gold')` to get all components for a card
- Date overlap logic determines which components apply to which card versions
- Components can be shared across card families by creating separate documents with different ReferenceCardIds

### Query Patterns

**Get Card with Full Details**:
1. Query `credit_cards` for the card document (returns `CreditCardDetails`)
2. Separately query components by ReferenceCardId using `ComponentsService.getAllComponentsByCardIds()`
3. Client combines card + components for display, or server enriches for OpenAI via `enrichedCardDetailsBuilder()`

**Get All Components for a Card**:
```typescript
// Using ComponentsService with composite indexes
const components = await ComponentsService.getAllComponentsByCardIds(["amex-gold"]);
// Returns: { perks: [...], credits: [...], multipliers: [...] }
// Components are filtered by ReferenceCardId using efficient composite indexes
```

**Get Card Version History**:
```typescript
// Query history by ReferenceCardId
const versions = await db.collection('credit_cards_history')
  .where('ReferenceCardId', '==', 'amex-gold')
  .orderBy('effectiveFrom', 'desc')
  .get();
```

---

## Version Management

### Creating a New Version

**Process**:
1. Copy current card from `credit_cards` to `credit_cards_history`
   - Generate new UUID for history document ID
   - Set `effectiveTo` on previous active version (use current date or "9999-12-31" if ongoing)
   - Mark previous version as `IsActive: false`
2. Update card in `credit_cards` collection
   - Modify card properties (annual fee, rewards rate, etc.)
   - Set new `effectiveFrom` timestamp
   - Set `effectiveTo` to "9999-12-31" for ongoing versions
   - Set `IsActive: true`
3. Create/update component documents separately
   - Add new perks/credits/multipliers to their respective collections
   - Set `ReferenceCardId` to link to the card family (e.g., "amex-gold")
   - Set `EffectiveFrom` and `EffectiveTo` dates (use "9999-12-31" for ongoing components)
   - Components automatically associate with card versions via date overlap logic

**Example Workflow**:
```
Current State:
  credit_cards/amex-gold (v1 active)

Step 1: Copy to History
  credit_cards_history/uuid-v1 (copy of v1, IsActive: false)

Step 2: Update Current
  credit_cards/amex-gold (v2 active, new benefits)

Step 3: Update Components
  credit_cards_credits/new-credit-1 (ReferenceCardId: "amex-gold")
```

### Version Timeline Example

```
Timeline: amex-gold
├─ 2024-01-01 to 2024-12-31: Version "2024 Benefits"
│  ├─ Annual Fee: $250
│  ├─ Credits: [uber-credit, dining-credit]
│  └─ History: credit_cards_history/uuid-v1
│
└─ 2025-01-01 to present: Version "2025 Benefits" (Active)
   ├─ Annual Fee: $275
   ├─ Credits: [uber-credit, streaming-credit, dining-credit]
   └─ Current: credit_cards/amex-gold
```

---

## TypeScript Type Definitions

### Core Card Types

```typescript
/**
 * Base credit card interface (display purposes)
 */
export interface CreditCard {
  id: string;
  CardName: string;
  CardIssuer: string;
  CardNetwork: string;
  CardDetails: string;
  CardImage?: string;
  CardPrimaryColor?: string;
  CardSecondaryColor?: string;
  selected?: boolean;      // User context: selected by user
  isDefaultCard?: boolean; // User context: user's default card
}

/**
 * Credit card with full details
 * Components (perks, credits, multipliers) are queried separately by ReferenceCardId
 */
export interface CreditCardDetails extends CreditCard {
  AnnualFee: number | null;
  ForeignExchangeFee: string;
  ForeignExchangeFeePercentage: number | null;
  RewardsCurrency: string;
  PointsPerDollar: number | null;
  VersionName: string;
  ReferenceCardId: string;
  IsActive: boolean;
  effectiveFrom: string;   // ISO date: "2025-01-01"
  effectiveTo: string;     // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  lastUpdated: string;     // ISO date
}

/**
 * Enhanced card with full component data embedded
 * Used for OpenAI completions and cases where full data is needed in one object
 */
export interface CreditCardDetailsEnhanced extends CreditCard {
  AnnualFee: number | null;
  ForeignExchangeFee: string;
  ForeignExchangeFeePercentage: number | null;
  RewardsCurrency: string;
  PointsPerDollar: number | null;
  Perks: CardPerk[];          // Full perk objects
  Credits: CardCredit[];      // Full credit objects
  Multipliers: CardMultiplier[]; // Full multiplier objects
  VersionName: string;
  ReferenceCardId: string;
  IsActive: boolean;
  effectiveFrom: string;   // ISO date: "2025-01-01"
  effectiveTo: string;     // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  lastUpdated: string;
}
```

### Component Types

```typescript
/**
 * Card perk with full data
 * Linked to cards via ReferenceCardId field
 */
export interface CardPerk {
  id: string;
  ReferenceCardId: string;  // Links this perk to a card family
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;  // ISO date: "2025-01-01"
  EffectiveTo: string;    // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  LastUpdated: string;
}

/**
 * Card credit/benefit with full data
 * Linked to cards via ReferenceCardId field
 */
export interface CardCredit {
  id: string;
  ReferenceCardId: string;  // Links this credit to a card family
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Value: string;
  TimePeriod: string;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;  // ISO date: "2025-01-01"
  EffectiveTo: string;    // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  LastUpdated: string;
}

/**
 * Rewards multiplier with full data
 * Linked to cards via ReferenceCardId field
 */
export interface CardMultiplier {
  id: string;
  ReferenceCardId: string;  // Links this multiplier to a card family
  Name: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Multiplier: number | null;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;  // ISO date: "2025-01-01"
  EffectiveTo: string;    // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  LastUpdated: string;
}
```

### Version Management Types

```typescript
/**
 * Version summary for listing card versions
 */
export interface CreditCardVersionSummary {
  id: string;              // History document UUID
  VersionName: string;     // Version label
  IsActive: boolean;       // Currently active version
  effectiveFrom: string;   // When version became active
  effectiveTo: string;     // When version ended (optional)
  lastUpdated: string;     // Last modification timestamp
}

/**
 * Request parameters for version queries
 */
export interface CreditCardVersionsParams {
  referenceCardId: string;
}

/**
 * Response type for version listings
 */
export type CreditCardVersionsListResponse = CreditCardVersionSummary[];
```

---

## Database Indexes

### Composite Indexes

The following composite indexes are configured for efficient queries:

```json
{
  "collectionGroup": "credit_cards_perks",
  "fields": [
    {"fieldPath": "ReferenceCardId", "order": "ASCENDING"},
    {"fieldPath": "EffectiveFrom", "order": "DESCENDING"}
  ]
}

{
  "collectionGroup": "credit_cards_credits",
  "fields": [
    {"fieldPath": "ReferenceCardId", "order": "ASCENDING"},
    {"fieldPath": "EffectiveFrom", "order": "DESCENDING"}
  ]
}

{
  "collectionGroup": "credit_cards_multipliers",
  "fields": [
    {"fieldPath": "ReferenceCardId", "order": "ASCENDING"},
    {"fieldPath": "EffectiveFrom", "order": "DESCENDING"}
  ]
}
```

**Purpose**: Enable efficient querying of components by card ID, sorted by effective date (newest first)

**Usage**:
```typescript
// Get all credits for a card, newest first
const credits = await db.collection('credit_cards_credits')
  .where('ReferenceCardId', '==', cardId)
  .orderBy('EffectiveFrom', 'desc')
  .get();
```

---

## Data Entry Templates

### Sample Credit Card

```json
{
  "id": "amex-gold",
  "VersionName": "2025 Benefits",
  "ReferenceCardId": "amex-gold",
  "IsActive": true,
  "CardName": "American Express Gold Card",
  "CardIssuer": "American Express",
  "CardNetwork": "American Express",
  "CardDetails": "Premium dining and travel rewards card",
  "CardImage": "https://example.com/amex-gold.png",
  "CardPrimaryColor": "#C89B3C",
  "CardSecondaryColor": "#1F1F1F",
  "effectiveFrom": "2025-01-01T00:00:00.000Z",
  "effectiveTo": "9999-12-31",
  "lastUpdated": "2025-01-01T00:00:00.000Z",
  "AnnualFee": 250,
  "ForeignExchangeFee": "None",
  "ForeignExchangeFeePercentage": 0,
  "RewardsCurrency": "Membership Rewards Points",
  "PointsPerDollar": 1
}
```

### Sample Credit

```json
{
  "id": "amex-gold-credit-dining",
  "ReferenceCardId": "amex-gold",
  "Title": "Dining Credit",
  "Category": "Food & Dining",
  "SubCategory": "Restaurant Credit",
  "Description": "Monthly dining credit for eligible purchases",
  "Value": "$10",
  "TimePeriod": "monthly",
  "Requirements": "Must enroll and use at eligible restaurants",
  "Details": "Automatically credited to statement within 2-4 weeks",
  "EffectiveFrom": "2025-01-01T00:00:00.000Z",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-01-01T00:00:00.000Z"
}
```

**Note**: `EffectiveTo` is set to "9999-12-31" to indicate this is an ongoing credit with no end date.

### Sample Perk

```json
{
  "id": "amex-gold-perk-travel-insurance",
  "ReferenceCardId": "amex-gold",
  "Title": "Travel Insurance",
  "Category": "Travel Protection",
  "SubCategory": "Insurance",
  "Description": "Comprehensive travel insurance coverage",
  "Requirements": "Pay for travel with card",
  "Details": "Covers trip cancellation, delays, and lost baggage",
  "EffectiveFrom": "2025-01-01T00:00:00.000Z",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-01-01T00:00:00.000Z"
}
```

### Sample Multiplier

```json
{
  "id": "amex-gold-mult-dining",
  "ReferenceCardId": "amex-gold",
  "Name": "Dining Multiplier",
  "Category": "Food & Dining",
  "SubCategory": "Restaurants",
  "Description": "Enhanced earning at restaurants",
  "Multiplier": 4,
  "Requirements": "Automatically applied at eligible merchants",
  "Details": "Earn 4x points on dining purchases worldwide",
  "EffectiveFrom": "2025-01-01T00:00:00.000Z",
  "EffectiveTo": "9999-12-31",
  "LastUpdated": "2025-01-01T00:00:00.000Z"
}
```

---

## Key Insights for Dashboard Development

### 1. Component Query Strategy
When displaying a card with full details:
- Components are queried separately by `ReferenceCardId` using composite indexes
- No pointer arrays to maintain - components link themselves to cards
- Efficient parallel queries fetch all component types simultaneously
- Date overlap logic determines which components belong to which card versions

### 2. Version Tracking
- `credit_cards` always contains the current/active version
- `credit_cards_history` stores all versions (including copies of active)
- Each version has unique UUID in history, but shares `ReferenceCardId`
- Versions can be filtered by `IsActive` flag

### 3. Component Lifecycle
- Components have independent lifecycles from cards
- Each component links to one card family via `ReferenceCardId`
- Components can be active/inactive via `EffectiveFrom`/`EffectiveTo` dates
- Use "9999-12-31" as `EffectiveTo` for ongoing components with no end date
- To share a component across multiple cards, create separate documents with different ReferenceCardIds

### 4. Dashboard Requirements
For the Card Manager dashboard, you will need to:

**Card Operations**:
- List all unique cards (from `credit_cards` or by `ReferenceCardId` in history)
- View current version and all historical versions
- Create new card versions
- Update current card version
- Activate/deactivate specific versions

**Component Operations**:
- Create new perks/credits/multipliers with `ReferenceCardId` field
- Update existing components (title, dates, requirements, etc.)
- Set component `ReferenceCardId` to link to a card family
- Query all components for a card using `ComponentsService`
- Track component effective dates (use "9999-12-31" for ongoing)

**Version Operations**:
- Copy current to history before updates
- Set `effectiveTo` on previous versions
- Generate UUIDs for history documents
- Maintain `ReferenceCardId` relationships

**Publishing Flow**:
1. Edit card in staging/preview mode
2. Update component collections as needed
3. Copy current version to history
4. Update `credit_cards` with new version
5. Mark new version as active (`IsActive: true`)
6. Push updates to production Firestore

---

## Summary

The ReCard credit card data system uses a **ReferenceCardId-based, versioned architecture** with five main collections:

1. **credit_cards**: Current active card versions
2. **credit_cards_history**: All historical card versions
3. **credit_cards_perks**: All perk objects
4. **credit_cards_credits**: All credit objects
5. **credit_cards_multipliers**: All multiplier objects

Components store `ReferenceCardId` to link to card families, while cards **do not** store pointer arrays. This design enables:
- Simple component management (no pointer array maintenance)
- Flexible versioning with date-based component association
- Efficient queries through composite indexes on `(ReferenceCardId, EffectiveFrom)` and `(ReferenceCardId, EffectiveTo)`
- Sentinel value "9999-12-31" for ongoing dates, enabling better firestore indexing and sorting

The Card Manager dashboard will need to manage these collections, handle version creation/activation, and query components by ReferenceCardId with date overlap logic.
