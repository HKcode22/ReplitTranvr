import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, Clock, ArrowRight, CheckCircle2, MailCheck, AlertCircle, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface GuestSegment {
  carrierName?: string | null;
  carrierIata?: string | null;
  flightNumber?: string | null;
  departingAt?: string | null;
  arrivingAt?: string | null;
  origin?: { iata?: string | null; name?: string | null };
  destination?: { iata?: string | null; name?: string | null };
}

interface GuestSlice {
  origin: { iata?: string | null; city?: string | null; name?: string | null };
  destination: { iata?: string | null; city?: string | null; name?: string | null };
  departingAt?: string | null;
  arrivingAt?: string | null;
  durationMinutes: number;
  stops: number;
  segments: GuestSegment[];
}

interface GuestOption {
  token: string;
  label: "Best Price" | "Best Value" | "Fastest";
  duffelOfferId: string;
  totalAmount: string;
  totalCurrency: string;
  totalDurationMinutes: number;
  stops: number;
  carrierName?: string | null;
  carrierIata?: string | null;
  carrierLogo?: string | null;
  slices: GuestSlice[];
  baggage?: string | null;
  refundable?: boolean | null;
  changeable?: boolean | null;
}

function policyText(refundable?: boolean | null, changeable?: boolean | null): string | null {
  if (refundable == null && changeable == null) return null;
  const refundLabel =
    refundable == null ? "Cancellation policy unavailable" : refundable ? "Refundable" : "Non-refundable";
  const changeLabel =
    changeable == null ? null : changeable ? "Changes allowed" : "No changes";
  return changeLabel ? `${refundLabel} · ${changeLabel}` : refundLabel;
}

interface GuestProposalPayload {
  originIata: string;
  originName?: string | null;
  destinationIata: string;
  destinationName?: string | null;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  cabinClass: string;
  options: GuestOption[];
}

interface ApiOk {
  token: string;
  status: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  proposal: GuestProposalPayload;
}

interface ApiExpired {
  expired: true;
  refreshed: true;
  message: string;
  email: string;
}

function formatDuration(mins: number): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function FlightOptionCard({ option }: { option: GuestOption }) {
  const slice = option.slices?.[0];
  const stopsLabel = option.stops === 0 ? "Nonstop" : `${option.stops} stop${option.stops === 1 ? "" : "s"}`;
  const amount = `${(option.totalCurrency || "USD").toUpperCase()} ${Number(option.totalAmount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <Card className="p-6 border-2 hover-elevate transition-all" data-testid={`card-option-${option.label.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-center justify-between mb-4">
        <Badge className="bg-primary text-primary-foreground hover:bg-primary uppercase tracking-wide text-xs font-semibold">
          {option.label}
        </Badge>
        <div className="text-right">
          <div className="text-2xl font-bold" data-testid={`text-price-${option.label.replace(/\s+/g, "-").toLowerCase()}`}>{amount}</div>
          <div className="text-xs text-muted-foreground">total for {/* */} all travelers</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        {option.carrierLogo ? (
          <img src={option.carrierLogo} alt={option.carrierName || ""} className="h-6" />
        ) : (
          <Plane className="w-5 h-5 text-primary" />
        )}
        <span className="font-medium">{option.carrierName || "Airline"}</span>
      </div>

      {slice && (
        <div className="rounded-lg bg-muted/40 border p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-center">
              <div className="text-xl font-semibold">{formatTime(slice.departingAt)}</div>
              <div className="text-sm text-muted-foreground">{slice.origin?.iata}</div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDuration(option.totalDurationMinutes)}
              </div>
              <div className="w-full h-px bg-border my-1 relative">
                <ArrowRight className="w-3 h-3 text-muted-foreground absolute right-0 -top-1.5" />
              </div>
              <div className="text-xs text-muted-foreground">{stopsLabel}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{formatTime(slice.arrivingAt)}</div>
              <div className="text-sm text-muted-foreground">{slice.destination?.iata}</div>
            </div>
          </div>
        </div>
      )}

      {option.slices.length > 1 && (
        <div className="text-xs text-muted-foreground mb-3">
          + Return flight {formatDate(option.slices[1].departingAt)} · {formatDuration(option.slices[1].durationMinutes)}
        </div>
      )}

      <div className="space-y-1 text-xs text-muted-foreground mb-4">
        {option.baggage && (
          <div data-testid={`text-baggage-${option.label.replace(/\s+/g, "-").toLowerCase()}`}>
            <span className="font-medium text-foreground">Baggage:</span> {option.baggage}
          </div>
        )}
        {policyText(option.refundable, option.changeable) && (
          <div data-testid={`text-cancellation-${option.label.replace(/\s+/g, "-").toLowerCase()}`}>
            <span className="font-medium text-foreground">Cancellation:</span>{" "}
            {policyText(option.refundable, option.changeable)}
          </div>
        )}
      </div>

      <Button
        asChild
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        data-testid={`button-book-${option.label.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <a href={`/book/${encodeURIComponent(option.token)}`}>
          Book This Flight <ArrowRight className="w-4 h-4 ml-2" />
        </a>
      </Button>
    </Card>
  );
}

export default function GuestProposalPage() {
  const [, params] = useRoute<{ token: string }>("/proposal/:token");
  const token = params?.token;
  const [expiredInfo, setExpiredInfo] = useState<ApiExpired | null>(null);

  const { data, isLoading, error } = useQuery<ApiOk>({
    queryKey: ["guest-proposal", token],
    queryFn: async () => {
      const res = await fetch(`/api/guest-proposal/${encodeURIComponent(token!)}`, {
        credentials: "include",
      });
      if (res.status === 410) {
        const body = (await res.json()) as ApiExpired;
        setExpiredInfo(body);
        throw new Error("expired");
      }
      if (!res.ok) {
        throw new Error(`Failed to load (${res.status})`);
      }
      return (await res.json()) as ApiOk;
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    document.title = "Your Flight Options — Travnr";
  }, []);

  useEffect(() => {
    if (data) {
      trackEvent("proposal_viewed", {
        optionCount: data.proposal.options.length,
      });
    }
  }, [data]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-semibold mb-2">Invalid link</h1>
          <p className="text-muted-foreground text-sm">This proposal link is missing a token.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-6">
          <Skeleton className="h-10 w-2/3 mb-4" />
          <Skeleton className="h-5 w-1/2 mb-8" />
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
    );
  }

  if (expiredInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <MailCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Fresh options on the way</h1>
          <p className="text-muted-foreground mb-4">{expiredInfo.message}</p>
          <p className="text-sm text-muted-foreground">
            We're sending an updated email to <span className="font-medium text-foreground">{expiredInfo.email}</span> right now.
          </p>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-xl font-semibold mb-2">Proposal not found</h1>
          <p className="text-muted-foreground text-sm mb-4">
            We couldn't find this proposal. It may have been removed.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Back to Travnr</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const p = data.proposal;
  const originLabel = p.originName ? `${p.originName} (${p.originIata})` : p.originIata;
  const destLabel = p.destinationName ? `${p.destinationName} (${p.destinationIata})` : p.destinationIata;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Travnr</span>
          </Link>
          {data.status === "booked" && (
            <Badge variant="outline" className="border-green-500 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Booked
            </Badge>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Your flight options are ready
          </h1>
          <p className="text-muted-foreground text-lg">
            Three options for{" "}
            <span className="font-medium text-foreground">{originLabel}</span>{" "}
            <ArrowRight className="inline w-4 h-4 mx-1 -mt-1" />{" "}
            <span className="font-medium text-foreground">{destLabel}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">
              {formatDate(p.departureDate)}
              {p.returnDate ? ` – ${formatDate(p.returnDate)}` : ""}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {p.passengers} {p.passengers === 1 ? "traveler" : "travelers"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 capitalize">
              {p.cabinClass.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {p.options.map((opt) => (
            <FlightOptionCard key={opt.token} option={opt} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Options valid for 24 hours. Click any option to enter passenger details and complete payment.
        </p>
      </main>
    </div>
  );
}
