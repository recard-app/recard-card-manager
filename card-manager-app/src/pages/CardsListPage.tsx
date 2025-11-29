import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CardService } from '@/services/card.service';
import type { CardWithStatus } from '@/types/ui-types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search } from 'lucide-react';
import { CreateCardModal } from '@/components/Modals/CreateCardModal';
import './CardsListPage.scss';

export function CardsListPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

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

  const filteredCards = cards.filter(card => {
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

  if (loading) {
    return (
      <div className="cards-list-page">
        <div className="loading">Loading cards...</div>
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
        <Button size="sm" onClick={() => setCreateCardModalOpen(true)}>
          <Plus size={16} />
          New Card
        </Button>
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
        {filteredCards.length === 0 ? (
          <div className="empty-state">
            <p>No cards found matching your filters</p>
          </div>
        ) : (
          <>
            <div className="table-header">
              <div className="col-image"></div>
              <div className="col-name">Card Name</div>
              <div className="col-issuer">Issuer</div>
              <div className="col-status">Status</div>
              <div className="col-version">Active Version</div>
              <div className="col-versions">Versions</div>
            </div>
            <div className="table-body">
              {filteredCards.map(card => (
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
        Showing {filteredCards.length} of {cards.length} cards
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
