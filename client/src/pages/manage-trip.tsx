// Public Manage a Trip page: lookup booking, then submit a request via
// the shared TripCard with a guest-flow onManageSubmit.

import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import SEO from "@/components/seo";
import { TripCard, TripCardFallback, type Trip } from "@/pages/trips";

interface ManageTripLookup {
  token: string;
  trip: Trip;
}

export default function ManageTripPage() {
  const { toast } = useToast();
  const [lastName, setLastName] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookup, setLookup] = useState<ManageTripLookup | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !confirmationCode.trim()) return;
    setLooking(true);
    try {
      const res = await apiRequest("POST", "/api/public/manage-trip/lookup", {
        lastName: lastName.trim(),
        confirmationCode: confirmationCode.trim(),
      });
      const data = (await res.json()) as ManageTripLookup;
      setLookup(data);
    } catch (err: any) {
      toast({
        title: "We couldn't find that booking",
        description: "Double-check the last name and confirmation code.",
        variant: "destructive",
      });
    } finally {
      setLooking(false);
    }
  };

  const handleManageSubmit = async ({ type, message }: { type: "refund" | "cancel" | "change"; message: string }) => {
    if (!lookup) throw new Error("Booking session expired.");
    await apiRequest("POST", "/api/public/manage-trip/request", {
      token: lookup.token,
      type,
      message,
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Manage your Travnr trip"
        description="Look up your Travnr booking and request a refund, cancellation, or change."
        path="/manage-trip"
      />
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center" data-testid="link-manage-trip-home">
            <span className="font-serif font-semibold text-lg">Travnr</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold">Manage your Travnr trip</h1>
          <p className="text-muted-foreground text-sm">
            Look up your booking with the last name on the reservation and the
            confirmation code (e.g. <span className="font-mono">ABC123</span>).
            Then request a refund, cancellation, or change — our concierge team
            will reply within one business day.
          </p>
        </div>

        {!lookup && (
          <Card className="p-5 sm:p-6">
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="manage-trip-last-name">Last name on booking</Label>
                <Input
                  id="manage-trip-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                  data-testid="input-manage-last-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manage-trip-ref">Confirmation code</Label>
                <Input
                  id="manage-trip-ref"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  required
                  data-testid="input-manage-confirmation-code"
                />
              </div>
              <Button type="submit" disabled={looking} className="w-full" data-testid="button-manage-lookup">
                {looking ? "Looking up…" : "Find my booking"}
              </Button>
            </form>
          </Card>
        )}

        {lookup && !submitted && (
          <div className="space-y-4">
            {lookup.trip.order
              ? <TripCard trip={lookup.trip} onManageSubmit={handleManageSubmit} />
              : <TripCardFallback trip={lookup.trip} onManageSubmit={handleManageSubmit} />}
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setLookup(null); }}
                data-testid="button-manage-back"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Look up a different booking
              </Button>
            </div>
          </div>
        )}

        {submitted && (
          <Card className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Request received</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Thanks! A member of our concierge team will reply within one business day.
              We've also emailed you a confirmation.
            </p>
            <div className="pt-2">
              <Link href="/">
                <Button variant="outline">Back to home</Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
