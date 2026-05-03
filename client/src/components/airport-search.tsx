import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Input } from "@/components/ui/input";
import { Plane, MapPin, Loader2 } from "lucide-react";

export interface AirportPlace {
  id: string;
  iataCode: string;
  name: string;
  cityName?: string;
  countryName?: string;
  type: string;
}

interface AirportSearchProps {
  value: string;
  onChange: (iataCode: string, place: AirportPlace | null) => void;
  placeholder?: string;
  initialLabel?: string;
  "data-testid"?: string;
}

export function AirportSearch({ value, onChange, placeholder, initialLabel, "data-testid": testId }: AirportSearchProps) {
  const [query, setQuery] = useState(initialLabel || "");
  const [displayValue, setDisplayValue] = useState(initialLabel || "");
  const [places, setPlaces] = useState<AirportPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<AirportPlace | null>(null);
  const [hasBootstrappedValue, setHasBootstrappedValue] = useState(!!initialLabel);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();
  const statusId = useId();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPlaces = useCallback(async (q: string) => {
    if (q.length < 2) {
      setPlaces([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/duffel/places?query=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPlaces(data.places || []);
        setActiveIndex(-1);
      }
    } catch {
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setDisplayValue(val);
    setIsOpen(true);
    setActiveIndex(-1);

    if (selectedPlace) {
      setSelectedPlace(null);
      onChange("", null);
    } else if (hasBootstrappedValue) {
      setHasBootstrappedValue(false);
      onChange("", null);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPlaces(val), 250);
  };

  const handleSelect = (place: AirportPlace) => {
    setSelectedPlace(place);
    const label = `${place.iataCode} - ${place.cityName || place.name}`;
    setDisplayValue(label);
    setQuery(label);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(place.iataCode, place);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && places.length > 0) setIsOpen(true);
      setActiveIndex((i) => (places.length === 0 ? -1 : (i + 1) % places.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen && places.length > 0) setIsOpen(true);
      setActiveIndex((i) => (places.length === 0 ? -1 : (i <= 0 ? places.length - 1 : i - 1)));
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < places.length) {
        e.preventDefault();
        handleSelect(places[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Home") {
      if (isOpen && places.length > 0) {
        e.preventDefault();
        setActiveIndex(0);
      }
    } else if (e.key === "End") {
      if (isOpen && places.length > 0) {
        e.preventDefault();
        setActiveIndex(places.length - 1);
      }
    }
  };

  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const el = listboxRef.current.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const activeOptionId = activeIndex >= 0 && places[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined;

  const statusText = isLoading
    ? "Searching airports"
    : isOpen && query.length >= 2 && places.length === 0
      ? "No airports found"
      : isOpen && places.length > 0
        ? `${places.length} airport${places.length === 1 ? "" : "s"} found. Use arrow keys to navigate.`
        : "";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={displayValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (places.length > 0 && !selectedPlace) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Search city or airport..."}
          data-testid={testId}
          className={selectedPlace ? "pr-8" : ""}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={placeholder || "Search city or airport"}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div id={statusId} role="status" aria-live="polite" className="sr-only">
        {statusText}
      </div>
      {isOpen && places.length > 0 && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label="Airport suggestions"
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto"
        >
          {places.map((place, idx) => {
            const optionId = `${listboxId}-option-${idx}`;
            const isActive = idx === activeIndex;
            return (
              <button
                key={place.id}
                id={optionId}
                type="button"
                role="option"
                aria-selected={isActive}
                data-option-index={idx}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm hover-elevate cursor-pointer ${isActive ? "bg-accent" : ""}`}
                onClick={() => handleSelect(place)}
                onMouseEnter={() => setActiveIndex(idx)}
                data-testid={`option-place-${place.iataCode}`}
              >
                {place.type === "airport" ? (
                  <Plane className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                ) : (
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{place.iataCode}</span>
                    <span className="text-sm truncate">{place.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {[place.cityName, place.countryName].filter(Boolean).join(", ")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {isOpen && query.length >= 2 && places.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-sm text-muted-foreground text-center">
          No airports found
        </div>
      )}
    </div>
  );
}
