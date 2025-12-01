import { z } from 'zod';

// Common regex for YYYY-MM-DD
const isoDateYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

export const CardNameFormSchema = z.object({
  ReferenceCardId: z.string().min(1, 'Reference Card ID is required').regex(/^[a-zA-Z0-9-]+$/, 'Card ID can only contain letters, numbers, and hyphens'),
  CardName: z.string().min(1, 'Card name is required'),
  CardIssuer: z.string().min(1, 'Card issuer is required'),
});
export type CardNameForm = z.infer<typeof CardNameFormSchema>;

export const CardDetailsFormSchema = z.object({
  CardName: z.string().min(1, 'Card name is required'),
  CardIssuer: z.string().min(1, 'Card issuer is required'),
  CardNetwork: z.string().min(1, 'Card network is required'),
  CardDetails: z.string().optional(),
  CardImage: z.string().optional(),
  CardPrimaryColor: z.string().optional(),
  CardSecondaryColor: z.string().optional(),
  AnnualFee: z.string().min(1, 'Annual fee is required').refine((v) => !isNaN(Number(v)), { message: 'Annual fee must be a number' }),
  ForeignExchangeFee: z.string().min(1, 'FX fee description is required'),
  ForeignExchangeFeePercentage: z.string().min(1, 'FX fee percentage is required').refine((v) => !isNaN(Number(v)), { message: 'FX fee percentage must be a number' }),
  RewardsCurrency: z.string().min(1, 'Rewards currency is required'),
  PointsPerDollar: z.string().min(1, 'Points per dollar is required').refine((v) => !isNaN(Number(v)), { message: 'Points per dollar must be a number' }),
  VersionName: z.string().min(1, 'Version name is required'),
  EffectiveFrom: z.string().min(1, 'Effective from date is required').regex(isoDateYYYYMMDD, 'Use YYYY-MM-DD'),
  EffectiveTo: z.string().optional().refine((v) => !v || isoDateYYYYMMDD.test(v), { message: 'Use YYYY-MM-DD' }),
});
export type CardDetailsForm = z.infer<typeof CardDetailsFormSchema>;

export const CreditFormSchema = z.object({
  Title: z.string().min(1, 'Title is required'),
  Category: z.string().min(1, 'Category is required'),
  SubCategory: z.string().optional(),
  Description: z.string().optional(),
  Value: z.string().min(1, 'Value is required').refine((v) => !isNaN(Number(v)), { message: 'Value must be a number' }),
  TimePeriod: z.string().min(1, 'Time period is required'),
  Requirements: z.string().optional(),
  Details: z.string().optional(),
  EffectiveFrom: z.string().min(1, 'Effective from date is required').regex(isoDateYYYYMMDD, 'Use YYYY-MM-DD'),
  EffectiveTo: z.string().optional().refine((v) => !v || isoDateYYYYMMDD.test(v), { message: 'Use YYYY-MM-DD' }),
});
export type CreditForm = z.infer<typeof CreditFormSchema>;

export const PerkFormSchema = z.object({
  Title: z.string().min(1, 'Title is required'),
  Category: z.string().min(1, 'Category is required'),
  SubCategory: z.string().optional(),
  Description: z.string().min(1, 'Description is required'),
  Requirements: z.string().optional(),
  Details: z.string().optional(),
  EffectiveFrom: z.string().min(1, 'Effective from date is required').regex(isoDateYYYYMMDD, 'Use YYYY-MM-DD'),
  EffectiveTo: z.string().optional().refine((v) => !v || isoDateYYYYMMDD.test(v), { message: 'Use YYYY-MM-DD' }),
});
export type PerkForm = z.infer<typeof PerkFormSchema>;

export const MultiplierFormSchema = z.object({
  Name: z.string().min(1, 'Name is required'),
  Category: z.string().min(1, 'Category is required'),
  SubCategory: z.string().optional(),
  Description: z.string().min(1, 'Description is required'),
  Multiplier: z.string().min(1, 'Multiplier is required').refine((v) => !isNaN(Number(v)) && Number(v) > 0, { message: 'Multiplier must be greater than 0' }),
  Requirements: z.string().optional(),
  Details: z.string().optional(),
  EffectiveFrom: z.string().min(1, 'Effective from date is required').regex(isoDateYYYYMMDD, 'Use YYYY-MM-DD'),
  EffectiveTo: z.string().optional().refine((v) => !v || isoDateYYYYMMDD.test(v), { message: 'Use YYYY-MM-DD' }),
});
export type MultiplierForm = z.infer<typeof MultiplierFormSchema>;

/**
 * Map Zod errors to a simple Record<field, message> for current form UI
 */
export function zodErrorsToFieldMap(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const flat = error.flatten().fieldErrors;
  Object.entries(flat).forEach(([key, messages]) => {
    if (messages && messages.length > 0) {
      fieldErrors[key] = messages[0]!;
    }
  });
  return fieldErrors;
}


