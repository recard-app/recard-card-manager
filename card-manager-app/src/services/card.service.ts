import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';
import type { CreditCardDetails } from '@/types';
import type { CardWithStatus, VersionSummary } from '@/types/ui-types';

/**
 * Card Service
 * Handles all card-related API calls to the Server admin endpoints
 */
export class CardService {
  /**
   * Get all cards with their status
   */
  static async getAllCardsWithStatus(): Promise<CardWithStatus[]> {
    const response = await apiClient.get<CardWithStatus[]>(API_ROUTES.CARDS.LIST);
    return response.data;
  }

  /**
   * Get a card by ID
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
   * Create a new card
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
   * Delete a card
   */
  static async deleteCard(cardId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.CARDS.DELETE(cardId));
  }

  /**
   * Create a new version of an existing card
   */
  static async createNewVersion(
    referenceCardId: string,
    newVersionData: Omit<CreditCardDetails, 'id' | 'ReferenceCardId' | 'lastUpdated'>
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
}
