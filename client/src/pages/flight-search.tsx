import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/phone-input";
import { PromoCodeInput, type AppliedPromo } from "@/components/promo-code-input";
import { useToast } from "@/hooks/use-toast";
import { AirportSearch } from "@/components/airport-search";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { TravelerProfile } from "@shared/schema";
import { PassengerCard } from "@/components/passenger-card";
import {
  emptyPassenger,
  decomposeBornOn,
  validatePassenger,
  serializePassenger,
  type PassengerForm,
} from "@/lib/passenger-form";
import {
  Search, Plane, Clock, Luggage, ArrowRight, Loader2, Check,
  ArrowLeft, User, CreditCard, Users, Shield, Plus, Minus, Lock, AlertCircle, FileText
} from "lucide-react";

const searchSchema = z.object({
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().optional().default(""),
  cabinClass: z.string().optional().default("economy"),
});

type SearchFormValues = z.infer<typeof searchSchema>;

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(dur: string) {
  if (!dur) return "";
  const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return dur;
  const h = match[1] ? `${match[1]}h` : "";
  const m = match[2] ? ` ${match[2]}m` : "";
  return `${h}${m}`.trim();
}

function FlightSummaryCard({ offer, compact }: { offer: any; compact?: boolean }) {
  return (
    <div className="space-y-2">
      {offer.slices?.map((slice: any, si: number) => (
        <div key={slice.id || si} className={compact ? "p-2 rounded-md border bg-muted/20" : "p-3 rounded-md border bg-muted/20"}>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{slice.origin?.city || slice.origin?.iata}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{slice.destination?.city || slice.destination?.iata}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {slice.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(slice.duration)}
                </span>
              )}
              <span>
                {slice.segments?.length > 1
                  ? `${slice.segments.length - 1} stop${slice.segments.length > 2 ? "s" : ""}`
                  : "Direct"}
              </span>
            </div>
          </div>
          {slice.segments?.map((seg: any) => (
            <div key={seg.id} className="flex items-center gap-3 py-1.5 border-t border-border first:border-t-0">
              {seg.carrier?.logoUrl && (
                <img src={seg.carrier.logoUrl} alt={seg.carrier.name} className="w-6 h-6 rounded object-contain shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{seg.carrier?.name}</span>
                  <span>{seg.carrier?.iata}{seg.flightNumber}</span>
                  {seg.cabinClass && <span>{seg.cabinClass}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-semibold">{formatTime(seg.departingAt)}</span>
                  <span className="text-xs text-muted-foreground">{seg.origin?.iata}</span>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30 mx-1" />
                  <span className="text-sm font-semibold">{formatTime(seg.arrivingAt)}</span>
                  <span className="text-xs text-muted-foreground">{seg.destination?.iata}</span>
                </div>
                {!compact && (
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span>{formatDate(seg.departingAt)}</span>
                    {seg.aircraft && <span>{seg.aircraft}</span>}
                    {seg.baggages?.map((b: any, i: number) => (
                      <span key={i} className="flex items-center gap-0.5">
                        <Luggage className="w-3 h-3" />
                        {b.quantity > 0 ? `${b.quantity} ${b.type}` : `No ${b.type}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function OfferCard({ offer, onSelect, passengerCount }: { offer: any; onSelect: (offer: any) => void; passengerCount: number }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const saveProposalMutation = useMutation({
    mutationFn: async () => {
      const originSlice = offer.slices?.[0];
      const destCity = originSlice?.destination?.city || originSlice?.destination?.iata || "Trip";
      const originCity = originSlice?.origin?.city || originSlice?.origin?.iata || "";
      const title = `Flight: ${originCity} to ${destCity}`;

      const res = await apiRequest("POST", "/api/proposals", {
        title,
        summary: `${offer.owner?.name || "Airline"} flight for ${passengerCount} traveler${passengerCount > 1 ? "s" : ""}`,
        items: [{
          type: "flight",
          description: title,
          priceEstimate: offer.totalAmount,
          duffelOfferId: offer.id,
          duffelOfferData: offer,
        }],
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Saved as proposal", description: "You can review and book from your Proposals page." });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      navigate(`/proposals/${data.id}`);
    },
    onError: (err: any) => {
      toast({ title: "Failed to save proposal", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="p-4 space-y-3" data-testid={`card-offer-${offer.id}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-semibold" data-testid={`text-offer-price-${offer.id}`}>
            {offer.totalCurrency} {Number(offer.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {offer.owner?.name && <span>{offer.owner.name}</span>}
            {passengerCount > 1 && <span>for {passengerCount} travelers</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => saveProposalMutation.mutate()}
            disabled={saveProposalMutation.isPending}
            data-testid={`button-save-proposal-${offer.id}`}
          >
            {saveProposalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
            Save as Proposal
          </Button>
          <Button
            onClick={() => onSelect(offer)}
            disabled={!!offer.passengerIdentityDocumentsRequired}
            title={offer.passengerIdentityDocumentsRequired ? "Identity documents required — not yet supported" : undefined}
            data-testid={`button-select-offer-${offer.id}`}
          >
            <Check className="w-4 h-4 mr-1" /> Book Now
          </Button>
        </div>
      </div>
      <FlightSummaryCard offer={offer} />
      {offer.passengerIdentityDocumentsRequired && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>This fare requires passenger identity documents (passport/ID). Online booking is not available for this offer.</span>
        </div>
      )}
    </Card>
  );
}

function StripeCheckoutForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      onError(error.message || "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      <Button type="submit" disabled={!stripe || processing} className="w-full mt-4 gap-2" data-testid="button-pay-stripe">
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {processing ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}

function CheckoutView({ offer, onBack, passengerCount }: { offer: any; onBack: () => void; passengerCount: number }) {
  const { toast } = useToast();
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [checkoutStep, setCheckoutStep] = useState<"passengers" | "payment" | "processing" | "payment_error">("passengers");
  const [bookingError, setBookingError] = useState<{ message: string; paymentCharged: boolean } | null>(null);
  // Serialized passenger payload (post-validation) cached so we can re-fire
  // bookMutation after Stripe confirms without re-reading form state.
  const [passengerData, setPassengerData] = useState<Record<string, unknown>[] | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { data: profile } = useQuery<TravelerProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const { data: duffelConfig } = useQuery<{ testMode: boolean }>({
    queryKey: ["/api/duffel/config"],
  });

  const isTestMode = !!duffelConfig?.testMode;
  const requiresIdentityDocs = !!offer?.passengerIdentityDocumentsRequired;

  const flightSubtotalCents = Math.round(parseFloat(offer.totalAmount) * 100);
  const totalWithFeeCents = Math.ceil(flightSubtotalCents * 1.05);
  const convenienceFeeCents = totalWithFeeCents - flightSubtotalCents;
  const flightSubtotal = (flightSubtotalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
  const convenienceFee = (convenienceFeeCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
  const totalWithFee = (totalWithFeeCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
  const hasProfileData = !!(profile?.name || profile?.dateOfBirth || profile?.gender || profile?.title || profile?.phone);

  // Local passenger state (one card per traveler). Uses the same standardized
  // PassengerForm shape as the guest-booking flow so the wire contract and
  // validation are shared via @/lib/passenger-form.
  const [passengers, setPassengers] = useState<PassengerForm[]>(() =>
    Array.from({ length: passengerCount }, () => emptyPassenger()),
  );
  // Single contact phone for the whole booking. The new PassengerCard does
  // not collect phone per-passenger (Duffel only needs one contact phone),
  // and this matches the guest-booking flow's contact section.
  const [contactPhone, setContactPhone] = useState("");
  // Flipped to true after a submit attempt with any invalid passenger field
  // so every PassengerCard surfaces its inline errors at once.
  const [showAllErrors, setShowAllErrors] = useState(false);

  // Resize the passenger array when the search-step traveler count changes.
  useEffect(() => {
    setPassengers((prev) => {
      if (prev.length === passengerCount) return prev;
      if (prev.length < passengerCount) {
        return [...prev, ...Array.from({ length: passengerCount - prev.length }, () => emptyPassenger())];
      }
      return prev.slice(0, passengerCount);
    });
  }, [passengerCount]);

  // Auto-fill the first passenger from the user's saved TravelerProfile.
  // Only fires once when the profile arrives AND the first passenger is
  // still pristine, so we never clobber user edits.
  const profileSeededRef = useRef(false);
  useEffect(() => {
    if (!profile || profileSeededRef.current) return;
    profileSeededRef.current = true;
    setPassengers((prev) => {
      const next = [...prev];
      const first = next[0] || emptyPassenger();
      const nameParts = (profile.name || "").trim().split(/\s+/);
      const dob = decomposeBornOn(profile.dateOfBirth);
      next[0] = {
        ...first,
        firstName: first.firstName || nameParts[0] || "",
        lastName: first.lastName || nameParts.slice(1).join(" ") || "",
        dobYear: first.dobYear || dob.dobYear,
        dobMonth: first.dobMonth || dob.dobMonth,
        dobDay: first.dobDay || dob.dobDay,
        gender: first.gender || (((profile.gender as PassengerForm["gender"]) || "")),
        title: first.title || ((profile.title as PassengerForm["title"]) || "mr"),
      };
      return next;
    });
    if (profile.phone) setContactPhone((p) => p || profile.phone || "");
  }, [profile]);

  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  const effectiveTotalCents = appliedPromo
    ? appliedPromo.overrideAmountCents
    : totalWithFeeCents;
  const effectiveTotal = (effectiveTotalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      const [configRes, piRes] = await Promise.all([
        fetch("/api/stripe/config", { credentials: "include" }).then(r => r.json()),
        apiRequest("POST", "/api/stripe/create-flight-payment-intent", {
          amount: offer.totalAmount,
          currency: offer.totalCurrency,
          offerId: offer.id,
          ...(appliedPromo ? { promoCode: appliedPromo.code } : {}),
        }).then(r => r.json()),
      ]);
      return { ...piRes, publishableKey: configRes.publishableKey };
    },
    onSuccess: (data: any) => {
      setStripePaymentIntentId(data.paymentIntentId);
      setStripeClientSecret(data.clientSecret);
      setStripePromise(loadStripe(data.publishableKey));
      setCheckoutStep("payment");
    },
    onError: (err: any) => {
      toast({ title: "Payment setup failed", description: err.message, variant: "destructive" });
    },
  });

  const bookingCalledRef = useRef(false);

  const bookMutation = useMutation({
    mutationFn: async ({ stripePaymentIntentId: piId, useBalance, passengers: paxArg }: { stripePaymentIntentId?: string; useBalance?: boolean; passengers?: Record<string, unknown>[] }) => {
      const pax = paxArg || passengerData;
      if (!pax) throw new Error("Missing passenger data");
      const res = await apiRequest("POST", "/api/duffel/book-direct", {
        offerId: offer.id,
        passengers: pax,
        ...(useBalance ? { useBalance: true } : { stripePaymentIntentId: piId }),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setBookingResult({ ...data.booking, pendingManual: data.status === "pending_manual" });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      if (data.status === "pending_manual") {
        toast({ title: "Payment received", description: "Our concierge team will finalize your booking shortly." });
      } else {
        toast({ title: "Flight booked successfully!" });
      }
    },
    onError: async (err: any, variables: any) => {
      bookingCalledRef.current = false;
      const raw = err.message?.replace(/^\d+:\s*/, "") || "Booking failed";
      let msg = raw;
      try { const parsed = JSON.parse(raw); msg = parsed.message || raw; } catch {}

      const isNetworkError = !err.status && (
        raw.toLowerCase().includes("load failed") ||
        raw.toLowerCase().includes("failed to fetch") ||
        raw.toLowerCase().includes("networkerror") ||
        raw.toLowerCase().includes("network request failed")
      );

      const paymentWasCharged = !variables?.useBalance && !!variables?.stripePaymentIntentId;

      if (isNetworkError && paymentWasCharged && variables?.stripePaymentIntentId) {
        // Payment succeeded but connection dropped — check if booking was recorded server-side
        try {
          const recoveryRes = await fetch(`/api/payments/by-intent/${variables.stripePaymentIntentId}`, { credentials: "include" });
          if (recoveryRes.ok) {
            const recoveryData = await recoveryRes.json();
            setBookingResult(recoveryData.payment ? { ...recoveryData.payment, bookingReference: recoveryData.bookingReference, orderId: recoveryData.orderId } : null);
            if (recoveryData.payment) {
              queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
              queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
              toast({ title: "Flight booked successfully!" });
              return;
            }
          }
        } catch {}
        // Booking not found in DB — payment charged but booking may not have gone through
        setBookingError({
          message: "Your payment was processed, but we lost the connection before confirming your booking. Your card may have been charged. Please check your email for a booking confirmation, or visit the Trips page. If no booking appears within a few minutes, please contact support.",
          paymentCharged: true,
        });
        setCheckoutStep("payment_error");
      } else {
        toast({ title: "Booking failed", description: msg, variant: "destructive" });
        setCheckoutStep("payment");
        setPaymentError("Booking failed: " + msg);
        setBookingError({ message: msg, paymentCharged: false });
      }
    },
  });

  const handleStripePaymentSuccess = useCallback(() => {
    if (bookingCalledRef.current) return;
    bookingCalledRef.current = true;
    setPaymentError(null);
    setCheckoutStep("processing");
    bookMutation.mutate({ stripePaymentIntentId: stripePaymentIntentId! });
  }, [stripePaymentIntentId]);

  const handlePassengerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate every passenger card AND the single contact phone before
    // even thinking about creating a Stripe PaymentIntent. We surface all
    // errors at once (rather than one-card-at-a-time) so the traveler can
    // fix everything in a single pass.
    const allErrors = passengers.map((p) => validatePassenger(p, requiresIdentityDocs));
    const hasFieldError = allErrors.some((errs) => Object.keys(errs).length > 0);
    const phoneOk = !!contactPhone && /^\+/.test(contactPhone);
    if (hasFieldError || !phoneOk) {
      setShowAllErrors(true);
      toast({
        title: "Please complete all required fields",
        description: !phoneOk
          ? "A contact phone in international format (+1...) is required."
          : "Some passenger details are missing or invalid.",
        variant: "destructive",
      });
      return;
    }
    // Inject the single contact phone into every passenger record — the
    // server's buildPassengerMappings reads pax.phone first, then falls back.
    const serialized = passengers.map((p) => ({
      ...serializePassenger(p),
      phone: contactPhone,
    }));
    setPassengerData(serialized);
    setPaymentError(null);
    if (isTestMode) {
      bookingCalledRef.current = true;
      setCheckoutStep("processing");
      bookMutation.mutate({ useBalance: true, passengers: serialized });
    } else {
      createPaymentIntentMutation.mutate();
    }
  };

  if (bookingResult?.pendingManual) {
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center space-y-4 border-amber-500/30">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold" data-testid="text-booking-pending-manual">Payment Received</h2>
          <p className="text-muted-foreground">
            Your payment has been received. Our concierge team is finalizing your booking and will email you shortly with your confirmation.
          </p>
          <div className="rounded-md border p-4 text-left bg-muted/30">
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-semibold">{offer.totalCurrency} {totalWithFee}</span>
            </div>
          </div>
          <FlightSummaryCard offer={offer} compact />
        </Card>
        <Button variant="outline" onClick={onBack} data-testid="button-search-again-pending">
          <ArrowLeft className="w-4 h-4 mr-1" /> Search More Flights
        </Button>
      </div>
    );
  }

  if (bookingResult) {
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold" data-testid="text-booking-confirmed">Booking Confirmed</h2>
          <p className="text-muted-foreground">Your flight has been booked successfully.</p>
          <div className="rounded-md border p-4 text-left bg-muted/30">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Booking Reference</span>
                <span className="font-mono font-semibold" data-testid="text-booking-ref">{bookingResult.bookingReference}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs">{bookingResult.orderId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold">
                  {offer.totalCurrency} {totalWithFee}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Travelers</span>
                <span>{passengerCount}</span>
              </div>
            </div>
          </div>
          <FlightSummaryCard offer={offer} compact />
        </Card>
        <Button variant="outline" onClick={onBack} data-testid="button-search-again">
          <ArrowLeft className="w-4 h-4 mr-1" /> Search More Flights
        </Button>
      </div>
    );
  }

  if (checkoutStep === "payment_error") {
    const charged = bookingError?.paymentCharged;
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold">Booking {charged ? "Status Unknown" : "Failed"}</h2>
          <p className="text-sm text-muted-foreground text-left">{bookingError?.message}</p>
          {!charged && (
            <div className="flex gap-3 flex-wrap justify-center">
              <Button variant="outline" onClick={() => { setCheckoutStep("payment"); setBookingError(null); }}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Try Again
              </Button>
            </div>
          )}
          {charged && (
            <div className="flex gap-3 flex-wrap justify-center">
              <a href="/trips">
                <Button variant="outline"><FileText className="w-4 h-4 mr-1" /> Check My Trips</Button>
              </a>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (checkoutStep === "processing") {
    return (
      <div className="space-y-4">
        <Card className="p-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <h2 className="text-xl font-bold">Processing Your Booking</h2>
          <p className="text-muted-foreground text-sm">
            {bookMutation.isPending ? "Creating your booking..." :
             "Finalizing..."}
          </p>
          <p className="text-xs text-muted-foreground">Please do not close this page</p>
        </Card>
      </div>
    );
  }

  if (checkoutStep === "payment") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setCheckoutStep("passengers"); setStripeClientSecret(null); setStripePaymentIntentId(null); setStripePromise(null); bookingCalledRef.current = false; setPaymentError(null); }} data-testid="button-back-to-passengers">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to passenger details
        </Button>

        <h2 className="text-xl font-bold" data-testid="text-payment-title">Payment</h2>

        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plane className="w-4 h-4" /> Flight Summary
          </h3>
          <FlightSummaryCard offer={offer} compact />
          <Separator className="my-3" />
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Flight subtotal {passengerCount > 1 ? `(${passengerCount} travelers)` : ""}</span>
              <span data-testid="text-payment-subtotal">{offer.totalCurrency} {flightSubtotal}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Convenience fee (5%)</span>
              <span data-testid="text-payment-fee">{offer.totalCurrency} {convenienceFee}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between font-semibold text-base">
              <span>Total</span>
              <span data-testid="text-payment-total">{offer.totalCurrency} {totalWithFee}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Secure Payment
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Pay securely with card, Apple Pay, or Google Pay.</p>

          <div className="min-h-[120px]" data-testid="container-card-form">
            {stripePromise && stripeClientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret, appearance: { theme: "stripe" } }}>
                <StripeCheckoutForm onSuccess={handleStripePaymentSuccess} onError={(msg) => setPaymentError(msg)} />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading secure payment form...</span>
              </div>
            )}
          </div>

          {paymentError && (
            <div className="mt-3 p-3 rounded-md border border-destructive/50 bg-destructive/5">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {paymentError}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-results">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to results
      </Button>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold" data-testid="text-checkout-title">Checkout</h2>
        {!isTestMode && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="default">1</Badge>
            <span>Passengers</span>
            <ArrowRight className="w-3 h-3" />
            <Badge variant="outline">2</Badge>
            <span>Payment</span>
          </div>
        )}
        {isTestMode && (
          <Badge variant="secondary" className="text-xs">
            <Shield className="w-3 h-3 mr-1" /> Test Mode — Balance Payment
          </Badge>
        )}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Plane className="w-4 h-4" /> Flight Summary
        </h3>
        <FlightSummaryCard offer={offer} />
        <Separator className="my-4" />
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Flight subtotal {passengerCount > 1 ? `(${passengerCount} travelers)` : ""}</span>
            <span data-testid="text-checkout-subtotal">{offer.totalCurrency} {flightSubtotal}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Convenience fee (5%)</span>
            <span data-testid="text-checkout-fee">{offer.totalCurrency} {convenienceFee}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between font-semibold text-lg">
            <span>Total</span>
            <span data-testid="text-checkout-total">{offer.totalCurrency} {totalWithFee}</span>
          </div>
        </div>
      </Card>

      {requiresIdentityDocs && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>This fare requires passenger identity documents (passport/ID). Booking may not complete — please choose a different offer.</span>
        </div>
      )}

      {paymentError && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {paymentError}
          </p>
        </div>
      )}

      <form onSubmit={handlePassengerSubmit} className="space-y-4">
        {/* Single contact phone for the booking — Duffel needs one phone on
            the order, not one per traveler. Defaults from the user's saved
            profile when available. */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <User className="w-4 h-4" /> Contact phone
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Used by the airline to reach you about this booking.
          </p>
          <Label htmlFor="contact-phone">Phone number</Label>
          <PhoneInput
            value={contactPhone}
            onChange={setContactPhone}
            data-testid="input-contact-phone"
          />
          {showAllErrors && (!contactPhone || !/^\+/.test(contactPhone)) && (
            <p className="text-xs text-red-600 mt-2" data-testid="error-contact-phone">
              A contact phone in international format (+1...) is required.
            </p>
          )}
        </Card>

        {passengers.map((passenger, index) => (
          <div key={index} className="space-y-2">
            {/* PassengerCard renders its own bordered card + numbered header,
                so we only add a small auto-fill caption above it here. */}
            {index === 0 && hasProfileData && (
              <p className="text-xs text-muted-foreground">Auto-filled from your profile</p>
            )}
            {index === 0 && !hasProfileData && (
              <p className="text-xs text-muted-foreground">Complete your profile to auto-fill this next time</p>
            )}
            <PassengerCard
              idx={index}
              passenger={passenger}
              passportRequired={requiresIdentityDocs}
              showAllErrors={showAllErrors}
              onChange={(updater) =>
                setPassengers((prev) => {
                  const next = [...prev];
                  next[index] = updater(next[index]);
                  return next;
                })
              }
            />
          </div>
        ))}

        <Card className="p-4">
          <PromoCodeInput
            applied={appliedPromo}
            onApply={setAppliedPromo}
            onClear={() => setAppliedPromo(null)}
            currency={offer.totalCurrency}
          />
        </Card>

        <Button
          type="submit"
          disabled={createPaymentIntentMutation.isPending || bookMutation.isPending}
          className="w-full"
          data-testid="button-continue-to-payment"
        >
          {(createPaymentIntentMutation.isPending || bookMutation.isPending) ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : isTestMode ? (
            <Plane className="w-4 h-4 mr-2" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          {isTestMode
            ? `Book Flight — ${offer.totalCurrency} ${effectiveTotal}`
            : `Continue to Payment — ${offer.totalCurrency} ${effectiveTotal}`
          }
        </Button>
      </form>
    </div>
  );
}

export default function FlightSearchPage() {
  const initialParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialOrigin = initialParams.get("origin") || "";
  const initialDestination = initialParams.get("destination") || "";
  const initialOriginName = initialParams.get("originName") || "";
  const initialDestinationName = initialParams.get("destinationName") || "";
  const initialPassengers = Math.max(1, Math.min(9, parseInt(initialParams.get("passengers") || "1", 10) || 1));

  const [offers, setOffers] = useState<any[]>([]);
  const [originCode, setOriginCode] = useState(initialOrigin);
  const [destCode, setDestCode] = useState(initialDestination);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [passengerCount, setPassengerCount] = useState(initialPassengers);
  const { toast } = useToast();

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      departureDate: initialParams.get("departureDate") || "",
      returnDate: initialParams.get("returnDate") || "",
      cabinClass: initialParams.get("cabinClass") || "economy",
    },
  });

  const originLabel = initialOrigin ? `${initialOrigin}${initialOriginName ? ` - ${initialOriginName}` : ""}` : "";
  const destLabel = initialDestination ? `${initialDestination}${initialDestinationName ? ` - ${initialDestinationName}` : ""}` : "";

  const searchMutation = useMutation({
    mutationFn: async (data: SearchFormValues) => {
      if (!originCode || originCode.length < 2) {
        throw new Error("Please select an origin airport");
      }
      if (!destCode || destCode.length < 2) {
        throw new Error("Please select a destination airport");
      }
      const passengers = Array.from({ length: passengerCount }, () => ({ type: "adult" as const }));
      const res = await apiRequest("POST", "/api/duffel/search", {
        origin: originCode,
        destination: destCode,
        departureDate: data.departureDate,
        returnDate: data.returnDate || undefined,
        passengers,
        cabinClass: data.cabinClass,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setOffers(data.offers || []);
      setSelectedOffer(null);
      if (!data.offers?.length) {
        toast({ title: "No flights found", description: "Try different dates or airports." });
      }
    },
    onError: (err: any) => {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    },
  });

  if (selectedOffer) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <CheckoutView
          offer={selectedOffer}
          onBack={() => setSelectedOffer(null)}
          passengerCount={passengerCount}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold" data-testid="text-flight-search-title">Search Flights</h1>
        <p className="text-muted-foreground text-sm mt-1">Find and book flights for up to 9 travelers</p>
      </div>

      <Card className="p-5 mb-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => searchMutation.mutate(data))} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">From</label>
                <AirportSearch
                  value={originCode}
                  onChange={(code) => setOriginCode(code)}
                  placeholder="Search city or airport..."
                  initialLabel={originLabel}
                  data-testid="input-origin"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">To</label>
                <AirportSearch
                  value={destCode}
                  onChange={(code) => setDestCode(code)}
                  placeholder="Search city or airport..."
                  initialLabel={destLabel}
                  data-testid="input-destination"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField control={form.control} name="departureDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-departure-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="returnDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Return (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-return-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cabinClass" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cabin Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-cabin-class">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="premium_economy">Premium Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div>
                <label className="text-sm font-medium mb-1.5 block">Travelers</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPassengerCount((c) => Math.max(1, c - 1))}
                    disabled={passengerCount <= 1}
                    data-testid="button-decrease-passengers"
                    aria-label="Decrease traveler count"
                  >
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                    <Users className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium" data-testid="text-passenger-count" aria-live="polite" aria-label={`${passengerCount} traveler${passengerCount === 1 ? "" : "s"}`}>{passengerCount}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPassengerCount((c) => Math.min(9, c + 1))}
                    disabled={passengerCount >= 9}
                    data-testid="button-increase-passengers"
                    aria-label="Increase traveler count"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={searchMutation.isPending} data-testid="button-search-flights">
              {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Search Flights
            </Button>
          </form>
        </Form>
      </Card>

      {searchMutation.isPending && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      )}

      {offers.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-results-count">
            {offers.length} flight{offers.length !== 1 ? "s" : ""} found
            {passengerCount > 1 ? ` for ${passengerCount} travelers` : ""}
          </p>
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onSelect={setSelectedOffer} passengerCount={passengerCount} />
          ))}
        </div>
      )}

      {!searchMutation.isPending && offers.length === 0 && searchMutation.isSuccess && (
        <Card className="p-8 text-center">
          <Plane className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No flights found. Try different dates or destinations.</p>
        </Card>
      )}
    </div>
  );
}
