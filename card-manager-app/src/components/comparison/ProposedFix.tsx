import { useMemo, useState } from 'react';
import { ChevronRight, Copy, Check, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { validateResponse } from '@/utils/schema-validation';
import type { GenerationType } from '@/services/ai.service';
import './ProposedFix.scss';

interface ProposedFixProps {
  /** The proposed fix value -- string/number for field fixes, object for component fixes */
  fix: string | number | null | Record<string, unknown>;
  /** When provided, validates the fix object against this schema type */
  validationType?: GenerationType;
}

/**
 * Collapsible proposed fix display with JSON formatting, copy button, and optional schema validation.
 * Used by FieldComparisonCard and ComponentComparisonTabs to show
 * AI-suggested corrections that match the schema format.
 */
export function ProposedFix({ fix, validationType }: ProposedFixProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const isObject = typeof fix === 'object' && fix !== null;
  const displayString = isObject
    ? JSON.stringify(fix, null, 2)
    : String(fix ?? 'null');
  const copyString = displayString;

  const validation = useMemo(() => {
    if (!validationType || typeof fix !== 'object' || fix === null) return null;
    return validateResponse(validationType, fix as Record<string, unknown>);
  }, [fix, validationType]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyString);
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
        {validation && (
          <span className={`schema-status ${validation.valid ? 'valid' : 'invalid'}`}>
            {validation.valid
              ? <><CheckCircle size={13} /> Valid schema</>
              : <><XCircle size={13} /> Invalid schema</>
            }
          </span>
        )}
      </button>

      {isOpen && (
        <div className="proposed-fix-content">
          {validation && !validation.valid && (
            <div className="schema-errors">
              {validation.invalidFields.map(field => (
                <div key={field} className="schema-error-item">
                  <XCircle size={12} />
                  <span className="error-field">{field}</span>
                  <span className="error-reason">{validation.fieldResults[field]?.reason}</span>
                </div>
              ))}
            </div>
          )}
          <pre className="json-block">{displayString}</pre>
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
