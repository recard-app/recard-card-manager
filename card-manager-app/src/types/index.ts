// Re-export types (local copies for deployment independence)
export type {
  CreditCard,
  CreditCardDetails,
  CreditCardDetailsEnhanced,
  CardCredit,
  CardPerk,
  CardMultiplier,
  MultiplierType,
  SpendingCap,
  SpendingCapPeriod,
  SchedulePeriodType,
  RotatingScheduleEntry,
  AllowedCategoryEntry,
  EnrichedMultiplier
} from './credit-card-types';

// Re-export constants and helpers
export {
  MULTIPLIER_TYPES,
  SPENDING_CAP_PERIODS,
  SCHEDULE_PERIOD_TYPES,
  MULTIPLIER_TYPE_DISPLAY_NAMES,
  SCHEDULE_PERIOD_DISPLAY_NAMES,
  SPENDING_CAP_PERIOD_DISPLAY_NAMES,
  isRotatingMultiplier,
  isSelectableMultiplier,
  formatSpendingCap
} from './credit-card-types';
export { ONGOING_SENTINEL_DATE, isOngoingDate, normalizeEffectiveTo, denormalizeEffectiveTo } from '../constants/dates';
