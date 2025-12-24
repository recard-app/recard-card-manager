/**
 * Comparison Types
 *
 * TypeScript types for the card comparison feature.
 * These mirror the server-side types for API responses.
 */

// ============================================
// STATUS TYPES
// ============================================

/**
 * Status for individual card detail fields
 */
export type FieldComparisonStatus =
  | 'match' // Field value matches website (green check)
  | 'mismatch' // Field is outdated/incorrect (red X)
  | 'questionable' // Unclear, needs review (orange exclamation)
  | 'missing_from_website'; // Not found on website (gray)

/**
 * Status for components (perks, credits, multipliers)
 */
export type ComponentComparisonStatus =
  | 'match' // Component matches website (green check)
  | 'outdated' // Component has differences (red X)
  | 'questionable' // Needs review (orange exclamation)
  | 'new' // Found on website but not in database (green plus)
  | 'missing'; // In database but not on website (red minus)

// ============================================
// FIELD COMPARISON
// ============================================

/**
 * Comparison result for a single card detail field
 */
export interface FieldComparisonResult {
  fieldName: string;
  fieldLabel: string;
  databaseValue: string | number | null;
  websiteValue: string | number | null;
  status: FieldComparisonStatus;
  notes: string;
}

// ============================================
// COMPONENT COMPARISON
// ============================================

/**
 * Difference between database and website values for a single field
 */
export interface FieldDiff {
  field: string;
  database: string | number | null;
  website: string | number | null;
  status: 'match' | 'mismatch' | 'questionable';
}

/**
 * Comparison result for a single component (perk, credit, or multiplier)
 */
export interface ComponentComparisonResult {
  id: string | null; // Database component ID (null for NEW items)
  title: string; // Title/Name from database or website
  status: ComponentComparisonStatus;
  databaseData: Record<string, unknown> | null; // null if NEW
  websiteData: Record<string, unknown> | null; // null if MISSING
  fieldDiffs: FieldDiff[]; // Per-field differences
  notes: string;
}

// ============================================
// FULL COMPARISON RESPONSE
// ============================================

/**
 * Complete comparison response from the API
 */
export interface ComparisonResponse {
  summary: string; // AI-generated summary of findings
  modelUsed: string; // Which Gemini model was used
  cardDetails: FieldComparisonResult[];
  perks: ComponentComparisonResult[];
  credits: ComponentComparisonResult[];
  multipliers: ComponentComparisonResult[];
}

/**
 * Request body for comparison API
 */
export interface ComparisonRequest {
  referenceCardId: string;
  versionId: string;
  websiteText: string;
}

// ============================================
// FIELD LABELS (for display)
// ============================================

export const CARD_FIELD_LABELS: Record<string, string> = {
  CardName: 'Card Name',
  CardIssuer: 'Card Issuer',
  CardNetwork: 'Card Network',
  CardDetails: 'Card Details',
  CardPrimaryColor: 'Primary Color',
  CardSecondaryColor: 'Secondary Color',
  AnnualFee: 'Annual Fee',
  ForeignExchangeFee: 'Foreign Exchange Fee',
  ForeignExchangeFeePercentage: 'FX Fee Percentage',
  RewardsCurrency: 'Rewards Currency',
  PointsPerDollar: 'Points Per Dollar',
};
