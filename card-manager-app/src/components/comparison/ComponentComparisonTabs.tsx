import { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type {
  ComponentComparisonResult,
  ComponentComparisonStatus,
} from '@/types/comparison-types';
import { ProposedFix } from './ProposedFix';
import './ComponentComparisonTabs.scss';

interface ComponentComparisonTabsProps {
  perks: ComponentComparisonResult[];
  credits: ComponentComparisonResult[];
  defaultTab?: TabType;
  /** Optional callback when an edit/create button is clicked on a component */
  onEditComponent?: (componentType: 'credits' | 'perks' | 'multipliers', component: ComponentComparisonResult) => void;
  multipliers: ComponentComparisonResult[];
}

type TabType = 'perks' | 'credits' | 'multipliers';

const STATUS_CONFIG: Record<
  ComponentComparisonStatus,
  { icon: React.ElementType; className: string; label: string }
> = {
  match: {
    icon: CheckCircle,
    className: 'status-match',
    label: 'Match',
  },
  outdated: {
    icon: XCircle,
    className: 'status-outdated',
    label: 'Outdated',
  },
  questionable: {
    icon: AlertTriangle,
    className: 'status-questionable',
    label: 'Review',
  },
  new: {
    icon: Plus,
    className: 'status-new',
    label: 'New',
  },
  missing: {
    icon: Minus,
    className: 'status-missing',
    label: 'Missing',
  },
};

function getTabLabel(tab: TabType, count: number): string {
  const labels: Record<TabType, string> = {
    perks: 'Perks',
    credits: 'Credits',
    multipliers: 'Multipliers',
  };
  return `${labels[tab]} (${count})`;
}

function countByStatus(
  items: ComponentComparisonResult[]
): Record<ComponentComparisonStatus, number> {
  const counts: Record<ComponentComparisonStatus, number> = {
    match: 0,
    outdated: 0,
    questionable: 0,
    new: 0,
    missing: 0,
  };
  items.forEach((item) => {
    counts[item.status]++;
  });
  return counts;
}

function resolveDefaultTab(
  defaultTab: TabType | undefined,
  creditsCount: number,
  perksCount: number,
  multipliersCount: number
): TabType {
  if (defaultTab) {
    return defaultTab;
  }
  if (creditsCount > 0) return 'credits';
  if (perksCount > 0) return 'perks';
  if (multipliersCount > 0) return 'multipliers';
  return 'credits';
}

interface ComponentCardProps {
  component: ComponentComparisonResult;
  onEdit?: (component: ComponentComparisonResult) => void;
  reviewed?: boolean;
  onToggleReview?: () => void;
}

export function ComponentCard({ component, onEdit, reviewed, onToggleReview }: ComponentCardProps) {
  const [expanded, setExpanded] = useState(true);
  const config = STATUS_CONFIG[component.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('component-card', config.className)}>
      <div className="component-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-top-row">
          <div className="header-left">
            {expanded ? (
              <ChevronDown size={14} className="chevron" />
            ) : (
              <ChevronRight size={14} className="chevron" />
            )}
            <StatusIcon className="status-icon" size={16} />
            <span className="component-title">{component.title}</span>
          </div>
          <div className="header-right">
            {onEdit && (component.status === 'outdated' || component.status === 'questionable') && (
              <Button variant="outline" size="sm"
                onClick={(e) => { e.stopPropagation(); onEdit(component); }} title="Edit component"
              ><Pencil size={12} /> Edit</Button>
            )}
            {onEdit && component.status === 'new' && (
              <Button variant="outline" size="sm"
                onClick={(e) => { e.stopPropagation(); onEdit(component); }} title="Create component from proposed fix"
              ><Plus size={12} /> Create</Button>
            )}
          </div>
        </div>
        <div className="header-meta">
          <span className="status-badge">{config.label}</span>
        </div>
      </div>

      {expanded && (
        <div className="component-content">
          {component.notes && (
            <div className="component-notes">{component.notes}</div>
          )}

          {component.fieldDiffs && component.fieldDiffs.length > 0 && (
            <div className="field-diffs">
              <div className="diffs-header">Field Differences</div>
              <div className="diffs-table">
                <div className="diffs-row diffs-header-row">
                  <span className="diff-cell field-name">Field</span>
                  <span className="diff-cell">Database</span>
                  <span className="diff-cell">Website</span>
                  <span className="diff-cell status-cell">Status</span>
                </div>
                {component.fieldDiffs.map((diff, index) => (
                  <div
                    key={index}
                    className={cn('diffs-row', `diff-${diff.status}`)}
                  >
                    <span className="diff-cell field-name">{diff.field}</span>
                    <span className="diff-cell">
                      {diff.database ?? 'N/A'}
                    </span>
                    <span className="diff-cell">{diff.website ?? 'N/A'}</span>
                    <span className="diff-cell status-cell">
                      {diff.status === 'match' && (
                        <CheckCircle size={14} className="diff-icon match" />
                      )}
                      {diff.status === 'mismatch' && (
                        <XCircle size={14} className="diff-icon mismatch" />
                      )}
                      {diff.status === 'questionable' && (
                        <AlertTriangle
                          size={14}
                          className="diff-icon questionable"
                        />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {component.status === 'new' && component.websiteData && (
            <div className="new-data">
              <div className="diffs-header">Data from Website</div>
              <pre className="json-data">
                {JSON.stringify(component.websiteData, null, 2)}
              </pre>
            </div>
          )}

          {component.proposedFix && (
            <ProposedFix fix={component.proposedFix} />
          )}
        </div>
      )}

      {onToggleReview && (
        <label className="review-toggle" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={!!reviewed} onChange={onToggleReview} />
          <span>Reviewed</span>
        </label>
      )}
    </div>
  );
}

export function ComponentComparisonTabs({
  perks,
  credits,
  multipliers,
  defaultTab,
  onEditComponent,
}: ComponentComparisonTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    resolveDefaultTab(defaultTab, credits.length, perks.length, multipliers.length)
  );

  // Keep active tab aligned with parent intent and available data.
  useEffect(() => {
    const nextDefault = resolveDefaultTab(
      defaultTab,
      credits.length,
      perks.length,
      multipliers.length
    );
    if (nextDefault !== activeTab) {
      setActiveTab(nextDefault);
    }
  }, [defaultTab, credits.length, perks.length, multipliers.length, activeTab]);

  const tabs: { key: TabType; items: ComponentComparisonResult[] }[] = [
    { key: 'credits', items: credits },
    { key: 'perks', items: perks },
    { key: 'multipliers', items: multipliers },
  ];

  const activeItems = tabs.find((t) => t.key === activeTab)?.items || [];
  const statusCounts = countByStatus(activeItems);

  return (
    <div className="component-comparison-tabs">
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn('tab-button', activeTab === tab.key && 'active')}
            onClick={() => setActiveTab(tab.key)}
          >
            {getTabLabel(tab.key, tab.items.length)}
          </button>
        ))}
      </div>

      <div className="status-summary">
        {statusCounts.match > 0 && (
          <span className="summary-item match">
            <CheckCircle size={14} /> {statusCounts.match} match
          </span>
        )}
        {statusCounts.outdated > 0 && (
          <span className="summary-item outdated">
            <XCircle size={14} /> {statusCounts.outdated} outdated
          </span>
        )}
        {statusCounts.questionable > 0 && (
          <span className="summary-item questionable">
            <AlertTriangle size={14} /> {statusCounts.questionable} review
          </span>
        )}
        {statusCounts.new > 0 && (
          <span className="summary-item new">
            <Plus size={14} /> {statusCounts.new} new
          </span>
        )}
        {statusCounts.missing > 0 && (
          <span className="summary-item missing">
            <Minus size={14} /> {statusCounts.missing} missing
          </span>
        )}
      </div>

      <div className="tab-content">
        {activeItems.length === 0 ? (
          <div className="empty-state">No {activeTab} found in database</div>
        ) : (
          <div className="components-list">
            {activeItems.map((component, index) => (
              <ComponentCard
                key={component.id || index}
                component={component}
                onEdit={onEditComponent ? (c) => onEditComponent(activeTab as 'credits' | 'perks' | 'multipliers', c) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
