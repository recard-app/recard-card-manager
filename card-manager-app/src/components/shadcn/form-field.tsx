import * as React from "react"
import { Input } from "./input"
import { Label } from "./label"
import { Textarea } from "./textarea"
import { cn } from "@/lib/utils"

interface FormFieldProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string
  helperText?: string
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const fieldId = id || React.useId()

    return (
      <div className={cn("space-y-2", helperText && !error && "mb-4")}>
        {label && (
          <Label htmlFor={fieldId}>
            {label}
            {props.required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
          </Label>
        )}
        <Input
          id={fieldId}
          ref={ref}
          className={cn(error && "border-destructive", className)}
          {...props}
        />
        {helperText && (
          <p className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
FormField.displayName = "FormField"

interface TextareaFieldProps extends React.ComponentProps<"textarea"> {
  label?: string
  error?: string
  helperText?: string
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const fieldId = id || React.useId()

    return (
      <div className={cn("space-y-2", helperText && !error && "mb-4")}>
        {label && (
          <Label htmlFor={fieldId}>
            {label}
            {(props as any).required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
          </Label>
        )}
        <Textarea
          id={fieldId}
          ref={ref}
          className={cn(error && "border-destructive", className)}
          {...props}
        />
        {helperText && (
          <p className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
TextareaField.displayName = "TextareaField"

interface ColorPickerFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  error?: string
  helperText?: string
  placeholder?: string
  id?: string
}

export const ColorPickerField = ({
  label,
  value,
  onChange,
  error,
  helperText,
  placeholder,
  id,
}: ColorPickerFieldProps) => {
  const fieldId = id || React.useId()

  // Validate and normalize hex color for the color picker
  const normalizeHex = (hex: string): string => {
    const cleaned = hex.replace(/[^0-9A-Fa-f#]/g, '')
    if (/^#[0-9A-Fa-f]{6}$/i.test(cleaned)) {
      return cleaned
    }
    if (/^[0-9A-Fa-f]{6}$/i.test(cleaned)) {
      return `#${cleaned}`
    }
    return '#5A5F66' // Default fallback
  }

  return (
    <div className={cn("space-y-2", helperText && !error && "mb-4")}>
      {label && (
        <Label htmlFor={fieldId}>
          {label}
        </Label>
      )}
      <div className="color-picker-input-group">
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="color-picker-native"
          title="Pick a color"
        />
        <Input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("color-picker-text-input", error && "border-destructive")}
        />
      </div>
      {helperText && (
        <p className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
ColorPickerField.displayName = "ColorPickerField"
