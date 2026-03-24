import { useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import './ProposedFix.scss';

interface ProposedFixProps {
  /** The proposed fix value -- string/number for field fixes, object for component fixes */
  fix: string | number | null | Record<string, unknown>;
}

/**
 * Collapsible proposed fix display with JSON formatting and copy button.
 * Used by FieldComparisonCard and ComponentComparisonTabs to show
 * AI-suggested corrections that match the schema format.
 */
export function ProposedFix({ fix }: ProposedFixProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const jsonString = typeof fix === 'object' && fix !== null
    ? JSON.stringify(fix, null, 2)
    : JSON.stringify(fix);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="proposed-fix">
      <button
        className="proposed-fix-toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <ChevronRight size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
        Proposed Fix
      </button>

      {isOpen && (
        <div className="proposed-fix-content">
          <pre className="json-block">{jsonString}</pre>
          <Button
            variant="outline"
            size="sm"
            className="copy-button"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  );
}
