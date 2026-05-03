import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, countryName } from "@/lib/countries";

// Searchable country picker built on top of the existing shadcn Command +
// Popover primitives. Returns an ISO-3166-1 alpha-2 code via onChange. Used
// for the residence country, KTN issuing country, redress issuing country,
// and passport issuing country fields on the guest booking page.
export function CountryCombobox({
  value,
  onChange,
  placeholder = "Select a country",
  ariaLabel,
  testId,
  hasError = false,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
  hasError?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = value ? countryName(value) : "";

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "w-full h-9 justify-between font-normal",
            !value && "text-muted-foreground",
            hasError && "border-red-400 focus-visible:ring-red-400",
          )}
        >
          <span className="truncate">{label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          // Filter on country name OR ISO code so power-users can type "GB"
          // and get United Kingdom without scrolling.
          filter={(itemValue, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return 1;
            return itemValue.toLowerCase().includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search countries…" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => {
                const itemValue = `${c.name} ${c.code}`;
                return (
                  <CommandItem
                    key={c.code}
                    value={itemValue}
                    onSelect={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                    data-testid={testId ? `${testId}-option-${c.code}` : undefined}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === c.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.code}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
