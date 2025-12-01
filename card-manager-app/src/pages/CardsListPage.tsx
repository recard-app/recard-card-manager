import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CardService } from '@/services/card.service';
import type { CardWithStatus } from '@/types/ui-types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { CreateCardModal } from '@/components/Modals/CreateCardModal';
import './CardsListPage.scss';

type SortColumn = 'CardName' | 'CardIssuer' | 'status' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

export function CardsListPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('CardName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

  const getStatusSortValue = (status: string): number => {
    switch (status) {
      case 'active': return 1;
      case 'no_active_version': return 2;
      case 'no_versions': return 3;
      case 'inactive': return 4;
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

  const filteredAndSortedCards = useMemo(() => {
    // First filter
    const filtered = cards.filter(card => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        card.CardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.CardIssuer.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && card.status === 'active') ||
        (statusFilter === 'inactive' && (card.status === 'no_active_version' || card.status === 'no_versions'));

      return matchesSearch && matchesStatus;
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
  }, [cards, searchQuery, statusFilter, sortColumn, sortDirection]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'no_active_version': return 'warning';
      case 'no_versions': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'no_active_version': return 'No Active Version';
      case 'no_versions': return 'No Versions';
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
        <h1>Credit Cards</h1>
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Cards</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive / No Versions</option>
        </select>
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
                    {card.status === 'active' && card.lastUpdated ? (
                      formatLastUpdated(card.lastUpdated)
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
