/**
 * AI Response Schemas
 * 
 * These are the TypeScript interfaces and schema objects for validating
 * AI-generated responses. They serve as the source of truth for the
 * structure of data extracted by the AI assistant.
 * 
 * Note: These schemas do NOT include auto-generated fields like:
 * - id, ReferenceCardId, LastUpdated, EffectiveFrom, EffectiveTo (for credits/perks/multipliers)
 * - id, VersionName, ReferenceCardId, IsActive, CardImage, lastUpdated, effectiveFrom, effectiveTo, Perks, Credits, Multipliers (for cards)
 */

// ============================================
// CARD SCHEMA
// ============================================

export interface AICardResponse {
  CardName: string;
  CardIssuer: string;
  CardNetwork: string;
  CardDetails: string;
  CardPrimaryColor: string;
  CardSecondaryColor: string;
  AnnualFee: number;
  ForeignExchangeFee: string;
  ForeignExchangeFeePercentage: number;
  RewardsCurrency: string;
  PointsPerDollar: number;
}

export const CARD_SCHEMA_FIELDS = [
  'CardName',
  'CardIssuer',
  'CardNetwork',
  'CardDetails',
  'CardPrimaryColor',
  'CardSecondaryColor',
  'AnnualFee',
  'ForeignExchangeFee',
  'ForeignExchangeFeePercentage',
  'RewardsCurrency',
  'PointsPerDollar',
] as const;

// ============================================
// CREDIT SCHEMA
// ============================================

export type CreditTimePeriod = 'monthly' | 'quarterly' | 'semiannually' | 'annually';

export interface AICreditResponse {
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Value: string;
  TimePeriod: CreditTimePeriod;
  Requirements: string;
  Details: string;
}

export const CREDIT_SCHEMA_FIELDS = [
  'Title',
  'Category',
  'SubCategory',
  'Description',
  'Value',
  'TimePeriod',
  'Requirements',
  'Details',
] as const;

export const VALID_CREDIT_TIME_PERIODS: CreditTimePeriod[] = [
  'monthly',
  'quarterly',
  'semiannually',
  'annually',
];

// ============================================
// PERK SCHEMA
// ============================================

export interface AIPerkResponse {
  Title: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Requirements: string;
  Details: string;
}

export const PERK_SCHEMA_FIELDS = [
  'Title',
  'Category',
  'SubCategory',
  'Description',
  'Requirements',
  'Details',
] as const;

// ============================================
// MULTIPLIER SCHEMA
// ============================================

export interface AIMultiplierResponse {
  Name: string;
  Category: string;
  SubCategory: string;
  Description: string;
  Multiplier: number;
  Requirements: string;
  Details: string;
}

export const MULTIPLIER_SCHEMA_FIELDS = [
  'Name',
  'Category',
  'SubCategory',
  'Description',
  'Multiplier',
  'Requirements',
  'Details',
] as const;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validates that a card response has all required fields
 */
export function isValidCardResponse(obj: unknown): obj is AICardResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  
  return (
    typeof o.CardName === 'string' &&
    typeof o.CardIssuer === 'string' &&
    typeof o.CardNetwork === 'string' &&
    typeof o.CardDetails === 'string' &&
    typeof o.CardPrimaryColor === 'string' &&
    typeof o.CardSecondaryColor === 'string' &&
    typeof o.AnnualFee === 'number' &&
    typeof o.ForeignExchangeFee === 'string' &&
    typeof o.ForeignExchangeFeePercentage === 'number' &&
    typeof o.RewardsCurrency === 'string' &&
    typeof o.PointsPerDollar === 'number'
  );
}

/**
 * Validates that a credit response has all required fields
 */
export function isValidCreditResponse(obj: unknown): obj is AICreditResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  
  return (
    typeof o.Title === 'string' &&
    typeof o.Category === 'string' &&
    typeof o.SubCategory === 'string' &&
    typeof o.Description === 'string' &&
    typeof o.Value === 'string' &&
    typeof o.TimePeriod === 'string' &&
    VALID_CREDIT_TIME_PERIODS.includes(o.TimePeriod as CreditTimePeriod) &&
    typeof o.Requirements === 'string' &&
    typeof o.Details === 'string'
  );
}

/**
 * Validates that a perk response has all required fields
 */
export function isValidPerkResponse(obj: unknown): obj is AIPerkResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  
  return (
    typeof o.Title === 'string' &&
    typeof o.Category === 'string' &&
    typeof o.SubCategory === 'string' &&
    typeof o.Description === 'string' &&
    typeof o.Requirements === 'string' &&
    typeof o.Details === 'string'
  );
}

/**
 * Validates that a multiplier response has all required fields
 */
export function isValidMultiplierResponse(obj: unknown): obj is AIMultiplierResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  
  return (
    typeof o.Name === 'string' &&
    typeof o.Category === 'string' &&
    typeof o.SubCategory === 'string' &&
    typeof o.Description === 'string' &&
    typeof o.Multiplier === 'number' &&
    typeof o.Requirements === 'string' &&
    typeof o.Details === 'string'
  );
}

// ============================================
// SCHEMA OBJECTS (for prompts)
// ============================================

export const AI_CARD_SCHEMA = {
  CardName: 'string (official name, Title Case)',
  CardIssuer: 'string (e.g., "Chase", "American Express", "Capital One")',
  CardNetwork: 'string (e.g., "Visa", "Mastercard", "American Express")',
  CardDetails: 'string (1-2 sentence description)',
  CardPrimaryColor: 'string (hex color, e.g., "#0A1F2E")',
  CardSecondaryColor: 'string (hex color)',
  AnnualFee: 'number (no $ sign, 0 for no fee)',
  ForeignExchangeFee: 'string ("None" or percentage like "3%")',
  ForeignExchangeFeePercentage: 'number (0 for no fee)',
  RewardsCurrency: 'string (lowercase: "points", "miles", or "cash back")',
  PointsPerDollar: 'number (base earning rate)',
};

export const AI_CREDIT_SCHEMA = {
  Title: 'string (Title Case, include $ only for non-monthly credits)',
  Category: 'string (e.g., "travel", "dining", "entertainment", "shopping")',
  SubCategory: 'string (or empty string "" if none)',
  Description: 'string (what the credit covers)',
  Value: 'string (numeric only, NO $ sign, PER TIME PERIOD)',
  TimePeriod: 'string: "monthly" | "quarterly" | "semiannually" | "annually"',
  Requirements: 'string (UPPERCASE for critical requirements)',
  Details: 'string (additional notes)',
};

export const AI_PERK_SCHEMA = {
  Title: 'string (Title Case, e.g., "Priority Pass Select")',
  Category: 'string (e.g., "travel", "insurance", "dining", "general")',
  SubCategory: 'string (or empty string "" if none)',
  Description: 'string (required - what the perk provides)',
  Requirements: 'string (access requirements)',
  Details: 'string (coverage limits, guest policies)',
};

export const AI_MULTIPLIER_SCHEMA = {
  Name: 'string (Title Case category, e.g., "Dining", NOT "3X on Dining")',
  Category: 'string (use "portal" for issuer portal purchases)',
  SubCategory: 'string (or empty string "" if none)',
  Description: 'string (required - what purchases qualify)',
  Multiplier: 'number (e.g., 3 for 3X, 1.5 for 1.5%)',
  Requirements: 'string (UPPERCASE for portal requirements)',
  Details: 'string (spending caps, exclusions)',
};

