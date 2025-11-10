import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import './Select.scss';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className, ...props }, ref) => {
    return (
      <div className="select-wrapper">
        {label && <label className="select-label">{label}</label>}
        <select
          ref={ref}
          className={cn('select', error && 'select--error', className)}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helperText && <span className="select-helper">{helperText}</span>}
        {error && <span className="select-error">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
