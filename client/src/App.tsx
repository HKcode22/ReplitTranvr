import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Shield, User as UserIcon } from "lucide-react";

import { useEffect } from "react";
import { trackPageView, identifyUser } from "@/lib/analytics";
import { setSentryUser, setSentryRoute } from "@/lib/sentry";
import LandingPage from "@/pages/landing";
import TravelersPage from "@/pages/travelers";
import AgenciesPage from "@/pages/agencies";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import RequestCallPage from "@/pages/request-call";
import CallHistoryPage from "@/pages/call-history";
import ProposalsPage from "@/pages/proposals";
import ProposalDetailPage from "@/pages/proposal-detail";
import NotificationsPage from "@/pages/notifications-page";
import ManageTripPage from "@/pages/manage-trip";
import ContactPage from "@/pages/contact";
import BillingPage from "@/pages/billing";
import SecurityPage from "@/pages/security";
import TripsPage from "@/pages/trips";
import FlightSearchPage from "@/pages/flight-search";
import ResetPasswordPage from "@/pages/reset-password";
import AdminDashboardPage from "@/pages/admin-dashboard";
import GuestProposalPage from "@/pages/guest-proposal";
import GuestBookingPage from "@/pages/guest-booking";
import PrivacyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import NotFound from "@/pages/not-found";
import AgencyAuthPage from "@/pages/agency/auth";
import AgencyDashboardPage from "@/pages/agency/dashboard";
import AgencyFlightDetailPage from "@/pages/agency/flight-detail";
import DisruptionSelectionPage from "@/pages/disruption/selection";
import DisruptionConfirmedPage from "@/pages/disruption/confirmed";
import { ErrorBoundary } from "@/components/error-boundary";

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { isAdmin, viewMode, setViewMode } = useAuth();
  const [routeLocation] = useLocation();

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-50 flex items-center justify-between gap-2 p-2 border-b backdrop-blur-md bg-background/80">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant={viewMode === "admin" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(viewMode === "admin" ? "customer" : "admin")}
                  data-testid="button-view-mode-toggle"
                  className="gap-1.5"
                >
                  {viewMode === "admin" ? (
                    <><Shield className="w-3.5 h-3.5" /> Admin View</>
                  ) : (
                    <><UserIcon className="w-3.5 h-3.5" /> Customer View</>
                  )}
                </Button>
              )}
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <ErrorBoundary key={routeLocation} boundary="authenticated-routes">
            <Switch>
              <Route path="/dashboard">
                {isAdmin && viewMode === "admin" ? (
                  <ErrorBoundary boundary="admin-dashboard"><AdminDashboardPage /></ErrorBoundary>
                ) : (
                  <DashboardPage />
                )}
              </Route>
              <Route path="/profile" component={ProfilePage} />
              <Route path="/request-call" component={RequestCallPage} />
              <Route path="/call-history" component={CallHistoryPage} />
              <Route path="/proposals">
                <ErrorBoundary boundary="proposals-list"><ProposalsPage /></ErrorBoundary>
              </Route>
              <Route path="/proposals/:id">
                <ErrorBoundary boundary="proposal-detail"><ProposalDetailPage /></ErrorBoundary>
              </Route>
              <Route path="/trips" component={TripsPage} />
              <Route path="/flights" component={FlightSearchPage} />
              <Route path="/manage-trip" component={ManageTripPage} />
              <Route path="/contact" component={ContactPage} />
              <Route path="/notifications" component={NotificationsPage} />
              <Route path="/billing" component={BillingPage} />
              <Route path="/security" component={SecurityPage} />
              <Route>
                <Redirect to="/dashboard" />
              </Route>
            </Switch>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Identify the (or anonymous) user in PostHog/Sentry whenever auth state
  // changes. We pass only the opaque user id — never email/name/phone.
  useEffect(() => {
    const id = user?.id ?? null;
    identifyUser(id);
    setSentryUser(id);
  }, [user?.id]);

  // Capture a sanitized pageview on every route change. Token-bearing
  // segments (guest booking option tokens, password reset tokens, ids)
  // are replaced inside trackPageView before being sent.
  useEffect(() => {
    trackPageView(location);
    setSentryRoute(location);
    // Reset scroll on route change unless the URL points at an in-page
    // anchor — wouter preserves scroll position by default, which makes
    // long pages (privacy/terms) open mid-document.
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/proposal/:token">
          <ErrorBoundary boundary="guest-proposal"><GuestProposalPage /></ErrorBoundary>
        </Route>
        <Route path="/book/:optionToken">
          <ErrorBoundary boundary="guest-booking"><GuestBookingPage /></ErrorBoundary>
        </Route>
        <Route path="/agency/auth">
          <ErrorBoundary boundary="agency-auth"><AgencyAuthPage /></ErrorBoundary>
        </Route>
        <Route path="/agency/dashboard">
          <ErrorBoundary boundary="agency-dashboard"><AgencyDashboardPage /></ErrorBoundary>
        </Route>
        <Route path="/agency/flights/:id">
          <ErrorBoundary boundary="agency-flight-detail"><AgencyFlightDetailPage /></ErrorBoundary>
        </Route>
        <Route path="/disruption/confirmed">
          <ErrorBoundary boundary="disruption-confirmed"><DisruptionConfirmedPage /></ErrorBoundary>
        </Route>
        <Route path="/disruption/:token">
          <ErrorBoundary boundary="disruption-selection"><DisruptionSelectionPage /></ErrorBoundary>
        </Route>
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/manage-trip" component={ManageTripPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/" component={LandingPage} />
        <Route path="/travelers" component={TravelersPage} />
        <Route path="/agencies" component={AgenciesPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route>
          <Redirect to="/auth" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/proposal/:token">
        <ErrorBoundary boundary="guest-proposal"><GuestProposalPage /></ErrorBoundary>
      </Route>
      <Route path="/book/:optionToken">
        <ErrorBoundary boundary="guest-booking"><GuestBookingPage /></ErrorBoundary>
      </Route>
      <Route path="/agency/auth">
        <ErrorBoundary boundary="agency-auth"><AgencyAuthPage /></ErrorBoundary>
      </Route>
      <Route path="/agency/dashboard">
        <ErrorBoundary boundary="agency-dashboard"><AgencyDashboardPage /></ErrorBoundary>
      </Route>
      <Route path="/disruption/confirmed">
        <ErrorBoundary boundary="disruption-confirmed"><DisruptionConfirmedPage /></ErrorBoundary>
      </Route>
      <Route path="/disruption/:token">
        <ErrorBoundary boundary="disruption-selection"><DisruptionSelectionPage /></ErrorBoundary>
      </Route>
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route>
        <AuthenticatedLayout />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary boundary="app-root">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <ErrorBoundary boundary="app-router">
                <AppRouter />
              </ErrorBoundary>
            </AuthProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
