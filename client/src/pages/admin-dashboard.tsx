import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Wallet, Users, CreditCard, Phone, Shield, CheckCircle2, DollarSign, type LucideIcon } from "lucide-react";

type AdminStats = {
  users: number;
  payments: number;
  pendingManual: number;
  bookings: number;
  calls: number;
  callsSource?: "bland" | "db";
  revenue: number;
  revenueByCurrency: { currency: string; amount: number }[];
  duffelBalance: { available: number; currency: string } | null;
};

type BlandLiveCall = {
  call_id?: string;
  to?: string;
  from?: string;
  status?: string;
  call_length?: number;
  created_at?: string;
  ended_at?: string;
  completed?: boolean;
  metadata?: Record<string, unknown> | null;
};

type LiveCallsResponse = {
  source: "bland" | "db";
  calls: BlandLiveCall[] | DbCallRow[];
  total_count?: number;
  error?: string;
};

type DbCallRow = {
  id: number;
  userId: number;
  status: string;
  destination?: string | null;
  dateFrom?: string | null;
  createdAt: string;
  user?: { email: string; firstName?: string | null; lastName?: string | null } | null;
};

const LOW_BALANCE_THRESHOLD = 200;

function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function StatCard({ icon: Icon, label, value, sub, tone = "default" }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: "default" | "warn" | "danger" }) {
  const toneCls =
    tone === "danger" ? "border-red-500/30 bg-red-500/5" :
    tone === "warn" ? "border-amber-500/30 bg-amber-500/5" :
    "";
  const valueCls =
    tone === "danger" ? "text-red-600 dark:text-red-400" :
    tone === "warn" ? "text-amber-700 dark:text-amber-400" :
    "";
  return (
    <Card className={`p-4 ${toneCls}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold truncate ${valueCls}`}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

function CompleteDialog({ payment, onClose }: { payment: any; onClose: () => void }) {
  const { toast } = useToast();
  const [bookingRef, setBookingRef] = useState("");
  const [orderId, setOrderId] = useState("");
  const [notes, setNotes] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/pending-manual/${payment.id}/complete`, {
        duffelBookingRef: bookingRef.trim(),
        duffelOrderId: orderId.trim() || null,
        notes: notes.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked as complete", description: "Customer notified." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-manual"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message || "Could not complete", variant: "destructive" });
    },
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark booking complete</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Booking Reference</Label>
            <Input value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} placeholder="e.g. ABC123" data-testid="input-booking-ref" />
          </div>
          <div>
            <Label>Order ID (optional)</Label>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ord_..." data-testid="input-order-id" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about how this was resolved" data-testid="input-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !bookingRef.trim()} data-testid="button-confirm-complete">
            {mut.isPending ? "Saving..." : "Confirm Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingManualTable() {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/pending-manual"] });
  const [selected, setSelected] = useState<any>(null);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground" data-testid="empty-pending-manual">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-600" />
        No pending manual bookings.
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {data.map((p) => {
          const details = p.manualBookingDetails || {};
          const slices = details.slices || [];
          return (
            <Card key={p.id} className="p-4" data-testid={`pending-manual-${p.id}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">Pending Manual</Badge>
                    <span className="font-semibold">{p.user?.firstName} {p.user?.lastName}</span>
                    <span className="text-xs text-muted-foreground">{p.user?.email}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-mono font-semibold">{p.currency?.toUpperCase()} {p.amount}</span>
                    {p.stripePaymentIntentId && <span className="text-xs text-muted-foreground ml-2">PI: {p.stripePaymentIntentId}</span>}
                  </div>
                  {slices.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
                      {slices.map((s: any, i: number) => (
                        <div key={i}>
                          <span className="font-mono">{s.origin} → {s.destination}</span>
                          {s.departingAt && <span className="ml-2">{new Date(s.departingAt).toLocaleString()}</span>}
                          {s.carrier && <span className="ml-2">· {s.carrier} {s.flightNumber || ""}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {details.offerId && <div className="mt-1 text-xs text-muted-foreground">Offer: <span className="font-mono">{details.offerId}</span></div>}
                  <div className="mt-1 text-xs text-muted-foreground">Captured: {new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <Button onClick={() => setSelected(p)} data-testid={`button-resolve-${p.id}`}>
                  Mark Complete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {selected && <CompleteDialog payment={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function PaymentsTable() {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payments"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) return <Card className="p-6 text-center text-muted-foreground">No payments yet.</Card>;
  return (
    <Card className="divide-y">
      {data.slice(0, 50).map((p) => (
        <div key={p.id} className="p-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`payment-row-${p.id}`}>
          <div className="min-w-0">
            <div className="text-sm font-medium">{p.user?.email || p.userId}</div>
            <div className="text-xs text-muted-foreground">
              {p.currency?.toUpperCase()} {p.amount} · {new Date(p.createdAt).toLocaleString()}
              {p.duffelBookingRef && <> · Ref <span className="font-mono">{p.duffelBookingRef}</span></>}
            </div>
          </div>
          <Badge variant={p.status === "paid" ? "default" : p.status === "pending_manual" ? "outline" : "secondary"}>
            {p.status}
          </Badge>
        </div>
      ))}
    </Card>
  );
}

function UsersTable({ limit }: { limit?: number }) {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) return <Card className="p-6 text-center text-muted-foreground">No users.</Card>;
  const rows = data.slice(0, limit ?? 50);
  return (
    <Card className="divide-y">
      {rows.map((u) => (
        <div key={u.id} className="p-3 flex items-center justify-between gap-3" data-testid={`user-row-${u.id}`}>
          <div className="min-w-0">
            <div className="text-sm font-medium">{u.firstName} {u.lastName}</div>
            <div className="text-xs text-muted-foreground">{u.email}</div>
          </div>
          <div className="flex items-center gap-2">
            {u.isAdmin && <Badge variant="outline" className="border-violet-500 text-violet-700 dark:text-violet-400"><Shield className="w-3 h-3 mr-1" />Admin</Badge>}
            {u.emailVerified ? <Badge variant="secondary">Verified</Badge> : <Badge variant="outline">Unverified</Badge>}
          </div>
        </div>
      ))}
    </Card>
  );
}

function BookingsTable({ limit }: { limit?: number }) {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/bookings"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) return <Card className="p-6 text-center text-muted-foreground">No bookings yet.</Card>;
  const rows = limit ? data.slice(0, limit) : data.slice(0, 50);
  return (
    <Card className="divide-y">
      {rows.map((p) => (
        <div key={p.id} className="p-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`booking-row-${p.id}`}>
          <div className="min-w-0">
            <div className="text-sm font-medium">{p.user?.email || p.userId}</div>
            <div className="text-xs text-muted-foreground">
              {p.currency?.toUpperCase()} {p.amount} · {new Date(p.createdAt).toLocaleString()}
              {p.duffelBookingRef && <> · Ref <span className="font-mono">{p.duffelBookingRef}</span></>}
            </div>
          </div>
          <Badge variant="default">Booked</Badge>
        </div>
      ))}
    </Card>
  );
}

function CallsTable({ limit }: { limit?: number }) {
  const { data, isLoading } = useQuery<LiveCallsResponse>({ queryKey: ["/api/admin/calls-live"] });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const calls = data?.calls ?? [];
  if (calls.length === 0) return <Card className="p-6 text-center text-muted-foreground">No call requests.</Card>;
  const rows = limit ? calls.slice(0, limit) : calls.slice(0, 50);
  const isLive = data?.source === "bland";
  return (
    <Card className="divide-y">
      {rows.map((row, idx) => {
        if (isLive) {
          const c = row as BlandLiveCall;
          const meta = (c.metadata ?? {}) as Record<string, unknown>;
          const email = typeof meta.userEmail === "string" ? meta.userEmail
            : typeof meta.email === "string" ? meta.email
            : typeof meta.userId === "string" || typeof meta.userId === "number" ? `user #${meta.userId}` : null;
          const phone = c.to || "—";
          const minutes = typeof c.call_length === "number" ? `${Math.max(1, Math.ceil(c.call_length / 60))} min` : "—";
          const date = c.created_at ? new Date(c.created_at).toLocaleString() : "—";
          const status = c.status || (c.completed ? "completed" : "—");
          const key = c.call_id || `bland-${idx}`;
          return (
            <div key={key} className="p-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`call-row-${key}`}>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{email || phone}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {phone} · {minutes} · {date}
                </div>
              </div>
              <Badge variant="secondary">{status}</Badge>
            </div>
          );
        }
        const dbRow = row as DbCallRow;
        return (
          <div key={`db-${dbRow.id}`} className="p-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`call-row-${dbRow.id}`}>
            <div className="min-w-0">
              <div className="text-sm font-medium">{dbRow.user?.email || dbRow.userId}</div>
              <div className="text-xs text-muted-foreground">
                {dbRow.destination || "—"} · {dbRow.dateFrom ? new Date(dbRow.dateFrom).toLocaleDateString() : "—"} · {new Date(dbRow.createdAt).toLocaleString()}
              </div>
            </div>
            <Badge variant="secondary">{dbRow.status}</Badge>
          </div>
        );
      })}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });

  const balance = stats?.duffelBalance ?? null;
  const balanceUnavailable = balance == null;
  const balanceLow = balance != null && balance.available < LOW_BALANCE_THRESHOLD;
  const balanceTone: "default" | "warn" | "danger" =
    balanceUnavailable ? "danger" : balanceLow ? "warn" : "default";
  const balanceText = balance ? formatCurrency(balance.available, balance.currency) : "Unavailable";
  const balanceSub = balanceUnavailable
    ? "Could not reach Duffel"
    : balanceLow
      ? `Low — below ${formatUSD(LOW_BALANCE_THRESHOLD)}`
      : undefined;

  const revenueAmount = typeof stats?.revenue === "number" ? stats.revenue : 0;
  const revenueText = formatUSD(revenueAmount);
  const otherCurrencies = (stats?.revenueByCurrency || []).filter((r) => r.currency.toUpperCase() !== "USD");
  const revenueSub = otherCurrencies.length > 0
    ? otherCurrencies.map((r) => formatCurrency(r.amount, r.currency)).join(" · ")
    : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-violet-500/5 border border-violet-500/20 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-violet-600" />
          <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1">Operational overview for Travnr concierge.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={DollarSign} label="Revenue" value={revenueText} sub={revenueSub} />
          <StatCard icon={Wallet} label="Duffel Balance" value={balanceText} sub={balanceSub} tone={balanceTone} />
          <StatCard icon={AlertTriangle} label="Pending Manual" value={String(stats?.pendingManual ?? 0)} tone={(stats?.pendingManual ?? 0) > 0 ? "warn" : "default"} />
          <StatCard icon={CreditCard} label="Bookings" value={String(stats?.bookings ?? 0)} />
          <StatCard icon={Users} label="Users" value={String(stats?.users ?? 0)} />
          <StatCard icon={Phone} label="Call Requests" value={String(stats?.calls ?? 0)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <h2 className="font-serif text-lg font-semibold mb-2">Recent Users</h2>
          <UsersTable limit={5} />
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold mb-2">Recent Bookings</h2>
          <BookingsTable limit={5} />
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold mb-2">Recent Calls</h2>
          <CallsTable limit={5} />
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Manual {stats?.pendingManual ? <Badge variant="outline" className="ml-2 border-amber-500">{stats.pendingManual}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">Calls</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4"><PendingManualTable /></TabsContent>
        <TabsContent value="bookings" className="mt-4"><BookingsTable /></TabsContent>
        <TabsContent value="payments" className="mt-4"><PaymentsTable /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTable /></TabsContent>
        <TabsContent value="calls" className="mt-4"><CallsTable /></TabsContent>
      </Tabs>
    </div>
  );
}
