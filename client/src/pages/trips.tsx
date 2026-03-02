import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Plane, MapPin, Calendar, Clock, Hash, ArrowRight,
  Luggage, Users, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

interface Trip {
  id: number;
  bookingReference: string | null;
  duffelOrderId: string | null;
  amount: string;
  currency: string;
  status: string;
  bookedAt: string;
  proposalId: number | null;
  order: any;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getDurationMinutes(departing: string, arriving: string) {
  return Math.round((new Date(arriving).getTime() - new Date(departing).getTime()) / 60000);
}

function getTripStatus(order: any): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (!order) return { label: "Booked", variant: "default" };
  const slices = order.slices || [];
  const now = new Date();
  const allSegments = slices.flatMap((s: any) => s.segments || []);
  if (allSegments.length === 0) return { label: "Booked", variant: "default" };

  const lastArrival = new Date(allSegments[allSegments.length - 1].arriving_at);
  const firstDeparture = new Date(allSegments[0].departing_at);

  if (now > lastArrival) return { label: "Completed", variant: "secondary" };
  if (now >= firstDeparture && now <= lastArrival) return { label: "In Progress", variant: "default" };
  return { label: "Upcoming", variant: "outline" };
}

function SegmentCard({ segment }: { segment: any }) {
  const carrier = segment.marketing_carrier || segment.operating_carrier || {};
  const duration = getDurationMinutes(segment.departing_at, segment.arriving_at);

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-md border flex items-center justify-center bg-muted/30 shrink-0 overflow-hidden">
        {carrier.logo_symbol_url ? (
          <img src={carrier.logo_symbol_url} alt={carrier.name} className="w-7 h-7 object-contain" />
        ) : (
          <Plane className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{carrier.name || "Airline"}</span>
          <span className="text-xs text-muted-foreground">{segment.marketing_carrier_flight_number || ""}</span>
          {segment.passengers?.[0]?.cabin_class_marketing_name && (
            <Badge variant="outline" className="text-[10px]">{segment.passengers[0].cabin_class_marketing_name}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <div className="text-center">
            <div className="font-semibold">{formatTime(segment.departing_at)}</div>
            <div className="text-xs text-muted-foreground">{segment.origin?.iata_code}</div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
            <div className="w-full h-px bg-border relative my-0.5">
              <Plane className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{formatTime(segment.arriving_at)}</div>
            <div className="text-xs text-muted-foreground">{segment.destination?.iata_code}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliceCard({ slice, label }: { slice: any; label: string }) {
  const segments = slice.segments || [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first || !last) return null;

  const stops = segments.length - 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-xs">{label}</Badge>
        <span className="text-sm font-medium">
          {first.origin?.city_name || first.origin?.iata_code} <ArrowRight className="w-3 h-3 inline" /> {last.destination?.city_name || last.destination?.iata_code}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDate(first.departing_at)}
          {stops > 0 && ` · ${stops} stop${stops > 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="divide-y">
        {segments.map((seg: any, i: number) => (
          <SegmentCard key={i} segment={seg} />
        ))}
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const [expanded, setExpanded] = useState(false);
  const order = trip.order;
  const slices = order?.slices || [];
  const passengers = order?.passengers || [];
  const status = getTripStatus(order);

  const firstSlice = slices[0];
  const lastSlice = slices[slices.length - 1];
  const firstSegments = firstSlice?.segments || [];
  const lastSegOfFirst = firstSegments[firstSegments.length - 1];
  const originCity = firstSegments[0]?.origin?.city_name || firstSegments[0]?.origin?.iata_code || "—";
  const originCode = firstSegments[0]?.origin?.iata_code || "";
  const destCity = lastSegOfFirst?.destination?.city_name || lastSegOfFirst?.destination?.iata_code || "—";
  const destCode = lastSegOfFirst?.destination?.iata_code || "";
  const departDate = firstSegments[0]?.departing_at;
  const returnDate = slices.length > 1 ? (lastSlice?.segments?.[0]?.departing_at || null) : null;

  const carrierLogo = firstSegments[0]?.marketing_carrier?.logo_symbol_url;
  const carrierName = firstSegments[0]?.marketing_carrier?.name;

  if (!firstSlice || firstSegments.length === 0) {
    return <TripCardFallback trip={trip} />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg border flex items-center justify-center bg-muted/30 shrink-0 overflow-hidden">
              {carrierLogo ? (
                <img src={carrierLogo} alt={carrierName} className="w-8 h-8 object-contain" />
              ) : (
                <Plane className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base">
                  {originCity} ({originCode}) <ArrowRight className="w-4 h-4 inline text-muted-foreground" /> {destCity} ({destCode})
                </h3>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                {carrierName && <span>{carrierName}</span>}
                {departDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(departDate)}
                    {returnDate && <> — {formatDate(returnDate)}</>}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold text-base">
              {trip.currency.toUpperCase()} {Number(trip.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            {trip.bookingReference && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 justify-end">
                <Hash className="w-3 h-3" />
                <span className="font-mono">{trip.bookingReference}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
          {passengers.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {passengers.length} traveler{passengers.length !== 1 ? "s" : ""}
              {passengers.length <= 3 && (
                <span className="ml-0.5">
                  ({passengers.map((p: any) => `${p.given_name} ${p.family_name}`).join(", ")})
                </span>
              )}
            </span>
          )}
          {slices.length > 1 && (
            <span className="flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" /> Round trip
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Booked {formatDate(trip.bookedAt)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {expanded ? "Hide details" : "View details"}
          </Button>
          {trip.proposalId && (
            <Link href={`/proposals/${trip.proposalId}`}>
              <Button variant="ghost" size="sm" className="text-xs">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Proposal
              </Button>
            </Link>
          )}
        </div>
      </div>

      {expanded && order && (
        <div className="border-t px-4 sm:px-5 py-4 space-y-4 bg-muted/10">
          {slices.map((slice: any, i: number) => (
            <SliceCard
              key={i}
              slice={slice}
              label={i === 0 ? "Outbound" : i === 1 ? "Return" : `Leg ${i + 1}`}
            />
          ))}

          {passengers.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Passengers
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {passengers.map((p: any, i: number) => (
                    <div key={i} className="text-sm border rounded-md px-3 py-2 bg-background">
                      <span className="font-medium">{p.title ? `${p.title}. ` : ""}{p.given_name} {p.family_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({p.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {order.conditions && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Luggage className="w-4 h-4" /> Conditions
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  {order.conditions.change_before_departure && (
                    <div className="border rounded-md px-3 py-2 bg-background">
                      <span className="text-muted-foreground">Changes: </span>
                      <span className={order.conditions.change_before_departure.allowed ? "text-green-600" : "text-red-500"}>
                        {order.conditions.change_before_departure.allowed ? "Allowed" : "Not allowed"}
                        {order.conditions.change_before_departure.penalty_amount && ` (${order.conditions.change_before_departure.penalty_currency} ${order.conditions.change_before_departure.penalty_amount} fee)`}
                      </span>
                    </div>
                  )}
                  {order.conditions.refund_before_departure && (
                    <div className="border rounded-md px-3 py-2 bg-background">
                      <span className="text-muted-foreground">Refunds: </span>
                      <span className={order.conditions.refund_before_departure.allowed ? "text-green-600" : "text-red-500"}>
                        {order.conditions.refund_before_departure.allowed ? "Allowed" : "Not allowed"}
                        {order.conditions.refund_before_departure.penalty_amount && ` (${order.conditions.refund_before_departure.penalty_currency} ${order.conditions.refund_before_departure.penalty_amount} fee)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function TripCardFallback({ trip }: { trip: Trip }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg border flex items-center justify-center bg-muted/30">
            <Plane className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Flight Booking</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {trip.bookingReference && (
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  <span className="font-mono">{trip.bookingReference}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {formatDate(trip.bookedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="font-semibold text-right">
          {trip.currency.toUpperCase()} {Number(trip.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>
    </Card>
  );
}

export default function TripsPage() {
  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Trips</h1>
          <p className="text-muted-foreground text-sm mt-1">Your booked flights and travel itineraries</p>
        </div>
        <Link href="/flights">
          <Button variant="outline" size="sm">
            <Plane className="w-4 h-4 mr-1" /> Search Flights
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex gap-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </Card>
          ))}
        </div>
      ) : !trips || trips.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No trips yet</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Once you book a flight — through a concierge proposal or direct search — your trips will appear here with full details.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/request-call">
              <Button variant="outline">Request a Call</Button>
            </Link>
            <Link href="/flights">
              <Button>Search Flights</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) =>
            trip.order ? (
              <TripCard key={trip.id} trip={trip} />
            ) : (
              <TripCardFallback key={trip.id} trip={trip} />
            )
          )}
        </div>
      )}
    </div>
  );
}