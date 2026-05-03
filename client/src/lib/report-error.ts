import { captureException } from "./sentry";

type ErrorContext = {
  boundary?: string;
  componentStack?: string | null;
  [key: string]: unknown;
};

export function reportError(error: unknown, context: ErrorContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload = {
    message: err.message,
    stack: err.stack,
    ...context,
  };
  if (typeof console !== "undefined") {
    console.error("[reportError]", payload);
  }
  // Forward to Sentry. The captureException no-ops when Sentry isn't
  // initialized (dev, DNT, missing DSN), so this is always safe to call.
  captureException(err, context);
}
