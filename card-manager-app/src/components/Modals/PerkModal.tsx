import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { CardPerk } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import './PerkModal.scss';

interface PerkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceCardId: string;
  perk?: CardPerk | null;
  onSuccess: () => void;
}

export function PerkModal({ open, onOpenChange, referenceCardId, perk, onSuccess }: PerkModalProps) {
  const isEdit = !!perk;

  const [formData, setFormData] = useState({
    Title: '',
    Category: '',
    SubCategory: '',
    Description: '',
    Requirements: '',
    Details: '',
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (perk) {
      setFormData({
        Title: perk.Title,
        Category: perk.Category,
        SubCategory: perk.SubCategory,
        Description: perk.Description,
        Requirements: perk.Requirements,
        Details: perk.Details || '',
        EffectiveFrom: perk.EffectiveFrom,
        EffectiveTo: denormalizeEffectiveTo(perk.EffectiveTo),
      });
    } else {
      setFormData({
        Title: '',
        Category: '',
        SubCategory: '',
        Description: '',
        Requirements: '',
        Details: '',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
      });
    }
    setErrors({});
  }, [perk, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.Title.trim()) {
      newErrors.Title = 'Title is required';
    }

    if (!formData.Category.trim()) {
      newErrors.Category = 'Category is required';
    }

    if (!formData.Description.trim()) {
      newErrors.Description = 'Description is required';
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
      const basePerkData: Omit<CardPerk, 'id' | 'LastUpdated' | 'ReferenceCardId'> = {
        Title: formData.Title.trim(),
        Category: formData.Category.trim(),
        SubCategory: formData.SubCategory.trim(),
        Description: formData.Description.trim(),
        Requirements: formData.Requirements.trim(),
        Details: formData.Details.trim() || undefined,
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
      };

      if (isEdit && perk) {
        // Do not modify ReferenceCardId on update to avoid losing association
        await ComponentService.updatePerk(perk.id, basePerkData);
      } else {
        await ComponentService.createPerk({
          ReferenceCardId: referenceCardId,
          ...basePerkData,
        });
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
          label="Title"
          value={formData.Title}
          onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
          error={errors.Title}
          placeholder="e.g., Airport Lounge Access"
        />

        <Select
          label="Category"
          value={formData.Category}
          onChange={(e) => setFormData({ ...formData, Category: e.target.value, SubCategory: '' })}
          error={errors.Category}
          options={Object.keys(CATEGORIES).map(cat => ({ value: cat, label: cat }))}
        />

        {formData.Category && SUBCATEGORIES[formData.Category]?.length > 0 && (
          <Select
            label="Sub Category"
            value={formData.SubCategory}
            onChange={(e) => setFormData({ ...formData, SubCategory: e.target.value })}
            options={SUBCATEGORIES[formData.Category].map(sub => ({ value: sub, label: sub }))}
          />
        )}

        <div className="textarea-wrapper">
          <label className="textarea-label">Description</label>
          <textarea
            className={`textarea ${errors.Description ? 'textarea--error' : ''}`}
            value={formData.Description}
            onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
            placeholder="Describe the perk in detail..."
            rows={4}
          />
          {errors.Description && <span className="textarea-error">{errors.Description}</span>}
        </div>

        <Input
          label="Requirements"
          value={formData.Requirements}
          onChange={(e) => setFormData({ ...formData, Requirements: e.target.value })}
          placeholder="Any requirements or conditions"
        />

        <Input
          label="Details (optional)"
          value={formData.Details}
          onChange={(e) => setFormData({ ...formData, Details: e.target.value })}
          placeholder="Additional details"
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
          helperText="⚠️ IMPORTANT: If this perk is currently active, leave this field BLANK."
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
