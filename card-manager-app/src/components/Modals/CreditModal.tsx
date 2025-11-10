import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { CardCredit } from '@/types';
import { ComponentService } from '@/services/component.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import './CreditModal.scss';

interface CreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  credit?: CardCredit | null;
  onSuccess: () => void;
}

export function CreditModal({ open, onOpenChange, cardId, credit, onSuccess }: CreditModalProps) {
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
      const creditData: Omit<CardCredit, 'id' | 'LastUpdated'> = {
        ReferenceCardId: cardId,
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
        await ComponentService.updateCredit(credit.id, creditData);
      } else {
        await ComponentService.createCredit(creditData);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving credit:', err);
      alert('Failed to save credit: ' + err.message);
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
        <Input
          label="Title"
          value={formData.Title}
          onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
          error={errors.Title}
          placeholder="e.g., Annual Travel Credit"
        />

        <Input
          label="Category"
          value={formData.Category}
          onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
          error={errors.Category}
          placeholder="e.g., Travel"
        />

        <Input
          label="Sub Category"
          value={formData.SubCategory}
          onChange={(e) => setFormData({ ...formData, SubCategory: e.target.value })}
          placeholder="e.g., Annual Credit"
        />

        <Input
          label="Value"
          value={formData.Value}
          onChange={(e) => setFormData({ ...formData, Value: e.target.value })}
          error={errors.Value}
          placeholder="e.g., $300"
        />

        <Input
          label="Time Period"
          value={formData.TimePeriod}
          onChange={(e) => setFormData({ ...formData, TimePeriod: e.target.value })}
          placeholder="e.g., Annual, Monthly"
        />

        <Input
          label="Description"
          value={formData.Description}
          onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
          placeholder="Describe the credit"
        />

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
        />

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Credit' : 'Create Credit'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
