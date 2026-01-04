/**
 * ================================================================================================
 * RECARD CARD MANAGER - CREDIT CARD STRUCTURE TYPE DEFINITIONS
 * ================================================================================================
 *
 * This file contains type definitions for the credit card structure and components.
 * These types define the core data model for credit cards, perks, credits, and multipliers.
 *
 * IMPORTANT: Keep these types in sync with:
 * - Server/types/credit-card-types.ts
 * - Client/recardclient/src/types/CreditCardTypes.ts
 *
 * DATE HANDLING - ONGOING SENTINEL VALUE:
 * All EffectiveTo/effectiveTo fields use "9999-12-31" as a sentinel value for ongoing/present
 * items with no end date. This replaces the use of empty strings for better Firestore indexing.
 *
 * Benefits:
 * - Enables efficient composite indexes like (ReferenceCardId ASC, EffectiveTo DESC)
 * - Natural sorting behavior (ongoing items appear last/first depending on sort direction)
 * - Simplifies date overlap calculations
 * - Standard practice in temporal databases
 *
 * ================================================================================================
 */

/**
 * ------------------------------------------------------------------------------------------------
 * CREDIT CARD NAME (Top-Level Identity)
 * ------------------------------------------------------------------------------------------------
 */

/**
 * Represents the top-level identity of a credit card in the credit_cards_names collection.
 * This allows cards to exist independently from their versions.
 * 
 * The document ID in Firestore equals the ReferenceCardId (immutable, unique identifier).
 */
export interface CreditCardName {
  CardName: string;
  CardIssuer: string;
  // Note: ReferenceCardId is the document ID in Firestore, not stored as a field
}

/**
 * ------------------------------------------------------------------------------------------------
 * CREDIT CARD TYPES
 * ------------------------------------------------------------------------------------------------
 */

/**
 * Represents a credit card in the system for display purposes.
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
  selected?: boolean;      // Whether the card is selected by the user (optional, for user context)
  isDefaultCard?: boolean; // Whether this is the user's default card (optional, for user context)
}

/**
 * Represents detailed information about a credit card including all benefits and features.
 * This is the standard format for credit card data in Firestore and API responses.
 *
 * Date Handling:
 * - effectiveFrom: ISO date string when version became active (e.g., "2025-01-01")
 * - effectiveTo: ISO date string when version ended, or "9999-12-31" for current/ongoing versions
 *
 * Note: Components (credits, perks, multipliers) are stored separately and queried by ReferenceCardId.
 */
export interface CreditCardDetails extends CreditCard {
  AnnualFee: number | null;
  ForeignExchangeFee: string;
  ForeignExchangeFeePercentage: number | null;
  RewardsCurrency: string;
  PointsPerDollar: number | null;
  VersionName: string;        // Name/label for this version
  ReferenceCardId: string;    // Reference to the base card this version belongs to
  IsActive: boolean;          // Whether this version is currently active
  // Versioning fields
  effectiveFrom: string;   // ISO date: "2025-01-01"
  effectiveTo: string;     // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  lastUpdated: string;     // ISO timestamp
}

/**
 * Enhanced version of CreditCardDetails with full component objects embedded.
 * Used for CardManager operations where full component data is needed in one object.
 *
 * Date Handling:
 * - effectiveFrom: ISO date string when version became active (e.g., "2025-01-01")
 * - effectiveTo: ISO date string when version ended, or "9999-12-31" for current/ongoing versions
 */
export interface CreditCardDetailsEnhanced extends CreditCard {
  AnnualFee: number | null;
  ForeignExchangeFee: string;
  ForeignExchangeFeePercentage: number | null;
  RewardsCurrency: string;
  PointsPerDollar: number | null;
  Perks: CardPerk[];          // Full perk objects with all details
  Credits: CardCredit[];      // Full credit objects with all details
  Multipliers: CardMultiplier[]; // Full multiplier objects with all details
  VersionName: string;        // Name/label for this version
  ReferenceCardId: string;    // Reference to the base card this version belongs to
  IsActive: boolean;          // Whether this version is currently active
  // Versioning fields
  effectiveFrom: string;   // ISO date: "2025-01-01"
  effectiveTo: string;     // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  lastUpdated: string;     // ISO timestamp
}

/**
 * ------------------------------------------------------------------------------------------------
 * COMPONENT TYPES
 * ------------------------------------------------------------------------------------------------
 */

/**
 * Represents a perk associated with a credit card
 *
 * Date Handling:
 * - EffectiveFrom: ISO date string when perk becomes available (e.g., "2025-01-01")
 * - EffectiveTo: ISO date string when perk expires, or "9999-12-31" for ongoing perks
 */
export interface CardPerk {
  id: string;
  ReferenceCardId: string;
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;   // ISO date: "2025-01-01"
  EffectiveTo: string;      // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  LastUpdated: string;
}

/**
 * Represents a credit/benefit associated with a credit card
 *
 * Date Handling:
 * - EffectiveFrom: ISO date string when credit becomes available (e.g., "2025-01-01")
 * - EffectiveTo: ISO date string when credit expires, or "9999-12-31" for ongoing credits
 */
export interface CardCredit {
  id: string;
  ReferenceCardId: string;
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Value: number;
  TimePeriod: string;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;   // ISO date: "2025-01-01"
  EffectiveTo: string;      // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  LastUpdated: string;
}

/**
 * Represents a rewards multiplier for specific spending categories
 *
 * Date Handling:
 * - EffectiveFrom: ISO date string when multiplier becomes available (e.g., "2025-01-01")
 * - EffectiveTo: ISO date string when multiplier expires, or "9999-12-31" for ongoing multipliers
 */
export interface CardMultiplier {
  id: string;
  ReferenceCardId: string;
  Name: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Multiplier: number | null;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;   // ISO date: "2025-01-01"
  EffectiveTo: string;      // ISO date: "2025-12-31" or "9999-12-31" for ongoing
  LastUpdated: string;
}

/**
 * ------------------------------------------------------------------------------------------------
 * VERSION MANAGEMENT TYPES
 * ------------------------------------------------------------------------------------------------
 */

/**
 * Response type for credit card version summary
 */
export interface CreditCardVersionSummary {
  id: string;
  VersionName: string;
  IsActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  lastUpdated: string;
}

/**
 * Request parameters for getting versions of a specific credit card
 */
export interface CreditCardVersionsParams {
  referenceCardId: string;
}

/**
 * Response type for the worker credit card versions endpoint
 */
export type CreditCardVersionsListResponse = CreditCardVersionSummary[];

/**
 * Response type for the worker credit cards list endpoint
 */
export type CreditCardReferenceListResponse = string[];
