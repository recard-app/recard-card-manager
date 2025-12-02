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
  selected?: boolean;
  isDefaultCard?: boolean;
}

/**
* Represents a perk associated with a credit card
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
  EffectiveFrom: string;
  EffectiveTo: string;
  LastUpdated: string;
}

/**
* Represents a credit/benefit associated with a credit card
*/
export interface CardCredit {
  id: string;
  ReferenceCardId: string;
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Value: string;
  TimePeriod: string;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;
  EffectiveTo: string;
  LastUpdated: string;
}

/**
* Represents a rewards multiplier for specific spending categories
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
  EffectiveFrom: string;
  EffectiveTo: string;
  LastUpdated: string;
}

/**
* Represents detailed information about a credit card including all benefits and features.
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
  effectiveFrom: string;
  effectiveTo: string;
  lastUpdated: string;
}

/**
* Enhanced version of CreditCardDetails with full component objects embedded.
*/
export interface CreditCardDetailsEnhanced extends CreditCard {
  AnnualFee: number | null;
  ForeignExchangeFee: string;
  ForeignExchangeFeePercentage: number | null;
  RewardsCurrency: string;
  PointsPerDollar: number | null;
  Perks: CardPerk[];
  Credits: CardCredit[];
  Multipliers: CardMultiplier[];
  VersionName: string;
  ReferenceCardId: string;
  IsActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  lastUpdated: string;
}

