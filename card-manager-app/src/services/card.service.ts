import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';
import type { CreditCardDetails } from '@/types';
import type { CardWithStatus, CreditCardName, VersionSummary, CardCharacteristics } from '@/types/ui-types';

/**
 * Card Service
 * Handles all card-related API calls to the Server admin endpoints
 */
export class CardService {
  // ===== CARD NAMES (credit_cards_names collection) =====

  /**
   * Create a new card name entry (top-level card identity)
   * @param referenceCardId The unique identifier for the card (will be the document ID)
   * @param cardName The display name of the card
   * @param cardIssuer The issuer of the card
   * @param cardCharacteristics Optional card characteristics (standard, rotating, selectable)
   * @returns The created card name data
   */
  static async createCardName(
    referenceCardId: string,
    cardName: string,
    cardIssuer: string,
    cardCharacteristics?: CardCharacteristics
  ): Promise<CreditCardName> {
    const response = await apiClient.post<CreditCardName>(
      API_ROUTES.CARD_NAMES.CREATE(referenceCardId),
      {
        CardName: cardName,
        CardIssuer: cardIssuer,
        ...(cardCharacteristics && { CardCharacteristics: cardCharacteristics })
      }
    );
    return response.data;
  }

  /**
   * Get a card name entry by ReferenceCardId
   */
  static async getCardName(referenceCardId: string): Promise<CreditCardName | null> {
    try {
      const response = await apiClient.get<CreditCardName>(
        API_ROUTES.CARD_NAMES.DETAILS(referenceCardId)
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a card name entry
   */
  static async updateCardName(
    referenceCardId: string,
    data: { CardName?: string; CardIssuer?: string; CardCharacteristics?: CardCharacteristics }
  ): Promise<void> {
    await apiClient.put(API_ROUTES.CARD_NAMES.UPDATE(referenceCardId), data);
  }

  /**
   * Get all card names
   */
  static async getAllCardNames(): Promise<CreditCardName[]> {
    const response = await apiClient.get<CreditCardName[]>(API_ROUTES.CARD_NAMES.LIST);
    return response.data;
  }

  // ===== CARDS WITH STATUS =====

  /**
   * Get all cards with their status (combines card names and versions)
   */
  static async getAllCardsWithStatus(): Promise<CardWithStatus[]> {
    const response = await apiClient.get<CardWithStatus[]>(API_ROUTES.CARDS.LIST);
    return response.data;
  }

  // ===== CARD VERSIONS (credit_cards_history collection) =====

  /**
   * Get a card version by ID
   */
  static async getCardById(cardId: string): Promise<CreditCardDetails | null> {
    try {
      const response = await apiClient.get<CreditCardDetails>(API_ROUTES.CARDS.DETAILS(cardId));
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all versions for a card by ReferenceCardId
   */
  static async getVersionsByReferenceCardId(referenceCardId: string): Promise<VersionSummary[]> {
    const response = await apiClient.get<VersionSummary[]>(
      API_ROUTES.VERSIONS.LIST(referenceCardId)
    );
    return response.data;
  }

  /**
   * Create a new card (legacy - creates a version in credit_cards_history)
   * @deprecated Use createCardName() to create the card identity, then createNewVersion() to add versions
   * @param cardData The card data including ReferenceCardId which will be used as the card ID
   * @param setAsActive Whether to set this card version as active
   * @returns The created card ID (same as ReferenceCardId for the first version)
   */
  static async createCard(
    cardData: Omit<CreditCardDetails, 'id' | 'lastUpdated'>,
    setAsActive: boolean
  ): Promise<string> {
    // Use ReferenceCardId as the card ID for the first version
    const cardId = cardData.ReferenceCardId;
    const response = await apiClient.post<{ id: string }>(
      API_ROUTES.CARDS.CREATE(cardId),
      { ...cardData, IsActive: setAsActive }
    );
    return response.data.id;
  }

  /**
   * Update an existing card
   */
  static async updateCard(cardId: string, cardData: Partial<CreditCardDetails>): Promise<void> {
    await apiClient.put(API_ROUTES.CARDS.UPDATE(cardId), cardData);
  }

  /**
   * Delete a card version
   */
  static async deleteCard(cardId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.CARDS.DELETE(cardId));
  }

  /**
   * Delete an entire card (all versions and associated components)
   */
  static async deleteEntireCard(referenceCardId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.CARDS.DELETE_ENTIRE(referenceCardId));
  }

  /**
   * Create a new version of an existing card
   */
  static async createNewVersion(
    referenceCardId: string,
    newVersionData: Partial<Omit<CreditCardDetails, 'id' | 'ReferenceCardId' | 'lastUpdated'>>
  ): Promise<string> {
    const response = await apiClient.post<{ id: string }>(
      API_ROUTES.VERSIONS.CREATE_AUTO(referenceCardId),
      newVersionData
    );
    return response.data.id;
  }

  /**
   * Activate a version
   */
  static async activateVersion(
    referenceCardId: string,
    versionId: string,
    options: { deactivateOthers: boolean }
  ): Promise<void> {
    await apiClient.post(
      API_ROUTES.VERSIONS.ACTIVATE(referenceCardId, versionId),
      options
    );
  }

  /**
   * Deactivate a specific version
   */
  static async deactivateVersion(
    referenceCardId: string,
    versionId: string
  ): Promise<void> {
    await apiClient.post(
      API_ROUTES.VERSIONS.DEACTIVATE(referenceCardId, versionId),
      {}
    );
  }

  /**
   * Sync all active versions to credit_cards collection
   * Also removes any orphaned entries that shouldn't exist
   */
  static async syncAllToProduction(): Promise<{
    success: boolean;
    message: string;
    synced: number;
    removed: number;
    syncedCards: string[];
    removedCards: string[];
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      synced: number;
      removed: number;
      syncedCards: string[];
      removedCards: string[];
    }>(API_ROUTES.CARDS.SYNC_ALL, {});
    return response.data;
  }
}
