import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import './Card.scss';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({
  children,
  variant = 'default',
  className,
  ...props
}: CardProps) {
  return (
    <div className={cn('card', `card--${variant}`, className)} {...props}>
      {children}
    </div>
  );
}
