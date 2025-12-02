import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { CardPerk } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import './PerkModal.scss';
import { PerkFormSchema, zodErrorsToFieldMap } from '@/validation/schemas';

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
    const parsed = PerkFormSchema.safeParse({
      Title: formData.Title,
      Category: formData.Category,
      SubCategory: formData.SubCategory,
      Description: formData.Description,
      Requirements: formData.Requirements,
      Details: formData.Details,
      EffectiveFrom: formData.EffectiveFrom,
      EffectiveTo: formData.EffectiveTo,
    });
    if (!parsed.success) {
      const fieldLabels: Record<string, string> = {
        Title: 'Title',
        Category: 'Category',
        Description: 'Description',
        EffectiveFrom: 'Effective From',
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
      toast.success(isEdit ? 'Perk updated' : 'Perk created');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving perk:', err);
      toast.error('Failed to save perk: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'perk-modal-form';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Perk' : 'Add New Perk'}
      description={isEdit ? 'Update perk details' : 'Create a new perk for this card version'}
    >
      <form id={formId} onSubmit={handleSubmit} className="perk-modal-form">
        <FormField
          label="Title"
          required
          value={formData.Title}
          onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
          error={errors.Title}
          placeholder="e.g., Airport Lounge Access"
        />

        <Select
          label="Category"
          required
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
            required
            className={`textarea ${errors.Description ? 'textarea--error' : ''}`}
            value={formData.Description}
            onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
            placeholder="Describe the perk in detail..."
            rows={4}
          />
          {errors.Description && <span className="textarea-error">{errors.Description}</span>}
        </div>

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
          helperText="⚠️ IMPORTANT: If this perk is currently active, leave this field BLANK."
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Perk' : 'Create Perk'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
