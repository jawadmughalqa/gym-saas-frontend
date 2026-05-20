/**
 * UserCombobox.tsx
 *
 * Reusable searchable user-picker built on shadcn Popover + Command.
 * Loads all staff users upfront (≤100) and filters client-side.
 *
 * Usage:
 *   <UserCombobox
 *     value={userId}
 *     onChange={(id) => field.onChange(id)}
 *     disabled={isPending}
 *   />
 */

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useGetStaff } from "@/api/generated/staff/staff";

// ─── Role badge colours ───────────────────────────────────────────────────────

const ROLE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  branch_manager: "default",
  staff: "secondary",
  trainer: "outline",
};

const ROLE_LABEL: Record<string, string> = {
  branch_manager: "Manager",
  staff: "Staff",
  trainer: "Trainer",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

interface UserComboboxProps {
  /** Currently selected user _id */
  value?: string;
  /** Called with the selected user's _id */
  onChange: (userId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserCombobox({
  value,
  onChange,
  disabled = false,
  placeholder = "Search users…",
}: UserComboboxProps) {
  const [open, setOpen] = useState(false);

  // Load all staff once; re-fetch only when the popover opens
  const { data, isLoading, isError } = useGetStaff(
    {},
    { query: { staleTime: 1000 * 60, enabled: true } },
  );

  // Orval wraps the response in data.data (SuccessResponse envelope)
  const users: StaffUser[] = (data as unknown as { data?: StaffUser[] })?.data ?? [];

  // Derive the display label for the trigger button
  const selected = users.find((u) => u._id === value);
  const triggerLabel = selected
    ? `${selected.firstName} ${selected.lastName}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          // Client-side filter: match against full name + email + role
          filter={(itemValue, search) => {
            const user = users.find((u) => u._id === itemValue);
            if (!user) return 0;
            const haystack =
              `${user.firstName} ${user.lastName} ${user.email} ${user.role}`.toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name, email or role…" />
          <CommandList>
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users…
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="py-6 text-center text-sm text-destructive">
                Failed to load users.
              </div>
            )}

            {/* Empty search result */}
            {!isLoading && !isError && (
              <CommandEmpty>No users found.</CommandEmpty>
            )}

            {/* User list */}
            {!isLoading && !isError && users.length > 0 && (
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user._id}
                    // value is the key used by Command's filter function
                    value={user._id}
                    onSelect={(selectedId) => {
                      onChange(selectedId);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 py-2.5"
                  >
                    {/* Selection checkmark */}
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === user._id ? "opacity-100" : "opacity-0",
                      )}
                    />

                    {/* Avatar initials */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </span>

                    {/* Name + email */}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>

                    {/* Role badge */}
                    <Badge
                      variant={ROLE_VARIANT[user.role] ?? "secondary"}
                      className="ml-auto shrink-0 text-xs"
                    >
                      {ROLE_LABEL[user.role] ?? user.role}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}