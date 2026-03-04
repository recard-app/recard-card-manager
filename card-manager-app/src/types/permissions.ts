export type FeatureKey = 'card-manager' | 'user-manager';

export type FeaturePermissions = Record<FeatureKey, boolean>;

export const DEFAULT_PERMISSIONS: FeaturePermissions = {
  'card-manager': false,
  'user-manager': false,
};

export function hasAnyPermission(permissions: FeaturePermissions): boolean {
  return Object.values(permissions).some(Boolean);
}
