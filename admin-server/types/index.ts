// Re-export types (local copies for deployment independence)
export type {
  CreditCard,
  CreditCardDetails,
  CardCredit,
  CardPerk,
  CardMultiplier
} from './credit-card-types';

export { ONGOING_SENTINEL_DATE } from '../constants/dates';

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
  // Note: ReferenceCardId is the document ID, not stored as a field
}
