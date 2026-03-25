/**
 * Manual Compare Tab
 *
 * Extracted from the old CardComparisonPage.tsx.
 * Same UI and functionality -- select card, select version, paste text, compare.
 * Results are ephemeral (not saved to Firestore).
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/Select';
import { toast } from 'sonner';
import { CardService } from '@/services/card.service';
import { ComponentService } from '@/services/component.service';
import { ComparisonService } from '@/services/comparison.service';
import { ComparisonResults } from '@/components/comparison/ComparisonResults';
import { CreditModal } from '@/components/Modals/CreditModal';
import { PerkModal } from '@/components/Modals/PerkModal';
import { MultiplierModal } from '@/components/Modals/MultiplierModal';
import { AI_MODELS, AI_MODEL_OPTIONS } from '@/services/ai.service';
import type { AIModel } from '@/services/ai.service';
import type { CardWithStatus, VersionSummary } from '@/types/ui-types';
import type { ComparisonResponse, ComponentComparisonResult } from '@/types/comparison-types';
import type { CardCredit, CardPerk, CardMultiplier } from '@/types';
import './ManualCompareTab.scss';

interface ManualCompareTabProps {
  /** Called with true/false to notify parent about unsaved data */
  onUnsavedDataChange?: (hasUnsavedData: boolean) => void;
}

export function ManualCompareTab({ onUnsavedDataChange }: ManualCompareTabProps) {
  // Card and version selection
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // Input and results
  const [websiteText, setWebsiteText] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS.GEMINI_31_PRO_PREVIEW);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResponse | null>(null);

  // Inline edit modal state
  const [editModalType, setEditModalType] = useState<'credits' | 'perks' | 'multipliers' | null>(null);
  const [editingComponent, setEditingComponent] = useState<CardCredit | CardPerk | CardMultiplier | null>(null);
  const [editInitialJson, setEditInitialJson] = useState<Record<string, unknown> | undefined>(undefined);
  const [editModalKey, setEditModalKey] = useState(0);

  const handleEditComponent = async (
    componentType: 'credits' | 'perks' | 'multipliers',
    component: ComponentComparisonResult
  ) => {
    if (!selectedCardId) return;

    if (component.status === 'new') {
      setEditingComponent(null);
      setEditInitialJson(component.proposedFix ?? undefined);
    } else if (component.id) {
      try {
        let existing: CardCredit | CardPerk | CardMultiplier | undefined;
        if (componentType === 'credits') {
          const items = await ComponentService.getCreditsByCardId(selectedCardId);
          existing = items.find(c => c.id === component.id);
        } else if (componentType === 'perks') {
          const items = await ComponentService.getPerksByCardId(selectedCardId);
          existing = items.find(p => p.id === component.id);
        } else if (componentType === 'multipliers') {
          const items = await ComponentService.getMultipliersByCardId(selectedCardId);
          existing = items.find(m => m.id === component.id);
        }
        if (!existing) {
          toast.error('Component not found -- it may have been deleted');
          return;
        }
        setEditingComponent(existing);
        setEditInitialJson(undefined);
      } catch {
        toast.error('Failed to load component data');
        return;
      }
    }

    setEditModalType(componentType);
    setEditModalKey(k => k + 1);
  };

  // Track unsaved data for navigation warning
  const hasUnsavedData = websiteText.trim().length > 0 || result !== null;
  const prevHasUnsavedData = useRef(hasUnsavedData);

  useEffect(() => {
    if (prevHasUnsavedData.current !== hasUnsavedData) {
      prevHasUnsavedData.current = hasUnsavedData;
      onUnsavedDataChange?.(hasUnsavedData);
    }
  }, [hasUnsavedData, onUnsavedDataChange]);

  // Load all cards
  const loadCards = async (showToast = false) => {
    setLoadingCards(true);
    try {
      const cardsList = await CardService.getAllCardsWithStatus();
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

    let stale = false;

    async function loadVersions() {
      setLoadingVersions(true);
      try {
        const versionsList = await CardService.getVersionsByReferenceCardId(selectedCardId);

        if (stale) return;

        versionsList.sort((a, b) => {
          const aDate = a.effectiveTo || '';
          const bDate = b.effectiveTo || '';
          return bDate.localeCompare(aDate);
        });

        setVersions(versionsList);

        const activeVersion = versionsList.find((v) => v.IsActive);
        if (activeVersion) {
          setSelectedVersionId(activeVersion.id);
        } else if (versionsList.length > 0) {
          setSelectedVersionId(versionsList[0].id);
        } else {
          setSelectedVersionId('');
        }
      } catch (error) {
        if (stale) return;
        console.error('Failed to load versions:', error);
        toast.error('Failed to load versions');
      } finally {
        if (!stale) setLoadingVersions(false);
      }
    }
    loadVersions();

    return () => { stale = true; };
  }, [selectedCardId]);

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
    } catch (error) {
      console.error('Comparison failed:', error);
      toast.error(error instanceof Error ? error.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const cardOptions = cards.map((card) => ({
    value: card.ReferenceCardId,
    label: card.CardName,
    secondaryText: `(${card.ReferenceCardId})`,
  }));

  const versionOptions = versions.map((version) => ({
    value: version.id,
    label: `${version.VersionName}${version.IsActive ? ' (Active)' : ''} - ${version.effectiveTo === '9999-12-31' ? 'Ongoing' : version.effectiveTo}`,
  }));

  return (
    <div className="manual-compare-tab">
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
          style={{ marginTop: '0.5rem' }}
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
            onClick={handleCompare}
            disabled={loading || !selectedCardId || !selectedVersionId || !websiteText.trim()}
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
            Analyzing card data against website text...<br />
            This may take a moment.
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <ComparisonResults
          result={result}
          onEditComponent={handleEditComponent}
        />
      )}

      {/* Inline Edit Modals */}
      {selectedCardId && editModalType === 'credits' && (
        <CreditModal
          key={`credit-modal-${editModalKey}`}
          open={true}
          onOpenChange={(open) => { if (!open) setEditModalType(null); }}
          referenceCardId={selectedCardId}
          credit={editingComponent as CardCredit | null}
          onSuccess={() => { setEditModalType(null); toast.success('Credit saved'); }}
          initialJson={editInitialJson}
        />
      )}
      {selectedCardId && editModalType === 'perks' && (
        <PerkModal
          key={`perk-modal-${editModalKey}`}
          open={true}
          onOpenChange={(open) => { if (!open) setEditModalType(null); }}
          referenceCardId={selectedCardId}
          perk={editingComponent as CardPerk | null}
          onSuccess={() => { setEditModalType(null); toast.success('Perk saved'); }}
          initialJson={editInitialJson}
        />
      )}
      {selectedCardId && editModalType === 'multipliers' && (
        <MultiplierModal
          key={`multiplier-modal-${editModalKey}`}
          open={true}
          onOpenChange={(open) => { if (!open) setEditModalType(null); }}
          referenceCardId={selectedCardId}
          multiplier={editingComponent as CardMultiplier | null}
          onSuccess={() => { setEditModalType(null); toast.success('Multiplier saved'); }}
          initialJson={editInitialJson}
        />
      )}
    </div>
  );
}
