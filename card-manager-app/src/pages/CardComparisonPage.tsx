import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, CircleUser, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CardService } from '@/services/card.service';
import { ComparisonService } from '@/services/comparison.service';
import { ComparisonResults } from '@/components/comparison/ComparisonResults';
import { AI_MODELS, AI_MODEL_OPTIONS } from '@/services/ai.service';
import type { AIModel } from '@/services/ai.service';
import type { CardWithStatus, VersionSummary } from '@/types/ui-types';
import type { ComparisonResponse } from '@/types/comparison-types';
import './CardComparisonPage.scss';

export function CardComparisonPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileContentRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  // Card and version selection
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // Input and results
  const [websiteText, setWebsiteText] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS.GEMINI_3_PRO_PREVIEW);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResponse | null>(null);

  // Check if there's unsaved data that should trigger navigation warning
  const hasUnsavedDataRef = useRef(false);
  hasUnsavedDataRef.current = websiteText.trim().length > 0 || result !== null;

  // Handle browser back/forward navigation and close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedDataRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handlePopState = () => {
      if (hasUnsavedDataRef.current) {
        const confirmed = window.confirm('Are you sure you want to leave? Your input and comparison results will be lost.');
        if (!confirmed) {
          // Push state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    // Push initial state so we can intercept back navigation
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Load all cards
  const loadCards = async (showToast = false) => {
    setLoadingCards(true);
    try {
      const cardsList = await CardService.getAllCardsWithStatus();
      // Sort by card name
      cardsList.sort((a, b) => a.CardName.localeCompare(b.CardName));
      setCards(cardsList);
      if (showToast) {
        toast.success('Cards refreshed');
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
      toast.error('Failed to load cards');
    } finally {
      setLoadingCards(false);
    }
  };

  // Load cards on mount
  useEffect(() => {
    loadCards();
  }, []);

  // Load versions when card is selected
  useEffect(() => {
    if (!selectedCardId) {
      setVersions([]);
      setSelectedVersionId('');
      return;
    }

    async function loadVersions() {
      setLoadingVersions(true);
      try {
        const versionsList = await CardService.getVersionsByReferenceCardId(
          selectedCardId
        );

        // Sort by effectiveTo descending (ongoing/later-ending first)
        // "9999-12-31" (ongoing) should be at the top
        versionsList.sort((a, b) => {
          const aDate = a.effectiveTo || '';
          const bDate = b.effectiveTo || '';
          return bDate.localeCompare(aDate);
        });

        setVersions(versionsList);

        // Auto-select: active version first, or most recent by effectiveTo
        const activeVersion = versionsList.find((v) => v.IsActive);
        if (activeVersion) {
          setSelectedVersionId(activeVersion.id);
        } else if (versionsList.length > 0) {
          // Already sorted by effectiveTo desc, so first is most recent
          setSelectedVersionId(versionsList[0].id);
        } else {
          setSelectedVersionId('');
        }
      } catch (error) {
        console.error('Failed to load versions:', error);
        toast.error('Failed to load versions');
      } finally {
        setLoadingVersions(false);
      }
    }
    loadVersions();
  }, [selectedCardId]);

  // Close profile dropdown on click outside
  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContent =
        profileContentRef.current &&
        !profileContentRef.current.contains(target);
      const isOutsideTrigger =
        profileTriggerRef.current &&
        !profileTriggerRef.current.contains(target);

      if (isOutsideContent && isOutsideTrigger) {
        setProfileOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Failed to sign out:', err);
      toast.error('Failed to sign out');
    }
  };

  const handleCompare = async () => {
    if (!selectedCardId) {
      toast.warning('Please select a card');
      return;
    }
    if (!selectedVersionId) {
      toast.warning('Please select a version');
      return;
    }
    if (!websiteText.trim()) {
      toast.warning('Please paste website text to compare');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const comparisonResult = await ComparisonService.analyze({
        referenceCardId: selectedCardId,
        versionId: selectedVersionId,
        websiteText: websiteText.trim(),
        model: selectedModel,
      });
      setResult(comparisonResult);
      toast.success('Comparison complete');
    } catch (error: any) {
      console.error('Comparison failed:', error);
      toast.error(error.response?.data?.error || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  // Build card options for select
  const cardOptions = cards.map((card) => ({
    value: card.ReferenceCardId,
    label: card.CardName,
    secondaryText: `(${card.ReferenceCardId})`,
  }));

  // Build version options for select
  const versionOptions = versions.map((version) => ({
    value: version.id,
    label: `${version.VersionName}${version.IsActive ? ' (Active)' : ''} - ${version.effectiveTo === '9999-12-31' ? 'Ongoing' : version.effectiveTo}`,
  }));

  return (
    <div className="card-comparison-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to="/" className="home-link">
            <Home size={20} />
          </Link>
          <h1>Card Comparison</h1>
        </div>

        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
          <PopoverTrigger asChild>
            <button
              ref={profileTriggerRef}
              className="profile-trigger"
              aria-label="Profile menu"
            >
              <CircleUser size={24} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            ref={profileContentRef}
            className="profile-dropdown"
            align="end"
            sideOffset={4}
          >
            <div className="profile-info">
              <div className="profile-name">
                {user?.displayName || 'User'}
              </div>
              <div className="profile-email">{user?.email}</div>
            </div>
            <div className="profile-divider" />
            <button className="profile-logout" onClick={handleSignOut}>
              <LogOut size={14} />
              Sign out
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Content */}
      <div className="comparison-content">
        {/* Card and Version Selection */}
        <div className="selection-section">
          <div className="section-header">
            <h2>Select Card & Version</h2>
          </div>
          <div className="selection-grid">
            <div className="selection-field">
              <Combobox
                label="Credit Card"
                placeholder={loadingCards ? 'Loading cards...' : 'Select a card'}
                searchPlaceholder="Search cards..."
                emptyText="No cards found."
                options={cardOptions}
                value={selectedCardId}
                onChange={setSelectedCardId}
                disabled={loadingCards}
              />
            </div>
            <div className="selection-field">
              <Combobox
                label="Version"
                placeholder={
                  loadingVersions
                    ? 'Loading versions...'
                    : selectedCardId
                      ? 'Select a version'
                      : 'Select a card first'
                }
                searchPlaceholder="Search versions..."
                emptyText="No versions found."
                options={versionOptions}
                value={selectedVersionId}
                onChange={setSelectedVersionId}
                disabled={!selectedCardId || loadingVersions}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCards(true)}
            disabled={loadingCards}
            className="refresh-cards-button"
          >
            <RefreshCw size={14} className={loadingCards ? 'spinning' : ''} />
            Refresh Cards
          </Button>
        </div>

        {/* Website Text Input */}
        <div className="input-section">
          <div className="section-header">
            <h2>Website Text</h2>
            <Select
              value={selectedModel}
              onChange={(value) => setSelectedModel(value as AIModel)}
              options={AI_MODEL_OPTIONS}
              className="model-select"
            />
          </div>
          <textarea
            className="website-text-input"
            placeholder="Paste the credit card website text here...

Copy all relevant text from the card's official page including:
- Card name and issuer
- Annual fee information
- Rewards rates and categories
- Statement credits and perks
- Any other card benefits"
            value={websiteText}
            onChange={(e) => setWebsiteText(e.target.value)}
          />
          <div className="input-controls">
            <Button
              className="compare-button"
              onClick={handleCompare}
              disabled={
                loading || !selectedCardId || !selectedVersionId || !websiteText.trim()
              }
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  Analyzing...
                </>
              ) : (
                'Compare'
              )}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-section">
            <Loader2 size={32} className="spinning" />
            <p className="loading-text">
              Analyzing card data against website text...
              <br />
              This may take a moment.
            </p>
          </div>
        )}

        {/* Results */}
        {result && !loading && <ComparisonResults result={result} />}
      </div>
    </div>
  );
}
