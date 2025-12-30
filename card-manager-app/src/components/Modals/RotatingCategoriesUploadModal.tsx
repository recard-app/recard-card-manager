import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { FileJson } from 'lucide-react';
import './RotatingCategoriesUploadModal.scss';

export interface RotatingCategoryEntry {
  category: string;
  subCategory: string;
  periodType: string;
  periodValue?: number;
  year: number;
  title: string;
}

interface RotatingCategoriesUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (entries: RotatingCategoryEntry[]) => void;
}

const EXPECTED_FIELDS = ['category', 'subCategory', 'periodType', 'periodValue', 'year', 'title'];
const VALID_PERIOD_TYPES = ['quarter', 'month', 'half_year', 'year'];

export function RotatingCategoriesUploadModal({ open, onOpenChange, onImport }: RotatingCategoriesUploadModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleImport = () => {
    setParseError(null);

    // Try to parse the JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setParseError('Invalid JSON format. Please check your input.');
      return;
    }

    // Ensure it's an array (or wrap single object in array)
    const entries = Array.isArray(parsed) ? parsed : [parsed];

    // Validate each entry
    const validEntries: RotatingCategoryEntry[] = [];
    const errors: string[] = [];

    entries.forEach((entry, index) => {
      if (typeof entry !== 'object' || entry === null) {
        errors.push(`Entry ${index + 1}: Not a valid object`);
        return;
      }

      const e = entry as Record<string, unknown>;

      // Validate required fields
      if (!e.category || typeof e.category !== 'string') {
        errors.push(`Entry ${index + 1}: Missing or invalid category`);
        return;
      }
      if (!e.title || typeof e.title !== 'string' || !(e.title as string).trim()) {
        errors.push(`Entry ${index + 1}: Missing or invalid title`);
        return;
      }
      if (!e.periodType || !VALID_PERIOD_TYPES.includes(e.periodType as string)) {
        errors.push(`Entry ${index + 1}: Invalid periodType (must be quarter, month, half_year, or year)`);
        return;
      }
      if (typeof e.year !== 'number' || e.year < 2000 || e.year > 2100) {
        errors.push(`Entry ${index + 1}: Missing or invalid year`);
        return;
      }

      // Validate periodValue for types that require it
      const periodType = e.periodType as string;
      if (periodType !== 'year') {
        if (e.periodValue === undefined || typeof e.periodValue !== 'number') {
          errors.push(`Entry ${index + 1}: periodValue required for ${periodType}`);
          return;
        }

        // Validate periodValue range based on type
        const pv = e.periodValue as number;
        if (periodType === 'quarter' && (pv < 1 || pv > 4)) {
          errors.push(`Entry ${index + 1}: Quarter must be 1-4`);
          return;
        }
        if (periodType === 'month' && (pv < 1 || pv > 12)) {
          errors.push(`Entry ${index + 1}: Month must be 1-12`);
          return;
        }
        if (periodType === 'half_year' && (pv < 1 || pv > 2)) {
          errors.push(`Entry ${index + 1}: Half year must be 1 or 2`);
          return;
        }
      }

      validEntries.push({
        category: (e.category as string).toLowerCase(),
        subCategory: typeof e.subCategory === 'string' ? e.subCategory.toLowerCase() : '',
        periodType: e.periodType as string,
        periodValue: e.periodValue as number | undefined,
        year: e.year as number,
        title: (e.title as string).trim(),
      });
    });

    if (errors.length > 0) {
      const displayErrors = errors.slice(0, 5).join('\n');
      const moreCount = errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : '';
      setParseError(displayErrors + moreCount);
      return;
    }

    if (validEntries.length === 0) {
      setParseError('No valid entries found in JSON');
      return;
    }

    // Success - call onImport and close
    onImport(validEntries);
    toast.success(`Added ${validEntries.length} rotating category ${validEntries.length === 1 ? 'entry' : 'entries'}`);
    setJsonText('');
    setParseError(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setJsonText('');
    setParseError(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Rotating Categories"
      description="Paste JSON to add rotating category entries. This will ADD to existing entries, not replace them."
    >
      <div className="rotating-categories-upload">
        <div className="upload-info">
          <p className="info-text">
            Expected fields per entry:
          </p>
          <div className="expected-fields">
            {EXPECTED_FIELDS.map((field) => (
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
            placeholder={`[\n  {\n    "category": "dining",\n    "subCategory": "",\n    "periodType": "quarter",\n    "periodValue": 1,\n    "year": 2025,\n    "title": "Restaurants"\n  }\n]`}
            rows={12}
            spellCheck={false}
          />
          {parseError && <span className="json-error">{parseError}</span>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={!jsonText.trim()}>
            Add Entries
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
