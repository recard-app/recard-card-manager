import { useEffect, useRef, useState } from 'react';
import { Copy, Check, Loader2, ChevronDown, ChevronRight, CheckCircle, XCircle, ChevronsUpDown, Plus, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { ProfilePopover } from '@/components/ProfilePopover';
import { cn } from '@/lib/utils';
import { AIService, AI_MODELS, AI_MODEL_OPTIONS, AI_PRO_MODEL_OPTIONS, AI_FLASH_MODEL_OPTIONS } from '@/services/ai.service';
import type { GenerationType, GenerationResult, GeneratedItem, GeneratedField, AIModel, ComponentType } from '@/services/ai.service';
import { validateField, validateResponse } from '@/utils/schema-validation';
import { CardIcon } from '@/components/icons/CardIcon';
import { CreditModal } from '@/components/Modals/CreditModal';
import { PerkModal } from '@/components/Modals/PerkModal';
import { MultiplierModal } from '@/components/Modals/MultiplierModal';
import { CardDetailsModal } from '@/components/Modals/CardDetailsModal';
import { Combobox } from '@/components/ui/Combobox';
import { CardService } from '@/services/card.service';
import { ComponentService } from '@/services/component.service';
import type { CardWithStatus, VersionSummary } from '@/types/ui-types';
import { ONGOING_SENTINEL_DATE, EARLIEST_EFFECTIVE_DATE } from '@/constants/dates';
import { calculateCallCost, formatCost } from '@/constants/pricing';
import type { TokenBreakdownEntry } from '@/services/ai.service';
import './AIAssistantPage.scss';

type DisplayMode = 'fields' | 'json';
type ComponentTabKey = 'credits' | 'perks' | 'multipliers';
type ComponentIdSets = Record<ComponentTabKey, Set<string>>;

const createEmptyComponentIdSets = (): ComponentIdSets => ({
  credits: new Set<string>(),
  perks: new Set<string>(),
  multipliers: new Set<string>(),
});

const GENERATION_TYPE_OPTIONS = [
  { value: 'generate-all', label: 'Generate All' },
  { value: 'card', label: 'Card Details' },
  { value: 'credit', label: 'Credit' },
  { value: 'perk', label: 'Perk' },
  { value: 'multiplier', label: 'Multiplier' },
  { value: 'rotating-categories', label: 'Rotating Categories' },
];

type GenerateAllTab = 'card' | 'credits' | 'perks' | 'multipliers';

export function AIAssistantPage() {
  // Form state
  const [rawData, setRawData] = useState('');
  const [generationType, setGenerationType] = useState<GenerationType>('generate-all');
  const [batchMode, setBatchMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS.GEMINI_31_PRO_PREVIEW);
  const [selectedCheckerModel, setSelectedCheckerModel] = useState<AIModel>(AI_MODELS.GEMINI_3_FLASH_PREVIEW);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('json');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);

  // Refinement state
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [showRefinement, setShowRefinement] = useState(false);

  // Component creation state
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [pendingJsonImport, setPendingJsonImport] = useState<Record<string, unknown> | null>(null);
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [createdItems, setCreatedItems] = useState<Set<number>>(new Set());

  // Generate-all state
  const [generationTypeLocked, setGenerationTypeLocked] = useState(false);
  const [generateAllActiveTab, setGenerateAllActiveTab] = useState<GenerateAllTab>('card');
  const [cardDetailsResult, setCardDetailsResult] = useState<GenerationResult | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [cardDetailsApplied, setCardDetailsApplied] = useState(false);
  const [combinedError, setCombinedError] = useState<string>('');
  const [cardDetailsError, setCardDetailsError] = useState<string>('');
  const [activeModalType, setActiveModalType] = useState<ComponentType | null>(null);
  const [cardDetailsModalOpen, setCardDetailsModalOpen] = useState(false);
  const [cardDetailsModalKey, setCardDetailsModalKey] = useState(0);
  const [pendingCardDetailsJson, setPendingCardDetailsJson] = useState<Record<string, unknown> | null>(null);
  // Parallel map for client IDs: keyed by "type:index", value is UUID
  const [itemIdMap, setItemIdMap] = useState<Map<string, string>>(new Map());
  const [createdComponentItems, setCreatedComponentItems] = useState<ComponentIdSets>(createEmptyComponentIdSets);
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<ComponentIdSets>(createEmptyComponentIdSets);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [tokenUsageExpanded, setTokenUsageExpanded] = useState(false);

  // Check if batch mode is available for current type
  const canBatch = generationType !== 'card' && generationType !== 'rotating-categories' && generationType !== 'generate-all';

  const isGenerateAll = generationType === 'generate-all';

  // Auto-select model based on generation type and batch mode
  useEffect(() => {
    if (generationType === 'generate-all') {
      setSelectedModel(AI_MODELS.GEMINI_31_PRO_PREVIEW);
      return;
    }
    if (generationType === 'rotating-categories') {
      setSelectedModel(AI_MODELS.GEMINI_3_FLASH_PREVIEW);
      return;
    }

    const isComponent = generationType !== 'card';
    const isSingleComponent = isComponent && !batchMode;

    if (isSingleComponent) {
      setSelectedModel(AI_MODELS.GEMINI_3_FLASH_PREVIEW);
    } else {
      setSelectedModel(AI_MODELS.GEMINI_31_PRO_PREVIEW);
    }
  }, [generationType, batchMode]);

  // Load versions when card is selected (for generate-all)
  useEffect(() => {
    const needsVersions = isGenerateAll || generationType === 'card';
    if (!selectedCardId || !needsVersions) {
      setVersions([]);
      setSelectedVersionId('');
      return;
    }
    // Clear version immediately on card change to prevent stale state
    setSelectedVersionId('');
    setVersions([]);
    let cancelled = false;
    const loadVersions = async () => {
      setLoadingVersions(true);
      try {
        const versionsList = await CardService.getVersionsByReferenceCardId(selectedCardId);
        if (cancelled) return; // Stale response guard
        applyVersions(versionsList);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load versions:', error);
        toast.error('Failed to load versions');
      } finally {
        if (!cancelled) setLoadingVersions(false);
      }
    };
    loadVersions();
    return () => { cancelled = true; };
  }, [selectedCardId, isGenerateAll, generationType]);

  // Check if there's unsaved data that should trigger navigation warning
  const hasUnsavedDataRef = useRef(false);
  const generateIdRef = useRef(0);
  hasUnsavedDataRef.current = rawData.trim().length > 0 || (result !== null && result.items.length > 0);

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
        const confirmed = window.confirm('Are you sure you want to leave? Your input and generated data will be lost.');
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

  // Load cards for component creation
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

  const selectedCardName = cards.find(c => c.ReferenceCardId === selectedCardId)?.CardName || '';

  const getDefaultVersionId = (versionsList: VersionSummary[]): string => {
    const activeVersion = versionsList.find((v: VersionSummary) => v.IsActive);
    return activeVersion?.id || (versionsList[0]?.id ?? '');
  };

  const applyVersions = (versionsList: VersionSummary[]) => {
    setVersions(versionsList);
    setSelectedVersionId(getDefaultVersionId(versionsList));
  };

  const handleRefreshVersions = async () => {
    if (!selectedCardId) return;
    setLoadingVersions(true);
    try {
      const versionsList = await CardService.getVersionsByReferenceCardId(selectedCardId);
      applyVersions(versionsList);
      toast.success('Versions refreshed');
    } catch {
      toast.error('Failed to refresh versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  const clearGenerateAllState = () => {
    generateIdRef.current++;
    setLoading(false);
    setCardDetailsResult(null);
    setCardDetailsApplied(false);
    setCombinedError('');
    setCardDetailsError('');
    setGenerateAllActiveTab('card');
    setCreatedComponentItems(createEmptyComponentIdSets());
    setSelectedItems(createEmptyComponentIdSets());
    setItemIdMap(new Map());
    setTokenUsageExpanded(false);
    setGenerationTypeLocked(false);
  };

  /**
   * Builds the itemIdMap for generate-all results.
   * Generates a UUID for each item keyed by "type:index".
   */
  const buildItemIdMap = (generateAllResult: GenerationResult): Map<string, string> => {
    const map = new Map<string, string>();
    for (const group of generateAllResult.items) {
      const json = group.json as Record<string, unknown>;
      const componentType = json._componentType as string;
      const items = json.items as Record<string, unknown>[];
      if (items) {
        for (let i = 0; i < items.length; i++) {
          map.set(`${componentType}:${i}`, crypto.randomUUID());
        }
      }
    }
    return map;
  };

  const getItemIdentityKey = (item: Record<string, unknown>): string => {
    const title = String(item.Title || item.Name || '').trim().toLowerCase();
    const category = String(item.Category || '').trim().toLowerCase();
    const subCategory = String(item.SubCategory || '').trim().toLowerCase();
    return `${title}|${category}|${subCategory}`;
  };

  const remapItemIdsForRefinedSection = (
    componentType: ComponentType,
    previousItems: Record<string, unknown>[],
    refinedItems: Record<string, unknown>[],
    previousMap: Map<string, string>
  ): Map<string, string> => {
    const nextMap = new Map(previousMap);

    for (const key of Array.from(nextMap.keys())) {
      if (key.startsWith(`${componentType}:`)) {
        nextMap.delete(key);
      }
    }

    const signaturePools = new Map<string, string[]>();
    for (let i = 0; i < previousItems.length; i++) {
      const existingId = previousMap.get(`${componentType}:${i}`);
      if (!existingId) continue;
      const signature = getItemIdentityKey(previousItems[i]);
      const pool = signaturePools.get(signature) || [];
      pool.push(existingId);
      signaturePools.set(signature, pool);
    }

    const usedIds = new Set<string>();
    for (let i = 0; i < refinedItems.length; i++) {
      const nextKey = `${componentType}:${i}`;
      const signature = getItemIdentityKey(refinedItems[i]);
      const signaturePool = signaturePools.get(signature);

      let chosenId: string | undefined;

      if (signaturePool && signaturePool.length > 0) {
        chosenId = signaturePool.shift();
      }

      if (!chosenId) {
        const indexFallback = previousMap.get(`${componentType}:${i}`);
        if (indexFallback && !usedIds.has(indexFallback)) {
          chosenId = indexFallback;
        }
      }

      if (!chosenId || usedIds.has(chosenId)) {
        chosenId = crypto.randomUUID();
      }

      usedIds.add(chosenId);
      nextMap.set(nextKey, chosenId);
    }

    return nextMap;
  };

  const getValidIdsForComponentType = (componentType: ComponentType, map: Map<string, string>): Set<string> => {
    const ids = new Set<string>();
    for (const [key, value] of map.entries()) {
      if (key.startsWith(`${componentType}:`)) {
        ids.add(value);
      }
    }
    return ids;
  };

  /**
   * Gets the items array for a specific component type from generate-all results.
   */
  const getComponentItems = (componentType: ComponentType): Record<string, unknown>[] => {
    if (!result) return [];
    for (const group of result.items) {
      const json = group.json as Record<string, unknown>;
      if (json._componentType === componentType) {
        return (json.items as Record<string, unknown>[]) || [];
      }
    }
    return [];
  };

  /**
   * Checks if a multiplier item is rotating or selectable (excluded from bulk create).
   */
  const isRotatingOrSelectable = (item: Record<string, unknown>): boolean => {
    const mt = item.multiplierType as string | undefined;
    return mt === 'rotating' || mt === 'selectable';
  };

  /**
   * Gets eligible (uncreated, non-rotating/selectable) item IDs for a component type.
   */
  const getEligibleItemIds = (componentType: ComponentType): string[] => {
    const items = getComponentItems(componentType);
    const tabKey = componentType === 'credit' ? 'credits' : componentType === 'perk' ? 'perks' : 'multipliers';
    const created = createdComponentItems[tabKey];
    const eligible: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const id = itemIdMap.get(`${componentType}:${i}`);
      if (!id) continue;
      if (created.has(id)) continue;
      if (componentType === 'multiplier' && isRotatingOrSelectable(items[i])) continue;
      eligible.push(id);
    }
    return eligible;
  };

  /**
   * Gets total eligible uncreated items across all component types.
   */
  const getTotalEligibleCount = (): number => {
    return getEligibleItemIds('credit').length + getEligibleItemIds('perk').length + getEligibleItemIds('multiplier').length;
  };

  /**
   * Gets total selected items across all tabs.
   */
  const getTotalSelectedCount = (): number => {
    const countSelectedInType = (componentType: ComponentType): number => {
      const items = getComponentItems(componentType);
      const tabKey = componentType === 'credit' ? 'credits' : componentType === 'perk' ? 'perks' : 'multipliers';
      const selected = selectedItems[tabKey];
      let count = 0;

      for (let i = 0; i < items.length; i++) {
        const id = itemIdMap.get(`${componentType}:${i}`);
        if (id && selected.has(id)) {
          count++;
        }
      }

      return count;
    };

    return countSelectedInType('credit') + countSelectedInType('perk') + countSelectedInType('multiplier');
  };

  const handleToggleSelection = (tabKey: ComponentTabKey, itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev[tabKey]);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return { ...prev, [tabKey]: next };
    });
  };

  const handleSelectAll = (componentType: ComponentType) => {
    const tabKey = componentType === 'credit' ? 'credits' : componentType === 'perk' ? 'perks' : 'multipliers';
    const eligible = getEligibleItemIds(componentType);
    const allSelected = eligible.every(id => selectedItems[tabKey].has(id));

    setSelectedItems(prev => ({
      ...prev,
      [tabKey]: allSelected ? new Set<string>() : new Set(eligible),
    }));
  };

  const handleBulkCreate = async (mode: 'all' | 'selected') => {
    if (!selectedCardId || bulkCreating) return;

    // Collect items to create
    const itemsToCreate: Array<{ type: ComponentType; data: Record<string, unknown>; tabKey: ComponentTabKey; itemId: string }> = [];

    const types: ComponentType[] = ['credit', 'perk', 'multiplier'];
    for (const type of types) {
      const items = getComponentItems(type);
      const tabKey = (type === 'credit' ? 'credits' : type === 'perk' ? 'perks' : 'multipliers') as ComponentTabKey;
      const created = createdComponentItems[tabKey];

      for (let i = 0; i < items.length; i++) {
        const id = itemIdMap.get(`${type}:${i}`);
        if (!id || created.has(id)) continue;
        if (type === 'multiplier' && isRotatingOrSelectable(items[i])) continue;

        if (mode === 'all' || selectedItems[tabKey].has(id)) {
          // Clean item data: strip _componentType and other metadata
          const cleanItem = { ...items[i] };
          delete cleanItem._componentType;
          delete cleanItem._clientId;
          itemsToCreate.push({ type, data: cleanItem, tabKey, itemId: id });
        }
      }
    }

    if (itemsToCreate.length === 0) {
      toast.warning('No items to create');
      return;
    }

    // Confirmation
    const creditCount = itemsToCreate.filter(i => i.type === 'credit').length;
    const perkCount = itemsToCreate.filter(i => i.type === 'perk').length;
    const multiplierCount = itemsToCreate.filter(i => i.type === 'multiplier').length;

    const parts: string[] = [];
    if (creditCount > 0) parts.push(`${creditCount} credit${creditCount > 1 ? 's' : ''}`);
    if (perkCount > 0) parts.push(`${perkCount} perk${perkCount > 1 ? 's' : ''}`);
    if (multiplierCount > 0) parts.push(`${multiplierCount} multiplier${multiplierCount > 1 ? 's' : ''}`);

    const confirmed = window.confirm(`Create ${itemsToCreate.length} components for "${selectedCardName}"?\n\n${parts.join('\n')}`);
    if (!confirmed) return;

    setBulkCreating(true);
    try {
      const payload = itemsToCreate.map(item => ({
        type: item.type,
        data: item.data,
      }));

      const response = await ComponentService.bulkCreate(selectedCardId, payload);

      // Process results
      const newCreated: ComponentIdSets = { ...createdComponentItems };
      const newSelected: ComponentIdSets = { ...selectedItems };
      let failedMessages: string[] = [];

      for (const result of response.results) {
        const originalItem = itemsToCreate[result.index];
        if (!originalItem) continue;

        if (result.success) {
          const tabSet = new Set(newCreated[originalItem.tabKey]);
          tabSet.add(originalItem.itemId);
          newCreated[originalItem.tabKey] = tabSet;

          // Remove from selection
          const selSet = new Set(newSelected[originalItem.tabKey]);
          selSet.delete(originalItem.itemId);
          newSelected[originalItem.tabKey] = selSet;
        } else {
          failedMessages.push(`${originalItem.type} #${result.index + 1}: ${result.error}`);
        }
      }

      setCreatedComponentItems(newCreated);
      setSelectedItems(newSelected);

      if (response.summary.failed > 0) {
        toast.error(`Created ${response.summary.created} components (${response.summary.failed} failed)`);
        if (failedMessages.length > 0) {
          console.error('Bulk create failures:', failedMessages);
        }
      } else {
        toast.success(`Created ${response.summary.created} components`);
      }
    } catch (err: any) {
      console.error('Bulk create error:', err);
      // If the backend returned 400 with per-item results (all-fail case), surface them
      const responseData = err.response?.data;
      if (responseData?.results && responseData?.summary) {
        const failedDetails = responseData.results
          .filter((r: any) => !r.success)
          .map((r: any) => `${r.type} #${r.index + 1}: ${r.error}`)
          .join('; ');
        toast.error(`All ${responseData.summary.failed} items failed: ${failedDetails || 'validation errors'}`);
      } else {
        toast.error('Bulk create failed: ' + (err.response?.data?.error || err.message || 'Unknown error'));
      }
    } finally {
      setBulkCreating(false);
    }
  };

  /**
   * Gets category warnings for a specific item.
   */
  const getCategoryWarningsForItem = (componentType: ComponentType, itemIndex: number) => {
    if (!result?.warnings?.categoryWarnings) return [];
    return result.warnings.categoryWarnings.filter(
      w => w.componentType === componentType && w.itemIndex === itemIndex
    );
  };

  /**
   * Gets duplicate warnings that involve items in a specific component type.
   */
  const getDuplicateWarningsForTab = (componentType: ComponentType) => {
    if (!result?.warnings?.duplicateWarnings) return [];
    return result.warnings.duplicateWarnings.filter(
      w => w.itemA.type === componentType || w.itemB.type === componentType
    );
  };

  /**
   * Gets duplicate warnings for a specific item.
   */
  const getDuplicateWarningsForItem = (componentType: ComponentType, itemIndex: number) => {
    if (!result?.warnings?.duplicateWarnings) return [];
    return result.warnings.duplicateWarnings.filter(
      w => (w.itemA.type === componentType && w.itemA.index === itemIndex) ||
           (w.itemB.type === componentType && w.itemB.index === itemIndex)
    );
  };

  // Existing components warning state
  const [existingComponentCounts, setExistingComponentCounts] = useState<{
    credits: number;
    perks: number;
    multipliers: number;
  } | null>(null);

  // Load existing component counts when card is selected for generate-all
  useEffect(() => {
    if (!selectedCardId || !isGenerateAll) {
      setExistingComponentCounts(null);
      return;
    }
    let cancelled = false;
    const loadCounts = async () => {
      try {
        const [credits, perks, multipliers] = await Promise.all([
          ComponentService.getCreditsByCardId(selectedCardId),
          ComponentService.getPerksByCardId(selectedCardId),
          ComponentService.getMultipliersByCardId(selectedCardId),
        ]);
        if (cancelled) return;
        const total = credits.length + perks.length + multipliers.length;
        if (total > 0) {
          setExistingComponentCounts({
            credits: credits.length,
            perks: perks.length,
            multipliers: multipliers.length,
          });
        } else {
          setExistingComponentCounts(null);
        }
      } catch {
        if (cancelled) return;
        // Silently fail — this is informational only
        setExistingComponentCounts(null);
      }
    };
    loadCounts();
    return () => { cancelled = true; };
  }, [selectedCardId, isGenerateAll]);

  const handleGenerate = async () => {
    if (!rawData.trim()) {
      toast.warning('Please paste some data to process');
      return;
    }

    // Generate-all requires card + version selection
    if (isGenerateAll) {
      if (!selectedCardId || !selectedVersionId) {
        toast.warning('Please select a card and version first');
        return;
      }
      if (!selectedCardName) {
        toast.warning('Selected card is unavailable. Refresh cards and try again.');
        return;
      }
    }

    setLoading(true);
    setResult(null);
    setCreatedItems(new Set());
    setCardDetailsApplied(false);
    setShowRefinement(false);
    setRefinementPrompt('');

    const currentGenerateId = ++generateIdRef.current;

    if (isGenerateAll) {
      // Generate-all: fire two independent promise chains for partial rendering
      clearGenerateAllState();
      let hadSuccessfulResponse = false;

      const combinedPromise = AIService.generate({
        rawData,
        generationType: 'generate-all',
        model: selectedModel,
        checkerModel: selectedCheckerModel,
        cardName: selectedCardName,
      }).then(data => {
        if (generateIdRef.current !== currentGenerateId) return;
        const validatedData = validateGenerationResult(data, 'generate-all');
        setResult(validatedData);
        setItemIdMap(buildItemIdMap(validatedData));
        hadSuccessfulResponse = true;
      }).catch((err: any) => {
        if (generateIdRef.current !== currentGenerateId) return;
        const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
        toast.error('Component generation failed: ' + errorMessage);
        setCombinedError(errorMessage);
      });

      const cardPromise = AIService.generate({
        rawData,
        generationType: 'card',
        model: selectedModel,
        checkerModel: selectedCheckerModel,
        cardName: selectedCardName,
      }).then(data => {
        if (generateIdRef.current !== currentGenerateId) return;
        const validatedData = validateGenerationResult(data, 'card');
        setCardDetailsResult(validatedData);
        hadSuccessfulResponse = true;
      }).catch((err: any) => {
        if (generateIdRef.current !== currentGenerateId) return;
        const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
        toast.error('Card details generation failed: ' + errorMessage);
        setCardDetailsError(errorMessage);
      });

      Promise.allSettled([combinedPromise, cardPromise]).then(() => {
        if (generateIdRef.current !== currentGenerateId) return;
        setLoading(false);
        setGenerationTypeLocked(hadSuccessfulResponse);
        setShowRefinement(hadSuccessfulResponse);
      });
    } else {
      // Standard generation (non-generate-all)
      try {
        const data = await AIService.generate({
          rawData,
          generationType,
          batchMode: canBatch && batchMode,
          model: selectedModel,
          ...(generationType === 'card' && selectedCardName
            ? { cardName: selectedCardName, checkerModel: selectedCheckerModel }
            : {}),
        });
        const validatedData = validateGenerationResult(data, generationType);
        setResult(validatedData);
        setExpandedItems(new Set(validatedData.items.map((_, i) => i)));
        setAllExpanded(true);
        setShowRefinement(true);
      } catch (err: any) {
        console.error('Generation error:', err);
        const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
        toast.error('Failed to generate: ' + errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegenerate = async () => {
    if (!refinementPrompt.trim()) {
      toast.warning('Please enter refinement instructions');
      return;
    }

    setLoading(true);

    try {
      if (isGenerateAll) {
        // Per-tab refinement for generate-all
        if (generateAllActiveTab === 'card') {
          // Refine card details only
          if (!cardDetailsResult?.items?.[0]) {
            toast.warning('No card details to refine');
            setLoading(false);
            return;
          }
          const data = await AIService.generate({
            rawData,
            generationType: 'card',
            refinementPrompt,
            previousOutput: cardDetailsResult.items[0].json as Record<string, unknown>,
            cardName: selectedCardName,
          });
          const validatedData = validateGenerationResult(data, 'card');
          setCardDetailsResult(validatedData);
        } else {
          // Refine a specific component type
          const tabToType: Record<string, ComponentType> = {
            credits: 'credit',
            perks: 'perk',
            multipliers: 'multiplier',
          };
          const componentType = tabToType[generateAllActiveTab];
          const items = getComponentItems(componentType);

          if (items.length === 0) {
            toast.warning(`No ${generateAllActiveTab} to refine`);
            setLoading(false);
            return;
          }

          const data = await AIService.generate({
            rawData,
            generationType: componentType,
            batchMode: true,
            refinementPrompt,
            previousOutput: items as Record<string, unknown>[],
          });

          // Re-inject effective dates (per-type generation doesn't include them)
          if (data.items) {
            for (const item of data.items) {
              if (!Array.isArray(item.json)) {
                (item.json as Record<string, unknown>).EffectiveFrom = EARLIEST_EFFECTIVE_DATE;
                (item.json as Record<string, unknown>).EffectiveTo = ONGOING_SENTINEL_DATE;
              }
            }
          }

          // Update only the refined portion of the result
          if (result) {
            const previousItems = items;
            const updatedItems = result.items.map(group => {
              const json = group.json as Record<string, unknown>;
              if (json._componentType === componentType) {
                return {
                  ...group,
                  json: {
                    _componentType: componentType,
                    items: data.items.map(i => i.json),
                  },
                };
              }
              return group;
            });

            const updatedResult = {
              ...result,
              items: updatedItems,
              // Clear stale warnings after refinement
              warnings: undefined,
            };
            setResult(updatedResult);

            const refinedItems = data.items.map(i => i.json as Record<string, unknown>);
            const newMap = remapItemIdsForRefinedSection(componentType, previousItems, refinedItems, itemIdMap);
            setItemIdMap(newMap);

            const tabKey = componentType === 'credit' ? 'credits' : componentType === 'perk' ? 'perks' : 'multipliers';
            const validIds = getValidIdsForComponentType(componentType, newMap);

            setCreatedComponentItems(prev => ({
              ...prev,
              [tabKey]: new Set([...prev[tabKey]].filter(id => validIds.has(id))),
            }));
            setSelectedItems(prev => ({
              ...prev,
              [tabKey]: new Set([...prev[tabKey]].filter(id => validIds.has(id))),
            }));
          }
        }
      } else {
        // Standard refinement (non-generate-all)
        if (!result?.items || result.items.length === 0) {
          toast.warning('No previous output to refine');
          setLoading(false);
          return;
        }

        const previousOutput = result.items.length === 1
          ? result.items[0].json
          : result.items.map(item => item.json);

        const data = await AIService.generate({
          rawData,
          generationType,
          batchMode: result.items.length > 1,
          refinementPrompt,
          previousOutput: previousOutput as Record<string, unknown> | Record<string, unknown>[],
          ...(generationType === 'card' && selectedCardName
            ? { cardName: selectedCardName, checkerModel: selectedCheckerModel }
            : {}),
        });
        const validatedData = validateGenerationResult(data, generationType);
        setResult(validatedData);
        setCreatedItems(new Set());
        setExpandedItems(new Set(validatedData.items.map((_, i) => i)));
        setAllExpanded(true);
      }

      setRefinementPrompt('');
      const textarea = document.querySelector('.refinement-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    } catch (err: any) {
      console.error('Regeneration error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Unknown error';
      toast.error('Failed to regenerate: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemExpanded = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      // Update allExpanded state based on whether all items are expanded
      if (result) {
        setAllExpanded(next.size === result.items.length);
      }
      return next;
    });
  };

  const toggleAllExpanded = () => {
    if (!result) return;
    if (allExpanded) {
      // Collapse all
      setExpandedItems(new Set());
      setAllExpanded(false);
    } else {
      // Expand all
      setExpandedItems(new Set(result.items.map((_, i) => i)));
      setAllExpanded(true);
    }
  };

  const handleCreateComponent = (item: GeneratedItem, index: number) => {
    if (!selectedCardId) {
      toast.warning('Please select a card first');
      return;
    }
    // rotating-categories returns an array, not a single object - this button is hidden for that type
    if (Array.isArray(item.json)) {
      return;
    }
    setPendingJsonImport(item.json);
    setPendingItemIndex(index);
    setModalKey(k => k + 1);
    setModalOpen(true);
  };

  /**
   * Opens the card details modal pre-filled with AI-generated JSON.
   * Works for both generate-all (cardDetailsResult) and standard card type (result).
   */
  const handleApplyCardDetails = (sourceJson?: Record<string, unknown>) => {
    const json = sourceJson
      || (cardDetailsResult?.items?.[0]?.json as Record<string, unknown> | undefined)
      || (generationType === 'card' && result?.items?.[0]?.json && !Array.isArray(result.items[0].json)
        ? result.items[0].json as Record<string, unknown>
        : undefined);

    if (!json || !selectedVersionId) {
      toast.warning('Please select a card and version first');
      return;
    }

    setPendingCardDetailsJson(json);
    setCardDetailsModalKey(k => k + 1);
    setCardDetailsModalOpen(true);
  };

  const handleCreateGenerateAllComponent = (item: Record<string, unknown>, componentType: ComponentType, itemIndex: number) => {
    if (!selectedCardId) {
      toast.warning('Please select a card first');
      return;
    }
    setPendingJsonImport(item);
    setPendingItemIndex(itemIndex);
    setActiveModalType(componentType);
    setModalKey(k => k + 1);
    setModalOpen(true);
  };

  const getComponentTypeLabel = (): string => {
    switch (generationType) {
      case 'credit': return 'Credit';
      case 'perk': return 'Perk';
      case 'multiplier': return 'Multiplier';
      default: return '';
    }
  };

  /**
   * Validates a single component item against its type schema.
   * Used for generate-all items which aren't validated by the top-level validateGenerationResult.
   */
  const validateComponentItem = (item: Record<string, unknown>, componentType: ComponentType): boolean => {
    const result = validateResponse(componentType, item);
    return result.valid;
  };

  const getItemTitle = (item: GeneratedItem): string => {
    const json = item.json;
    // Handle array type (rotating-categories returns an array)
    if (Array.isArray(json)) {
      return `Rotating Categories (${json.length} entries)`;
    }
    return (json.Title as string) || (json.Name as string) || (json.CardName as string) || (json.id as string) || 'Item';
  };

  const formatTokenCount = (count: number): string => {
    if (count >= 1000000) {
      const millions = count / 1000000;
      return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (count >= 1000) {
      const thousands = Math.round(count / 1000);
      return `${thousands}k`;
    }
    return String(count);
  };

  const copyToClipboard = async (text: string, fieldKey?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (fieldKey) {
        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 2000);
      }
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const copyItemJson = (item: GeneratedItem, index: number) => {
    copyToClipboard(JSON.stringify(item.json, null, 2), `json-${index}`);
  };

  const renderFieldValue = (value: string | number | null): string => {
    if (value === null) return '';
    return String(value);
  };

  const isColorField = (key: string): boolean => {
    return key === 'CardPrimaryColor' || key === 'CardSecondaryColor';
  };

  const isValidHexColor = (value: string | number | null): boolean => {
    if (!value || typeof value !== 'string') return false;
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  };

  const getCardColors = (item: GeneratedItem): { primary: string; secondary: string } => {
    // Only applicable for card type (which is always an object, not array)
    if (Array.isArray(item.json)) {
      return { primary: '#5A5F66', secondary: '#F2F4F6' };
    }
    const primary = item.json.CardPrimaryColor as string | undefined;
    const secondary = item.json.CardSecondaryColor as string | undefined;
    return {
      primary: isValidHexColor(primary ?? null) ? primary! : '#5A5F66',
      secondary: isValidHexColor(secondary ?? null) ? secondary! : '#F2F4F6',
    };
  };

  const getValidationErrorSummary = (item: GeneratedItem): string | null => {
    if (item.isValid) return null;

    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    for (const field of item.fields) {
      if (!field.isValid && field.validationError) {
        // Check if it's a "missing" type error (empty, required, etc.)
        const isMissing = field.validationError.toLowerCase().includes('empty') ||
                          field.validationError.toLowerCase().includes('required') ||
                          field.value === null ||
                          field.value === '' ||
                          field.value === undefined;

        if (isMissing) {
          missingFields.push(field.label);
        } else {
          invalidFields.push(field.label);
        }
      }
    }

    const parts: string[] = [];

    if (missingFields.length === 1) {
      parts.push(`Missing field: ${missingFields[0]}`);
    } else if (missingFields.length > 1) {
      parts.push(`Missing fields: ${missingFields.join(', ')}`);
    }

    if (invalidFields.length === 1) {
      parts.push(`Invalid value for: ${invalidFields[0]}`);
    } else if (invalidFields.length > 1) {
      parts.push(`Invalid values for: ${invalidFields.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('. ') : null;
  };

  /**
   * Validates a GenerationResult and adds validation status to each field and item
   */
  const validateGenerationResult = (
    resultData: GenerationResult,
    type: GenerationType
  ): GenerationResult => {
    const validatedItems = resultData.items.map((item) => {
      // Validate the entire JSON object
      const objectValidation = validateResponse(type, item.json);
      
      // Validate each field
      const validatedFields: GeneratedField[] = item.fields.map((field) => {
        const fieldValidation = validateField(type, field.key, field.value, !Array.isArray(item.json) ? item.json as Record<string, unknown> : undefined);
        return {
          ...field,
          isValid: fieldValidation.valid,
          validationError: fieldValidation.reason,
        };
      });
      
      return {
        ...item,
        fields: validatedFields,
        isValid: objectValidation.valid,
      };
    });
    
    return {
      ...resultData,
      items: validatedItems,
    };
  };

  return (
    <div className="ai-assistant-page">
      <PageHeader title="AI Card Generator" actions={<ProfilePopover />} />

      <div className="assistant-content">
        <div className="input-section">
          {/* Top toolbar: generation type, batch toggle, models */}
          <div className="input-toolbar">
            <div className="input-toolbar-left">
              <div className="generation-type-selector">
                <Select
                  label="Generation Type"
                  value={generationType}
                  onChange={(value) => {
                    setGenerationType(value as GenerationType);
                    if (value === 'card') {
                      setBatchMode(false);
                    }
                  }}
                  options={GENERATION_TYPE_OPTIONS}
                  disabled={loading || generationTypeLocked}
                />
                {generationTypeLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="lock-button"
                    onClick={() => {
                      const confirmed = window.confirm('Switching generation type will clear current results. Continue?');
                      if (confirmed) {
                        clearGenerateAllState();
                        setResult(null);
                        setShowRefinement(false);
                      }
                    }}
                    title="Unlock generation type selector"
                  >
                    <Lock size={14} />
                  </Button>
                )}
              </div>
              {canBatch && (
                <label className="batch-toggle">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                  />
                  <span>Batch</span>
                </label>
              )}
            </div>
            <div className="input-toolbar-right">
              {isGenerateAll ? (
                <div className="model-select-group">
                  <Select
                    label="Generator"
                    value={selectedModel}
                    onChange={(value) => setSelectedModel(value as AIModel)}
                    options={AI_PRO_MODEL_OPTIONS}
                    className="model-select"
                  />
                  <Select
                    label="Checker"
                    value={selectedCheckerModel}
                    onChange={(value) => setSelectedCheckerModel(value as AIModel)}
                    options={AI_FLASH_MODEL_OPTIONS}
                    className="model-select"
                  />
                </div>
              ) : (
                <Select
                  label="Model"
                  value={selectedModel}
                  onChange={(value) => setSelectedModel(value as AIModel)}
                  options={AI_MODEL_OPTIONS}
                  className="model-select"
                />
              )}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            className="raw-data-input"
            placeholder="Paste raw credit card information here (from websites, documents, etc.)..."
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={8}
          />

          {/* Bottom bar: card/version selection + generate button */}
          <div className="input-bottom-bar">
            {generationType !== 'rotating-categories' && (
              <div className="target-card-row">
                <Combobox
                  label="Card"
                  options={cards.map(card => ({
                    value: card.ReferenceCardId,
                    label: card.CardName,
                    secondaryText: `(${card.ReferenceCardId})`
                  }))}
                  value={selectedCardId}
                  onChange={setSelectedCardId}
                  placeholder="Select a card..."
                  searchPlaceholder="Search cards..."
                  disabled={loadingCards || generationTypeLocked}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadCards(true)}
                  disabled={loadingCards}
                  title="Refresh cards list"
                  className="icon-button"
                >
                  <RefreshCw size={14} className={loadingCards ? 'spinning' : ''} />
                </Button>
                {(isGenerateAll || generationType === 'card') && selectedCardId && (
                  <>
                    <Select
                      label="Version"
                      value={selectedVersionId}
                      onChange={setSelectedVersionId}
                      options={versions.map(v => ({
                        value: v.id,
                        label: `${v.VersionName}${v.IsActive ? ' (Active)' : ''}`,
                      }))}
                      disabled={loadingVersions || versions.length === 0 || generationTypeLocked}
                      className="version-select"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshVersions}
                      disabled={loadingVersions}
                      title="Refresh versions"
                      className="icon-button"
                    >
                      <RefreshCw size={14} className={loadingVersions ? 'spinning' : ''} />
                    </Button>
                  </>
                )}
              </div>
            )}
            <Button
              onClick={handleGenerate}
              disabled={loading || !rawData.trim() || (isGenerateAll && (!selectedCardId || !selectedVersionId || !selectedCardName || loadingVersions))}
              className="generate-button"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>
        </div>

        {/* Generate-all tab display */}
        {isGenerateAll && (result || cardDetailsResult) && (
          <div className="output-section">
            <div className="section-header">
              <h2>Generated Output</h2>
            </div>

            {(() => {
              const rows: Array<{ label: string; entry: TokenBreakdownEntry }> = [];
              if (result?.tokenBreakdown?.generation) {
                rows.push({ label: `Components (${result.tokenBreakdown.generation.model.includes('flash') ? 'Flash' : 'Pro'})`, entry: result.tokenBreakdown.generation });
              }
              if (result?.tokenBreakdown?.validation) {
                rows.push({ label: `Component Check (${result.tokenBreakdown.validation.model.includes('flash') ? 'Flash' : 'Pro'})`, entry: result.tokenBreakdown.validation });
              }
              if (cardDetailsResult?.tokenBreakdown?.generation) {
                rows.push({ label: `Card Details (${cardDetailsResult.tokenBreakdown.generation.model.includes('flash') ? 'Flash' : 'Pro'})`, entry: cardDetailsResult.tokenBreakdown.generation });
              }
              if (cardDetailsResult?.tokenBreakdown?.validation) {
                rows.push({ label: `Card Details Check (${cardDetailsResult.tokenBreakdown.validation.model.includes('flash') ? 'Flash' : 'Pro'})`, entry: cardDetailsResult.tokenBreakdown.validation });
              }
              if (rows.length === 0) return null;
              const totalCost = rows.reduce((sum, r) => sum + calculateCallCost(r.entry.inputTokens, r.entry.outputTokens, r.entry.model), 0);
              const totalInput = rows.reduce((s, r) => s + r.entry.inputTokens, 0);
              const totalOutput = rows.reduce((s, r) => s + r.entry.outputTokens, 0);
              return (
                <div className="token-usage-section">
                  <button className="token-usage-toggle" onClick={() => setTokenUsageExpanded(!tokenUsageExpanded)}>
                    <span>{formatCost(totalCost)} · {formatTokenCount(totalInput)} in / {formatTokenCount(totalOutput)} out · {result?.modelUsed || cardDetailsResult?.modelUsed || ''}</span>
                    <ChevronDown size={14} className={tokenUsageExpanded ? 'rotated' : ''} />
                  </button>
                  {tokenUsageExpanded && (
                    <table className="token-usage-table">
                      <thead><tr><th>Call</th><th>Input</th><th>Output</th><th>Thinking</th><th>Cost</th></tr></thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i}><td>{row.label}</td><td>{formatTokenCount(row.entry.inputTokens)}</td><td>{formatTokenCount(row.entry.outputTokens)}</td><td>{row.entry.thinkingTokens ? formatTokenCount(row.entry.thinkingTokens) : '--'}</td><td>{formatCost(calculateCallCost(row.entry.inputTokens, row.entry.outputTokens, row.entry.model))}</td></tr>
                        ))}
                        {rows.length > 1 && (
                          <tr className="total-row"><td>Total</td><td>{formatTokenCount(totalInput)}</td><td>{formatTokenCount(totalOutput)}</td><td>{formatTokenCount(rows.reduce((s, r) => s + (r.entry.thinkingTokens || 0), 0))}</td><td>{formatCost(totalCost)}</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

            <div className="generate-all-tabs">
              <div className="generate-all-tabs-header">
                <button
                  className={cn('generate-all-tab', generateAllActiveTab === 'card' && 'active')}
                  onClick={() => setGenerateAllActiveTab('card')}
                >
                  Card Details {cardDetailsResult ? '(1)' : ''}
                </button>
                {(['credits', 'perks', 'multipliers'] as const).map(tab => {
                  const typeMap: Record<string, ComponentType> = { credits: 'credit', perks: 'perk', multipliers: 'multiplier' };
                  const items = getComponentItems(typeMap[tab]);
                  return (
                    <button
                      key={tab}
                      className={cn('generate-all-tab', generateAllActiveTab === tab && 'active')}
                      onClick={() => setGenerateAllActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)} ({items.length})
                    </button>
                  );
                })}
              </div>

              <div className="generate-all-tabs-content">
                {/* Card Details Tab */}
                {generateAllActiveTab === 'card' && (
                  <div className="tab-content">
                    {cardDetailsError && (
                      <div className="tab-error">Card details generation failed: {cardDetailsError}</div>
                    )}
                    {!cardDetailsResult && !cardDetailsError && (
                      <div className="tab-loading"><Loader2 size={16} className="spinning" /> Generating card details...</div>
                    )}
                    {cardDetailsResult?.items?.[0] && (() => {
                      const cardItem = cardDetailsResult.items[0];
                      return (
                        <>
                          <div className="card-details-context">
                            Card: <strong>{selectedCardName}</strong> | Version: <strong>{versions.find(v => v.id === selectedVersionId)?.VersionName || selectedVersionId}</strong>
                            {cardItem.isValid !== undefined && (
                              <span className={cn('schema-status', cardItem.isValid ? 'valid' : 'invalid')}>
                                {cardItem.isValid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {cardItem.isValid ? 'Valid schema' : 'Invalid schema'}
                              </span>
                            )}
                          </div>
                          <div className="json-output">
                            <pre className="json-content">
                              {JSON.stringify(cardItem.json, null, 2)}
                            </pre>
                          </div>
                          <div className="apply-card-details">
                            {cardDetailsApplied ? (
                              <span className="applied-badge">
                                <CheckCircle size={14} /> Applied
                              </span>
                            ) : (
                              <Button onClick={() => handleApplyCardDetails()} variant="outline" size="sm">
                                Apply to Version
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Component Tabs (Credits, Perks, Multipliers) */}
                {generateAllActiveTab !== 'card' && (() => {
                  const typeMap: Record<string, ComponentType> = { credits: 'credit', perks: 'perk', multipliers: 'multiplier' };
                  const componentType = typeMap[generateAllActiveTab];
                  const tabKey = generateAllActiveTab as ComponentTabKey;
                  const items = getComponentItems(componentType);

                  if (combinedError) {
                    return <div className="tab-error">Component generation failed: {combinedError}</div>;
                  }
                  if (!result) {
                    return <div className="tab-loading"><Loader2 size={16} className="spinning" /> Generating components...</div>;
                  }
                  if (items.length === 0) {
                    return <div className="tab-empty">No {generateAllActiveTab} found in the provided data.</div>;
                  }

                  const eligibleIds = getEligibleItemIds(componentType);
                  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every(id => selectedItems[tabKey].has(id));
                  const totalSelected = getTotalSelectedCount();
                  const totalEligible = getTotalEligibleCount();

                  return (
                    <>
                      {/* Existing components warning */}
                      {existingComponentCounts && (
                        <div className="existing-components-warning">
                          Warning: This card already has {existingComponentCounts.credits} credits, {existingComponentCounts.perks} perks, {existingComponentCounts.multipliers} multipliers.
                          Creating new components will not replace existing ones.
                        </div>
                      )}

                      {/* Duplicate warnings banner */}
                      {(() => {
                        const dupeWarnings = getDuplicateWarningsForTab(componentType);
                        if (dupeWarnings.length === 0) return null;
                        return (
                          <div className="duplicate-warning-banner">
                            {dupeWarnings.map((w, i) => (
                              <div key={i}>
                                Possible duplicate: "{w.itemA.title}" ({w.itemA.type}) and "{w.itemB.title}" ({w.itemB.type})
                                {w.confidence === 'medium' && ' (partial match)'}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Bulk selection toolbar */}
                      {items.length > 0 && (
                        <div className="bulk-selection-toolbar">
                          <label className="select-all-checkbox">
                            <input
                              type="checkbox"
                              checked={allEligibleSelected}
                              onChange={() => handleSelectAll(componentType)}
                              disabled={eligibleIds.length === 0}
                            />
                            <span>Select All</span>
                          </label>
                          <span className="selection-count">
                            {getTotalSelectedCount()} selected ({eligibleIds.length} eligible in this tab)
                          </span>
                          <div className="bulk-actions">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBulkCreate('all')}
                              disabled={!selectedCardId || bulkCreating || totalEligible === 0}
                            >
                              {bulkCreating ? <Loader2 size={14} className="spinning" /> : null}
                              Create All ({totalEligible})
                            </Button>
                            {totalSelected > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBulkCreate('selected')}
                                disabled={!selectedCardId || bulkCreating}
                              >
                                Create Selected ({totalSelected})
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="items-list">
                        {items.map((item, index) => {
                          const itemId = itemIdMap.get(`${componentType}:${index}`) || `${componentType}:${index}`;
                          const isCreated = createdComponentItems[tabKey]?.has(itemId);
                          const itemTitle = (item.Title || item.Name || `Item ${index + 1}`) as string;
                          const isDisabledForBulk = componentType === 'multiplier' && isRotatingOrSelectable(item);
                          const isSelected = selectedItems[tabKey].has(itemId);

                          return (
                            <div key={itemId} className={cn('item-card', isCreated && 'item-card--created')}>
                              <div className="item-header">
                                <input
                                  type="checkbox"
                                  className="item-checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelection(tabKey, itemId)}
                                  disabled={isCreated || isDisabledForBulk}
                                  title={isDisabledForBulk ? 'Rotating/selectable multipliers must be created individually to configure schedule entries or allowed categories.' : undefined}
                                />
                                <div className="item-header-clickable">
                                  <span className="item-number">[{index + 1}]</span>
                                  <span className="item-title">{itemTitle}</span>
                                </div>
                                {isCreated ? (
                                  <span className="item-created-badge">
                                    <CheckCircle size={14} /> Created
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="item-create-button"
                                    onClick={() => handleCreateGenerateAllComponent(item, componentType, index)}
                                  >
                                    <Plus size={14} /> Create {componentType.charAt(0).toUpperCase() + componentType.slice(1)}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="item-copy-button"
                                  onClick={() => copyToClipboard(JSON.stringify(item, null, 2), `ga-${componentType}-${index}`)}
                                >
                                  {copiedField === `ga-${componentType}-${index}` ? (
                                    <><Check size={14} /> Copied</>
                                  ) : (
                                    <><Copy size={14} /> Copy JSON</>
                                  )}
                                </Button>
                              </div>
                            <div className="item-content">
                              {/* Category warnings */}
                              {getCategoryWarningsForItem(componentType, index).map((w, wi) => (
                                <div key={wi} className="item-warning-badge">
                                  {w.message}
                                </div>
                              ))}
                              {/* Duplicate warnings for this item */}
                              {getDuplicateWarningsForItem(componentType, index).map((w, wi) => (
                                <div key={`dup-${wi}`} className="item-warning-badge item-warning-badge--duplicate">
                                  Possible duplicate with {w.itemA.type === componentType ? w.itemB.type : w.itemA.type}
                                </div>
                              ))}
                              <div className="json-output">
                                <div className="json-header">
                                  <div className="json-validation-status">
                                    {(() => {
                                      const isValid = validateComponentItem(item, componentType);
                                      return isValid ? (
                                        <div className="validation-status-row">
                                          <CheckCircle size={14} className="validation-icon valid" />
                                          <span className="valid-text">valid schema</span>
                                        </div>
                                      ) : (
                                        <div className="validation-status-row">
                                          <XCircle size={14} className="validation-icon invalid" />
                                          <span className="invalid-text">invalid schema</span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <pre className="json-content">
                                  {JSON.stringify(item, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {!isGenerateAll && result && result.items.length === 0 && (
          <div className="output-section">
            <div className="section-header">
              <h2>Generated Output</h2>
            </div>
            <div className="model-info">
              Model used: <span className="model-name">{result.modelUsed}</span>
            </div>
            <div className="empty-result">
              <p className="empty-result-title">No {generationType === 'card' ? 'card details' : `${generationType}s`} found</p>
              <p className="empty-result-description">
                The AI successfully processed your input but did not find any {generationType === 'card' ? 'card details' : `${generationType}s`} to extract.
                This may be because the pasted text does not contain relevant {generationType} information.
              </p>
            </div>
          </div>
        )}

        {!isGenerateAll && result && result.items.length > 0 && (
          <div className="output-section">
            <div className="section-header">
              <h2>
                Generated Output
                {result.items.length > 1 && ` (${result.items.length} items)`}
              </h2>
              <div className="toggle-bar">
                <button
                  className={cn('toggle-button', displayMode === 'fields' && 'active')}
                  onClick={() => setDisplayMode('fields')}
                >
                  Fields
                </button>
                <button
                  className={cn('toggle-button', displayMode === 'json' && 'active')}
                  onClick={() => setDisplayMode('json')}
                >
                  JSON
                </button>
              </div>
            </div>

            {(() => {
              const rows: Array<{ label: string; entry: TokenBreakdownEntry }> = [];
              if (result.tokenBreakdown?.generation) {
                rows.push({ label: `Generation (${result.tokenBreakdown.generation.model.includes('flash') ? 'Flash' : 'Pro'})`, entry: result.tokenBreakdown.generation });
              } else if (result.tokenUsage) {
                rows.push({ label: `Generation (${result.modelUsed.includes('flash') ? 'Flash' : 'Pro'})`, entry: { inputTokens: result.tokenUsage.inputTokens, outputTokens: result.tokenUsage.outputTokens, model: result.modelUsed } });
              }
              if (result.tokenBreakdown?.validation) {
                rows.push({ label: `Validation (${result.tokenBreakdown.validation.model.includes('flash') ? 'Flash' : 'Pro'})`, entry: result.tokenBreakdown.validation });
              }
              if (rows.length === 0) return null;
              const totalCost = rows.reduce((sum, r) => sum + calculateCallCost(r.entry.inputTokens, r.entry.outputTokens, r.entry.model), 0);
              const totalInput = rows.reduce((s, r) => s + r.entry.inputTokens, 0);
              const totalOutput = rows.reduce((s, r) => s + r.entry.outputTokens, 0);
              return (
                <div className="token-usage-section">
                  <button className="token-usage-toggle" onClick={() => setTokenUsageExpanded(!tokenUsageExpanded)}>
                    <span>{formatCost(totalCost)} · {formatTokenCount(totalInput)} in / {formatTokenCount(totalOutput)} out · {result.modelUsed}</span>
                    <ChevronDown size={14} className={tokenUsageExpanded ? 'rotated' : ''} />
                  </button>
                  {tokenUsageExpanded && (
                    <table className="token-usage-table">
                      <thead><tr><th>Call</th><th>Input</th><th>Output</th><th>Thinking</th><th>Cost</th></tr></thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i}><td>{row.label}</td><td>{formatTokenCount(row.entry.inputTokens)}</td><td>{formatTokenCount(row.entry.outputTokens)}</td><td>{row.entry.thinkingTokens ? formatTokenCount(row.entry.thinkingTokens) : '--'}</td><td>{formatCost(calculateCallCost(row.entry.inputTokens, row.entry.outputTokens, row.entry.model))}</td></tr>
                        ))}
                        {rows.length > 1 && (
                          <tr className="total-row"><td>Total</td><td>{formatTokenCount(totalInput)}</td><td>{formatTokenCount(totalOutput)}</td><td>{formatTokenCount(rows.reduce((s, r) => s + (r.entry.thinkingTokens || 0), 0))}</td><td>{formatCost(totalCost)}</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

            <div className="model-info-row">
              <div className="model-info-group">
              </div>
              {result.items.length > 1 && (
                <button
                  className="expand-collapse-toggle"
                  onClick={toggleAllExpanded}
                >
                  <ChevronsUpDown size={14} />
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              )}
            </div>

            <div className="items-list">
              {result.items.map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-header">
                      <div 
                        className="item-header-clickable"
                        onClick={() => toggleItemExpanded(index)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && toggleItemExpanded(index)}
                      >
                        <span className="item-expand-icon">
                          {expandedItems.has(index) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        <span className="item-number">[{index + 1}]</span>
                        <span className="item-title">{getItemTitle(item)}</span>
                      </div>
                      {generationType !== 'card' && generationType !== 'rotating-categories' && (
                        createdItems.has(index) ? (
                          <span className="item-created-badge">
                            <CheckCircle size={14} />
                            Created
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="item-create-button"
                            onClick={() => handleCreateComponent(item, index)}
                            disabled={!selectedCardId}
                          >
                            <Plus size={14} />
                            Create {getComponentTypeLabel()}
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="item-copy-button"
                        onClick={() => copyItemJson(item, index)}
                      >
                        {copiedField === `json-${index}` ? (
                          <>
                            <Check size={14} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy JSON
                          </>
                        )}
                      </Button>
                    </div>

                  {expandedItems.has(index) && (
                    <div className="item-content">
                      {displayMode === 'fields' ? (
                        <div className="fields-output">
                          {item.fields.map((field) => (
                            <div key={field.key} className="field-row">
                              <div className="field-label">
                                {field.isValid !== undefined && (
                                  field.isValid ? (
                                    <CheckCircle size={14} className="validation-icon valid" />
                                  ) : (
                                    <span className="validation-icon-wrapper" title={field.validationError}>
                                      <XCircle size={14} className="validation-icon invalid" />
                                    </span>
                                  )
                                )}
                                {field.label}
                              </div>
                              <div className="field-value">
                                {isColorField(field.key) && isValidHexColor(field.value) && (
                                  <span
                                    className="color-swatch"
                                    style={{ backgroundColor: String(field.value) }}
                                  />
                                )}
                                <span>{renderFieldValue(field.value)}</span>
                                <button
                                  className="copy-button"
                                  onClick={() => copyToClipboard(renderFieldValue(field.value), `${index}-${field.key}`)}
                                  aria-label={`Copy ${field.label}`}
                                >
                                  {copiedField === `${index}-${field.key}` ? (
                                    <Check size={14} />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                          {generationType === 'card' && (
                            <>
                              <div className="card-preview-section">
                                <div className="card-preview-label">Card Preview</div>
                                <div className="card-preview-content">
                                  <CardIcon
                                    title="Card preview"
                                    size={36}
                                    primary={getCardColors(item).primary}
                                    secondary={getCardColors(item).secondary}
                                  />
                                  <span className="card-preview-hint">Preview with generated colors</span>
                                </div>
                              </div>
                              {selectedCardId && selectedVersionId && (
                                <div className="apply-card-details">
                                  {cardDetailsApplied ? (
                                    <span className="applied-badge">
                                      <CheckCircle size={14} /> Applied
                                    </span>
                                  ) : (
                                    <Button
                                      onClick={() => handleApplyCardDetails(!Array.isArray(item.json) ? item.json as Record<string, unknown> : undefined)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      Apply to Version
                                    </Button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="json-output">
                          <div className="json-header">
                            <div className="json-validation-status">
                              {item.isValid !== undefined && (
                                item.isValid ? (
                                  <div className="validation-status-row">
                                    <CheckCircle size={14} className="validation-icon valid" />
                                    <span className="valid-text">valid schema</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="validation-status-row">
                                      <XCircle size={14} className="validation-icon invalid" />
                                      <span className="invalid-text">invalid schema</span>
                                    </div>
                                    {getValidationErrorSummary(item) && (
                                      <div className="validation-error-details">
                                        {getValidationErrorSummary(item)}
                                      </div>
                                    )}
                                  </>
                                )
                              )}
                            </div>
                          </div>
                          <pre className="json-content">
                            {JSON.stringify(item.json, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {showRefinement && (
        <div className="refinement-section">
          <div className="refinement-content">
            <textarea
              className="refinement-input"
              placeholder="Enter refinement instructions..."
              value={refinementPrompt}
              onChange={(e) => {
                setRefinementPrompt(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              rows={1}
            />
            <Button
              onClick={handleRegenerate}
              disabled={loading || !refinementPrompt.trim()}
              className="regenerate-button"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  Regenerating...
                </>
              ) : (
                'Regenerate'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Component creation modals */}
      {generationType === 'credit' && (
        <CreditModal
          key={`credit-${modalKey}`}
          open={modalOpen}
          onOpenChange={setModalOpen}
          referenceCardId={selectedCardId}
          onSuccess={() => {
            toast.success('Credit created!');
            setModalOpen(false);
            if (pendingItemIndex !== null) {
              setCreatedItems(prev => new Set(prev).add(pendingItemIndex));
            }
          }}
          initialJson={pendingJsonImport || undefined}
        />
      )}
      {generationType === 'perk' && (
        <PerkModal
          key={`perk-${modalKey}`}
          open={modalOpen}
          onOpenChange={setModalOpen}
          referenceCardId={selectedCardId}
          onSuccess={() => {
            toast.success('Perk created!');
            setModalOpen(false);
            if (pendingItemIndex !== null) {
              setCreatedItems(prev => new Set(prev).add(pendingItemIndex));
            }
          }}
          initialJson={pendingJsonImport || undefined}
        />
      )}
      {generationType === 'multiplier' && (
        <MultiplierModal
          key={`multiplier-${modalKey}`}
          open={modalOpen}
          onOpenChange={setModalOpen}
          referenceCardId={selectedCardId}
          onSuccess={() => {
            toast.success('Multiplier created!');
            setModalOpen(false);
            if (pendingItemIndex !== null) {
              setCreatedItems(prev => new Set(prev).add(pendingItemIndex));
            }
          }}
          initialJson={pendingJsonImport || undefined}
        />
      )}

      {/* Generate-all modals — keyed by activeModalType */}
      {isGenerateAll && activeModalType === 'credit' && (
        <CreditModal
          key={`ga-credit-${modalKey}`}
          open={modalOpen}
          onOpenChange={setModalOpen}
          referenceCardId={selectedCardId}
          onSuccess={() => {
            toast.success('Credit created!');
            setModalOpen(false);
            if (pendingItemIndex !== null) {
              const itemId = itemIdMap.get(`credit:${pendingItemIndex}`);
              if (itemId) {
                setCreatedComponentItems(prev => ({
                  ...prev,
                  credits: new Set(prev.credits).add(itemId),
                }));
                setSelectedItems(prev => {
                  const next = new Set(prev.credits);
                  next.delete(itemId);
                  return { ...prev, credits: next };
                });
              }
            }
          }}
          initialJson={pendingJsonImport || undefined}
        />
      )}
      {isGenerateAll && activeModalType === 'perk' && (
        <PerkModal
          key={`ga-perk-${modalKey}`}
          open={modalOpen}
          onOpenChange={setModalOpen}
          referenceCardId={selectedCardId}
          onSuccess={() => {
            toast.success('Perk created!');
            setModalOpen(false);
            if (pendingItemIndex !== null) {
              const itemId = itemIdMap.get(`perk:${pendingItemIndex}`);
              if (itemId) {
                setCreatedComponentItems(prev => ({
                  ...prev,
                  perks: new Set(prev.perks).add(itemId),
                }));
                setSelectedItems(prev => {
                  const next = new Set(prev.perks);
                  next.delete(itemId);
                  return { ...prev, perks: next };
                });
              }
            }
          }}
          initialJson={pendingJsonImport || undefined}
        />
      )}
      {isGenerateAll && activeModalType === 'multiplier' && (
        <MultiplierModal
          key={`ga-multiplier-${modalKey}`}
          open={modalOpen}
          onOpenChange={setModalOpen}
          referenceCardId={selectedCardId}
          onSuccess={() => {
            toast.success('Multiplier created!');
            setModalOpen(false);
            if (pendingItemIndex !== null) {
              const itemId = itemIdMap.get(`multiplier:${pendingItemIndex}`);
              if (itemId) {
                setCreatedComponentItems(prev => ({
                  ...prev,
                  multipliers: new Set(prev.multipliers).add(itemId),
                }));
                setSelectedItems(prev => {
                  const next = new Set(prev.multipliers);
                  next.delete(itemId);
                  return { ...prev, multipliers: next };
                });
              }
            }
          }}
          initialJson={pendingJsonImport || undefined}
        />
      )}

      {/* Card details modal — for applying AI-generated card details to a version */}
      <CardDetailsModal
        key={`card-details-${cardDetailsModalKey}`}
        open={cardDetailsModalOpen}
        onOpenChange={setCardDetailsModalOpen}
        versionId={selectedVersionId}
        versionName={versions.find(v => v.id === selectedVersionId)?.VersionName || selectedVersionId}
        cardName={selectedCardName}
        onSuccess={() => {
          setCardDetailsModalOpen(false);
          setCardDetailsApplied(true);
        }}
        initialJson={pendingCardDetailsJson || undefined}
      />
    </div>
  );
}
