import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";

let initialized = false;

// Strip query strings and replace token/id-like path segments before any
// path string is sent to Sentry. Mirrors client/src/lib/telemetry-utils.ts
// so the same scrubbing rules apply on both ends.
export function sanitizePath(path: string): string {
  const noQuery = path.split("?")[0].split("#")[0];
  return noQuery
    .split("/")
    .map((seg) => {
      if (!seg) return seg;
      if (/^[0-9a-fA-F]{8}-[0-9a-fA-F-]{20,}$/.test(seg)) return ":id";
      if (/^\d+$/.test(seg)) return ":id";
      if (seg.length >= 24 && /^[A-Za-z0-9_-]+$/.test(seg)) return ":token";
      return seg;
    })
    .join("/");
}

function safeRoute(req: Request): string {
  // Prefer the matched Express route template (already a placeholder
  // pattern like "/api/guest-booking/:optionToken/option") so no real
  // token reaches Sentry. Fall back to a sanitized req.path only when
  // the route didn't match (e.g. 404s).
  const routePath = (req.route?.path as string | undefined) || null;
  if (routePath) return routePath;
  return sanitizePath(req.path || req.url || "unknown");
}

export function initSentry(): void {
  if (initialized) return;
  if (process.env.NODE_ENV !== "production") return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  // @sentry/node ships with default integrations that already capture
  // uncaughtException and unhandledRejection, so we don't add our own
  // process-level listeners — doing so would risk duplicate events and
  // interfere with the SDK's crash-handling lifecycle.
  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE || undefined,
    environment: "production",
    // No automatic PII (request bodies, headers like cookie/auth, IPs).
    // We attach only safe request context (method, path, status) ourselves
    // when reporting handled errors.
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });

  initialized = true;
}

// Express middleware that opens a per-request Sentry isolation scope so
// any captureException made from async handlers within this request is
// automatically tagged with the matched route template, HTTP method, and
// (after the response finishes) the final status. Uses withIsolationScope
// — backed by AsyncLocalStorage in @sentry/node — for reliable async
// context propagation. No-ops when Sentry isn't initialized.
export function sentryRequestContext() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!initialized) return next();
    Sentry.withIsolationScope((scope) => {
      const route = safeRoute(req);
      scope.setTag("route", route);
      scope.setTag("method", req.method);
      scope.setContext("request", { method: req.method, path: route, status: null });
      res.on("finish", () => {
        scope.setTag("status", String(res.statusCode));
        scope.setContext("request", { method: req.method, path: route, status: res.statusCode });
      });
      next();
    });
  };
}

export function captureRequestError(err: unknown, req: Request, status?: number): void {
  if (!initialized) return;
  const route = safeRoute(req);
  Sentry.withScope((scope) => {
    scope.setContext("request", { method: req.method, path: route, status: status ?? null });
    scope.setTag("route", route);
    scope.setTag("method", req.method);
    if (typeof status === "number") scope.setTag("status", String(status));
    Sentry.captureException(err);
  });
}
