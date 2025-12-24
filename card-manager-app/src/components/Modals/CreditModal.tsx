import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import type { CardCredit } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import { getCurrentDate } from '@/utils/date-utils';
import { CATEGORIES, SUBCATEGORIES, TIME_PERIODS } from '@/constants/form-options';
import { FileJson } from 'lucide-react';
import './CreditModal.scss';
import { CreditFormSchema, zodErrorsToFieldMap } from '@/validation/schemas';
import { JsonImportModal } from '@/components/Modals/JsonImportModal';

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
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);

  // Helper to sanitize numeric input (allows digits, decimal point, and negative sign)
  const sanitizeNumericInput = (value: string): string => {
    return value.replace(/[^0-9.-]/g, '');
  };

  // Initialize form data when component mounts
  // The parent uses a key prop to force remount when editing different credits
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
        EffectiveFrom: getCurrentDate(),
        EffectiveTo: '',
      });
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const parsed = CreditFormSchema.safeParse({
      Title: formData.Title,
      Category: formData.Category,
      SubCategory: formData.SubCategory,
      Description: formData.Description,
      Value: formData.Value,
      TimePeriod: formData.TimePeriod,
      Requirements: formData.Requirements,
      Details: formData.Details,
      EffectiveFrom: formData.EffectiveFrom,
      EffectiveTo: formData.EffectiveTo,
    });
    if (!parsed.success) {
      const fieldLabels: Record<string, string> = {
        Title: 'Title',
        Category: 'Category',
        Value: 'Value',
        TimePeriod: 'Time Period',
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
    if ('Value' in fields && typeof fields.Value === 'string') {
      updates.Value = fields.Value;
    }
    if ('TimePeriod' in fields && typeof fields.TimePeriod === 'string') {
      // Capitalize first letter to match TIME_PERIODS format
      const capitalized = fields.TimePeriod.charAt(0).toUpperCase() + fields.TimePeriod.slice(1).toLowerCase();
      if (TIME_PERIODS.includes(capitalized as typeof TIME_PERIODS[number])) {
        updates.TimePeriod = capitalized;
      }
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
      toast.success(isEdit ? 'Credit updated' : 'Credit created');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving credit:', err);
      toast.error('Failed to save credit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'credit-modal-form';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Credit' : 'Add New Credit'}
      description={isEdit ? 'Update credit details' : 'Create a new credit for this card version'}
    >
      <form id={formId} onSubmit={handleSubmit} className="credit-modal-form">
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
          placeholder="e.g., Annual Travel Credit"
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

        <FormField
          label="Value ($)"
          required
          type="text"
          value={formData.Value}
          onChange={(e) => setFormData({ ...formData, Value: sanitizeNumericInput(e.target.value) })}
          error={errors.Value}
          placeholder="e.g., 10"
          helperText="Put the value per time period as a number. For example, if the perk says $120 per year split monthly, enter '10'. Not '120', '$10', or '$120'."
        />

        <Select
          label="Time Period"
          required
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
          helperText="⚠️ IMPORTANT: If this credit is currently active, leave this field BLANK."
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Credit' : 'Create Credit'}
          </Button>
        </DialogFooter>
      </form>

      <JsonImportModal
        open={jsonImportModalOpen}
        onOpenChange={setJsonImportModalOpen}
        type="credit"
        onImport={handleJsonImport}
      />
    </Dialog>
  );
}
