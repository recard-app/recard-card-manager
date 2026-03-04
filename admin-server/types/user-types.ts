// User management types (independent copies for deployment independence)

export const SUBSCRIPTION_PLAN = {
  FREE: 'free',
  PLUS: 'plus',
  PRO: 'pro',
} as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELED: 'canceled',
  NONE: 'none',
} as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const BILLING_PERIOD = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;
export type BillingPeriod = (typeof BILLING_PERIOD)[keyof typeof BILLING_PERIOD];

export const ROLE_TYPE = {
  ADMIN: 'admin',
  WORKER: 'worker',
  USER: 'user',
} as const;
export type RoleType = (typeof ROLE_TYPE)[keyof typeof ROLE_TYPE];

export interface UserListItem {
  uid: string;
  email: string;
  displayName: string | null;
  subscriptionPlan: SubscriptionPlan;
  role: RoleType;
}

export interface UserDetail {
  uid: string;
  email: string;
  displayName: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  role: RoleType;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionBillingPeriod: BillingPeriod | null;
  subscriptionStartedAt: string | null;
  subscriptionExpiresAt: string | null;
  preferences: Record<string, unknown>;
  wallet: {
    cardCount: number;
    cardNames: string[];
  };
  chatCount: number;
}

export interface SubscriptionUpdatePayload {
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionBillingPeriod?: BillingPeriod | null;
  subscriptionStartedAt?: string | null;
  subscriptionExpiresAt?: string | null;
}
