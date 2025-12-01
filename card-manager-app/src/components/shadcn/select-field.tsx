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
}

export const SelectField = React.forwardRef<HTMLButtonElement, SelectFieldProps>(
  ({ label, error, helperText, options, value, onChange, placeholder = "Select...", disabled, className, id, required }, ref) => {
    const fieldId = id || React.useId()

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={fieldId}>
            {label}
            {required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
          </Label>
        )}
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger
            ref={ref}
            id={fieldId}
            className={cn(error && "border-destructive", className)}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
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
