import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { CardCredit } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import { CATEGORIES, SUBCATEGORIES, TIME_PERIODS } from '@/constants/form-options';
import './CreditModal.scss';

interface CreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceCardId: string;
  credit?: CardCredit | null;
  onSuccess: () => void;
}

export function CreditModal({ open, onOpenChange, referenceCardId, credit, onSuccess }: CreditModalProps) {
  const isEdit = !!credit;

  const [formData, setFormData] = useState({
    Title: '',
    Category: '',
    SubCategory: '',
    Description: '',
    Value: '',
    TimePeriod: '',
    Requirements: '',
    Details: '',
    EffectiveFrom: '',
    EffectiveTo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Helper to sanitize numeric input (allows digits, decimal point, negative sign, and dollar sign)
  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.$-]/g, '');
  };

  useEffect(() => {
    if (credit) {
      setFormData({
        Title: credit.Title,
        Category: credit.Category,
        SubCategory: credit.SubCategory,
        Description: credit.Description,
        Value: credit.Value,
        TimePeriod: credit.TimePeriod,
        Requirements: credit.Requirements,
        Details: credit.Details || '',
        EffectiveFrom: credit.EffectiveFrom,
        EffectiveTo: denormalizeEffectiveTo(credit.EffectiveTo),
      });
    } else {
      // Reset form for new credit
      setFormData({
        Title: '',
        Category: '',
        SubCategory: '',
        Description: '',
        Value: '',
        TimePeriod: '',
        Requirements: '',
        Details: '',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
      });
    }
    setErrors({});
  }, [credit, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.Title.trim()) {
      newErrors.Title = 'Title is required';
    }

    if (!formData.Category.trim()) {
      newErrors.Category = 'Category is required';
    }

    if (!formData.Value.trim()) {
      newErrors.Value = 'Value is required';
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
      const baseCreditData: Omit<CardCredit, 'id' | 'LastUpdated' | 'ReferenceCardId'> = {
        Title: formData.Title.trim(),
        Category: formData.Category.trim(),
        SubCategory: formData.SubCategory.trim(),
        Description: formData.Description.trim(),
        Value: formData.Value.trim(),
        TimePeriod: formData.TimePeriod.trim(),
        Requirements: formData.Requirements.trim(),
        Details: formData.Details.trim() || undefined,
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
      };

      if (isEdit && credit) {
        // Preserve ReferenceCardId on update
        await ComponentService.updateCredit(credit.id, baseCreditData);
      } else {
        await ComponentService.createCredit({
          ReferenceCardId: referenceCardId,
          ...baseCreditData,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving credit:', err);
      toast.error('Failed to save credit: ' + err.message);
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
        <FormField
          label="Title"
          value={formData.Title}
          onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
          error={errors.Title}
          placeholder="e.g., Annual Travel Credit"
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

        <FormField
          label="Value ($)"
          type="text"
          value={formData.Value}
          onChange={(e) => setFormData({ ...formData, Value: sanitizeNumericInput(e.target.value) })}
          error={errors.Value}
          placeholder="e.g., 300 or $300"
        />

        <Select
          label="Time Period"
          value={formData.TimePeriod}
          onChange={(value) => setFormData({ ...formData, TimePeriod: value })}
          options={TIME_PERIODS.map(tp => ({ value: tp, label: tp }))}
        />

        <FormField
          label="Description"
          value={formData.Description}
          onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
          placeholder="Describe the credit"
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

        <FormField
          label="Effective From"
          type="date"
          value={formData.EffectiveFrom}
          onChange={(e) => setFormData({ ...formData, EffectiveFrom: e.target.value })}
          error={errors.EffectiveFrom}
        />

        <FormField
          label="Effective To (optional)"
          type="date"
          value={formData.EffectiveTo}
          onChange={(e) => setFormData({ ...formData, EffectiveTo: e.target.value })}
          placeholder="Leave empty for ongoing"
          helperText="⚠️ IMPORTANT: If this credit is currently active, leave this field BLANK."
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Credit' : 'Create Credit'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
