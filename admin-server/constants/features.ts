export const FEATURES = ['card-manager', 'user-manager'] as const;

export type FeatureKey = (typeof FEATURES)[number];

export const PERMISSIONS_COLLECTION = 'permissions';
