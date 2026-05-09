import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * Debounced search input with a clear button.
 * Calls onChange only after the user stops typing for debounceMs.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  debounceMs = 300,
  className,
  disabled = false,
}: SearchInputProps) {
  // Internal state tracks keystrokes; external state receives debounced value
  const [local, setLocal] = useState(value);

  // Sync when external value resets (e.g. filter cleared from outside)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const id = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(id);
  }, [local, debounceMs, onChange]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-9 pr-9"
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setLocal(''); onChange(''); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
