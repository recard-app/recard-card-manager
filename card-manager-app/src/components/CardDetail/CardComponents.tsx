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

export function CardComponents({ card: _card, credits, perks, multipliers }: CardComponentsProps) {
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
    .filter(credit => isCurrentlyActive(credit.EffectiveFrom, credit.EffectiveTo))
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
    .filter(perk => isCurrentlyActive(perk.EffectiveFrom, perk.EffectiveTo))
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
    .filter(multiplier => isCurrentlyActive(multiplier.EffectiveFrom, multiplier.EffectiveTo))
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

  const sortByActiveAndDate = (a: ComponentWithStatus, b: ComponentWithStatus) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.effectiveTo === '9999-12-31' && b.effectiveTo !== '9999-12-31') return -1;
    if (a.effectiveTo !== '9999-12-31' && b.effectiveTo === '9999-12-31') return 1;
    return b.effectiveTo.localeCompare(a.effectiveTo);
  };

  const sortedCredits = [...relevantCredits].sort(sortByActiveAndDate);
  const sortedPerks = [...relevantPerks].sort(sortByActiveAndDate);
  const sortedMultipliers = [...relevantMultipliers].sort(sortByActiveAndDate);

  // Category badges removed since sections are already split by type

  if (sortedCredits.length === 0 && sortedPerks.length === 0 && sortedMultipliers.length === 0) {
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
      <p className="components-description">Components currently active based on their effective dates</p>

      {sortedCredits.length > 0 && (
        <div className="components-section">
          <h3>Credits</h3>
          <div className="components-list">
            {sortedCredits.map(component => (
              <div key={`${component.type}-${component.id}`} className="component-card">
                <div className="component-header">
                  <div className="component-title-row">
                    <h3>{component.title}</h3>
                    <div className="badges">
                      {component.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="component-meta">
                    <span className="category">{component.category}</span>
                    {component.value && <span className="value">{component.value}</span>}
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
      )}

      {sortedPerks.length > 0 && (
        <div className="components-section">
          <h3>Perks</h3>
          <div className="components-list">
            {sortedPerks.map(component => (
              <div key={`${component.type}-${component.id}`} className="component-card">
                <div className="component-header">
                  <div className="component-title-row">
                    <h3>{component.title}</h3>
                    <div className="badges">
                      {component.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="component-meta">
                    <span className="category">{component.category}</span>
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
      )}

      {sortedMultipliers.length > 0 && (
        <div className="components-section">
          <h3>Multipliers</h3>
          <div className="components-list">
            {sortedMultipliers.map(component => (
              <div key={`${component.type}-${component.id}`} className="component-card">
                <div className="component-header">
                  <div className="component-title-row">
                    <h3>{component.title}</h3>
                    <div className="badges">
                      {component.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="component-meta">
                    <span className="category">{component.category}</span>
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
      )}
    </div>
  );
}
