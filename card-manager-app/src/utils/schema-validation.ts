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
  obj: Record<string, unknown>
): ObjectValidationResult {
  const expectedFields = SCHEMA_FIELDS[type];
  const fieldResults: Record<string, FieldValidationResult> = {};
  const invalidFields: string[] = [];

  // Check each expected field
  for (const field of expectedFields) {
    const value = obj[field];
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
 * Validates a response object and returns just a boolean
 */
export function isValidResponse(
  type: GenerationType,
  obj: Record<string, unknown>
): boolean {
  return validateResponse(type, obj).valid;
}

