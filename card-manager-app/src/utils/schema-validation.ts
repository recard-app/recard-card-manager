/**
 * Schema Validation Utilities for AI-generated responses
 * 
 * Validates AI output against expected schema rules
 */

import type { GenerationType } from '@/services/ai.service';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type CreditTimePeriod = 'monthly' | 'quarterly' | 'semiannually' | 'annually';

export const VALID_CREDIT_TIME_PERIODS: CreditTimePeriod[] = [
  'monthly',
  'quarterly',
  'semiannually',
  'annually',
];

export const VALID_REWARDS_CURRENCIES = ['points', 'miles', 'cash back'];

export type MultiplierType = 'standard' | 'rotating' | 'selectable';

export const VALID_MULTIPLIER_TYPES: MultiplierType[] = ['standard', 'rotating', 'selectable'];

// Expected fields per schema type
export const SCHEMA_FIELDS: Record<GenerationType, string[]> = {
  card: [
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
  ],
  credit: [
    'Title',
    'Category',
    'SubCategory',
    'Description',
    'Value',
    'TimePeriod',
    'Requirements',
    'Details',
    'isAnniversaryBased',
  ],
  perk: [
    'Title',
    'Category',
    'SubCategory',
    'Description',
    'Requirements',
    'Details',
  ],
  multiplier: [
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
  ],
  'rotating-categories': [
    'category',
    'subCategory',
    'periodType',
    'periodValue',
    'year',
    'title',
  ],
};

// ============================================
// FIELD VALIDATION RESULT
// ============================================

export interface FieldValidationResult {
  valid: boolean;
  reason?: string;
}

// ============================================
// FIELD-LEVEL VALIDATION
// ============================================

/**
 * Validates a single field based on the generation type and field key
 */
export function validateField(
  type: GenerationType,
  key: string,
  value: unknown
): FieldValidationResult {
  // Check if field is expected for this type
  const expectedFields = SCHEMA_FIELDS[type];
  if (!expectedFields.includes(key)) {
    return { valid: false, reason: `Unexpected field for ${type}` };
  }

  // Type-specific field validation
  switch (type) {
    case 'card':
      return validateCardField(key, value);
    case 'credit':
      return validateCreditField(key, value);
    case 'perk':
      return validatePerkField(key, value);
    case 'multiplier':
      return validateMultiplierField(key, value);
    case 'rotating-categories':
      return validateRotatingCategoryField(key, value);
    default:
      return { valid: true };
  }
}

function validateCardField(key: string, value: unknown): FieldValidationResult {
  switch (key) {
    case 'CardName':
    case 'CardIssuer':
    case 'CardNetwork':
    case 'CardDetails':
    case 'ForeignExchangeFee':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.trim() === '') {
        return { valid: false, reason: 'Cannot be empty' };
      }
      return { valid: true };

    case 'CardPrimaryColor':
    case 'CardSecondaryColor':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
        return { valid: false, reason: 'Must be a valid hex color (e.g., #0A1F2E)' };
      }
      return { valid: true };

    case 'AnnualFee':
    case 'ForeignExchangeFeePercentage':
    case 'PointsPerDollar':
      if (typeof value !== 'number') {
        return { valid: false, reason: 'Must be a number' };
      }
      return { valid: true };

    case 'RewardsCurrency':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (!VALID_REWARDS_CURRENCIES.includes(value.toLowerCase())) {
        return { valid: false, reason: 'Must be "points", "miles", or "cash back"' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

function validateCreditField(key: string, value: unknown): FieldValidationResult {
  switch (key) {
    case 'Title':
    case 'Category':
    case 'Description':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.trim() === '') {
        return { valid: false, reason: 'Cannot be empty' };
      }
      return { valid: true };

    case 'SubCategory':
    case 'Requirements':
    case 'Details':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      return { valid: true };

    case 'Value':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.includes('$')) {
        return { valid: false, reason: 'Should not include $ sign' };
      }
      if (!/^\d+(\.\d+)?$/.test(value.trim())) {
        return { valid: false, reason: 'Must be a numeric value (e.g., "300" or "12.95")' };
      }
      return { valid: true };

    case 'TimePeriod':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (!VALID_CREDIT_TIME_PERIODS.includes(value as CreditTimePeriod)) {
        return { valid: false, reason: 'Must be monthly, quarterly, semiannually, or annually' };
      }
      return { valid: true };

    case 'isAnniversaryBased':
      if (value === undefined || value === null) {
        // Optional field - defaults to false
        return { valid: true };
      }
      if (typeof value !== 'boolean') {
        return { valid: false, reason: 'Must be true or false' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

function validatePerkField(key: string, value: unknown): FieldValidationResult {
  switch (key) {
    case 'Title':
    case 'Category':
    case 'Description':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.trim() === '') {
        return { valid: false, reason: 'Cannot be empty' };
      }
      return { valid: true };

    case 'SubCategory':
    case 'Requirements':
    case 'Details':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * Validates an allowed category entry for selectable multipliers
 */
function isValidAllowedCategoryEntry(entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.category === 'string' &&
    typeof e.subCategory === 'string' &&
    typeof e.displayName === 'string'
  );
}

export type SchedulePeriodType = 'quarter' | 'month' | 'half_year' | 'year';

export const VALID_SCHEDULE_PERIOD_TYPES: SchedulePeriodType[] = ['quarter', 'month', 'half_year', 'year'];

/**
 * Validates a rotating schedule entry
 */
function isValidScheduleEntry(entry: unknown): boolean {
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
    (e.title as string).trim() !== ''  // title is required and must not be empty
  );
}

function validateMultiplierField(key: string, value: unknown): FieldValidationResult {
  switch (key) {
    case 'Name':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.trim() === '') {
        return { valid: false, reason: 'Cannot be empty' };
      }
      // Name should not include multiplier value like "3X on Dining"
      if (/\d+[xX]\s+on/i.test(value)) {
        return { valid: false, reason: 'Should not include multiplier value (e.g., use "Dining" not "3X on Dining")' };
      }
      return { valid: true };

    case 'Category':
      // Category can be empty string for rotating/selectable types
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      return { valid: true };

    case 'Description':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.trim() === '') {
        return { valid: false, reason: 'Cannot be empty' };
      }
      return { valid: true };

    case 'SubCategory':
    case 'Requirements':
    case 'Details':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      return { valid: true };

    case 'Multiplier':
      if (typeof value !== 'number') {
        return { valid: false, reason: 'Must be a number' };
      }
      if (value <= 0) {
        return { valid: false, reason: 'Must be greater than 0' };
      }
      return { valid: true };

    case 'multiplierType':
      if (value === undefined || value === null) {
        // Optional field - defaults to 'standard'
        return { valid: true };
      }
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (!VALID_MULTIPLIER_TYPES.includes(value as MultiplierType)) {
        return { valid: false, reason: 'Must be "standard", "rotating", or "selectable"' };
      }
      return { valid: true };

    case 'allowedCategories':
      if (value === undefined || value === null) {
        // Optional for non-selectable types (validation of this is done at object level)
        return { valid: true };
      }
      if (!Array.isArray(value)) {
        return { valid: false, reason: 'Must be an array' };
      }
      if (value.length === 0) {
        return { valid: false, reason: 'Must have at least one category' };
      }
      if (!value.every(isValidAllowedCategoryEntry)) {
        return { valid: false, reason: 'Each entry must have category, subCategory, and displayName' };
      }
      return { valid: true };

    case 'scheduleEntries':
      if (value === undefined || value === null) {
        // Optional for non-rotating types (validation of this is done at object level)
        return { valid: true };
      }
      if (!Array.isArray(value)) {
        return { valid: false, reason: 'Must be an array' };
      }
      // Allow empty array - rotating multipliers may not have schedule entries yet
      if (value.length > 0 && !value.every(isValidScheduleEntry)) {
        return { valid: false, reason: 'Each entry must have category, subCategory, periodType, periodValue, year, and title (non-empty)' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

function validateRotatingCategoryField(key: string, value: unknown): FieldValidationResult {
  switch (key) {
    case 'category':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.trim() === '') {
        return { valid: false, reason: 'Cannot be empty' };
      }
      return { valid: true };

    case 'subCategory':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      return { valid: true };

    case 'periodType':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (!VALID_SCHEDULE_PERIOD_TYPES.includes(value as SchedulePeriodType)) {
        return { valid: false, reason: 'Must be quarter, month, half_year, or year' };
      }
      return { valid: true };

    case 'periodValue':
      // periodValue is optional for 'year' periodType, required for others
      if (value === undefined || value === null) {
        return { valid: true }; // Validation at object level will check context
      }
      if (typeof value !== 'number') {
        return { valid: false, reason: 'Must be a number' };
      }
      if (value < 1 || value > 12) {
        return { valid: false, reason: 'Must be between 1 and 12' };
      }
      return { valid: true };

    case 'year':
      if (typeof value !== 'number') {
        return { valid: false, reason: 'Must be a number' };
      }
      if (value < 2000 || value > 2100) {
        return { valid: false, reason: 'Must be between 2000 and 2100' };
      }
      return { valid: true };

    case 'title':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Must be a string' };
      }
      if (value.trim() === '') {
        return { valid: false, reason: 'Cannot be empty' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

// ============================================
// OBJECT-LEVEL VALIDATION
// ============================================

export interface ObjectValidationResult {
  valid: boolean;
  invalidFields: string[];
  fieldResults: Record<string, FieldValidationResult>;
}

/**
 * Validates an entire response object
 */
export function validateResponse(
  type: GenerationType,
  obj: Record<string, unknown> | unknown[]
): ObjectValidationResult {
  // Special handling for rotating-categories which returns an array
  if (type === 'rotating-categories' && Array.isArray(obj)) {
    return validateRotatingCategoriesArray(obj);
  }

  const expectedFields = SCHEMA_FIELDS[type];
  const fieldResults: Record<string, FieldValidationResult> = {};
  const invalidFields: string[] = [];

  // Check each expected field
  for (const field of expectedFields) {
    const value = (obj as Record<string, unknown>)[field];
    const result = validateField(type, field, value);
    fieldResults[field] = result;

    if (!result.valid) {
      invalidFields.push(field);
    }
  }

  // Check for unexpected fields in the object
  for (const key of Object.keys(obj)) {
    if (!expectedFields.includes(key)) {
      fieldResults[key] = { valid: false, reason: `Unexpected field for ${type}` };
      invalidFields.push(key);
    }
  }

  return {
    valid: invalidFields.length === 0,
    invalidFields,
    fieldResults,
  };
}

/**
 * Validates an array of rotating category entries
 */
function validateRotatingCategoriesArray(arr: unknown[]): ObjectValidationResult {
  const fieldResults: Record<string, FieldValidationResult> = {};
  const invalidFields: string[] = [];
  const expectedFields = SCHEMA_FIELDS['rotating-categories'];

  if (arr.length === 0) {
    fieldResults['array'] = { valid: false, reason: 'Array is empty' };
    invalidFields.push('array');
    return { valid: false, invalidFields, fieldResults };
  }

  // Validate each entry in the array
  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i];

    if (typeof entry !== 'object' || entry === null) {
      fieldResults[`[${i}]`] = { valid: false, reason: 'Entry must be an object' };
      invalidFields.push(`[${i}]`);
      continue;
    }

    const entryObj = entry as Record<string, unknown>;

    // Check each expected field
    for (const field of expectedFields) {
      const value = entryObj[field];
      const result = validateRotatingCategoryField(field, value);

      if (!result.valid) {
        const fieldKey = `[${i}].${field}`;
        fieldResults[fieldKey] = result;
        invalidFields.push(fieldKey);
      }
    }

    // Check for unexpected fields
    for (const key of Object.keys(entryObj)) {
      if (!expectedFields.includes(key)) {
        const fieldKey = `[${i}].${key}`;
        fieldResults[fieldKey] = { valid: false, reason: 'Unexpected field' };
        invalidFields.push(fieldKey);
      }
    }
  }

  return {
    valid: invalidFields.length === 0,
    invalidFields,
    fieldResults,
  };
}

/**
 * Validates a response object and returns just a boolean
 */
export function isValidResponse(
  type: GenerationType,
  obj: Record<string, unknown> | unknown[]
): boolean {
  return validateResponse(type, obj).valid;
}

// ============================================
// JSON IMPORT UTILITIES
// ============================================

export interface ExtractedFieldsResult {
  /** Fields with valid values that were extracted */
  validFields: Record<string, unknown>;
  /** Fields that were skipped due to invalid values */
  skippedFields: Array<{ field: string; reason: string }>;
  /** Count of valid fields extracted */
  validCount: number;
  /** Count of fields that were skipped */
  skippedCount: number;
}

/**
 * Extracts valid fields from a JSON object based on the schema type.
 * Only fields defined in SCHEMA_FIELDS for the type are considered.
 * Invalid values are skipped and reported.
 * 
 * @param type - The generation type (card, credit, perk, multiplier)
 * @param obj - The JSON object to extract fields from
 * @returns Object containing valid fields and information about skipped fields
 */
export function extractValidFieldsFromJson(
  type: GenerationType,
  obj: Record<string, unknown>
): ExtractedFieldsResult {
  const expectedFields = SCHEMA_FIELDS[type];
  const validFields: Record<string, unknown> = {};
  const skippedFields: Array<{ field: string; reason: string }> = [];

  // Only iterate through expected fields for this type
  for (const field of expectedFields) {
    // Skip if field is not present in the input object
    if (!(field in obj)) {
      continue;
    }

    const value = obj[field];
    const validationResult = validateField(type, field, value);

    if (validationResult.valid) {
      validFields[field] = value;
    } else {
      skippedFields.push({
        field,
        reason: validationResult.reason || 'Invalid value',
      });
    }
  }

  return {
    validFields,
    skippedFields,
    validCount: Object.keys(validFields).length,
    skippedCount: skippedFields.length,
  };
}

