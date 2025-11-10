import React from 'react';

export interface CardIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'color' | 'fill'> {
  title: string;
  size: 12 | 16 | 20 | 24 | 32 | 36;
  primary?: string;   // Hex color for card background (default: #5A5F66)
  secondary?: string; // Hex color for chip and stripe (default: #F2F4F6)
  className?: string;
}

interface CardIconData {
  width: number;
  height: number;
  viewBox: string;
  elements: {
    card: React.ReactNode;
    chip: React.ReactNode;
    stripe: React.ReactNode;
  };
}

const cardIconRegistry: { [size: number]: CardIconData } = {
  12: {
    width: 12,
    height: 8,
    viewBox: '0 0 12 8',
    elements: {
      card: <rect key="card" width="12" height="8" rx="1" />,
      chip: <rect key="chip" x="1" y="3" width="3" height="1.8" rx="0.5" />,
      stripe: <rect key="stripe" x="1" y="6.2" width="8" height="0.6" rx="0.3" />
    }
  },
  16: {
    width: 16,
    height: 10,
    viewBox: '0 0 16 10',
    elements: {
      card: <rect key="card" x="0.75" width="14.5" height="9.32" rx="1.3" />,
      chip: <rect key="chip" x="1.79" y="3.11" width="3.11" height="2.07" rx="0.5" />,
      stripe: <rect key="stripe" x="2" y="7.15" width="9" height="0.7" rx="0.35" />
    }
  },
  20: {
    width: 18,
    height: 11,
    viewBox: '0 0 18 11',
    elements: {
      card: <rect key="card" width="18" height="11" rx="1.4" />,
      chip: <rect key="chip" x="2" y="4.1" width="4.5" height="2.7" rx="1" />,
      stripe: <rect key="stripe" x="2" y="9" width="11" height="0.8" rx="0.4" />
    }
  },
  24: {
    width: 22,
    height: 14,
    viewBox: '0 0 22 14',
    elements: {
      card: <rect key="card" width="22" height="14" rx="1.8" />,
      chip: <rect key="chip" x="2" y="5" width="5" height="3" rx="0.9" />,
      stripe: <rect key="stripe" x="2" y="11" width="13" height="1" rx="0.5" />
    }
  },
  32: {
    width: 30,
    height: 19,
    viewBox: '0 0 30 19',
    elements: {
      card: <rect key="card" width="30" height="19" rx="3" />,
      chip: <rect key="chip" x="3" y="7" width="7" height="5" rx="1.1" />,
      stripe: <rect key="stripe" x="3" y="15" width="19" height="1" rx="0.5" />
    }
  },
  36: {
    width: 32,
    height: 20,
    viewBox: '0 0 32 20',
    elements: {
      card: <rect key="card" width="32" height="20" rx="3" />,
      chip: <rect key="chip" x="3" y="7" width="7" height="5" rx="1.2" />,
      stripe: <rect key="stripe" x="3" y="16" width="21" height="1" rx="0.5" />
    }
  }
};

const CardIcon: React.FC<CardIconProps> = ({
  title,
  size,
  primary = '#5A5F66',
  secondary = '#F2F4F6',
  className = '',
  ...props
}) => {
  const cardData = cardIconRegistry[size];
  if (!cardData) {
    return null;
  }
  const titleId = `card-icon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width={cardData.width}
      height={cardData.height}
      viewBox={cardData.viewBox}
      role="img"
      aria-labelledby={titleId}
      {...props}
    >
      <title id={titleId}>{title}</title>
      {React.cloneElement(cardData.elements.card as React.ReactElement<React.SVGProps<SVGRectElement>>, { fill: primary })}
      {React.cloneElement(cardData.elements.chip as React.ReactElement<React.SVGProps<SVGRectElement>>, { fill: secondary })}
      {React.cloneElement(cardData.elements.stripe as React.ReactElement<React.SVGProps<SVGRectElement>>, { fill: secondary })}
    </svg>
  );
};

export default CardIcon;
export { CardIcon };

