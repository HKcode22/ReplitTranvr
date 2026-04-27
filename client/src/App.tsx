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

import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import RequestCallPage from "@/pages/request-call";
import CallHistoryPage from "@/pages/call-history";
import ProposalsPage from "@/pages/proposals";
import ProposalDetailPage from "@/pages/proposal-detail";
import CalendarPage from "@/pages/calendar-page";
import NotificationsPage from "@/pages/notifications-page";
import BillingPage from "@/pages/billing";
import SecurityPage from "@/pages/security";
import TripsPage from "@/pages/trips";
import FlightSearchPage from "@/pages/flight-search";
import ResetPasswordPage from "@/pages/reset-password";
import AdminDashboardPage from "@/pages/admin-dashboard";
import GuestProposalPage from "@/pages/guest-proposal";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { isAdmin, viewMode, setViewMode } = useAuth();

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
            <Switch>
              <Route path="/dashboard">
                {isAdmin && viewMode === "admin" ? <AdminDashboardPage /> : <DashboardPage />}
              </Route>
              <Route path="/profile" component={ProfilePage} />
              <Route path="/request-call" component={RequestCallPage} />
              <Route path="/call-history" component={CallHistoryPage} />
              <Route path="/proposals" component={ProposalsPage} />
              <Route path="/proposals/:id" component={ProposalDetailPage} />
              <Route path="/trips" component={TripsPage} />
              <Route path="/flights" component={FlightSearchPage} />
              <Route path="/calendar" component={CalendarPage} />
              <Route path="/notifications" component={NotificationsPage} />
              <Route path="/billing" component={BillingPage} />
              <Route path="/security" component={SecurityPage} />
              <Route>
                <Redirect to="/dashboard" />
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

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
        <Route path="/proposal/:token" component={GuestProposalPage} />
        <Route path="/" component={LandingPage} />
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
      <Route path="/proposal/:token" component={GuestProposalPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route>
        <AuthenticatedLayout />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
