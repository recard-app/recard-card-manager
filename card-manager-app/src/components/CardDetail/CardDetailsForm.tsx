import { Card } from '@/components/ui/Card';
import type { CreditCardDetails } from '@/types';
import { formatDate } from '@/utils/date-utils';
import './CardDetailsForm.scss';

interface CardDetailsFormProps {
  card: CreditCardDetails;
}

export function CardDetailsForm({ card }: CardDetailsFormProps) {
  return (
    <Card className="card-details-form">
      <h2>Card Details</h2>

      <div className="details-grid">
        <div className="detail-group">
          <h3>Basic Information</h3>
          <div className="detail-row">
            <span className="label">Card Name:</span>
            <span className="value">{card.CardName}</span>
          </div>
          <div className="detail-row">
            <span className="label">Card Issuer:</span>
            <span className="value">{card.CardIssuer}</span>
          </div>
          <div className="detail-row">
            <span className="label">Card Network:</span>
            <span className="value">{card.CardNetwork}</span>
          </div>
          <div className="detail-row">
            <span className="label">Version Name:</span>
            <span className="value">{card.VersionName}</span>
          </div>
        </div>

        <div className="detail-group">
          <h3>Fees</h3>
          <div className="detail-row">
            <span className="label">Annual Fee:</span>
            <span className="value">${card.AnnualFee ?? 0}</span>
          </div>
          <div className="detail-row">
            <span className="label">Foreign Exchange Fee:</span>
            <span className="value">{card.ForeignExchangeFee}</span>
          </div>
          <div className="detail-row">
            <span className="label">FX Fee Percentage:</span>
            <span className="value">{card.ForeignExchangeFeePercentage ?? 0}%</span>
          </div>
        </div>

        <div className="detail-group">
          <h3>Rewards</h3>
          <div className="detail-row">
            <span className="label">Rewards Currency:</span>
            <span className="value">{card.RewardsCurrency}</span>
          </div>
          <div className="detail-row">
            <span className="label">Points Per Dollar:</span>
            <span className="value">{card.PointsPerDollar ?? 0}x</span>
          </div>
        </div>

        <div className="detail-group">
          <h3>Version Information</h3>
          <div className="detail-row">
            <span className="label">Effective From:</span>
            <span className="value">{formatDate(card.effectiveFrom)}</span>
          </div>
          <div className="detail-row">
            <span className="label">Effective To:</span>
            <span className="value">
              {card.effectiveTo === '9999-12-31' ? 'Ongoing' : formatDate(card.effectiveTo)}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Last Updated:</span>
            <span className="value">{formatDate(card.lastUpdated)}</span>
          </div>
        </div>

        {card.CardDetails && (
          <div className="detail-group full-width">
            <h3>Additional Details</h3>
            <p className="card-details-text">{card.CardDetails}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
