// Re-export types (local copies for deployment independence)
export type {
  CreditCard,
  CreditCardDetails,
  CardCredit,
  CardPerk,
  CardMultiplier
} from './credit-card-types';

export type {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingPeriod,
  RoleType,
  UserListItem,
  UserDetail,
  SubscriptionUpdatePayload,
} from './user-types';

export {
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
  BILLING_PERIOD,
  ROLE_TYPE,
} from './user-types';

export { ONGOING_SENTINEL_DATE } from '../constants/dates';

export type {
  ReviewStatus,
  BatchStatus,
  ReviewTrigger,
  UrlStatus,
  ScrapeSource,
  UrlResult,
  ReviewHealth,
  ScrapeUsageEntry,
  ReviewUsage,
  ReviewResult,
  ReviewBatch,
  QueueReviewsRequest,
  QueueReviewsResponse,
  ReviewResultsQuery,
  ReviewResultsResponse,
} from './review-types';

export {
  GEMINI_PRICING,
  calculateReviewCost,
} from './review-types';

/**
 * Card characteristics - indicates if card has rotating or selectable multipliers
 */
export type CardCharacteristics = 'standard' | 'rotating' | 'selectable';

/**
 * Top-level card identity from credit_cards_names collection.
 * The ReferenceCardId is the document ID in Firestore.
 */
export interface CreditCardName {
  CardName: string;
  CardIssuer: string;
  CardCharacteristics?: CardCharacteristics;  // defaults to 'standard'
  websiteUrls?: string[];  // Official card page URLs for automated reviews
  // Note: ReferenceCardId is the document ID, not stored as a field
}
