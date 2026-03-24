import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, X, ExternalLink } from 'lucide-react';
import { CardService } from '@/services/card.service';
import type { CreditCardName } from '@/types/ui-types';

interface EditCardNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardName: CreditCardName;
  onSuccess: (updatedCardName: CreditCardName) => void;
}

export function EditCardNameModal({ open, onOpenChange, cardName, onSuccess }: EditCardNameModalProps) {
  const formId = 'edit-card-name-form';

  const [formData, setFormData] = useState({
    CardName: '',
    CardIssuer: '',
  });
  const [websiteUrls, setWebsiteUrls] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form data when component mounts
  useEffect(() => {
    if (!open) return;

    setFormData({
      CardName: cardName.CardName,
      CardIssuer: cardName.CardIssuer,
    });
    setWebsiteUrls(cardName.websiteUrls ?? []);
    setErrors({});
    setUrlErrors({});
  }, [cardName, open]);

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) return null;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:') return 'URL must start with https://';
    } catch {
      return 'Invalid URL format';
    }
    return null;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newUrlErrors: Record<number, string> = {};

    if (!formData.CardName.trim()) {
      newErrors.CardName = 'Card name is required';
    }

    if (!formData.CardIssuer.trim()) {
      newErrors.CardIssuer = 'Card issuer is required';
    }

    // Validate each URL
    websiteUrls.forEach((url, index) => {
      const error = validateUrl(url);
      if (error) {
        newUrlErrors[index] = error;
      }
    });

    setErrors(newErrors);
    setUrlErrors(newUrlErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newUrlErrors).length === 0;
  };

  const handleAddUrl = () => {
    setWebsiteUrls([...websiteUrls, '']);
  };

  const handleRemoveUrl = (index: number) => {
    setWebsiteUrls(websiteUrls.filter((_, i) => i !== index));
    setUrlErrors(prev => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const currentIndex = Number(key);
        if (currentIndex === index) return;
        next[currentIndex > index ? currentIndex - 1 : currentIndex] = value;
      });
      return next;
    });
  };

  const handleUrlChange = (index: number, value: string) => {
    const updated = [...websiteUrls];
    updated[index] = value;
    setWebsiteUrls(updated);
    // Clear error on change
    if (urlErrors[index]) {
      const newUrlErrors = { ...urlErrors };
      delete newUrlErrors[index];
      setUrlErrors(newUrlErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      // Filter out empty URLs and dedupe while preserving order.
      const cleanedUrls = Array.from(
        new Set(websiteUrls.map(u => u.trim()).filter(Boolean))
      );

      await CardService.updateCardName(cardName.ReferenceCardId, {
        CardName: formData.CardName.trim(),
        CardIssuer: formData.CardIssuer.trim(),
        websiteUrls: cleanedUrls,
      });

      const updatedCardName: CreditCardName = {
        ...cardName,
        CardName: formData.CardName.trim(),
        CardIssuer: formData.CardIssuer.trim(),
        websiteUrls: cleanedUrls,
      };

      toast.success('Card updated successfully');
      onSuccess(updatedCardName);
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating card:', err);
      toast.error('Failed to update card: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const openExternalUrl = (url: string) => {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:') {
        toast.error('Only https:// URLs can be opened');
        return;
      }
      window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Invalid URL');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Card"
      description="Update the card name, issuer, and website URLs"
    >
      <form id={formId} onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>Card ID: </span>
          <code style={{ fontSize: '0.875rem', fontWeight: 500 }}>{cardName.ReferenceCardId}</code>
        </div>

        <FormField
          label="Card Name"
          value={formData.CardName}
          onChange={(e) => setFormData({ ...formData, CardName: e.target.value })}
          error={errors.CardName}
          placeholder="e.g., Chase Sapphire Preferred"
        />

        <FormField
          label="Card Issuer"
          value={formData.CardIssuer}
          onChange={(e) => setFormData({ ...formData, CardIssuer: e.target.value })}
          error={errors.CardIssuer}
          placeholder="e.g., Chase"
        />

        {/* Website URLs Section */}
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Website URLs
          </label>
          <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
            Pages with card benefits, perks, and rewards (for automated reviews)
          </p>

          {websiteUrls.map((url, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: urlErrors[index] ? '1px solid #dc2626' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                />
                {urlErrors[index] && (
                  <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{urlErrors[index]}</p>
                )}
              </div>
              {url.trim() && !urlErrors[index] && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openExternalUrl(url)}
                  title="Open URL in new tab"
                >
                  <ExternalLink size={14} />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveUrl(index)}
                title="Remove URL"
              >
                <X size={14} />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddUrl}
            style={{ marginTop: websiteUrls.length > 0 ? '0.25rem' : 0 }}
          >
            <Plus size={14} />
            Add URL
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
