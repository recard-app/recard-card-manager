import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CardService } from '@/services/card.service';
import { ComponentService } from '@/services/component.service';
import type { CreditCardDetails, CardCredit, CardPerk, CardMultiplier } from '@/types';
import type { CreditCardName, VersionSummary } from '@/types/ui-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { ArrowLeft, Trash2, Plus, Pencil } from 'lucide-react';
import { VersionsSidebar } from '@/components/CardDetail/VersionsSidebar';
import { CardDetailsForm } from '@/components/CardDetail/CardDetailsForm';
import { ComponentsSidebar } from '@/components/CardDetail/ComponentsSidebar';
import { CardComponents } from '@/components/CardDetail/CardComponents';
import { CreditModal } from '@/components/Modals/CreditModal';
import { PerkModal } from '@/components/Modals/PerkModal';
import { MultiplierModal } from '@/components/Modals/MultiplierModal';
import { CreateVersionModal } from '@/components/Modals/CreateVersionModal';
import { EditCardNameModal } from '@/components/Modals/EditCardNameModal';
import './CardDetailPage.scss';

export function CardDetailPage() {
  // URL params: referenceCardId is required, versionId is optional
  const { referenceCardId: urlReferenceCardId, versionId: urlVersionId } = useParams<{ 
    referenceCardId: string; 
    versionId?: string;
  }>();
  const navigate = useNavigate();

  // Card name data (from credit_cards_names collection)
  const [cardName, setCardName] = useState<CreditCardName | null>(null);
  // Current version data (from credit_cards_history collection)
  const [card, setCard] = useState<CreditCardDetails | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  // ReferenceCardId - the key identifier for this card
  const [referenceCardId, setReferenceCardId] = useState<string | null>(null);

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
  const [showDeleteCardConfirm, setShowDeleteCardConfirm] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);
  const [editCardNameModalOpen, setEditCardNameModalOpen] = useState(false);

  // Track if we're on initial load
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (urlReferenceCardId && isInitialLoad.current) {
      loadInitialData(urlReferenceCardId, urlVersionId);
      isInitialLoad.current = false;
    }
  }, [urlReferenceCardId, urlVersionId]);

  useEffect(() => {
    if (referenceCardId) {
      loadVersions(referenceCardId);
    }
  }, [referenceCardId]);

  useEffect(() => {
    // Load components using referenceCardId (works with or without versions)
    if (referenceCardId) {
      loadComponents(referenceCardId);
    } else {
      // Clear components if no referenceCardId
      setCredits([]);
      setPerks([]);
      setMultipliers([]);
    }
  }, [referenceCardId]);

  /**
   * Load initial data using URL params
   */
  const loadInitialData = async (refCardId: string, versionId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load the card name data
      const cardNameData = await CardService.getCardName(refCardId);
      if (!cardNameData) {
        setError('Card not found');
        return;
      }

      setCardName(cardNameData);
      setReferenceCardId(refCardId);

      // If a version ID is provided, load that specific version
      if (versionId) {
        const versionData = await CardService.getCardById(versionId);
        if (versionData) {
          setCard(versionData);
          setSelectedVersionId(versionId);
        } else {
          // Version not found, clear version state
          setCard(null);
          setSelectedVersionId(null);
        }
      } else {
        // No version specified, clear version state (versions will be loaded by useEffect)
        setCard(null);
        setSelectedVersionId(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load card');
      console.error('Error loading card:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (refCardId: string) => {
    try {
      const versionsData = await CardService.getVersionsByReferenceCardId(refCardId);
      setVersions(versionsData);
      
      // If we don't have a selected version but there are versions, select the first one
      if (!selectedVersionId && versionsData.length > 0) {
        const firstVersion = versionsData[0];
        await handleVersionSelect(firstVersion.id);
      }
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

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      return b.EffectiveTo.localeCompare(a.EffectiveTo);
    });
  };

  const loadComponents = async (refCardId: string) => {
    try {
      // Load components by ReferenceCardId (the backend accepts both version ID and ReferenceCardId)
      const [creditsData, perksData, multipliersData] = await Promise.all([
        ComponentService.getCreditsByCardId(refCardId),
        ComponentService.getPerksByCardId(refCardId),
        ComponentService.getMultipliersByCardId(refCardId),
      ]);

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

      const data = await CardService.getCardById(versionId);

      if (!data) {
        setError('Version not found');
        return;
      }

      setCard(data);
      setSelectedVersionId(versionId);

      // Update URL to reflect the selected version
      navigate(`/cards/${referenceCardId}/${versionId}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to load version');
      console.error('Error loading version:', err);
    } finally {
      setContentLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    setCreateVersionModalOpen(true);
  };

  const handleVersionCreated = async (newVersionId: string) => {
    if (referenceCardId) {
      await loadVersions(referenceCardId);
      // Select the new version
      await handleVersionSelect(newVersionId);
    }
  };

  const handleActivateVersion = async (versionId: string) => {
    if (!referenceCardId) return;

    try {
      await CardService.activateVersion(referenceCardId, versionId, {
        deactivateOthers: true,
      });
      await loadVersions(referenceCardId);
      if (versionId === selectedVersionId) {
        const data = await CardService.getCardById(versionId);
        if (data) setCard(data);
      }
    } catch (err: any) {
      console.error('Error activating version:', err);
      toast.error('Failed to activate version: ' + err.message);
    }
  };

  const handleDeactivateVersion = async (versionId: string) => {
    if (!referenceCardId) return;

    try {
      await CardService.deactivateVersion(referenceCardId, versionId);
      await loadVersions(referenceCardId);
      if (versionId === selectedVersionId) {
        const data = await CardService.getCardById(versionId);
        if (data) setCard(data);
      }
    } catch (err: any) {
      console.error('Error deactivating version:', err);
      toast.error('Failed to deactivate version: ' + err.message);
    }
  };

  const handleVersionDeleted = async () => {
    if (!referenceCardId) return;

    // Reload versions
    const updatedVersions = await CardService.getVersionsByReferenceCardId(referenceCardId);
    setVersions(updatedVersions);

    if (updatedVersions.length > 0) {
      // Select the first available version
      const nextVersion = updatedVersions[0];
      await handleVersionSelect(nextVersion.id);
      toast.success('Version deleted successfully');
    } else {
      // No more versions - show empty state
      setCard(null);
      setSelectedVersionId(null);
      setCredits([]);
      setPerks([]);
      setMultipliers([]);
      // Update URL to use ReferenceCardId
      navigate(`/cards/${referenceCardId}`, { replace: true });
      toast.success('Version deleted successfully');
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

      if (referenceCardId) {
        await loadComponents(referenceCardId);
      }
    } catch (err: any) {
      console.error('Error deleting component:', err);
      toast.error('Failed to delete component: ' + err.message);
    }
  };

  const handleDeleteEntireCard = async () => {
    if (!referenceCardId) return;

    setDeletingCard(true);
    try {
      await CardService.deleteEntireCard(referenceCardId);
      toast.success('Card deleted successfully');
      setShowDeleteCardConfirm(false);
      navigate('/cards');
    } catch (err: any) {
      console.error('Error deleting card:', err);
      toast.error('Failed to delete card: ' + (err?.message || 'Unknown error'));
    } finally {
      setDeletingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="card-detail-page">
        <div className="loading">Loading card details...</div>
      </div>
    );
  }

  if (error || !cardName) {
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
  const hasVersions = versions.length > 0;

  // Get display name and issuer from cardName (primary source) or fall back to version data
  const displayName = cardName.CardName;
  const displayIssuer = cardName.CardIssuer;

  return (
    <div className="card-detail-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <Button variant="ghost" size="sm" onClick={() => navigate('/cards')}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <div className="title-row">
              <h1>{displayName}</h1>
              <span className="card-issuer">• {displayIssuer}</span>
              {hasVersions ? (
                <Badge variant={isActiveVersion ? 'success' : 'default'}>
                  {isActiveVersion ? 'Active' : 'Inactive'}
                </Badge>
              ) : (
                <Badge variant="warning">No Versions</Badge>
              )}
            </div>
          </div>
          <div className="header-actions">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditCardNameModalOpen(true)}
            >
              <Pencil size={14} />
              Edit Card
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteCardConfirm(true)}
              className="delete-card-button"
            >
              <Trash2 size={14} />
              Delete Card
            </Button>
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
          
          {hasVersions && card ? (
            <>
              <CardDetailsForm
                cardId={selectedVersionId!}
                card={card}
                onSaved={async () => {
                  if (selectedVersionId) {
                    const data = await CardService.getCardById(selectedVersionId);
                    if (data) setCard(data);
                  }
                  if (referenceCardId) {
                    await loadVersions(referenceCardId);
                    await loadComponents(referenceCardId);
                  }
                }}
                onDeleted={handleVersionDeleted}
              />
              <CardComponents
                card={card}
                credits={credits}
                perks={perks}
                multipliers={multipliers}
              />
            </>
          ) : (
            <Card className="no-versions-card">
              <div className="no-versions-content">
                <h2>No Versions</h2>
                <p>This card doesn't have any versions yet. Create a version to add card details, fees, and rewards information.</p>
                <Button onClick={handleCreateVersion}>
                  <Plus size={16} />
                  Create First Version
                </Button>
              </div>
            </Card>
          )}
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

      <CreditModal
        open={creditModalOpen}
        onOpenChange={setCreditModalOpen}
        referenceCardId={referenceCardId || ''}
        credit={editingCredit}
        onSuccess={() => referenceCardId && loadComponents(referenceCardId)}
      />
      <PerkModal
        open={perkModalOpen}
        onOpenChange={setPerkModalOpen}
        referenceCardId={referenceCardId || ''}
        perk={editingPerk}
        onSuccess={() => referenceCardId && loadComponents(referenceCardId)}
      />
      <MultiplierModal
        open={multiplierModalOpen}
        onOpenChange={setMultiplierModalOpen}
        referenceCardId={referenceCardId || ''}
        multiplier={editingMultiplier}
        onSuccess={() => referenceCardId && loadComponents(referenceCardId)}
      />

      <CreateVersionModal
        open={createVersionModalOpen}
        onOpenChange={setCreateVersionModalOpen}
        referenceCardId={referenceCardId || ''}
        currentCard={card}
        onSuccess={handleVersionCreated}
      />

      {/* Delete Card Confirmation Dialog */}
      <Dialog
        open={showDeleteCardConfirm}
        onOpenChange={setShowDeleteCardConfirm}
        title="Delete Entire Card"
        description="This action cannot be undone"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>
            Are you sure you want to delete <strong>{displayName}</strong>?
          </p>
          <p style={{ color: 'var(--error-red)', fontWeight: 600, margin: 0 }}>
            {versions.length > 0 
              ? `This will permanently delete ALL ${versions.length} version${versions.length !== 1 ? 's' : ''} and ALL associated credits, perks, and multipliers.`
              : 'This will permanently delete this card.'}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteCardConfirm(false)}
            disabled={deletingCard}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteEntireCard}
            disabled={deletingCard}
            className="delete-confirm-button"
          >
            {deletingCard ? 'Deleting...' : 'Delete Card'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Card Name Modal */}
      {cardName && (
        <EditCardNameModal
          open={editCardNameModalOpen}
          onOpenChange={setEditCardNameModalOpen}
          cardName={cardName}
          onSuccess={(updatedCardName) => setCardName(updatedCardName)}
        />
      )}
    </div>
  );
}
