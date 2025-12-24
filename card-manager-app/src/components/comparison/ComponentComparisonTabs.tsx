import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ComponentComparisonResult,
  ComponentComparisonStatus,
} from '@/types/comparison-types';
import './ComponentComparisonTabs.scss';

interface ComponentComparisonTabsProps {
  perks: ComponentComparisonResult[];
  credits: ComponentComparisonResult[];
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

interface ComponentCardProps {
  component: ComponentComparisonResult;
}

function ComponentCard({ component }: ComponentCardProps) {
  const [expanded, setExpanded] = useState(true);
  const config = STATUS_CONFIG[component.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('component-card', config.className)}>
      <div className="component-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-left">
          {expanded ? (
            <ChevronDown size={16} className="chevron" />
          ) : (
            <ChevronRight size={16} className="chevron" />
          )}
          <StatusIcon className="status-icon" size={18} />
          <span className="component-title">{component.title}</span>
        </div>
        <span className="status-badge">{config.label}</span>
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
        </div>
      )}
    </div>
  );
}

export function ComponentComparisonTabs({
  perks,
  credits,
  multipliers,
}: ComponentComparisonTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('credits');

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
              <ComponentCard key={component.id || index} component={component} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
