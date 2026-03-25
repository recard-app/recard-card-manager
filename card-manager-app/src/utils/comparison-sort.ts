import type { FieldComparisonResult, ComponentComparisonResult } from '@/types/comparison-types';

const CARD_DETAIL_SEVERITY: Record<string, number> = { mismatch: 0, questionable: 1, missing_from_website: 2, match: 3 };
const COMPONENT_SEVERITY: Record<string, number> = { outdated: 0, new: 1, missing: 2, questionable: 3, match: 4 };

export function sortCardDetails(items: FieldComparisonResult[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (CARD_DETAIL_SEVERITY[a.item.status] ?? 99) - (CARD_DETAIL_SEVERITY[b.item.status] ?? 99));
}

export function sortComponents(items: ComponentComparisonResult[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (COMPONENT_SEVERITY[a.item.status] ?? 99) - (COMPONENT_SEVERITY[b.item.status] ?? 99));
}
