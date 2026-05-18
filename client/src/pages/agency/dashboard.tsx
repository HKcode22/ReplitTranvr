import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlightSearchModal, type FoundFlight } from "@/components/flight-search-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatFlightTime } from "@/lib/airportTimezone";
import {
  Loader2, Plane, Plus, Trash2, LogOut, RefreshCw, Activity, AlertTriangle, BellRing, CheckCircle2, X,
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

interface MonitoredFlightRow {
  id: number;
  flightNumber: string;
  carrierIata: string;
  departureDate: string;
  departureTime: string | null;
  originIata: string;
  destinationIata: string;
  travelerName: string;
  travelerEmail: string;
  travelerPhone: string | null;
  riskScore: number;
  riskTier: "green" | "amber" | "red";
  lastCheckedAt: string | null;
  status: "active" | "completed" | "cancelled";
  alertSentAt: string | null;
  travelerSelectedOptionId: string | null;
  travelerSelectedAt: string | null;
  agencyResolvedAt: string | null;
  alternatives?: AlternativeMini[];
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
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FoundFlight | null>(null);
  const [travelerSheetOpen, setTravelerSheetOpen] = useState(false);
  const [travelerForm, setTravelerForm] = useState({
    travelerName: "",
    travelerEmail: "",
    travelerPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [travelerFilter, setTravelerFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("flights");

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

  const handleSearchSelect = (flight: FoundFlight) => {
    setSelectedFlight(flight);
    setSearchModalOpen(false);
    setTravelerSheetOpen(true);
    setFormError("");
    setTravelerForm({ travelerName: "", travelerEmail: "", travelerPhone: "" });
  };

  const closeTravelerSheet = () => {
    setTravelerSheetOpen(false);
    setSelectedFlight(null);
    setFormError("");
    setTravelerForm({ travelerName: "", travelerEmail: "", travelerPhone: "" });
  };

  const parseDepartureParts = (
    raw: string,
  ): { departureDate: string; departureTime: string } => {
    if (!raw) return { departureDate: "", departureTime: "" };
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    if (m) return { departureDate: m[1], departureTime: m[2] };
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const departureDate = d.toISOString().slice(0, 10);
      const departureTime = d.toISOString().slice(11, 16);
      return { departureDate, departureTime };
    }
    return { departureDate: "", departureTime: raw };
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlight) return;
    setFormError("");
    setSubmitting(true);
    try {
      const { departureDate, departureTime } = parseDepartureParts(selectedFlight.departureTime);
      const payload = {
        flightNumber: selectedFlight.flightNumber,
        carrierIata: selectedFlight.carrierIata,
        originIata: selectedFlight.originIata,
        destinationIata: selectedFlight.destinationIata,
        departureDate: departureDate || todayStr,
        departureTime: departureTime || selectedFlight.departureTime,
        travelerName: travelerForm.travelerName.trim(),
        travelerEmail: travelerForm.travelerEmail.trim(),
        travelerPhone: travelerForm.travelerPhone.trim() || null,
      };
      await apiRequest("POST", "/api/agency/flights", payload);
      toast({ title: "Flight added", description: "Monitoring active." });
      closeTravelerSheet();
      qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
    } catch (err: any) {
      setFormError(err?.message || "Failed to add flight");
    } finally {
      setSubmitting(false);
    }
  };

  const allFlights: MonitoredFlightRow[] = useMemo(
    () => flightsQuery.data || [],
    [flightsQuery.data],
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const todayLocal = new Date();
    const todayLocalStr = todayLocal.toISOString().slice(0, 10);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const total = allFlights.length;
    const atRisk = allFlights.filter(
      (f) => f.riskTier === "amber" || f.riskTier === "red",
    ).length;
    const alertsToday = allFlights.filter((f) => {
      if (!f.alertSentAt) return false;
      const sent = new Date(f.alertSentAt);
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
      const key = f.travelerEmail.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          email: f.travelerEmail,
          name: f.travelerName,
          phone: f.travelerPhone,
          count: 1,
          latestDeparture: f.departureDate,
        });
      } else {
        existing.count += 1;
        if (f.departureDate > existing.latestDeparture) {
          existing.latestDeparture = f.departureDate;
        }
        if (!existing.phone && f.travelerPhone) existing.phone = f.travelerPhone;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allFlights]);

  const alerts = useMemo(() => {
    return allFlights
      .filter((f) => !!f.alertSentAt)
      .sort((a, b) => {
        const aT = new Date(a.alertSentAt || 0).getTime();
        const bT = new Date(b.alertSentAt || 0).getTime();
        return bT - aT;
      });
  }, [allFlights]);

  const filteredFlights = useMemo(() => {
    if (!travelerFilter) return allFlights;
    return allFlights.filter(
      (f) => f.travelerEmail.toLowerCase() === travelerFilter.toLowerCase(),
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
    if (!f.travelerSelectedOptionId) return "Pending response";
    if (f.travelerSelectedOptionId === "keep_original") return "Kept original";
    const alt = (f.alternatives || []).find(
      (a) => String(a.id) === String(f.travelerSelectedOptionId),
    );
    if (alt) return alt.flightNumber;
    return `Option #${f.travelerSelectedOptionId}`;
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
              onClick={() => flightsQuery.refetch()}
              disabled={flightsQuery.isFetching}
              data-testid="button-refresh-flights"
            >
              <RefreshCw className={`h-4 w-4 ${flightsQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              onClick={() => setSearchModalOpen(true)}
              data-testid="button-add-flight"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add flight
            </Button>
          </div>
        </div>

        <FlightSearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onSelect={handleSearchSelect}
        />

        <Sheet
          open={travelerSheetOpen}
          onOpenChange={(o) => { if (!o) closeTravelerSheet(); }}
        >
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add Traveler Details</SheetTitle>
            </SheetHeader>
            {selectedFlight && (
              <form onSubmit={handleAdd} className="space-y-4 mt-6" data-testid="form-add-traveler">
                <Card className="p-4 bg-muted/40">
                  <div className="text-xs text-muted-foreground">Flight</div>
                  <div className="font-semibold text-foreground">
                    {selectedFlight.flightNumber}
                    {selectedFlight.carrierName && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {selectedFlight.carrierName}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-foreground mt-1">
                    {selectedFlight.originIata} → {selectedFlight.destinationIata}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Departs {selectedFlight.departureTime}
                  </div>
                </Card>

                <div className="space-y-2">
                  <Label htmlFor="travelerName">Traveler name</Label>
                  <Input
                    id="travelerName"
                    required
                    value={travelerForm.travelerName}
                    onChange={(e) => setTravelerForm({ ...travelerForm, travelerName: e.target.value })}
                    data-testid="input-traveler-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travelerEmail">Traveler email</Label>
                  <Input
                    id="travelerEmail"
                    type="email"
                    required
                    value={travelerForm.travelerEmail}
                    onChange={(e) => setTravelerForm({ ...travelerForm, travelerEmail: e.target.value })}
                    data-testid="input-traveler-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travelerPhone">Traveler phone (optional)</Label>
                  <Input
                    id="travelerPhone"
                    type="tel"
                    placeholder="+1 555 000 0000"
                    value={travelerForm.travelerPhone}
                    onChange={(e) => setTravelerForm({ ...travelerForm, travelerPhone: e.target.value })}
                    data-testid="input-traveler-phone"
                  />
                </div>
                {formError && (
                  <p className="text-sm text-destructive" data-testid="text-add-flight-error">{formError}</p>
                )}
                <Button type="submit" className="w-full" disabled={submitting} data-testid="button-submit-flight">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Start Monitoring"
                  )}
                </Button>
              </form>
            )}
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
          <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
            <TabsTrigger value="flights" data-testid="tab-flights">Flights</TabsTrigger>
            <TabsTrigger value="travelers" data-testid="tab-travelers">Travelers</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
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
                  <Button className="mt-6" onClick={() => setSearchModalOpen(true)}>
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
                          <th className="text-left font-medium px-4 py-3">Flight</th>
                          <th className="text-left font-medium px-4 py-3">Route</th>
                          <th className="text-left font-medium px-4 py-3">Departure</th>
                          <th className="text-left font-medium px-4 py-3">Traveler</th>
                          <th className="text-left font-medium px-4 py-3">Risk</th>
                          <th className="text-left font-medium px-4 py-3">Last checked</th>
                          <th className="text-left font-medium px-4 py-3">Status</th>
                          <th className="w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFlights.map((f) => (
                          <tr
                            key={f.id}
                            className="border-t border-border hover:bg-muted/30 cursor-pointer"
                            onClick={() => setLocation(`/agency/flights/${f.id}`)}
                            data-testid={`row-flight-${f.id}`}
                          >
                            <td className="px-4 py-3 font-medium text-foreground">{f.flightNumber}</td>
                            <td className="px-4 py-3 text-foreground">
                              {f.originIata} → {f.destinationIata}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {f.departureTime
                                ? formatFlightTime(f.departureTime, f.originIata)
                                : f.departureDate}
                            </td>
                            <td className="px-4 py-3 text-foreground">{f.travelerName}</td>
                            <td className="px-4 py-3"><RiskBadge tier={f.riskTier} score={f.riskScore} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(f.lastCheckedAt)}</td>
                            <td className="px-4 py-3 text-muted-foreground capitalize">
                              {f.status}
                              {f.alertSentAt ? <span className="ml-1 text-xs text-amber-600">· alerted</span> : null}
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
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </div>

                <div className="md:hidden space-y-3">
                  {filteredFlights.map((f) => (
                    <Card
                      key={f.id}
                      className="p-4 cursor-pointer"
                      onClick={() => setLocation(`/agency/flights/${f.id}`)}
                      data-testid={`card-flight-${f.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{f.flightNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {f.originIata} → {f.destinationIata} ·{" "}
                            {f.departureTime
                              ? formatFlightTime(f.departureTime, f.originIata)
                              : f.departureDate}
                          </div>
                          <div className="text-sm text-foreground mt-2">{f.travelerName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(f.lastCheckedAt)} · <span className="capitalize">{f.status}</span>
                            {f.alertSentAt ? <span className="ml-1 text-amber-600">· alerted</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <RiskBadge tier={f.riskTier} score={f.riskScore} />
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
                    </Card>
                  ))}
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
                          <th className="text-left font-medium px-4 py-3">Traveler</th>
                          <th className="text-left font-medium px-4 py-3">Sent</th>
                          <th className="text-left font-medium px-4 py-3">Response</th>
                          <th className="text-left font-medium px-4 py-3">Resolved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map((f) => (
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
                            <td className="px-4 py-3 text-foreground">{f.travelerName}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatRelativeTime(f.alertSentAt)}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {selectionLabel(f)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {f.agencyResolvedAt ? formatRelativeTime(f.agencyResolvedAt) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </div>

                <div className="md:hidden space-y-3">
                  {alerts.map((f) => (
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
                          <div className="text-sm text-foreground mt-1">{f.travelerName}</div>
                          <div className="text-xs text-muted-foreground mt-2">
                            Sent {formatRelativeTime(f.alertSentAt)} · {selectionLabel(f)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {f.agencyResolvedAt
                              ? `Resolved ${formatRelativeTime(f.agencyResolvedAt)}`
                              : "Not resolved"}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
