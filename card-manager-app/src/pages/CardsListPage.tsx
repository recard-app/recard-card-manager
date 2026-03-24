import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CardService } from '@/services/card.service';
import type { CardWithStatus, CardCharacteristics } from '@/types/ui-types';
import { CardStatus } from '@/types/ui-types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Plus, Search, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle2, Clock, AlertTriangle, AlertOctagon, Check, Filter, X } from 'lucide-react';
import { CreateCardModal } from '@/components/Modals/CreateCardModal';
import { PageHeader } from '@/components/PageHeader';
import { ProfilePopover } from '@/components/ProfilePopover';
import './CardsListPage.scss';

type SortColumn = 'CardName' | 'CardIssuer' | 'status' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';
type LastUpdatedTier = 'all' | 'lt30' | 'gt30' | 'gt60' | 'gt90';

// Moved outside CardsListPage to prevent re-creation on parent re-renders
function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: { value: T, label: React.ReactNode }[];
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Close on click outside
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the content and the trigger
      const isOutsideContent = contentRef.current && !contentRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      
      if (isOutsideContent && isOutsideTrigger) {
        setOpen(false);
      }
    };
    
    // Use setTimeout to avoid the click that opened it from immediately closing it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);
  
  return (
    <Popover open={open} onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        <Button 
          ref={triggerRef}
          variant="outline" 
          className={cn(
            "h-9 gap-1.5",
            selected.length > 0
              ? "border border-slate-300 bg-slate-50 hover:bg-slate-100"
              : "border-dashed"
          )}
          onClick={(e) => {
            e.preventDefault();
            setOpen(!open);
          }}
        >
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-600">{label}</span>
          <ChevronDown size={14} className="text-slate-400" />
          {selected.length > 0 && (
            <>
              <span className="mx-1 h-4 w-[1px] bg-slate-200" />
              <Badge variant="secondary" className="rounded-sm px-1.5 font-normal text-xs">
                {selected.length}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        ref={contentRef}
        className="w-[220px] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <div
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-slate-900",
                  isSelected && "bg-slate-100"
                )}
                onClick={() => {
                  if (selected.includes(option.value)) {
                    const next = selected.filter(v => v !== option.value);
                    onChange(next);
                  } else {
                    onChange([...selected, option.value]);
                  }
                }}
              >
                <div className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-slate-400",
                  isSelected ? "bg-slate-900 text-slate-50 border-slate-900" : "[&_svg]:invisible"
                )}>
                  <Check className="h-3 w-3" />
                </div>
                {option.label}
              </div>
            );
          })}
        </div>
        {selected.length > 0 && (
          <>
            <div className="h-px bg-slate-200 my-1" />
            <div className="p-1">
              <Button
                variant="ghost"
                className="w-full justify-center h-8 text-xs"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
              >
                Clear filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SingleSelectFilter<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { value: T, label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContent = contentRef.current && !contentRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);

      if (isOutsideContent && isOutsideTrigger) {
        setOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className="h-9 gap-1.5 border-dashed"
          onClick={(e) => {
            e.preventDefault();
            setOpen(!open);
          }}
        >
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-600">{label}</span>
          <ChevronDown size={14} className="text-slate-400" />
          {selectedOption && (
            <>
              <span className="mx-1 h-4 w-[1px] bg-slate-200" />
              <Badge variant="secondary" className="rounded-sm px-1.5 font-normal text-xs">
                {selectedOption.label}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        className="w-[220px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-1">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <div
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-slate-900",
                  isSelected && "bg-slate-100"
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <div className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-slate-400",
                  isSelected ? "border-slate-900" : ""
                )}>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-slate-900" />
                  )}
                </div>
                {option.label}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type DisplayMode = 'name' | 'id' | 'version';
const VALID_DISPLAY_MODES: DisplayMode[] = ['name', 'id', 'version'];

const VALID_SORT_COLUMNS: SortColumn[] = ['CardName', 'CardIssuer', 'status', 'lastUpdated'];
const VALID_LAST_UPDATED: Exclude<LastUpdatedTier, 'all'>[] = ['lt30', 'gt30', 'gt60', 'gt90'];
const VALID_CHARACTERISTICS: CardCharacteristics[] = ['standard', 'rotating', 'selectable'];

export function CardsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Derive filter/sort state from URL params
  const searchQuery = searchParams.get('q') || '';
  const statusFilter = (searchParams.get('status')?.split(',').filter(Boolean)) || [];
  const lastUpdatedFilter = (searchParams.get('updated')?.split(',').filter((v): v is Exclude<LastUpdatedTier, 'all'> =>
    VALID_LAST_UPDATED.includes(v as Exclude<LastUpdatedTier, 'all'>)
  )) || [];
  const characteristicsFilter = (searchParams.get('chars')?.split(',').filter((v): v is CardCharacteristics =>
    VALID_CHARACTERISTICS.includes(v as CardCharacteristics)
  )) || [];
  const sortColumnRaw = searchParams.get('sort');
  const sortColumn: SortColumn | null = sortColumnRaw === 'none'
    ? null
    : sortColumnRaw && VALID_SORT_COLUMNS.includes(sortColumnRaw as SortColumn)
      ? sortColumnRaw as SortColumn
      : sortColumnRaw === null ? 'CardName' : null;
  const sortDirRaw = searchParams.get('dir');
  const sortDirection: SortDirection = sortDirRaw === 'desc' ? 'desc' : 'asc';
  const displayModeRaw = searchParams.get('display');
  const displayMode: DisplayMode = displayModeRaw && VALID_DISPLAY_MODES.includes(displayModeRaw as DisplayMode)
    ? displayModeRaw as DisplayMode
    : 'version';

  // Local search input state with debounced URL sync
  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local input in sync if URL changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      // Remove default values to keep URL clean
      if (next.get('sort') === 'CardName') next.delete('sort');
      if (next.get('dir') === 'asc') next.delete('dir');
      if (next.get('display') === 'version') next.delete('display');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      updateParams({ q: value || null });
    }, 300);
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }, []);

  const setStatusFilter = useCallback((vals: string[]) => {
    updateParams({ status: vals.length > 0 ? vals.join(',') : null });
  }, [updateParams]);

  const setLastUpdatedFilter = useCallback((vals: Exclude<LastUpdatedTier, 'all'>[]) => {
    updateParams({ updated: vals.length > 0 ? vals.join(',') : null });
  }, [updateParams]);

  const setCharacteristicsFilter = useCallback((vals: CardCharacteristics[]) => {
    updateParams({ chars: vals.length > 0 ? vals.join(',') : null });
  }, [updateParams]);

  const hasActiveFilters = searchQuery !== '' || statusFilter.length > 0 || lastUpdatedFilter.length > 0 || characteristicsFilter.length > 0;
  const hasNonDefaultSort = sortColumn !== 'CardName' || sortDirection !== 'asc';

  const clearFilters = useCallback(() => {
    setSearchInput('');
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    updateParams({ q: null, status: null, updated: null, chars: null, display: null });
  }, [updateParams]);

  const clearSort = useCallback(() => {
    updateParams({ sort: null, dir: null });
  }, [updateParams]);

  useEffect(() => {
    loadCards();
  }, []);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      const result = await CardService.syncAllToProduction();
      
      if (result.synced > 0 || result.removed > 0) {
        toast.success(result.message);
      } else {
        toast.info('All cards are already in sync');
      }
    } catch (err: any) {
      console.error('Error syncing cards:', err);
      toast.error('Failed to sync cards: ' + (err.message || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await CardService.getAllCardsWithStatus();
      setCards(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cards');
      console.error('Error loading cards:', err);
      toast.error('Failed to load cards' + (err?.message ? `: ${err.message}` : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        // asc -> desc
        updateParams({ sort: column, dir: 'desc' });
      } else {
        // desc -> cleared
        updateParams({ sort: 'none', dir: null });
      }
    } else {
      // New column, ascending
      updateParams({ sort: column, dir: null });
    }
  };

  const getStatusSortValue = (status: CardStatus | string): number => {
    switch (status) {
      case CardStatus.Active: return 1;
      case CardStatus.NoActiveVersion: return 2;
      case CardStatus.NoVersions: return 3;
      case CardStatus.Inactive: return 4;
      default: return 5;
    }
  };

  const formatLastUpdated = (dateString?: string): string => {
    if (!dateString) return '';
    // Parse as local date to avoid timezone shift
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return '';
    // Format without leading zeros on month [[memory:7251081]]
    return `${month}/${day}/${year}`;
  };

  const getStalenessInfo = (dateString?: string): { icon: React.ReactNode; color: string } | null => {
    if (!dateString) return null;
    // Parse as local date to avoid timezone shift
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 90) {
      // Red: more than 90 days
      return { icon: <AlertOctagon size={14} />, color: '#dc2626' };
    } else if (diffDays > 60) {
      // Yellow: more than 60 days
      return { icon: <AlertTriangle size={14} />, color: '#ca8a04' };
    } else if (diffDays > 30) {
      // Gray: more than 30 days
      return { icon: <Clock size={14} />, color: '#6b7280' };
    } else {
      // Green: less than 30 days
      return { icon: <CheckCircle2 size={14} />, color: '#16a34a' };
    }
  };

  const getLastUpdatedTier = (dateString?: string): Exclude<LastUpdatedTier, 'all'> | null => {
    if (!dateString) return null;
    // Parse as local date to avoid timezone shift
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) return 'gt90';
    if (diffDays > 60) return 'gt60';
    if (diffDays > 30) return 'gt30';
    return 'lt30';
  };

  // Get the effective last updated timestamp (max of lastUpdated and componentsLastUpdated)
  const getEffectiveLastUpdated = (card: CardWithStatus): string | undefined => {
    if (!card.lastUpdated && !card.componentsLastUpdated) return undefined;
    if (!card.lastUpdated) return card.componentsLastUpdated;
    if (!card.componentsLastUpdated) return card.lastUpdated;
    return new Date(card.lastUpdated) > new Date(card.componentsLastUpdated)
      ? card.lastUpdated
      : card.componentsLastUpdated;
  };

  // Compute staleness tier counts for all cards (not just filtered)
  const stalenessCounts = useMemo(() => {
    const counts = { lt30: 0, gt30: 0, gt60: 0, gt90: 0 };
    cards.forEach(card => {
      const effectiveDate = getEffectiveLastUpdated(card);
      if (card.status === CardStatus.Active && effectiveDate) {
        const tier = getLastUpdatedTier(effectiveDate);
        if (tier) {
          counts[tier]++;
        }
      }
    });
    return counts;
  }, [cards]);

  const filteredAndSortedCards = useMemo(() => {
    // First filter
    const filtered = cards.filter(card => {
      // Search filter (always searches by name, ID, and issuer)
      const matchesSearch = searchQuery === '' ||
        card.CardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.ReferenceCardId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.CardIssuer.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = (() => {
        if (statusFilter.length === 0) return true; // no filter applied
        const includeActive = statusFilter.includes(CardStatus.Active);
        const includeInactive = statusFilter.includes(CardStatus.Inactive);
        if (includeActive && card.status === CardStatus.Active) return true;
        if (includeInactive && (card.status === CardStatus.NoActiveVersion || card.status === CardStatus.NoVersions)) return true;
        return false;
      })();

      // Last updated filter
      const matchesLastUpdated = (() => {
        if (lastUpdatedFilter.length === 0) return true; // no filter applied
        // Only consider active versions with an effective last updated timestamp
        const effectiveDate = getEffectiveLastUpdated(card);
        if (card.status !== CardStatus.Active || !effectiveDate) return false;
        const tier = getLastUpdatedTier(effectiveDate);
        if (!tier) return false;
        return lastUpdatedFilter.includes(tier);
      })();

      // Characteristics filter
      const cardChars = card.CardCharacteristics || ['standard'];
      const matchesCharacteristics = characteristicsFilter.length === 0 ||
        characteristicsFilter.some(f => cardChars.includes(f));

      return matchesSearch && matchesStatus && matchesLastUpdated && matchesCharacteristics;
    });

    // If no sort is applied, keep the existing natural order
    if (!sortColumn) {
      return filtered;
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'CardName': {
          const aVal = displayMode === 'id'
            ? a.ReferenceCardId
            : displayMode === 'version'
              ? (a.ActiveVersionCardName || a.CardName)
              : a.CardName;
          const bVal = displayMode === 'id'
            ? b.ReferenceCardId
            : displayMode === 'version'
              ? (b.ActiveVersionCardName || b.CardName)
              : b.CardName;
          comparison = aVal.localeCompare(bVal);
          break;
        }
        case 'CardIssuer':
          comparison = a.CardIssuer.localeCompare(b.CardIssuer);
          break;
        case 'status':
          comparison = getStatusSortValue(a.status) - getStatusSortValue(b.status);
          break;
        case 'lastUpdated':
          // Cards without effective lastUpdated go to the end
          const aEffective = getEffectiveLastUpdated(a);
          const bEffective = getEffectiveLastUpdated(b);
          const aDate = aEffective ? new Date(aEffective).getTime() : 0;
          const bDate = bEffective ? new Date(bEffective).getTime() : 0;
          if (!aEffective && !bEffective) comparison = 0;
          else if (!aEffective) comparison = 1;
          else if (!bEffective) comparison = -1;
          else comparison = aDate - bDate;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [cards, searchQuery, statusFilter, lastUpdatedFilter, characteristicsFilter, sortColumn, sortDirection, displayMode]);

  const getStatusBadgeVariant = (status: CardStatus | string) => {
    switch (status) {
      case CardStatus.Active: return 'success';
      case CardStatus.Inactive: return 'default';
      case CardStatus.NoActiveVersion: return 'warning';
      case CardStatus.NoVersions: return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: CardStatus | string) => {
    switch (status) {
      case CardStatus.Active: return 'Active';
      case CardStatus.Inactive: return 'Inactive';
      case CardStatus.NoActiveVersion: return 'No Active Version';
      case CardStatus.NoVersions: return 'No Versions';
      default: return status;
    }
  };

  const getCharacteristicsBadges = (characteristics?: CardCharacteristics[]) => {
    const chars = characteristics || ['standard'];
    return chars.map(c => {
      switch (c) {
        case 'rotating':
          return <Badge key={c} variant="info">Rotating</Badge>;
        case 'selectable':
          return <Badge key={c} variant="warning">Selectable</Badge>;
        default:
          return <Badge key={c} variant="secondary">Standard</Badge>;
      }
    });
  };

  // Get the appropriate link for a card
  const getCardLink = (card: CardWithStatus): string => {
    // Always include ReferenceCardId, add version ID if available
    if (card.id) {
      return `/cards/${card.ReferenceCardId}/${card.id}`;
    }
    return `/cards/${card.ReferenceCardId}`;
  };

  const SortableHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <div 
      className={`sortable-header ${sortColumn === column ? 'active' : ''}`}
      onClick={() => handleSort(column)}
    >
      <span>{label}</span>
      <span className="sort-icon">
        {sortColumn === column
          ? (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
          : <ChevronsUpDown size={14} className="inactive" />}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="cards-list-page">
        <div className="loading">Resyncing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cards-list-page">
        <div className="error">
          <p>Error: {error}</p>
          <Button onClick={loadCards}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cards-list-page">
      <PageHeader
        title="Credit Cards"
        actions={
          <>
            <div className="staleness-summary">
              <div className="staleness-item" style={{ color: '#16a34a' }}>
                <CheckCircle2 size={14} />
                <span>{stalenessCounts.lt30}</span>
              </div>
              <div className="staleness-item" style={{ color: '#6b7280' }}>
                <Clock size={14} />
                <span>{stalenessCounts.gt30}</span>
              </div>
              <div className="staleness-item" style={{ color: '#ca8a04' }}>
                <AlertTriangle size={14} />
                <span>{stalenessCounts.gt60}</span>
              </div>
              <div className="staleness-item" style={{ color: '#dc2626' }}>
                <AlertOctagon size={14} />
                <span>{stalenessCounts.gt90}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncAll}
              disabled={syncing}
            >
              <RefreshCw size={16} className={syncing ? 'spinning' : ''} />
              {syncing ? 'Resyncing...' : 'Manual Resync'}
            </Button>
            <Button size="sm" onClick={() => setCreateCardModalOpen(true)}>
              <Plus size={16} />
              New Card
            </Button>
            <ProfilePopover />
          </>
        }
      />

      <div className="filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
        </div>

        <SingleSelectFilter
          label="Display"
          value={displayMode}
          onChange={(value) => updateParams({ display: value })}
          options={[
            { value: 'name' as DisplayMode, label: 'Card Name' },
            { value: 'id' as DisplayMode, label: 'Card ID' },
            { value: 'version' as DisplayMode, label: 'Version Card Name' },
          ]}
        />

        <MultiSelectFilter
          label="Status"
          selected={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: CardStatus.Active, label: 'Active only' },
            { value: CardStatus.Inactive, label: 'Inactive or no versions' }
          ]}
        />

        <MultiSelectFilter
          label="Last Updated"
          selected={lastUpdatedFilter}
          onChange={setLastUpdatedFilter}
          options={[
            { value: 'lt30', label: <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-600" /> &lt; 30 days</span> },
            { value: 'gt30', label: <span className="flex items-center gap-2"><Clock size={14} className="text-gray-500" /> 31-60 days</span> },
            { value: 'gt60', label: <span className="flex items-center gap-2"><AlertTriangle size={14} className="text-yellow-600" /> 61-90 days</span> },
            { value: 'gt90', label: <span className="flex items-center gap-2"><AlertOctagon size={14} className="text-red-600" /> &gt; 90 days</span> },
          ]}
        />

        <MultiSelectFilter
          label="Characteristics"
          selected={characteristicsFilter}
          onChange={setCharacteristicsFilter}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'rotating', label: 'Rotating' },
            { value: 'selectable', label: 'Selectable' },
          ]}
        />
      </div>

      <div className="cards-table">
        {filteredAndSortedCards.length === 0 ? (
          <div className="empty-state">
            <p>No cards found matching your filters</p>
          </div>
        ) : (
          <>
            <div className="table-header">
              <div className="col-image"></div>
              <div className="col-name">
                <SortableHeader column="CardName" label={displayMode === 'id' ? 'Card ID' : displayMode === 'version' ? 'Version Card Name' : 'Card Name'} />
              </div>
              <div className="col-issuer">
                <SortableHeader column="CardIssuer" label="Issuer" />
              </div>
              <div className="col-status">
                <SortableHeader column="status" label="Status" />
              </div>
              <div className="col-version">Active Version</div>
              <div className="col-characteristics">Characteristics</div>
              <div className="col-last-updated">
                <SortableHeader column="lastUpdated" label="Last Updated" />
              </div>
              <div className="col-versions">Versions</div>
            </div>
            <div className="table-body">
              {filteredAndSortedCards.map(card => (
                <Link
                  key={card.ReferenceCardId}
                  to={getCardLink(card)}
                  className="table-row"
                >
                  <div className="col-image">
                    {card.CardImage && (
                      <img
                        src={card.CardImage}
                        alt={card.CardName}
                        className="card-image"
                      />
                    )}
                  </div>
                  <div className="col-name">
                    <span
                      className="card-icon-mini"
                      style={{
                        background: card.CardPrimaryColor
                          ? `linear-gradient(135deg, ${card.CardPrimaryColor} 50%, ${card.CardSecondaryColor || card.CardPrimaryColor} 50%)`
                          : 'transparent',
                      }}
                    />
                    <span className="card-name-text">
                      {displayMode === 'id'
                        ? card.ReferenceCardId
                        : displayMode === 'version'
                          ? (card.ActiveVersionCardName || card.CardName)
                          : card.CardName}
                      {displayMode === 'version' && !card.ActiveVersionCardName && (
                        <AlertTriangle size={12} className="ml-1 inline text-yellow-500" title="No active version card name, showing card name instead" />
                      )}
                    </span>
                  </div>
                  <div className="col-issuer">{card.CardIssuer}</div>
                  <div className="col-status">
                    <Badge variant={getStatusBadgeVariant(card.status)}>
                      {getStatusLabel(card.status)}
                    </Badge>
                  </div>
                  <div className="col-version">
                    {card.ActiveVersionName || (
                      <span className="text-gray-400">None</span>
                    )}
                  </div>
                  <div className="col-characteristics">
                    {getCharacteristicsBadges(card.CardCharacteristics)}
                  </div>
                  <div className="col-last-updated">
                    {(() => {
                      const effectiveDate = getEffectiveLastUpdated(card);
                      if (card.status === CardStatus.Active && effectiveDate) {
                        const stalenessInfo = getStalenessInfo(effectiveDate);
                        return (
                          <>
                            {stalenessInfo && (
                              <span className="staleness-icon" style={{ color: stalenessInfo.color }}>
                                {stalenessInfo.icon}
                              </span>
                            )}
                            <span>{formatLastUpdated(effectiveDate)}</span>
                          </>
                        );
                      }
                      return <span className="text-gray-400"></span>;
                    })()}
                  </div>
                  <div className="col-versions">
                    {card.versionCount ?? 0}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="summary">
        <div className="summary-actions">
          {hasActiveFilters && (
            <span className="clear-link" onClick={clearFilters}>
              <X size={12} />
              Clear filters
            </span>
          )}
          {hasNonDefaultSort && (
            <span className="clear-link" onClick={clearSort}>
              <X size={12} />
              Clear sorting
            </span>
          )}
        </div>
        <span>Showing {filteredAndSortedCards.length} of {cards.length} cards</span>
      </div>

      <CreateCardModal
        open={createCardModalOpen}
        onOpenChange={setCreateCardModalOpen}
        onSuccess={(referenceCardId) => {
          loadCards();
          navigate(`/cards/${referenceCardId}`);
        }}
      />
    </div>
  );
}
