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
  Value: number;
  TimePeriod: CreditTimePeriod;
  Requirements: string;
  Details: string;
  isAnniversaryBased?: boolean;  // true = resets on card anniversary, false = calendar-based
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
  'isAnniversaryBased',
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

export type MultiplierType = 'standard' | 'rotating' | 'selectable';

export const VALID_MULTIPLIER_TYPES: MultiplierType[] = ['standard', 'rotating', 'selectable'];

export interface AllowedCategoryEntry {
  category: string;
  subCategory: string;
  displayName: string;
}

export type SchedulePeriodType = 'quarter' | 'month' | 'half_year' | 'year';

export interface AIRotatingScheduleEntry {
  category: string;        // e.g., "shopping"
  subCategory: string;     // e.g., "amazon.com" or ""
  periodType: SchedulePeriodType;
  periodValue: number;     // e.g., 1 for Q1
  year: number;            // e.g., 2025
  title: string;           // REQUIRED - e.g., "Amazon.com purchases"
}

export interface AIMultiplierResponse {
  Name: string;
  Category: string;  // Empty string for rotating/selectable types
  SubCategory: string;
  Description: string;
  Multiplier: number;
  Requirements: string;
  Details: string;
  multiplierType?: MultiplierType;  // Optional - defaults to 'standard'
  allowedCategories?: AllowedCategoryEntry[];  // Required for 'selectable' type only
  scheduleEntries?: AIRotatingScheduleEntry[];  // Required for 'rotating' type only
}

export const MULTIPLIER_SCHEMA_FIELDS = [
  'Name',
  'Category',
  'SubCategory',
  'Description',
  'Multiplier',
  'Requirements',
  'Details',
  'multiplierType',
  'allowedCategories',
  'scheduleEntries',
] as const;

export const VALID_SCHEDULE_PERIOD_TYPES: SchedulePeriodType[] = ['quarter', 'month', 'half_year', 'year'];

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

  const hasRequiredFields = (
    typeof o.Title === 'string' &&
    typeof o.Category === 'string' &&
    typeof o.SubCategory === 'string' &&
    typeof o.Description === 'string' &&
    typeof o.Value === 'number' &&
    typeof o.TimePeriod === 'string' &&
    VALID_CREDIT_TIME_PERIODS.includes(o.TimePeriod as CreditTimePeriod) &&
    typeof o.Requirements === 'string' &&
    typeof o.Details === 'string'
  );

  if (!hasRequiredFields) return false;

  // Validate optional isAnniversaryBased if present
  if (o.isAnniversaryBased !== undefined && typeof o.isAnniversaryBased !== 'boolean') {
    return false;
  }

  return true;
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
 * Validates that an allowed category entry has all required fields
 */
function isValidAllowedCategoryEntry(entry: unknown): entry is AllowedCategoryEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.category === 'string' &&
    typeof e.subCategory === 'string' &&
    typeof e.displayName === 'string'
  );
}

/**
 * Validates that a rotating schedule entry has all required fields
 */
function isValidScheduleEntry(entry: unknown): entry is AIRotatingScheduleEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.category === 'string' &&
    typeof e.subCategory === 'string' &&
    typeof e.periodType === 'string' &&
    VALID_SCHEDULE_PERIOD_TYPES.includes(e.periodType as SchedulePeriodType) &&
    typeof e.periodValue === 'number' &&
    typeof e.year === 'number' &&
    typeof e.title === 'string' &&
    e.title !== ''  // title is required and must not be empty
  );
}

/**
 * Validates that a multiplier response has all required fields
 */
export function isValidMultiplierResponse(obj: unknown): obj is AIMultiplierResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;

  // Validate core required fields
  const hasRequiredFields = (
    typeof o.Name === 'string' &&
    typeof o.Category === 'string' &&
    typeof o.SubCategory === 'string' &&
    typeof o.Description === 'string' &&
    typeof o.Multiplier === 'number' &&
    typeof o.Requirements === 'string' &&
    typeof o.Details === 'string'
  );

  if (!hasRequiredFields) return false;

  // Validate optional multiplierType if present
  if (o.multiplierType !== undefined) {
    if (!VALID_MULTIPLIER_TYPES.includes(o.multiplierType as MultiplierType)) {
      return false;
    }
  }

  // Validate allowedCategories if present (required for selectable type)
  if (o.allowedCategories !== undefined) {
    if (!Array.isArray(o.allowedCategories)) return false;
    if (!o.allowedCategories.every(isValidAllowedCategoryEntry)) return false;
  }

  // Validate scheduleEntries if present (required for rotating type)
  if (o.scheduleEntries !== undefined) {
    if (!Array.isArray(o.scheduleEntries)) return false;
    if (!o.scheduleEntries.every(isValidScheduleEntry)) return false;
  }

  return true;
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
  Value: 'number (NO $ sign, PER TIME PERIOD)',
  TimePeriod: 'string: "monthly" | "quarterly" | "semiannually" | "annually"',
  Requirements: 'string (UPPERCASE for critical requirements)',
  Details: 'string (additional notes)',
  isAnniversaryBased: 'boolean (true if credit resets on card anniversary date, false for calendar-based - default false)',
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
  Category: 'string (REQUIRED for standard, empty string "" for rotating/selectable)',
  SubCategory: 'string (or empty string "" if none)',
  Description: 'string (required - what purchases qualify)',
  Multiplier: 'number (e.g., 3 for 3X, 1.5 for 1.5%)',
  Requirements: 'string (UPPERCASE for portal requirements)',
  Details: 'string (spending caps, exclusions)',
  multiplierType: 'string: "standard" | "rotating" | "selectable" (optional, defaults to "standard")',
  allowedCategories: 'array (ONLY for selectable type) - each object: { category: string, subCategory: string, displayName: string }',
  scheduleEntries: 'array (ONLY for rotating type) - each object: { category: string, subCategory: string, periodType: "quarter"|"month"|"half_year"|"year", periodValue: number, year: number, title: string (REQUIRED - descriptive display name like "Amazon.com purchases") }',
};

// ============================================
// ROTATING CATEGORIES SCHEMA
// ============================================

export const ROTATING_CATEGORIES_SCHEMA_FIELDS = [
  'category',
  'subCategory',
  'periodType',
  'periodValue',
  'year',
  'title',
] as const;

export const AI_ROTATING_CATEGORIES_SCHEMA = {
  category: 'string (lowercase, e.g., "dining", "gas", "shopping")',
  subCategory: 'string (lowercase or empty string "" if none)',
  periodType: 'string: "quarter" | "month" | "half_year" | "year"',
  periodValue: 'number (1-4 for quarter, 1-12 for month, 1-2 for half_year; omit for year)',
  year: 'number (e.g., 2025)',
  title: 'string (REQUIRED - descriptive display name like "Amazon.com purchases")',
};

