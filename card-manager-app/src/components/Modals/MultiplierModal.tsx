import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CardMultiplier } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import './MultiplierModal.scss';

interface MultiplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  multiplier?: CardMultiplier | null;
  onSuccess: () => void;
}

export function MultiplierModal({ open, onOpenChange, cardId, multiplier, onSuccess }: MultiplierModalProps) {
  const isEdit = !!multiplier;

  const [formData, setFormData] = useState({
    MultiplierCategory: '',
    MultiplierDescription: '',
    Multiplier: '',
    RequiresActivation: false,
    HasSpendingCap: false,
    SpendingCapAmount: '',
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (multiplier) {
      setFormData({
        MultiplierCategory: multiplier.MultiplierCategory,
        MultiplierDescription: multiplier.MultiplierDescription,
        Multiplier: multiplier.Multiplier.toString(),
        RequiresActivation: multiplier.RequiresActivation,
        HasSpendingCap: multiplier.HasSpendingCap,
        SpendingCapAmount: multiplier.SpendingCapAmount?.toString() || '',
        EffectiveFrom: multiplier.EffectiveFrom,
        EffectiveTo: denormalizeEffectiveTo(multiplier.EffectiveTo),
      });
    } else {
      setFormData({
        MultiplierCategory: '',
        MultiplierDescription: '',
        Multiplier: '',
        RequiresActivation: false,
        HasSpendingCap: false,
        SpendingCapAmount: '',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
      });
    }
    setErrors({});
  }, [multiplier, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.MultiplierCategory.trim()) {
      newErrors.MultiplierCategory = 'Multiplier category is required';
    }

    if (!formData.MultiplierDescription.trim()) {
      newErrors.MultiplierDescription = 'Multiplier description is required';
    }

    if (!formData.Multiplier || parseFloat(formData.Multiplier) <= 0) {
      newErrors.Multiplier = 'Multiplier must be greater than 0';
    }

    if (formData.HasSpendingCap && (!formData.SpendingCapAmount || parseFloat(formData.SpendingCapAmount) <= 0)) {
      newErrors.SpendingCapAmount = 'Spending cap amount must be greater than 0';
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
      const multiplierData: Omit<CardMultiplier, 'id'> = {
        ReferenceCardId: cardId,
        MultiplierCategory: formData.MultiplierCategory.trim(),
        MultiplierDescription: formData.MultiplierDescription.trim(),
        Multiplier: parseFloat(formData.Multiplier),
        RequiresActivation: formData.RequiresActivation,
        HasSpendingCap: formData.HasSpendingCap,
        SpendingCapAmount: formData.HasSpendingCap ? parseFloat(formData.SpendingCapAmount) : undefined,
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
      };

      if (isEdit && multiplier) {
        await ComponentService.updateMultiplier(multiplier.id, multiplierData);
      } else {
        await ComponentService.createMultiplier(multiplierData);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving multiplier:', err);
      alert('Failed to save multiplier: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Multiplier' : 'Add New Multiplier'}
      description={isEdit ? 'Update multiplier details' : 'Create a new multiplier for this card version'}
    >
      <form onSubmit={handleSubmit} className="multiplier-modal-form">
        <Input
          label="Multiplier Category"
          value={formData.MultiplierCategory}
          onChange={(e) => setFormData({ ...formData, MultiplierCategory: e.target.value })}
          error={errors.MultiplierCategory}
          placeholder="e.g., Dining, Travel, Gas"
        />

        <div className="textarea-wrapper">
          <label className="textarea-label">Multiplier Description</label>
          <textarea
            className={`textarea ${errors.MultiplierDescription ? 'textarea--error' : ''}`}
            value={formData.MultiplierDescription}
            onChange={(e) => setFormData({ ...formData, MultiplierDescription: e.target.value })}
            placeholder="Describe when this multiplier applies..."
            rows={3}
          />
          {errors.MultiplierDescription && <span className="textarea-error">{errors.MultiplierDescription}</span>}
        </div>

        <Input
          label="Multiplier (x)"
          type="number"
          step="0.1"
          value={formData.Multiplier}
          onChange={(e) => setFormData({ ...formData, Multiplier: e.target.value })}
          error={errors.Multiplier}
          placeholder="e.g., 3"
        />

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.RequiresActivation}
              onChange={(e) => setFormData({ ...formData, RequiresActivation: e.target.checked })}
            />
            <span>Requires Activation</span>
          </label>
          <p className="checkbox-description">Check if this multiplier requires manual activation by the cardholder</p>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.HasSpendingCap}
              onChange={(e) => setFormData({ ...formData, HasSpendingCap: e.target.checked })}
            />
            <span>Has Spending Cap</span>
          </label>
          <p className="checkbox-description">Check if this multiplier has a spending limit</p>
        </div>

        {formData.HasSpendingCap && (
          <Input
            label="Spending Cap Amount ($)"
            type="number"
            step="0.01"
            value={formData.SpendingCapAmount}
            onChange={(e) => setFormData({ ...formData, SpendingCapAmount: e.target.value })}
            error={errors.SpendingCapAmount}
            placeholder="e.g., 10000"
          />
        )}

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
            {submitting ? 'Saving...' : isEdit ? 'Update Multiplier' : 'Create Multiplier'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
