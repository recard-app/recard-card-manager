/**
 * API Routes for Card Manager
 * All routes are prefixed with /admin to indicate admin-only access
 */

export const API_ROUTES = {
  // Card routes
  CARDS: {
    LIST: '/admin/cards',
    CREATE: (cardId: string) => `/admin/cards/${cardId}`,
    DETAILS: (cardId: string) => `/admin/cards/${cardId}`,
    UPDATE: (cardId: string) => `/admin/cards/${cardId}`,
    DELETE: (cardId: string) => `/admin/cards/${cardId}`,
    DELETE_ENTIRE: (referenceCardId: string) => `/admin/cards/reference/${referenceCardId}/all`,
  },

  // Version management routes
  VERSIONS: {
    LIST: (referenceCardId: string) => `/admin/cards/${referenceCardId}/versions`,
    CREATE: (referenceCardId: string, versionId: string) => `/admin/cards/${referenceCardId}/versions/${versionId}`,
    CREATE_AUTO: (referenceCardId: string) => `/admin/cards/${referenceCardId}/versions`,
    ACTIVATE: (referenceCardId: string, versionId: string) =>
      `/admin/cards/${referenceCardId}/versions/${versionId}/activate`,
    DEACTIVATE: (referenceCardId: string, versionId: string) =>
      `/admin/cards/${referenceCardId}/versions/${versionId}/deactivate`,
  },

  // Component routes - Credits
  CREDITS: {
    LIST: (cardId: string) => `/admin/cards/${cardId}/credits`,
    CREATE: '/admin/credits',
    UPDATE: (creditId: string) => `/admin/credits/${creditId}`,
    DELETE: (creditId: string) => `/admin/credits/${creditId}`,
  },

  // Component routes - Perks
  PERKS: {
    LIST: (cardId: string) => `/admin/cards/${cardId}/perks`,
    CREATE: '/admin/perks',
    UPDATE: (perkId: string) => `/admin/perks/${perkId}`,
    DELETE: (perkId: string) => `/admin/perks/${perkId}`,
  },

  // Component routes - Multipliers
  MULTIPLIERS: {
    LIST: (cardId: string) => `/admin/cards/${cardId}/multipliers`,
    CREATE: '/admin/multipliers',
    UPDATE: (multiplierId: string) => `/admin/multipliers/${multiplierId}`,
    DELETE: (multiplierId: string) => `/admin/multipliers/${multiplierId}`,
  },
};
