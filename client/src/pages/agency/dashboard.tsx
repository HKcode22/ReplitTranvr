import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plane, Plus, Trash2, LogOut, RefreshCw } from "lucide-react";

interface AgencyMe {
  id: number;
  name: string;
  contactEmail: string;
  contactName: string;
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
  alternatives?: Array<{ id: number }>;
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

export default function AgencyDashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    flightNumber: "",
    originIata: "",
    destinationIata: "",
    departureDate: "",
    travelerName: "",
    travelerEmail: "",
    travelerPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
      toast({ title: "Flight removed" });
    },
    onError: (err: any) => {
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const flightNumber = form.flightNumber.trim().toUpperCase().replace(/\s+/g, "");
      const carrierIata = flightNumber.replace(/[^A-Z]/g, "").slice(0, 2) || flightNumber.slice(0, 2);
      const payload = {
        flightNumber,
        carrierIata,
        originIata: form.originIata.trim().toUpperCase(),
        destinationIata: form.destinationIata.trim().toUpperCase(),
        departureDate: form.departureDate,
        travelerName: form.travelerName.trim(),
        travelerEmail: form.travelerEmail.trim(),
        travelerPhone: form.travelerPhone.trim() || null,
      };
      await apiRequest("POST", "/api/agency/flights", payload);
      toast({ title: "Flight added", description: "We'll start monitoring it now." });
      setForm({
        flightNumber: "",
        originIata: "",
        destinationIata: "",
        departureDate: "",
        travelerName: "",
        travelerEmail: "",
        travelerPhone: "",
      });
      setSheetOpen(false);
      qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
    } catch (err: any) {
      setFormError(err?.message || "Failed to add flight");
    } finally {
      setSubmitting(false);
    }
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!meQuery.data) return null;

  const flights = flightsQuery.data || [];
  const todayStr = new Date().toISOString().slice(0, 10);

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
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button data-testid="button-add-flight">
                  <Plus className="h-4 w-4 mr-2" />
                  Add flight
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Add a flight to monitor</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleAdd} className="space-y-4 mt-6" data-testid="form-add-flight">
                  <div className="space-y-2">
                    <Label htmlFor="flightNumber">Flight number</Label>
                    <Input
                      id="flightNumber"
                      placeholder="UA487"
                      required
                      value={form.flightNumber}
                      onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
                      data-testid="input-flight-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="originIata">Origin (IATA)</Label>
                      <Input
                        id="originIata"
                        placeholder="ORD"
                        required
                        maxLength={3}
                        value={form.originIata}
                        onChange={(e) => setForm({ ...form, originIata: e.target.value })}
                        data-testid="input-origin-iata"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationIata">Destination (IATA)</Label>
                      <Input
                        id="destinationIata"
                        placeholder="JFK"
                        required
                        maxLength={3}
                        value={form.destinationIata}
                        onChange={(e) => setForm({ ...form, destinationIata: e.target.value })}
                        data-testid="input-destination-iata"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departureDate">Departure date</Label>
                    <Input
                      id="departureDate"
                      type="date"
                      required
                      min={todayStr}
                      value={form.departureDate}
                      onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                      data-testid="input-departure-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelerName">Traveler name</Label>
                    <Input
                      id="travelerName"
                      required
                      value={form.travelerName}
                      onChange={(e) => setForm({ ...form, travelerName: e.target.value })}
                      data-testid="input-traveler-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelerEmail">Traveler email</Label>
                    <Input
                      id="travelerEmail"
                      type="email"
                      required
                      value={form.travelerEmail}
                      onChange={(e) => setForm({ ...form, travelerEmail: e.target.value })}
                      data-testid="input-traveler-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelerPhone">Traveler phone (optional)</Label>
                    <Input
                      id="travelerPhone"
                      type="tel"
                      placeholder="+1 555 123 4567"
                      value={form.travelerPhone}
                      onChange={(e) => setForm({ ...form, travelerPhone: e.target.value })}
                      data-testid="input-traveler-phone"
                    />
                  </div>
                  {formError && (
                    <p className="text-sm text-destructive" data-testid="text-add-flight-error">{formError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={submitting} data-testid="button-submit-flight">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start monitoring"}
                  </Button>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {flightsQuery.isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : flights.length === 0 ? (
          <Card className="p-10 text-center" data-testid="empty-state-flights">
            <p className="text-base text-foreground">No flights being monitored.</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first flight to get started.</p>
            <Button className="mt-6" onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add flight
            </Button>
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
                      <th className="text-left font-medium px-4 py-3">Date</th>
                      <th className="text-left font-medium px-4 py-3">Traveler</th>
                      <th className="text-left font-medium px-4 py-3">Risk</th>
                      <th className="text-left font-medium px-4 py-3">Last checked</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {flights.map((f) => (
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
                        <td className="px-4 py-3 text-muted-foreground">{f.departureDate}</td>
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
              {flights.map((f) => (
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
                        {f.originIata} → {f.destinationIata} · {f.departureDate}
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
      </main>
    </div>
  );
}
