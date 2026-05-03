import rateLimit, { type Options, ipKeyGenerator } from "express-rate-limit";
import type { Request, Response, NextFunction, RequestHandler } from "express";

const isTest = process.env.NODE_ENV === "test";
const isDev = process.env.NODE_ENV !== "production";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

// Master switch — defaults to disabled in tests, enabled everywhere else
// (incl. dev so we can manually verify; per-route knobs below stay lax).
const RATE_LIMIT_DISABLED = envBool("RATE_LIMIT_DISABLED", isTest);

function friendlyRetryMessage(req: Request, res: Response): { message: string; retryAfterSeconds: number } {
  // express-rate-limit sets Retry-After (seconds) automatically.
  const ra = res.getHeader("Retry-After");
  const retryAfterSeconds = typeof ra === "string" ? parseInt(ra, 10) : typeof ra === "number" ? ra : 60;
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  const human = retryAfterSeconds < 60
    ? `${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}`
    : `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return {
    message: `Too many attempts. Please try again in ${human}.`,
    retryAfterSeconds,
  };
}

function makeLimiter(opts: Partial<Options> & { windowMs: number; max: number }): RequestHandler {
  if (RATE_LIMIT_DISABLED) {
    // No-op pass-through middleware so route wiring stays identical regardless
    // of environment.
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  return rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Friendly JSON body that the client toast/inline-error path already
    // surfaces via apiRequest -> throwIfResNotOk (parses res.json().message).
    handler: (req, res /* next, options */) => {
      const { message, retryAfterSeconds } = friendlyRetryMessage(req, res);
      res.status(429).json({ message, retryAfterSeconds });
    },
    ...opts,
  });
}

// Per-IP keyer that safely handles IPv6 (RFC compliance — express-rate-limit
// requires the helper for IPv6 keys).
const perIp = (req: Request) => ipKeyGenerator(req.ip ?? "");

// ---------- Auth (login / register / forgot / reset / resend verify) ----------
export const authIpLimiter = makeLimiter({
  windowMs: envInt("RATE_LIMIT_AUTH_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("RATE_LIMIT_AUTH_MAX", isDev ? 100 : 20),
  keyGenerator: perIp,
});

// Per-email throttle layered on top of per-IP for login so one attacker
// cannot rotate IPs against a single account. Successful logins are not
// counted (a real user typing the right password should never be throttled).
export const loginEmailLimiter = makeLimiter({
  windowMs: envInt("RATE_LIMIT_AUTH_EMAIL_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("RATE_LIMIT_AUTH_EMAIL_MAX", isDev ? 50 : 10),
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return email ? `login-email:${email}` : `login-ip:${perIp(req)}`;
  },
  skipSuccessfulRequests: true,
});

// Per-email throttle for password-reset requests. Unlike login we MUST count
// successful (200) requests too — forgot-password always returns 200 to avoid
// account enumeration, so leaving skipSuccessfulRequests on would defeat the
// throttle entirely and let an attacker rotate IPs to spam reset emails at
// one account.
export const forgotPasswordEmailLimiter = makeLimiter({
  windowMs: envInt("RATE_LIMIT_AUTH_FORGOT_EMAIL_WINDOW_MS", 60 * 60 * 1000),
  max: envInt("RATE_LIMIT_AUTH_FORGOT_EMAIL_MAX", isDev ? 30 : 5),
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return email ? `forgot-email:${email}` : `forgot-ip:${perIp(req)}`;
  },
});

// ---------- Callback / outbound voice triggers ----------
// Each call costs Bland AI minutes + outbound SMS — keep this tight.
export const callbackLimiter = makeLimiter({
  windowMs: envInt("RATE_LIMIT_CALLBACK_WINDOW_MS", 60 * 60 * 1000),
  max: envInt("RATE_LIMIT_CALLBACK_MAX", isDev ? 50 : 5),
  keyGenerator: perIp,
});

// ---------- Guest booking (PaymentIntent + confirm + promo validation) ----------
export const guestBookingLimiter = makeLimiter({
  windowMs: envInt("RATE_LIMIT_GUEST_BOOKING_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("RATE_LIMIT_GUEST_BOOKING_MAX", isDev ? 200 : 30),
  keyGenerator: perIp,
});

// ---------- Generic /api fallback ----------
export const genericApiLimiter = makeLimiter({
  windowMs: envInt("RATE_LIMIT_API_WINDOW_MS", 15 * 60 * 1000),
  max: envInt("RATE_LIMIT_API_MAX", isDev ? 5000 : 600),
  keyGenerator: perIp,
});
