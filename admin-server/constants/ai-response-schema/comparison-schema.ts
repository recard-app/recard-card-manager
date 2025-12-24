/**
 * AI Comparison Response Schema
 *
 * These are the TypeScript interfaces for the AI-powered card comparison feature.
 * The comparison analyzes database card data against website text to identify
 * discrepancies, outdated information, and missing components.
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
 * Complete comparison response from the AI
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
 * Raw AI response (before adding modelUsed)
 */
export interface AIComparisonResponse {
  summary: string;
  cardDetails: FieldComparisonResult[];
  perks: ComponentComparisonResult[];
  credits: ComponentComparisonResult[];
  multipliers: ComponentComparisonResult[];
}

// ============================================
// VALIDATION HELPERS
// ============================================

const VALID_FIELD_STATUSES: FieldComparisonStatus[] = [
  'match',
  'mismatch',
  'questionable',
  'missing_from_website',
];

const VALID_COMPONENT_STATUSES: ComponentComparisonStatus[] = [
  'match',
  'outdated',
  'questionable',
  'new',
  'missing',
];

/**
 * Validates that a field comparison result has all required fields
 */
function isValidFieldComparison(obj: unknown): obj is FieldComparisonResult {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;

  return (
    typeof o.fieldName === 'string' &&
    typeof o.fieldLabel === 'string' &&
    (o.databaseValue === null ||
      typeof o.databaseValue === 'string' ||
      typeof o.databaseValue === 'number') &&
    (o.websiteValue === null ||
      typeof o.websiteValue === 'string' ||
      typeof o.websiteValue === 'number') &&
    typeof o.status === 'string' &&
    VALID_FIELD_STATUSES.includes(o.status as FieldComparisonStatus) &&
    typeof o.notes === 'string'
  );
}

/**
 * Validates that a component comparison result has all required fields
 */
function isValidComponentComparison(
  obj: unknown
): obj is ComponentComparisonResult {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;

  return (
    (o.id === null || typeof o.id === 'string') &&
    typeof o.title === 'string' &&
    typeof o.status === 'string' &&
    VALID_COMPONENT_STATUSES.includes(o.status as ComponentComparisonStatus) &&
    (o.databaseData === null || typeof o.databaseData === 'object') &&
    (o.websiteData === null || typeof o.websiteData === 'object') &&
    Array.isArray(o.fieldDiffs) &&
    typeof o.notes === 'string'
  );
}

/**
 * Validates that the full comparison response has all required fields
 */
export function isValidComparisonResponse(
  obj: unknown
): obj is AIComparisonResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;

  if (typeof o.summary !== 'string') return false;
  if (!Array.isArray(o.cardDetails)) return false;
  if (!Array.isArray(o.perks)) return false;
  if (!Array.isArray(o.credits)) return false;
  if (!Array.isArray(o.multipliers)) return false;

  // Validate each card detail field
  for (const field of o.cardDetails) {
    if (!isValidFieldComparison(field)) return false;
  }

  // Validate each component
  for (const perk of o.perks) {
    if (!isValidComponentComparison(perk)) return false;
  }
  for (const credit of o.credits) {
    if (!isValidComponentComparison(credit)) return false;
  }
  for (const multiplier of o.multipliers) {
    if (!isValidComponentComparison(multiplier)) return false;
  }

  return true;
}

// ============================================
// SCHEMA OBJECT (for prompts)
// ============================================

export const AI_COMPARISON_SCHEMA = {
  summary: 'string (2-3 sentence analysis of how up-to-date the database is. Highlight key discrepancies, missing items, and new items found on the website. Do NOT summarize the card itself.)',
  cardDetails: [
    {
      fieldName: 'string (exact field name from card schema)',
      fieldLabel: 'string (human-readable label)',
      databaseValue: 'string | number | null (current database value)',
      websiteValue: 'string | number | null (value found on website)',
      status: '"match" | "mismatch" | "questionable" | "missing_from_website"',
      notes: 'string (explanation of finding)',
    },
  ],
  perks: [
    {
      id: 'string | null (database ID, null for NEW items)',
      title: 'string (Title from database or website)',
      status: '"match" | "outdated" | "questionable" | "new" | "missing"',
      databaseData: 'object | null (full component data from database)',
      websiteData: 'object | null (extracted data from website)',
      fieldDiffs: [
        {
          field: 'string (field name)',
          database: 'string | number | null',
          website: 'string | number | null',
          status: '"match" | "mismatch" | "questionable"',
        },
      ],
      notes: 'string (explanation)',
    },
  ],
  credits: '(same structure as perks)',
  multipliers: '(same structure as perks, but uses Name instead of Title)',
};

// ============================================
// FIELD LABELS (for display)
// ============================================

export const CARD_FIELD_LABELS: Record<string, string> = {
  CardName: 'Card Name',
  CardIssuer: 'Card Issuer',
  CardNetwork: 'Card Network',
  CardDetails: 'Card Details',
  AnnualFee: 'Annual Fee',
  ForeignExchangeFee: 'Foreign Exchange Fee',
  ForeignExchangeFeePercentage: 'FX Fee Percentage',
  RewardsCurrency: 'Rewards Currency',
  PointsPerDollar: 'Points Per Dollar',
};
