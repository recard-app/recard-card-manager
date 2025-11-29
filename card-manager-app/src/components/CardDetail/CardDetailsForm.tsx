import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextareaField } from '@/components/shadcn/form-field';
import { DatePicker } from '@/components/ui/DatePicker';
import { CardService } from '@/services/card.service';
import type { CreditCardDetails } from '@/types';
import { normalizeEffectiveTo } from '@/types';
import { formatDate } from '@/utils/date-utils';
import { REWARDS_CURRENCIES } from '@/constants/form-options';
import { Edit2, Trash2 } from 'lucide-react';
import './CardDetailsForm.scss';
import { CardIcon } from '@/components/icons/CardIcon';

interface CardDetailsFormProps {
  cardId: string;
  card: CreditCardDetails;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export function CardDetailsForm({ cardId, card, onSaved, onDeleted }: CardDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to sanitize numeric input (allows digits, decimal point, and negative sign)
  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.-]/g, '');
  };

  const [formData, setFormData] = useState({
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
    VersionName: '',
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  // When switching to a different version (cardId changes), ensure we reset to view mode
  useEffect(() => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSubmitting(false);
    setDeleting(false);
    setErrors({});
  }, [cardId]);

  useEffect(() => {
    if (card && isEditing) {
      setFormData({
        CardName: card.CardName || '',
        CardIssuer: card.CardIssuer || '',
        CardNetwork: card.CardNetwork || '',
        CardDetails: card.CardDetails || '',
        CardImage: (card as any).CardImage || '',
        CardPrimaryColor: (card as any).CardPrimaryColor || '',
        CardSecondaryColor: (card as any).CardSecondaryColor || '',
        AnnualFee: card.AnnualFee != null ? String(card.AnnualFee) : '',
        ForeignExchangeFee: card.ForeignExchangeFee || '',
        ForeignExchangeFeePercentage:
          card.ForeignExchangeFeePercentage != null
            ? String(card.ForeignExchangeFeePercentage)
            : '',
        RewardsCurrency: card.RewardsCurrency || '',
        PointsPerDollar: card.PointsPerDollar != null ? String(card.PointsPerDollar) : '',
        VersionName: card.VersionName || '',
        EffectiveFrom: card.effectiveFrom || '',
        EffectiveTo: card.effectiveTo === '9999-12-31' ? '' : card.effectiveTo || '',
      });
      setErrors({});
    }
  }, [card, isEditing]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.CardName.trim()) newErrors.CardName = 'Card name is required';
    if (!formData.CardIssuer.trim()) newErrors.CardIssuer = 'Card issuer is required';
    if (!formData.CardNetwork.trim()) newErrors.CardNetwork = 'Card network is required';
    if (!formData.VersionName.trim()) newErrors.VersionName = 'Version name is required';
    if (!formData.EffectiveFrom) newErrors.EffectiveFrom = 'Effective from date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await CardService.updateCard(cardId, {
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
      });
      setIsEditing(false);
      onSaved?.();
    } catch (err: any) {
      toast.error('Failed to save changes: ' + (err?.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await CardService.deleteCard(cardId);
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch (err: any) {
      toast.error('Failed to delete version: ' + (err?.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="card-details-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Card Details</h2>
        {!isEditing ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="delete-button"
            >
              <Trash2 size={16} />
              Delete Version
            </Button>
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 size={16} />
              Edit
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="details-grid">
          <div className="detail-group">
            <h3>Version Information</h3>
            <div className="detail-row">
              <span className="label">Effective From:</span>
              <span className="value">{formatDate(card.effectiveFrom)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Effective To:</span>
              <span className="value">
                {card.effectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(card.effectiveTo)}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Last Updated:</span>
              <span className="value">{formatDate(card.lastUpdated)}</span>
            </div>
          </div>

          <div className="detail-group">
            <h3>Basic Information</h3>
            <div className="detail-row">
              <span className="label">Card Name:</span>
              <span className="value">{card.CardName}</span>
            </div>
            <div className="detail-row">
              <span className="label">Card Issuer:</span>
              <span className="value">{card.CardIssuer}</span>
            </div>
            <div className="detail-row">
              <span className="label">Card Network:</span>
              <span className="value">{card.CardNetwork}</span>
            </div>
            <div className="detail-row">
              <span className="label">Version Name:</span>
              <span className="value">{card.VersionName}</span>
            </div>
          </div>

          <div className="detail-group">
            <h3>Fees</h3>
            <div className="detail-row">
              <span className="label">Annual Fee:</span>
              <span className="value">${card.AnnualFee ?? 0}</span>
            </div>
            <div className="detail-row">
              <span className="label">Foreign Exchange Fee:</span>
              <span className="value">{card.ForeignExchangeFee}</span>
            </div>
            <div className="detail-row">
              <span className="label">FX Fee Percentage:</span>
              <span className="value">{card.ForeignExchangeFeePercentage ?? 0}%</span>
            </div>
          </div>

          <div className="detail-group">
            <h3>Rewards</h3>
            <div className="detail-row">
              <span className="label">Rewards Currency:</span>
              <span className="value">{card.RewardsCurrency}</span>
            </div>
            <div className="detail-row">
              <span className="label">Points Per Dollar:</span>
              <span className="value">{card.PointsPerDollar ?? 0}x</span>
            </div>
          </div>

          <div className="detail-group">
            <h3>Branding</h3>
            <div className="detail-row">
              <span className="label">Primary Color:</span>
              <span className="value color-display">
                <span
                  className="color-swatch"
                  style={{ backgroundColor: (card as any).CardPrimaryColor || '#5A5F66' }}
                />
                {(card as any).CardPrimaryColor || '#5A5F66'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Secondary Color:</span>
              <span className="value color-display">
                <span
                  className="color-swatch"
                  style={{ backgroundColor: (card as any).CardSecondaryColor || '#F2F4F6' }}
                />
                {(card as any).CardSecondaryColor || '#F2F4F6'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Preview:</span>
              <span className="value preview-row">
                <CardIcon
                  title="Card preview"
                  size={36}
                  primary={(card as any).CardPrimaryColor || '#5A5F66'}
                  secondary={(card as any).CardSecondaryColor || '#F2F4F6'}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>SVG preview</span>
              </span>
            </div>
          </div>

          {card.CardDetails && (
            <div className="detail-group full-width">
              <h3>Additional Details</h3>
              <p className="card-details-text">{card.CardDetails}</p>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <form className="details-grid" onSubmit={(e) => e.preventDefault()}>
          <div className="detail-group">
            <h3>Basic Information</h3>
            <FormField
              label="Card Name"
              value={formData.CardName}
              onChange={(e) => setFormData({ ...formData, CardName: e.target.value })}
              error={errors.CardName}
            />
            <FormField
              label="Card Issuer"
              value={formData.CardIssuer}
              onChange={(e) => setFormData({ ...formData, CardIssuer: e.target.value })}
              error={errors.CardIssuer}
            />
            <FormField
              label="Card Network"
              value={formData.CardNetwork}
              onChange={(e) => setFormData({ ...formData, CardNetwork: e.target.value })}
              error={errors.CardNetwork}
            />
            <FormField
              label="Version Name"
              value={formData.VersionName}
              onChange={(e) => setFormData({ ...formData, VersionName: e.target.value })}
              error={errors.VersionName}
            />
          </div>

          <div className="detail-group">
            <h3>Fees</h3>
            <FormField
              label="Annual Fee"
              type="text"
              value={formData.AnnualFee}
              onChange={(e) => setFormData({ ...formData, AnnualFee: sanitizeNumericInput(e.target.value) })}
            />
            <FormField
              label="Foreign Exchange Fee Description"
              value={formData.ForeignExchangeFee}
              onChange={(e) => setFormData({ ...formData, ForeignExchangeFee: e.target.value })}
              helperText="If there are no fees, write 'No foreign transaction fees'."
            />
            <FormField
              label="FX Fee Percentage"
              type="text"
              value={formData.ForeignExchangeFeePercentage}
              onChange={(e) =>
                setFormData({ ...formData, ForeignExchangeFeePercentage: sanitizeNumericInput(e.target.value) })
              }
            />
          </div>

          <div className="detail-group">
            <h3>Rewards</h3>
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
            />
          </div>

          <div className="detail-group">
            <h3>Version Information</h3>
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
          </div>

          <div className="detail-group full-width">
            <h3>Additional Details</h3>
            <TextareaField
              label="Card Details"
              value={formData.CardDetails}
              onChange={(e) => setFormData({ ...formData, CardDetails: e.target.value })}
              rows={3}
            />
            <div className="form-row">
              <FormField
                label="Primary Color (optional)"
                value={formData.CardPrimaryColor}
                onChange={(e) => setFormData({ ...formData, CardPrimaryColor: e.target.value })}
                placeholder="#1A73E8"
                helperText="Color Hex format. Ex: '#FFFFFF'."
              />
              <FormField
                label="Secondary Color (optional)"
                value={formData.CardSecondaryColor}
                onChange={(e) => setFormData({ ...formData, CardSecondaryColor: e.target.value })}
                placeholder="#185ABC"
                helperText="Color Hex format. Ex: '#FFFFFF'."
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CardIcon
                title="Card preview"
                size={36}
                primary={formData.CardPrimaryColor || '#5A5F66'}
                secondary={formData.CardSecondaryColor || '#F2F4F6'}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Preview</span>
            </div>
          </div>
        </form>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => !deleting && setShowDeleteConfirm(open)}
        title="Delete Version"
        description="This action cannot be undone."
      >
        <p>
          Are you sure you want to delete version <strong>{card.VersionName}</strong>?
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={deleting}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="delete-confirm-button"
            size="sm"
          >
            {deleting ? 'Deleting...' : 'Delete Version'}
          </Button>
        </DialogFooter>
      </Dialog>
    </Card>
  );
}
