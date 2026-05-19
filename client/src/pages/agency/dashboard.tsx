import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { AirportAutocomplete } from "@/components/airport-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatFlightTime } from "@/lib/airportTimezone";
import { liveStatusFor, liveStatusStyles, type FlightStatusSnapshot } from "@/lib/liveStatus";
import {
  Loader2, Plane, Plus, Trash2, LogOut, RefreshCw, Activity, AlertTriangle, BellRing, CheckCircle2, X, Search, AlertCircle, ChevronDown, ChevronRight, Sparkles, Users, Target, TrendingDown,
} from "lucide-react";

interface AgencyMe {
  id: number;
  name: string;
  contactEmail: string;
  contactName: string;
}

interface AlternativeMini {
  id: number;
  flightNumber: string;
  carrierIata: string;
}

interface FoundFlight {
  flightNumber: string;
  carrierIata: string;
  carrierName: string;
  originIata: string;
  originName: string;
  destinationIata: string;
  destinationName: string;
  departureTime: string | null;
  arrivalTime: string | null;
  status: string;
}

interface FlightTravelerRow {
  id: number;
  travelerName: string;
  travelerEmail: string;
  travelerPhone: string | null;
  alertSentAt: string | null;
  selectedOptionId: string | null;
  selectedAt: string | null;
}

interface MonitoredFlightRow {
  id: number;
  flightNumber: string;
  carrierIata: string;
  departureDate: string;
  departureTime: string | null;
  originIata: string;
  destinationIata: string;
  riskScore: number;
  riskTier: "green" | "amber" | "red";
  lastCheckedAt: string | null;
  status: "active" | "completed" | "cancelled";
  agencyResolvedAt: string | null;
  alternatives?: AlternativeMini[];
  travelers: FlightTravelerRow[];
  flightStatus: FlightStatusSnapshot | null;
}

interface HealthPastRow {
  id: number;
  flightNumber: string;
  route: string;
  departureDate: string;
  peakScore: number;
  peakTier: string;
  actualStatus: string;
  actualDelayMinutes: number;
  actualCancelled: boolean;
  disrupted: boolean;
  classification: "true_positive" | "false_positive" | "false_negative" | "true_negative";
}

interface HealthActiveRow {
  id: number;
  flightNumber: string;
  route: string;
  departureDate: string;
  currentScore: number;
  currentTier: string;
  topSignals: Array<{ name: string; points: number }>;
}

// rawData is either the legacy array (older reports) or the new
// { past, activeHighRisk } object. Both shapes are rendered.
type HealthRawData =
  | HealthPastRow[]
  | { past: HealthPastRow[]; activeHighRisk: HealthActiveRow[] }
  | null;

interface HealthReport {
  id: number;
  generatedAt: string | null;
  flightsAnalyzed: number | null;
  flightsFlagged: number | null;
  truePositives: number | null;
  falsePositives: number | null;
  falseNegatives: number | null;
  trueNegatives: number | null;
  precision: number | null;
  recall: number | null;
  avgScoreDisrupted: number | null;
  avgScoreOnTime: number | null;
  claudeSummary: string | null;
  rawData: HealthRawData;
}

function getHealthSections(raw: HealthRawData): { past: HealthPastRow[]; activeHighRisk: HealthActiveRow[] } {
  if (!raw) return { past: [], activeHighRisk: [] };
  if (Array.isArray(raw)) return { past: raw, activeHighRisk: [] };
  return { past: raw.past || [], activeHighRisk: raw.activeHighRisk || [] };
}

function LiveStatusPill({ flight }: { flight: MonitoredFlightRow }) {
  const revisedLocal = formatFlightTime(flight.flightStatus?.departureTime, flight.originIata);
  const live = liveStatusFor(flight.flightStatus, revisedLocal);
  if (!live) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
        data-testid={`live-status-${flight.id}`}
        title="No live status yet — AeroDataBox hasn't returned anything for this flight."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        No live data
      </span>
    );
  }
  const styles = liveStatusStyles(live.tone);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.pillBg} ${styles.pill}`}
      data-testid={`live-status-${flight.id}`}
      title={live.subtitle || undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.bar}`} />
      {live.label}
      {live.detail ? <span className="font-normal opacity-80"> · {live.detail}</span> : null}
    </span>
  );
}

function tierStyles(tier: string): { wrap: string; dot: string; label: string } {
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

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never checked";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function formatUtcStamp(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function RiskBadge({ tier, score }: { tier: string; score: number }) {
  const styles = tierStyles(tier);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${styles.wrap}`}
      data-testid={`badge-risk-${tier}`}
    >
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      {styles.label} · {score}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  testId,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "amber" | "red" | "emerald";
  testId: string;
}) {
  const toneClasses =
    tone === "red"
      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
      : tone === "amber"
      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
      : tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
      : "text-foreground bg-muted";
  return (
    <Card className="p-4" data-testid={testId}>
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${toneClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold text-foreground tabular-nums mt-0.5">{value}</div>
        </div>
      </div>
    </Card>
  );
}

export default function AgencyDashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"route" | "flightNumber">("flightNumber");
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [fnNumber, setFnNumber] = useState("");
  const [fnDate, setFnDate] = useState(new Date().toISOString().slice(0, 10));
  const [airlineFilter, setAirlineFilter] = useState("");
  const [searchResults, setSearchResults] = useState<FoundFlight[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FoundFlight | null>(null);
  const [travelerSheetOpen, setTravelerSheetOpen] = useState(false);
  const [travelerName, setTravelerName] = useState("");
  const [travelerEmail, setTravelerEmail] = useState("");
  const [travelerPhone, setTravelerPhone] = useState("");
  const [travelerFilter, setTravelerFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("flights");
  const [expandedFlights, setExpandedFlights] = useState<Set<number>>(new Set());
  const [rescoring, setRescoring] = useState(false);
  const [healthGenerating, setHealthGenerating] = useState(false);

  const meQuery = useQuery<AgencyMe | null>({
    queryKey: ["/api/agency/auth/me"],
    queryFn: async () => {
      const r = await fetch("/api/agency/auth/me", { credentials: "include" });
      if (r.status === 401) return null;
      if (!r.ok) throw new Error("Failed to load agency");
      return r.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (!meQuery.isLoading && !meQuery.data) {
      setLocation("/agency/auth");
    }
  }, [meQuery.isLoading, meQuery.data, setLocation]);

  const flightsQuery = useQuery<MonitoredFlightRow[]>({
    queryKey: ["/api/agency/flights"],
    enabled: !!meQuery.data,
    refetchInterval: 2 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/agency/flights/${id}`);
    },
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["/api/agency/flights"] });
      const previous = qc.getQueryData<MonitoredFlightRow[]>(["/api/agency/flights"]);
      qc.setQueryData<MonitoredFlightRow[]>(["/api/agency/flights"], (old) =>
        (old || []).filter((f) => f.id !== id),
      );
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
      toast({ title: "Flight removed" });
    },
    onError: (err: any, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(["/api/agency/flights"], ctx.previous);
      }
      toast({
        title: "Failed to remove",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/agency/auth/logout", {});
    } catch {
      // ignore
    }
    setLocation("/agency/auth");
  };

  async function handleFlightSearch() {
    setSearchLoading(true);
    setSearchResults([]);
    setSearchMessage(null);
    try {
      const body = searchMode === "flightNumber"
        ? { mode: "flightNumber", flightNumber: fnNumber.trim().toUpperCase(), date: fnDate }
        : { mode: "route", origin: routeOrigin, destination: routeDestination, date: routeDate, airlineFilter: airlineFilter.trim() || undefined };
      const resp = await apiRequest("POST", "/api/agency/flights/search", body);
      const data = await resp.json();
      const rawFlights: FoundFlight[] = data.flights || [];
      // Fallback: if the API didn't return an originIata, infer it from the
      // user's search input so POST /api/agency/flights doesn't get rejected
      // with "Origin must be a 3-letter IATA code".
      const fallbackOrigin =
        searchMode === "route"
          ? routeOrigin.toUpperCase().trim()
          : fnNumber.trim().toUpperCase().slice(0, 2);
      const mappedFlights: FoundFlight[] = rawFlights.map((f) => ({
        ...f,
        originIata: (f.originIata && f.originIata.trim()) || fallbackOrigin,
      }));
      setSearchResults(mappedFlights);
      setSearchMessage(data.message || null);
    } catch {
      setSearchMessage("Search failed. Check your connection and try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSelectFlight(flight: FoundFlight) {
    setSelectedFlight(flight);
    setSearchOpen(false);
    setTravelerSheetOpen(true);
    setTravelerName("");
    setTravelerEmail("");
    setTravelerPhone("");
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFlight) throw new Error("No flight selected");

      // Parse departure date and time from the selectedFlight.departureTime
      let departureDate = fnDate || routeDate;
      let departureTime: string | null = null;
      if (selectedFlight.departureTime) {
        // Handle ISO string like "2026-05-18T17:11:00" or "2026-05-18T17:11:00+00:00"
        const dt = new Date(selectedFlight.departureTime);
        if (!isNaN(dt.getTime())) {
          departureDate = selectedFlight.departureTime.slice(0, 10);
          departureTime = selectedFlight.departureTime.slice(11, 16); // "HH:MM"
        } else if (selectedFlight.departureTime.includes("T")) {
          const parts = selectedFlight.departureTime.split("T");
          departureDate = parts[0];
          departureTime = parts[1]?.slice(0, 5) || null;
        }
      }

      const resp = await apiRequest("POST", "/api/agency/flights", {
        flightNumber: selectedFlight.flightNumber,
        carrierIata: selectedFlight.carrierIata,
        departureDate,
        departureTime,
        originIata: selectedFlight.originIata,
        destinationIata: selectedFlight.destinationIata,
        travelerName: travelerName.trim(),
        travelerEmail: travelerEmail.trim(),
        travelerPhone: travelerPhone.trim() || undefined,
      });
      return resp.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
      setTravelerSheetOpen(false);
      setSelectedFlight(null);
      if (data?.existingFlight) {
        toast({ title: "Traveler added to existing monitored flight" });
      } else {
        toast({ title: "Flight added", description: "Monitoring is now active." });
      }
    },
    onError: (err: any) => {
      toast({ title: "Failed to add flight", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  async function handleRescoreAll() {
    const flights = flightsQuery.data || [];
    if (flights.length === 0) {
      flightsQuery.refetch();
      return;
    }
    setRescoring(true);
    try {
      await Promise.allSettled(
        flights.map((f) =>
          apiRequest("POST", `/api/agency/flights/${f.id}/rescore`, {}).catch((err) => {
            console.warn(`Rescore failed for flight ${f.id}:`, err);
          }),
        ),
      );
      await qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
    } finally {
      setRescoring(false);
    }
  }

  const healthQuery = useQuery<{ report: HealthReport | null }>({
    queryKey: ["/api/agency/health-report/latest"],
    enabled: !!meQuery.data && activeTab === "health",
    refetchOnWindowFocus: false,
  });

  async function handleGenerateHealth() {
    setHealthGenerating(true);
    try {
      const resp = await apiRequest("POST", "/api/agency/health-report", {});
      await resp.json();
      await qc.invalidateQueries({ queryKey: ["/api/agency/health-report/latest"] });
      toast({ title: "Health report generated" });
    } catch (err: any) {
      toast({
        title: "Failed to generate report",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setHealthGenerating(false);
    }
  }

  function toggleExpanded(id: number) {
    setExpandedFlights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allFlights: MonitoredFlightRow[] = useMemo(
    () => flightsQuery.data || [],
    [flightsQuery.data],
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  function flightLatestAlertAt(f: MonitoredFlightRow): string | null {
    let latest: string | null = null;
    for (const t of f.travelers || []) {
      if (!t.alertSentAt) continue;
      if (!latest || t.alertSentAt > latest) latest = t.alertSentAt;
    }
    return latest;
  }

  const stats = useMemo(() => {
    const todayLocal = new Date();
    const todayLocalStr = todayLocal.toISOString().slice(0, 10);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const total = allFlights.length;
    const atRisk = allFlights.filter(
      (f) => f.riskTier === "amber" || f.riskTier === "red",
    ).length;
    const alertsToday = allFlights.filter((f) => {
      const latest = flightLatestAlertAt(f);
      if (!latest) return false;
      const sent = new Date(latest);
      if (Number.isNaN(sent.getTime())) return false;
      return sent.toISOString().slice(0, 10) === todayLocalStr;
    }).length;
    const resolvedThisWeek = allFlights.filter((f) => {
      if (!f.agencyResolvedAt) return false;
      const resolved = new Date(f.agencyResolvedAt).getTime();
      if (Number.isNaN(resolved)) return false;
      return resolved >= sevenDaysAgo;
    }).length;

    return { total, atRisk, alertsToday, resolvedThisWeek };
  }, [allFlights]);

  const travelers = useMemo(() => {
    const map = new Map<
      string,
      {
        email: string;
        name: string;
        phone: string | null;
        count: number;
        latestDeparture: string;
      }
    >();
    for (const f of allFlights) {
      for (const t of f.travelers || []) {
        const key = t.travelerEmail.toLowerCase();
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            email: t.travelerEmail,
            name: t.travelerName,
            phone: t.travelerPhone,
            count: 1,
            latestDeparture: f.departureDate,
          });
        } else {
          existing.count += 1;
          if (f.departureDate > existing.latestDeparture) {
            existing.latestDeparture = f.departureDate;
          }
          if (!existing.phone && t.travelerPhone) existing.phone = t.travelerPhone;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allFlights]);

  const alerts = useMemo(() => {
    return allFlights
      .filter((f) => !!flightLatestAlertAt(f))
      .sort((a, b) => {
        const aT = new Date(flightLatestAlertAt(a) || 0).getTime();
        const bT = new Date(flightLatestAlertAt(b) || 0).getTime();
        return bT - aT;
      });
  }, [allFlights]);

  const filteredFlights = useMemo(() => {
    if (!travelerFilter) return allFlights;
    const norm = travelerFilter.toLowerCase();
    return allFlights.filter((f) =>
      (f.travelers || []).some((t) => t.travelerEmail.toLowerCase() === norm),
    );
  }, [allFlights, travelerFilter]);

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!meQuery.data) return null;

  const selectionLabel = (f: MonitoredFlightRow): string => {
    const travelers = f.travelers || [];
    if (travelers.length === 0) return "No travelers";
    const selected = travelers.filter((t) => !!t.selectedOptionId);
    if (selected.length === 0) return "Pending response";
    const labelFor = (opt: string | null): string => {
      if (!opt) return "—";
      if (opt === "keep_original") return "Kept original";
      const alt = (f.alternatives || []).find((a) => String(a.id) === String(opt));
      return alt ? alt.flightNumber : `Option #${opt}`;
    };
    if (selected.length === 1) return labelFor(selected[0].selectedOptionId);
    const labels = Array.from(new Set(selected.map((t) => labelFor(t.selectedOptionId))));
    return labels.length === 1 ? labels[0] : labels.join(", ");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Plane className="h-5 w-5" />
          <span className="hidden sm:inline">Travnr for Agencies</span>
          <span className="sm:hidden">Travnr</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-agency-name">
            {meQuery.data.name}
          </span>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-agency-logout">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Monitored flights</h1>
            <p className="text-sm text-muted-foreground mt-1">
              We check each flight every 30 minutes and alert your travelers when risk crosses red.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRescoreAll}
              disabled={rescoring || flightsQuery.isFetching}
              data-testid="button-refresh-flights"
              title="Rescore all flights"
            >
              <RefreshCw className={`h-4 w-4 ${rescoring || flightsQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={() => { setSearchOpen(true); setSearchResults([]); setSearchMessage(null); }}
              data-testid="button-add-flight"
            >
              <Plus className="w-4 h-4 mr-1" /> Add flight
            </Button>
          </div>
        </div>

        {/* Step 1: Flight search dialog */}
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
                  <Input
                    value={fnNumber}
                    onChange={(e) => setFnNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. UA487 or DL302"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={fnDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setFnDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleFlightSearch}
                  disabled={!fnNumber.trim() || !fnDate || searchLoading}
                >
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Look up flight
                </Button>
              </TabsContent>

              <TabsContent value="route" className="space-y-3">
                <div>
                  <Label>Origin</Label>
                  <div className="mt-1">
                    <AirportAutocomplete
                      value={routeOrigin}
                      onSelect={setRouteOrigin}
                      placeholder="City or airport (e.g. Chicago, ORD)"
                    />
                  </div>
                </div>
                <div>
                  <Label>Destination</Label>
                  <div className="mt-1">
                    <AirportAutocomplete
                      value={routeDestination}
                      onSelect={setRouteDestination}
                      placeholder="City or airport (e.g. New York, JFK)"
                    />
                  </div>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={routeDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setRouteDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Filter by airline <span className="text-muted-foreground text-xs">(optional — e.g. UA, Delta)</span></Label>
                  <Input
                    value={airlineFilter}
                    onChange={(e) => setAirlineFilter(e.target.value)}
                    placeholder="Airline code or name"
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleFlightSearch}
                  disabled={!routeOrigin || !routeDestination || !routeDate || searchLoading}
                >
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Search flights
                </Button>
              </TabsContent>
            </Tabs>

            {/* Results */}
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
                  return (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{flight.flightNumber}</span>
                          <span className="text-muted-foreground text-xs truncate">{flight.carrierName}</span>
                          {cancelled && (
                            <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 rounded">Cancelled</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {flight.originIata} → {flight.destinationIata}
                          {flight.departureTime && (
                            <span className="ml-2">
                              {formatFlightTime(flight.departureTime, flight.originIata)}
                              {flight.arrivalTime && (
                                <> → {formatFlightTime(flight.arrivalTime, flight.originIata)}</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cancelled}
                        onClick={() => handleSelectFlight(flight)}
                      >
                        Select
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Step 2: Traveler details sheet */}
        <Sheet open={travelerSheetOpen} onOpenChange={(open) => { if (!open) { setTravelerSheetOpen(false); setSelectedFlight(null); } }}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add traveler details</SheetTitle>
            </SheetHeader>
            {selectedFlight && (
              <div className="mt-4 p-3 bg-muted rounded-lg mb-4">
                <div className="font-semibold text-sm">
                  {selectedFlight.flightNumber}
                </div>
                <div className="text-base font-medium mt-1 tabular-nums">
                  {selectedFlight.originIata || "—"} → {selectedFlight.destinationIata || "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedFlight.carrierName}
                  {selectedFlight.departureTime && (
                    <span className="ml-2">
                      {formatFlightTime(selectedFlight.departureTime, selectedFlight.originIata)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-4 mt-2">
              <div>
                <Label>Traveler name</Label>
                <Input value={travelerName} onChange={(e) => setTravelerName(e.target.value)} placeholder="Full name" className="mt-1" />
              </div>
              <div>
                <Label>Traveler email</Label>
                <Input type="email" value={travelerEmail} onChange={(e) => setTravelerEmail(e.target.value)} placeholder="email@example.com" className="mt-1" />
              </div>
              <div>
                <Label>Traveler phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={travelerPhone} onChange={(e) => setTravelerPhone(e.target.value)} placeholder="+1 555 000 0000" className="mt-1" />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!travelerName.trim() || !travelerEmail.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Start monitoring
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total monitored"
            value={stats.total}
            icon={Activity}
            tone="default"
            testId="stat-total-monitored"
          />
          <StatCard
            label="At risk now"
            value={stats.atRisk}
            icon={AlertTriangle}
            tone="amber"
            testId="stat-at-risk"
          />
          <StatCard
            label="Alerts sent today"
            value={stats.alertsToday}
            icon={BellRing}
            tone="red"
            testId="stat-alerts-today"
          />
          <StatCard
            label="Resolved this week"
            value={stats.resolvedThisWeek}
            icon={CheckCircle2}
            tone="emerald"
            testId="stat-resolved-week"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
            <TabsTrigger value="flights" data-testid="tab-flights">Flights</TabsTrigger>
            <TabsTrigger value="travelers" data-testid="tab-travelers">Travelers</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
            <TabsTrigger value="health" data-testid="tab-health">Health</TabsTrigger>
          </TabsList>

          <TabsContent value="flights" className="mt-4">
            {travelerFilter && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filtered by:</span>
                <span className="inline-flex items-center gap-2 rounded-full border bg-muted px-2.5 py-1 text-foreground">
                  {travelerFilter}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setTravelerFilter(null)}
                    data-testid="button-clear-traveler-filter"
                    aria-label="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            )}

            {flightsQuery.isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFlights.length === 0 ? (
              <Card className="p-10 text-center" data-testid="empty-state-flights">
                <p className="text-base text-foreground">
                  {travelerFilter ? "No flights for this traveler." : "No flights being monitored."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {travelerFilter ? "Try clearing the filter." : "Add your first flight to get started."}
                </p>
                {!travelerFilter && (
                  <Button className="mt-6" onClick={() => { setSearchOpen(true); setSearchResults([]); setSearchMessage(null); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add flight
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <div className="hidden md:block">
                  <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="w-8" />
                          <th className="text-left font-medium px-4 py-3">Flight</th>
                          <th className="text-left font-medium px-4 py-3">Route</th>
                          <th className="text-left font-medium px-4 py-3">Departure</th>
                          <th className="text-left font-medium px-4 py-3">Travelers</th>
                          <th className="text-left font-medium px-4 py-3">Risk</th>
                          <th className="text-left font-medium px-4 py-3">Live</th>
                          <th className="text-left font-medium px-4 py-3">Last checked</th>
                          <th className="text-left font-medium px-4 py-3">Status</th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFlights.map((f) => {
                          const expanded = expandedFlights.has(f.id);
                          const latestAlert = flightLatestAlertAt(f);
                          const names = (f.travelers || []).map((t) => t.travelerName);
                          const namesLabel =
                            names.length === 0
                              ? "—"
                              : names.length <= 2
                              ? names.join(", ")
                              : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
                          return (
                            <Fragment key={f.id}>
                              <tr
                                className="border-t border-border hover:bg-muted/30"
                                data-testid={`row-flight-${f.id}`}
                              >
                                <td className="px-2 py-3">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); toggleExpanded(f.id); }}
                                    aria-label={expanded ? "Collapse" : "Expand"}
                                    data-testid={`button-expand-${f.id}`}
                                  >
                                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </Button>
                                </td>
                                <td
                                  className="px-4 py-3 font-medium text-foreground cursor-pointer"
                                  onClick={() => setLocation(`/agency/flights/${f.id}`)}
                                >
                                  {f.flightNumber}
                                </td>
                                <td
                                  className="px-4 py-3 text-foreground cursor-pointer"
                                  onClick={() => setLocation(`/agency/flights/${f.id}`)}
                                >
                                  {f.originIata} → {f.destinationIata}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {f.departureTime
                                    ? formatFlightTime(f.departureTime, f.originIata)
                                    : f.departureDate}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-xs tabular-nums">{names.length}</span>
                                    <span className="text-muted-foreground">{namesLabel}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3"><RiskBadge tier={f.riskTier} score={f.riskScore} /></td>
                                <td className="px-4 py-3"><LiveStatusPill flight={f} /></td>
                                <td className="px-4 py-3 text-muted-foreground">{formatUtcStamp(f.lastCheckedAt)}</td>
                                <td className="px-4 py-3 text-muted-foreground capitalize">
                                  {f.status}
                                  {latestAlert ? <span className="ml-1 text-xs text-amber-600">· alerted</span> : null}
                                </td>
                                <td className="px-2 py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(f.id); }}
                                    disabled={deleteMutation.isPending}
                                    data-testid={`button-remove-flight-${f.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                              {expanded && (
                                <tr className="border-t border-border bg-muted/20">
                                  <td colSpan={10} className="px-4 py-3">
                                    {(f.travelers || []).length === 0 ? (
                                      <div className="text-sm text-muted-foreground">No travelers on this booking.</div>
                                    ) : (
                                      <div className="space-y-2">
                                        {(f.travelers || []).map((t) => (
                                          <div
                                            key={t.id}
                                            className="flex items-center justify-between gap-3 text-sm"
                                            data-testid={`row-flight-${f.id}-traveler-${t.id}`}
                                          >
                                            <div className="min-w-0">
                                              <div className="font-medium text-foreground">{t.travelerName}</div>
                                              <div className="text-muted-foreground">{t.travelerEmail}{t.travelerPhone ? ` · ${t.travelerPhone}` : ""}</div>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {t.alertSentAt
                                                ? <span className="text-amber-600">Alert sent {formatUtcStamp(t.alertSentAt)}</span>
                                                : <span>No alert yet</span>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                </div>

                <div className="md:hidden space-y-3">
                  {filteredFlights.map((f) => {
                    const expanded = expandedFlights.has(f.id);
                    const latestAlert = flightLatestAlertAt(f);
                    const names = (f.travelers || []).map((t) => t.travelerName);
                    return (
                      <Card key={f.id} className="p-4" data-testid={`card-flight-${f.id}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1" onClick={() => setLocation(`/agency/flights/${f.id}`)}>
                            <div className="font-medium text-foreground">{f.flightNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {f.originIata} → {f.destinationIata} ·{" "}
                              {f.departureTime
                                ? formatFlightTime(f.departureTime, f.originIata)
                                : f.departureDate}
                            </div>
                            <div className="text-sm text-foreground mt-2 flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-xs tabular-nums">{names.length}</span>
                              <span className="truncate">{names.join(", ") || "—"}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatUtcStamp(f.lastCheckedAt)} · <span className="capitalize">{f.status}</span>
                              {latestAlert ? <span className="ml-1 text-amber-600">· alerted</span> : null}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <RiskBadge tier={f.riskTier} score={f.riskScore} />
                            <LiveStatusPill flight={f} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); toggleExpanded(f.id); }}
                              aria-label={expanded ? "Collapse" : "Expand"}
                            >
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(f.id); }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        {expanded && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            {(f.travelers || []).length === 0 ? (
                              <div className="text-sm text-muted-foreground">No travelers on this booking.</div>
                            ) : (
                              (f.travelers || []).map((t) => (
                                <div key={t.id} className="text-sm">
                                  <div className="font-medium text-foreground">{t.travelerName}</div>
                                  <div className="text-muted-foreground text-xs">{t.travelerEmail}{t.travelerPhone ? ` · ${t.travelerPhone}` : ""}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {t.alertSentAt
                                      ? <span className="text-amber-600">Alert sent {formatUtcStamp(t.alertSentAt)}</span>
                                      : <span>No alert yet</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="travelers" className="mt-4">
            {flightsQuery.isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : travelers.length === 0 ? (
              <Card className="p-10 text-center" data-testid="empty-state-travelers">
                <p className="text-base text-foreground">No travelers yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Add a flight to see travelers here.</p>
              </Card>
            ) : (
              <>
                <div className="hidden md:block">
                  <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium px-4 py-3">Name</th>
                          <th className="text-left font-medium px-4 py-3">Email</th>
                          <th className="text-left font-medium px-4 py-3">Phone</th>
                          <th className="text-left font-medium px-4 py-3">Flights</th>
                          <th className="text-left font-medium px-4 py-3">Latest departure</th>
                        </tr>
                      </thead>
                      <tbody>
                        {travelers.map((t) => (
                          <tr
                            key={t.email}
                            className="border-t border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => {
                              setTravelerFilter(t.email);
                              setActiveTab("flights");
                            }}
                            data-testid={`row-traveler-${t.email}`}
                          >
                            <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.phone || "—"}</td>
                            <td className="px-4 py-3 text-foreground tabular-nums">{t.count}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.latestDeparture}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </div>

                <div className="md:hidden space-y-3">
                  {travelers.map((t) => (
                    <Card
                      key={t.email}
                      className="p-4 cursor-pointer"
                      onClick={() => {
                        setTravelerFilter(t.email);
                        setActiveTab("flights");
                      }}
                      data-testid={`card-traveler-${t.email}`}
                    >
                      <div className="font-medium text-foreground">{t.name}</div>
                      <div className="text-sm text-muted-foreground">{t.email}</div>
                      {t.phone && <div className="text-sm text-muted-foreground">{t.phone}</div>}
                      <div className="text-xs text-muted-foreground mt-2">
                        {t.count} flight{t.count === 1 ? "" : "s"} · latest {t.latestDeparture}
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            {flightsQuery.isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <Card className="p-10 text-center" data-testid="empty-state-alerts">
                <p className="text-base text-foreground">No alerts have been sent yet.</p>
              </Card>
            ) : (
              <>
                <div className="hidden md:block">
                  <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium px-4 py-3">Flight</th>
                          <th className="text-left font-medium px-4 py-3">Route</th>
                          <th className="text-left font-medium px-4 py-3">Travelers</th>
                          <th className="text-left font-medium px-4 py-3">Sent</th>
                          <th className="text-left font-medium px-4 py-3">Response</th>
                          <th className="text-left font-medium px-4 py-3">Resolved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map((f) => {
                          const latestAlert = flightLatestAlertAt(f);
                          const alertedNames = (f.travelers || [])
                            .filter((t) => !!t.alertSentAt)
                            .map((t) => t.travelerName);
                          const namesLabel =
                            alertedNames.length === 0
                              ? "—"
                              : alertedNames.length <= 2
                              ? alertedNames.join(", ")
                              : `${alertedNames.slice(0, 2).join(", ")} +${alertedNames.length - 2}`;
                          return (
                            <tr
                              key={f.id}
                              className="border-t border-border hover:bg-muted/30 cursor-pointer"
                              onClick={() => setLocation(`/agency/flights/${f.id}`)}
                              data-testid={`row-alert-${f.id}`}
                            >
                              <td className="px-4 py-3 font-medium text-foreground">{f.flightNumber}</td>
                              <td className="px-4 py-3 text-foreground">
                                {f.originIata} → {f.destinationIata}
                              </td>
                              <td className="px-4 py-3 text-foreground">{namesLabel}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatUtcStamp(latestAlert)}
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {selectionLabel(f)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {f.agencyResolvedAt ? formatUtcStamp(f.agencyResolvedAt) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                </div>

                <div className="md:hidden space-y-3">
                  {alerts.map((f) => {
                    const latestAlert = flightLatestAlertAt(f);
                    const alertedNames = (f.travelers || [])
                      .filter((t) => !!t.alertSentAt)
                      .map((t) => t.travelerName)
                      .join(", ");
                    return (
                      <Card
                        key={f.id}
                        className="p-4 cursor-pointer"
                        onClick={() => setLocation(`/agency/flights/${f.id}`)}
                        data-testid={`card-alert-${f.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{f.flightNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {f.originIata} → {f.destinationIata}
                            </div>
                            <div className="text-sm text-foreground mt-1">{alertedNames || "—"}</div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Sent {formatUtcStamp(latestAlert)} · {selectionLabel(f)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {f.agencyResolvedAt
                                ? `Resolved ${formatUtcStamp(f.agencyResolvedAt)}`
                                : "Not resolved"}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="health" className="mt-4">
            {(() => {
              const report = healthQuery.data?.report || null;
              const fmtPct = (n: number | null): string =>
                n === null || n === undefined ? "N/A" : `${(n * 100).toFixed(1)}%`;
              const classifBadge = (c: string): { label: string; cls: string } => {
                switch (c) {
                  case "true_positive":
                    return { label: "True Positive", cls: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900" };
                  case "false_positive":
                    return { label: "False Positive", cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900" };
                  case "false_negative":
                    return { label: "False Negative", cls: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900" };
                  default:
                    return { label: "True Negative", cls: "bg-muted text-muted-foreground border-border" };
                }
              };
              const actualLabel = (row: HealthPastRow): string => {
                if (row.actualCancelled) return "Cancelled";
                if (row.actualDelayMinutes >= 30) return `Delayed ${row.actualDelayMinutes}min`;
                return "On time";
              };
              const { past: pastRows, activeHighRisk: activeRows } = getHealthSections(report?.rawData ?? null);

              return (
                <div className="space-y-6" data-testid="health-tab-content">
                  <Card className="p-6">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">System Health Report</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Analyzes prediction accuracy across all monitored flights that have already departed.
                        </p>
                        {report?.generatedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last generated: {formatUtcStamp(report.generatedAt)}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={handleGenerateHealth}
                        disabled={healthGenerating}
                        data-testid="button-run-health-check"
                      >
                        {healthGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Analyzing flights...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {report ? "Refresh" : "Run Health Check"}
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>

                  {healthQuery.isLoading ? (
                    <div className="py-16 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !report ? (
                    <Card className="p-10 text-center">
                      <p className="text-base text-foreground">No health report yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click "Run Health Check" once you have flights that have already departed.
                      </p>
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                          label="Flights analyzed"
                          value={report.flightsAnalyzed ?? 0}
                          icon={Plane}
                          tone="default"
                          testId="stat-health-analyzed"
                        />
                        <Card className="p-4" data-testid="stat-health-precision" title="Of flights we flagged high risk, how many were actually disrupted">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                              <Target className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">Precision</div>
                              <div className="text-2xl font-semibold text-foreground tabular-nums mt-0.5">
                                {fmtPct(report.precision)}
                              </div>
                            </div>
                          </div>
                        </Card>
                        <Card className="p-4" data-testid="stat-health-recall" title="Of flights that were actually disrupted, how many did we catch">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">Recall</div>
                              <div className="text-2xl font-semibold text-foreground tabular-nums mt-0.5">
                                {fmtPct(report.recall)}
                              </div>
                            </div>
                          </div>
                        </Card>
                        <Card className="p-4" data-testid="stat-health-false-negatives" title="Disrupted flights we missed">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40">
                              <TrendingDown className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">False negatives</div>
                              <div className="text-2xl font-semibold text-foreground tabular-nums mt-0.5">
                                {report.falseNegatives ?? 0}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>

                      <Card className="p-6" data-testid="card-claude-summary">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-7 w-7 rounded-md flex items-center justify-center bg-primary/10 text-primary">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <h3 className="text-base font-semibold text-foreground">AI Analysis</h3>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
                          {report.claudeSummary || "No summary available."}
                        </div>
                      </Card>

                      {activeRows.length > 0 && (
                        <Card className="overflow-hidden" data-testid="card-health-active">
                          <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground">Currently active high-risk flights</h3>
                            <span className="text-xs text-muted-foreground" data-testid="text-active-count">
                              {activeRows.length} flight{activeRows.length === 1 ? "" : "s"} currently flagged high risk
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                  <th className="text-left font-medium px-4 py-3">Flight</th>
                                  <th className="text-left font-medium px-4 py-3">Route</th>
                                  <th className="text-left font-medium px-4 py-3">Departure</th>
                                  <th className="text-left font-medium px-4 py-3">Current score</th>
                                  <th className="text-left font-medium px-4 py-3">Top signals</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeRows.map((row) => (
                                  <tr key={row.id} className="border-t border-border" data-testid={`row-health-active-${row.id}`}>
                                    <td className="px-4 py-3 font-medium text-foreground">{row.flightNumber}</td>
                                    <td className="px-4 py-3 text-foreground">{row.route}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{row.departureDate}</td>
                                    <td className="px-4 py-3">
                                      <RiskBadge tier={row.currentTier} score={row.currentScore} />
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {row.topSignals.length === 0
                                        ? "—"
                                        : row.topSignals.map((s) => `${s.name} (+${s.points})`).join(", ")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      )}

                      {pastRows.length > 0 && (
                        <Card className="overflow-hidden">
                          <div className="p-4 border-b border-border">
                            <h3 className="text-base font-semibold text-foreground">Past flights analyzed</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                  <th className="text-left font-medium px-4 py-3">Flight</th>
                                  <th className="text-left font-medium px-4 py-3">Route</th>
                                  <th className="text-left font-medium px-4 py-3">Departure</th>
                                  <th className="text-left font-medium px-4 py-3">Peak score</th>
                                  <th className="text-left font-medium px-4 py-3">Actual</th>
                                  <th className="text-left font-medium px-4 py-3">Classification</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pastRows.map((row) => {
                                  const badge = classifBadge(row.classification);
                                  return (
                                    <tr key={row.id} className="border-t border-border" data-testid={`row-health-flight-${row.id}`}>
                                      <td className="px-4 py-3 font-medium text-foreground">{row.flightNumber}</td>
                                      <td className="px-4 py-3 text-foreground">{row.route}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{row.departureDate}</td>
                                      <td className="px-4 py-3">
                                        <RiskBadge tier={row.peakTier} score={row.peakScore} />
                                      </td>
                                      <td className="px-4 py-3 text-foreground">{actualLabel(row)}</td>
                                      <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badge.cls}`}>
                                          {badge.label}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
