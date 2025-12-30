import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { AllowedCategoryEntry } from '@/types';
import { CATEGORIES, SUBCATEGORIES } from '@/constants/form-options';
import './AllowedCategoryModal.scss';

interface AllowedCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: AllowedCategoryEntry | null;
  existingCategories?: AllowedCategoryEntry[]; // To prevent duplicates
  onSave: (entry: Omit<AllowedCategoryEntry, 'id'> | AllowedCategoryEntry) => Promise<void>;
}

// Helper to generate display name from category/subcategory
function generateDisplayName(category: string, subCategory: string): string {
  if (subCategory) {
    // Capitalize first letter of each word
    return subCategory
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AllowedCategoryModal({ open, onOpenChange, entry, existingCategories = [], onSave }: AllowedCategoryModalProps) {
  const isEdit = !!entry;

  const [formData, setFormData] = useState({
    category: '',
    subCategory: '',
    displayName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form data when component mounts
  useEffect(() => {
    if (entry) {
      setFormData({
        category: entry.category,
        subCategory: entry.subCategory,
        displayName: entry.displayName,
      });
    } else {
      setFormData({
        category: '',
        subCategory: '',
        displayName: '',
      });
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate display name when category changes
  const handleCategoryChange = (category: string) => {
    const displayName = generateDisplayName(category, '');
    setFormData({ ...formData, category, subCategory: '', displayName });
  };

  // Update display name when subcategory changes
  const handleSubCategoryChange = (subCategory: string) => {
    const displayName = generateDisplayName(formData.category, subCategory);
    setFormData({ ...formData, subCategory, displayName });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    // Check for duplicate category (only when adding new, or if category changed)
    if (!isEdit || (entry && (entry.category !== formData.category || entry.subCategory !== formData.subCategory))) {
      const isDuplicate = existingCategories.some(
        cat => cat.category === formData.category && cat.subCategory === formData.subCategory && (!entry || cat.id !== entry.id)
      );
      if (isDuplicate) {
        newErrors.category = 'This category/subcategory combination already exists';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.warning('Please fix the errors before saving');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const entryData: Omit<AllowedCategoryEntry, 'id'> = {
        category: formData.category.trim(),
        subCategory: formData.subCategory.trim(),
        displayName: formData.displayName.trim(),
      };

      if (isEdit && entry) {
        await onSave({ ...entryData, id: entry.id });
      } else {
        await onSave(entryData);
      }

      toast.success(isEdit ? 'Category updated' : 'Category added');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving allowed category:', err);
      toast.error('Failed to save category: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'allowed-category-modal-form';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Allowed Category' : 'Add Allowed Category'}
      description="Configure a category option for users to select"
    >
      <form id={formId} onSubmit={handleSubmit} className="allowed-category-modal-form">
        <Select
          label="Category"
          required
          value={formData.category}
          onChange={handleCategoryChange}
          error={errors.category}
          options={Object.keys(CATEGORIES).map(cat => ({ value: cat, label: cat }))}
        />

        {formData.category && SUBCATEGORIES[formData.category]?.length > 0 && (
          <Select
            label="Sub Category (optional)"
            value={formData.subCategory}
            onChange={handleSubCategoryChange}
            options={SUBCATEGORIES[formData.category].map(sub => ({ value: sub, label: sub }))}
            clearable
          />
        )}

        <FormField
          label="Display Name"
          required
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          error={errors.displayName}
          placeholder="e.g., Gas Stations"
          helperText="User-friendly name shown in the dropdown"
        />

        <div className="info-note">
          The first category in the list will be the default selection for users who haven't chosen a category yet.
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Category' : 'Add Category'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
