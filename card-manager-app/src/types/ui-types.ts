import type { CardCredit, CardPerk, CardMultiplier } from './index';

/**
 * Component type discriminator
 */
export type ComponentType = 'credits' | 'perks' | 'multipliers';

/**
 * Union of all component types
 */
export type CardComponent = CardCredit | CardPerk | CardMultiplier;

/**
 * Card characteristics - indicates if card has rotating or selectable multipliers
 */
export type CardCharacteristics = 'standard' | 'rotating' | 'selectable';

/**
 * Canonical card status values
 */
export const CardStatus = {
  Active: 'active',
  Inactive: 'inactive',
  NoActiveVersion: 'no_active_version',
  NoVersions: 'no_versions',
} as const;

export type CardStatus = typeof CardStatus[keyof typeof CardStatus];

/**
 * Top-level card identity from credit_cards_names collection.
 * The ReferenceCardId is the document ID in Firestore.
 */
export interface CreditCardName {
  ReferenceCardId: string;  // Document ID
  CardName: string;
  CardIssuer: string;
  CardCharacteristics?: CardCharacteristics;
}

/**
 * Card with status for list view.
 * Can represent cards with or without versions.
 */
export interface CardWithStatus {
  // Core identity (from credit_cards_names)
  ReferenceCardId: string;
  CardName: string;
  CardIssuer: string;
  CardCharacteristics?: CardCharacteristics;

  // Status info
  status: CardStatus;
  ActiveVersionName: string | null;
  versionCount: number;
  
  // Version data (optional - may not exist if no versions)
  id?: string;  // Version ID (for navigation)
  CardNetwork?: string;
  CardDetails?: string;
  CardImage?: string;
  CardPrimaryColor?: string;
  CardSecondaryColor?: string;
  AnnualFee?: number | null;
  ForeignExchangeFee?: string;
  ForeignExchangeFeePercentage?: number | null;
  RewardsCurrency?: string;
  PointsPerDollar?: number | null;
  VersionName?: string;
  IsActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  lastUpdated?: string;
  componentsLastUpdated?: string;
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
  Value?: number;        // Credits only
  TimePeriod?: string;   // Credits only
  Multiplier?: number;   // Multipliers only
  Name?: string;         // Multipliers only
}
