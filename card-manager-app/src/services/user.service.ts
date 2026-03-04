import { apiClient } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/api-routes';
import type { UserListItem, UserDetail, SubscriptionUpdatePayload } from '@/types/user-types';

/**
 * User Service
 * Handles all user management API calls to the admin server
 */
export class UserService {
  static async listUsers(): Promise<UserListItem[]> {
    const response = await apiClient.get<UserListItem[]>(API_ROUTES.USERS.LIST);
    return response.data;
  }

  static async getUserDetail(userId: string): Promise<UserDetail> {
    const response = await apiClient.get<UserDetail>(API_ROUTES.USERS.DETAIL(userId));
    return response.data;
  }

  static async updateSubscription(
    userId: string,
    data: SubscriptionUpdatePayload
  ): Promise<void> {
    await apiClient.patch(API_ROUTES.USERS.UPDATE_SUBSCRIPTION(userId), data);
  }

  static async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.USERS.DELETE(userId));
  }
}
