import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { FieldComparisonResult, FieldComparisonStatus } from '@/types/comparison-types';
import { ProposedFix } from './ProposedFix';
import './FieldComparisonCard.scss';

interface FieldComparisonCardProps {
  field: FieldComparisonResult;
  reviewed?: boolean;
  onToggleReview?: () => void;
  onEditCardDetails?: () => void;
}

const STATUS_CONFIG: Record<
  FieldComparisonStatus,
  { icon: React.ElementType; className: string; label: string }
> = {
  match: {
    icon: CheckCircle,
    className: 'status-match',
    label: 'Match',
  },
  mismatch: {
    icon: XCircle,
    className: 'status-mismatch',
    label: 'Mismatch',
  },
  questionable: {
    icon: AlertTriangle,
    className: 'status-questionable',
    label: 'Questionable',
  },
  missing_from_website: {
    icon: HelpCircle,
    className: 'status-missing',
    label: 'Not on Website',
  },
};

function formatValue(value: string | number | null): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return value.toString();
  if (value === '') return '(empty)';
  return value;
}

export function FieldComparisonCard({ field, reviewed, onToggleReview, onEditCardDetails }: FieldComparisonCardProps) {
  const config = STATUS_CONFIG[field.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('field-comparison-card', config.className)}>
      <div className="field-header">
        <StatusIcon className="status-icon" size={18} />
        <span className="field-label">{field.fieldLabel}</span>
        <span className="status-badge">{config.label}</span>
        {onEditCardDetails && (
          <Button size="sm" variant="outline" onClick={onEditCardDetails}>
            <Pencil size={14} /> Edit Card Details
          </Button>
        )}
      </div>

      <div className="field-values">
        <div className="value-row">
          <span className="value-label">Database:</span>
          <span className="value-content">{formatValue(field.databaseValue)}</span>
        </div>
        {field.status !== 'match' && field.websiteValue !== null && (
          <div className="value-row website-value">
            <span className="value-label">Website:</span>
            <span className="value-content">{formatValue(field.websiteValue)}</span>
          </div>
        )}
      </div>

      {field.notes && <div className="field-notes">{field.notes}</div>}

      {field.proposedFix !== undefined && field.status !== 'match' && field.status !== 'missing_from_website' && (
        <ProposedFix fix={field.proposedFix} />
      )}

      {onToggleReview && (
        <label className="review-toggle" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={!!reviewed} onChange={onToggleReview} />
          <span>Reviewed</span>
        </label>
      )}
    </div>
  );
}
