import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Phone, FileText, CalendarDays, ArrowRight, MapPin, Sparkles, Bell, Plane } from "lucide-react";
import type { CallRequest, ItineraryProposal, CalendarEntry, CalendarEntryDetails } from "@shared/schema";

function entryHref(entry: CalendarEntry): string {
  if (entry.proposalId) return `/proposals/${entry.proposalId}`;
  if (entry.paymentId) return `/trips#trip-${entry.paymentId}`;
  return "/trips";
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: callRequests, isLoading: loadingCalls } = useQuery<CallRequest[]>({
    queryKey: ["/api/call-requests"],
  });
  const { data: calendarEntries } = useQuery<CalendarEntry[]>({
    queryKey: ["/api/calendar-entries"],
  });
  const { data: proposals, isLoading: loadingProposals } = useQuery<ItineraryProposal[]>({
    queryKey: ["/api/proposals"],
  });

  const isLoading = loadingCalls || loadingProposals;

  const upcomingTrips = callRequests?.filter(
    (c) => c.dateFrom && new Date(c.dateFrom) >= new Date(new Date().toDateString())
  ) || [];

  const totalProposals = proposals?.length || 0;
  const activeTrips = upcomingTrips.length;
  const pendingProposals = proposals?.filter((p) => p.status === "sent").length || 0;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="rounded-xl bg-gradient-to-r from-[hsl(207,55%,94%)] to-[hsl(207,45%,97%)] dark:from-[hsl(210,30%,14%)] dark:to-[hsl(210,25%,10%)] border border-[hsl(207,45%,88%)] dark:border-[hsl(210,20%,20%)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-dashboard-greeting">
              Welcome back, {user?.firstName}
            </h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your travel plans.</p>
          </div>
          <Link href="/request-call">
            <Button data-testid="button-plan-trip">
              <Sparkles className="w-4 h-4 mr-2" />
              Plan a Trip
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3" data-testid="stat-proposals">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[hsl(207,55%,92%)] dark:bg-[hsl(210,30%,18%)] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(207,65%,45%)] dark:text-[hsl(210,60%,60%)]" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold">{totalProposals}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Proposals</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3" data-testid="stat-trips">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[hsl(150,45%,92%)] dark:bg-[hsl(150,30%,16%)] flex items-center justify-center shrink-0">
            <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(150,55%,35%)] dark:text-[hsl(150,50%,55%)]" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold">{activeTrips}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Upcoming</p>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3" data-testid="stat-pending">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[hsl(35,60%,92%)] dark:bg-[hsl(35,35%,16%)] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(35,65%,42%)] dark:text-[hsl(35,55%,55%)]" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold">{pendingProposals}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pending</p>
          </div>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-semibold text-lg">Proposals</h2>
          <Link href="/proposals">
            <Button variant="ghost" size="sm" data-testid="link-view-all-proposals">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></Card>
            ))}
          </div>
        ) : proposals && proposals.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposals.map((p) => (
              <Link key={p.id} href={`/proposals/${p.id}`}>
                <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid={`card-proposal-${p.id}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-medium truncate flex-1 min-w-0" data-testid={`text-proposal-title-${p.id}`}>{p.title}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.summary}</p>
                  )}
                  <p className="text-sm font-medium" data-testid={`text-proposal-estimate-${p.id}`}>
                    ${Number(p.totalEstimate).toLocaleString()}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <div className="w-14 h-14 rounded-xl bg-[hsl(207,55%,93%)] dark:bg-[hsl(210,30%,16%)] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7 text-[hsl(207,55%,50%)] dark:text-[hsl(210,50%,60%)]" />
            </div>
            <p className="font-medium mb-1">No proposals yet</p>
            <p className="text-sm text-muted-foreground mb-4">Request a concierge call and we'll put together a custom travel plan for you.</p>
            <Link href="/request-call">
              <Button variant="outline" size="sm" data-testid="button-first-proposal">
                Request a Call to Get Started
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </Card>
        )}
      </div>

      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const upcomingFlights = (calendarEntries || [])
          .filter((e) => e.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 3);
        if (upcomingFlights.length === 0) return null;
        return (
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="font-semibold text-lg">Upcoming Booked Flights</h2>
              <Link href="/trips">
                <Button variant="ghost" size="sm" data-testid="link-view-trips">
                  My Trips <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingFlights.map((entry) => {
                const details = (entry.details as CalendarEntryDetails | null) || {};
                return (
                  <Link key={entry.id} href={entryHref(entry)}>
                    <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid={`card-booked-flight-${entry.id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                          <Plane className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                        </div>
                        <span className="font-medium truncate">{entry.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.date}</p>
                      {details.bookingRef && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">Ref {details.bookingRef}</p>
                      )}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-semibold text-lg">Upcoming Trips</h2>
          <Link href="/calendar">
            <Button variant="ghost" size="sm" data-testid="link-view-calendar">
              Calendar <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></Card>
            ))}
          </div>
        ) : upcomingTrips.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTrips.map((trip) => {
              const matchingProposal = proposals?.find((p) => p.callRequestId === trip.id);
              const href = matchingProposal ? `/proposals/${matchingProposal.id}` : "/call-history";
              return (
                <Link key={trip.id} href={href}>
                  <Card className="p-4 hover-elevate cursor-pointer h-full" data-testid={`card-trip-${trip.id}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-[hsl(150,45%,92%)] dark:bg-[hsl(150,30%,16%)] flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-[hsl(150,55%,35%)] dark:text-[hsl(150,50%,55%)]" />
                        </div>
                        <span className="font-medium truncate" data-testid={`text-trip-destination-${trip.id}`}>{trip.destination || "No destination"}</span>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-trip-dates-${trip.id}`}>
                      {trip.dateFrom} — {trip.dateTo}
                    </p>
                    {matchingProposal && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Proposal: {matchingProposal.title}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <div className="w-14 h-14 rounded-xl bg-[hsl(150,45%,93%)] dark:bg-[hsl(150,30%,14%)] flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-7 h-7 text-[hsl(150,55%,38%)] dark:text-[hsl(150,50%,55%)]" />
            </div>
            <p className="font-medium mb-1">No upcoming trips</p>
            <p className="text-sm text-muted-foreground mb-4">Plan your next adventure and it will appear here.</p>
            <Link href="/request-call">
              <Button variant="outline" size="sm" data-testid="button-first-trip">
                Plan a Trip
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </Card>
        )}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/request-call">
            <Button variant="outline" className="w-full justify-start" data-testid="button-quick-request-call">
              <Phone className="w-4 h-4 mr-2" /> Request a Call
            </Button>
          </Link>
          <Link href="/proposals">
            <Button variant="outline" className="w-full justify-start" data-testid="button-quick-view-proposals">
              <FileText className="w-4 h-4 mr-2" /> View Proposals
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline" className="w-full justify-start" data-testid="button-quick-edit-profile">
              <FileText className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="w-full justify-start" data-testid="button-quick-view-calendar">
              <CalendarDays className="w-4 h-4 mr-2" /> View Calendar
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
