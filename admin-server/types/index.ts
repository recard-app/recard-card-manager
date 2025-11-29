// Re-export types from Server
export type {
  CreditCard,
  CreditCardDetails,
  CardCredit,
  CardPerk,
  CardMultiplier
} from '../../../Server/types/credit-card-types';

export { ONGOING_SENTINEL_DATE } from '../../../Server/constants/dates';

/**
 * Top-level card identity from credit_cards_names collection.
 * The ReferenceCardId is the document ID in Firestore.
 */
export interface CreditCardName {
  CardName: string;
  CardIssuer: string;
  // Note: ReferenceCardId is the document ID, not stored as a field
}
