import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, CircleUser, LogOut, Copy, Check, Loader2, ChevronDown, ChevronRight, CheckCircle, XCircle, ChevronsUpDown, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AIService, AI_MODELS, AI_MODEL_OPTIONS } from '@/services/ai.service';
import type { GenerationType, GenerationResult, GeneratedItem, GeneratedField, AIModel } from '@/services/ai.service';
import { validateField, validateResponse } from '@/utils/schema-validation';
import { CardIcon } from '@/components/icons/CardIcon';
import { CreditModal } from '@/components/Modals/CreditModal';
import { PerkModal } from '@/components/Modals/PerkModal';
import { MultiplierModal } from '@/components/Modals/MultiplierModal';
import { Combobox } from '@/components/ui/Combobox';
import { CardService } from '@/services/card.service';
import type { CardWithStatus } from '@/types/ui-types';
import './AIAssistantPage.scss';

type DisplayMode = 'fields' | 'json';

const GENERATION_TYPE_OPTIONS = [
  { value: 'card', label: 'Card Details' },
  { value: 'credit', label: 'Credit' },
  { value: 'perk', label: 'Perk' },
  { value: 'multiplier', label: 'Multiplier' },
];

export function AIAssistantPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileContentRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  // Form state
  const [rawData, setRawData] = useState('');
  const [generationType, setGenerationType] = useState<GenerationType>('card');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS.GEMINI_3_PRO_PREVIEW);
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

  // Check if batch mode is available for current type
  const canBatch = generationType !== 'card';

  // Check if there's unsaved data that should trigger navigation warning
  const hasUnsavedDataRef = useRef(false);
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
  useEffect(() => {
    async function loadCards() {
      try {
        const cardsList = await CardService.getAllCardsWithStatus();
        cardsList.sort((a, b) => a.CardName.localeCompare(b.CardName));
        setCards(cardsList);
      } catch (error) {
        console.error('Failed to load cards:', error);
        toast.error('Failed to load cards');
      } finally {
        setLoadingCards(false);
      }
    }
    loadCards();
  }, []);

  // Close profile dropdown on click outside
  useEffect(() => {
    if (!profileOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContent = profileContentRef.current && !profileContentRef.current.contains(target);
      const isOutsideTrigger = profileTriggerRef.current && !profileTriggerRef.current.contains(target);
      
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

  const handleGenerate = async () => {
    if (!rawData.trim()) {
      toast.warning('Please paste some data to process');
      return;
    }

    setLoading(true);
    setResult(null);
    setShowRefinement(false);
    setRefinementPrompt('');

    try {
      const data = await AIService.generate({
        rawData,
        generationType,
        batchMode: canBatch && batchMode,
        model: selectedModel,
      });
      // Validate the result and add validation status
      const validatedData = validateGenerationResult(data, generationType);
      setResult(validatedData);
      // Expand all items by default
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
  };

  const handleRegenerate = async () => {
    if (!refinementPrompt.trim()) {
      toast.warning('Please enter refinement instructions');
      return;
    }

    if (!result?.items || result.items.length === 0) {
      toast.warning('No previous output to refine');
      return;
    }

    setLoading(true);

    try {
      // For refinement, pass all items as previous output
      // Single item: pass the object directly
      // Multiple items: pass as array
      const previousOutput = result.items.length === 1
        ? result.items[0].json
        : result.items.map(item => item.json);
      
      const data = await AIService.generate({
        rawData,
        generationType,
        batchMode: result.items.length > 1, // Use batch mode if we're refining multiple items
        refinementPrompt,
        previousOutput,
      });
      // Validate the result and add validation status
      const validatedData = validateGenerationResult(data, generationType);
      setResult(validatedData);
      // Expand all items by default
      setExpandedItems(new Set(validatedData.items.map((_, i) => i)));
      setAllExpanded(true);
      setRefinementPrompt('');
      // Reset textarea height
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

  const handleCreateComponent = (item: GeneratedItem) => {
    if (!selectedCardId) {
      toast.warning('Please select a card first');
      return;
    }
    setPendingJsonImport(item.json);
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

  const getItemTitle = (item: GeneratedItem): string => {
    const json = item.json;
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
        const fieldValidation = validateField(type, field.key, field.value);
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
      <div className="page-header">
        <div className="header-left">
          <Link to="/" className="home-link" aria-label="Back to home">
            <Home size={20} />
          </Link>
          <h1>AI Data Entry Assistant</h1>
        </div>
        <Popover open={profileOpen} onOpenChange={() => {}}>
          <PopoverTrigger asChild>
            <button
              ref={profileTriggerRef}
              className="profile-trigger"
              onClick={(e) => {
                e.preventDefault();
                setProfileOpen(!profileOpen);
              }}
              aria-label="User profile"
            >
              <CircleUser size={24} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            ref={profileContentRef}
            className="profile-dropdown"
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="profile-info">
              <div className="profile-name">{user?.displayName || 'User'}</div>
              <div className="profile-email">{user?.email || ''}</div>
            </div>
            <div className="profile-divider" />
            <button className="profile-logout" onClick={handleSignOut}>
              <LogOut size={16} />
              Sign out
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="assistant-content">
        <div className="input-section">
          <div className="section-header">
            <h2>Input Data</h2>
            <Select
              value={selectedModel}
              onChange={(value) => setSelectedModel(value as AIModel)}
              options={AI_MODEL_OPTIONS}
              className="model-select"
            />
          </div>
          <textarea
            className="raw-data-input"
            placeholder="Paste raw credit card information here (from websites, documents, etc.)..."
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={10}
          />
          <div className="input-controls">
            <Select
              label="Generation Type"
              value={generationType}
              onChange={(value) => {
                setGenerationType(value as GenerationType);
                // Reset batch mode when switching to card
                if (value === 'card') {
                  setBatchMode(false);
                }
              }}
              options={GENERATION_TYPE_OPTIONS}
            />
            {canBatch && (
              <label className="batch-toggle">
                <input
                  type="checkbox"
                  checked={batchMode}
                  onChange={(e) => setBatchMode(e.target.checked)}
                />
                <span>Generate Multiple at once</span>
              </label>
            )}
            <Button
              onClick={handleGenerate}
              disabled={loading || !rawData.trim()}
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

        {/* Card selector section - only shown for components after generation */}
        {result && generationType !== 'card' && (
          <div className="card-selector-section">
            <div className="section-header">
              <h2>Create Component</h2>
            </div>
            <div className="card-selector-row">
              <Combobox
                label="Target Card"
                required
                options={cards.map(card => ({
                  value: card.ReferenceCardId,
                  label: card.CardName,
                  secondaryText: `(${card.ReferenceCardId})`
                }))}
                value={selectedCardId}
                onChange={setSelectedCardId}
                placeholder="Select a card to create components for..."
                searchPlaceholder="Search cards..."
                disabled={loadingCards}
              />
            </div>
          </div>
        )}

        {result && result.items.length === 0 && (
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

        {result && result.items.length > 0 && (
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

            <div className="model-info-row">
              <div className="model-info-group">
                <div className="model-info">
                  Model used: <span className="model-name">{result.modelUsed}</span>
                </div>
                {result.tokenUsage && (
                  <>
                    <div className="model-info">
                      Input tokens: <span className="model-name">{formatTokenCount(result.tokenUsage.inputTokens)}</span>
                    </div>
                    <div className="model-info">
                      Output tokens: <span className="model-name">{formatTokenCount(result.tokenUsage.outputTokens)}</span>
                    </div>
                  </>
                )}
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
                      {generationType !== 'card' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="item-create-button"
                          onClick={() => handleCreateComponent(item)}
                          disabled={!selectedCardId}
                        >
                          <Plus size={14} />
                          Create {getComponentTypeLabel()}
                        </Button>
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
          }}
          initialJson={pendingJsonImport || undefined}
        />
      )}
    </div>
  );
}

