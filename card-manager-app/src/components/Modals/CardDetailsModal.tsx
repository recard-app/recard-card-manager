import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { TextareaField, ColorPickerField } from '@/components/shadcn/form-field';
import { CardService } from '@/services/card.service';
import { REWARDS_CURRENCIES } from '@/constants/form-options';
import { CardIcon } from '@/components/icons/CardIcon';
import { CardDetailsFormSchema, zodErrorsToFieldMap } from '@/validation/schemas';
import './CardDetailsModal.scss';

const CARD_NETWORK_OPTIONS = [
  { value: 'Visa', label: 'Visa' },
  { value: 'Mastercard', label: 'Mastercard' },
  { value: 'American Express', label: 'American Express' },
  { value: 'Discover', label: 'Discover' },
];

const CardDetailsApplySchema = CardDetailsFormSchema.pick({
  CardName: true,
  CardIssuer: true,
  CardNetwork: true,
  CardDetails: true,
  CardPrimaryColor: true,
  CardSecondaryColor: true,
  AnnualFee: true,
  ForeignExchangeFee: true,
  ForeignExchangeFeePercentage: true,
  RewardsCurrency: true,
  PointsPerDollar: true,
});

interface CardDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionId: string;
  versionName: string;
  cardName: string;
  onSuccess: () => void;
  initialJson?: Record<string, unknown>;
}

export function CardDetailsModal({
  open,
  onOpenChange,
  versionId,
  versionName,
  cardName,
  onSuccess,
  initialJson,
}: CardDetailsModalProps) {
  const [formData, setFormData] = useState({
    CardName: '',
    CardIssuer: '',
    CardNetwork: '',
    CardDetails: '',
    CardPrimaryColor: '',
    CardSecondaryColor: '',
    AnnualFee: '',
    ForeignExchangeFee: '',
    ForeignExchangeFeePercentage: '',
    RewardsCurrency: '',
    PointsPerDollar: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.-]/g, '');
  };

  // Pre-fill from AI-generated JSON
  useEffect(() => {
    if (initialJson && open) {
      setFormData({
        CardName: String(initialJson.CardName || ''),
        CardIssuer: String(initialJson.CardIssuer || ''),
        CardNetwork: String(initialJson.CardNetwork || ''),
        CardDetails: String(initialJson.CardDetails || ''),
        CardPrimaryColor: String(initialJson.CardPrimaryColor || ''),
        CardSecondaryColor: String(initialJson.CardSecondaryColor || ''),
        AnnualFee: initialJson.AnnualFee != null ? String(initialJson.AnnualFee) : '',
        ForeignExchangeFee: String(initialJson.ForeignExchangeFee || ''),
        ForeignExchangeFeePercentage: initialJson.ForeignExchangeFeePercentage != null
          ? String(initialJson.ForeignExchangeFeePercentage)
          : '',
        RewardsCurrency: String(initialJson.RewardsCurrency || '').toLowerCase(),
        PointsPerDollar: initialJson.PointsPerDollar != null ? String(initialJson.PointsPerDollar) : '',
      });
      setErrors({});
    }
  }, [initialJson, open]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const dataToValidate: Record<string, unknown> = {
      CardName: formData.CardName,
      CardIssuer: formData.CardIssuer,
      CardNetwork: formData.CardNetwork,
      CardDetails: formData.CardDetails,
      CardPrimaryColor: formData.CardPrimaryColor,
      CardSecondaryColor: formData.CardSecondaryColor,
      AnnualFee: formData.AnnualFee,
      ForeignExchangeFee: formData.ForeignExchangeFee,
      ForeignExchangeFeePercentage: formData.ForeignExchangeFeePercentage,
      RewardsCurrency: formData.RewardsCurrency,
      PointsPerDollar: formData.PointsPerDollar,
    };

    const parsed = CardDetailsApplySchema.safeParse(dataToValidate);
    if (!parsed.success) {
      const fieldErrors = zodErrorsToFieldMap(parsed.error);
      // Filter to only fields we show
      const relevantErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(fieldErrors)) {
        if (k in formData) {
          relevantErrors[k] = v;
        }
      }
      setErrors(relevantErrors);
      if (Object.keys(relevantErrors).length > 0) {
        toast.warning('Please fix validation errors');
      }
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await CardService.updateCard(versionId, {
        CardName: formData.CardName.trim(),
        CardIssuer: formData.CardIssuer.trim(),
        CardNetwork: formData.CardNetwork.trim(),
        CardDetails: formData.CardDetails.trim(),
        CardPrimaryColor: formData.CardPrimaryColor.trim(),
        CardSecondaryColor: formData.CardSecondaryColor.trim(),
        AnnualFee: formData.AnnualFee ? parseFloat(formData.AnnualFee) : null,
        ForeignExchangeFee: formData.ForeignExchangeFee.trim(),
        ForeignExchangeFeePercentage: formData.ForeignExchangeFeePercentage
          ? parseFloat(formData.ForeignExchangeFeePercentage)
          : null,
        RewardsCurrency: formData.RewardsCurrency.trim().toLowerCase(),
        PointsPerDollar: formData.PointsPerDollar ? parseFloat(formData.PointsPerDollar) : null,
      });
      toast.success(`Card details applied to ${versionName}`);
      onSuccess();
    } catch (err: any) {
      toast.error('Failed to save: ' + (err?.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = formData.CardPrimaryColor && /^#[0-9A-Fa-f]{6}$/.test(formData.CardPrimaryColor)
    ? formData.CardPrimaryColor : '#5A5F66';
  const secondaryColor = formData.CardSecondaryColor && /^#[0-9A-Fa-f]{6}$/.test(formData.CardSecondaryColor)
    ? formData.CardSecondaryColor : '#F2F4F6';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Apply Card Details to ${versionName}`}
      description={`Updating version of ${cardName}`}
    >
      <div className="card-details-modal-form">
        <div className="card-details-modal-preview">
          <CardIcon title="Preview" size={36} primary={primaryColor} secondary={secondaryColor} />
          <span className="preview-label">Preview</span>
        </div>

        <div className="card-details-modal-grid">
          <FormField
            label="Card Name"
            required
            value={formData.CardName}
            onChange={(e) => updateField('CardName', e.target.value)}
            error={errors.CardName}
            placeholder="Chase Sapphire Reserve"
          />

          <FormField
            label="Card Issuer"
            required
            value={formData.CardIssuer}
            onChange={(e) => updateField('CardIssuer', e.target.value)}
            error={errors.CardIssuer}
            placeholder="Chase"
          />

          <Select
            label="Card Network"
            required
            value={formData.CardNetwork}
            onChange={(v) => updateField('CardNetwork', v)}
            options={CARD_NETWORK_OPTIONS}
            error={errors.CardNetwork}
          />

          <FormField
            label="Annual Fee"
            required
            value={formData.AnnualFee}
            onChange={(e) => updateField('AnnualFee', sanitizeNumericInput(e.target.value))}
            error={errors.AnnualFee}
            placeholder="0"
          />

          <FormField
            label="Foreign Exchange Fee"
            required
            value={formData.ForeignExchangeFee}
            onChange={(e) => updateField('ForeignExchangeFee', e.target.value)}
            error={errors.ForeignExchangeFee}
            placeholder='None or "3%"'
          />

          <FormField
            label="FX Fee %"
            value={formData.ForeignExchangeFeePercentage}
            onChange={(e) => updateField('ForeignExchangeFeePercentage', sanitizeNumericInput(e.target.value))}
            error={errors.ForeignExchangeFeePercentage}
            placeholder="0"
          />

          <Select
            label="Rewards Currency"
            required
            value={formData.RewardsCurrency}
            onChange={(v) => updateField('RewardsCurrency', v)}
            options={REWARDS_CURRENCIES.map(c => ({ value: c.toLowerCase(), label: c }))}
            error={errors.RewardsCurrency}
          />

          <FormField
            label="Points Per Dollar"
            value={formData.PointsPerDollar}
            onChange={(e) => updateField('PointsPerDollar', sanitizeNumericInput(e.target.value))}
            error={errors.PointsPerDollar}
            placeholder="1"
          />

          <div className="color-row">
            <ColorPickerField
              label="Primary Color"
              value={formData.CardPrimaryColor}
              onChange={(v) => updateField('CardPrimaryColor', v)}
            />
            <ColorPickerField
              label="Secondary Color"
              value={formData.CardSecondaryColor}
              onChange={(v) => updateField('CardSecondaryColor', v)}
            />
          </div>

          <TextareaField
            label="Card Details"
            value={formData.CardDetails}
            onChange={(e) => updateField('CardDetails', e.target.value)}
            placeholder="Brief description of the card..."
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? 'Saving...' : 'Apply to Version'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
