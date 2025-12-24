import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Minus,
  HelpCircle,
} from 'lucide-react';
import { FieldComparisonCard } from './FieldComparisonCard';
import { ComponentComparisonTabs } from './ComponentComparisonTabs';
import type { ComparisonResponse } from '@/types/comparison-types';
import './ComparisonResults.scss';

interface ComparisonResultsProps {
  result: ComparisonResponse;
}

// Helper to count component statuses
function countComponentStatuses(
  items: { status: string }[]
): Record<string, number> {
  const counts: Record<string, number> = {
    match: 0,
    outdated: 0,
    questionable: 0,
    new: 0,
    missing: 0,
  };
  items.forEach((item) => {
    if (counts[item.status] !== undefined) {
      counts[item.status]++;
    }
  });
  return counts;
}

export function ComparisonResults({ result }: ComparisonResultsProps) {
  // Count card detail statuses
  const cardCounts = {
    match: result.cardDetails.filter((f) => f.status === 'match').length,
    mismatch: result.cardDetails.filter((f) => f.status === 'mismatch').length,
    questionable: result.cardDetails.filter((f) => f.status === 'questionable')
      .length,
    missing: result.cardDetails.filter(
      (f) => f.status === 'missing_from_website'
    ).length,
  };

  // Count component statuses
  const creditCounts = countComponentStatuses(result.credits);
  const perkCounts = countComponentStatuses(result.perks);
  const multiplierCounts = countComponentStatuses(result.multipliers);

  return (
    <div className="comparison-results">
      {/* Summary Section */}
      <div className="results-section summary-section">
        <div className="section-header">
          <h3>Analysis Summary</h3>
          <Badge variant="secondary" className="model-badge">
            {result.modelUsed}
          </Badge>
        </div>
        <p className="summary-text">{result.summary}</p>

        {/* Status Overview by Section */}
        <div className="status-overview">
          <h4>Status Overview</h4>

          {/* Card Details Row */}
          <div className="overview-row">
            <span className="overview-label">Card Details</span>
            <div className="overview-counts">
              {cardCounts.match > 0 && (
                <span className="overview-item match">
                  <CheckCircle size={14} /> {cardCounts.match}
                </span>
              )}
              {cardCounts.mismatch > 0 && (
                <span className="overview-item mismatch">
                  <XCircle size={14} /> {cardCounts.mismatch}
                </span>
              )}
              {cardCounts.questionable > 0 && (
                <span className="overview-item questionable">
                  <AlertTriangle size={14} /> {cardCounts.questionable}
                </span>
              )}
              {cardCounts.missing > 0 && (
                <span className="overview-item missing">
                  <HelpCircle size={14} /> {cardCounts.missing}
                </span>
              )}
              {cardCounts.match === 0 &&
                cardCounts.mismatch === 0 &&
                cardCounts.questionable === 0 &&
                cardCounts.missing === 0 && (
                  <span className="overview-item none">No fields</span>
                )}
            </div>
          </div>

          {/* Credits Row */}
          <div className="overview-row">
            <span className="overview-label">Credits</span>
            <div className="overview-counts">
              {creditCounts.match > 0 && (
                <span className="overview-item match">
                  <CheckCircle size={14} /> {creditCounts.match}
                </span>
              )}
              {creditCounts.outdated > 0 && (
                <span className="overview-item outdated">
                  <XCircle size={14} /> {creditCounts.outdated}
                </span>
              )}
              {creditCounts.questionable > 0 && (
                <span className="overview-item questionable">
                  <AlertTriangle size={14} /> {creditCounts.questionable}
                </span>
              )}
              {creditCounts.new > 0 && (
                <span className="overview-item new">
                  <Plus size={14} /> {creditCounts.new}
                </span>
              )}
              {creditCounts.missing > 0 && (
                <span className="overview-item missing">
                  <Minus size={14} /> {creditCounts.missing}
                </span>
              )}
              {result.credits.length === 0 && (
                <span className="overview-item none">None</span>
              )}
            </div>
          </div>

          {/* Perks Row */}
          <div className="overview-row">
            <span className="overview-label">Perks</span>
            <div className="overview-counts">
              {perkCounts.match > 0 && (
                <span className="overview-item match">
                  <CheckCircle size={14} /> {perkCounts.match}
                </span>
              )}
              {perkCounts.outdated > 0 && (
                <span className="overview-item outdated">
                  <XCircle size={14} /> {perkCounts.outdated}
                </span>
              )}
              {perkCounts.questionable > 0 && (
                <span className="overview-item questionable">
                  <AlertTriangle size={14} /> {perkCounts.questionable}
                </span>
              )}
              {perkCounts.new > 0 && (
                <span className="overview-item new">
                  <Plus size={14} /> {perkCounts.new}
                </span>
              )}
              {perkCounts.missing > 0 && (
                <span className="overview-item missing">
                  <Minus size={14} /> {perkCounts.missing}
                </span>
              )}
              {result.perks.length === 0 && (
                <span className="overview-item none">None</span>
              )}
            </div>
          </div>

          {/* Multipliers Row */}
          <div className="overview-row">
            <span className="overview-label">Multipliers</span>
            <div className="overview-counts">
              {multiplierCounts.match > 0 && (
                <span className="overview-item match">
                  <CheckCircle size={14} /> {multiplierCounts.match}
                </span>
              )}
              {multiplierCounts.outdated > 0 && (
                <span className="overview-item outdated">
                  <XCircle size={14} /> {multiplierCounts.outdated}
                </span>
              )}
              {multiplierCounts.questionable > 0 && (
                <span className="overview-item questionable">
                  <AlertTriangle size={14} /> {multiplierCounts.questionable}
                </span>
              )}
              {multiplierCounts.new > 0 && (
                <span className="overview-item new">
                  <Plus size={14} /> {multiplierCounts.new}
                </span>
              )}
              {multiplierCounts.missing > 0 && (
                <span className="overview-item missing">
                  <Minus size={14} /> {multiplierCounts.missing}
                </span>
              )}
              {result.multipliers.length === 0 && (
                <span className="overview-item none">None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Details Section */}
      <div className="results-section card-details-section">
        <div className="section-header">
          <h3>Card Details</h3>
          <div className="status-counts">
            {cardCounts.match > 0 && (
              <span className="count-badge match">{cardCounts.match} match</span>
            )}
            {cardCounts.mismatch > 0 && (
              <span className="count-badge mismatch">
                {cardCounts.mismatch} mismatch
              </span>
            )}
            {cardCounts.questionable > 0 && (
              <span className="count-badge questionable">
                {cardCounts.questionable} review
              </span>
            )}
            {cardCounts.missing > 0 && (
              <span className="count-badge missing">
                {cardCounts.missing} not found
              </span>
            )}
          </div>
        </div>
        <div className="fields-grid">
          {result.cardDetails.map((field, index) => (
            <FieldComparisonCard key={field.fieldName || index} field={field} />
          ))}
        </div>
      </div>

      {/* Components Section */}
      <div className="results-section components-section">
        <div className="section-header">
          <h3>Components</h3>
        </div>
        <ComponentComparisonTabs
          perks={result.perks}
          credits={result.credits}
          multipliers={result.multipliers}
        />
      </div>
    </div>
  );
}
