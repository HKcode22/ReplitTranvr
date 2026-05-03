import posthog from "posthog-js";
import { isDoNotTrack, sanitizePath } from "./telemetry-utils";

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (import.meta.env.MODE !== "production") return;
  if (isDoNotTrack()) return;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

  posthog.init(key, {
    api_host: host,
    // Autocapture covers clicks/forms; we also capture explicit events below.
    autocapture: true,
    capture_pageview: false, // we trigger pageviews on wouter route changes
    capture_pageleave: true,
    persistence: "localStorage",
    respect_dnt: true,
    disable_session_recording: true,
    // Strip query strings from any URL-shaped property so that tokens
    // like guest booking option tokens or password reset tokens never
    // reach PostHog.
    sanitize_properties: (properties: Record<string, unknown>) => {
      const sanitized: Record<string, unknown> = { ...properties };
      for (const k of Object.keys(sanitized)) {
        const v = sanitized[k];
        if (typeof v === "string" && /^https?:\/\//.test(v)) {
          try {
            const u = new URL(v);
            u.search = "";
            sanitized[k] = u.toString();
          } catch {
            // Leave malformed URLs untouched; they'll be sent as-is and
            // are unlikely to contain a real token.
          }
        }
      }
      return sanitized;
    },
  });
  initialized = true;
}

export function identifyUser(userId: string | null): void {
  if (!initialized) return;
  if (userId) {
    // Identify by opaque id only — never email, name, or phone.
    posthog.identify(userId);
  } else {
    posthog.reset();
  }
}

export function trackPageView(path: string): void {
  if (!initialized) return;
  posthog.capture("$pageview", { route: sanitizePath(path) });
}

// Strict allowlist of business events. Payloads must contain only ids,
// route names, statuses, and counts — never PII (emails, names, phone,
// payment data, free-text input).
export type AnalyticsEvent =
  | "call_requested"
  | "proposal_viewed"
  | "guest_booking_started"
  | "guest_booking_completed"
  | "signup_completed"
  | "login";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}
