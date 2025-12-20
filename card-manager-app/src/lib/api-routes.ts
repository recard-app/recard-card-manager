/**
 * API Routes for Card Manager
 * All routes are prefixed with /admin to indicate admin-only access
 */

export const API_ROUTES = {
  // Permission check (public endpoint, no auth required)
  PERMISSIONS: {
    CHECK: (email: string) => `/admin/check-permission/${encodeURIComponent(email)}`,
  },

  // Card Names routes (top-level card identities in credit_cards_names collection)
  CARD_NAMES: {
    LIST: '/admin/cards/card-names',
    CREATE: (referenceCardId: string) => `/admin/cards/card-names/${referenceCardId}`,
    DETAILS: (referenceCardId: string) => `/admin/cards/card-names/${referenceCardId}`,
    UPDATE: (referenceCardId: string) => `/admin/cards/card-names/${referenceCardId}`,
    DELETE: (referenceCardId: string) => `/admin/cards/card-names/${referenceCardId}`,
  },

  // Card routes (for versions in credit_cards_history collection)
  CARDS: {
    LIST: '/admin/cards',
    CREATE: (cardId: string) => `/admin/cards/${cardId}`,
    DETAILS: (cardId: string) => `/admin/cards/${cardId}`,
    UPDATE: (cardId: string) => `/admin/cards/${cardId}`,
    DELETE: (cardId: string) => `/admin/cards/${cardId}`,
    DELETE_ENTIRE: (referenceCardId: string) => `/admin/cards/reference/${referenceCardId}/all`,
    SYNC_ALL: '/admin/cards/sync-all',
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

  // AI Assistant routes
  AI: {
    GENERATE: '/admin/ai/generate',
  },
};
