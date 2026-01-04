/**
* ------------------------------------------------------------------------------------------------
* 
* SHARED API AND CLIENT TYPES
* 
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
* Represents a perk associated with a credit card
*
* Date Handling:
* - EffectiveFrom: ISO date string when perk becomes available (e.g., "2025-01-01")
* - EffectiveTo: ISO date string when perk expires, or "9999-12-31" for ongoing perks
*
* The sentinel value "9999-12-31" represents an ongoing/present perk with no end date.
* This value is used instead of empty string for better Firestore indexing and queries.
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
*
* The sentinel value "9999-12-31" represents an ongoing/present credit with no end date.
* This value is used instead of empty string for better Firestore indexing and queries.
*
* Anniversary-Based Credits:
* - isAnniversaryBased: When true, credit periods are based on user's card open date
*   rather than calendar year. Anniversary credits are always annual (one year duration).
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

  // Anniversary-based credit fields
  isAnniversaryBased?: boolean;  // true = anniversary-based (always annual), false/undefined = calendar
}

/**
* Represents a rewards multiplier for specific spending categories
*
* Date Handling:
* - EffectiveFrom: ISO date string when multiplier becomes available (e.g., "2025-01-01")
* - EffectiveTo: ISO date string when multiplier expires, or "9999-12-31" for ongoing multipliers
*
* The sentinel value "9999-12-31" represents an ongoing/present multiplier with no end date.
* This value is used instead of empty string for better Firestore indexing and queries.
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
* Represents detailed information about a credit card including all benefits and features.
* This is the standard format for credit card data in the database and API responses.
*
* Date Handling:
* - effectiveFrom: ISO date string when version became active (e.g., "2025-01-01")
* - effectiveTo: ISO date string when version ended, or "9999-12-31" for current/ongoing versions
*
* The sentinel value "9999-12-31" represents an ongoing version with no end date.
*
* Note: Components (credits, perks, multipliers) are queried separately by ReferenceCardId.
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
  componentsLastUpdated?: string; // ISO timestamp - updated when any component changes
}

