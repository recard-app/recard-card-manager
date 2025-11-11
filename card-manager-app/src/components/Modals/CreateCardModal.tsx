import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { CreditCardDetails } from '@/types';
import { CardService } from '@/services/card.service';
import { normalizeEffectiveTo } from '@/types';
import { REWARDS_CURRENCIES } from '@/constants/form-options';
import './CreateCardModal.scss';
import { CardIcon } from '@/components/icons/CardIcon';

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
    CardPrimaryColor: '',
    CardSecondaryColor: '',
    AnnualFee: '',
    ForeignExchangeFee: '',
    ForeignExchangeFeePercentage: '',
    RewardsCurrency: '',
    PointsPerDollar: '',
    VersionName: 'V1',
    EffectiveFrom: '',
    EffectiveTo: '',
    setAsActive: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Helper to sanitize numeric input (allows digits, decimal point, and negative sign)
  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.-]/g, '');
  };

  useEffect(() => {
    if (open) {
      setFormData({
        ReferenceCardId: '',
        CardName: '',
        CardIssuer: '',
        CardNetwork: '',
        CardDetails: '',
        CardImage: '',
        CardPrimaryColor: '',
        CardSecondaryColor: '',
        AnnualFee: '',
        ForeignExchangeFee: '',
        ForeignExchangeFeePercentage: '',
        RewardsCurrency: '',
        PointsPerDollar: '',
        VersionName: 'V1',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
        setAsActive: false,
      });
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ReferenceCardId.trim()) {
      newErrors.ReferenceCardId = 'Reference Card ID is required';
    } else if (!/^[a-zA-Z0-9-]+$/.test(formData.ReferenceCardId)) {
      newErrors.ReferenceCardId = 'Card ID can only contain letters, numbers, and hyphens';
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
        CardPrimaryColor: formData.CardPrimaryColor.trim() || undefined,
        CardSecondaryColor: formData.CardSecondaryColor.trim() || undefined,
        AnnualFee: formData.AnnualFee ? parseFloat(formData.AnnualFee) : null,
        ForeignExchangeFee: formData.ForeignExchangeFee.trim(),
        ForeignExchangeFeePercentage: formData.ForeignExchangeFeePercentage
          ? parseFloat(formData.ForeignExchangeFeePercentage)
          : null,
        RewardsCurrency: formData.RewardsCurrency.trim(),
        PointsPerDollar: formData.PointsPerDollar ? parseFloat(formData.PointsPerDollar) : null,
        VersionName: formData.VersionName.trim(),
        effectiveFrom: formData.EffectiveFrom,
        effectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
        IsActive: formData.setAsActive,
      };

      const newCardId = await CardService.createCard(cardData, formData.setAsActive);

      onSuccess(newCardId);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating card:', err);
      if (err.message?.includes('already exists')) {
        setErrors({ ReferenceCardId: 'A card with this ID already exists' });
      } else {
        toast.error('Failed to create card: ' + err.message);
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
          <FormField
            label="Reference Card ID"
            value={formData.ReferenceCardId}
            onChange={(e) =>
              setFormData({
                ...formData,
                ReferenceCardId: e.target.value.replace(/[^a-zA-Z0-9-]/g, ''),
              })
            }
            error={errors.ReferenceCardId}
            placeholder="e.g., chase-sapphire-preferred"
          />
          <p className="field-help">
            Unique identifier for this card (letters, numbers, hyphens only; no spaces).
            This will also be used as the ID for the first version and cannot be changed once created.
          </p>

          <FormField
            label="Card Name"
            value={formData.CardName}
            onChange={(e) => setFormData({ ...formData, CardName: e.target.value })}
            error={errors.CardName}
            placeholder="e.g., Chase Sapphire Preferred"
          />

          <FormField
            label="Card Issuer"
            value={formData.CardIssuer}
            onChange={(e) => setFormData({ ...formData, CardIssuer: e.target.value })}
            error={errors.CardIssuer}
            placeholder="e.g., Chase"
          />

          <FormField
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

          <div className="form-row">
            <FormField
              label="Primary Color (optional)"
              value={formData.CardPrimaryColor}
              onChange={(e) => setFormData({ ...formData, CardPrimaryColor: e.target.value })}
              placeholder="#1A73E8"
            />
            <FormField
              label="Secondary Color (optional)"
              value={formData.CardSecondaryColor}
              onChange={(e) => setFormData({ ...formData, CardSecondaryColor: e.target.value })}
              placeholder="#185ABC"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <CardIcon
              title="Card preview"
              size={36}
              primary={formData.CardPrimaryColor || '#5A5F66'}
              secondary={formData.CardSecondaryColor || '#F2F4F6'}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Preview</span>
          </div>

          <div className="form-row">
            <FormField
              label="Annual Fee"
              type="text"
              value={formData.AnnualFee}
              onChange={(e) => setFormData({ ...formData, AnnualFee: sanitizeNumericInput(e.target.value) })}
              placeholder="95"
            />

            <FormField
              label="Foreign Exchange Fee %"
              type="text"
              value={formData.ForeignExchangeFeePercentage}
              onChange={(e) =>
                setFormData({ ...formData, ForeignExchangeFeePercentage: sanitizeNumericInput(e.target.value) })
              }
              placeholder="3"
            />
          </div>

          <FormField
            label="Foreign Exchange Fee Description"
            value={formData.ForeignExchangeFee}
            onChange={(e) => setFormData({ ...formData, ForeignExchangeFee: e.target.value })}
            placeholder="e.g., 3% on all foreign transactions"
          />

          <div className="form-row">
            <Select
              label="Rewards Currency"
              value={formData.RewardsCurrency}
              onChange={(value) => setFormData({ ...formData, RewardsCurrency: value })}
              options={REWARDS_CURRENCIES.map(currency => ({ value: currency, label: currency }))}
            />

            <FormField
              label="Points Per Dollar"
              type="text"
              value={formData.PointsPerDollar}
              onChange={(e) => setFormData({ ...formData, PointsPerDollar: sanitizeNumericInput(e.target.value) })}
              placeholder="1"
            />
          </div>

          <div className="section-divider">
            <h3>Version Information</h3>
          </div>

          <FormField
            label="Version Name"
            value={formData.VersionName}
            onChange={(e) => setFormData({ ...formData, VersionName: e.target.value })}
            error={errors.VersionName}
            placeholder="V1"
          />

          <DatePicker
            label="Effective From"
            value={formData.EffectiveFrom}
            onChange={(value) => setFormData({ ...formData, EffectiveFrom: value })}
            error={errors.EffectiveFrom}
          />

          <DatePicker
            label="Effective To (optional)"
            value={formData.EffectiveTo}
            onChange={(value) => setFormData({ ...formData, EffectiveTo: value })}
            placeholder="Leave empty for ongoing"
            helperText="⚠️ IMPORTANT: If this version is currently active, leave this field BLANK."
          />
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.setAsActive}
                onChange={(e) => setFormData({ ...formData, setAsActive: e.target.checked })}
              />
              <span>Set as active version</span>
            </label>
            <p className="checkbox-description">
              If checked, this first version will be activated; otherwise it remains inactive.
            </p>
          </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Card'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
