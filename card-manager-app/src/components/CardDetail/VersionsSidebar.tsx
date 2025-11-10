import type { VersionSummary } from '@/types/ui-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Check, ChevronLeft } from 'lucide-react';
import { formatDate } from '@/utils/date-utils';
import './VersionsSidebar.scss';

interface VersionsSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  versions: VersionSummary[];
  selectedVersionId: string | null;
  onVersionSelect: (versionId: string) => void;
  onCreateVersion: () => void;
  onActivateVersion: (versionId: string) => void;
  onDeactivateVersion: () => void;
}

export function VersionsSidebar({
  collapsed,
  onToggleCollapse,
  versions,
  selectedVersionId,
  onVersionSelect,
  onCreateVersion,
  onActivateVersion,
  onDeactivateVersion,
}: VersionsSidebarProps) {
  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const isActiveVersion = selectedVersion?.isActive || false;

  if (collapsed) {
    return (
      <div className="versions-sidebar collapsed">
        <button className="collapse-toggle" onClick={onToggleCollapse}>
          <ChevronLeft size={20} />
        </button>
        <div className="collapsed-label">
          <span>Versions</span>
        </div>
      </div>
    );
  }

  return (
    <div className="versions-sidebar">
      <div className="sidebar-header">
        <button className="collapse-toggle" onClick={onToggleCollapse}>
          <ChevronLeft size={20} />
        </button>
        <div className="header-content">
          <h3>Versions</h3>
          <Button size="sm" onClick={onCreateVersion}>
            <Plus size={14} />
            New
          </Button>
        </div>
      </div>

      <div className="versions-list">
        {versions.length === 0 ? (
          <div className="empty-state">No versions found</div>
        ) : (
          versions.map((version) => (
            <button
              key={version.id}
              className={`version-item ${selectedVersionId === version.id ? 'selected' : ''}`}
              onClick={() => onVersionSelect(version.id)}
            >
              <div className="version-header">
                <span className="version-name">{version.versionName}</span>
                {version.isActive && (
                  <Badge variant="success" className="active-badge">
                    <Check size={12} />
                    Active
                  </Badge>
                )}
              </div>
              <div className="version-dates">
                <div className="date-range">
                  {formatDate(version.effectiveFrom)}
                  {' - '}
                  {version.effectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(version.effectiveTo)}
                </div>
                <div className="updated">Updated: {formatDate(version.lastUpdated)}</div>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedVersionId && (
        <div className="sidebar-actions">
          {isActiveVersion ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeactivateVersion}
            >
              Deactivate Version
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onActivateVersion(selectedVersionId)}
            >
              Activate Version
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
