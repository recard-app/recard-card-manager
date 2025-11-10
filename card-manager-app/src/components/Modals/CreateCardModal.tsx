import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { CreditCardDetails } from '@/types';
import { CardService } from '@/services/card.service';
import { normalizeEffectiveTo } from '@/types';
import './CreateCardModal.scss';

interface CreateCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (cardId: string) => void;
}

export function CreateCardModal({ open, onOpenChange, onSuccess }: CreateCardModalProps) {
  const [formData, setFormData] = useState({
    ReferenceCardId: '',
    CardName: '',
    CardIssuer: '',
    CardNetwork: '',
    CardDetails: '',
    CardImage: '',
    AnnualFee: '',
    ForeignExchangeFee: '',
    ForeignExchangeFeePercentage: '',
    RewardsCurrency: '',
    PointsPerDollar: '',
    VersionName: 'V1',
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        ReferenceCardId: '',
        CardName: '',
        CardIssuer: '',
        CardNetwork: '',
        CardDetails: '',
        CardImage: '',
        AnnualFee: '',
        ForeignExchangeFee: '',
        ForeignExchangeFeePercentage: '',
        RewardsCurrency: '',
        PointsPerDollar: '',
        VersionName: 'V1',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
      });
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ReferenceCardId.trim()) {
      newErrors.ReferenceCardId = 'Reference Card ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.ReferenceCardId)) {
      newErrors.ReferenceCardId = 'Card ID can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.CardName.trim()) {
      newErrors.CardName = 'Card name is required';
    }

    if (!formData.CardIssuer.trim()) {
      newErrors.CardIssuer = 'Card issuer is required';
    }

    if (!formData.CardNetwork.trim()) {
      newErrors.CardNetwork = 'Card network is required';
    }

    if (!formData.VersionName.trim()) {
      newErrors.VersionName = 'Version name is required';
    }

    if (!formData.EffectiveFrom) {
      newErrors.EffectiveFrom = 'Effective from date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const cardData: Omit<CreditCardDetails, 'id' | 'lastUpdated'> = {
        ReferenceCardId: formData.ReferenceCardId.trim(),
        CardName: formData.CardName.trim(),
        CardIssuer: formData.CardIssuer.trim(),
        CardNetwork: formData.CardNetwork.trim(),
        CardDetails: formData.CardDetails.trim(),
        CardImage: formData.CardImage.trim() || undefined,
        CardPrimaryColor: undefined,
        CardSecondaryColor: undefined,
        AnnualFee: formData.AnnualFee ? parseFloat(formData.AnnualFee) : null,
        ForeignExchangeFee: formData.ForeignExchangeFee.trim(),
        ForeignExchangeFeePercentage: formData.ForeignExchangeFeePercentage
          ? parseFloat(formData.ForeignExchangeFeePercentage)
          : null,
        RewardsCurrency: formData.RewardsCurrency.trim(),
        PointsPerDollar: formData.PointsPerDollar ? parseFloat(formData.PointsPerDollar) : null,
        VersionName: formData.VersionName.trim(),
        IsActive: true,
        effectiveFrom: formData.EffectiveFrom,
        effectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
      };

      const newCardId = await CardService.createCard(cardData, true);

      onSuccess(newCardId);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating card:', err);
      if (err.message?.includes('already exists')) {
        setErrors({ ReferenceCardId: 'A card with this ID already exists' });
      } else {
        alert('Failed to create card: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Card"
      description="Create a new credit card with its first version"
    >
      <form onSubmit={handleSubmit} className="create-card-modal-form">
        <Input
          label="Reference Card ID"
          value={formData.ReferenceCardId}
          onChange={(e) => setFormData({ ...formData, ReferenceCardId: e.target.value })}
          error={errors.ReferenceCardId}
          placeholder="e.g., chase-sapphire-preferred"
        />
        <p className="field-help">
          Unique identifier for this card (letters, numbers, hyphens, underscores only).
          This will also be used as the ID for the first version and cannot be changed once created.
        </p>

        <Input
          label="Card Name"
          value={formData.CardName}
          onChange={(e) => setFormData({ ...formData, CardName: e.target.value })}
          error={errors.CardName}
          placeholder="e.g., Chase Sapphire Preferred"
        />

        <Input
          label="Card Issuer"
          value={formData.CardIssuer}
          onChange={(e) => setFormData({ ...formData, CardIssuer: e.target.value })}
          error={errors.CardIssuer}
          placeholder="e.g., Chase"
        />

        <Input
          label="Card Network"
          value={formData.CardNetwork}
          onChange={(e) => setFormData({ ...formData, CardNetwork: e.target.value })}
          error={errors.CardNetwork}
          placeholder="e.g., Visa, Mastercard, Amex"
        />

        <div className="textarea-wrapper">
          <label className="textarea-label">Card Details</label>
          <textarea
            className="textarea"
            value={formData.CardDetails}
            onChange={(e) => setFormData({ ...formData, CardDetails: e.target.value })}
            placeholder="Describe the card..."
            rows={3}
          />
        </div>

        <Input
          label="Card Image URL (optional)"
          value={formData.CardImage}
          onChange={(e) => setFormData({ ...formData, CardImage: e.target.value })}
          placeholder="https://example.com/card-image.png"
        />

        <div className="form-row">
          <Input
            label="Annual Fee"
            type="number"
            step="0.01"
            value={formData.AnnualFee}
            onChange={(e) => setFormData({ ...formData, AnnualFee: e.target.value })}
            placeholder="95"
          />

          <Input
            label="Foreign Exchange Fee %"
            type="number"
            step="0.01"
            value={formData.ForeignExchangeFeePercentage}
            onChange={(e) =>
              setFormData({ ...formData, ForeignExchangeFeePercentage: e.target.value })
            }
            placeholder="3"
          />
        </div>

        <Input
          label="Foreign Exchange Fee Description"
          value={formData.ForeignExchangeFee}
          onChange={(e) => setFormData({ ...formData, ForeignExchangeFee: e.target.value })}
          placeholder="e.g., 3% on all foreign transactions"
        />

        <div className="form-row">
          <Input
            label="Rewards Currency"
            value={formData.RewardsCurrency}
            onChange={(e) => setFormData({ ...formData, RewardsCurrency: e.target.value })}
            placeholder="e.g., Points, Miles, Cash Back"
          />

          <Input
            label="Points Per Dollar"
            type="number"
            step="0.1"
            value={formData.PointsPerDollar}
            onChange={(e) => setFormData({ ...formData, PointsPerDollar: e.target.value })}
            placeholder="1"
          />
        </div>

        <div className="section-divider">
          <h3>Version Information</h3>
        </div>

        <Input
          label="Version Name"
          value={formData.VersionName}
          onChange={(e) => setFormData({ ...formData, VersionName: e.target.value })}
          error={errors.VersionName}
          placeholder="V1"
        />

        <Input
          label="Effective From"
          type="date"
          value={formData.EffectiveFrom}
          onChange={(e) => setFormData({ ...formData, EffectiveFrom: e.target.value })}
          error={errors.EffectiveFrom}
        />

        <Input
          label="Effective To (optional)"
          type="date"
          value={formData.EffectiveTo}
          onChange={(e) => setFormData({ ...formData, EffectiveTo: e.target.value })}
          placeholder="Leave empty for ongoing"
        />

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Card'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
