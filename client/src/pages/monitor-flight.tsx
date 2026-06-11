import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatFlightTime } from "@/lib/airportTimezone";
import { liveStatusFor, liveStatusStyles, type FlightStatusSnapshot } from "@/lib/liveStatus";
import { AirportAutocomplete } from "@/components/airport-autocomplete";
import {
  Loader2, Plane, Plus, Trash2, Search, AlertCircle, BellRing, ShieldCheck, RefreshCw,
} from "lucide-react";

interface FoundFlight {
  flightNumber: string;
  carrierIata: string;
  carrierName: string;
  originIata: string;
  destinationIata: string;
  departureTime: string | null;
  arrivalTime: string | null;
  status: string;
}

interface UserMonitoredFlight {
  id: number;
  flightNumber: string;
  carrierIata: string;
  departureDate: string;
  departureTime: string | null;
  originIata: string;
  destinationIata: string;
  riskScore: number;
  riskTier: string;
  lastCheckedAt: string | null;
  redTierFirstAt: string | null;
  cancelledAt: string | null;
  resolvedStatus: string | null;
  resolvedDelayMinutes: number | null;
  resolvedAt: string | null;
  lastAlertedTier: string | null;
  flightStatus: FlightStatusSnapshot | null;
  status: string;
  createdAt: string;
}

function tierStyles(tier: string) {
  switch (tier) {
    case "red":
      return {
        wrap: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900",
        dot: "bg-red-500",
        label: "High",
      };
    case "amber":
      return {
        wrap: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
        dot: "bg-amber-500",
        label: "Moderate",
      };
    default:
      return {
        wrap: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
        dot: "bg-emerald-500",
        label: "Low",
      };
  }
}

function RiskBadge({ tier, score }: { tier: string; score: number }) {
  const s = tierStyles(tier);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.wrap}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label} · {score}
    </span>
  );
}

function LivePill({ snapshot, originIata }: { snapshot: FlightStatusSnapshot | null; originIata: string }) {
  const revised = formatFlightTime(snapshot?.departureTime ?? null, originIata);
  const live = liveStatusFor(snapshot, revised);
  if (!live) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        No live data
      </span>
    );
  }
  const styles = liveStatusStyles(live.tone);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.pillBg} ${styles.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.bar}`} />
      {live.label}
      {live.detail ? <span className="font-normal opacity-80"> · {live.detail}</span> : null}
    </span>
  );
}

function formatChecked(iso: string | null): string {
  if (!iso) return "Not yet checked";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatRedTierMeta(redTierFirstAt: string, cancelledAt: string | null): string {
  const redMs = new Date(redTierFirstAt).getTime();
  const diffMins = Math.round((Date.now() - redMs) / 60_000);
  const since = diffMins < 1 ? "just now" : diffMins < 60 ? `${diffMins}m ago` : fmtDuration(diffMins) + " ago";

  if (!cancelledAt) return `Flagged high risk ${since}`;

  const leadMins = Math.round((new Date(cancelledAt).getTime() - redMs) / 60_000);
  if (leadMins > 0) return `Flagged high risk ${since} · ${fmtDuration(leadMins)} before cancellation confirmed`;
  if (leadMins < 0) return `Flagged high risk ${since} · Cancellation confirmed ${fmtDuration(Math.abs(leadMins))} earlier`;
  return `Flagged high risk ${since}`;
}

function outcomeInfo(resolvedStatus: string | null, delayMinutes: number | null): { label: string; color: "green" | "amber" | "red" | "blue" } | null {
  switch (resolvedStatus) {
    case "Arrived":
      return delayMinutes && delayMinutes >= 15
        ? { label: `+${delayMinutes}m late`, color: "amber" }
        : { label: "On time", color: "green" };
    case "Delayed":
      return { label: delayMinutes ? `Delayed ${delayMinutes}m` : "Delayed", color: "amber" };
    case "Cancelled":
      return { label: "Cancelled", color: "red" };
    case "Diverted":
      return { label: "Diverted", color: "red" };
    case "EnRoute":
    case "Departed":
      return { label: "In flight", color: "blue" };
    default:
      return null;
  }
}

function OutcomeBadge({ resolvedStatus, delayMinutes }: { resolvedStatus: string | null; delayMinutes: number | null }) {
  const info = outcomeInfo(resolvedStatus, delayMinutes);
  if (!info) return null;
  const colorMap: Record<string, string> = {
    green: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
    red: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900",
    blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
  };
  const dotMap: Record<string, string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorMap[info.color]}`}>
      <span className={`h-2 w-2 rounded-full ${dotMap[info.color]}`} />
      {info.label}
    </span>
  );
}

export default function MonitorFlightPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"flightNumber" | "route">("flightNumber");
  const [fnNumber, setFnNumber] = useState("");
  const [fnDate, setFnDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [airlineFilter, setAirlineFilter] = useState("");
  const [searchResults, setSearchResults] = useState<FoundFlight[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const flightsQuery = useQuery<UserMonitoredFlight[]>({
    queryKey: ["/api/user/monitored-flights"],
    refetchInterval: 2 * 60 * 1000,
  });

  const flights = useMemo(() => flightsQuery.data || [], [flightsQuery.data]);
  const active = flights.filter((f) => f.status === "active");
  const past = flights.filter((f) => f.status !== "active");

  const addMutation = useMutation({
    mutationFn: async (flight: FoundFlight) => {
      let departureDate = searchMode === "flightNumber" ? fnDate : routeDate;
      let departureTime: string | null = null;
      if (flight.departureTime) {
        const dt = new Date(flight.departureTime);
        if (!isNaN(dt.getTime())) {
          departureDate = flight.departureTime.slice(0, 10);
          departureTime = flight.departureTime.slice(11, 16);
        } else if (flight.departureTime.includes("T")) {
          const [d, t] = flight.departureTime.split("T");
          departureDate = d;
          departureTime = t?.slice(0, 5) || null;
        }
      }
      const resp = await apiRequest("POST", "/api/user/monitored-flights", {
        flightNumber: flight.flightNumber,
        carrierIata: flight.carrierIata,
        departureDate,
        departureTime,
        originIata: flight.originIata,
        destinationIata: flight.destinationIata,
      });
      return resp.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user/monitored-flights"] });
      setSearchOpen(false);
      setSearchResults([]);
      toast({ title: "Flight added", description: "You'll get email updates when the risk level changes." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add flight", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/user/monitored-flights/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["/api/user/monitored-flights"] });
      const prev = qc.getQueryData<UserMonitoredFlight[]>(["/api/user/monitored-flights"]);
      qc.setQueryData<UserMonitoredFlight[]>(["/api/user/monitored-flights"], (old) => (old || []).filter((f) => f.id !== id));
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user/monitored-flights"] });
      toast({ title: "Flight removed" });
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["/api/user/monitored-flights"], ctx.prev);
      toast({ title: "Failed to remove flight", variant: "destructive" });
    },
  });

  async function handleSearch() {
    setSearchLoading(true);
    setSearchResults([]);
    setSearchMessage(null);
    try {
      const body = searchMode === "flightNumber"
        ? { mode: "flightNumber", flightNumber: fnNumber.trim().toUpperCase(), date: fnDate }
        : { mode: "route", origin: routeOrigin, destination: routeDestination, date: routeDate, airlineFilter: airlineFilter.trim() || undefined };
      const resp = await apiRequest("POST", "/api/user/flights/search", body);
      const data = await resp.json();
      setSearchResults(data.flights || []);
      setSearchMessage(data.message || null);
    } catch {
      setSearchMessage("Search failed. Check your connection and try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Monitor Flight</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track any flight and get email alerts when its risk score rises.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => flightsQuery.refetch()}
            disabled={flightsQuery.isFetching}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${flightsQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => { setSearchOpen(true); setSearchResults([]); setSearchMessage(null); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add flight
          </Button>
        </div>
      </div>

      {/* How it works strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: Search, title: "Search your flight", desc: "Find it by flight number or route." },
          { icon: BellRing, title: "We monitor it", desc: "Checked every 30 minutes for risk signals." },
          { icon: ShieldCheck, title: "Get email updates", desc: "Notified when risk level increases." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Flight search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Find a flight</DialogTitle>
          </DialogHeader>
          <Tabs value={searchMode} onValueChange={(v) => { setSearchMode(v as any); setSearchResults([]); setSearchMessage(null); }}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="flightNumber" className="flex-1">By flight number</TabsTrigger>
              <TabsTrigger value="route" className="flex-1">By route</TabsTrigger>
            </TabsList>
            <TabsContent value="flightNumber" className="space-y-3">
              <div>
                <Label>Flight number</Label>
                <Input value={fnNumber} onChange={(e) => setFnNumber(e.target.value.toUpperCase())} placeholder="e.g. UA487 or DL302" className="mt-1" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={fnDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setFnDate(e.target.value)} className="mt-1" />
              </div>
              <Button className="w-full" onClick={handleSearch} disabled={!fnNumber.trim() || !fnDate || searchLoading}>
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Look up flight
              </Button>
            </TabsContent>
            <TabsContent value="route" className="space-y-3">
              <div>
                <Label>Origin</Label>
                <div className="mt-1"><AirportAutocomplete value={routeOrigin} onSelect={setRouteOrigin} placeholder="City or airport (e.g. Chicago, ORD)" /></div>
              </div>
              <div>
                <Label>Destination</Label>
                <div className="mt-1"><AirportAutocomplete value={routeDestination} onSelect={setRouteDestination} placeholder="City or airport (e.g. New York, JFK)" /></div>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={routeDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setRouteDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Filter by airline <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={airlineFilter} onChange={(e) => setAirlineFilter(e.target.value)} placeholder="Airline code or name" className="mt-1" />
              </div>
              <Button className="w-full" onClick={handleSearch} disabled={!routeOrigin || !routeDestination || !routeDate || searchLoading}>
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Search flights
              </Button>
            </TabsContent>
          </Tabs>

          {searchMessage && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {searchMessage}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((flight, i) => {
                const cancelled = flight.status?.toLowerCase().includes("cancel");
                const alreadyAdded = flights.some(
                  (f) => f.flightNumber === flight.flightNumber &&
                    (f.departureDate === fnDate || f.departureDate === routeDate),
                );
                return (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{flight.flightNumber}</span>
                        <span className="text-muted-foreground text-xs truncate">{flight.carrierName}</span>
                        {cancelled && <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 rounded">Cancelled</span>}
                        {alreadyAdded && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Already monitoring</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {flight.originIata} → {flight.destinationIata}
                        {flight.departureTime && <span className="ml-2">{formatFlightTime(flight.departureTime, flight.originIata)}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cancelled || alreadyAdded || addMutation.isPending}
                      onClick={() => addMutation.mutate(flight)}
                    >
                      {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Monitor"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Active flights */}
      {flightsQuery.isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : active.length === 0 && past.length === 0 ? (
        <Card className="p-10 text-center">
          <Plane className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-base text-foreground">No flights monitored yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Add a flight above to start tracking its risk.</p>
          <Button className="mt-6" onClick={() => { setSearchOpen(true); setSearchResults([]); setSearchMessage(null); }}>
            <Plus className="h-4 w-4 mr-2" />Add flight
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Active</h2>
              <div className="space-y-3">
                {active.map((f) => (
                  <FlightCard key={f.id} flight={f} onDelete={() => deleteMutation.mutate(f.id)} deleting={deleteMutation.isPending} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-3">
                {past.map((f) => (
                  <FlightCard key={f.id} flight={f} onDelete={() => deleteMutation.mutate(f.id)} deleting={deleteMutation.isPending} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function FlightCard({ flight, onDelete, deleting }: { flight: UserMonitoredFlight; onDelete: () => void; deleting: boolean }) {
  const isPast = flight.status !== "active";
  return (
    <Card className={`p-4 ${isPast ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{flight.flightNumber}</span>
            <span className="text-sm text-muted-foreground">{flight.originIata} → {flight.destinationIata}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {flight.departureTime
                ? formatFlightTime(flight.departureTime, flight.originIata)
                : flight.departureDate}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <RiskBadge tier={flight.riskTier} score={flight.riskScore} />
            <LivePill snapshot={flight.flightStatus} originIata={flight.originIata} />
            {isPast && (
              <OutcomeBadge resolvedStatus={flight.resolvedStatus} delayMinutes={flight.resolvedDelayMinutes} />
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
            {!isPast && (
              <div>
                Last checked {formatChecked(flight.lastCheckedAt)}
                {flight.lastAlertedTier && (
                  <span className="ml-2 text-amber-600">· Alert sent ({tierStyles(flight.lastAlertedTier === "disrupted" ? "red" : flight.lastAlertedTier).label.toLowerCase()} risk)</span>
                )}
              </div>
            )}
            {!isPast && flight.redTierFirstAt && (
              <div className="text-red-600 dark:text-red-400">
                {formatRedTierMeta(flight.redTierFirstAt, flight.cancelledAt)}
              </div>
            )}
            {isPast && flight.resolvedAt && (
              <div>Resolved {formatChecked(flight.resolvedAt)}</div>
            )}
            {isPast && !flight.resolvedAt && (
              <div>Departed {flight.departureDate}</div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={deleting} className="shrink-0">
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
