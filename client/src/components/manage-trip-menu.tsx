// Manage-trip dropdown + confirmation dialog shared by /trips and /manage-trip.
// Caller passes `onSubmit({ type, message })`; `refundStatus` disables the
// refund row when a refund is already in flight.

import { useState } from "react";
import { Settings2, ArrowRight, Calendar, Hash, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type ManageTripType = "refund" | "cancel" | "change";

export interface ManageTripSummary {
  id: number;
  bookingReference: string | null;
  amount: string;
  currency: string;
  refundStatus?: string | null;
  order?: any;
  manual?: { routeSummary: string | null; departingAt: string | null } | null;
}

interface ManageTripMenuProps {
  trip: ManageTripSummary;
  onSubmit: (args: { type: ManageTripType; message: string }) => Promise<void>;
  /** When true, the dropdown trigger uses the size="sm" Button. */
  compact?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function buildTripSummary(trip: ManageTripSummary): { route: string; dateLabel: string | null } {
  const slices = trip.order?.slices || [];
  const first = slices[0]?.segments?.[0];
  const last = slices[slices.length - 1]?.segments?.slice(-1)?.[0] || slices[0]?.segments?.slice(-1)?.[0];
  let route = `Booking #${trip.id}`;
  let dateLabel: string | null = null;
  if (first && last) {
    const o = first.origin?.city_name || first.origin?.iata_code || "?";
    const d = last.destination?.city_name || last.destination?.iata_code || "?";
    route = `${o} → ${d}`;
    if (first.departing_at) dateLabel = formatDate(first.departing_at);
  } else if (trip.manual?.routeSummary) {
    route = trip.manual.routeSummary;
    if (trip.manual.departingAt) dateLabel = formatDate(trip.manual.departingAt);
  }
  return { route, dateLabel };
}

function refundLabelFor(status?: string | null): { label: string; disabled: boolean; suffix?: string } {
  if (status === "requested") return { label: "Refund Requested", disabled: true, suffix: "Pending" };
  if (status === "approved") return { label: "Refund Approved", disabled: true, suffix: "Approved" };
  if (status === "completed") return { label: "Refund Completed", disabled: true, suffix: "Completed" };
  return { label: "Request refund", disabled: false };
}

export function ManageTripMenu({ trip, onSubmit, compact = true }: ManageTripMenuProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ManageTripType>("refund");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = buildTripSummary(trip);
  const refund = refundLabelFor(trip.refundStatus);

  const openWith = (t: ManageTripType) => {
    setType(t);
    setMessage("");
    setError(null);
    setOpen(true);
  };

  const titleLabel =
    type === "refund" ? "Request refund"
    : type === "cancel" ? "Cancel trip"
    : "Change trip";
  const placeholder =
    type === "refund" ? "Briefly describe why you'd like a refund."
    : type === "cancel" ? "Let us know why you need to cancel."
    : "Tell us what you'd like to change (dates, names, route…).";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ type, message: trimmed });
      setOpen(false);
      setMessage("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            className={compact ? "text-xs" : undefined}
            data-testid={`button-manage-trip-${trip.id}`}
          >
            <Settings2 className={compact ? "w-3.5 h-3.5 mr-1" : "w-4 h-4 mr-1.5"} />
            Manage trip
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={refund.disabled}
            onSelect={() => { if (!refund.disabled) openWith("refund"); }}
            data-testid={`menu-manage-refund-${trip.id}`}
          >
            <span className="flex-1">{refund.label}</span>
            {refund.suffix && <Badge variant="secondary" className="ml-2 text-[10px]">{refund.suffix}</Badge>}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openWith("cancel")} data-testid={`menu-manage-cancel-${trip.id}`}>
            Cancel trip
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openWith("change")} data-testid={`menu-manage-change-${trip.id}`}>
            Change trip
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={(v) => { if (!submitting) setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titleLabel}</DialogTitle>
            <DialogDescription>
              We'll email our concierge team and confirm receipt with you. Replies arrive within one business day.
            </DialogDescription>
          </DialogHeader>

          {/* Trip summary block — required by spec so travelers can confirm
              they're managing the right booking before submitting. */}
          <div className="rounded-md border bg-muted/20 px-3 py-2.5 text-sm space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{summary.route}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {summary.dateLabel && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {summary.dateLabel}
                </span>
              )}
              {trip.bookingReference && (
                <span className="inline-flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span className="font-mono">{trip.bookingReference}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                {trip.currency.toUpperCase()} {Number(trip.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              {type === "refund" && trip.refundStatus === "requested" && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <CheckCircle2 className="w-3 h-3" /> Refund already requested
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`manage-message-${trip.id}`}>Details</Label>
              <Textarea
                id={`manage-message-${trip.id}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                required
                placeholder={placeholder}
                data-testid={`textarea-manage-message-${trip.id}`}
              />
            </div>
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !message.trim()}
                data-testid={`button-submit-manage-${trip.id}`}
              >
                {submitting ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
