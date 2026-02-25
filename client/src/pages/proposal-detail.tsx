import { useState, useEffect, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { PhoneInput } from "@/components/phone-input";
import { useToast } from "@/hooks/use-toast";
import type { ItineraryProposal, ProposalItem, Payment, TravelerProfile } from "@shared/schema";
import {
  ArrowLeft, Plane, Hotel, Package, Check, CreditCard, Loader2, Clock,
  Luggage, ArrowRight, User, Lock, Shield, AlertCircle, Users, Plus, Minus
} from "lucide-react";

type ProposalDetail = ItineraryProposal & {
  items: ProposalItem[];
  payments: Payment[];
};

const passengerSchema = z.object({
  givenName: z.string().min(1, "First name is required"),
  familyName: z.string().min(1, "Last name is required"),
  bornOn: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  title: z.string().min(1, "Title is required"),
  phone: z.string().min(1, "Phone is required").regex(/^\+/, "Must start with + (international format)"),
});

const checkoutSchema = z.object({
  passengers: z.array(passengerSchema).min(1),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

const typeIcons: Record<string, any> = {
  flight: Plane,
  hotel: Hotel,
  other: Package,
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDuration(dur: string) {
  if (!dur) return "";
  const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return dur;
  const h = match[1] ? `${match[1]}h` : "";
  const m = match[2] ? ` ${match[2]}m` : "";
  return `${h}${m}`.trim();
}

function FlightSegmentCard({ segment }: { segment: any }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {segment.carrier?.logoUrl && (
        <img
          src={segment.carrier.logoUrl}
          alt={segment.carrier.name}
          className="w-8 h-8 rounded object-contain shrink-0"
          data-testid={`img-carrier-${segment.id}`}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" data-testid={`text-carrier-${segment.id}`}>
            {segment.carrier?.name || "Airline"}
          </span>
          <span className="text-xs text-muted-foreground">
            {segment.carrier?.iata}{segment.flightNumber}
          </span>
          {segment.cabinClass && (
            <span className="text-xs text-muted-foreground">
              {segment.cabinClass}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="text-center">
            <p className="text-sm font-semibold" data-testid={`text-depart-time-${segment.id}`}>{formatTime(segment.departingAt)}</p>
            <p className="text-xs text-muted-foreground">{segment.origin?.iata}</p>
          </div>
          <div className="flex-1 flex items-center gap-1 px-2">
            <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
            <Plane className="w-3 h-3 text-muted-foreground rotate-90 shrink-0" />
            <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" data-testid={`text-arrive-time-${segment.id}`}>{formatTime(segment.arrivingAt)}</p>
            <p className="text-xs text-muted-foreground">{segment.destination?.iata}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{formatDate(segment.departingAt)}</span>
          {segment.aircraft && <span>{segment.aircraft}</span>}
          {segment.baggages?.map((b: any, i: number) => (
            <span key={i} className="flex items-center gap-0.5">
              <Luggage className="w-3 h-3" />
              {b.quantity > 0 ? `${b.quantity} ${b.type}` : `No ${b.type}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DuffelFlightCard({ offerData }: { offerData: any }) {
  if (!offerData?.slices) return null;

  return (
    <div className="space-y-3 mt-2">
      {offerData.slices.map((slice: any, si: number) => (
        <div key={slice.id || si} className="rounded-md border p-3 bg-muted/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{slice.origin?.city || slice.origin?.iata}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{slice.destination?.city || slice.destination?.iata}</span>
            </div>
            {slice.duration && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDuration(slice.duration)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            {slice.segments?.length > 1
              ? <span>{slice.segments.length - 1} stop{slice.segments.length > 2 ? "s" : ""}</span>
              : <span>Direct</span>}
          </div>
          <div className="space-y-1 divide-y divide-border">
            {slice.segments?.map((seg: any) => (
              <FlightSegmentCard key={seg.id} segment={seg} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StripePaymentForm({
  clientSecret,
  onSuccess,
  onError,
  isProcessing,
  totalAmount,
  totalCurrency,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
  isProcessing: boolean;
  totalAmount: number;
  totalCurrency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements || submitting || isProcessing) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (error) {
      onError(error.message || "Payment failed");
      setSubmitting(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      onError("Payment not completed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div data-testid="container-stripe-payment-element">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!stripe || !elements || submitting || isProcessing}
        className="w-full"
        data-testid="button-pay-now"
      >
        {(submitting || isProcessing) ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Lock className="w-4 h-4 mr-2" />
        )}
        Pay {totalCurrency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} & Book Flight
      </Button>
    </div>
  );
}

function ProposalCheckout({ proposal, selectedItem, onCancel }: { proposal: ProposalDetail; selectedItem: ProposalItem; onCancel: () => void }) {
  const { toast } = useToast();
  const [checkoutStep, setCheckoutStep] = useState<"passengers" | "payment" | "processing">("passengers");
  const [passengerData, setPassengerData] = useState<CheckoutFormValues | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [activeOfferData, setActiveOfferData] = useState<any>(selectedItem.duffelOfferData as any);
  const [isLoadingOffer, setIsLoadingOffer] = useState(false);

  const offerData = selectedItem.duffelOfferData as any;
  const originalPassengerCount = offerData?.passengers?.length || 1;
  const totalCurrency = activeOfferData?.totalCurrency || "USD";
  const totalAmount = parseFloat(activeOfferData?.totalAmount || selectedItem.priceEstimate);

  const [desiredPassengerCount, setDesiredPassengerCount] = useState(originalPassengerCount);

  const { data: profile } = useQuery<TravelerProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const { data: stripeConfig } = useQuery<{ publishableKey: string | null }>({
    queryKey: ["/api/stripe/config"],
  });

  const hasProfileData = !!(profile?.name && profile?.dateOfBirth && profile?.gender && profile?.title && profile?.phone);

  const emptyPassenger = () => ({ givenName: "", familyName: "", bornOn: "", gender: "m", title: "mr", phone: "" });

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      passengers: Array.from({ length: originalPassengerCount }, (_, i) =>
        i === 0 ? emptyPassenger() : emptyPassenger()
      ),
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "passengers" });

  useEffect(() => {
    if (profile && hasProfileData) {
      const current = form.getValues("passengers");
      const nameParts = (profile.name || "").split(" ");
      current[0] = {
        givenName: nameParts[0] || current[0].givenName,
        familyName: nameParts.slice(1).join(" ") || current[0].familyName,
        bornOn: profile.dateOfBirth || current[0].bornOn,
        gender: profile.gender || current[0].gender,
        title: profile.title || current[0].title,
        phone: profile.phone || current[0].phone,
      };
      form.reset({ passengers: current });
    }
  }, [profile]);

  const adjustPassengerCount = (newCount: number) => {
    const clamped = Math.max(1, Math.min(9, newCount));
    const current = fields.length;
    if (clamped > current) {
      for (let i = current; i < clamped; i++) append(emptyPassenger());
    } else if (clamped < current) {
      for (let i = current - 1; i >= clamped; i--) remove(i);
    }
    setDesiredPassengerCount(clamped);
    setActiveOfferData(offerData);
  };

  const confirmBookingMutation = useMutation({
    mutationFn: async ({ paymentIntentId, overrideOfferId, overrideOfferData: ood }: { paymentIntentId: string; overrideOfferId?: string; overrideOfferData?: any }) => {
      if (!passengerData) throw new Error("Missing passenger data");
      const res = await apiRequest("POST", "/api/stripe/confirm-booking", {
        paymentIntentId,
        proposalId: proposal.id,
        itemId: selectedItem.id,
        passengers: passengerData.passengers,
        overrideOfferId,
        overrideOfferData: ood,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setBookingResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", String(proposal.id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Flights booked successfully!" });
    },
    onError: (err: any) => {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
      setCheckoutStep("payment");
      setPaymentError("Booking failed: " + err.message);
    },
  });

  const handleStripeSuccess = useCallback((paymentIntentId: string) => {
    setCheckoutStep("processing");
    const isOverride = activeOfferData?.id !== offerData?.id;
    confirmBookingMutation.mutate({
      paymentIntentId,
      overrideOfferId: isOverride ? activeOfferData?.id : undefined,
      overrideOfferData: isOverride ? activeOfferData : undefined,
    });
  }, [activeOfferData, offerData]);

  const handleStripeError = useCallback((msg: string) => {
    setPaymentError(msg);
  }, []);

  const handlePassengerSubmit = async (data: CheckoutFormValues) => {
    setPassengerData(data);
    setIsLoadingOffer(true);
    try {
      let currentOfferData = activeOfferData;

      if (desiredPassengerCount !== (activeOfferData?.passengers?.length || 1)) {
        const firstSlice = offerData?.slices?.[0];
        const lastSlice = offerData?.slices?.[offerData.slices.length - 1];
        const origin = firstSlice?.origin?.iata;
        const destination = firstSlice?.destination?.iata;
        const departureDate = firstSlice?.segments?.[0]?.departingAt?.substring(0, 10);
        const returnDate = offerData?.slices?.length > 1 ? lastSlice?.segments?.[0]?.departingAt?.substring(0, 10) : undefined;
        const cabinClass = firstSlice?.segments?.[0]?.cabinClass?.toLowerCase().replace(" ", "_") || "economy";

        if (origin && destination && departureDate) {
          const res = await apiRequest("POST", "/api/duffel/search-for-passengers", {
            origin,
            destination,
            departureDate,
            returnDate,
            cabinClass,
            passengerCount: desiredPassengerCount,
          });
          const result = await res.json();
          currentOfferData = result.offer;
          setActiveOfferData(currentOfferData);
        }
      }

      if (!stripeConfig?.publishableKey) {
        toast({ title: "Payment setup failed", description: "Stripe is not configured", variant: "destructive" });
        setIsLoadingOffer(false);
        return;
      }

      const stripe = await loadStripe(stripeConfig.publishableKey);
      setStripeInstance(stripe);

      const amount = parseFloat(currentOfferData?.totalAmount || selectedItem.priceEstimate);
      const currency = (currentOfferData?.totalCurrency || "USD").toLowerCase();

      const piRes = await apiRequest("POST", "/api/stripe/create-payment-intent", {
        proposalId: proposal.id,
        itemId: selectedItem.id,
        amount,
        currency,
      });
      const piData = await piRes.json();
      setStripeClientSecret(piData.clientSecret);
      setStripePaymentIntentId(piData.paymentIntentId);
      setCheckoutStep("payment");
    } catch (err: any) {
      toast({ title: "Payment setup failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingOffer(false);
    }
  };

  if (bookingResult) {
    const refs = bookingResult?.bookings?.map((b: any) => b.bookingReference).filter(Boolean).join(", ");
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold" data-testid="text-booking-confirmed">Booking Confirmed</h2>
          <p className="text-muted-foreground">Your flight for "{proposal.title}" has been booked.</p>
          {refs && (
            <div className="rounded-md border p-4 text-left bg-muted/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Booking Reference</span>
                  <span className="font-mono font-semibold" data-testid="text-booking-ref">{refs}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold">
                    {totalCurrency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
        <div className="flex gap-3 flex-wrap">
          <Link href="/proposals">
            <Button variant="outline" data-testid="button-back-to-proposals">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Proposals
            </Button>
          </Link>
          <Link href="/billing">
            <Button variant="outline" data-testid="button-view-billing">
              <CreditCard className="w-4 h-4 mr-1" /> View in Billing
            </Button>
          </Link>
        </div>
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
            Booking flights for "{proposal.title}"...
          </p>
          <p className="text-xs text-muted-foreground">Please do not close this page</p>
        </Card>
      </div>
    );
  }

  if (checkoutStep === "payment") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setCheckoutStep("passengers"); setStripeClientSecret(null); setPaymentError(null); }} data-testid="button-back-to-passengers">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to passenger details
        </Button>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-bold" data-testid="text-payment-title">Payment</h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline">1</Badge>
            <span>Passengers</span>
            <ArrowRight className="w-3 h-3" />
            <Badge variant="default">2</Badge>
            <span>Payment</span>
          </div>
        </div>

        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plane className="w-4 h-4" /> Selected Flight
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{selectedItem.description}</p>
          <DuffelFlightCard offerData={activeOfferData} />
          <Separator className="my-3" />
          <div className="flex items-center justify-between font-semibold">
            <span>Total {desiredPassengerCount > 1 ? `(${desiredPassengerCount} travelers)` : ""}</span>
            <span data-testid="text-payment-total">
              {totalCurrency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Secure Payment
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Pay with Apple Pay, Google Pay, or card. Your payment is processed securely by Stripe.
          </p>

          <div className="min-h-[120px]">
            {stripeClientSecret && stripeInstance ? (
              <Elements
                stripe={stripeInstance}
                options={{
                  clientSecret: stripeClientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <StripePaymentForm
                  clientSecret={stripeClientSecret}
                  onSuccess={handleStripeSuccess}
                  onError={handleStripeError}
                  isProcessing={confirmBookingMutation.isPending}
                  totalAmount={totalAmount}
                  totalCurrency={totalCurrency}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading payment form...</span>
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
      <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-cancel-checkout">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to proposal
      </Button>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-bold" data-testid="text-checkout-title">Book Flights</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="default">1</Badge>
          <span>Passengers</span>
          <ArrowRight className="w-3 h-3" />
          <Badge variant="outline">2</Badge>
          <span>Payment</span>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Plane className="w-4 h-4" /> Selected Flight
        </h3>
        <p className="text-sm text-muted-foreground mb-2">{selectedItem.description}</p>
        <DuffelFlightCard offerData={activeOfferData} />
        <Separator className="my-4" />
        <div className="flex items-center justify-between font-semibold text-lg">
          <span>Total {desiredPassengerCount > 1 ? `(${desiredPassengerCount} travelers)` : ""}</span>
          <span data-testid="text-checkout-total">
            {totalCurrency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Number of Passengers
        </h3>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => adjustPassengerCount(desiredPassengerCount - 1)}
            disabled={desiredPassengerCount <= 1}
            data-testid="button-decrease-passengers"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-xl font-semibold w-8 text-center" data-testid="text-passenger-count">{desiredPassengerCount}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => adjustPassengerCount(desiredPassengerCount + 1)}
            disabled={desiredPassengerCount >= 9}
            data-testid="button-increase-passengers"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">traveler{desiredPassengerCount > 1 ? "s" : ""}</span>
        </div>
        {desiredPassengerCount !== originalPassengerCount && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Shield className="w-3 h-3" /> A new flight offer will be searched for {desiredPassengerCount} passenger{desiredPassengerCount > 1 ? "s" : ""} when you continue.
          </p>
        )}
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handlePassengerSubmit)} className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-5">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                {desiredPassengerCount === 1 ? "Passenger Details" : `Traveler ${index + 1}`}
              </h3>
              {index === 0 && hasProfileData && (
                <p className="text-xs text-muted-foreground mb-4">Auto-filled from your profile</p>
              )}
              {index === 0 && !hasProfileData && (
                <p className="text-xs text-muted-foreground mb-4">Complete your profile to auto-fill this next time</p>
              )}
              {index > 0 && (
                <p className="text-xs text-muted-foreground mb-4">Enter details for additional traveler</p>
              )}
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name={`passengers.${index}.title`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <Select onValueChange={f.onChange} value={f.value}>
                        <FormControl>
                          <SelectTrigger data-testid={`select-title-${index}`}><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mr">Mr</SelectItem>
                          <SelectItem value="mrs">Mrs</SelectItem>
                          <SelectItem value="ms">Ms</SelectItem>
                          <SelectItem value="miss">Miss</SelectItem>
                          <SelectItem value="dr">Dr</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`passengers.${index}.gender`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={f.onChange} value={f.value}>
                        <FormControl>
                          <SelectTrigger data-testid={`select-gender-${index}`}><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="m">Male</SelectItem>
                          <SelectItem value="f">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name={`passengers.${index}.givenName`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>First Name (as on passport)</FormLabel>
                      <FormControl>
                        <Input {...f} data-testid={`input-given-name-${index}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`passengers.${index}.familyName`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Last Name (as on passport)</FormLabel>
                      <FormControl>
                        <Input {...f} data-testid={`input-family-name-${index}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name={`passengers.${index}.bornOn`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...f} data-testid={`input-born-on-${index}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`passengers.${index}.phone`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput value={f.value} onChange={f.onChange} data-testid={`input-phone-${index}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </Card>
          ))}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoadingOffer}
            data-testid="button-continue-to-payment"
          >
            {isLoadingOffer ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            {isLoadingOffer
              ? desiredPassengerCount !== originalPassengerCount
                ? "Searching flights..."
                : "Setting up payment..."
              : "Continue to Payment"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default function ProposalDetailPage() {
  const [, params] = useRoute("/proposals/:id");
  const id = params?.id;
  const { toast } = useToast();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedFlightItem, setSelectedFlightItem] = useState<ProposalItem | null>(null);

  const { data: proposal, isLoading } = useQuery<ProposalDetail>({
    queryKey: ["/api/proposals", id],
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/proposals/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Proposal approved!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/proposals/${id}/pay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Payment successful!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isPaid = proposal?.payments?.some((p) => p.status === "paid");
  const hasDuffelFlights = proposal?.items?.some((i) => i.duffelOfferId);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Proposal not found</p>
      </div>
    );
  }

  if (showCheckout && selectedFlightItem && proposal.status === "approved" && hasDuffelFlights && !isPaid) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <ProposalCheckout
          proposal={proposal}
          selectedItem={selectedFlightItem}
          onCancel={() => { setShowCheckout(false); setSelectedFlightItem(null); }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <Link href="/proposals">
        <Button variant="ghost" size="sm" data-testid="button-back-proposals">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-serif text-2xl font-bold" data-testid="text-proposal-title">{proposal.title}</h1>
        <StatusBadge status={proposal.status} />
        {isPaid && <StatusBadge status="paid" />}
      </div>

      {proposal.summary && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
          <p className="text-sm" data-testid="text-proposal-summary">{proposal.summary}</p>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Flight Options</h3>
        <div className="space-y-4">
          {proposal.items?.map((item, idx) => {
            const Icon = typeIcons[item.type] || Package;
            const offerData = item.duffelOfferData as any;
            const isFirst = idx === 0;
            const price = offerData?.totalAmount || item.priceEstimate;
            const currency = offerData?.totalCurrency || "USD";
            const canBook = proposal.status === "approved" && !isPaid && item.duffelOfferId;

            return (
              <Card
                key={item.id}
                data-testid={`item-${item.id}`}
                className={`p-4 ${isFirst ? "border-primary/40" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{item.description}</p>
                        {isFirst && <Badge variant="secondary">Recommended</Badge>}
                      </div>
                      <StatusBadge status={item.type} />
                    </div>
                  </div>
                  <span className="font-semibold whitespace-nowrap text-lg" data-testid={`text-price-${item.id}`}>
                    {currency !== "USD"
                      ? `${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}`
                      : `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </span>
                </div>
                {item.duffelOfferId && offerData && (
                  <DuffelFlightCard offerData={offerData} />
                )}
                {canBook && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={() => { setSelectedFlightItem(item); setShowCheckout(true); }}
                      data-testid={`button-book-item-${item.id}`}
                    >
                      <Plane className="w-4 h-4 mr-2" />
                      Select & Book
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {proposal.payments && proposal.payments.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Payment & Booking History</h3>
          <div className="space-y-3">
            {proposal.payments.map((payment) => (
              <div key={payment.id} className="space-y-1" data-testid={`payment-${payment.id}`}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span>${Number(payment.amount).toLocaleString()} {payment.currency.toUpperCase()}</span>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
                {payment.duffelBookingRef && (
                  <p className="text-xs text-muted-foreground ml-6" data-testid={`text-booking-ref-${payment.id}`}>
                    Booking ref: <span className="font-mono font-medium">{payment.duffelBookingRef}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        {proposal.status === "sent" && (
          <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} data-testid="button-approve-proposal">
            {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Approve Proposal
          </Button>
        )}
        {proposal.status === "approved" && !isPaid && !hasDuffelFlights && (
          <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} data-testid="button-pay-proposal">
            {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
            Pay ${Number(proposal.totalEstimate).toLocaleString()}
          </Button>
        )}
      </div>
    </div>
  );
}
