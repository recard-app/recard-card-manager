import { useState } from 'react';
import type { VersionSummary } from '@/types/ui-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Check, ChevronLeft, Search } from 'lucide-react';
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
  onDeactivateVersion: (versionId: string) => void;
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
  const [searchQuery, setSearchQuery] = useState('');

  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const isActiveVersion =
    (selectedVersion && ('IsActive' in selectedVersion ? (selectedVersion as any).IsActive : (selectedVersion as any).isActive)) || false;

  const filteredVersions = versions.filter(version => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const versionName = ((version as any).VersionName ?? (version as any).versionName ?? '').toLowerCase();
    return version.id.toLowerCase().includes(query) || versionName.includes(query);
  });

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

      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search versions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="versions-list">
        {filteredVersions.length === 0 ? (
          <div className="empty-state">
            {searchQuery.trim() ? 'No versions match your search' : 'No versions found'}
          </div>
        ) : (
          filteredVersions.map((version) => (
            <div
              key={version.id}
              className={`version-item ${selectedVersionId === version.id ? 'selected' : ''}`}
              onClick={() => onVersionSelect(version.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onVersionSelect(version.id);
                }
              }}
            >
              <div className="version-header">
                <div className="version-title">
                  <span className="version-name">
                    {(version as any).VersionName ?? (version as any).versionName ?? ''}
                  </span>
                  <div className="version-id">ID: {version.id}</div>
                </div>
                {(((version as any).IsActive) ?? ((version as any).isActive)) && (
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
            </div>
          ))
        )}
      </div>

      {selectedVersionId && (
        <div className="sidebar-actions">
          {isActiveVersion ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeactivateVersion(selectedVersionId)}
            >
              Remove Active
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onActivateVersion(selectedVersionId)}
            >
              Make Active
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
