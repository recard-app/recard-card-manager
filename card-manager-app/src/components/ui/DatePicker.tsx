import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"

import { Button } from "@/components/ui/Button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  label?: string
  value: string // Expected format: YYYY-MM-DD
  onChange: (value: string) => void // Returns format: YYYY-MM-DD
  placeholder?: string
  error?: string
  helperText?: string
  disabled?: boolean
  required?: boolean
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  error,
  helperText,
  disabled = false,
  required = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [formatWarning, setFormatWarning] = React.useState(false)

  // Convert YYYY-MM-DD to Date object
  const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

  // Check if the date is valid
  const isValidDate = dateValue && !isNaN(dateValue.getTime())

  // Track previous value to detect external changes
  const prevValueRef = React.useRef(value)
  
  // Update input value when value prop changes from external source
  React.useEffect(() => {
    // Always sync when value changes from outside (different from what we last knew)
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      if (isValidDate) {
        setInputValue(format(dateValue, "MM/dd/yyyy"))
        setFormatWarning(false)
      } else if (!value) {
        setInputValue("")
        setFormatWarning(false)
      }
    }
  }, [value, isValidDate, dateValue])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Convert Date to YYYY-MM-DD format
      onChange(format(date, "yyyy-MM-dd"))
      setInputValue(format(date, "MM/dd/yyyy"))
      setFormatWarning(false)
    } else {
      onChange("")
      setInputValue("")
      setFormatWarning(false)
    }
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (newValue === "") {
      onChange("")
      setFormatWarning(false)
      return
    }

    // Try to parse the input as MM/DD/YYYY
    const parsedDate = parse(newValue, "MM/dd/yyyy", new Date())

    if (isValid(parsedDate)) {
      // If valid, update the value
      onChange(format(parsedDate, "yyyy-MM-dd"))
      setFormatWarning(false)
    } else {
      // Show warning but don't change the input
      setFormatWarning(true)
    }
  }

  const handleInputBlur = () => {
    // Don't modify the input on blur, just keep the warning if invalid
  }

  // Calculate year range for dropdown (100 years ago to 10 years in the future)
  const currentYear = new Date().getFullYear()
  const fromYear = currentYear - 100
  const toYear = currentYear + 10

  const showHelper = !!helperText && !error && !formatWarning

  return (
    <div className={cn("flex flex-col gap-2", showHelper && "mb-4")}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span aria-hidden="true" className="ml-1 text-red-600">*</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-500"
            )}
          />
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 h-10 w-10"
              disabled={disabled}
              type="button"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={isValidDate ? dateValue : undefined}
            onSelect={handleSelect}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
      {formatWarning && !error && (
        <span className="text-sm text-amber-600">Please use format: MM/DD/YYYY</span>
      )}
      {showHelper && (
        <span className="text-sm text-gray-500">{helperText}</span>
      )}
    </div>
  )
}
