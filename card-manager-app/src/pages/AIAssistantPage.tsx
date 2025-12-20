import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, CircleUser, LogOut, Copy, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AIService } from '@/services/ai.service';
import type { GenerationType, GenerationResult, GeneratedItem } from '@/services/ai.service';
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('json');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));

  // Refinement state
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [showRefinement, setShowRefinement] = useState(false);

  // Check if batch mode is available for current type
  const canBatch = generationType !== 'card';

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
    setExpandedItems(new Set([0]));

    try {
      const data = await AIService.generate({
        rawData,
        generationType,
        batchMode: canBatch && batchMode,
      });
      setResult(data);
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

    setLoading(true);

    try {
      // For refinement, pass all items as previous output
      const previousOutput = result?.items && result.items.length === 1 
        ? result.items[0].json 
        : result?.items.map(item => item.json);
      
      const data = await AIService.generate({
        rawData,
        generationType,
        batchMode: canBatch && batchMode,
        refinementPrompt,
        previousOutput: previousOutput as Record<string, unknown>,
      });
      setResult(data);
      setRefinementPrompt('');
    } catch (err: any) {
      console.error('Regeneration error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
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
      return next;
    });
  };

  const getItemTitle = (item: GeneratedItem): string => {
    const json = item.json;
    return (json.Title as string) || (json.Name as string) || (json.CardName as string) || (json.id as string) || 'Item';
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

            <div className="model-info">
              Model used: <span className="model-name">{result.modelUsed}</span>
            </div>

            <div className="items-list">
              {result.items.map((item, index) => (
                <div key={index} className="item-card">
                  {result.items.length > 1 && (
                    <button 
                      className="item-header"
                      onClick={() => toggleItemExpanded(index)}
                    >
                      <span className="item-expand-icon">
                        {expandedItems.has(index) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <span className="item-number">[{index + 1}]</span>
                      <span className="item-title">{getItemTitle(item)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="item-copy-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyItemJson(item, index);
                        }}
                      >
                        {copiedField === `json-${index}` ? (
                          <>
                            <Check size={14} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy
                          </>
                        )}
                      </Button>
                    </button>
                  )}
                  
                  {(result.items.length === 1 || expandedItems.has(index)) && (
                    <div className="item-content">
                      {displayMode === 'fields' ? (
                        <div className="fields-output">
                          {item.fields.map((field) => (
                            <div key={field.key} className="field-row">
                              <div className="field-label">{field.label}</div>
                              <div className="field-value">
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
                        </div>
                      ) : (
                        <div className="json-output">
                          {result.items.length === 1 && (
                            <div className="json-header">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyItemJson(item, index)}
                                className="copy-json-button"
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
                          )}
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

            {showRefinement && (
              <div className="refinement-section">
                <h3>Refine Output</h3>
                <textarea
                  className="refinement-input"
                  placeholder="Enter additional instructions to refine the output (e.g., 'Change the category to travel', 'The annual fee should be $95')..."
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleRegenerate}
                  disabled={loading || !refinementPrompt.trim()}
                  variant="outline"
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

