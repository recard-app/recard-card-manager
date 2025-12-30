import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';
import type { CardCredit, CardPerk, CardMultiplier, RotatingScheduleEntry, AllowedCategoryEntry } from '@/types';

/**
 * Component Service
 * Handles all component-related API calls (credits, perks, multipliers)
 */
export class ComponentService {
  // ===== CREDITS =====

  /**
   * Get all credits for a specific card version
   */
  static async getCreditsByCardId(cardId: string): Promise<CardCredit[]> {
    const response = await apiClient.get<CardCredit[]>(API_ROUTES.CREDITS.LIST(cardId));
    return response.data;
  }

  /**
   * Create a new credit
   */
  static async createCredit(creditData: Omit<CardCredit, 'id' | 'LastUpdated'>): Promise<string> {
    const response = await apiClient.post<{ id: string }>(API_ROUTES.CREDITS.CREATE, creditData);
    return response.data.id;
  }

  /**
   * Update an existing credit
   */
  static async updateCredit(creditId: string, creditData: Partial<CardCredit>): Promise<void> {
    await apiClient.put(API_ROUTES.CREDITS.UPDATE(creditId), creditData);
  }

  /**
   * Delete a credit
   */
  static async deleteCredit(creditId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.CREDITS.DELETE(creditId));
  }

  // ===== PERKS =====

  /**
   * Get all perks for a specific card version
   */
  static async getPerksByCardId(cardId: string): Promise<CardPerk[]> {
    const response = await apiClient.get<CardPerk[]>(API_ROUTES.PERKS.LIST(cardId));
    return response.data;
  }

  /**
   * Create a new perk
   */
  static async createPerk(perkData: Omit<CardPerk, 'id' | 'LastUpdated'>): Promise<string> {
    const response = await apiClient.post<{ id: string }>(API_ROUTES.PERKS.CREATE, perkData);
    return response.data.id;
  }

  /**
   * Update an existing perk
   */
  static async updatePerk(perkId: string, perkData: Partial<CardPerk>): Promise<void> {
    await apiClient.put(API_ROUTES.PERKS.UPDATE(perkId), perkData);
  }

  /**
   * Delete a perk
   */
  static async deletePerk(perkId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.PERKS.DELETE(perkId));
  }

  // ===== MULTIPLIERS =====

  /**
   * Get all multipliers for a specific card version
   */
  static async getMultipliersByCardId(cardId: string): Promise<CardMultiplier[]> {
    const response = await apiClient.get<CardMultiplier[]>(API_ROUTES.MULTIPLIERS.LIST(cardId));
    return response.data;
  }

  /**
   * Create a new multiplier
   */
  static async createMultiplier(multiplierData: Omit<CardMultiplier, 'id' | 'LastUpdated'>): Promise<{ id: string }> {
    const response = await apiClient.post<{ id: string }>(
      API_ROUTES.MULTIPLIERS.CREATE,
      multiplierData
    );
    return response.data;
  }

  /**
   * Update an existing multiplier
   */
  static async updateMultiplier(
    multiplierId: string,
    multiplierData: Partial<CardMultiplier>
  ): Promise<void> {
    await apiClient.put(API_ROUTES.MULTIPLIERS.UPDATE(multiplierId), multiplierData);
  }

  /**
   * Delete a multiplier
   */
  static async deleteMultiplier(multiplierId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.MULTIPLIERS.DELETE(multiplierId));
  }

  // ===== ROTATING SCHEDULE =====

  /**
   * Get all rotating schedule entries for a multiplier
   */
  static async getRotatingSchedule(multiplierId: string): Promise<RotatingScheduleEntry[]> {
    const response = await apiClient.get<RotatingScheduleEntry[]>(
      API_ROUTES.MULTIPLIERS.SCHEDULE.LIST(multiplierId)
    );
    return response.data;
  }

  /**
   * Create a rotating schedule entry
   */
  static async createRotatingScheduleEntry(
    multiplierId: string,
    entryData: Omit<RotatingScheduleEntry, 'id'>
  ): Promise<{ id: string }> {
    const response = await apiClient.post<{ id: string }>(
      API_ROUTES.MULTIPLIERS.SCHEDULE.CREATE(multiplierId),
      entryData
    );
    return response.data;
  }

  /**
   * Delete a rotating schedule entry
   */
  static async deleteRotatingScheduleEntry(multiplierId: string, entryId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.MULTIPLIERS.SCHEDULE.DELETE(multiplierId, entryId));
  }

  // ===== ALLOWED CATEGORIES =====

  /**
   * Get all allowed categories for a selectable multiplier
   */
  static async getAllowedCategories(multiplierId: string): Promise<AllowedCategoryEntry[]> {
    const response = await apiClient.get<AllowedCategoryEntry[]>(
      API_ROUTES.MULTIPLIERS.ALLOWED_CATEGORIES.LIST(multiplierId)
    );
    return response.data;
  }

  /**
   * Create an allowed category entry
   */
  static async createAllowedCategory(
    multiplierId: string,
    categoryData: Omit<AllowedCategoryEntry, 'id'>
  ): Promise<{ id: string }> {
    const response = await apiClient.post<{ id: string }>(
      API_ROUTES.MULTIPLIERS.ALLOWED_CATEGORIES.CREATE(multiplierId),
      categoryData
    );
    return response.data;
  }

  /**
   * Delete an allowed category entry
   */
  static async deleteAllowedCategory(multiplierId: string, categoryId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.MULTIPLIERS.ALLOWED_CATEGORIES.DELETE(multiplierId, categoryId));
  }
}
