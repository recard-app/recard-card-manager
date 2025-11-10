import type { CardCredit, CardPerk, CardMultiplier } from '@/types';
import { Button } from '@/components/ui/Button';
import { ChevronRight, Plus } from 'lucide-react';
import { ComponentTabs } from './ComponentTabs';
import './ComponentsSidebar.scss';

interface ComponentsSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: 'credits' | 'perks' | 'multipliers';
  onTabChange: (tab: 'credits' | 'perks' | 'multipliers') => void;
  credits: CardCredit[];
  perks: CardPerk[];
  multipliers: CardMultiplier[];
  onEdit: (type: 'credits' | 'perks' | 'multipliers', id: string) => void;
  onDelete: (type: 'credits' | 'perks' | 'multipliers', id: string) => void;
  onAdd: (type: 'credits' | 'perks' | 'multipliers') => void;
}

export function ComponentsSidebar({
  collapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  credits,
  perks,
  multipliers,
  onEdit,
  onDelete,
  onAdd,
}: ComponentsSidebarProps) {
  if (collapsed) {
    return (
      <div className="components-sidebar collapsed">
        <button className="collapse-toggle" onClick={onToggleCollapse}>
          <ChevronRight size={20} />
        </button>
        <div className="collapsed-label">
          <span>Components</span>
        </div>
      </div>
    );
  }

  return (
    <div className="components-sidebar">
      <div className="sidebar-header">
        <div className="header-content">
          <h3>Components</h3>
          <Button size="sm" onClick={() => onAdd(activeTab)}>
            <Plus size={14} />
            Add
          </Button>
        </div>
        <button className="collapse-toggle" onClick={onToggleCollapse}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="sidebar-content">
        <ComponentTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          credits={credits}
          perks={perks}
          multipliers={multipliers}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
