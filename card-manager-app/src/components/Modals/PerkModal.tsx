import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CardPerk } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import './PerkModal.scss';

interface PerkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  perk?: CardPerk | null;
  onSuccess: () => void;
}

export function PerkModal({ open, onOpenChange, cardId, perk, onSuccess }: PerkModalProps) {
  const isEdit = !!perk;

  const [formData, setFormData] = useState({
    PerkName: '',
    PerkDescription: '',
    PerkCategory: '',
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (perk) {
      setFormData({
        PerkName: perk.PerkName,
        PerkDescription: perk.PerkDescription,
        PerkCategory: perk.PerkCategory,
        EffectiveFrom: perk.EffectiveFrom,
        EffectiveTo: denormalizeEffectiveTo(perk.EffectiveTo),
      });
    } else {
      setFormData({
        PerkName: '',
        PerkDescription: '',
        PerkCategory: '',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
      });
    }
    setErrors({});
  }, [perk, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.PerkName.trim()) {
      newErrors.PerkName = 'Perk name is required';
    }

    if (!formData.PerkDescription.trim()) {
      newErrors.PerkDescription = 'Perk description is required';
    }

    if (!formData.PerkCategory.trim()) {
      newErrors.PerkCategory = 'Perk category is required';
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
      const perkData: Omit<CardPerk, 'id'> = {
        ReferenceCardId: cardId,
        PerkName: formData.PerkName.trim(),
        PerkDescription: formData.PerkDescription.trim(),
        PerkCategory: formData.PerkCategory.trim(),
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
      };

      if (isEdit && perk) {
        await ComponentService.updatePerk(perk.id, perkData);
      } else {
        await ComponentService.createPerk(perkData);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving perk:', err);
      alert('Failed to save perk: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Perk' : 'Add New Perk'}
      description={isEdit ? 'Update perk details' : 'Create a new perk for this card version'}
    >
      <form onSubmit={handleSubmit} className="perk-modal-form">
        <Input
          label="Perk Name"
          value={formData.PerkName}
          onChange={(e) => setFormData({ ...formData, PerkName: e.target.value })}
          error={errors.PerkName}
          placeholder="e.g., Airport Lounge Access"
        />

        <div className="textarea-wrapper">
          <label className="textarea-label">Perk Description</label>
          <textarea
            className={`textarea ${errors.PerkDescription ? 'textarea--error' : ''}`}
            value={formData.PerkDescription}
            onChange={(e) => setFormData({ ...formData, PerkDescription: e.target.value })}
            placeholder="Describe the perk in detail..."
            rows={4}
          />
          {errors.PerkDescription && <span className="textarea-error">{errors.PerkDescription}</span>}
        </div>

        <Input
          label="Perk Category"
          value={formData.PerkCategory}
          onChange={(e) => setFormData({ ...formData, PerkCategory: e.target.value })}
          error={errors.PerkCategory}
          placeholder="e.g., Travel, Dining, Entertainment"
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
            {submitting ? 'Saving...' : isEdit ? 'Update Perk' : 'Create Perk'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
