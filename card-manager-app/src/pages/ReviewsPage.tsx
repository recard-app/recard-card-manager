import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { ProfilePopover } from '@/components/ProfilePopover';
import { QueueReviewsTab } from '@/components/reviews/QueueReviewsTab';
import { CompletedReviewsTab } from '@/components/reviews/CompletedReviewsTab';
import { ManualCompareTab } from '@/components/reviews/ManualCompareTab';
import './ReviewsPage.scss';

type TabId = 'queue' | 'completed' | 'manual';

const TABS: { id: TabId; label: string }[] = [
  { id: 'queue', label: 'Queue Reviews' },
  { id: 'completed', label: 'Reviews' },
  { id: 'manual', label: 'Manual Compare' },
];

export function ReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const activeTab: TabId = tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'queue';

  const [hasUnsavedManualData, setHasUnsavedManualData] = useState(false);

  const setActiveTab = (tab: TabId) => {
    // Warn when switching away from manual compare with unsaved data
    if (activeTab === 'manual' && tab !== 'manual' && hasUnsavedManualData) {
      if (!window.confirm('You have unsaved comparison results. Switch tabs anyway?')) {
        return;
      }
    }
    setSearchParams({ tab }, { replace: true });
  };

  // Navigation warning for unsaved manual compare data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedManualData) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedManualData]);

  const handleUnsavedDataChange = useCallback((hasData: boolean) => {
    setHasUnsavedManualData(hasData);
  }, []);

  return (
    <div className="reviews-page">
      <PageHeader title="Card Reviews" backTo="/" actions={<ProfilePopover />} />

      <div className="tabs-container">
        <div className="tab-list">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-trigger ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'queue' && <QueueReviewsTab />}
        {activeTab === 'completed' && <CompletedReviewsTab />}
        {activeTab === 'manual' && (
          <ManualCompareTab onUnsavedDataChange={handleUnsavedDataChange} />
        )}
      </div>
    </div>
  );
}
