import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ChevronLeft, ChevronRight, MapPin, Plane } from "lucide-react";
import type { CallRequest, ItineraryProposal, CalendarEntry, CalendarEntryDetails } from "@shared/schema";

function entryHref(entry: CalendarEntry): string {
  if (entry.proposalId) return `/proposals/${entry.proposalId}`;
  if (entry.paymentId) return `/trips#trip-${entry.paymentId}`;
  return "/trips";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const { data: callRequests, isLoading: loadingCalls } = useQuery<CallRequest[]>({
    queryKey: ["/api/call-requests"],
  });
  const { data: proposals, isLoading: loadingProposals } = useQuery<ItineraryProposal[]>({
    queryKey: ["/api/proposals"],
  });
  const { data: calendarEntries } = useQuery<CalendarEntry[]>({
    queryKey: ["/api/calendar-entries"],
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const getTripsForDay = (day: number) => {
    if (!callRequests) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return callRequests.filter((c) => {
      if (!c.dateFrom || !c.dateTo) return false;
      return dateStr >= c.dateFrom && dateStr <= c.dateTo;
    });
  };

  const getEntriesForDay = (day: number) => {
    if (!calendarEntries) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarEntries.filter((e) => e.date === dateStr);
  };

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const upcomingTrips = callRequests?.filter(
    (c) => c.status === "scheduled" || c.status === "requested"
  ) || [];
  const approvedProposals = proposals?.filter((p) => p.status === "approved") || [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="font-serif text-2xl font-bold" data-testid="text-calendar-title">Travel Calendar</h1>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={prev} data-testid="button-prev-month" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
          <h2 className="font-semibold" data-testid="text-calendar-month" aria-live="polite" aria-atomic="true">{monthName}</h2>
          <Button variant="ghost" size="icon" onClick={next} data-testid="button-next-month" aria-label="Next month">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {loadingCalls ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-7 gap-px">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[52px] sm:min-h-[60px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const trips = getTripsForDay(day);
              return (
                <div
                  key={day}
                  className={`min-h-[52px] sm:min-h-[60px] p-0.5 sm:p-1 rounded-md border ${
                    isToday(day) ? "ring-2 ring-primary bg-primary/5" : "border-transparent"
                  }`}
                >
                  <span className={`text-[11px] sm:text-xs ${isToday(day) ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {getEntriesForDay(day).slice(0, 2).map((entry) => (
                      <Link key={entry.id} href={entryHref(entry)}>
                        <div
                          className="text-[9px] sm:text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded px-1 py-0.5 truncate flex items-center gap-0.5 cursor-pointer hover-elevate"
                          data-testid={`calendar-entry-${entry.id}`}
                        >
                          <Plane className="w-2 h-2 shrink-0 hidden sm:block" />
                          <span className="truncate">{entry.label}</span>
                        </div>
                      </Link>
                    ))}
                    {trips.slice(0, 2).map((trip) => (
                      <div key={trip.id} className="text-[9px] sm:text-[10px] bg-primary/10 text-primary rounded px-1 py-0.5 truncate">
                        {trip.destination}
                      </div>
                    ))}
                    {trips.length > 2 && (
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground">+{trips.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {calendarEntries && calendarEntries.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Booked Flights</h2>
          <div className="space-y-3">
            {calendarEntries
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((entry) => {
                const details = (entry.details as CalendarEntryDetails | null) || {};
                return (
                  <Card key={entry.id} className="p-4" data-testid={`card-booked-flight-${entry.id}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Plane className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium">{entry.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.entryType === "return" ? "Return" : "Departure"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.date}
                      {details.carrier ? ` · ${details.carrier}` : ""}
                      {details.bookingRef ? ` · Ref ${details.bookingRef}` : ""}
                    </p>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {upcomingTrips.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Upcoming Trips</h2>
          <div className="space-y-3">
            {upcomingTrips.map((trip) => (
              <Card key={trip.id} className="p-4" data-testid={`card-upcoming-trip-${trip.id}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium">{trip.destination}</span>
                  <StatusBadge status={trip.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {trip.dateFrom} — {trip.dateTo}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {approvedProposals.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Approved Itineraries</h2>
          <div className="space-y-3">
            {approvedProposals.map((p) => (
              <Link key={p.id} href={`/proposals/${p.id}`}>
                <Card className="p-4 hover-elevate cursor-pointer" data-testid={`card-approved-proposal-${p.id}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium">{p.title}</span>
                    <span className="font-semibold text-sm">${Number(p.totalEstimate).toLocaleString()}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
