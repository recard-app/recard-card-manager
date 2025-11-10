import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CardCredit } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import './CreditModal.scss';

interface CreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  credit?: CardCredit | null;
  onSuccess: () => void;
}

export function CreditModal({ open, onOpenChange, cardId, credit, onSuccess }: CreditModalProps) {
  const isEdit = !!credit;

  const [formData, setFormData] = useState({
    CreditName: '',
    CreditAmount: '',
    IsCashBack: false,
    RequiresActivation: false,
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (credit) {
      setFormData({
        CreditName: credit.CreditName,
        CreditAmount: credit.CreditAmount.toString(),
        IsCashBack: credit.IsCashBack,
        RequiresActivation: credit.RequiresActivation,
        EffectiveFrom: credit.EffectiveFrom,
        EffectiveTo: denormalizeEffectiveTo(credit.EffectiveTo),
      });
    } else {
      // Reset form for new credit
      setFormData({
        CreditName: '',
        CreditAmount: '',
        IsCashBack: false,
        RequiresActivation: false,
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
      });
    }
    setErrors({});
  }, [credit, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.CreditName.trim()) {
      newErrors.CreditName = 'Credit name is required';
    }

    if (!formData.CreditAmount || parseFloat(formData.CreditAmount) <= 0) {
      newErrors.CreditAmount = 'Credit amount must be greater than 0';
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
      const creditData: Omit<CardCredit, 'id'> = {
        ReferenceCardId: cardId,
        CreditName: formData.CreditName.trim(),
        CreditAmount: parseFloat(formData.CreditAmount),
        IsCashBack: formData.IsCashBack,
        RequiresActivation: formData.RequiresActivation,
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
      };

      if (isEdit && credit) {
        await ComponentService.updateCredit(credit.id, creditData);
      } else {
        await ComponentService.createCredit(creditData);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving credit:', err);
      alert('Failed to save credit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Credit' : 'Add New Credit'}
      description={isEdit ? 'Update credit details' : 'Create a new credit for this card version'}
    >
      <form onSubmit={handleSubmit} className="credit-modal-form">
        <Input
          label="Credit Name"
          value={formData.CreditName}
          onChange={(e) => setFormData({ ...formData, CreditName: e.target.value })}
          error={errors.CreditName}
          placeholder="e.g., Annual Travel Credit"
        />

        <Input
          label="Credit Amount ($)"
          type="number"
          step="0.01"
          value={formData.CreditAmount}
          onChange={(e) => setFormData({ ...formData, CreditAmount: e.target.value })}
          error={errors.CreditAmount}
          placeholder="e.g., 300"
        />

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.IsCashBack}
              onChange={(e) => setFormData({ ...formData, IsCashBack: e.target.checked })}
            />
            <span>Is Cash Back</span>
          </label>
          <p className="checkbox-description">Check if this is a cash back credit rather than a statement credit</p>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.RequiresActivation}
              onChange={(e) => setFormData({ ...formData, RequiresActivation: e.target.checked })}
            />
            <span>Requires Activation</span>
          </label>
          <p className="checkbox-description">Check if this credit requires manual activation by the cardholder</p>
        </div>

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
            {submitting ? 'Saving...' : isEdit ? 'Update Credit' : 'Create Credit'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
