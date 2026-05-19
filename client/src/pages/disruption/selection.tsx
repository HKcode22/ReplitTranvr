import { useEffect, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Plane, AlertTriangle } from "lucide-react";

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
  riskTier: "green" | "amber";
  selectionToken: string;
}

interface DisruptionPayload {
  flight: {
    id: number;
    flightNumber: string;
    departureDate: string;
    originIata: string;
    destinationIata: string;
    travelerName: string;
    riskScore: number;
    riskTier: string;
    travelerSelectedOptionId: string | null;
    travelerSelectionToken: string | null;
  };
  agency: { name: string; contactEmail: string } | null;
  alternatives: AlternativeRow[];
}

function durationLabel(m: number | null | undefined): string {
  if (!m || !Number.isFinite(m)) return "—";
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours}h ${mins}m`;
}

function stopsLabel(stops: number): string {
  if (!stops) return "Nonstop";
  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function RiskPill({ tier }: { tier: string }) {
  const isGreen = tier === "green";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isGreen ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isGreen ? "bg-emerald-500" : "bg-amber-500"}`} />
      {isGreen ? "Low Risk" : "Moderate Risk"}
    </span>
  );
}

export default function DisruptionSelectionPage() {
  const { token } = useParams<{ token: string }>();
  const searchString = useSearch();
  const highlightToken = new URLSearchParams(searchString).get("highlight");
  const [data, setData] = useState<DisruptionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/disruption/flight/${encodeURIComponent(token)}`);
        if (!r.ok) {
          if (!cancelled) {
            setError("We couldn't find that disruption link. It may have expired.");
            setLoading(false);
          }
          return;
        }
        const json = await r.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Something went wrong loading your alternatives.");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3" data-testid="state-loading">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <p className="text-sm text-gray-600">Loading your options...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="p-8 max-w-md w-full text-center bg-white" data-testid="state-error">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-800 text-base">
            We couldn't load your options. Please contact your travel agent directly.
          </p>
        </Card>
      </div>
    );
  }

  const { flight, agency, alternatives } = data;
  const alreadySelected = !!flight.travelerSelectedOptionId;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2 text-blue-600 font-semibold">
          <Plane className="h-5 w-5" />
          <span>Travnr</span>
          {agency ? (
            <span className="text-sm font-normal text-gray-500 ml-2">
              for {agency.name}
            </span>
          ) : null}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="bg-white p-6 mb-6 border border-gray-200">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Your flight</div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {flight.flightNumber} · {flight.originIata} → {flight.destinationIata}
          </h1>
          <div className="text-base text-gray-700 mt-1">
            {flight.departureDate} · for {flight.travelerName}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-sm text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Disruption risk · score {flight.riskScore}
          </div>
        </Card>

        {alreadySelected ? (
          <Card className="bg-white p-8 text-center border border-gray-200" data-testid="state-already-selected">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900">You've already made a selection</h2>
            <p className="text-sm text-gray-600 mt-2">
              Your travel agent has been notified and will handle the rebooking.
            </p>
          </Card>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {alternatives.length > 0
                ? "Here are some alternative flights we found — all confirmed lower risk:"
                : "We weren't able to find alternative flights automatically"}
            </h2>

            {alternatives.length === 0 ? (
              <p className="text-sm text-gray-600 mb-4" data-testid="text-no-alternatives">
                Your travel agent has been notified and will reach out to you directly with options.
              </p>
            ) : null}

            <div className="space-y-3">
              {alternatives.map((alt) => {
                const highlighted = highlightToken && alt.selectionToken === highlightToken;
                return (
                  <Card
                    key={alt.id}
                    className={`bg-white p-5 border ${
                      highlighted ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
                    }`}
                    data-testid={`card-alternative-${alt.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900">
                          {alt.carrierName || alt.carrierIata} {alt.flightNumber}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">
                          <strong>{alt.departureTime}</strong> → <strong>{alt.arrivalTime}</strong>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {durationLabel(alt.durationMinutes)} · {stopsLabel(alt.stops)} ·{" "}
                          {alt.price || "—"}
                        </div>
                      </div>
                      <RiskPill tier={alt.riskTier} />
                    </div>
                    <div className="mt-4">
                      <a
                        href={`/api/disruption/select/${encodeURIComponent(alt.selectionToken)}`}
                        className="inline-flex w-full sm:w-auto items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white"
                        data-testid={`link-select-${alt.id}`}
                      >
                        Select this flight
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>

            {flight.travelerSelectionToken ? (
              <Card className="bg-white p-5 mt-6 border border-gray-200" data-testid="card-keep-original">
                <div className="text-sm text-gray-700 mb-3">
                  Prefer to keep your original flight?
                </div>
                <a
                  href={`/api/disruption/keep/${encodeURIComponent(flight.travelerSelectionToken)}`}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  data-testid="link-keep-original"
                >
                  Keep my original flight →
                </a>
              </Card>
            ) : null}

            {agency ? (
              <p className="text-xs text-gray-500 mt-6 text-center">
                Your travel agent <strong className="text-gray-700">{agency.name}</strong> will handle the rebooking once you select. You will not be charged anything extra.
              </p>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
