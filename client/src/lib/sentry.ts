import * as Sentry from "@sentry/react";
import { isDoNotTrack, sanitizePath } from "./telemetry-utils";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (import.meta.env.MODE !== "production") return;
  if (isDoNotTrack()) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || undefined,
    environment: "production",
    // Keep payloads small and PII-free. We never send the user's email,
    // name, phone, or any free-text booking input — only an opaque user id
    // (set via setSentryUser) and the route they were on.
    sendDefaultPii: false,
    tracesSampleRate: 0,
    integrations: [],
  });
  initialized = true;
}

export function setSentryUser(userId: string | null): void {
  if (!initialized) return;
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export function setSentryRoute(route: string): void {
  if (!initialized) return;
  // Sanitize before tagging — token-bearing routes (e.g. /book/:optionToken,
  // /proposal/:token, /reset-password?token=…) must never reach Sentry.
  Sentry.setTag("route", sanitizePath(route));
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
