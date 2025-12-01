import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CardService } from '@/services/card.service';
import type { CardWithStatus } from '@/types/ui-types';
import { CardStatus } from '@/types/ui-types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Plus, Search, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle2, Clock, AlertTriangle, AlertOctagon, Check, Filter, UserCircle, LogOut } from 'lucide-react';
import { CreateCardModal } from '@/components/Modals/CreateCardModal';
import { useAuth } from '@/contexts/AuthContext';
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

export function CardsListPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [lastUpdatedFilter, setLastUpdatedFilter] = useState<Exclude<LastUpdatedTier, 'all'>[]>([]);
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('CardName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileContentRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle: asc -> desc -> cleared
      setSortDirection(prev => {
        if (prev === 'asc') return 'desc';
        // Was desc: clear sort
        setSortColumn(null);
        return 'asc';
      });
    } else {
      // Set new column with ascending as default
      setSortColumn(column);
      setSortDirection('asc');
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
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    // Format without leading zeros on month [[memory:7251081]]
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getStalenessInfo = (dateString?: string): { icon: React.ReactNode; color: string } | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
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
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) return 'gt90';
    if (diffDays > 60) return 'gt60';
    if (diffDays > 30) return 'gt30';
    return 'lt30';
  };

  // Compute staleness tier counts for all cards (not just filtered)
  const stalenessCounts = useMemo(() => {
    const counts = { lt30: 0, gt30: 0, gt60: 0, gt90: 0 };
    cards.forEach(card => {
      if (card.status === CardStatus.Active && card.lastUpdated) {
        const tier = getLastUpdatedTier(card.lastUpdated);
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
      // Search filter
      const matchesSearch = searchQuery === '' ||
        card.CardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        // Only consider active versions with a lastUpdated timestamp
        if (card.status !== CardStatus.Active || !card.lastUpdated) return false;
        const tier = getLastUpdatedTier(card.lastUpdated);
        if (!tier) return false;
        return lastUpdatedFilter.includes(tier);
      })();

      return matchesSearch && matchesStatus && matchesLastUpdated;
    });

    // If no sort is applied, keep the existing natural order
    if (!sortColumn) {
      return filtered;
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'CardName':
          comparison = a.CardName.localeCompare(b.CardName);
          break;
        case 'CardIssuer':
          comparison = a.CardIssuer.localeCompare(b.CardIssuer);
          break;
        case 'status':
          comparison = getStatusSortValue(a.status) - getStatusSortValue(b.status);
          break;
        case 'lastUpdated':
          // Cards without lastUpdated go to the end
          const aDate = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const bDate = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          if (!a.lastUpdated && !b.lastUpdated) comparison = 0;
          else if (!a.lastUpdated) comparison = 1;
          else if (!b.lastUpdated) comparison = -1;
          else comparison = aDate - bDate;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [cards, searchQuery, statusFilter, lastUpdatedFilter, sortColumn, sortDirection]);

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
      <div className="page-header">
        <div className="header-left">
          <h1>Credit Cards</h1>
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
        </div>
        <div className="header-actions">
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
                <UserCircle size={28} />
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
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

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
                <SortableHeader column="CardName" label="Card Name" />
              </div>
              <div className="col-issuer">
                <SortableHeader column="CardIssuer" label="Issuer" />
              </div>
              <div className="col-status">
                <SortableHeader column="status" label="Status" />
              </div>
              <div className="col-version">Active Version</div>
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
                  <div className="col-name">{card.CardName}</div>
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
                  <div className="col-last-updated">
                    {card.status === CardStatus.Active && card.lastUpdated ? (
                      <>
                        {(() => {
                          const stalenessInfo = getStalenessInfo(card.lastUpdated);
                          return stalenessInfo ? (
                            <span className="staleness-icon" style={{ color: stalenessInfo.color }}>
                              {stalenessInfo.icon}
                            </span>
                          ) : null;
                        })()}
                        <span>{formatLastUpdated(card.lastUpdated)}</span>
                      </>
                    ) : (
                      <span className="text-gray-400"></span>
                    )}
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
        Showing {filteredAndSortedCards.length} of {cards.length} cards
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
