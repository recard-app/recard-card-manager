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
