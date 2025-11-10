import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import './Button.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn--${variant}`, `btn--${size}`, className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
