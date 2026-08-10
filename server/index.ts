import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './lib/stripeClient';
import { WebhookHandlers } from './lib/webhookHandlers';
import { redactJSON } from './lib/redact';
import { initSentry, captureRequestError, sentryRequestContext } from './lib/sentry';
import { applyBootMigrations } from './db';
import { startMonitoringEngine } from './lib/disruption/monitor';
import { startTestFlightSeeder } from './lib/disruption/testFlightSeeder';

initSentry();

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === "production";

// Security headers via Helmet. CSP allowlist is tuned for the third parties
// we actually use: Stripe (Elements, Apple/Google Pay, Link), Google Fonts,
// and our own assets. Duffel, SendGrid and Bland are server-to-server, so
// they don't need to be in connect-src/script-src here.
//
// In development we relax script/style/connect for Vite's HMR (inline
// modules, eval, ws/wss). HSTS is production-only because Replit dev
// previews are served over HTTP-with-TLS-termination at the proxy and we
// don't want to lock browsers into HTTPS for non-prod hostnames.
const stripeScriptSrc = ["https://js.stripe.com", "https://*.js.stripe.com"];
const stripeFrameSrc = ["https://js.stripe.com", "https://*.js.stripe.com", "https://hooks.stripe.com"];
const stripeConnectSrc = [
  "https://api.stripe.com",
  "https://*.stripe.com",
  "https://m.stripe.network",
  "https://maps.googleapis.com",
];
const stripeImgSrc = ["https://*.stripe.com"];

// Sentry (error reporting) and PostHog (product analytics) endpoints. Both
// are loaded only in production when their respective env vars are set, but
// the CSP allowlist needs the hosts unconditionally so the SDKs can phone
// home from a deployed build. PostHog also serves its lazy-loaded chunks
// from `*-assets.i.posthog.com`.
const sentryConnectSrc = ["https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io"];
const posthogConnectSrc = [
  "https://*.i.posthog.com",
  "https://*.posthog.com",
];
const posthogScriptSrc = ["https://*.i.posthog.com", "https://*.posthog.com"];

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: isProduction ? ["'self'"] : ["'self'", "https://*.replit.dev", "https://*.repl.co", "https://replit.com"],
        scriptSrc: [
          "'self'",
          ...stripeScriptSrc,
          ...posthogScriptSrc,
          ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]),
        ],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", ...stripeImgSrc],
        connectSrc: [
          "'self'",
          ...stripeConnectSrc,
          ...sentryConnectSrc,
          ...posthogConnectSrc,
          ...(isProduction ? [] : ["ws:", "wss:", "http:", "https:"]),
        ],
        frameSrc: ["'self'", ...stripeFrameSrc],
        workerSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // CSP `frame-ancestors` is the modern equivalent and more expressive
    // (we need to allow the Replit preview iframe in dev), so disable the
    // legacy X-Frame-Options header to avoid a SAMEORIGIN conflict.
    xFrameOptions: false,
    strictTransportSecurity: isProduction
      ? { maxAge: 15552000, includeSubDomains: true, preload: false }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    console.warn('Stripe connector not configured, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    const migrationTimeout = Promise.race([
      runMigrations({ databaseUrl, schema: 'stripe' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Stripe migration timed out')), 10000))
    ]);
    await migrationTimeout;
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) {
      const webhookBaseUrl = `https://${replitDomains.split(',')[0]}`;
      try {
        const { webhook } = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        console.log(`Stripe webhook configured: ${webhook?.url || webhookBaseUrl}`);
      } catch (webhookErr: any) {
        console.warn('Stripe webhook setup skipped:', webhookErr.message);
      }
    } else {
      console.log('REPLIT_DOMAINS not set, skipping Stripe webhook setup');
    }

    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error: any) {
    console.warn('Stripe initialization skipped:', error.message);
  }
}

// Kicked off below after the HTTP server starts listening, so a slow Stripe
// connector or migration can't hold the preview hostage.

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing signature' });

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('Stripe webhook: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Attach a Sentry scope per request so any captureException — whether it
// comes from a route handler, an async chain, or the global error
// middleware below — is automatically tagged with the matched route
// template, HTTP method, and (on finish) the response status. No-ops
// when Sentry isn't initialized (dev / missing DSN).
app.use(sentryRequestContext());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// PII policy: by default we never log the response body — many /api routes
// return traveler emails, phone numbers, names, DOB and passport numbers.
// We capture only the response size. Set LOG_RESPONSE_BODIES=1 in dev to
// enable a redacted preview for debugging (sensitive fields are masked by
// the redact() helper).
const LOG_RESPONSE_BODIES = process.env.LOG_RESPONSE_BODIES === "1";

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown = undefined;
  let capturedByteLength = 0;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (LOG_RESPONSE_BODIES) {
      capturedJsonResponse = bodyJson;
    } else {
      try {
        capturedByteLength = Buffer.byteLength(JSON.stringify(bodyJson) || "");
      } catch {
        capturedByteLength = -1;
      }
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (LOG_RESPONSE_BODIES && capturedJsonResponse !== undefined) {
        logLine += ` :: ${redactJSON(capturedJsonResponse)}`;
      } else if (!LOG_RESPONSE_BODIES) {
        logLine += ` body=${capturedByteLength}b`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "⚠️  ANTHROPIC_API_KEY is not set — proposal verification will be disabled. Set it to enable Claude-based auto-correction.",
    );
  }

  // Apply additive boot-time migrations (Agency Disruption Monitoring
  // tables). Idempotent and isolated from the consumer schema — never
  // alters or drops existing tables. Logged failures here are fatal
  // because the agency routes registered below depend on these tables.
  try {
    await applyBootMigrations();
  } catch (err: any) {
    console.error("Boot migrations failed:", err?.message || err);
  }

  // v3 — AeroDataBox Flight Alert webhook + subscription management
  // (travnr.com). See MDplan/V3_WebhookExtractionPlan.md.
  // NOTE: registered BEFORE registerRoutes() on purpose — registerRoutes mounts
  // the CSRF middleware + generic /api limiter via app.use(), which would 403
  // AeroDataBox's webhook POSTs (no CSRF token) and burn credits on retries.
  // v3 routes authenticate themselves: the webhook via the URL secret and the
  // management endpoints via the x-webhook-secret header.
  const { registerV3Routes } = await import("./routes_v3");
  registerV3Routes(app);

  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    // Only forward server-side faults to Sentry; 4xx are client problems
    // and would just be noise. captureRequestError no-ops in dev / when
    // SENTRY_DSN is unset, so this is always safe to call.
    if (status >= 500) {
      captureRequestError(err, req, status);
    }

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      initStripe().catch((err) => {
        console.warn('Stripe initialization failed:', err?.message || err);
      });
      // [disabled 2026-07-28] v1 disruption monitoring and test flight seeder
      // are disabled. server2/ owns all risk scoring and monitoring (v2 schema).
      // v1 server handles everything else (auth, bookings, etc.).
      // See EMAIL_ALERT_INVESTIGATION.md for details.
      // try {
      //   startMonitoringEngine();
      // } catch (err: any) {
      //   console.error('Disruption monitoring engine failed to start:', err?.message || err);
      // }
      // try {
      //   startTestFlightSeeder();
      // } catch (err: any) {
      //   console.error('Test flight seeder failed to start:', err?.message || err);
      // }
    },
  );
})();
