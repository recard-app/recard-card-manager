import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { CardMultiplier } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import './MultiplierModal.scss';

interface MultiplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceCardId: string;
  multiplier?: CardMultiplier | null;
  onSuccess: () => void;
}

export function MultiplierModal({ open, onOpenChange, referenceCardId, multiplier, onSuccess }: MultiplierModalProps) {
  const isEdit = !!multiplier;

  const [formData, setFormData] = useState({
    Name: '',
    Category: '',
    SubCategory: '',
    Description: '',
    Multiplier: '',
    Requirements: '',
    Details: '',
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Helper to sanitize numeric input (allows digits, decimal point, and negative sign)
  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.-]/g, '');
  };

  useEffect(() => {
    if (multiplier) {
      setFormData({
        Name: multiplier.Name,
        Category: multiplier.Category,
        SubCategory: multiplier.SubCategory,
        Description: multiplier.Description,
        Multiplier: multiplier.Multiplier?.toString() || '',
        Requirements: multiplier.Requirements,
        Details: multiplier.Details || '',
        EffectiveFrom: multiplier.EffectiveFrom,
        EffectiveTo: denormalizeEffectiveTo(multiplier.EffectiveTo),
      });
    } else {
      setFormData({
        Name: '',
        Category: '',
        SubCategory: '',
        Description: '',
        Multiplier: '',
        Requirements: '',
        Details: '',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
      });
    }
    setErrors({});
  }, [multiplier, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.Name.trim()) {
      newErrors.Name = 'Name is required';
    }

    if (!formData.Category.trim()) {
      newErrors.Category = 'Category is required';
    }

    if (!formData.Description.trim()) {
      newErrors.Description = 'Description is required';
    }

    if (!formData.Multiplier || parseFloat(formData.Multiplier) <= 0) {
      newErrors.Multiplier = 'Multiplier must be greater than 0';
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
      const baseMultiplierData: Omit<CardMultiplier, 'id' | 'LastUpdated' | 'ReferenceCardId'> = {
        Name: formData.Name.trim(),
        Category: formData.Category.trim(),
        SubCategory: formData.SubCategory.trim(),
        Description: formData.Description.trim(),
        Multiplier: parseFloat(formData.Multiplier),
        Requirements: formData.Requirements.trim(),
        Details: formData.Details.trim() || undefined,
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
      };

      if (isEdit && multiplier) {
        await ComponentService.updateMultiplier(multiplier.id, baseMultiplierData);
      } else {
        await ComponentService.createMultiplier({
          ReferenceCardId: referenceCardId,
          ...baseMultiplierData,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving multiplier:', err);
      toast.error('Failed to save multiplier: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'multiplier-modal-form';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Multiplier' : 'Add New Multiplier'}
      description={isEdit ? 'Update multiplier details' : 'Create a new multiplier for this card version'}
    >
      <form id={formId} onSubmit={handleSubmit} className="multiplier-modal-form">
        <FormField
          label="Name"
          value={formData.Name}
          onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
          error={errors.Name}
          placeholder="e.g., 3x on Dining"
        />

        <Select
          label="Category"
          value={formData.Category}
          onChange={(value) => setFormData({ ...formData, Category: value, SubCategory: '' })}
          error={errors.Category}
          options={Object.keys(CATEGORIES).map(cat => ({ value: cat, label: cat }))}
        />

        {formData.Category && SUBCATEGORIES[formData.Category]?.length > 0 && (
          <Select
            label="Sub Category"
            value={formData.SubCategory}
            onChange={(value) => setFormData({ ...formData, SubCategory: value })}
            options={SUBCATEGORIES[formData.Category].map(sub => ({ value: sub, label: sub }))}
          />
        )}

        <div className="textarea-wrapper">
          <label className="textarea-label">Description</label>
          <textarea
            className={`textarea ${errors.Description ? 'textarea--error' : ''}`}
            value={formData.Description}
            onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
            placeholder="Describe when this multiplier applies..."
            rows={4}
          />
          {errors.Description && <span className="textarea-error">{errors.Description}</span>}
        </div>

        <FormField
          label="Multiplier (x)"
          type="text"
          value={formData.Multiplier}
          onChange={(e) => setFormData({ ...formData, Multiplier: sanitizeNumericInput(e.target.value) })}
          error={errors.Multiplier}
          placeholder="e.g., 3"
          helperText="Enter the numeric value only (no 'x'). For example: 2, 1.5, 1."
        />

        <FormField
          label="Requirements"
          value={formData.Requirements}
          onChange={(e) => setFormData({ ...formData, Requirements: e.target.value })}
          placeholder="Any requirements or conditions"
        />

        <FormField
          label="Details (optional)"
          value={formData.Details}
          onChange={(e) => setFormData({ ...formData, Details: e.target.value })}
          placeholder="Additional details"
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
          helperText="⚠️ IMPORTANT: If this multiplier is currently active, leave this field BLANK."
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Multiplier' : 'Create Multiplier'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
