import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { CardCharacteristics } from '@/types/ui-types';
import { CardService } from '@/services/card.service';
import './CreateCardModal.scss';
import { CardNameFormSchema, zodErrorsToFieldMap } from '@/validation/schemas';

interface CreateCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (referenceCardId: string) => void;
}

const CARD_CHARACTERISTICS_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'rotating', label: 'Rotating Categories' },
  { value: 'selectable', label: 'Selectable Categories' },
];

export function CreateCardModal({ open, onOpenChange, onSuccess }: CreateCardModalProps) {
  const [formData, setFormData] = useState({
    ReferenceCardId: '',
    CardName: '',
    CardIssuer: '',
    CardCharacteristics: 'standard' as CardCharacteristics,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        ReferenceCardId: '',
        CardName: '',
        CardIssuer: '',
        CardCharacteristics: 'standard',
      });
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const parsed = CardNameFormSchema.safeParse({
      ReferenceCardId: formData.ReferenceCardId.trim(),
      CardName: formData.CardName.trim(),
      CardIssuer: formData.CardIssuer.trim(),
      CardCharacteristics: formData.CardCharacteristics,
    });
    if (!parsed.success) {
      const fieldLabels: Record<string, string> = {
        ReferenceCardId: 'Reference Card ID',
        CardName: 'Card Name',
        CardIssuer: 'Card Issuer',
        CardCharacteristics: 'Card Characteristics',
      };
      const fieldErrors = zodErrorsToFieldMap(parsed.error);
      setErrors(fieldErrors);
      const missing = Object.keys(fieldErrors).map(k => fieldLabels[k] || k).join(', ');
      if (missing) toast.warning(`Missing required fields: ${missing}`);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await CardService.createCardName(
        formData.ReferenceCardId.trim(),
        formData.CardName.trim(),
        formData.CardIssuer.trim(),
        formData.CardCharacteristics
      );

      toast.success('Card created successfully');
      onSuccess(formData.ReferenceCardId.trim());
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating card:', err);
      if (err.response?.data?.error?.includes('already exists')) {
        setErrors({ ReferenceCardId: 'A card with this ID already exists' });
      } else {
        toast.error('Failed to create card: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'create-card-modal-form';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Card"
      description="Create a new credit card. You can add versions with full details after creation."
    >
      <form id={formId} onSubmit={handleSubmit} className="create-card-modal-form">
        <FormField
          label="Reference Card ID"
          required
          value={formData.ReferenceCardId}
          onChange={(e) => {
            const value = e.target.value
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9_-]/g, '');
            setFormData({ ...formData, ReferenceCardId: value });
          }}
          error={errors.ReferenceCardId}
          placeholder="e.g., chase-sapphire-preferred"
        />
        <p className="field-help">
          Unique identifier for this card (lowercase letters, numbers, hyphens, underscores only).
          This cannot be changed once created.
        </p>

        <FormField
          label="Card Name"
          required
          value={formData.CardName}
          onChange={(e) => setFormData({ ...formData, CardName: e.target.value })}
          error={errors.CardName}
          placeholder="e.g., Chase Sapphire Preferred"
        />

        <FormField
          label="Card Issuer"
          required
          value={formData.CardIssuer}
          onChange={(e) => setFormData({ ...formData, CardIssuer: e.target.value })}
          error={errors.CardIssuer}
          placeholder="e.g., Chase"
        />

        <Select
          label="Card Characteristics"
          required
          value={formData.CardCharacteristics}
          onChange={(value) => setFormData({ ...formData, CardCharacteristics: value as CardCharacteristics })}
          options={CARD_CHARACTERISTICS_OPTIONS}
          error={errors.CardCharacteristics}
        />
        <p className="field-help">
          Standard: Fixed multiplier categories. Rotating: Categories change on a schedule. Selectable: User chooses category.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Card'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
