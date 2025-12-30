import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { CardService } from '@/services/card.service';
import type { CreditCardName, CardCharacteristics } from '@/types/ui-types';

const CARD_CHARACTERISTICS_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'rotating', label: 'Rotating Categories' },
  { value: 'selectable', label: 'Selectable Categories' },
];

interface EditCardNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardName: CreditCardName;
  onSuccess: (updatedCardName: CreditCardName) => void;
}

export function EditCardNameModal({ open, onOpenChange, cardName, onSuccess }: EditCardNameModalProps) {
  const formId = 'edit-card-name-form';

  const [formData, setFormData] = useState({
    CardName: '',
    CardIssuer: '',
    CardCharacteristics: 'standard' as CardCharacteristics,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form data when component mounts
  // The parent uses a key prop to force remount when opening the modal
  useEffect(() => {
    if (cardName) {
      setFormData({
        CardName: cardName.CardName,
        CardIssuer: cardName.CardIssuer,
        CardCharacteristics: cardName.CardCharacteristics || 'standard',
      });
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.CardName.trim()) {
      newErrors.CardName = 'Card name is required';
    }

    if (!formData.CardIssuer.trim()) {
      newErrors.CardIssuer = 'Card issuer is required';
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
      await CardService.updateCardName(cardName.ReferenceCardId, {
        CardName: formData.CardName.trim(),
        CardIssuer: formData.CardIssuer.trim(),
        CardCharacteristics: formData.CardCharacteristics,
      });

      const updatedCardName: CreditCardName = {
        ReferenceCardId: cardName.ReferenceCardId,
        CardName: formData.CardName.trim(),
        CardIssuer: formData.CardIssuer.trim(),
        CardCharacteristics: formData.CardCharacteristics,
      };

      toast.success('Card updated successfully');
      onSuccess(updatedCardName);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating card:', err);
      toast.error('Failed to update card: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Card"
      description="Update the card name and issuer"
    >
      <form id={formId} onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>Card ID: </span>
          <code style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cardName.ReferenceCardId}</code>
        </div>

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

        <Select
          label="Card Characteristics"
          required
          value={formData.CardCharacteristics}
          onChange={(value) => setFormData({ ...formData, CardCharacteristics: value as CardCharacteristics })}
          options={CARD_CHARACTERISTICS_OPTIONS}
        />
        <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', marginBottom: '1rem' }}>
          Standard: Fixed multiplier categories. Rotating: Categories change on a schedule. Selectable: User chooses category.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

