import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardService } from '@/services/card.service';
import { CardWithStatus } from '@/types/ui-types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search } from 'lucide-react';
import { formatDate } from '@/utils/date-utils';
import './CardsListPage.scss';

export function CardsListPage() {
  const [cards, setCards] = useState<CardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      (statusFilter === 'inactive' && card.status === 'no_active_version');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'no_active_version': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'no_active_version': return 'No Active Version';
      default: return status;
    }
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
        <Button>
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
          <option value="inactive">No Active Version</option>
        </select>
      </div>

      <div className="cards-list">
        {filteredCards.length === 0 ? (
          <div className="empty-state">
            <p>No cards found matching your filters</p>
          </div>
        ) : (
          filteredCards.map(card => (
            <Link
              key={card.id}
              to={`/cards/${card.ReferenceCardId}`}
              className="card-link"
            >
              <Card className="card-item">
                <div className="card-content">
                  <div className="card-left">
                    {card.CardImage && (
                      <img
                        src={card.CardImage}
                        alt={card.CardName}
                        className="card-image"
                      />
                    )}
                    <div className="card-info">
                      <div className="card-title-row">
                        <h3 className="card-name">{card.CardName}</h3>
                        <Badge variant={getStatusBadgeVariant(card.status)}>
                          {getStatusLabel(card.status)}
                        </Badge>
                      </div>
                      <p className="card-issuer">{card.CardIssuer}</p>
                    </div>
                  </div>

                  <div className="card-right">
                    <div className="card-meta">
                      <div>Version: {card.VersionName}</div>
                      <div>Updated: {formatDate(card.lastUpdated)}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>

      <div className="summary">
        Showing {filteredCards.length} of {cards.length} cards
      </div>
    </div>
  );
}
