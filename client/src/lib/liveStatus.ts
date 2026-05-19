// Shared mapping from AeroDataBox's flightStatus payload to the live-status
// pill we render on the agency dashboard and the flight-detail page. Source
// of truth is server/lib/disruption/flightStatus.ts → FlightStatusResult.

export type LiveStatusTone = "green" | "amber" | "red" | "blue" | "gray";

export interface LiveStatus {
  label: "On Time" | "Delayed" | "En Route" | "Landed" | "Cancelled" | "Scheduled";
  tone: LiveStatusTone;
  /** 0 = pre-departure, 50 = airborne, 100 = arrived */
  progress: number;
  subtitle: string | null;
  detail: string | null;
}

export interface FlightStatusSnapshot {
  status?: string | null;
  delayMinutes?: number | null;
  inboundDelayMinutes?: number | null;
  cancelled?: boolean | null;
  departureTime?: string | null;
}

export function liveStatusFor(
  snapshot: FlightStatusSnapshot | null | undefined,
  revisedDepartureLocal: string,
): LiveStatus | null {
  if (!snapshot) return null;
  const status = snapshot.status || null;
  const delayMins = Math.max(0, Number(snapshot.delayMinutes || 0));
  const cancelled = snapshot.cancelled === true || status === "Cancelled";

  if (cancelled) {
    return {
      label: "Cancelled",
      tone: "red",
      progress: 0,
      subtitle: "Contact your travel agent",
      detail: null,
    };
  }
  if (status === "Arrived") {
    return { label: "Landed", tone: "green", progress: 100, subtitle: null, detail: null };
  }
  if (status === "EnRoute" || status === "Departed") {
    return { label: "En Route", tone: "blue", progress: 55, subtitle: null, detail: null };
  }
  if (status === "Delayed" || delayMins > 0) {
    return {
      label: "Delayed",
      tone: "amber",
      progress: 5,
      subtitle: `Now departing ${revisedDepartureLocal}`,
      detail: delayMins > 0 ? `Running ${delayMins} minutes late` : null,
    };
  }
  return { label: "Scheduled", tone: "gray", progress: 5, subtitle: null, detail: null };
}

export function liveStatusStyles(tone: LiveStatusTone): {
  wrap: string;
  bar: string;
  pill: string;
  pillBg: string;
} {
  switch (tone) {
    case "green":
      return {
        wrap: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
        bar: "bg-emerald-500",
        pill: "text-emerald-700 dark:text-emerald-300",
        pillBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
      };
    case "amber":
      return {
        wrap: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
        bar: "bg-amber-500",
        pill: "text-amber-700 dark:text-amber-300",
        pillBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
      };
    case "red":
      return {
        wrap: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
        bar: "bg-red-500",
        pill: "text-red-700 dark:text-red-300",
        pillBg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900",
      };
    case "blue":
      return {
        wrap: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
        bar: "bg-blue-500",
        pill: "text-blue-700 dark:text-blue-300",
        pillBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900",
      };
    default:
      return {
        wrap: "border-border bg-muted/40",
        bar: "bg-muted-foreground/50",
        pill: "text-muted-foreground",
        pillBg: "bg-muted/60 border-border",
      };
  }
}
