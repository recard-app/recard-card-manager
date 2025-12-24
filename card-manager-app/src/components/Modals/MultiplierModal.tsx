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
import { getCurrentDate } from '@/utils/date-utils';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import { FileJson } from 'lucide-react';
import './MultiplierModal.scss';
import { MultiplierFormSchema, zodErrorsToFieldMap } from '@/validation/schemas';
import { JsonImportModal } from '@/components/Modals/JsonImportModal';

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
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);

  // Helper to sanitize numeric input (allows digits, decimal point, and negative sign)
  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.-]/g, '');
  };

  // Initialize form data when component mounts
  // The parent uses a key prop to force remount when editing different multipliers
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
        EffectiveFrom: getCurrentDate(),
        EffectiveTo: '',
      });
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const parsed = MultiplierFormSchema.safeParse({
      Name: formData.Name,
      Category: formData.Category,
      SubCategory: formData.SubCategory,
      Description: formData.Description,
      Multiplier: formData.Multiplier,
      Requirements: formData.Requirements,
      Details: formData.Details,
      EffectiveFrom: formData.EffectiveFrom,
      EffectiveTo: formData.EffectiveTo,
    });
    if (!parsed.success) {
      const fieldLabels: Record<string, string> = {
        Name: 'Name',
        Category: 'Category',
        Description: 'Description',
        Multiplier: 'Multiplier',
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

  const handleJsonImport = (fields: Record<string, unknown>) => {
    const updates: Partial<typeof formData> = {};

    if ('Name' in fields && typeof fields.Name === 'string') {
      updates.Name = fields.Name;
    }

    // Determine the category to use for subcategory validation
    let effectiveCategory = formData.Category;
    if ('Category' in fields && typeof fields.Category === 'string') {
      // Only set if it's a valid category
      if (Object.keys(CATEGORIES).includes(fields.Category)) {
        updates.Category = fields.Category;
        effectiveCategory = fields.Category;
        // Reset subcategory since category changed
        updates.SubCategory = '';
      }
    }

    // Only accept SubCategory if it's valid for the effective category
    if ('SubCategory' in fields && typeof fields.SubCategory === 'string') {
      const validSubcategories = SUBCATEGORIES[effectiveCategory] || [];
      if (validSubcategories.includes(fields.SubCategory)) {
        updates.SubCategory = fields.SubCategory;
      }
      // If not valid, leave SubCategory empty (already reset above or unchanged)
    }

    if ('Description' in fields && typeof fields.Description === 'string') {
      updates.Description = fields.Description;
    }
    if ('Multiplier' in fields && typeof fields.Multiplier === 'number') {
      updates.Multiplier = String(fields.Multiplier);
    }
    if ('Requirements' in fields && typeof fields.Requirements === 'string') {
      updates.Requirements = fields.Requirements;
    }
    if ('Details' in fields && typeof fields.Details === 'string') {
      updates.Details = fields.Details;
    }

    setFormData(prev => ({ ...prev, ...updates }));
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
      toast.success(isEdit ? 'Multiplier updated' : 'Multiplier created');
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setJsonImportModalOpen(true)}
          style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}
        >
          <FileJson size={16} />
          Import from JSON
        </Button>

        <FormField
          label="Name"
          required
          value={formData.Name}
          onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
          error={errors.Name}
          placeholder="e.g., 3x on Dining"
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
            placeholder="Describe when this multiplier applies..."
            rows={4}
          />
          {errors.Description && <span className="textarea-error">{errors.Description}</span>}
        </div>

        <FormField
          label="Multiplier (x)"
          required
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
          required
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

      <JsonImportModal
        open={jsonImportModalOpen}
        onOpenChange={setJsonImportModalOpen}
        type="multiplier"
        onImport={handleJsonImport}
      />
    </Dialog>
  );
}
