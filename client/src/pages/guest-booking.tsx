import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CheckCircle2, Clock, AlertTriangle, Plane } from "lucide-react";

// Free airline logo CDN. Kiwi.com publishes 64x64 PNGs by IATA code without
// an API key. We fall back to the generic Plane icon if the lookup fails.
function airlineLogoUrl(iata?: string | null): string | null {
  if (!iata) return null;
  const code = iata.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,3}$/.test(code)) return null;
  return `https://images.kiwi.com/airlines/64/${code}.png`;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PromoCodeInput, type AppliedPromo } from "@/components/promo-code-input";
import { ensureCsrfToken } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";
import { trackEvent } from "@/lib/analytics";
import { PassengerCard } from "@/components/passenger-card";
import {
  type PassengerForm,
  validatePassenger,
  emptyPassenger,
  serializePassenger,
} from "@/lib/passenger-form";

const BRAND_BLUE = "#2d7abf";

interface OptionResponse {
  token: string;
  guestEmail: string;
  passengerCount: number;
  cabinClass: string;
  passportRequired: boolean;
  proposal: {
    originIata: string;
    originName?: string | null;
    destinationIata: string;
    destinationName?: string | null;
    departureDate: string;
    returnDate?: string | null;
  };
  option: {
    label: string;
    duffelOfferId: string;
    totalAmount: string;
    totalCurrency: string;
    totalDurationMinutes: number;
    stops: number;
    carrierName?: string | null;
    carrierIata?: string | null;
    carrierLogo?: string | null;
    slices: Array<{
      origin: { iata?: string | null; city?: string | null; name?: string | null };
      destination: { iata?: string | null; city?: string | null; name?: string | null };
      departingAt?: string | null;
      arrivingAt?: string | null;
      durationMinutes: number;
      stops: number;
    }>;
    baggage?: string | null;
    refundable?: boolean | null;
    changeable?: boolean | null;
    refundPolicyText?: string | null;
    changePolicyText?: string | null;
    seatSelectionText?: string | null;
    extensions?: string[] | null;
    isDuffel?: boolean;
    source?: string;
  };
  pricing: {
    originalAmountCents: number;
    convenienceFeeCents: number;
    totalAmountCents: number;
    currency: string;
  };
  publishableKey: string | null;
}

function formatMoney(cents: number, currency: string) {
  return `${(currency || "USD").toUpperCase()} ${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDuration(mins: number) {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}

function AirlineLogoImg({
  carrierIata,
  carrierName,
  carrierLogo,
  size = 32,
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
    return <Plane className="w-5 h-5 text-gray-400 shrink-0" aria-label={carrierName || "Airline"} />;
  }
  return (
    <img
      src={src}
      alt={carrierName || ""}
      style={{ width: size, height: size }}
      className="object-contain rounded shrink-0"
      onError={() => {
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

function prettyCabin(cabin: string): string {
  return cabin
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PolicySection({ data }: { data: OptionResponse }) {
  const opt = data.option;
  // Prefer the structured display strings the server now computes (which
  // distinguish "Partially refundable" from "Non-refundable" and surface
  // "Contact us for details" for SerpApi offers). Fall back to the older
  // boolean-only text for proposals saved before this field existed.
  const refundDisplay =
    opt.refundPolicyText ??
    (opt.refundable == null ? "Contact us for details" : opt.refundable ? "Refundable" : "Non-refundable");
  const changeDisplay =
    opt.changePolicyText ??
    (opt.changeable == null ? "Contact us for details" : opt.changeable ? "Changes allowed" : "No changes allowed");
  const seatsDisplay =
    opt.seatSelectionText ?? (opt.isDuffel === false ? "Contact us for details" : "Available during booking");
  const baggageDisplay = opt.baggage ?? "Contact us for details";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Fare details</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-gray-500">Cabin class</dt>
          <dd className="text-gray-900 font-medium" data-testid="text-policy-cabin">{prettyCabin(data.cabinClass)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-gray-500">Baggage allowance</dt>
          <dd className="text-gray-900" data-testid="text-policy-baggage">{baggageDisplay}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-gray-500">Cancellation policy</dt>
          <dd className="text-gray-900" data-testid="text-policy-cancellation">{refundDisplay}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-gray-500">Change policy</dt>
          <dd className="text-gray-900" data-testid="text-policy-change">{changeDisplay}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-gray-500">Seat selection</dt>
          <dd className="text-gray-900" data-testid="text-policy-seats">{seatsDisplay}</dd>
        </div>
      </dl>
      {opt.extensions && opt.extensions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Included details</div>
          <ul className="text-xs text-gray-700 space-y-0.5 list-disc pl-5">
            {opt.extensions.map((ext, i) => (
              <li key={i}>{ext}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FlightSummary({ data }: { data: OptionResponse }) {
  const opt = data.option;
  const isRoundTrip = opt.slices.length > 1;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="inline-block text-[11px] font-bold tracking-wide uppercase text-white px-3 py-1 rounded-full"
            style={{ background: BRAND_BLUE }}
            data-testid="badge-option-label"
          >
            {opt.label}
          </span>
          <span
            className="inline-block text-[10px] font-semibold tracking-wide uppercase text-gray-700 bg-gray-100 px-2 py-1 rounded-full"
            data-testid="badge-trip-type"
          >
            {isRoundTrip ? "Round Trip" : "One Way"}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <AirlineLogoImg
            carrierIata={opt.carrierIata}
            carrierName={opt.carrierName}
            carrierLogo={opt.carrierLogo}
            size={32}
          />
          {opt.carrierName && (
            <span className="text-sm text-gray-700 font-medium" data-testid="text-carrier-name">{opt.carrierName}</span>
          )}
        </div>
      </div>
      {opt.slices.map((s, i) => (
        <div key={i} className="border-t border-gray-100 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
          {isRoundTrip && (
            <div className="text-[10px] uppercase text-gray-500 tracking-wide font-semibold mb-1">
              {i === 0 ? "Outbound" : "Return"}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-gray-500 tracking-wide">Depart</div>
              <div className="text-lg font-semibold text-gray-900" data-testid={`text-depart-time-${i}`}>{formatTime(s.departingAt)}</div>
              <div className="text-xs text-gray-600">{s.origin.iata} · {formatDate(s.departingAt)}</div>
            </div>
            <Plane className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="text-right">
              <div className="text-[11px] uppercase text-gray-500 tracking-wide">Arrive</div>
              <div className="text-lg font-semibold text-gray-900" data-testid={`text-arrive-time-${i}`}>{formatTime(s.arrivingAt)}</div>
              <div className="text-xs text-gray-600">{s.destination.iata} · {formatDate(s.arrivingAt)}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1.5">
            {formatDuration(s.durationMinutes)} · {s.stops === 0 ? "Nonstop" : `${s.stops} stop${s.stops === 1 ? "" : "s"}`}
          </div>
        </div>
      ))}
    </div>
  );
}

function PriceBreakdown({
  pricing,
  appliedPromo,
}: {
  pricing: OptionResponse["pricing"];
  appliedPromo: AppliedPromo | null;
}) {
  // When a promo is active the displayed total is the promo override (server
  // also bypasses the convenience fee in that case). We hide the service-fee
  // line and add an explicit "Promo discount" line so the math reads cleanly.
  const totalCents = appliedPromo ? appliedPromo.overrideAmountCents : pricing.totalAmountCents;
  const discountCents = appliedPromo
    ? Math.max(0, pricing.originalAmountCents - appliedPromo.overrideAmountCents)
    : 0;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
        <span>Flight</span>
        <span data-testid="text-price-flight">{formatMoney(pricing.originalAmountCents, pricing.currency)}</span>
      </div>
      {!appliedPromo && pricing.convenienceFeeCents > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
          <span>Service fee</span>
          <span data-testid="text-price-fee">{formatMoney(pricing.convenienceFeeCents, pricing.currency)}</span>
        </div>
      )}
      {appliedPromo && (
        <div className="flex items-center justify-between text-sm text-emerald-700 mb-2">
          <span>Promo {appliedPromo.code}</span>
          <span data-testid="text-price-promo">−{formatMoney(discountCents, pricing.currency)}</span>
        </div>
      )}
      <div className="border-t border-gray-200 mt-3 pt-3 flex items-center justify-between font-semibold text-gray-900">
        <span>Total</span>
        <span className="text-xl" data-testid="text-price-total" style={{ color: BRAND_BLUE }}>
          {formatMoney(totalCents, pricing.currency)}
        </span>
      </div>
    </div>
  );
}

function CheckoutForm({
  data,
  contact,
  passengers,
  appliedPromo,
  onShowAllErrors,
  onResult,
}: {
  data: OptionResponse;
  contact: { firstName: string; lastName: string; email: string; phone: string };
  passengers: PassengerForm[];
  appliedPromo: AppliedPromo | null;
  onShowAllErrors: (next: boolean) => void;
  onResult: (status: "confirmed" | "pending_manual", bookingRef?: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!contact.firstName || !contact.lastName || !contact.email || !contact.phone) {
      toast({ title: "Missing details", description: "Please fill in your contact details.", variant: "destructive" });
      return;
    }
    let firstError: string | null = null;
    let firstErrorPaxIdx: number | null = null;
    for (let i = 0; i < passengers.length; i++) {
      const errs = validatePassenger(passengers[i], data.passportRequired);
      if (Object.keys(errs).length > 0 && firstError == null) {
        firstError = Object.values(errs)[0] || "Please complete every required field.";
        firstErrorPaxIdx = i;
      }
    }
    if (firstError != null) {
      // Reveal every required-field error inline (across every passenger card)
      // so the user doesn't have to blur each input one by one.
      onShowAllErrors(true);
      toast({
        title: `Passenger ${(firstErrorPaxIdx ?? 0) + 1} is incomplete`,
        description: firstError,
        variant: "destructive",
      });
      return;
    }
    // Validation passed — clear the bulk-reveal flag so subsequent edits
    // fall back to the gentler per-field touched-state behavior.
    onShowAllErrors(false);

    setSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: { billing_details: { email: contact.email, name: `${contact.firstName} ${contact.lastName}`, phone: contact.phone } },
        },
        redirect: "if_required",
      });
      if (result.error) {
        toast({ title: "Payment failed", description: result.error.message || "Please try again.", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const pi = result.paymentIntent;
      if (!pi || pi.status !== "succeeded") {
        toast({ title: "Payment not completed", description: "Please retry your payment.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const csrf = await ensureCsrfToken();
      const confirmRes = await fetch(`/api/guest-booking/${encodeURIComponent(data.token)}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          paymentIntentId: pi.id,
          contact,
          passengers: passengers.map((p) => ({
            ...serializePassenger(p),
            email: contact.email,
            phone: contact.phone,
          })),
        }),
      });
      const json = await confirmRes.json();
      if (!confirmRes.ok) {
        toast({ title: "Booking failed", description: json.message || "Please contact support.", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      trackEvent("guest_booking_completed", {
        status: json.status,
        promoApplied: !!appliedPromo,
      });
      onResult(json.status, json.bookingRef);
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message || "Please try again.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full text-base h-12"
        style={{ background: BRAND_BLUE }}
        data-testid="button-submit-payment"
      >
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Pay {formatMoney(
          appliedPromo ? appliedPromo.overrideAmountCents : data.pricing.totalAmountCents,
          data.pricing.currency,
        )} & Book
      </Button>
    </form>
  );
}


export default function GuestBookingPage() {
  const params = useParams<{ optionToken: string }>();
  const optionToken = params.optionToken;
  const [, setLocation] = useLocation();

  const [data, setData] = useState<OptionResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"expired" | "alreadyBooked" | "notFound" | "other" | null>(null);

  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [piLoading, setPiLoading] = useState(false);
  const [done, setDone] = useState<{ status: "confirmed" | "pending_manual"; bookingRef?: string | null } | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  // Flipped to true after a submit attempt with any invalid passenger field —
  // this forces every PassengerCard to surface its inline errors at once
  // instead of waiting for per-field blur events.
  const [showAllErrors, setShowAllErrors] = useState(false);

  // Fetch option details
  useEffect(() => {
    if (!optionToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/guest-booking/${encodeURIComponent(optionToken)}/option`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setErrorKind(res.status === 410 ? "expired" : res.status === 409 ? "alreadyBooked" : res.status === 404 ? "notFound" : "other");
          setLoadError(json.message || "Failed to load this booking option.");
          return;
        }
        setData(json);
        trackEvent("guest_booking_started", {
          passengerCount: json.passengerCount,
          cabinClass: json.cabinClass,
          optionLabel: json.option?.label,
          stops: json.option?.stops,
        });
        setContact((c) => ({ ...c, email: c.email || json.guestEmail || "" }));
        setPassengers(
          Array.from({ length: json.passengerCount || 1 }, () => emptyPassenger()),
        );
        if (json.publishableKey) setStripePromise(loadStripe(json.publishableKey));
      } catch (err: any) {
        if (cancelled) return;
        setErrorKind("other");
        setLoadError(err.message || "Failed to load booking option");
      }
    })();
    return () => { cancelled = true; };
  }, [optionToken]);

  // Monotonic request id for the PI-creation effect. We cancel any in-flight
  // request whose id no longer matches the latest, so a slow response from a
  // prior promo state cannot overwrite the clientSecret for the current one
  // (e.g. user types an invalid promo, then a valid one before the first
  // /payment-intent finishes — the late "no-promo" response must be ignored).
  const piRequestIdRef = useRef(0);

  // Create PaymentIntent once contact email is filled and option loaded.
  // Re-runs whenever the applied promo changes — onApply/onClear below null
  // out clientSecret so this effect refires with the new amount, ensuring
  // the PaymentElement always reflects the price the guest will be charged.
  useEffect(() => {
    if (!data || clientSecret) return;
    if (!contact.email) return;
    // Note: we intentionally DO NOT gate on `piLoading`. The request-id +
    // AbortController pair ensures any in-flight request is cancelled and
    // its late response ignored, so re-firing here is safe. Gating on
    // piLoading would deadlock the UI: when promo changes mid-request, the
    // cleanup aborts the old fetch, then the re-fire would see piLoading
    // still true and early-return, and the late finally — guarded by the
    // requestId mismatch — would never reset piLoading, leaving the form
    // stuck at "Preparing payment…".
    const requestId = ++piRequestIdRef.current;
    const controller = new AbortController();
    setPiLoading(true);
    ensureCsrfToken().then((csrf) =>
      fetch(`/api/guest-booking/${encodeURIComponent(data.token)}/payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        credentials: "include",
        body: JSON.stringify(appliedPromo ? { promoCode: appliedPromo.code } : {}),
        signal: controller.signal,
      }),
    )
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        // Drop the response if a newer request has been issued in the
        // meantime (promo state changed while this fetch was in flight).
        if (requestId !== piRequestIdRef.current) return;
        if (!ok) throw new Error(j.message || "Failed to create payment");
        setClientSecret(j.clientSecret);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        if (requestId !== piRequestIdRef.current) return;
        setLoadError(err.message);
      })
      .finally(() => {
        if (requestId === piRequestIdRef.current) setPiLoading(false);
      });
    return () => {
      // Promo (or other deps) changed before this request resolved — cancel
      // it so the stale response cannot win the setClientSecret race.
      controller.abort();
    };
  }, [data, contact.email, appliedPromo]);

  const elementsOptions = useMemo(
    () => (clientSecret ? { clientSecret, appearance: { theme: "stripe" as const } } : null),
    [clientSecret],
  );

  if (errorKind) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            {errorKind === "alreadyBooked" ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            )}
          </div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-error-title">
            {errorKind === "expired" && "These options have expired"}
            {errorKind === "alreadyBooked" && "This trip is already booked"}
            {errorKind === "notFound" && "Booking link not found"}
            {errorKind === "other" && "Something went wrong"}
          </h1>
          <p className="text-gray-600 mb-6">{loadError}</p>
          <Button
            onClick={() => setLocation("/")}
            style={{ background: BRAND_BLUE }}
            data-testid="button-go-home"
          >
            Back to Travnr
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    if (done.status === "confirmed") {
      return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6">
          <div className="max-w-lg text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-semibold mb-2" data-testid="text-success-title">You're booked!</h1>
            <p className="text-gray-600 mb-5">We've sent your confirmation to <span className="font-medium text-gray-900">{contact.email}</span>.</p>
            {done.bookingRef && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 mb-6 inline-block">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Booking reference</div>
                <div className="font-mono text-2xl font-bold text-gray-900 tracking-wider" data-testid="text-booking-ref">{done.bookingRef}</div>
              </div>
            )}
            <p className="text-sm text-gray-600 mb-4">Want to track your trip and get disruption alerts?</p>
            <Button
              onClick={() => setLocation(`/auth?mode=register&email=${encodeURIComponent(contact.email)}&name=${encodeURIComponent(`${contact.firstName} ${contact.lastName}`.trim())}&phone=${encodeURIComponent(contact.phone)}`)}
              style={{ background: BRAND_BLUE }}
              data-testid="button-create-account"
            >
              Set up my Travnr account
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-9 h-9 text-amber-600" />
          </div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-pending-title">We're confirming your flight</h1>
          <p className="text-gray-600 mb-3">
            Your payment was received. A member of our concierge team is finalizing your booking right now.
          </p>
          <p className="text-gray-600 mb-6">
            You'll have your confirmation in your inbox <span className="font-medium text-gray-900">within 2 hours</span>.
          </p>
          <Button onClick={() => setLocation("/")} style={{ background: BRAND_BLUE }} data-testid="button-go-home-pending">
            Back to Travnr
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: BRAND_BLUE }}>Travnr</h1>
          <span className="text-xs text-gray-500 hidden sm:block">Personal Travel Concierge</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">Confirm your flight</h2>
          <p className="text-sm text-gray-600">
            {data.proposal.originName || data.proposal.originIata} → {data.proposal.destinationName || data.proposal.destinationIata}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <FlightSummary data={data} />
            <PolicySection data={data} />
            <PriceBreakdown pricing={data.pricing} appliedPromo={appliedPromo} />
          </div>

          <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Contact details</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label htmlFor="contact-first">First name</Label>
                  <Input
                    id="contact-first"
                    value={contact.firstName}
                    onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                    data-testid="input-contact-first"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-last">Last name</Label>
                  <Input
                    id="contact-last"
                    value={contact.lastName}
                    onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                    data-testid="input-contact-last"
                  />
                </div>
              </div>
              <div className="mb-3">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  data-testid="input-contact-email"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="+1 555 123 4567"
                  data-testid="input-contact-phone"
                />
              </div>
            </div>

            {passengers.map((p, idx) => (
              <PassengerCard
                key={idx}
                idx={idx}
                passenger={p}
                passportRequired={data.passportRequired}
                showAllErrors={showAllErrors}
                onChange={(updater) => {
                  const next = [...passengers];
                  next[idx] = updater(next[idx]);
                  setPassengers(next);
                }}
              />
            ))}

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Payment</h3>
              <div className="mb-4">
                <PromoCodeInput
                  applied={appliedPromo}
                  onApply={(promo) => {
                    setAppliedPromo(promo);
                    // Force PaymentIntent recreation at the new amount.
                    setClientSecret(null);
                  }}
                  onClear={() => {
                    setAppliedPromo(null);
                    setClientSecret(null);
                  }}
                  currency={data.pricing.currency}
                  validateEndpoint={`/api/guest-booking/${encodeURIComponent(data.token)}/validate-promo`}
                />
              </div>
              {!clientSecret || !stripePromise || !elementsOptions ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing payment…
                </div>
              ) : (
                <ErrorBoundary boundary="guest-booking-payment">
                  <Elements
                    /* Re-mount Elements when the PI changes so the wallet
                       buttons (Apple Pay / Google Pay) re-quote the new total. */
                    key={clientSecret}
                    stripe={stripePromise}
                    options={elementsOptions}
                  >
                    <CheckoutForm
                      data={data}
                      contact={contact}
                      passengers={passengers}
                      appliedPromo={appliedPromo}
                      onShowAllErrors={(next) => setShowAllErrors(next)}
                      onResult={(status, bookingRef) => setDone({ status, bookingRef })}
                    />
                  </Elements>
                </ErrorBoundary>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center">
              By booking you agree to Travnr's terms. We'll email your confirmation to {contact.email || "your address"}.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
