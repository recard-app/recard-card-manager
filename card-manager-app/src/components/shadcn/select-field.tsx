import * as React from "react"
import { Label } from "./label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"
import { cn } from "@/lib/utils"

interface SelectFieldProps {
  label?: string
  error?: string
  helperText?: string
  options: Array<{ value: string; label: string }>
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  required?: boolean
  clearable?: boolean
  clearLabel?: string
}

const CLEAR_VALUE = "__clear__"

export const SelectField = React.forwardRef<HTMLButtonElement, SelectFieldProps>(
  ({ label, error, helperText, options, value, onChange, placeholder = "Select...", disabled, className, id, required, clearable = false, clearLabel = "(None)" }, ref) => {
    const fieldId = id || React.useId()

    const handleValueChange = (newValue: string) => {
      if (newValue === CLEAR_VALUE) {
        onChange?.("")
      } else {
        onChange?.(newValue)
      }
    }

    // Use CLEAR_VALUE as the internal value when value is empty and clearable is true
    const internalValue = clearable && value === "" ? CLEAR_VALUE : value

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={fieldId}>
            {label}
            {required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
          </Label>
        )}
        <Select value={internalValue} onValueChange={handleValueChange} disabled={disabled}>
          <SelectTrigger
            ref={ref}
            id={fieldId}
            className={cn(error && "border-destructive", className)}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {clearable && (
              <SelectItem value={CLEAR_VALUE} className="text-muted-foreground italic">
                {clearLabel}
              </SelectItem>
            )}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {helperText && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
SelectField.displayName = "SelectField"
