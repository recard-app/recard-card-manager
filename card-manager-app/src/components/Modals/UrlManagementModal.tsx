import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Plus, X, ExternalLink } from 'lucide-react';
import { CardService } from '@/services/card.service';
import type { CreditCardName } from '@/types/ui-types';

interface UrlManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardName: CreditCardName;
  onSuccess: (updatedCardName: CreditCardName) => void;
}

export function UrlManagementModal({ open, onOpenChange, cardName, onSuccess }: UrlManagementModalProps) {
  const [websiteUrls, setWebsiteUrls] = useState<string[]>([]);
  const [urlKeys, setUrlKeys] = useState<number[]>([]);
  const nextKeyRef = useRef(0);
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const urls = cardName.websiteUrls ?? [];
    setWebsiteUrls(urls);
    const keys = urls.map(() => nextKeyRef.current++);
    setUrlKeys(keys);
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
    const newUrlErrors: Record<number, string> = {};

    websiteUrls.forEach((url, index) => {
      const error = validateUrl(url);
      if (error) {
        newUrlErrors[index] = error;
      }
    });

    setUrlErrors(newUrlErrors);
    return Object.keys(newUrlErrors).length === 0;
  };

  const handleAddUrl = () => {
    setWebsiteUrls([...websiteUrls, '']);
    setUrlKeys([...urlKeys, nextKeyRef.current++]);
  };

  const handleRemoveUrl = (index: number) => {
    setWebsiteUrls(websiteUrls.filter((_, i) => i !== index));
    setUrlKeys(urlKeys.filter((_, i) => i !== index));
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
    if (urlErrors[index]) {
      const newUrlErrors = { ...urlErrors };
      delete newUrlErrors[index];
      setUrlErrors(newUrlErrors);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSubmitting(true);

    try {
      const cleanedUrls = Array.from(
        new Set(websiteUrls.map(u => u.trim()).filter(Boolean))
      );

      await CardService.updateCardName(cardName.ReferenceCardId, {
        websiteUrls: cleanedUrls,
      });

      const updatedCardName: CreditCardName = {
        ...cardName,
        websiteUrls: cleanedUrls,
      };

      toast.success('URLs updated successfully');
      onSuccess(updatedCardName);
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating URLs:', err);
      toast.error('Failed to update URLs: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
      title="Website URLs"
      description="Pages used for automated card reviews"
    >
      <div>
        {websiteUrls.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.75rem' }}>
            No URLs configured. Add URLs to enable automated reviews for this card.
          </p>
        )}

        {websiteUrls.map((url, index) => (
          <div key={urlKeys[index]} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
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
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
