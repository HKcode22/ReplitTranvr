import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, Clock, ArrowRight, CheckCircle2, MailCheck, AlertCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// Free airline-logo CDN. Kiwi.com publishes 64x64 PNGs for every IATA code
// without an API key. We render at 32–40px and fall back to hiding the
// broken <img> via onError so an unknown carrier code doesn't show a broken
// image icon next to the airline name.
function airlineLogoUrl(iata?: string | null): string | null {
  if (!iata) return null;
  const code = iata.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,3}$/.test(code)) return null;
  return `https://images.kiwi.com/airlines/64/${code}.png`;
}

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
  refundPolicyText?: string | null;
  changePolicyText?: string | null;
  seatSelectionText?: string | null;
  extensions?: string[] | null;
  similarOptions?: GuestOption[] | null;
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

// Airline logo with onError fallback. Tries the carrier's own logo first
// (Duffel offers ship one), then the kiwi.com CDN by IATA code, and finally
// hides the <img> entirely so only the airline name shows.
function AirlineLogo({
  carrierIata,
  carrierName,
  carrierLogo,
  size = 40,
}: {
  carrierIata?: string | null;
  carrierName?: string | null;
  carrierLogo?: string | null;
  size?: number;
}) {
  const kiwiUrl = airlineLogoUrl(carrierIata);
  const initialSrc = carrierLogo || kiwiUrl;
  const [src, setSrc] = useState<string | null>(initialSrc);
  const [triedKiwi, setTriedKiwi] = useState(!!carrierLogo ? false : true);
  if (!src) {
    return <Plane className="w-5 h-5 text-primary" aria-label={carrierName || "Airline"} />;
  }
  return (
    <img
      src={src}
      alt={carrierName || ""}
      style={{ width: size, height: size }}
      className="object-contain rounded"
      onError={() => {
        // First failure: fall back from carrier-supplied logo to kiwi.com.
        // Second failure: hide the image entirely (the parent renders the
        // airline name as a text label so identity is still preserved).
        if (!triedKiwi && kiwiUrl) {
          setTriedKiwi(true);
          setSrc(kiwiUrl);
        } else {
          setSrc(null);
        }
      }}
    />
  );
}

function SliceRow({
  slice,
  totalDurationMinutes,
  stops,
}: {
  slice: GuestSlice;
  totalDurationMinutes: number;
  stops: number;
}) {
  const stopsLabel = stops === 0 ? "Nonstop" : `${stops} stop${stops === 1 ? "" : "s"}`;
  return (
    <div className="rounded-lg bg-muted/40 border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-center">
          <div className="text-xl font-semibold">{formatTime(slice.departingAt)}</div>
          <div className="text-sm text-muted-foreground">{slice.origin?.iata}</div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDuration(totalDurationMinutes)}
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
  );
}

// Compact card for nested "Other similar options" — same booking flow as the
// main pick (each carries its own option token), just visually denser.
function SimilarOptionRow({ option }: { option: GuestOption }) {
  const outbound = option.slices?.[0];
  const stopsLabel = option.stops === 0 ? "Nonstop" : `${option.stops} stop${option.stops === 1 ? "" : "s"}`;
  const amount = `${(option.totalCurrency || "USD").toUpperCase()} ${Number(option.totalAmount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const returnSlice = option.slices?.[1];
  return (
    <div
      className="border rounded-lg p-3 bg-background"
      data-testid={`row-similar-${option.token}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <AirlineLogo
          carrierIata={option.carrierIata}
          carrierName={option.carrierName}
          carrierLogo={option.carrierLogo}
          size={28}
        />
        <span className="text-sm font-medium">{option.carrierName || "Airline"}</span>
        <span className="ml-auto text-sm font-semibold">{amount}</span>
      </div>
      {outbound && (
        <div className="text-xs text-muted-foreground">
          {formatTime(outbound.departingAt)} {outbound.origin?.iata} → {formatTime(outbound.arrivingAt)} {outbound.destination?.iata}
          <span className="mx-1">·</span>
          {formatDuration(option.totalDurationMinutes)}
          <span className="mx-1">·</span>
          {stopsLabel}
        </div>
      )}
      {returnSlice && (
        <div className="text-xs text-muted-foreground mt-1">
          Return {formatDate(returnSlice.departingAt)} · {formatTime(returnSlice.departingAt)} → {formatTime(returnSlice.arrivingAt)} · {formatDuration(returnSlice.durationMinutes)}
        </div>
      )}
      <Button
        asChild
        size="sm"
        variant="outline"
        className="w-full mt-2"
        data-testid={`button-book-similar-${option.token}`}
      >
        <a href={`/book/${encodeURIComponent(option.token)}`}>
          Book This Flight <ArrowRight className="w-3 h-3 ml-1" />
        </a>
      </Button>
    </div>
  );
}

function FlightOptionCard({ option }: { option: GuestOption }) {
  const outbound = option.slices?.[0];
  const returnSlice = option.slices?.[1];
  const isRoundTrip = !!returnSlice;
  const amount = `${(option.totalCurrency || "USD").toUpperCase()} ${Number(option.totalAmount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const [showSimilar, setShowSimilar] = useState(false);
  const similarCount = option.similarOptions?.length || 0;
  const slug = option.label.replace(/\s+/g, "-").toLowerCase();

  return (
    <Card className="p-6 border-2 hover-elevate transition-all" data-testid={`card-option-${slug}`}>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary uppercase tracking-wide text-xs font-semibold w-fit">
            {option.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide w-fit">
            {isRoundTrip ? "Round Trip" : "One Way"}
          </Badge>
        </div>
        <div className="text-right min-w-0">
          <div className="text-2xl font-bold break-words" data-testid={`text-price-${slug}`}>{amount}</div>
          <div className="text-xs text-muted-foreground">total for all travelers</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <AirlineLogo
          carrierIata={option.carrierIata}
          carrierName={option.carrierName}
          carrierLogo={option.carrierLogo}
          size={40}
        />
        <span className="font-medium">{option.carrierName || "Airline"}</span>
      </div>

      {outbound && (
        <div className="mb-4">
          {isRoundTrip && (
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
              Outbound · {formatDate(outbound.departingAt)}
            </div>
          )}
          <SliceRow
            slice={outbound}
            totalDurationMinutes={isRoundTrip ? outbound.durationMinutes : option.totalDurationMinutes}
            stops={outbound.stops}
          />
        </div>
      )}

      {returnSlice && (
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
            Return · {formatDate(returnSlice.departingAt)}
          </div>
          <SliceRow
            slice={returnSlice}
            totalDurationMinutes={returnSlice.durationMinutes}
            stops={returnSlice.stops}
          />
        </div>
      )}

      <div className="space-y-1 text-xs text-muted-foreground mb-4">
        {option.baggage && (
          <div data-testid={`text-baggage-${slug}`}>
            <span className="font-medium text-foreground">Baggage:</span> {option.baggage}
          </div>
        )}
        {policyText(option.refundable, option.changeable) && (
          <div data-testid={`text-cancellation-${slug}`}>
            <span className="font-medium text-foreground">Cancellation:</span>{" "}
            {policyText(option.refundable, option.changeable)}
          </div>
        )}
      </div>

      <Button
        asChild
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        data-testid={`button-book-${slug}`}
      >
        <a href={`/book/${encodeURIComponent(option.token)}`}>
          Book This Flight <ArrowRight className="w-4 h-4 ml-2" />
        </a>
      </Button>

      {similarCount > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowSimilar((v) => !v)}
            className="mt-4 w-full text-sm text-primary font-medium flex items-center justify-center gap-1 hover:underline"
            data-testid={`button-toggle-similar-${slug}`}
          >
            {showSimilar ? (
              <>
                <ChevronUp className="w-4 h-4" /> Hide other options
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> See {similarCount} other similar option{similarCount === 1 ? "" : "s"}
              </>
            )}
          </button>
          {/* Pre-rendered, hidden via CSS so the expansion is instant. */}
          <div
            className={showSimilar ? "block mt-3 space-y-2" : "hidden"}
            data-testid={`section-similar-${slug}`}
          >
            {option.similarOptions!.map((s) => (
              <SimilarOptionRow key={s.token} option={s} />
            ))}
          </div>
        </>
      )}
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
            <span className="rounded-full bg-primary/10 text-primary font-medium px-3 py-1" data-testid="badge-trip-type">
              {p.returnDate ? "Round Trip" : "One Way"}
            </span>
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
