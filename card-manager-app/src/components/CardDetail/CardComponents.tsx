import type { CardCredit, CardPerk, CardMultiplier, CreditCardDetails } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/utils/date-utils';
import './CardComponents.scss';

interface CardComponentsProps {
  card: CreditCardDetails;
  credits: CardCredit[];
  perks: CardPerk[];
  multipliers: CardMultiplier[];
}

interface ComponentWithStatus {
  id: string;
  type: 'credit' | 'perk' | 'multiplier';
  title: string;
  category: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  value?: string;
  multiplier?: number;
}

export function CardComponents({ card, credits, perks, multipliers }: CardComponentsProps) {
  // Helper to check if two date ranges overlap
  const dateRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    // Convert dates to comparable format
    const s1 = new Date(start1).getTime();
    const e1 = end1 === '9999-12-31' ? Infinity : new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = end2 === '9999-12-31' ? Infinity : new Date(end2).getTime();

    // Check for overlap: start1 <= end2 AND end1 >= start2
    return s1 <= e2 && e1 >= s2;
  };

  // Helper to check if a component is currently active (today is within range)
  const isCurrentlyActive = (effectiveFrom: string, effectiveTo: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    const start = new Date(effectiveFrom).getTime();
    const end = effectiveTo === '9999-12-31' ? Infinity : new Date(effectiveTo).getTime();
    const now = new Date(today).getTime();

    return now >= start && now <= end;
  };

  // Filter and transform credits
  const relevantCredits: ComponentWithStatus[] = credits
    .filter(credit =>
      dateRangesOverlap(
        credit.EffectiveFrom,
        credit.EffectiveTo,
        card.effectiveFrom,
        card.effectiveTo
      )
    )
    .map(credit => ({
      id: credit.id,
      type: 'credit' as const,
      title: credit.Title,
      category: credit.Category,
      description: credit.Description,
      effectiveFrom: credit.EffectiveFrom,
      effectiveTo: credit.EffectiveTo,
      isActive: isCurrentlyActive(credit.EffectiveFrom, credit.EffectiveTo),
      value: credit.Value,
    }));

  // Filter and transform perks
  const relevantPerks: ComponentWithStatus[] = perks
    .filter(perk =>
      dateRangesOverlap(
        perk.EffectiveFrom,
        perk.EffectiveTo,
        card.effectiveFrom,
        card.effectiveTo
      )
    )
    .map(perk => ({
      id: perk.id,
      type: 'perk' as const,
      title: perk.Title,
      category: perk.Category,
      description: perk.Description,
      effectiveFrom: perk.EffectiveFrom,
      effectiveTo: perk.EffectiveTo,
      isActive: isCurrentlyActive(perk.EffectiveFrom, perk.EffectiveTo),
    }));

  // Filter and transform multipliers
  const relevantMultipliers: ComponentWithStatus[] = multipliers
    .filter(multiplier =>
      dateRangesOverlap(
        multiplier.EffectiveFrom,
        multiplier.EffectiveTo,
        card.effectiveFrom,
        card.effectiveTo
      )
    )
    .map(multiplier => ({
      id: multiplier.id,
      type: 'multiplier' as const,
      title: multiplier.Name,
      category: multiplier.Category,
      description: multiplier.Description,
      effectiveFrom: multiplier.EffectiveFrom,
      effectiveTo: multiplier.EffectiveTo,
      isActive: isCurrentlyActive(multiplier.EffectiveFrom, multiplier.EffectiveTo),
      multiplier: multiplier.Multiplier || undefined,
    }));

  // Combine and sort: active first, then by effectiveTo (most recent first)
  const allComponents = [...relevantCredits, ...relevantPerks, ...relevantMultipliers].sort(
    (a, b) => {
      // Active components first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;

      // Then sort by effectiveTo (most recent first)
      if (a.effectiveTo === '9999-12-31' && b.effectiveTo !== '9999-12-31') return -1;
      if (a.effectiveTo !== '9999-12-31' && b.effectiveTo === '9999-12-31') return 1;

      return b.effectiveTo.localeCompare(a.effectiveTo);
    }
  );

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'credit':
        return 'Credit';
      case 'perk':
        return 'Perk';
      case 'multiplier':
        return 'Multiplier';
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string): 'default' | 'info' | 'success' | 'warning' => {
    switch (type) {
      case 'credit':
        return 'success';
      case 'perk':
        return 'info';
      case 'multiplier':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (allComponents.length === 0) {
    return (
      <div className="card-components">
        <h2>Card Components</h2>
        <div className="empty-state">
          No credits, perks, or multipliers are associated with this card version.
        </div>
      </div>
    );
  }

  return (
    <div className="card-components">
      <h2>Card Components</h2>
      <p className="components-description">
        Components that overlap with this card version's effective dates ({formatDate(card.effectiveFrom)}
        {' - '}
        {card.effectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(card.effectiveTo)})
      </p>

      <div className="components-list">
        {allComponents.map(component => (
          <div key={`${component.type}-${component.id}`} className="component-card">
            <div className="component-header">
              <div className="component-title-row">
                <h3>{component.title}</h3>
                <div className="badges">
                  <Badge variant={getTypeBadgeVariant(component.type)}>
                    {getTypeLabel(component.type)}
                  </Badge>
                  {component.isActive && (
                    <Badge variant="success">Active</Badge>
                  )}
                  {!component.isActive && (
                    <Badge variant="default">Inactive</Badge>
                  )}
                </div>
              </div>
              <div className="component-meta">
                <span className="category">{component.category}</span>
                {component.value && (
                  <span className="value">{component.value}</span>
                )}
                {component.multiplier !== undefined && (
                  <span className="multiplier-value">{component.multiplier}x</span>
                )}
              </div>
            </div>

            <p className="component-description">{component.description}</p>

            <div className="component-dates">
              <span className="date-label">Effective:</span>
              <span className="date-range">
                {formatDate(component.effectiveFrom)}
                {' - '}
                {component.effectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(component.effectiveTo)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
