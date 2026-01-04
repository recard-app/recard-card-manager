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
  EffectiveFrom: string;
  EffectiveTo: string;
  LastUpdated: string;

  // Anniversary-based credit field
  isAnniversaryBased?: boolean;  // true = anniversary-based, false/undefined = calendar
}

/**
 * Multiplier type constants
 */
export const MULTIPLIER_TYPES = {
  STANDARD: 'standard',
  ROTATING: 'rotating',
  SELECTABLE: 'selectable'
} as const;
export type MultiplierType = typeof MULTIPLIER_TYPES[keyof typeof MULTIPLIER_TYPES];

/**
 * Spending cap period constants
 */
export const SPENDING_CAP_PERIODS = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMIANNUALLY: 'semiannually',
  ANNUALLY: 'annually'
} as const;
export type SpendingCapPeriod = typeof SPENDING_CAP_PERIODS[keyof typeof SPENDING_CAP_PERIODS];

/**
 * Schedule period type constants (for rotating multipliers)
 */
export const SCHEDULE_PERIOD_TYPES = {
  QUARTER: 'quarter',
  MONTH: 'month',
  HALF_YEAR: 'half_year',
  YEAR: 'year',
  CUSTOM: 'custom'
} as const;
export type SchedulePeriodType = typeof SCHEDULE_PERIOD_TYPES[keyof typeof SCHEDULE_PERIOD_TYPES];

/**
 * Spending cap for display purposes (no tracking)
 */
export interface SpendingCap {
  amount: number;                // e.g., 1500
  period: SpendingCapPeriod;
  currency: string;              // e.g., 'USD'
}

/**
* Represents a rewards multiplier for specific spending categories
*/
export interface CardMultiplier {
  id: string;
  ReferenceCardId: string;
  Name: string;
  Category: string;              // For standard: the fixed category
  SubCategory: string;           // For standard: the fixed subcategory
  Description: string;
  Multiplier: number | null;
  Requirements: string;
  Details?: string;
  EffectiveFrom: string;
  EffectiveTo: string;
  LastUpdated: string;

  // Rotating & Selectable Multiplier Fields
  multiplierType: MultiplierType;  // Required - 'standard' | 'rotating' | 'selectable'
  spendingCap?: SpendingCap;       // Optional - for display only
}

/**
 * Represents a rotating schedule entry for a multiplier
 */
export interface RotatingScheduleEntry {
  id: string;                      // Auto-generated document ID
  category: string;                // Category from taxonomy
  subCategory: string;             // SubCategory from taxonomy
  periodType: SchedulePeriodType;
  periodValue?: number;            // For quarter: 1-4, month: 1-12, half_year: 1-2
  year: number;                    // e.g., 2025
  startDate: string;               // ISO date - calculated or custom
  endDate: string;                 // ISO date - calculated or custom
  isCustomDateRange: boolean;      // True if manually specified dates
  title: string;                   // REQUIRED - Display name for this period (e.g., "Amazon.com purchases")
}

/**
 * Represents an allowed category for a selectable multiplier
 */
export interface AllowedCategoryEntry {
  id: string;                      // Auto-generated document ID
  category: string;                // Category from taxonomy
  subCategory: string;             // SubCategory from taxonomy
  displayName: string;             // User-friendly name (e.g., "Gas Stations")
}

/**
 * Enriched multiplier type that includes schedule or selection data
 */
export type EnrichedMultiplier = CardMultiplier & {
  currentSchedule?: RotatingScheduleEntry;       // Populated for rotating type
  allowedCategories?: AllowedCategoryEntry[];    // Populated for selectable type
}

/**
 * Type guard for rotating multipliers
 */
export function isRotatingMultiplier(mult: EnrichedMultiplier | CardMultiplier): boolean {
  return mult.multiplierType === MULTIPLIER_TYPES.ROTATING;
}

/**
 * Type guard for selectable multipliers
 */
export function isSelectableMultiplier(mult: EnrichedMultiplier | CardMultiplier): boolean {
  return mult.multiplierType === MULTIPLIER_TYPES.SELECTABLE;
}

/**
 * Display names for multiplier types
 */
export const MULTIPLIER_TYPE_DISPLAY_NAMES: Record<MultiplierType, string> = {
  [MULTIPLIER_TYPES.STANDARD]: 'Standard',
  [MULTIPLIER_TYPES.ROTATING]: 'Rotating',
  [MULTIPLIER_TYPES.SELECTABLE]: 'Selectable'
};

/**
 * Display names for schedule periods
 */
export const SCHEDULE_PERIOD_DISPLAY_NAMES: Record<SchedulePeriodType, string> = {
  [SCHEDULE_PERIOD_TYPES.QUARTER]: 'Quarter',
  [SCHEDULE_PERIOD_TYPES.MONTH]: 'Month',
  [SCHEDULE_PERIOD_TYPES.HALF_YEAR]: 'Half Year',
  [SCHEDULE_PERIOD_TYPES.YEAR]: 'Year',
  [SCHEDULE_PERIOD_TYPES.CUSTOM]: 'Custom'
};

/**
 * Display names for spending cap periods
 */
export const SPENDING_CAP_PERIOD_DISPLAY_NAMES: Record<SpendingCapPeriod, string> = {
  [SPENDING_CAP_PERIODS.MONTHLY]: 'month',
  [SPENDING_CAP_PERIODS.QUARTERLY]: 'quarter',
  [SPENDING_CAP_PERIODS.SEMIANNUALLY]: '6 months',
  [SPENDING_CAP_PERIODS.ANNUALLY]: 'year'
};

/**
 * Format a spending cap for display
 */
export function formatSpendingCap(cap: SpendingCap): string {
  const currencySymbol = cap.currency === 'USD' ? '$' : cap.currency;
  const periodLabel = SPENDING_CAP_PERIOD_DISPLAY_NAMES[cap.period];
  return `Up to ${currencySymbol}${cap.amount.toLocaleString()}/${periodLabel}`;
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
  componentsLastUpdated?: string;
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
  componentsLastUpdated?: string;
}

