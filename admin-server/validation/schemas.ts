import { z } from 'zod';

const isoDateYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

export const CardNameSchema = z.object({
  CardName: z.string().min(1, 'CardName is required'),
  CardIssuer: z.string().min(1, 'CardIssuer is required'),
  CardCharacteristics: z.enum(['standard', 'rotating', 'selectable']).optional(),
});
export type CardName = z.infer<typeof CardNameSchema>;

export const CreditCardCreateSchema = z.object({
  ReferenceCardId: z.string().min(1),
  CardName: z.string().min(1),
  CardIssuer: z.string().min(1),
  CardNetwork: z.string().min(1),
  CardDetails: z.string().optional(),
  CardImage: z.string().optional(),
  CardPrimaryColor: z.string().optional(),
  CardSecondaryColor: z.string().optional(),
  AnnualFee: z.number().nullable().optional(),
  ForeignExchangeFee: z.string().min(1),
  ForeignExchangeFeePercentage: z.number().nullable().optional(),
  RewardsCurrency: z.string().min(1),
  PointsPerDollar: z.number().nullable().optional(),
  VersionName: z.string().min(1),
  effectiveFrom: z.string().regex(isoDateYYYYMMDD),
  effectiveTo: z.string().regex(isoDateYYYYMMDD).optional(),
  IsActive: z.boolean().optional(),
});
export type CreditCardCreate = z.infer<typeof CreditCardCreateSchema>;

export const CreditCardUpdateSchema = CreditCardCreateSchema.partial().refine(
  (data) => {
    // if present, dates must be valid YYYY-MM-DD
    const okFrom = data.effectiveFrom ? isoDateYYYYMMDD.test(data.effectiveFrom) : true;
    const okTo = data.effectiveTo ? isoDateYYYYMMDD.test(data.effectiveTo) : true;
    return okFrom && okTo;
  },
  { message: 'Invalid date format. Use YYYY-MM-DD' }
);
export type CreditCardUpdate = z.infer<typeof CreditCardUpdateSchema>;

export const CreditSchema = z.object({
  ReferenceCardId: z.string().min(1),
  Title: z.string().min(1),
  Category: z.string().min(1),
  SubCategory: z.string().optional(),
  Description: z.string().optional(),
  Value: z.number().nonnegative(),
  TimePeriod: z.string().min(1),
  Requirements: z.string().optional(),
  Details: z.string().optional(),
  EffectiveFrom: z.string().regex(isoDateYYYYMMDD),
  EffectiveTo: z.string().regex(isoDateYYYYMMDD).optional(),
  isAnniversaryBased: z.boolean().optional(),  // true = anniversary-based, false/undefined = calendar
});

export const PerkSchema = z.object({
  ReferenceCardId: z.string().min(1),
  Title: z.string().min(1),
  Category: z.string().min(1),
  SubCategory: z.string().optional(),
  Description: z.string().min(1),
  Requirements: z.string().optional(),
  Details: z.string().optional(),
  EffectiveFrom: z.string().regex(isoDateYYYYMMDD),
  EffectiveTo: z.string().regex(isoDateYYYYMMDD).optional(),
});

export const MultiplierSchema = z.object({
  ReferenceCardId: z.string().min(1),
  Name: z.string().min(1),
  // Category is optional for rotating/selectable types
  Category: z.string().optional(),
  SubCategory: z.string().optional(),
  Description: z.string().min(1),
  Multiplier: z.number().gt(0),
  Requirements: z.string().optional(),
  Details: z.string().optional(),
  EffectiveFrom: z.string().regex(isoDateYYYYMMDD),
  EffectiveTo: z.string().regex(isoDateYYYYMMDD).optional(),
  multiplierType: z.enum(['standard', 'rotating', 'selectable']).optional(),
});

export function parseOr400<T>(parser: z.ZodType<T>, data: unknown) {
  const result = parser.safeParse(data);
  if (!result.success) {
    const flat = result.error.flatten();
    return { ok: false as const, errors: flat.fieldErrors };
  }
  return { ok: true as const, data: result.data };
}


