import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';

interface DatePickerProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  minDate?: string;   // ISO "YYYY-MM-DD"
  maxDate?: string;   // ISO "YYYY-MM-DD"
  id?: string;
}

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

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const fromDate = minDate ? parseISO(minDate) : undefined;
  const toDate   = maxDate ? parseISO(maxDate)   : undefined;

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
          <span className="flex-1 truncate">
            {selected ? format(selected, 'MMM d, yyyy') : placeholder}
          </span>
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

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange?.(date ? format(date, 'yyyy-MM-dd') : undefined);
            setOpen(false);
          }}
          disabled={(date) => {
            if (fromDate && date < fromDate) return true;
            if (toDate   && date > toDate)   return true;
            return false;
          }}
          captionLayout="dropdown"
          defaultMonth={selected}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
