import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Plane } from "lucide-react";
import { searchAirports, type AirportEntry } from "@/lib/airports";

interface AirportAutocompleteProps {
  value: string;
  onSelect: (iataCode: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function AirportAutocomplete({
  value,
  onSelect,
  placeholder = "City or airport (e.g. New York, JFK)",
  "data-testid": testId,
}: AirportAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [results, setResults] = useState<AirportEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (val: string) => {
    setInputValue(val);
    const found = searchAirports(val);
    setResults(found);
    setIsOpen(found.length > 0);
    if (!val.trim()) onSelect("");
  };

  const handleSelect = (airport: AirportEntry) => {
    setInputValue(`${airport.iata} — ${airport.city} (${airport.name})`);
    setIsOpen(false);
    setResults([]);
    onSelect(airport.iata);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        autoComplete="off"
      />
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {results.map((airport) => (
            <button
              key={airport.iata}
              type="button"
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm hover:bg-accent cursor-pointer"
              onClick={() => handleSelect(airport)}
            >
              <Plane className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{airport.iata}</span>
                  <span className="text-muted-foreground truncate">{airport.city}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{airport.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
