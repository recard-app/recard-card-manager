import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CardService } from '@/services/card.service';
import { ComponentService } from '@/services/component.service';
import { CreditCardDetails, CardCredit, CardPerk, CardMultiplier } from '@/types';
import { VersionSummary } from '@/types/ui-types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Plus } from 'lucide-react';
import { VersionsSidebar } from '@/components/CardDetail/VersionsSidebar';
import { ComponentTabs } from '@/components/CardDetail/ComponentTabs';
import { CreditModal } from '@/components/Modals/CreditModal';
import { PerkModal } from '@/components/Modals/PerkModal';
import { MultiplierModal } from '@/components/Modals/MultiplierModal';
import { CreateVersionModal } from '@/components/Modals/CreateVersionModal';
import './CardDetailPage.scss';

export function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  const [card, setCard] = useState<CreditCardDetails | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const [credits, setCredits] = useState<CardCredit[]>([]);
  const [perks, setPerks] = useState<CardPerk[]>([]);
  const [multipliers, setMultipliers] = useState<CardMultiplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'credits' | 'perks' | 'multipliers'>('credits');

  // Modal state
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [perkModalOpen, setPerkModalOpen] = useState(false);
  const [multiplierModalOpen, setMultiplierModalOpen] = useState(false);
  const [createVersionModalOpen, setCreateVersionModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<CardCredit | null>(null);
  const [editingPerk, setEditingPerk] = useState<CardPerk | null>(null);
  const [editingMultiplier, setEditingMultiplier] = useState<CardMultiplier | null>(null);

  useEffect(() => {
    if (cardId) {
      loadCardData(cardId);
    }
  }, [cardId]);

  useEffect(() => {
    if (card?.ReferenceCardId) {
      loadVersions(card.ReferenceCardId);
    }
  }, [card?.ReferenceCardId]);

  useEffect(() => {
    if (selectedVersionId) {
      loadComponents(selectedVersionId);
    }
  }, [selectedVersionId]);

  const loadCardData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await CardService.getCardById(id);

      if (!data) {
        setError('Card not found');
        return;
      }

      setCard(data);
      setSelectedVersionId(id);
    } catch (err: any) {
      setError(err.message || 'Failed to load card');
      console.error('Error loading card:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (referenceCardId: string) => {
    try {
      const versionsData = await CardService.getVersionsByReferenceCardId(referenceCardId);
      setVersions(versionsData);
    } catch (err: any) {
      console.error('Error loading versions:', err);
    }
  };

  const loadComponents = async (versionId: string) => {
    try {
      const [creditsData, perksData, multipliersData] = await Promise.all([
        ComponentService.getCreditsByCardId(versionId),
        ComponentService.getPerksByCardId(versionId),
        ComponentService.getMultipliersByCardId(versionId),
      ]);

      setCredits(creditsData);
      setPerks(perksData);
      setMultipliers(multipliersData);
    } catch (err: any) {
      console.error('Error loading components:', err);
    }
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
    navigate(`/cards/${versionId}`, { replace: true });
  };

  const handleCreateVersion = async () => {
    setCreateVersionModalOpen(true);
  };

  const handleActivateVersion = async (versionId: string) => {
    if (!card?.ReferenceCardId) return;

    try {
      await CardService.activateVersion(card.ReferenceCardId, versionId, {
        deactivateOthers: true,
      });
      await loadVersions(card.ReferenceCardId);
    } catch (err: any) {
      console.error('Error activating version:', err);
      alert('Failed to activate version: ' + err.message);
    }
  };

  const handleDeactivateVersion = async () => {
    if (!card?.ReferenceCardId) return;

    try {
      await CardService.deactivateVersion(card.ReferenceCardId, {
        effectiveTo: new Date().toISOString().split('T')[0],
      });
      await loadVersions(card.ReferenceCardId);
    } catch (err: any) {
      console.error('Error deactivating version:', err);
      alert('Failed to deactivate version: ' + err.message);
    }
  };

  const handleAddComponent = (type: 'credits' | 'perks' | 'multipliers') => {
    switch (type) {
      case 'credits':
        setEditingCredit(null);
        setCreditModalOpen(true);
        break;
      case 'perks':
        setEditingPerk(null);
        setPerkModalOpen(true);
        break;
      case 'multipliers':
        setEditingMultiplier(null);
        setMultiplierModalOpen(true);
        break;
    }
  };

  const handleEditComponent = (type: 'credits' | 'perks' | 'multipliers', id: string) => {
    switch (type) {
      case 'credits':
        const credit = credits.find(c => c.id === id);
        if (credit) {
          setEditingCredit(credit);
          setCreditModalOpen(true);
        }
        break;
      case 'perks':
        const perk = perks.find(p => p.id === id);
        if (perk) {
          setEditingPerk(perk);
          setPerkModalOpen(true);
        }
        break;
      case 'multipliers':
        const multiplier = multipliers.find(m => m.id === id);
        if (multiplier) {
          setEditingMultiplier(multiplier);
          setMultiplierModalOpen(true);
        }
        break;
    }
  };

  const handleDeleteComponent = async (type: 'credits' | 'perks' | 'multipliers', id: string) => {
    if (!confirm('Are you sure you want to delete this component?')) {
      return;
    }

    try {
      switch (type) {
        case 'credits':
          await ComponentService.deleteCredit(id);
          break;
        case 'perks':
          await ComponentService.deletePerk(id);
          break;
        case 'multipliers':
          await ComponentService.deleteMultiplier(id);
          break;
      }

      if (selectedVersionId) {
        await loadComponents(selectedVersionId);
      }
    } catch (err: any) {
      console.error('Error deleting component:', err);
      alert('Failed to delete component: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="card-detail-page">
        <div className="loading">Loading card details...</div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="card-detail-page">
        <div className="error">
          <p>Error: {error || 'Card not found'}</p>
          <Button onClick={() => navigate('/cards')}>Back to Cards</Button>
        </div>
      </div>
    );
  }

  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const isActiveVersion = selectedVersion?.isActive || false;

  return (
    <div className="card-detail-page">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cards')}>
          <ArrowLeft size={16} />
          Back to Cards
        </Button>
        <div className="header-content">
          <div className="title-row">
            <h1>{card.CardName}</h1>
            <Badge variant={isActiveVersion ? 'success' : 'default'}>
              {isActiveVersion ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="card-issuer">{card.CardIssuer}</p>
        </div>
      </div>

      <div className="detail-layout">
        <VersionsSidebar
          versions={versions}
          selectedVersionId={selectedVersionId}
          onVersionSelect={handleVersionSelect}
          onCreateVersion={handleCreateVersion}
          onActivateVersion={handleActivateVersion}
          onDeactivateVersion={handleDeactivateVersion}
        />

        <div className="main-content">
          <Card>
            <div className="content-header">
              <h2>Version: {card.VersionName}</h2>
              <Button onClick={() => handleAddComponent(activeTab)}>
                <Plus size={16} />
                Add {activeTab === 'credits' ? 'Credit' : activeTab === 'perks' ? 'Perk' : 'Multiplier'}
              </Button>
            </div>

            <ComponentTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              credits={credits}
              perks={perks}
              multipliers={multipliers}
              onEdit={handleEditComponent}
              onDelete={handleDeleteComponent}
            />
          </Card>
        </div>
      </div>

      {selectedVersionId && (
        <>
          <CreditModal
            open={creditModalOpen}
            onOpenChange={setCreditModalOpen}
            cardId={selectedVersionId}
            credit={editingCredit}
            onSuccess={() => loadComponents(selectedVersionId)}
          />
          <PerkModal
            open={perkModalOpen}
            onOpenChange={setPerkModalOpen}
            cardId={selectedVersionId}
            perk={editingPerk}
            onSuccess={() => loadComponents(selectedVersionId)}
          />
          <MultiplierModal
            open={multiplierModalOpen}
            onOpenChange={setMultiplierModalOpen}
            cardId={selectedVersionId}
            multiplier={editingMultiplier}
            onSuccess={() => loadComponents(selectedVersionId)}
          />
        </>
      )}

      {card?.ReferenceCardId && (
        <CreateVersionModal
          open={createVersionModalOpen}
          onOpenChange={setCreateVersionModalOpen}
          referenceCardId={card.ReferenceCardId}
          currentCard={card}
          onSuccess={() => {
            if (card.ReferenceCardId) {
              loadVersions(card.ReferenceCardId);
            }
          }}
        />
      )}
    </div>
  );
}
