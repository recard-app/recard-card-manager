import type { CardCredit, CardPerk, CardMultiplier } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Edit2, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/date-utils';
import './ComponentTabs.scss';

interface ComponentTabsProps {
  activeTab: 'credits' | 'perks' | 'multipliers';
  onTabChange: (tab: 'credits' | 'perks' | 'multipliers') => void;
  credits: CardCredit[];
  perks: CardPerk[];
  multipliers: CardMultiplier[];
  onEdit: (type: 'credits' | 'perks' | 'multipliers', id: string) => void;
  onDelete: (type: 'credits' | 'perks' | 'multipliers', id: string) => void;
}

export function ComponentTabs({
  activeTab,
  onTabChange,
  credits,
  perks,
  multipliers,
  onEdit,
  onDelete,
}: ComponentTabsProps) {
  return (
    <div className="component-tabs">
      <div className="tabs-header">
        <button
          className={`tab ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => onTabChange('credits')}
        >
          Credits ({credits.length})
        </button>
        <button
          className={`tab ${activeTab === 'perks' ? 'active' : ''}`}
          onClick={() => onTabChange('perks')}
        >
          Perks ({perks.length})
        </button>
        <button
          className={`tab ${activeTab === 'multipliers' ? 'active' : ''}`}
          onClick={() => onTabChange('multipliers')}
        >
          Multipliers ({multipliers.length})
        </button>
      </div>

      <div className="tabs-content">
        {activeTab === 'credits' && (
          <CreditsList
            credits={credits}
            onEdit={(id) => onEdit('credits', id)}
            onDelete={(id) => onDelete('credits', id)}
          />
        )}

        {activeTab === 'perks' && (
          <PerksList
            perks={perks}
            onEdit={(id) => onEdit('perks', id)}
            onDelete={(id) => onDelete('perks', id)}
          />
        )}

        {activeTab === 'multipliers' && (
          <MultipliersList
            multipliers={multipliers}
            onEdit={(id) => onEdit('multipliers', id)}
            onDelete={(id) => onDelete('multipliers', id)}
          />
        )}
      </div>
    </div>
  );
}

interface CreditsListProps {
  credits: CardCredit[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function CreditsList({ credits, onEdit, onDelete }: CreditsListProps) {
  if (credits.length === 0) {
    return <div className="empty-state">No credits defined for this version</div>;
  }

  return (
    <div className="components-list">
      {credits.map((credit) => (
        <div key={credit.id} className="component-item">
          <div className="component-item-header">
            <div className="component-title">
              <div className="component-title-text">
                <h4>{credit.Title}</h4>
                <div className="component-id">ID: {credit.id}</div>
                <Badge variant="info">{credit.Category}</Badge>
              </div>
            </div>
            <div className="component-actions">
              <Button variant="ghost" size="sm" onClick={() => onEdit(credit.id)}>
                <Edit2 size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(credit.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          <div className="component-details">
            <div className="detail-row">
              <span className="label">Value:</span>
              <span className="value">{credit.Value}</span>
            </div>
            <div className="detail-row">
              <span className="label">Time Period:</span>
              <span className="value">{credit.TimePeriod}</span>
            </div>
            <div className="detail-row">
              <span className="label">Description:</span>
              <span className="value">{credit.Description}</span>
            </div>
            <div className="detail-row">
              <span className="label">Effective:</span>
              <span className="value">
                {formatDate(credit.EffectiveFrom)} - {credit.EffectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(credit.EffectiveTo)}
              </span>
            </div>
            {credit.Requirements && (
              <div className="detail-row">
                <span className="label">Requirements:</span>
                <span className="value">{credit.Requirements}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface PerksListProps {
  perks: CardPerk[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function PerksList({ perks, onEdit, onDelete }: PerksListProps) {
  if (perks.length === 0) {
    return <div className="empty-state">No perks defined for this version</div>;
  }

  return (
    <div className="components-list">
      {perks.map((perk) => (
        <div key={perk.id} className="component-item">
          <div className="component-item-header">
            <div className="component-title">
              <div className="component-title-text">
                <h4>{perk.Title}</h4>
                <div className="component-id">ID: {perk.id}</div>
                <Badge variant="info">{perk.Category}</Badge>
              </div>
            </div>
            <div className="component-actions">
              <Button variant="ghost" size="sm" onClick={() => onEdit(perk.id)}>
                <Edit2 size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(perk.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          <div className="component-details">
            <div className="detail-row">
              <span className="label">Description:</span>
              <span className="value">{perk.Description}</span>
            </div>
            <div className="detail-row">
              <span className="label">Effective:</span>
              <span className="value">
                {formatDate(perk.EffectiveFrom)} - {perk.EffectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(perk.EffectiveTo)}
              </span>
            </div>
            {perk.Requirements && (
              <div className="detail-row">
                <span className="label">Requirements:</span>
                <span className="value">{perk.Requirements}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MultipliersListProps {
  multipliers: CardMultiplier[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function MultipliersList({ multipliers, onEdit, onDelete }: MultipliersListProps) {
  if (multipliers.length === 0) {
    return <div className="empty-state">No multipliers defined for this version</div>;
  }

  return (
    <div className="components-list">
      {multipliers.map((multiplier) => (
        <div key={multiplier.id} className="component-item">
          <div className="component-item-header">
            <div className="component-title">
              <div className="component-title-text">
                <h4>{multiplier.Name}</h4>
                <div className="component-id">ID: {multiplier.id}</div>
                <Badge variant="success">{multiplier.Multiplier}x</Badge>
              </div>
            </div>
            <div className="component-actions">
              <Button variant="ghost" size="sm" onClick={() => onEdit(multiplier.id)}>
                <Edit2 size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(multiplier.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          <div className="component-details">
            <div className="detail-row">
              <span className="label">Category:</span>
              <span className="value">{multiplier.Category}</span>
            </div>
            <div className="detail-row">
              <span className="label">Description:</span>
              <span className="value">{multiplier.Description}</span>
            </div>
            <div className="detail-row">
              <span className="label">Effective:</span>
              <span className="value">
                {formatDate(multiplier.EffectiveFrom)} - {multiplier.EffectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(multiplier.EffectiveTo)}
              </span>
            </div>
            {multiplier.Requirements && (
              <div className="detail-row">
                <span className="label">Requirements:</span>
                <span className="value">{multiplier.Requirements}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
