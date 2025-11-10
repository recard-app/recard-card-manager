import { useState } from 'react';
import type { CardCredit, CardPerk, CardMultiplier } from '@/types';
import { Button } from '@/components/ui/Button';
import { ChevronRight, Plus, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filterComponents = <T extends { id: string; Title?: string; Name?: string }>(
    components: T[]
  ): T[] => {
    if (!searchQuery.trim()) return components;
    const query = searchQuery.toLowerCase();
    return components.filter(component => {
      const title = (component.Title ?? component.Name ?? '').toLowerCase();
      return component.id.toLowerCase().includes(query) || title.includes(query);
    });
  };

  const filteredCredits = filterComponents(credits);
  const filteredPerks = filterComponents(perks);
  const filteredMultipliers = filterComponents(multipliers);

  const getAddButtonLabel = () => {
    switch (activeTab) {
      case 'credits':
        return 'Add Credit';
      case 'perks':
        return 'Add Perk';
      case 'multipliers':
        return 'Add Multiplier';
    }
  };

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
            {getAddButtonLabel()}
          </Button>
        </div>
        <button className="collapse-toggle" onClick={onToggleCollapse}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-content">
        <ComponentTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          credits={filteredCredits}
          perks={filteredPerks}
          multipliers={filteredMultipliers}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
