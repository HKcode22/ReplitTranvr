import { useState, useRef, useEffect, useCallback } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    onChange(place.iataCode, place);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={displayValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (places.length > 0 && !selectedPlace) setIsOpen(true); }}
          placeholder={placeholder || "Search city or airport..."}
          data-testid={testId}
          className={selectedPlace ? "pr-8" : ""}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {isOpen && places.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {places.map((place) => (
            <button
              key={place.id}
              type="button"
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm hover-elevate cursor-pointer"
              onClick={() => handleSelect(place)}
              data-testid={`option-place-${place.iataCode}`}
            >
              {place.type === "airport" ? (
                <Plane className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
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
          ))}
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
