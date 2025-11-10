import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import './Badge.scss';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({
  children,
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  return (
    <span className={cn('badge', `badge--${variant}`, className)} {...props}>
      {children}
    </span>
  );
}
