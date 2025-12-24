"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "./label"

interface ComboboxOption {
  value: string
  label: string
  secondaryText?: string // Optional secondary text displayed in muted color
}

interface ComboboxFieldProps {
  label?: string
  error?: string
  helperText?: string
  options: ComboboxOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  id?: string
  required?: boolean
}

export const ComboboxField = React.forwardRef<HTMLButtonElement, ComboboxFieldProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      value,
      onChange,
      placeholder = "Select...",
      searchPlaceholder = "Search...",
      emptyText = "No results found.",
      disabled,
      className,
      id,
      required,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const fieldId = id || React.useId()

    const selectedOption = options.find((option) => option.value === value)

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={fieldId}>
            {label}
            {required && (
              <span aria-hidden="true" className="ml-1 text-destructive">
                *
              </span>
            )}
          </Label>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={fieldId}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal",
                !value && "text-muted-foreground",
                error && "border-destructive",
                className
              )}
            >
              <span className="truncate">
                {selectedOption ? (
                  <>
                    {selectedOption.label}
                    {selectedOption.secondaryText && (
                      <span className="text-muted-foreground"> {selectedOption.secondaryText}</span>
                    )}
                  </>
                ) : placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.secondaryText ? `${option.label} ${option.secondaryText}` : option.label}
                      onSelect={() => {
                        onChange?.(option.value === value ? "" : option.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">
                        {option.label}
                        {option.secondaryText && (
                          <span className="text-muted-foreground"> {option.secondaryText}</span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {helperText && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
ComboboxField.displayName = "ComboboxField"
