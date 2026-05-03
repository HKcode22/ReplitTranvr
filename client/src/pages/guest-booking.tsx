import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CheckCircle2, Clock, AlertTriangle, Plane } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PromoCodeInput, type AppliedPromo } from "@/components/promo-code-input";
import { ensureCsrfToken } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";
import { trackEvent } from "@/lib/analytics";
import { STATES_BY_COUNTRY, hasSubdivisions } from "@/lib/countries";
import { CountryCombobox } from "@/components/country-combobox";

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
  };
  pricing: {
    originalAmountCents: number;
    convenienceFeeCents: number;
    totalAmountCents: number;
    currency: string;
  };
  publishableKey: string | null;
}

interface PassengerForm {
  firstName: string;
  middleName?: string;
  lastName: string;
  // Date of birth captured as separate Month / Day / Year selects (AA-style)
  // and composed to YYYY-MM-DD on submit.
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  gender: "" | "m" | "f" | "x" | "u";
  title: "mr" | "ms" | "mrs" | "miss" | "dr";
  residenceCountry: string;
  residenceState?: string;
  loyaltyProgramme?: string;
  loyaltyNumber?: string;
  knownTravelerNumber?: string;
  knownTravelerCountry?: string;
  redressNumber?: string;
  redressCountry?: string;
  secondaryRedressNumber?: string;
  secondaryRedressCountry?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportExpiry?: string;
}

// Compose YYYY-MM-DD from the three DOB selects, zero-padding month/day.
// Returns "" if any part is missing so the validator can flag it.
function composeBornOn(p: PassengerForm): string {
  if (!p.dobYear || !p.dobMonth || !p.dobDay) return "";
  const mm = String(p.dobMonth).padStart(2, "0");
  const dd = String(p.dobDay).padStart(2, "0");
  return `${p.dobYear}-${mm}-${dd}`;
}

const MONTHS = [
  { v: "1", n: "January" }, { v: "2", n: "February" }, { v: "3", n: "March" },
  { v: "4", n: "April" }, { v: "5", n: "May" }, { v: "6", n: "June" },
  { v: "7", n: "July" }, { v: "8", n: "August" }, { v: "9", n: "September" },
  { v: "10", n: "October" }, { v: "11", n: "November" }, { v: "12", n: "December" },
];

// 1..31 — we don't disable invalid combinations (e.g. Feb 30) because the
// server-side schema and Duffel both reject malformed dates with a clearer
// error than juggling per-month day counts here.
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

// Year range: now-100 .. now-1 (no future birth dates).
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - 1 - i));

// Tailwind class for a native select styled like shadcn Input.
const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function RequiredDot() {
  return <span className="text-red-500 ml-0.5" aria-hidden>•</span>;
}

interface PassengerErrors {
  firstName?: string;
  lastName?: string;
  bornOn?: string;
  gender?: string;
  residenceCountry?: string;
  residenceState?: string;
  passport?: string;
}

function validatePassenger(p: PassengerForm, passportRequired: boolean): PassengerErrors {
  const errs: PassengerErrors = {};
  if (!p.firstName.trim()) errs.firstName = "First name is required";
  if (!p.lastName.trim()) errs.lastName = "Last name is required";
  if (!composeBornOn(p)) errs.bornOn = "Date of birth is required";
  if (!p.gender) errs.gender = "Gender is required";
  if (!p.residenceCountry) errs.residenceCountry = "Country / region is required";
  if (hasSubdivisions(p.residenceCountry) && !p.residenceState) {
    errs.residenceState = "State / province is required";
  }
  if (passportRequired) {
    if (!p.passportNumber || !p.passportCountry || !p.passportExpiry) {
      errs.passport = "Passport details are required for this trip";
    }
  }
  return errs;
}

function emptyPassenger(): PassengerForm {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    dobMonth: "",
    dobDay: "",
    dobYear: "",
    gender: "",
    title: "mr",
    residenceCountry: "",
    residenceState: "",
    loyaltyProgramme: "",
    loyaltyNumber: "",
    knownTravelerNumber: "",
    knownTravelerCountry: "",
    redressNumber: "",
    redressCountry: "",
    secondaryRedressNumber: "",
    secondaryRedressCountry: "",
  };
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

function policyText(refundable?: boolean | null, changeable?: boolean | null): string | null {
  if (refundable == null && changeable == null) return null;
  const r = refundable == null ? "Cancellation policy unavailable" : refundable ? "Refundable" : "Non-refundable";
  const c = changeable == null ? null : changeable ? "Changes allowed" : "No changes";
  return c ? `${r} · ${c}` : r;
}

function FlightSummary({ data }: { data: OptionResponse }) {
  const opt = data.option;
  const policy = policyText(opt.refundable, opt.changeable);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span
          className="inline-block text-[11px] font-bold tracking-wide uppercase text-white px-3 py-1 rounded-full"
          style={{ background: BRAND_BLUE }}
          data-testid="badge-option-label"
        >
          {opt.label}
        </span>
        {opt.carrierName && (
          <span className="text-sm text-gray-700 font-medium" data-testid="text-carrier-name">{opt.carrierName}</span>
        )}
      </div>
      {opt.slices.map((s, i) => (
        <div key={i} className="border-t border-gray-100 pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
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
      {opt.baggage && (
        <div className="text-sm text-gray-700 mt-3"><span className="font-medium text-gray-900">Baggage:</span> {opt.baggage}</div>
      )}
      {policy && (
        <div className="text-sm text-gray-700 mt-1"><span className="font-medium text-gray-900">Cancellation:</span> {policy}</div>
      )}
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
  onShowAllErrors: () => void;
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
      onShowAllErrors();
      toast({
        title: `Passenger ${(firstErrorPaxIdx ?? 0) + 1} is incomplete`,
        description: firstError,
        variant: "destructive",
      });
      return;
    }

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
            firstName: p.firstName.trim(),
            ...(p.middleName?.trim() ? { middleName: p.middleName.trim() } : {}),
            lastName: p.lastName.trim(),
            bornOn: composeBornOn(p),
            gender: p.gender,
            title: p.title,
            residenceCountry: p.residenceCountry,
            ...(p.residenceState ? { residenceState: p.residenceState } : {}),
            ...(p.loyaltyProgramme?.trim() ? { loyaltyProgramme: p.loyaltyProgramme.trim() } : {}),
            ...(p.loyaltyNumber?.trim() ? { loyaltyNumber: p.loyaltyNumber.trim() } : {}),
            ...(p.knownTravelerNumber?.trim() ? { knownTravelerNumber: p.knownTravelerNumber.trim() } : {}),
            ...(p.knownTravelerCountry ? { knownTravelerCountry: p.knownTravelerCountry } : {}),
            ...(p.redressNumber?.trim() ? { redressNumber: p.redressNumber.trim() } : {}),
            ...(p.redressCountry ? { redressCountry: p.redressCountry } : {}),
            ...(p.secondaryRedressNumber?.trim() ? { secondaryRedressNumber: p.secondaryRedressNumber.trim() } : {}),
            ...(p.secondaryRedressCountry ? { secondaryRedressCountry: p.secondaryRedressCountry } : {}),
            email: contact.email,
            phone: contact.phone,
            ...(p.passportNumber ? { passportNumber: p.passportNumber } : {}),
            ...(p.passportCountry ? { passportCountry: p.passportCountry } : {}),
            ...(p.passportExpiry ? { passportExpiry: p.passportExpiry } : {}),
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

// PassengerCard renders the standard airline-style passenger form. Layout
// mirrors the AA reference: required-field legend at the top, a 3-column
// First/Middle/Last row, Month/Day/Year DOB selects, a Gender + Country row
// with a State select that enables only when the country has subdivisions, a
// loyalty row, and a collapsible "Secure traveler information" section for
// KTN + redress (with an "Add secondary redress number" affordance). The
// existing passport section is preserved for trips where Duffel marks the
// offer as identity-document-required.
function PassengerCard({
  idx,
  passenger,
  passportRequired,
  showAllErrors,
  onChange,
}: {
  idx: number;
  passenger: PassengerForm;
  passportRequired: boolean;
  showAllErrors: boolean;
  onChange: (updater: (prev: PassengerForm) => PassengerForm) => void;
}) {
  const [secureOpen, setSecureOpen] = useState(false);
  const [showSecondaryRedress, setShowSecondaryRedress] = useState(
    !!passenger.secondaryRedressNumber,
  );
  const errors = validatePassenger(passenger, passportRequired);
  // Errors are only surfaced inline when a field has been touched (reduces
  // noise on first render) OR when the parent passes showAllErrors=true after
  // a submit attempt — in which case every required-field error is revealed
  // across every passenger card at once.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const showError = (k: keyof PassengerErrors) => (touched[k] || showAllErrors) && !!errors[k];

  const set = <K extends keyof PassengerForm>(key: K, value: PassengerForm[K]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const states = passenger.residenceCountry
    ? STATES_BY_COUNTRY[passenger.residenceCountry] || []
    : [];
  const stateEnabled = states.length > 0;

  const errorClass = (key: keyof PassengerErrors) =>
    showError(key) ? "border-red-400 focus-visible:ring-red-400" : "";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-900">Passenger {idx + 1}</h3>
        <span className="text-xs text-gray-500">
          <RequiredDot /> required
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Enter name as printed on government-issued photo ID.
      </p>

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-first`}>
            First name<RequiredDot />
          </Label>
          <Input
            id={`p-${idx}-first`}
            value={passenger.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            onBlur={() => touch("firstName")}
            className={errorClass("firstName")}
            data-testid={`input-pax-first-${idx}`}
            autoComplete="given-name"
          />
          {showError("firstName") && (
            <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`p-${idx}-middle`}>Middle name (optional)</Label>
          <Input
            id={`p-${idx}-middle`}
            value={passenger.middleName || ""}
            onChange={(e) => set("middleName", e.target.value)}
            data-testid={`input-pax-middle-${idx}`}
            autoComplete="additional-name"
          />
        </div>
        <div>
          <Label htmlFor={`p-${idx}-last`}>
            Last name<RequiredDot />
          </Label>
          <Input
            id={`p-${idx}-last`}
            value={passenger.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            onBlur={() => touch("lastName")}
            className={errorClass("lastName")}
            data-testid={`input-pax-last-${idx}`}
            autoComplete="family-name"
          />
          {showError("lastName") && (
            <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Date of birth — Month / Day / Year selects (AA reference) */}
      <div className="mb-4">
        <Label>
          Date of birth<RequiredDot />
        </Label>
        <div className="grid grid-cols-3 gap-3 mt-1">
          <select
            aria-label="Birth month"
            className={`${SELECT_CLASS} ${showError("bornOn") ? "border-red-400" : ""}`}
            value={passenger.dobMonth}
            onChange={(e) => set("dobMonth", e.target.value)}
            onBlur={() => touch("bornOn")}
            data-testid={`select-pax-dob-month-${idx}`}
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.v} value={m.v}>{m.n}</option>
            ))}
          </select>
          <select
            aria-label="Birth day"
            className={`${SELECT_CLASS} ${showError("bornOn") ? "border-red-400" : ""}`}
            value={passenger.dobDay}
            onChange={(e) => set("dobDay", e.target.value)}
            onBlur={() => touch("bornOn")}
            data-testid={`select-pax-dob-day-${idx}`}
          >
            <option value="">Day</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Birth year"
            className={`${SELECT_CLASS} ${showError("bornOn") ? "border-red-400" : ""}`}
            value={passenger.dobYear}
            onChange={(e) => set("dobYear", e.target.value)}
            onBlur={() => touch("bornOn")}
            data-testid={`select-pax-dob-year-${idx}`}
          >
            <option value="">Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {showError("bornOn") && (
          <p className="text-xs text-red-600 mt-1">{errors.bornOn}</p>
        )}
      </div>

      {/* Gender + Title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-gender`}>
            Gender<RequiredDot />
          </Label>
          <select
            id={`p-${idx}-gender`}
            className={`${SELECT_CLASS} ${errorClass("gender")}`}
            value={passenger.gender}
            onChange={(e) => set("gender", e.target.value as PassengerForm["gender"])}
            onBlur={() => touch("gender")}
            data-testid={`select-pax-gender-${idx}`}
          >
            <option value="">Select gender</option>
            <option value="m">Male</option>
            <option value="f">Female</option>
            <option value="x">Non-binary / X</option>
            <option value="u">Prefer not to say</option>
          </select>
          {showError("gender") && (
            <p className="text-xs text-red-600 mt-1">{errors.gender}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`p-${idx}-title`}>Title</Label>
          <select
            id={`p-${idx}-title`}
            className={SELECT_CLASS}
            value={passenger.title}
            onChange={(e) => set("title", e.target.value as PassengerForm["title"])}
            data-testid={`select-pax-title-${idx}`}
          >
            <option value="mr">Mr</option>
            <option value="ms">Ms</option>
            <option value="mrs">Mrs</option>
            <option value="miss">Miss</option>
            <option value="dr">Dr</option>
          </select>
        </div>
      </div>

      {/* Country / region of residence + State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-residence-country`}>
            Country / region of residence<RequiredDot />
          </Label>
          <CountryCombobox
            value={passenger.residenceCountry}
            onChange={(code) => {
              touch("residenceCountry");
              onChange((prev) => ({
                ...prev,
                residenceCountry: code,
                // Reset state whenever country changes — the previous state
                // code is meaningless under the new country's subdivisions.
                residenceState: "",
              }));
            }}
            ariaLabel="Country or region of residence"
            testId={`select-pax-residence-country-${idx}`}
            hasError={showError("residenceCountry")}
          />
          {showError("residenceCountry") && (
            <p className="text-xs text-red-600 mt-1">{errors.residenceCountry}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`p-${idx}-residence-state`}>
            State / province{stateEnabled && <RequiredDot />}
          </Label>
          <select
            id={`p-${idx}-residence-state`}
            className={`${SELECT_CLASS} ${errorClass("residenceState")}`}
            value={passenger.residenceState || ""}
            onChange={(e) => set("residenceState", e.target.value)}
            onBlur={() => touch("residenceState")}
            disabled={!stateEnabled}
            data-testid={`select-pax-residence-state-${idx}`}
          >
            <option value="">{stateEnabled ? "Select a state / province" : "—"}</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          {showError("residenceState") && (
            <p className="text-xs text-red-600 mt-1">{errors.residenceState}</p>
          )}
        </div>
      </div>

      {/* Loyalty programme (optional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <Label htmlFor={`p-${idx}-loyalty-prog`}>Loyalty program (optional)</Label>
          <Input
            id={`p-${idx}-loyalty-prog`}
            value={passenger.loyaltyProgramme || ""}
            onChange={(e) => set("loyaltyProgramme", e.target.value)}
            placeholder="e.g. AAdvantage"
            data-testid={`input-pax-loyalty-prog-${idx}`}
          />
        </div>
        <div>
          <Label htmlFor={`p-${idx}-loyalty-num`}>Loyalty number (optional)</Label>
          <Input
            id={`p-${idx}-loyalty-num`}
            value={passenger.loyaltyNumber || ""}
            onChange={(e) => set("loyaltyNumber", e.target.value)}
            data-testid={`input-pax-loyalty-num-${idx}`}
          />
        </div>
      </div>

      {/* Secure traveler information (collapsible) */}
      <div className="border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => setSecureOpen((v) => !v)}
          className="text-sm font-medium text-gray-800 hover:text-gray-900 focus:outline-none"
          data-testid={`button-pax-secure-toggle-${idx}`}
          aria-expanded={secureOpen}
        >
          {secureOpen ? "− " : "+ "}Secure traveler information (optional)
        </button>
        {secureOpen && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`p-${idx}-ktn`}>Known Traveler Number (KTN)</Label>
                <Input
                  id={`p-${idx}-ktn`}
                  value={passenger.knownTravelerNumber || ""}
                  onChange={(e) => set("knownTravelerNumber", e.target.value)}
                  data-testid={`input-pax-ktn-${idx}`}
                />
              </div>
              <div>
                <Label htmlFor={`p-${idx}-ktn-country`}>KTN issuing country</Label>
                <CountryCombobox
                  value={passenger.knownTravelerCountry || ""}
                  onChange={(code) => set("knownTravelerCountry", code)}
                  ariaLabel="KTN issuing country"
                  testId={`select-pax-ktn-country-${idx}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`p-${idx}-redress`}>Redress number</Label>
                <Input
                  id={`p-${idx}-redress`}
                  value={passenger.redressNumber || ""}
                  onChange={(e) => set("redressNumber", e.target.value)}
                  data-testid={`input-pax-redress-${idx}`}
                />
              </div>
              <div>
                <Label htmlFor={`p-${idx}-redress-country`}>Redress issuing country</Label>
                <CountryCombobox
                  value={passenger.redressCountry || ""}
                  onChange={(code) => set("redressCountry", code)}
                  ariaLabel="Redress issuing country"
                  testId={`select-pax-redress-country-${idx}`}
                />
              </div>
            </div>
            {!showSecondaryRedress ? (
              <button
                type="button"
                onClick={() => setShowSecondaryRedress(true)}
                className="text-sm font-medium hover:underline focus:outline-none"
                style={{ color: BRAND_BLUE }}
                data-testid={`button-pax-add-secondary-redress-${idx}`}
              >
                + Add secondary redress number
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`p-${idx}-redress2`}>Secondary redress number</Label>
                  <Input
                    id={`p-${idx}-redress2`}
                    value={passenger.secondaryRedressNumber || ""}
                    onChange={(e) => set("secondaryRedressNumber", e.target.value)}
                    data-testid={`input-pax-redress2-${idx}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`p-${idx}-redress2-country`}>Issuing country</Label>
                  <CountryCombobox
                    value={passenger.secondaryRedressCountry || ""}
                    onChange={(code) => set("secondaryRedressCountry", code)}
                    ariaLabel="Secondary redress issuing country"
                    testId={`select-pax-redress2-country-${idx}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Passport section — only when Duffel marks the offer as identity-doc-required */}
      {passportRequired && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">
            This flight requires passport details for every passenger.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor={`p-${idx}-passport-num`}>
                Passport number<RequiredDot />
              </Label>
              <Input
                id={`p-${idx}-passport-num`}
                value={passenger.passportNumber || ""}
                onChange={(e) => set("passportNumber", e.target.value)}
                onBlur={() => touch("passport")}
                className={errorClass("passport")}
                data-testid={`input-pax-passport-num-${idx}`}
              />
            </div>
            <div>
              <Label htmlFor={`p-${idx}-passport-country`}>
                Issuing country<RequiredDot />
              </Label>
              <CountryCombobox
                value={passenger.passportCountry || ""}
                onChange={(code) => {
                  touch("passport");
                  set("passportCountry", code);
                }}
                ariaLabel="Passport issuing country"
                testId={`select-pax-passport-country-${idx}`}
                hasError={showError("passport")}
              />
            </div>
            <div>
              <Label htmlFor={`p-${idx}-passport-expiry`}>
                Expiry date<RequiredDot />
              </Label>
              <Input
                id={`p-${idx}-passport-expiry`}
                type="date"
                value={passenger.passportExpiry || ""}
                onChange={(e) => set("passportExpiry", e.target.value)}
                onBlur={() => touch("passport")}
                className={errorClass("passport")}
                data-testid={`input-pax-passport-expiry-${idx}`}
              />
            </div>
          </div>
          {showError("passport") && (
            <p className="text-xs text-red-600 mt-2">{errors.passport}</p>
          )}
        </div>
      )}
    </div>
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
                      onShowAllErrors={() => setShowAllErrors(true)}
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
