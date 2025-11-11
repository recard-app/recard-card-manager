import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CardService } from '@/services/card.service';
import { ComponentService } from '@/services/component.service';
import type { CreditCardDetails, CardCredit, CardPerk, CardMultiplier } from '@/types';
import type { VersionSummary } from '@/types/ui-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft } from 'lucide-react';
import { VersionsSidebar } from '@/components/CardDetail/VersionsSidebar';
import { CardDetailsForm } from '@/components/CardDetail/CardDetailsForm';
import { ComponentsSidebar } from '@/components/CardDetail/ComponentsSidebar';
import { CardComponents } from '@/components/CardDetail/CardComponents';
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
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'credits' | 'perks' | 'multipliers'>('credits');

  // Sidebar collapse state
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  // Modal state
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [perkModalOpen, setPerkModalOpen] = useState(false);
  const [multiplierModalOpen, setMultiplierModalOpen] = useState(false);
  const [createVersionModalOpen, setCreateVersionModalOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<CardCredit | null>(null);
  const [editingPerk, setEditingPerk] = useState<CardPerk | null>(null);
  const [editingMultiplier, setEditingMultiplier] = useState<CardMultiplier | null>(null);

  // Track if we're on initial load (to avoid re-triggering full page load on URL changes)
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (cardId && isInitialLoad.current) {
      loadCardData(cardId);
      isInitialLoad.current = false;
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

  const sortComponents = <T extends { EffectiveFrom: string; EffectiveTo: string }>(components: T[]): T[] => {
    const today = new Date().toISOString().split('T')[0];
    const ONGOING = '9999-12-31';

    return components.sort((a, b) => {
      const aIsActive = a.EffectiveFrom <= today && (a.EffectiveTo === ONGOING || a.EffectiveTo >= today);
      const bIsActive = b.EffectiveFrom <= today && (b.EffectiveTo === ONGOING || b.EffectiveTo >= today);

      // Active items first
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Then sort by EffectiveTo (most recent first)
      return b.EffectiveTo.localeCompare(a.EffectiveTo);
    });
  };

  const loadComponents = async (versionId: string) => {
    try {
      const [creditsData, perksData, multipliersData] = await Promise.all([
        ComponentService.getCreditsByCardId(versionId),
        ComponentService.getPerksByCardId(versionId),
        ComponentService.getMultipliersByCardId(versionId),
      ]);

      // Sort components with active first, then by most recent EffectiveTo
      setCredits(sortComponents(creditsData));
      setPerks(sortComponents(perksData));
      setMultipliers(sortComponents(multipliersData));
    } catch (err: any) {
      console.error('Error loading components:', err);
    }
  };

  const handleVersionSelect = async (versionId: string) => {
    try {
      setContentLoading(true);
      setError(null);

      // Load the new version data
      const data = await CardService.getCardById(versionId);

      if (!data) {
        setError('Card not found');
        return;
      }

      setCard(data);
      setSelectedVersionId(versionId);

      // Update URL without triggering navigation/reload
      navigate(`/cards/${versionId}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to load card');
      console.error('Error loading card:', err);
    } finally {
      setContentLoading(false);
    }
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
      await loadCardData(versionId); // Reload the card to update IsActive status
    } catch (err: any) {
      console.error('Error activating version:', err);
      toast.error('Failed to activate version: ' + err.message);
    }
  };

  const handleDeactivateVersion = async (versionId: string) => {
    if (!card?.ReferenceCardId) return;

    try {
      await CardService.deactivateVersion(card.ReferenceCardId, versionId);
      await loadVersions(card.ReferenceCardId);
      await loadCardData(versionId); // Reload the card to update IsActive status
    } catch (err: any) {
      console.error('Error deactivating version:', err);
      toast.error('Failed to deactivate version: ' + err.message);
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
    // Using window.confirm for now - can be replaced with Alert Dialog if needed
    if (!window.confirm('Are you sure you want to delete this component?')) {
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
      toast.error('Failed to delete component: ' + err.message);
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
  const isActiveVersion = selectedVersion?.IsActive || false;

  return (
    <div className="card-detail-page">
      <div className="page-header">
        <div className="header-content">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cards')}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <div className="title-row">
            <h1>{card.CardName}</h1>
            <span className="card-issuer">• {card.CardIssuer}</span>
            <Badge variant={isActiveVersion ? 'success' : 'default'}>
              {isActiveVersion ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <VersionsSidebar
          collapsed={leftSidebarCollapsed}
          onToggleCollapse={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
          versions={versions}
          selectedVersionId={selectedVersionId}
          onVersionSelect={handleVersionSelect}
          onCreateVersion={handleCreateVersion}
          onActivateVersion={handleActivateVersion}
          onDeactivateVersion={handleDeactivateVersion}
        />

        <div className="main-content">
          {contentLoading && (
            <div className="content-loading-overlay">
              Loading...
            </div>
          )}
          <CardDetailsForm
            cardId={selectedVersionId || cardId!}
            card={card}
            onSaved={async () => {
              await loadCardData(selectedVersionId || cardId!);
              if (card.ReferenceCardId) {
                await loadVersions(card.ReferenceCardId);
              }
              if (selectedVersionId) {
                await loadComponents(selectedVersionId);
              }
            }}
            onDeleted={async () => {
              // After deleting a version, navigate back to cards list
              navigate('/cards');
            }}
          />
          <CardComponents
            card={card}
            credits={credits}
            perks={perks}
            multipliers={multipliers}
          />
        </div>

        <ComponentsSidebar
          collapsed={rightSidebarCollapsed}
          onToggleCollapse={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          credits={credits}
          perks={perks}
          multipliers={multipliers}
          onEdit={handleEditComponent}
          onDelete={handleDeleteComponent}
          onAdd={handleAddComponent}
        />
      </div>

      {selectedVersionId && (
        <>
          <CreditModal
            open={creditModalOpen}
            onOpenChange={setCreditModalOpen}
            referenceCardId={card.ReferenceCardId}
            credit={editingCredit}
            onSuccess={() => loadComponents(selectedVersionId)}
          />
          <PerkModal
            open={perkModalOpen}
            onOpenChange={setPerkModalOpen}
            referenceCardId={card.ReferenceCardId}
            perk={editingPerk}
            onSuccess={() => loadComponents(selectedVersionId)}
          />
          <MultiplierModal
            open={multiplierModalOpen}
            onOpenChange={setMultiplierModalOpen}
            referenceCardId={card.ReferenceCardId}
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
