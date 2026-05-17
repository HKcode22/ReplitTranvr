import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2, Plane, ArrowLeft, RefreshCw, Wand2, RotateCcw, AlertTriangle, CheckCircle2,
} from "lucide-react";

interface HistoryRow {
  id: number;
  score: number;
  tier: "green" | "amber" | "red";
  signals: any;
  scoredAt: string;
}
interface AlternativeRow {
  id: number;
  flightNumber: string;
  carrierIata: string;
  carrierName: string | null;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number | null;
  stops: number;
  price: string | null;
  riskScore: number;
  riskTier: string;
  selectionToken: string;
}
interface FlightDetail {
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
  status: string;
  alertSentAt: string | null;
  travelerSelectionToken: string | null;
  travelerSelectedOptionId: string | null;
  travelerSelectedAt: string | null;
  agencyNotifiedAt: string | null;
  agencyResolvedAt: string | null;
  history: HistoryRow[];
  alternatives: AlternativeRow[];
}

const SIGNAL_LABELS: Record<string, { label: string; max: number; explain: string }> = {
  inboundAircraftDelay: {
    label: "Inbound aircraft delay",
    max: 40,
    explain: "The aircraft assigned to operate your flight is currently delayed on its inbound leg.",
  },
  originWeather: {
    label: "Weather at origin",
    max: 25,
    explain: "Low visibility / low ceiling / thunderstorm / freezing precipitation at the departure airport.",
  },
  destinationWeather: {
    label: "Weather at destination",
    max: 20,
    explain: "Weather conditions at the arrival airport that may delay landings.",
  },
  timeOfDayRisk: {
    label: "Time of day",
    max: 5,
    explain: "Evening departures inherit accumulated daytime delays.",
  },
  historicalRisk: {
    label: "Historical late-day risk",
    max: 10,
    explain: "Baseline statistical risk for this departure window.",
  },
};

function tierStyles(tier: string) {
  switch (tier) {
    case "red":
      return { wrap: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900", dot: "bg-red-500", label: "High" };
    case "amber":
      return { wrap: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900", dot: "bg-amber-500", label: "Moderate" };
    default:
      return { wrap: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900", dot: "bg-emerald-500", label: "Low" };
  }
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function SignalBar({ name, value }: { name: string; value: number }) {
  const meta = SIGNAL_LABELS[name] || { label: name, max: 25, explain: "" };
  const pct = Math.max(0, Math.min(100, (value / meta.max) * 100));
  const color = value === 0 ? "bg-muted" : value > meta.max * 0.6 ? "bg-red-500" : value > meta.max * 0.3 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div data-testid={`signal-${name}`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-foreground font-medium">{meta.label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{value} / {meta.max} pts</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {meta.explain && <p className="text-xs text-muted-foreground mt-1.5">{meta.explain}</p>}
    </div>
  );
}

export default function AgencyFlightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [simulateScore, setSimulateScore] = useState(75);
  const [simulating, setSimulating] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [resetting, setResetting] = useState(false);

  const flightQuery = useQuery<FlightDetail>({
    queryKey: [`/api/agency/flights/${id}`],
    refetchInterval: 30_000,
  });

  if (flightQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (flightQuery.isError || !flightQuery.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <p className="text-foreground">We couldn't load this flight.</p>
          <Button className="mt-4" variant="outline" onClick={() => setLocation("/agency/dashboard")}>
            Back to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const flight = flightQuery.data;
  const latest = flight.history?.[0];
  const latestSignals = latest?.signals?.signals || {};
  const latestStatus = latest?.signals?.flightStatus || null;
  const latestOriginWx = latest?.signals?.originWeather || null;
  const latestDestWx = latest?.signals?.destinationWeather || null;
  const isSimulated = !!latest?.signals?.simulated;
  const styles = tierStyles(flight.riskTier);
  const baseUrl = window.location.origin;

  const handleRescore = async () => {
    setRescoring(true);
    try {
      await apiRequest("POST", `/api/agency/flights/${flight.id}/rescore`, {});
      toast({
        title: "Rescoring",
        description: "We're recalculating now. Refresh in a moment to see the new score.",
      });
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: [`/api/agency/flights/${id}`] });
      }, 2000);
    } catch (err: any) {
      toast({ title: "Rescore failed", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setRescoring(false);
    }
  };

  const handleSimulate = async () => {
    if (simulateScore < 60) {
      const ok = window.confirm(
        "Scores below 60 stay in green/amber — no email will be sent. Continue anyway?",
      );
      if (!ok) return;
    }
    setSimulating(true);
    try {
      const r = await apiRequest("POST", `/api/agency/flights/${flight.id}/simulate`, {
        targetScore: simulateScore,
        reason: "Manual simulation from detail page",
      });
      const data = await r.json();
      if (data.fired) {
        toast({
          title: "Alert fired",
          description: `Email sent to ${flight.travelerEmail} with ${data.alternativeCount} real alternatives.`,
        });
      } else {
        toast({
          title: "Saved (no email)",
          description: data.message || "Score below red threshold — no alert fired.",
        });
      }
      qc.invalidateQueries({ queryKey: [`/api/agency/flights/${id}`] });
      qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
    } catch (err: any) {
      toast({ title: "Simulation failed", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Wipe alert state? Alternatives will be deleted and alertSentAt cleared so the flight can be re-simulated.")) return;
    setResetting(true);
    try {
      await apiRequest("POST", `/api/agency/flights/${flight.id}/reset-alert`, {});
      toast({ title: "Alert state reset", description: "Ready for another simulation." });
      qc.invalidateQueries({ queryKey: [`/api/agency/flights/${id}`] });
      qc.invalidateQueries({ queryKey: ["/api/agency/flights"] });
    } catch (err: any) {
      toast({ title: "Reset failed", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/agency/dashboard")} data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Plane className="h-5 w-5" />
            <span className="hidden sm:inline">Travnr for Agencies</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-4xl mx-auto w-full">
        {/* Flight identity */}
        <Card className="p-6 mb-6" data-testid="card-flight-identity">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Monitored flight</div>
              <h1 className="text-2xl font-semibold text-foreground">
                {flight.flightNumber} · {flight.originIata} → {flight.destinationIata}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {flight.departureDate}
                {flight.departureTime ? ` at ${flight.departureTime}` : ""} · for{" "}
                <span className="text-foreground">{flight.travelerName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {flight.travelerEmail}
                {flight.travelerPhone ? ` · ${flight.travelerPhone}` : ""}
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${styles.wrap}`}>
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              {styles.label} risk · score {flight.riskScore}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Last checked</div>
              <div className="text-foreground">{fmtTime(flight.lastCheckedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Alert sent</div>
              <div className="text-foreground">{flight.alertSentAt ? fmtTime(flight.alertSentAt) : "Not yet"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Traveler selected</div>
              <div className="text-foreground">
                {flight.travelerSelectedOptionId
                  ? flight.travelerSelectedOptionId === "keep_original"
                    ? "Kept original"
                    : `Option #${flight.travelerSelectedOptionId}`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-foreground capitalize">{flight.status}</div>
            </div>
          </div>
          {flight.travelerSelectionToken && (
            <div className="mt-4 text-xs text-muted-foreground">
              Traveler link:{" "}
              <a
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
                href={`${baseUrl}/disruption/${flight.travelerSelectionToken}`}
                data-testid="link-traveler-page"
              >
                /disruption/{flight.travelerSelectionToken.slice(0, 8)}…
              </a>
            </div>
          )}
        </Card>

        {/* Score breakdown */}
        <Card className="p-6 mb-6" data-testid="card-score-breakdown">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">How this score was built</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {latest
                  ? `Based on signals collected ${fmtTime(latest.scoredAt)}.`
                  : "No score history yet — hit Rescore now."}
                {isSimulated && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 text-xs font-medium">
                    Simulated
                  </span>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRescore} disabled={rescoring} data-testid="button-rescore">
              <RefreshCw className={`h-4 w-4 mr-2 ${rescoring ? "animate-spin" : ""}`} />
              Rescore now
            </Button>
          </div>
          {latest ? (
            <div className="space-y-4">
              <SignalBar name="inboundAircraftDelay" value={latestSignals.inboundAircraftDelay || 0} />
              <SignalBar name="originWeather" value={latestSignals.originWeather || 0} />
              <SignalBar name="destinationWeather" value={latestSignals.destinationWeather || 0} />
              <SignalBar name="timeOfDayRisk" value={latestSignals.timeOfDayRisk || 0} />
              <SignalBar name="historicalRisk" value={latestSignals.historicalRisk || 0} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run "Rescore now" to generate the first snapshot.</p>
          )}
        </Card>

        {/* Live snapshot used to score */}
        <Card className="p-6 mb-6" data-testid="card-live-signals">
          <h2 className="text-lg font-semibold text-foreground mb-4">Signal details (verify this is the right flight)</h2>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border rounded-md p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Flight status (AeroDataBox)</div>
                {latestStatus ? (
                  <ul className="space-y-1 text-foreground">
                    <li><span className="text-muted-foreground">Status:</span> {latestStatus.status || "—"}</li>
                    <li><span className="text-muted-foreground">Departure delay:</span> {latestStatus.delayMinutes ?? 0} min</li>
                    <li><span className="text-muted-foreground">Inbound delay:</span> {latestStatus.inboundDelayMinutes ?? 0} min</li>
                    <li><span className="text-muted-foreground">Cancelled:</span> {latestStatus.cancelled ? "Yes" : "No"}</li>
                    <li><span className="text-muted-foreground">Departure time:</span> {latestStatus.departureTime || "—"}</li>
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No status available — either AeroDataBox returned nothing for this flight number + date, or the API key is missing. If this monitored flight number is wrong, remove it and re-add.</p>
                )}
              </div>

              <div className="border border-border rounded-md p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Weather (NOAA METAR)</div>
                {latestOriginWx ? (
                  <ul className="space-y-1 text-foreground">
                    <li><span className="text-muted-foreground">{flight.originIata} category:</span> {latestOriginWx.flightCategory || "—"}</li>
                    <li><span className="text-muted-foreground">{flight.originIata} thunderstorm:</span> {latestOriginWx.hasThunderstorm ? "Yes" : "No"}</li>
                    <li><span className="text-muted-foreground">{flight.originIata} freezing:</span> {latestOriginWx.hasFreezing ? "Yes" : "No"}</li>
                    {latestDestWx && (
                      <>
                        <li className="pt-2 border-t border-border mt-2"><span className="text-muted-foreground">{flight.destinationIata} category:</span> {latestDestWx.flightCategory || "—"}</li>
                        <li><span className="text-muted-foreground">{flight.destinationIata} thunderstorm:</span> {latestDestWx.hasThunderstorm ? "Yes" : "No"}</li>
                      </>
                    )}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No weather snapshot yet.</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Simulation controls */}
        <Card className="p-6 mb-6 border-purple-200 dark:border-purple-900" data-testid="card-simulate">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-foreground">Simulate disruption alert</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Force this flight to a target score and (if ≥60) trigger the real alert pipeline:
            real alternative search via Google Flights, real email to <strong className="text-foreground">{flight.travelerEmail}</strong>,
            real selection flow that notifies <strong className="text-foreground">{flight.travelerName}</strong>'s agent.
            Each run wipes the previous alert state so you can re-simulate cleanly.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <Label htmlFor="simulateScore">Target score (0–100)</Label>
              <Input
                id="simulateScore"
                type="number"
                min={0}
                max={100}
                value={simulateScore}
                onChange={(e) => setSimulateScore(parseInt(e.target.value || "0", 10))}
                data-testid="input-simulate-score"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ≥60 = red (email fires). 25–59 = amber. 0–24 = green.
              </p>
            </div>
            <Button onClick={handleSimulate} disabled={simulating} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="button-simulate">
              {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4 mr-2" /> Run simulation</>}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={resetting} data-testid="button-reset-alert">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-2" /> Reset alert state</>}
            </Button>
          </div>
        </Card>

        {/* Alternatives if any */}
        {flight.alternatives && flight.alternatives.length > 0 && (
          <Card className="p-6 mb-6" data-testid="card-alternatives">
            <h2 className="text-lg font-semibold text-foreground mb-3">Alternatives offered to traveler</h2>
            <div className="space-y-3">
              {flight.alternatives.map((alt) => {
                const isPicked = flight.travelerSelectedOptionId === String(alt.id);
                return (
                  <div
                    key={alt.id}
                    className={`border rounded-md p-4 ${isPicked ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border"}`}
                    data-testid={`alt-row-${alt.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {alt.carrierName || alt.carrierIata} {alt.flightNumber}
                          {isPicked && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Selected by traveler
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-foreground mt-1">
                          {alt.departureTime} → {alt.arrivalTime}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {alt.stops === 0 ? "Nonstop" : `${alt.stops} stop${alt.stops > 1 ? "s" : ""}`} ·{" "}
                          {alt.durationMinutes ? `${Math.floor(alt.durationMinutes / 60)}h ${alt.durationMinutes % 60}m` : "—"} ·{" "}
                          {alt.price || "—"}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        alt.riskTier === "green"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${alt.riskTier === "green" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {alt.riskTier === "green" ? "Low" : "Moderate"} · {alt.riskScore}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Score history */}
        <Card className="p-6 mb-6" data-testid="card-history">
          <h2 className="text-lg font-semibold text-foreground mb-3">Score history</h2>
          {flight.history && flight.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left font-medium py-2 pr-3">When</th>
                    <th className="text-left font-medium py-2 pr-3">Score</th>
                    <th className="text-left font-medium py-2 pr-3">Tier</th>
                    <th className="text-left font-medium py-2 pr-3">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {flight.history.map((h) => (
                    <tr key={h.id} className="border-b border-border/60" data-testid={`history-row-${h.id}`}>
                      <td className="py-2 pr-3 text-foreground">{fmtTime(h.scoredAt)}</td>
                      <td className="py-2 pr-3 text-foreground tabular-nums">{h.score}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tierStyles(h.tier).wrap}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tierStyles(h.tier).dot}`} />
                          {tierStyles(h.tier).label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {h.signals?.simulated ? "Simulated" : "Live"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          )}
        </Card>
      </main>
    </div>
  );
}
