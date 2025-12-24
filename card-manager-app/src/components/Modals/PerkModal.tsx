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
import { getCurrentDate } from '@/utils/date-utils';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import { FileJson } from 'lucide-react';
import './PerkModal.scss';
import { PerkFormSchema, zodErrorsToFieldMap } from '@/validation/schemas';
import { JsonImportModal } from '@/components/Modals/JsonImportModal';

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
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);

  // Initialize form data when component mounts
  // The parent uses a key prop to force remount when editing different perks
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
        EffectiveFrom: getCurrentDate(),
        EffectiveTo: '',
      });
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleJsonImport = (fields: Record<string, unknown>) => {
    const updates: Partial<typeof formData> = {};

    if ('Title' in fields && typeof fields.Title === 'string') {
      updates.Title = fields.Title;
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

      <JsonImportModal
        open={jsonImportModalOpen}
        onOpenChange={setJsonImportModalOpen}
        type="perk"
        onImport={handleJsonImport}
      />
    </Dialog>
  );
}
