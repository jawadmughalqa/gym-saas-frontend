import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DatePickerProps {
  value?: string;          // ISO date string "YYYY-MM-DD"
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  minDate?: string;
  maxDate?: string;
  id?: string;
}

/**
 * Lightweight date picker — uses native <input type="date"> inside a Popover.
 * Accepts and returns ISO "YYYY-MM-DD" strings to stay compatible with Zod date schemas.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  className,
  clearable = true,
  minDate,
  maxDate,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const displayValue = React.useMemo(() => {
    if (!value) return null;
    const d = parseISO(value);
    return isValid(d) ? format(d, 'MMM d, yyyy') : null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{displayValue ?? placeholder}</span>
          {clearable && value && (
            <X
              className="ml-1 h-4 w-4 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(undefined);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-3" align="start">
        <input
          type="date"
          value={value ?? ''}
          min={minDate}
          max={maxDate}
          onChange={(e) => {
            onChange?.(e.target.value || undefined);
            setOpen(false);
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </PopoverContent>
    </Popover>
  );
}
