import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Filter, ChevronDown, Check } from 'lucide-react';

export function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: { value: T, label: React.ReactNode }[];
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContent = contentRef.current && !contentRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);

      if (isOutsideContent && isOutsideTrigger) {
        setOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <Popover open={open} onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className={cn(
            "h-9 gap-1.5",
            selected.length > 0
              ? "border border-slate-300 bg-slate-50 hover:bg-slate-100"
              : "border-dashed"
          )}
          onClick={(e) => {
            e.preventDefault();
            setOpen(!open);
          }}
        >
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs text-slate-600">{label}</span>
          <ChevronDown size={14} className="text-slate-400" />
          {selected.length > 0 && (
            <>
              <span className="mx-1 h-4 w-[1px] bg-slate-200" />
              <Badge variant="secondary" className="rounded-sm px-1.5 font-normal text-xs">
                {selected.length}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        className="w-[220px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <div
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-slate-900",
                  isSelected && "bg-slate-100"
                )}
                onClick={() => {
                  if (selected.includes(option.value)) {
                    const next = selected.filter(v => v !== option.value);
                    onChange(next);
                  } else {
                    onChange([...selected, option.value]);
                  }
                }}
              >
                <div className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-slate-400",
                  isSelected ? "bg-slate-900 text-slate-50 border-slate-900" : "[&_svg]:invisible"
                )}>
                  <Check className="h-3 w-3" />
                </div>
                {option.label}
              </div>
            );
          })}
        </div>
        {selected.length > 0 && (
          <>
            <div className="h-px bg-slate-200 my-1" />
            <div className="p-1">
              <Button
                variant="ghost"
                className="w-full justify-center h-8 text-xs"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
              >
                Clear filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
