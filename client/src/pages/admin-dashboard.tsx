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
import { AlertTriangle, Wallet, Users, CreditCard, Phone, Shield, CheckCircle2, DollarSign, Pencil, X, Check, Tag, Trash2, Mail, Eye, Send, RefreshCw, Sparkles, PhoneIncoming, PhoneOutgoing, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { PromoCode } from "@shared/schema";
import { ErrorBoundary } from "@/components/error-boundary";

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

type AiCallSummary = {
  oneLiner: string;
  structured: {
    route: string | null;
    dates: string | null;
    pax: number | null;
    cabin: string | null;
    budget: string | null;
    preferences: string | null;
  };
  confidence: number;
  generatedAt: string;
  model: string;
};

type CallDirection = "inbound" | "outbound";

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
  aiSummary?: AiCallSummary | null;
  dbCallId?: number | null;
  // Server-enriched fields (Task #137):
  direction?: CallDirection;
  customerPhone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
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
  aiSummary?: AiCallSummary | null;
  dbCallId?: number | null;
  // Server-enriched fields (Task #137):
  direction?: CallDirection;
  customerPhone?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
};

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

type StatTone = "default" | "warn" | "danger" | "good";

function toneClasses(tone: StatTone) {
  const card =
    tone === "danger" ? "border-red-500/30 bg-red-500/5" :
    tone === "warn" ? "border-amber-500/30 bg-amber-500/5" :
    tone === "good" ? "border-emerald-500/30 bg-emerald-500/5" :
    "";
  const value =
    tone === "danger" ? "text-red-600 dark:text-red-400" :
    tone === "warn" ? "text-amber-700 dark:text-amber-400" :
    tone === "good" ? "text-emerald-700 dark:text-emerald-400" :
    "";
  return { card, value };
}

function valueSizeClass(value: string): string {
  const len = value.length;
  if (len >= 13) return "text-lg";
  if (len >= 10) return "text-xl";
  return "text-2xl";
}

function StatCard({ icon: Icon, label, value, sub, tone = "default" }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: StatTone }) {
  const t = toneClasses(tone);
  return (
    <Card className={`p-4 ${t.card}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`${valueSizeClass(value)} font-bold whitespace-nowrap tabular-nums ${t.value}`}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

type DuffelBalance = {
  estimated: number;
  seed: number;
  totalSpent: number;
  lastUpdated: string | null;
};

function DuffelBalanceCard() {
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery<DuffelBalance>({ queryKey: ["/api/admin/duffel-balance"] });
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const mut = useMutation({
    mutationFn: async (balance: number) => {
      const res = await apiRequest("POST", "/api/admin/duffel-balance/update", { balance });
      return (await res.json()) as DuffelBalance;
    },
    onSuccess: () => {
      toast({ title: "Balance updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/duffel-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEditing(false);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const startEdit = () => {
    setValue(data ? String(data.estimated) : "");
    setEditing(true);
  };

  const submit = () => {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) {
      toast({ title: "Enter a number", variant: "destructive" });
      return;
    }
    // The backend stores the seed and re-derives `estimated = seed - totalSpent`.
    // Admins type the displayed estimate, so add totalSpent back to convert it
    // into the seed the endpoint expects.
    const seedToPersist = n + (data?.totalSpent ?? 0);
    mut.mutate(seedToPersist);
  };

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (isError || !data) {
    return (
      <Card className="p-4 border-red-500/30 bg-red-500/5" data-testid="card-duffel-balance-error">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Duffel Balance</div>
            <div className="text-sm text-red-600 dark:text-red-400 font-semibold">Unavailable</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs mt-0.5"
              onClick={() => refetch()}
              data-testid="button-retry-balance"
            >
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const tone: StatTone = data.estimated < 100 ? "danger" : data.estimated < 300 ? "warn" : "good";
  const t = toneClasses(tone);
  const lastSetDate = data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString() : null;

  return (
    <Card className={`p-4 ${t.card}`} data-testid="card-duffel-balance">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">Duffel Balance</div>
          {editing ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") setEditing(false);
                }}
                autoFocus
                className="h-9 text-lg font-bold flex-1 min-w-0"
                placeholder="Current balance from Duffel"
                data-testid="input-balance"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10 shrink-0"
                onClick={submit}
                disabled={mut.isPending}
                data-testid="button-save-balance"
                aria-label="Save balance"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setEditing(false)}
                disabled={mut.isPending}
                data-testid="button-cancel-balance"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`${valueSizeClass(formatUSD(data.estimated))} font-bold whitespace-nowrap tabular-nums ${t.value}`}
                data-testid="text-balance-estimated"
              >
                {formatUSD(data.estimated)}
              </div>
              <button
                type="button"
                onClick={startEdit}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5 rounded-sm hover:bg-muted"
                data-testid="button-edit-balance"
                aria-label="Edit balance"
                title="Edit balance"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {!editing && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Est. · Last set{lastSetDate ? ` ${lastSetDate}` : ""}
            </div>
          )}
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
                    {p.stripePaymentIntentId && <span className="text-xs text-muted-foreground ml-2 break-all">PI: {p.stripePaymentIntentId}</span>}
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
                  {details.offerId && <div className="mt-1 text-xs text-muted-foreground">Offer: <span className="font-mono break-all">{details.offerId}</span></div>}
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
      {rows.map((p) => {
        const isManual = !p.duffelOrderId;
        return (
          <div key={p.id} className="p-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`booking-row-${p.id}`}>
            <div className="min-w-0">
              <div className="text-sm font-medium">{p.user?.email || p.userId}</div>
              <div className="text-xs text-muted-foreground">
                {p.currency?.toUpperCase()} {p.amount} · {new Date(p.createdAt).toLocaleString()}
                {p.duffelBookingRef && <> · Ref <span className="font-mono">{p.duffelBookingRef}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isManual && (
                <Badge variant="outline" className="text-[10px]" data-testid={`badge-manual-${p.id}`}>
                  Manual
                </Badge>
              )}
              <Badge variant="default">Booked</Badge>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function confidenceTone(c: number): { label: string; cls: string } {
  if (c >= 0.75) return { label: "high", cls: "border-emerald-500 text-emerald-700 dark:text-emerald-400" };
  if (c >= 0.4) return { label: "med", cls: "border-amber-500 text-amber-700 dark:text-amber-400" };
  return { label: "low", cls: "border-muted-foreground text-muted-foreground" };
}

// Inline summary block: compact AI one-liner + confidence badge + a
// "regenerate" button visible only when we have a DB row to target. Used
// by both the live-calls and DB-fallback rows in the admin calls list.
// When the AI summary is missing, we still render a deterministic
// fallback line from whatever extracted fields the row provides so
// admins are never left staring at a blank summary slot.
function CallSummaryBlock({
  summary,
  dbCallId,
  fallbackLine,
}: {
  summary: AiCallSummary | null | undefined;
  dbCallId: number | null | undefined;
  fallbackLine: string | null;
}) {
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/calls/${id}/resummarize`);
      return res.json() as Promise<{ aiSummary: AiCallSummary }>;
    },
    onSuccess: () => {
      toast({ title: "Summary regenerated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calls-live"] });
    },
    onError: (err: Error) => {
      const raw = err.message?.replace(/^\d+:\s*/, "") || "Could not regenerate";
      let msg = raw;
      try { const parsed = JSON.parse(raw); msg = parsed.message || raw; } catch {}
      toast({ title: "Regenerate failed", description: msg, variant: "destructive" });
    },
  });

  if (!summary && !dbCallId && !fallbackLine) return null;
  const tone = summary ? confidenceTone(summary.confidence) : null;
  return (
    <div className="mt-1.5 flex items-start gap-2 flex-wrap" data-testid={`call-summary-${dbCallId ?? "none"}`}>
      {summary ? (
        <>
          <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" aria-hidden />
          <span className="text-xs text-foreground/90 break-words flex-1 min-w-0" data-testid="text-call-summary">
            {summary.oneLiner}
          </span>
          {tone && (
            <Badge variant="outline" className={`text-[10px] py-0 h-4 shrink-0 ${tone.cls}`}>
              {tone.label}
            </Badge>
          )}
        </>
      ) : fallbackLine ? (
        <span className="text-xs text-muted-foreground break-words flex-1 min-w-0" data-testid="text-call-summary-fallback">
          {fallbackLine}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground italic flex-1 min-w-0">No AI summary yet.</span>
      )}
      {dbCallId && (
        <button
          type="button"
          onClick={() => mut.mutate(dbCallId)}
          disabled={mut.isPending}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5 rounded-sm hover:bg-muted disabled:opacity-50"
          title="Regenerate summary"
          aria-label="Regenerate summary"
          data-testid={`button-resummarize-${dbCallId}`}
        >
          <RefreshCw className={`w-3 h-3 ${mut.isPending ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}

// Small "Inbound" / "Outbound" pill rendered next to the status badge so
// admins can tell who initiated the call at a glance.
function DirectionBadge({ direction, testId }: { direction: CallDirection; testId: string }) {
  const isInbound = direction === "inbound";
  const Icon = isInbound ? PhoneIncoming : PhoneOutgoing;
  const label = isInbound ? "Inbound" : "Outbound";
  return (
    <Badge
      variant="outline"
      className={`shrink-0 text-[10px] py-0 h-5 gap-1 ${isInbound ? "border-blue-400/60 text-blue-600 dark:text-blue-300" : "border-emerald-400/60 text-emerald-700 dark:text-emerald-300"}`}
      data-testid={testId}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {label}
    </Badge>
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
          // Server-side enrichment provides direction + the customer's
          // (non-Travnr) phone. Keep a defensive fallback for cached
          // responses that predate the enrichment.
          const direction: CallDirection = c.direction
            ?? (meta.source === "inbound_phone" ? "inbound" : "outbound");
          const customerPhone = c.customerPhone
            ?? (direction === "inbound" ? c.from : c.to)
            ?? null;
          const customerName = c.customerName ?? null;
          const customerEmail = c.customerEmail ?? null;
          // Primary label resolution: name → email → phone → "Unknown caller".
          // Never show "user #<id>" — the server no longer sends opaque ids.
          const primary = customerName || customerEmail || customerPhone || "Unknown caller";
          // Secondary line: email + phone, deduped, separated by middle dot.
          const secondaryParts: string[] = [];
          if (customerName && customerEmail) secondaryParts.push(customerEmail);
          else if (!customerName && customerEmail && primary !== customerEmail) secondaryParts.push(customerEmail);
          if (customerPhone && primary !== customerPhone) secondaryParts.push(customerPhone);
          const minutes = typeof c.call_length === "number" ? `${Math.max(1, Math.ceil(c.call_length / 60))} min` : "—";
          const date = c.created_at ? new Date(c.created_at).toLocaleString() : "—";
          const status = c.status || (c.completed ? "completed" : "—");
          const key = c.call_id || `bland-${idx}`;
          const isCompleted = status === "completed" || c.completed === true;
          return (
            <div key={key} className="p-3 flex items-start justify-between gap-3 flex-wrap" data-testid={`call-row-${key}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" data-testid={`call-name-${key}`}>{primary}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {secondaryParts.length > 0 ? secondaryParts.join(" · ") + " · " : ""}{minutes} · {date}
                </div>
                {isCompleted && (
                  <CallSummaryBlock
                    summary={c.aiSummary}
                    dbCallId={c.dbCallId ?? null}
                    fallbackLine={(() => {
                      // Best-effort deterministic fallback when Claude is
                      // unavailable: surface whatever metadata Bland gave us
                      // so the row is never blank.
                      const parts: string[] = [];
                      if (typeof meta.destination === "string") parts.push(String(meta.destination));
                      if (typeof meta.dateFrom === "string") parts.push(new Date(meta.dateFrom).toLocaleDateString());
                      if (typeof c.call_length === "number") parts.push(minutes);
                      return parts.length > 0 ? parts.join(" · ") : null;
                    })()}
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <DirectionBadge direction={direction} testId={`call-direction-${key}`} />
                <Badge variant="secondary">{status}</Badge>
              </div>
            </div>
          );
        }
        const dbRow = row as DbCallRow;
        const isCompleted = dbRow.status === "completed";
        const direction: CallDirection = dbRow.direction ?? "outbound";
        const customerPhone = dbRow.customerPhone ?? null;
        const customerEmail = dbRow.customerEmail ?? dbRow.user?.email ?? null;
        const customerName = dbRow.customerName
          ?? ([dbRow.user?.firstName, dbRow.user?.lastName].filter(Boolean).join(" ").trim() || null);
        const primary = customerName || customerEmail || customerPhone || "Unknown caller";
        const secondaryParts: string[] = [];
        if (customerName && customerEmail) secondaryParts.push(customerEmail);
        else if (!customerName && customerEmail && primary !== customerEmail) secondaryParts.push(customerEmail);
        if (customerPhone && primary !== customerPhone) secondaryParts.push(customerPhone);
        const key = `db-${dbRow.id}`;
        return (
          <div key={key} className="p-3 flex items-start justify-between gap-3 flex-wrap" data-testid={`call-row-${dbRow.id}`}>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate" data-testid={`call-name-${key}`}>{primary}</div>
              <div className="text-xs text-muted-foreground truncate">
                {secondaryParts.length > 0 ? secondaryParts.join(" · ") + " · " : ""}{dbRow.destination || "—"} · {dbRow.dateFrom ? new Date(dbRow.dateFrom).toLocaleDateString() : "—"} · {new Date(dbRow.createdAt).toLocaleString()}
              </div>
              {isCompleted && (
                <CallSummaryBlock
                  summary={dbRow.aiSummary}
                  dbCallId={dbRow.dbCallId ?? null}
                  fallbackLine={(() => {
                    const parts: string[] = [];
                    if (dbRow.destination) parts.push(dbRow.destination);
                    if (dbRow.dateFrom) parts.push(new Date(dbRow.dateFrom).toLocaleDateString());
                    return parts.length > 0 ? parts.join(" · ") : null;
                  })()}
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <DirectionBadge direction={direction} testId={`call-direction-${key}`} />
              <Badge variant="secondary">{dbRow.status}</Badge>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function PromoCodesPanel() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<PromoCode[]>({ queryKey: ["/api/admin/promo-codes"] });
  const [code, setCode] = useState("");
  const [overrideDollars, setOverrideDollars] = useState("1.00");
  const [forceManual, setForceManual] = useState(false);
  const [adminOnly, setAdminOnly] = useState(true);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [description, setDescription] = useState("");

  const createMut = useMutation({
    mutationFn: async () => {
      const overrideAmountCents = Math.round(parseFloat(overrideDollars) * 100);
      const body = {
        code: code.trim(),
        description: description.trim() || null,
        overrideAmountCents,
        forceManual,
        adminOnly,
        maxUses: maxUses.trim() ? parseInt(maxUses.trim(), 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const res = await apiRequest("POST", "/api/admin/promo-codes", body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Promo code created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setCode("");
      setDescription("");
      setMaxUses("");
      setExpiresAt("");
      setOverrideDollars("1.00");
      setForceManual(false);
      setAdminOnly(true);
    },
    onError: (err: Error) => {
      const raw = err.message?.replace(/^\d+:\s*/, "") || "Could not create";
      let msg = raw;
      try { const parsed = JSON.parse(raw); msg = parsed.message || raw; } catch {}
      toast({ title: "Create failed", description: msg, variant: "destructive" });
    },
  });

  const deactivateMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/promo-codes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Promo code deactivated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          <h3 className="font-semibold">Create Promo Code</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TEST1" data-testid="input-promo-code-create" />
          </div>
          <div>
            <Label>Override charge (USD)</Label>
            <Input type="number" step="0.01" min="0.50" value={overrideDollars} onChange={(e) => setOverrideDollars(e.target.value)} data-testid="input-promo-amount" />
            <p className="text-xs text-muted-foreground mt-1">This is the exact amount the customer's card will be charged (no convenience fee added).</p>
          </div>
          <div>
            <Label>Max uses (optional)</Label>
            <Input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" data-testid="input-promo-max-uses" />
          </div>
          <div>
            <Label>Expires at (optional)</Label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} data-testid="input-promo-expires" />
          </div>
          <div className="md:col-span-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this code used for?" data-testid="input-promo-description" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={forceManual} onCheckedChange={setForceManual} data-testid="switch-promo-force-manual" />
            <Label className="cursor-pointer">Force manual fallback (skip Duffel order)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={adminOnly} onCheckedChange={setAdminOnly} data-testid="switch-promo-admin-only" />
            <Label className="cursor-pointer">Admin-only</Label>
          </div>
        </div>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !code.trim() || !overrideDollars} data-testid="button-create-promo">
          {createMut.isPending ? "Creating..." : "Create Promo Code"}
        </Button>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">No promo codes yet.</Card>
      ) : (
        <Card className="divide-y">
          {data.map((p) => {
            const charge = (p.overrideAmountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
            const expired = p.expiresAt && new Date(p.expiresAt).getTime() < Date.now();
            const exhausted = p.maxUses != null && p.usedCount >= p.maxUses;
            return (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`promo-row-${p.id}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold">{p.code}</span>
                    {!p.active && <Badge variant="outline">Inactive</Badge>}
                    {expired && <Badge variant="outline" className="border-red-500 text-red-600">Expired</Badge>}
                    {exhausted && <Badge variant="outline" className="border-amber-500 text-amber-600">Used up</Badge>}
                    {p.forceManual && <Badge variant="outline" className="border-violet-500 text-violet-600">Manual</Badge>}
                    {p.adminOnly && <Badge variant="outline">Admin-only</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Charge USD {charge} · Used {p.usedCount}{p.maxUses != null ? ` / ${p.maxUses}` : ""}
                    {p.expiresAt && <> · expires {new Date(p.expiresAt).toLocaleDateString()}</>}
                  </div>
                  {p.description && <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>}
                </div>
                {p.active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deactivateMut.mutate(p.id)}
                    disabled={deactivateMut.isPending}
                    data-testid={`button-deactivate-promo-${p.id}`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Deactivate
                  </Button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });

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
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={DollarSign} label="Revenue" value={revenueText} sub={revenueSub} />
          <DuffelBalanceCard />
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
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <TabsList className="inline-flex w-max">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Manual {stats?.pendingManual ? <Badge variant="outline" className="ml-2 border-amber-500">{stats.pendingManual}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">Calls</TabsTrigger>
          <TabsTrigger value="promos" data-testid="tab-promos">Promo Codes</TabsTrigger>
          <TabsTrigger value="emails" data-testid="tab-emails">Emails</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="pending" className="mt-4"><ErrorBoundary boundary="admin-tab-pending"><PendingManualTable /></ErrorBoundary></TabsContent>
        <TabsContent value="bookings" className="mt-4"><ErrorBoundary boundary="admin-tab-bookings"><BookingsTable /></ErrorBoundary></TabsContent>
        <TabsContent value="payments" className="mt-4"><ErrorBoundary boundary="admin-tab-payments"><PaymentsTable /></ErrorBoundary></TabsContent>
        <TabsContent value="users" className="mt-4"><ErrorBoundary boundary="admin-tab-users"><UsersTable /></ErrorBoundary></TabsContent>
        <TabsContent value="calls" className="mt-4"><ErrorBoundary boundary="admin-tab-calls"><CallsTable /></ErrorBoundary></TabsContent>
        <TabsContent value="promos" className="mt-4"><ErrorBoundary boundary="admin-tab-promos"><PromoCodesPanel /></ErrorBoundary></TabsContent>
        <TabsContent value="emails" className="mt-4"><ErrorBoundary boundary="admin-tab-emails"><EmailsPanel /></ErrorBoundary></TabsContent>
      </Tabs>
    </div>
  );
}

type EmailCatalogEntry = {
  id: string;
  name: string;
  description: string;
  audience: "Customer" | "Admin";
};

type EmailPreviewMeta = {
  variant?: "llm" | "fallback";
  reason?: string | null;
  latencyMs?: number | null;
  model?: string | null;
  flagEnabled?: boolean;
  configured?: boolean;
};
type RenderedEmail = { subject: string; html: string; meta?: EmailPreviewMeta };
type PreviewVariant = "fallback" | "personalized";

function EmailsPanel() {
  const { toast } = useToast();
  const { data: catalog, isLoading } = useQuery<EmailCatalogEntry[]>({ queryKey: ["/api/admin/email/catalog"] });
  const { data: me } = useQuery<{ email?: string }>({ queryKey: ["/api/auth/user"] });

  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewVariant, setPreviewVariant] = useState<PreviewVariant>("fallback");
  const [previewData, setPreviewData] = useState<RenderedEmail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPreview = async (id: string, variant: PreviewVariant) => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const qs = id === "guestProposal" ? `&variant=${variant}` : "";
      const res = await apiRequest("GET", `/api/admin/email/preview?type=${encodeURIComponent(id)}${qs}`);
      const json: RenderedEmail = await res.json();
      setPreviewData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load preview";
      toast({ title: "Preview failed", description: msg, variant: "destructive" });
      setPreviewType(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPreview = async (id: string) => {
    setPreviewType(id);
    // Default the guest-proposal preview to "personalized" so admins see
    // what real recipients get when the LLM flag is on.
    const initial: PreviewVariant = id === "guestProposal" ? "personalized" : "fallback";
    setPreviewVariant(initial);
    await fetchPreview(id, initial);
  };

  const switchVariant = async (variant: PreviewVariant) => {
    if (!previewType) return;
    setPreviewVariant(variant);
    await fetchPreview(previewType, variant);
  };

  const closePreview = () => {
    setPreviewType(null);
    setPreviewData(null);
  };

  const sendTestMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", "/api/admin/email/test", { type: id });
      return res.json() as Promise<{ ok: boolean; recipient: string }>;
    },
    onSuccess: (data) => {
      toast({ title: "Test email sent", description: `Sent to ${data.recipient}` });
    },
    onError: (err: Error) => {
      const raw = err.message?.replace(/^\d+:\s*/, "") || "Could not send";
      let msg = raw;
      try { const parsed = JSON.parse(raw); msg = parsed.message || raw; } catch {}
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!catalog || catalog.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground">No email templates registered.</Card>;
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 mt-0.5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-sm">Email previews &amp; test sends</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Preview any email Travnr sends with realistic sample data, or send a test to{" "}
              <span className="font-mono">{me?.email || "your admin email"}</span>.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {catalog.map((entry) => (
          <Card key={entry.id} className="p-4 flex items-start justify-between gap-4 flex-wrap" data-testid={`email-row-${entry.id}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">{entry.name}</h4>
                <Badge variant={entry.audience === "Admin" ? "secondary" : "outline"}>{entry.audience}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPreview(entry.id)}
                data-testid={`button-preview-${entry.id}`}
              >
                <Eye className="w-4 h-4 mr-1.5" /> Preview
              </Button>
              <Button
                size="sm"
                onClick={() => sendTestMut.mutate(entry.id)}
                disabled={sendTestMut.isPending && sendTestMut.variables === entry.id}
                data-testid={`button-send-test-${entry.id}`}
              >
                <Send className="w-4 h-4 mr-1.5" />
                {sendTestMut.isPending && sendTestMut.variables === entry.id ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={previewType !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent
          className="p-0 gap-0 max-w-none w-[90vw] h-[90vh] sm:max-w-none flex flex-col"
          data-testid="dialog-email-preview"
        >
          <DialogHeader className="px-5 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-medium truncate">
              {previewData?.subject || (previewLoading ? "Loading preview…" : "Preview")}
            </DialogTitle>
            {previewType === "guestProposal" && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <div className="inline-flex rounded-md border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => switchVariant("personalized")}
                    disabled={previewLoading}
                    className={`px-3 py-1 ${previewVariant === "personalized" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                    data-testid="button-variant-personalized"
                  >
                    <Sparkles className="w-3 h-3 inline mr-1" />Personalized (LLM)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchVariant("fallback")}
                    disabled={previewLoading}
                    className={`px-3 py-1 border-l ${previewVariant === "fallback" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                    data-testid="button-variant-fallback"
                  >
                    Deterministic
                  </button>
                </div>
                {previewData?.meta && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap" data-testid="text-preview-meta">
                    <Badge variant="outline" className="text-[10px]">
                      {previewData.meta.variant === "llm" ? "LLM" : "Fallback"}
                    </Badge>
                    {previewData.meta.latencyMs != null && (
                      <span>{previewData.meta.latencyMs}ms</span>
                    )}
                    {previewData.meta.reason && previewData.meta.variant === "fallback" && previewVariant === "personalized" && (
                      <span title="Why fallback was used">reason: {previewData.meta.reason}</span>
                    )}
                    {previewData.meta.flagEnabled === false && (
                      <span className="text-amber-600">PROPOSAL_EMAIL_LLM_PERSONALIZATION=off</span>
                    )}
                    {previewData.meta.configured === false && (
                      <span className="text-amber-600">ANTHROPIC_API_KEY missing</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30">
            {previewLoading ? (
              <div className="h-full flex items-center justify-center"><Skeleton className="w-3/4 h-3/4" /></div>
            ) : previewData ? (
              <iframe
                title="email-preview"
                srcDoc={previewData.html}
                sandbox=""
                className="w-full h-full border-0 bg-white"
                data-testid="iframe-email-preview"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
