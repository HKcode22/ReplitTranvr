import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, User, Phone, PhoneCall, FileText, Bell, CreditCard, LogOut, Plane, Shield, Luggage, Radar,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Notification } from "@shared/schema";


// Top group is intentionally label-less per task #152 — those items are
// the traveler's day-to-day "do something" surfaces, and a "Planning"
// header above them implied a category that didn't exist in practice.
const primaryItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Request a Call", url: "/request-call", icon: Phone },
  { title: "Proposals", url: "/proposals", icon: FileText },
  { title: "My Trips", url: "/trips", icon: Luggage },
  { title: "Search Flights", url: "/flights", icon: Plane },
  { title: "Monitor Flight", url: "/monitor-flight", icon: Radar },
  { title: "Billing", url: "/billing", icon: CreditCard },
];

// Settings group consolidates account/admin surfaces, including
// Call History which lives here so power users can review past concierge
// calls without crowding the primary nav.
const settingsItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Security", url: "/security", icon: Shield },
  { title: "Call History", url: "/call-history", icon: PhoneCall },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n) => !n.readAt).length || 0;
  const initials = user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() : "?";

  const renderNavItem = (item: typeof primaryItems[number]) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={location === item.url || (item.url === "/call-history" && location.startsWith("/call-request"))}>
        <Link
          href={item.url}
          data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => { if (isMobile) setOpenMobile(false); }}
        >
          <item.icon className="w-4 h-4" />
          <span className="flex-1">{item.title}</span>
          {item.title === "Notifications" && unreadCount > 0 && (
            <Badge variant="default" className="ml-auto text-[10px] px-1.5 min-w-[20px] justify-center">
              {unreadCount}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center" data-testid="link-sidebar-logo">
          <span className="font-serif font-semibold text-lg">Travnr</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-sidebar-name">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout" aria-label="Log out" title="Log out">
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
