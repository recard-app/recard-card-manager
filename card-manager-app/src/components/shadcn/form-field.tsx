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
      <div className="space-y-2">
        {label && <Label htmlFor={fieldId}>{label}</Label>}
        <Input
          id={fieldId}
          ref={ref}
          className={cn(error && "border-destructive", className)}
          {...props}
        />
        {helperText && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
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
      <div className="space-y-2">
        {label && <Label htmlFor={fieldId}>{label}</Label>}
        <Textarea
          id={fieldId}
          ref={ref}
          className={cn(error && "border-destructive", className)}
          {...props}
        />
        {helperText && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
TextareaField.displayName = "TextareaField"
