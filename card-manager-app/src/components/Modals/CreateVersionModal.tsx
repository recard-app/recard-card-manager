import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { CreditCardDetails } from '@/types';
import { CardService } from '@/services/card.service';
import { normalizeEffectiveTo, denormalizeEffectiveTo } from '@/types';
import './CreateVersionModal.scss';

interface CreateVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenceCardId: string;
  currentCard: CreditCardDetails;
  onSuccess: () => void;
}

export function CreateVersionModal({
  open,
  onOpenChange,
  referenceCardId,
  currentCard,
  onSuccess,
}: CreateVersionModalProps) {
  const [formData, setFormData] = useState({
    versionId: '',
    VersionName: '',
    EffectiveFrom: '',
    EffectiveTo: '',
    setAsActive: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        versionId: '',
        VersionName: '',
        EffectiveFrom: new Date().toISOString().split('T')[0],
        EffectiveTo: '',
        setAsActive: false,
      });
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.versionId.trim()) {
      newErrors.versionId = 'Version ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.versionId)) {
      newErrors.versionId = 'Version ID can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.VersionName.trim()) {
      newErrors.VersionName = 'Version name is required';
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
      // Create a new version based on the current card data
      const newVersionData: CreditCardDetails = {
        ...currentCard,
        VersionName: formData.VersionName.trim(),
        EffectiveFrom: formData.EffectiveFrom,
        EffectiveTo: normalizeEffectiveTo(formData.EffectiveTo),
        IsActive: formData.setAsActive,
      };

      // Remove the id so we can use the custom one
      delete (newVersionData as any).id;
      delete (newVersionData as any).lastUpdated;

      await CardService.createNewVersion(referenceCardId, formData.versionId.trim(), newVersionData);

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating version:', err);
      if (err.message?.includes('already exists')) {
        setErrors({ versionId: 'A version with this ID already exists' });
      } else {
        alert('Failed to create version: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Version"
      description="Create a new version of this card with different terms or benefits"
    >
      <form onSubmit={handleSubmit} className="create-version-modal-form">
        <Input
          label="Version ID"
          value={formData.versionId}
          onChange={(e) => setFormData({ ...formData, versionId: e.target.value })}
          error={errors.versionId}
          placeholder="e.g., chase-sapphire-preferred-v2"
        />
        <p className="field-help">Unique identifier for this version (cannot be changed once created)</p>

        <Input
          label="Version Name"
          value={formData.VersionName}
          onChange={(e) => setFormData({ ...formData, VersionName: e.target.value })}
          error={errors.VersionName}
          placeholder="e.g., V2, Updated 2024, etc."
        />

        <div className="info-box">
          <p>This will create a new version based on the current card configuration.</p>
        </div>

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

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.setAsActive}
              onChange={(e) => setFormData({ ...formData, setAsActive: e.target.checked })}
            />
            <span>Set as active version</span>
          </label>
          <p className="checkbox-description">
            If checked, this version will be activated and other versions will be deactivated
          </p>
        </div>

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Version'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
