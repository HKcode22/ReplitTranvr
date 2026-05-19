import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AirportAutocomplete } from "@/components/airport-autocomplete";
import { apiRequest } from "@/lib/queryClient";
import { formatSearchResultTime } from "@/lib/airportTimezone";
import { Loader2, Search, AlertCircle } from "lucide-react";

export interface FoundFlight {
  flightNumber: string;
  carrierIata: string;
  carrierName: string;
  originIata: string;
  destinationIata: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
}

interface FlightSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (flight: FoundFlight) => void;
}

export function FlightSearchModal({ open, onClose, onSelect }: FlightSearchModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<"route" | "flightNumber">("route");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routeDate, setRouteDate] = useState("");

  const [flightNumber, setFlightNumber] = useState("");
  const [fnDate, setFnDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FoundFlight[]>([]);
  const [message, setMessage] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!open) {
      setTab("route");
      setOrigin("");
      setDestination("");
      setRouteDate("");
      setFlightNumber("");
      setFnDate("");
      setLoading(false);
      setResults([]);
      setMessage("");
      setHasSearched(false);
    }
  }, [open]);

  useEffect(() => {
    setResults([]);
    setMessage("");
    setHasSearched(false);
  }, [tab]);

  const canSearchRoute = !!origin && !!destination && !!routeDate;
  const canSearchFlightNumber = !!flightNumber.trim() && !!fnDate;

  const handleSearch = async () => {
    setLoading(true);
    setMessage("");
    setResults([]);
    setHasSearched(true);
    try {
      const body =
        tab === "route"
          ? { mode: "route" as const, origin, destination, date: routeDate }
          : {
              mode: "flightNumber" as const,
              flightNumber: flightNumber.trim().toUpperCase(),
              date: fnDate,
            };
      const resp = await apiRequest("POST", "/api/agency/flights/search", body);
      const data: { flights: FoundFlight[]; message?: string } = await resp.json();
      const now = Date.now();
      const upcomingOnly = (data.flights || []).filter((f: FoundFlight) => {
        if (!f.departureTime) return true;
        try {
          const depMs = new Date(f.departureTime.replace(" ", "T")).getTime();
          return depMs > now - 30 * 60 * 1000; // keep flights departing within last 30min or future
        } catch {
          return true;
        }
      });
      setResults(upcomingOnly);
      if (upcomingOnly.length === 0 && (data.flights || []).length > 0) {
        setMessage("All flights on this route today have already departed. Try searching tomorrow's date.");
      } else {
        setMessage(data.message || "");
      }
    } catch (err: any) {
      setResults([]);
      setMessage(err?.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (flight: FoundFlight) => {
    onSelect(flight);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-flight-search">
        <SheetHeader>
          <SheetTitle>Find a Flight</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "route" | "flightNumber")} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="route" data-testid="tab-search-route">By Route</TabsTrigger>
            <TabsTrigger value="flightNumber" data-testid="tab-search-flight-number">By Flight Number</TabsTrigger>
          </TabsList>

          <TabsContent value="route" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-origin">Origin</Label>
              <AirportAutocomplete
                value={origin}
                onSelect={setOrigin}
                placeholder="City or airport (e.g. Chicago, ORD)"
                data-testid="input-search-origin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-destination">Destination</Label>
              <AirportAutocomplete
                value={destination}
                onSelect={setDestination}
                placeholder="City or airport (e.g. New York, JFK)"
                data-testid="input-search-destination"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-route-date">Date</Label>
              <Input
                id="search-route-date"
                type="date"
                min={todayStr}
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                data-testid="input-search-route-date"
              />
            </div>
            <Button
              className="w-full"
              disabled={!canSearchRoute || loading}
              onClick={handleSearch}
              data-testid="button-search-route"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Flights
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="flightNumber" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-flight-number">Flight number</Label>
              <Input
                id="search-flight-number"
                placeholder="e.g. UA487 or DL302"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                data-testid="input-search-flight-number"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-fn-date">Date</Label>
              <Input
                id="search-fn-date"
                type="date"
                min={todayStr}
                value={fnDate}
                onChange={(e) => setFnDate(e.target.value)}
                data-testid="input-search-fn-date"
              />
            </div>
            <Button
              className="w-full"
              disabled={!canSearchFlightNumber || loading}
              onClick={handleSearch}
              data-testid="button-search-flight-number"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Look Up Flight
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground" data-testid="flight-search-loading">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <div className="flex items-start gap-2 py-6 text-sm text-muted-foreground" data-testid="flight-search-empty">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{message || "No flights found."}</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2" data-testid="flight-search-results">
              <div className="text-xs text-muted-foreground mb-2">
                {results.length} flight{results.length === 1 ? "" : "s"} found
              </div>
              {results.map((f, idx) => {
                const cancelled = (f.status || "").toLowerCase() === "cancelled";
                return (
                  <Card key={`${f.flightNumber}-${idx}`} className="p-3" data-testid={`flight-result-${f.flightNumber}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{f.flightNumber}</span>
                          {cancelled && (
                            <span className="text-xs font-medium rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5">
                              Cancelled
                            </span>
                          )}
                        </div>
                        {f.carrierName && (
                          <div className="text-xs text-muted-foreground">{f.carrierName}</div>
                        )}
                      </div>
                      <div className="text-sm text-foreground">
                        <div className="font-medium tabular-nums">
                          {formatSearchResultTime(f.departureTime)} → {formatSearchResultTime(f.arrivalTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {f.originIata} → {f.destinationIata}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancelled}
                        onClick={() => handleSelect(f)}
                        data-testid={`button-select-flight-${f.flightNumber}`}
                      >
                        Select
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
