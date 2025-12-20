import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { extractValidFieldsFromJson, SCHEMA_FIELDS } from '@/utils/schema-validation';
import type { GenerationType } from '@/services/ai.service';
import { FileJson } from 'lucide-react';
import './JsonImportModal.scss';

interface JsonImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: GenerationType;
  onImport: (fields: Record<string, unknown>) => void;
}

export function JsonImportModal({ open, onOpenChange, type, onImport }: JsonImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const expectedFields = SCHEMA_FIELDS[type];

  const handleImport = () => {
    setParseError(null);

    // Try to parse the JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setParseError('Invalid JSON format. Please check your input.');
      return;
    }

    // Validate it's an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setParseError('JSON must be an object, not an array or primitive value.');
      return;
    }

    // Extract valid fields
    const result = extractValidFieldsFromJson(type, parsed);

    if (result.validCount === 0) {
      setParseError('No valid fields found in the JSON. Check that field names and values match the expected schema.');
      return;
    }

    // Show feedback about what was imported
    if (result.skippedCount > 0) {
      const skippedNames = result.skippedFields.map(s => s.field).join(', ');
      toast.info(`Imported ${result.validCount} field(s). Skipped ${result.skippedCount}: ${skippedNames}`);
    } else {
      toast.success(`Successfully imported ${result.validCount} field(s)`);
    }

    // Call the onImport callback with the valid fields
    onImport(result.validFields);
    
    // Close the modal and reset
    setJsonText('');
    setParseError(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setJsonText('');
    setParseError(null);
    onOpenChange(false);
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'card':
        return 'Card Details';
      case 'credit':
        return 'Credit';
      case 'perk':
        return 'Perk';
      case 'multiplier':
        return 'Multiplier';
      default:
        return type;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Import ${getTypeLabel()} from JSON`}
      description="Paste JSON to auto-populate form fields. Only valid fields will be imported."
    >
      <div className="json-import-modal">
        <div className="json-import-info">
          <p className="info-text">
            Expected fields for <strong>{type}</strong>:
          </p>
          <div className="expected-fields">
            {expectedFields.map((field) => (
              <span key={field} className="field-tag">{field}</span>
            ))}
          </div>
        </div>

        <div className="json-input-wrapper">
          <label className="json-input-label">
            <FileJson size={16} />
            JSON Input
          </label>
          <textarea
            className={`json-textarea ${parseError ? 'json-textarea--error' : ''}`}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setParseError(null);
            }}
            placeholder={`{\n  "${expectedFields[0]}": "...",\n  "${expectedFields[1]}": "..."\n}`}
            rows={10}
            spellCheck={false}
          />
          {parseError && <span className="json-error">{parseError}</span>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={!jsonText.trim()}>
            Import Fields
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

