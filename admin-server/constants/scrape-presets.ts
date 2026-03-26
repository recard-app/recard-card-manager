/**
 * Scrape Strategy Presets
 *
 * Defines named presets for scrape strategy configurations.
 * Each preset specifies which scrapers run in parallel (primary)
 * and which serve as sequential fallback.
 */

import type { ScrapePreset, ScrapeStrategy } from '../types/review-types';

export const SCRAPE_PRESETS: Record<ScrapePreset, ScrapeStrategy> = {
  default: {
    primary: ['firecrawl'],
    fallback: ['cloudflare-markdown', 'cloudflare-content', 'jina'],
  },
  max: {
    primary: ['firecrawl', 'cloudflare-markdown', 'cloudflare-content', 'jina'],
    fallback: [],
  },
  thorough: {
    primary: ['cloudflare-markdown', 'cloudflare-content', 'jina'],
    fallback: [],
  },
  'cheap-thorough': {
    primary: ['cloudflare', 'jina'],
    fallback: [],
  },
  cheap: {
    primary: ['cloudflare-markdown'],
    fallback: ['cloudflare-content', 'jina'],
  },
};

export const DEFAULT_SCRAPE_PRESET: ScrapePreset = 'default';
