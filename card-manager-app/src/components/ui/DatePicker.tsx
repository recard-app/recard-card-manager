import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse } from "date-fns"

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
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date",
  error,
  helperText,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Convert YYYY-MM-DD to Date object
  const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

  // Check if the date is valid
  const isValidDate = dateValue && !isNaN(dateValue.getTime())

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Convert Date to YYYY-MM-DD format
      onChange(format(date, "yyyy-MM-dd"))
    } else {
      onChange("")
    }
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !isValidDate && "text-muted-foreground",
              error && "border-red-500"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {isValidDate ? format(dateValue, "MM/dd/yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={isValidDate ? dateValue : undefined}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-sm text-gray-500">{helperText}</span>
      )}
    </div>
  )
}
