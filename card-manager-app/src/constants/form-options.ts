// Categories and subcategories from the data file
export const CATEGORIES = {
  travel: 'travel',
  dining: 'dining',
  shopping: 'shopping',
  gas: 'gas',
  entertainment: 'entertainment',
  transportation: 'transportation',
  Transit: 'Transit',
  general: 'general',
  'custom category': 'custom category',
  insurance: 'insurance',
  rent: 'rent',
  'Rewards Boost': 'Rewards Boost',
} as const;

export const SUBCATEGORIES: Record<string, string[]> = {
  travel: [
    'flights',
    'hotels',
    'portal',
    'lounge access',
    'ground transportation',
    'car rental',
    'tsa',
  ],
  shopping: ['supermarkets', 'online shopping', 'online grocery', 'drugstores', 'retail'],
  gas: ['gas stations', 'ev charging'],
  entertainment: ['streaming'],
  transportation: ['rideshare'],
  insurance: ['purchase', 'travel', 'car rental', 'cell phone protection', 'rental car protection'],
  dining: [],
  Transit: [],
  general: [],
  'custom category': [],
  rent: [],
  'Rewards Boost': [],
};

// Time periods for credits
export const TIME_PERIODS = [
  'Monthly',
  'Quarterly',
  'Semiannually',
  'Annually',
] as const;

// Rewards currencies
export const REWARDS_CURRENCIES = [
  'Points',
  'Cashback',
  'Miles',
  'Other',
] as const;

// Card networks
export const CARD_NETWORKS = ['Visa', 'Mastercard', 'American Express', 'Discover'] as const;

// Card issuers
export const CARD_ISSUERS = [
  'Chase',
  'American Express',
  'Capital One',
  'Citi',
  'Bank of America',
  'Wells Fargo',
  'U.S. Bank',
  'Barclays',
  'Discover',
  'Synchrony',
  'Other',
] as const;

// Helper function to validate ID format (only letters, numbers, hyphens)
export const validateIdFormat = (id: string): boolean => {
  return /^[a-zA-Z0-9-]+$/.test(id);
};

// Helper function to sanitize ID input
export const sanitizeId = (id: string): string => {
  return id.replace(/[^a-zA-Z0-9-]/g, '');
};
