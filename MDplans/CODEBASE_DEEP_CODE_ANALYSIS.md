# Travnr Codebase — Deep Code Analysis

> Line-by-line walkthrough of the most important files. Read this with the actual code open beside you.

---

## FILE 1: `server/index.ts` (331 lines) — The Server Bootstrap

This is the **entry point** — the file that Node.js starts running.

### Lines 1-14: Imports
```typescript
import express from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
// ... more imports
import { startMonitoringEngine } from './lib/disruption/monitor';
import { startTestFlightSeeder } from './lib/disruption/testFlightSeeder';
```

Every module the server needs is imported at the top. Notice `startMonitoringEngine` — this is the disruption prediction loop starter.

### Lines 17-19: Server Creation
```typescript
const app = express();
app.set("trust proxy", 1);  // Trust Replit's proxy for correct IP detection
const httpServer = createServer(app);
```

Creates the Express app and the raw HTTP server.

### Lines 23-98: Security Headers (Helmet CSP)
The Content Security Policy is very long but important. It whitelists:
- `js.stripe.com` — Stripe payment forms
- `*.ingest.sentry.io` — Sentry error reporting
- `*.i.posthog.com` — PostHog analytics
- `fonts.googleapis.com`, `fonts.gstatic.com` — Google Fonts
- In development: `ws:`, `wss:`, `'unsafe-inline'`, `'unsafe-eval'` — needed for Vite HMR

### Lines 106-151: Stripe Initialization
```typescript
async function initStripe() {
  // Uses Replit-specific stripe-replit-sync connector
  const { webhook } = await stripeSync.findOrCreateManagedWebhook(...)
}
```

This is **Replit-specific**. When migrating off Replit, you'd replace this with direct Stripe SDK calls.

### Lines 156-176: Stripe Webhook Endpoint
```typescript
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), ...)
// The raw body parser is CRITICAL — Stripe needs the raw body to verify signatures
```

**Why raw?** Stripe sends a signature header that's computed from the raw request body. If Express parses JSON first, the body gets modified and signature verification fails. This route MUST be registered BEFORE the JSON parser.

### Lines 178-186: JSON and URL-Encoded Parsers
```typescript
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
// verify callback: captures raw body for Stripe without affecting JSON parsing
app.use(express.urlencoded({ extended: false }));
```

### Lines 193-248: Request Logging Middleware
```typescript
app.use((req, res, next) => {
  const start = Date.now();
  // OVERRIDES res.json() to capture response body size/PII
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    // If LOG_RESPONSE_BODIES=1: store redacted body (PII masked)
    // Otherwise: just capture byte length
  };
  res.on("finish", () => {
    console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });
});
```

### Lines 250-331: The Async Bootstrap
```typescript
(async () => {
  // 1. Apply SQL migrations
  await applyBootMigrations();
  
  // 2. Register all API routes
  await registerRoutes(httpServer, app);
  
  // 3. Global error handler
  app.use((err, req, res, next) => { ... });
  
  // 4. Serve static files (Vite in dev, built files in prod)
  if (NODE_ENV === "production") serveStatic(app);
  else setupVite(httpServer, app);
  
  // 5. Start listening
  httpServer.listen({ port: 5000, host: "0.0.0.0" }, () => {
    initStripe();              // Stripe sync (async, non-blocking)
    startMonitoringEngine();   // ⭐ Disruption prediction engine starts here
    startTestFlightSeeder();   // Test data for debugging
  });
})();
```

**Key insight**: The disruption engine starts AFTER the server is listening. A `setTimeout` inside `startMonitoringEngine()` fires the first cycle 15 seconds later, giving the server time to settle.

---

## FILE 2: `server/db.ts` (59 lines) — Database Connection

```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export { pool };
```

**Line 7-8**: Creates a PostgreSQL connection pool using the `DATABASE_URL` env var. This is Replit's auto-provisioned Postgres URL. The pool manages multiple connections so queries don't have to open/close connections each time.

**Line 11**: Creates the Drizzle ORM wrapper. `{ schema }` imports all tables from `shared/schema.ts`, enabling type-safe queries like:
```typescript
db.select().from(users).where(eq(users.email, email))
```

**Lines 23-31**: Lists the SQL migration files to apply at boot:
```typescript
const BOOT_MIGRATIONS = [
  "0002_agency_disruption_system.sql",   // Disruption tables
  "0003_travelers_health.sql",           // Health reports
  "0004_confirmation_alert.sql",         // Alert tracking
  // ... up to 0008
];
```

Notice migrations `0000_` and `0001_` are NOT here — they're applied via `npm run db:push` (Drizzle Kit) because they modify existing tables. Only additive migrations (creating NEW tables with `IF NOT EXISTS`) run at boot.

**Lines 35-59**: `applyBootMigrations()`:
```typescript
for (const file of BOOT_MIGRATIONS) {
  const sql = await readFile(full, "utf8");
  const blocks = sql.split(/-->\s*statement-breakpoint/i);
  for (const block of blocks) {
    await pool.query(block);  // Executes raw SQL
  }
}
```
Reads each SQL file, splits by the `--> statement-breakpoint` marker (Drizzle convention), and executes each block against Postgres. All use `IF NOT EXISTS` so re-running is safe.

---

## FILE 3: `server/lib/disruption/riskScorer.ts` (373 lines) — The Core Prediction Model

### Lines 1-30: Types and Interfaces
```typescript
export interface MonitoredFlightInput {
  flightNumber: string;     // "AA4551"
  carrierIata: string;      // "AA"
  departureDate: string;    // "2026-07-15"
  departureTime?: string;   // "14:30"
  originIata: string;       // "JFK"
  destinationIata: string;  // "LAX"
  historicalOtpCache?: HistoricalOtpResult;  // Pre-fetched OTP (avoid duplicate API calls)
  forceRefreshNas?: boolean;  // Force refresh FAA data
}

export interface RiskScoreResult {
  score: number;            // 0-100
  tier: "green" | "amber" | "red";
  signals: RiskScoreSignals;  // Breakdown of each signal
  cancelled: boolean;
  // ... full data sources for logging
}
```

### Lines 55-83: Default Values for Failed API Calls
```typescript
function defaultWeather(iataCode): WeatherSignal {
  return { flightCategory: "UNKNOWN", riskContribution: 0, ... };
}
function defaultNas(): NasStatusResult {
  return { hasGroundStop: false, hasGroundDelay: false, ... };
}
function defaultCarrierHealth(carrierIata): CarrierHealthResult {
  return { healthScore: 3, reliable: false, ... };
}
```

Every external API call is wrapped in `.catch(() => defaultValue())`. If AeroDataBox is down, weather API fails, etc., the system falls back to neutral/near-zero values. **The model gracefully degrades** — missing data just means lower (less confident) scores.

### Lines 85-103: `computeHoursUntilDeparture()`
```typescript
function computeHoursUntilDeparture(departureDate, departureTime): number | null {
  // Combines date + time strings into a Date object
  // Calculates: (flightTime - now) / 3_600_000  → hours until departure
  // Returns null if parsing fails
}
```

Simple math: `(departureTimestamp - Date.now()) / 3600000` = hours from now until flight. This determines the horizon.

### Lines 105-108: Horizon Detection
```typescript
function getHorizon(hoursUntilDeparture): "short" | "medium" | "long" {
  if (hours <= 4) return "short";
  if (hours <= 24) return "medium";
  return "long";
}
```

### Lines 110-151: Horizon Weights
```typescript
const HORIZON_WEIGHTS = {
  short: {
    inboundAircraftDelay: 1.0,   // Full weight — we can see the plane's status
    historicalOtp: 0.3,          // Low weight — live data is better
  },
  medium: { ... },               // Balanced
  long: {
    inboundAircraftDelay: 0.0,   // No weight — plane hasn't flown yet
    historicalOtp: 1.0,          // Full weight — only historical data available
  },
};
```

### Lines 153-219: Raw Signal Functions (the "formulas")

Each function is named with a `Raw` suffix. They convert external API data into point values:

```typescript
function inboundDelayRaw(delayMinutes, cancelled): number {
  if (cancelled) return 40;          // Maximum points
  if (delayMinutes <= 0) return 0;
  if (delayMinutes <= 15) return 8;  // Small delay = low points
  if (delayMinutes <= 30) return 16;
  if (delayMinutes <= 60) return 28;
  return 40;                          // Big delay = max points
}

function timeOfDayRaw(departureTime): number {
  // Extracts hour from time string
  if (hour < 14) return 0;    // Before 2pm = safest
  if (hour < 18) return 1;    // 2-6pm = slight risk
  if (hour < 20) return 2;    // 6-8pm = moderate
  return 4;                    // After 8pm = riskiest
}

function dayOfWeekRaw(departureDate): number {
  const dow = new Date(date).getUTCDay();
  // Map: Mon=4, Tue=0, Wed=1, Thu=2, Fri=4, Sat=1, Sun=3
}
```

### Lines 221-308: `scoreFlightRisk()` — The Main Scoring Function

This is the heart of the prediction model:

```typescript
export async function scoreFlightRisk(flight: MonitoredFlightInput): Promise<RiskScoreResult> {
  // STEP 1: Determine horizon
  const hoursUntilDeparture = computeHoursUntilDeparture(...);
  const horizon = getHorizon(hoursUntilDeparture);
  const weights = HORIZON_WEIGHTS[horizon];
  
  // STEP 2: Fetch ALL data sources in parallel
  const [statusResult, originWeather, destinationWeather, 
         nasOrigin, nasDestination, carrierHealth] = await Promise.all([
    getFlightStatus(...),       // AeroDataBox
    getAirportWeather(origin),  // aviationweather.gov
    getAirportWeather(dest),    // aviationweather.gov
    getNasStatus(origin),       // FAA
    getNasStatus(dest),         // FAA
    getCarrierHealth(carrier),  // Database
  ]);
  
  // STEP 3: Compute raw signals
  const rawSignals = {
    inboundAircraftDelay: inboundDelayRaw(inboundMinutes, cancelled),
    atcGroundStop: atcGroundStopRaw(nasWorst),
    atcGroundDelay: atcGroundDelayRaw(nasWorst),
    originWeather: originWeatherRaw(safeOriginWeather),
    // ... all 10 signals computed
  };
  
  // STEP 4: Apply horizon weights
  const weightedSignals = {
    inboundAircraftDelay: Math.round(rawSignals.inbound * weights.inbound),
    // ... each signal multiplied by its horizon weight
  };
  
  // STEP 5: Sum all weighted signals
  let total = Object.values(weightedSignals).reduce((a, b) => a + b, 0);
  total = Math.min(100, Math.max(0, total));  // Clamp to 0-100
  
  // STEP 6: Determine tier based on horizon thresholds
  const tierThresholds = {
    short: { amber: 25, red: 60 },
    medium: { amber: 22, red: 50 },
    long: { amber: 18, red: 40 },
  }[horizon];
  
  // STEP 7: Cancellation override
  if (cancelled) {
    finalScore = Math.max(total, 75);
    finalTier = "red";
  }
  
  return { score, tier, signals, ... };
}
```

**Notice**: The `.catch(() => null)` on every API call means NO single API failure can crash the scoring. If AeroDataBox is down, `statusResult` is null, inbound delay is 0, and historical OTP falls back to cached/default values.

---

## FILE 4: `server/lib/disruption/monitor.ts` (729 lines) — The Background Engine

### Lines 26-31: Configuration
```typescript
const INTERVAL_MS = 30 * 60 * 1000;  // 30 minutes between cycles
let cycleRunning = false;            // Prevents overlapping cycles
```

### Lines 98-196: `processFlight()` — Score One Flight
```typescript
async function processFlight(flight, opts?) {
  // 1. Fetch historical OTP (cached per flight — only paid for once)
  if (!historicalOtpCache.has(flight.id)) {
    const otp = await getHistoricalOtp(flight.flightNumber, flight.departureDate);
    if (otp) historicalOtpCache.set(flight.id, otp);
  }
  
  // 2. Score the flight
  const risk = await scoreFlightRisk({ ...flight, historicalOtpCache });
  
  // 3. Store score history
  await db.insert(riskScoreHistory).values({ ... });
  
  // 4. Update monitored_flights with new score/tier
  await db.update(monitoredFlights).set({ riskScore, riskTier, ... });
  
  // 5. If RED tier and travelers haven't been alerted:
  const shouldAlert = (risk.tier === "red" || risk.cancelled) && pendingTravelers.length > 0;
  if (shouldAlert) {
    // Search for alternative flights
    const alternatives = await findLowRiskAlternatives(flight, 3);
    await db.insert(disruptionAlternatives).values(...alternatives);
    
    // Send email/SMS to each traveler
    await sendTravelerAlert(flight, pendingTravelers, alternatives, agency, risk);
  }
  
  return { alertFired };
}
```

### Lines 198-340: `runCycle()` — The Main Loop
```typescript
async function runCycle() {
  if (cycleRunning) return;  // Skip if previous cycle still running
  cycleRunning = true;
  
  // Query all active flights departing today or tomorrow
  const flights = await db.select().from(monitoredFlights)
    .where(and(
      eq(monitoredFlights.status, "active"),
      gte(monitoredFlights.departureDate, today),
      lte(monitoredFlights.departureDate, tomorrow),
    ));
  
  // Score each flight
  for (const flight of flights) {
    await processFlight(flight);
  }
  
  // Also score consumer-monitored flights
  await runUserFlightCycle();
  
  cycleRunning = false;
}
```

### Lines 398-450: `runUserFlightCycle()` — Consumer Monitoring
The same scoring logic but for the `user_monitored_flights` table (the "Monitor Flight" feature that normal users access, not agencies).

### Lines 452-560: `runResolutionCycle()` — Resolution Every 6 Hours
```typescript
async function runResolutionCycle() {
  // Find past flights with no resolved status
  const targets = await db.select().from(monitoredFlights)
    .where(departureDate < today && (resolvedStatus === null || resolvedStatus === "Unknown"));
  
  for (const flight of targets) {
    const result = await getFlightStatus(...);  // Final check on AeroDataBox
    
    if (result.status === "Arrived" || result.status === "Cancelled") {
      // Store final resolved status
      await db.update(monitoredFlights).set({ resolvedStatus, resolvedDelayMinutes, resolvedAt });
    } else if (flight is > 24h old with no data) {
      await db.update(monitoredFlights).set({ resolvedStatus: "status_unresolvable" });
    }
  }
}
```

### Lines 562-604: `startMonitoringEngine()` — Entry Point
```typescript
export function startMonitoringEngine() {
  // Main cycle: every 30 minutes
  intervalHandle = setInterval(runCycle, 30 * 60 * 1000);
  
  // Initial cycle: 15 seconds after boot (so server has time to start)
  setTimeout(() => runCycle(), 15_000);
  
  // Resolution cycle: every 6 hours
  setInterval(runResolutionCycle, 6 * 60 * 60 * 1000);
  
  // Initial resolution: 60 seconds after boot
  setTimeout(() => runResolutionCycle(), 60_000);
}
```

### Lines 606-635: `scoreFlightOnce()` — On-Demand Scoring
```typescript
export async function scoreFlightOnce(flightId, opts?) {
  // Used when a flight is FIRST added to monitoring — immediate score
  const [flight] = await db.select().from(monitoredFlights).where(eq(id, flightId));
  await processFlight(flight, opts);
}
```

---

## FILE 5: `server/lib/disruption/flightStatus.ts` (307 lines) — AeroDataBox Client

### Lines 1-20: Types
```typescript
export interface FlightStatusResult {
  status: string;          // "Scheduled" | "EnRoute" | "Delayed" | "Cancelled" | "Arrived"
  delayMinutes: number;    // Departure delay
  inboundDelayMinutes: number;  // Delay from inbound aircraft
  departureTime: string;   // ISO timestamp
  cancelled: boolean;
  tailNumber: string | null;    // N123AA (specific plane)
  equipmentType: string | null; // "Boeing 737-800"
}
```

### Lines 34-56: `normalizeStatus()`
Maps AeroDataBox's various status strings to a standard set:
```typescript
const map = {
  CanceledUncertain: "Cancelled",
  Canceled: "Cancelled",
  Diverted: "Delayed",
  EnRoute: "EnRoute",
  // ...
};
```

### Lines 58-116: `pickBestFlight()` — Handles Multiple Results
AeroDataBox sometimes returns multiple legs for the same flight number (e.g., AA4551 operates DCA→JFK AND ORD→LGA). This function:
1. Filters to matching origin/destination
2. If multiple, scores each by proximity to departure time
3. Prefers non-cancelled flights over cancelled ones
4. Returns the best match

### Lines 118-200: Three Lookup Strategies

**Strategy 1: Compact form** (primary — fastest):
```typescript
// URL: /flights/number/AA4551/2026-07-15
const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${date}`;
```

**Strategy 2: Spaced form** (fallback — for codeshare flights):
```typescript
// URL: /flights/number/AA 4551/2026-07-15
// Some codeshare flights only resolve when carrier and number are separated by space
```

**Strategy 3: FIDS departure list** (last resort):
```typescript
// URL: /flights/airports/iata/JFK/2026-07-15T00:00/2026-07-15T23:59?direction=Departure
// Lists ALL departures from origin airport on that date
// Searches for matching flight number in the list
// Also checks codeshares list
```

### Lines 202-307: `getFlightStatus()` — Main Entry Point
```typescript
export async function getFlightStatus(flightNumber, date, originIata, destinationIata) {
  const apiKey = process.env.AERODATABOX_API_KEY;
  if (!apiKey) return null;  // Graceful fallback if API not configured
  
  // Try strategy 1: compact
  let raw = await fetchFlightsByNumber(normalizedFlight, date, apiKey);
  
  // Try strategy 2: spaced
  if (!raw) raw = await fetchFlightsByNumber(spacedForm, date, apiKey);
  
  // Try strategy 3: FIDS
  if (!raw) flight = await fetchFlightFromFids(normalized, originIata, date, apiKey);
  
  // Parse results
  return {
    flightNumber: normalizedFlight,
    status: normalizeStatus(flight.status),
    delayMinutes: departureDelay,
    cancelled,
    tailNumber,
    equipmentType,
  };
}
```

### Lines 270-295: `fetchFlightFromFids()` — FIDS Fallback
```typescript
// Splits the day into two 12-hour windows (AM/PM)
// Fetches ALL departures for each window
// Searches for the matching flight number + origin/destination
// Uses pickBestFlight() to resolve duplicates
```

---

## FILE 6: `server/lib/bland.ts` (367 lines) — Bland AI Integration

### Lines 13-28: Configuration
```typescript
const BLAND_API_BASE = "https://api.bland.ai/v1";
const BLAND_REQUEST_TIMEOUT_MS = 10_000;  // 10 second timeout
const BLAND_DISPATCH_MAX_ATTEMPTS = 3;     // Retry up to 3 times
```

### Lines 56-72: Voice Pool
```typescript
export const DEFAULT_VOICE_POOL = ["Allan", "Carl", "Alley", "Trixie", "Violette", "Sophie"];

export function pickVoice() {
  const pool = getVoicePool();  // Can override with BLAND_VOICE_POOL env var
  return pool[Math.floor(Math.random() * pool.length)];
}
```

Each call gets a random voice from the pool, configurable by env var.

### Lines 133-201: `buildBlandCallConfig()` — Shared Call Configuration
This is the single source of truth for how Bland AI calls are configured. Both outbound and inbound calls use this:
```typescript
export function buildBlandCallConfig(opts) {
  return {
    task: opts.task,                    // The AI prompt
    webhook: opts.webhookUrl,           // Where Bland sends call events
    voice: opts.voice || pickVoice(),   // Random voice from pool
    max_duration: Math.min(opts.maxDuration || 10, 10),  // Max 10 minutes
    model: "enhanced",
    noise_cancellation: true,
    interruption_threshold: 100,
    endpoint_sensitivity: 0.35,          // Waits longer before hanging up
    end_call_phrases: ["Talk soon"],     // AI says this to end the call
    analysis_schema: getTravelAnalysisSchema(),  // Post-call extraction fields
    dynamic_data: [{...}],               // Mid-call data lookup config
  };
}
```

### Lines 203-250: `dispatchCall()` — Start an Outbound Call
```typescript
export async function dispatchCall(opts) {
  const config = buildBlandCallConfig({...});
  
  const payload = {
    phone_number: opts.phoneNumber,
    from: "+14159148074",                // Travnr's Twilio number
    ...config,
  };
  
  // Retry up to 3 times with 2-second delay between attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await blandRequest("POST", "/calls", payload);
      return { callId: data.call_id, status: data.status };
    } catch (err) {
      await sleep(2000);
    }
  }
}
```

### Lines 316-367: `buildTravelConciergePrompt()` — The AI Agent's Script
This is the prompt that defines the AI's personality and behavior:
```typescript
"You are a professional travel concierge assistant for Travnr, a premium travel service.
You are speaking with {userName}.
...
1. Greet the traveler warmly by name and ask where they'd like to fly.
2. Confirm the destination city... For SINGLE-AIRPORT cities (Boston, Denver, Seattle...),
   do NOT ask which airport. For MULTI-AIRPORT metros, offer the common one first.
3. Ask where they're departing from. Same rules.
4. Ask about travel dates.
5. Ask ONE combined preferences question exactly once.
6. Ask for email if not on file.
7. Recap and say 'Talk soon.' — that's the entire ending."
```

This prompt is carefully engineered with:
- Airport disambiguation rules (Boston→BOS, not MHT; NYC→JFK, not LGA/EWR)
- Strict rules about asking ONE question at a time
- Exact closing wording to trigger Bland's end-call detection
- Instructions to NOT ask about cabin class, traveler count, or seat preference unless the user brings it up (defaults to economy, 1 passenger, flexible)

---

## FILE 7: `server/routes.ts` (10951 lines) — All API Routes

This is the MASSIVE single file containing every API endpoint. Let me explain the key sections:

### Lines 1-88: Imports
Every module the server needs. Notable:
- `@duffel/api` — Duffel flight search/booking
- `./lib/bland` — Bland AI wrapper
- `./lib/disruption/*` — Disruption prediction engine
- `./lib/hotels/*` — Hotel search
- `./lib/emailTemplates` — Email generation
- `./lib/rateLimit` — Rate limiting
- `@sendgrid/mail` — Email sending

### Lines 100-110: Duffel Client and Fee Calculation
```typescript
let duffel: Duffel | null = null;               // Lazy-initialized Duffel client
const CONVENIENCE_FEE_PERCENT = 5;               // 5% booking fee
```

### Lines 230-263: Admin Detection
```typescript
function isAdminEmail(email) {
  return email.endsWith("@travnr.com") || ADMIN_ALERT_EMAILS.includes(email);
}
// Anyone with @travnr.com email is an admin
```

### Lines 266-302: Duffel Balance Check
```typescript
async function getDuffelBalance() {
  // GET https://api.duffel.com/air/balance
  // Checks if Travnr has enough balance to book the flight
}
async function isDuffelBalanceSufficient(amount, currency) {
  // Returns true if balance unknown or sufficient
  // Returns false only if balance is known AND insufficient
}
```

### Lines 3339-3413: `/api/duffel/search` — Flight Search Endpoint
```typescript
app.post("/api/duffel/search", isAuthenticated, async (req, res) => {
  const { origin, destination, departureDate, returnDate, passengers, cabinClass } = req.body;
  
  // Builds Duffel slices (one-way or round-trip)
  const slices = [{ origin, destination, departure_date: departureDate }];
  if (returnDate) slices.push({ origin: destination, destination: origin, departure_date: returnDate });
  
  // Searches BOTH Duffel AND SerpApi (Google Flights) IN PARALLEL
  const [offerRequest, serpApiOffers] = await Promise.all([
    duffel.offerRequests.create({ slices, passengers, cabin_class, return_offers: true }),
    searchSerpApiFlights({ origin, destination, departureDate, ... }),
  ]);
  
  // Merge results (SerpApi catches low-cost carriers Duffel misses)
  const allOffers = mergeSerpApiOffers(duffelOffers, serpApiOffers);
  
  // Return simplified offers (no raw Duffel data)
  return res.json({ offers: simplified });
});
```

### Lines 7363-7650: `/api/bland/webhook` — Bland AI Call Events
This handles incoming webhooks from Bland AI when a call progresses:

```typescript
app.post("/api/bland/webhook", async (req, res) => {
  // 1. Verify webhook secret
  const webhookSecret = req.headers["x-bland-secret"];
  if (expectedSecret && webhookSecret !== expectedSecret) return 401;
  
  // 2. Look up the bland_calls row by blandCallId
  let blandCall = await storage.getBlandCallByBlandId(payload.call_id);
  
  // 3. If it's an INBOUND call (no existing row), handle differently:
  if (!blandCall && isInboundCall) {
    // Extract call details from transcript/analysis
    // Generate a guest proposal directly (no user account needed)
    generateGuestProposalForInboundCall({...});
    return;  // Don't try to update non-existent bland_calls row
  }
  
  // 4. Update the bland_calls row with transcript/summary/recording
  updateData.transcript = payload.concatenated_transcript;
  updateData.summary = payload.summary;
  updateData.recordingUrl = payload.recording_url;
  updateData.variables = { ...existing, ...payload.variables, __analysis: blandAnalysis };
  
  // 5. Fire-and-forget Claude call summary
  if (callCompleted && hasTranscript) {
    summarizeCall({ transcript, summary, analysis });
  }
  
  // 6. Trigger proposal generation (if outbound call with callRequestId)
  if (blandCall.callRequestId && isTerminalStatus) {
    triggerProposalGenerationOnce(callRequestId, userId, summary, transcript);
  }
  
  return res.json({ received: true });  // Always 200 — Bland retries on non-200
});
```

### Lines 7686-7854: `/api/bland/dynamic-data` — Mid-Call Data Lookup
When the Bland AI is on a call with a user, it calls this endpoint to get context:

```typescript
app.post("/api/bland/dynamic-data", async (req, res) => {
  // 1. Resolve user by call_id or phone number
  let userId = null;
  if (call_id) {
    const blandCall = await storage.getBlandCallByBlandId(call_id);
    userId = blandCall?.userId;
  }
  if (!userId && phone) {
    userId = await storage.getUserIdByPhone(phone);
  }
  
  // 2. If user found, look up their data
  if (userId) {
    travelerInfo = profile?.name, homeAirport, seatPreference, ...
    bookingInfo = recent bookings with Duffel references
    proposalInfo = active proposals (sent/approved)
    emailInfo = user's email
  }
  
  // 3. Check for previous guest proposals (returning inbound callers)
  previousProposalInfo = await getRecentGuestProposalForPhone(phone);
  
  // 4. Return to Bland — injected into AI's context while talking
  return res.json({
    traveler_info: "Name: John, Home airport: STL, Seat: aisle",
    booking_info: "Booking ABC123 - USD 450 (paid)",
    proposal_info: "Trip to Paris - $1,200 (sent)",
    email_info: "Email on file: john@example.com",
    previous_proposal_info: "Sent flight options for STL→PAR earlier",
  });
});
```

### Lines 9373-10000+: Agency Disruption Routes
Starting at line 9373, a large block of agency-specific routes dynamically imports disruption modules:

```typescript
// Dynamic import at the agency routes section
const { scoreFlightRisk } = await import("./lib/disruption/riskScorer");
const { findLowRiskAlternatives } = await import("./lib/disruption/alternativeFinder");
const { sendTravelerAlert } = await import("./lib/disruption/alertSender");
const { scoreFlightOnce } = await import("./lib/disruption/monitor");
```

Key endpoints:
- `POST /api/agency/auth/register` — Create agency account (bcrypt hashed password)
- `POST /api/agency/auth/login` — Agency login, sets `session.agencyId`
- `GET /api/agency/auth/me` — Get current agency info
- `GET /api/agency/flights` — List all monitored flights with travelers, alternatives, history
- `POST /api/agency/flights` — Add a flight to monitoring (with travelers)
- `GET /api/agency/flights/:id` — Flight detail with full history
- `DELETE /api/agency/flights/:id` — Remove a monitored flight
- `POST /api/agency/flights/:id/rescore` — Force an immediate re-score
- `POST /api/agency/flights/:id/simulate` — Test what-if scenarios
- `POST /api/agency/flights/:id/resolve` — Resolve agency-side (mark as handled)
- `GET /api/agency/flights/export` — CSV export of all flights with history

---

## FILE 8: `client/src/lib/auth.tsx` (100 lines) — Auth Context

```typescript
export function AuthProvider({ children }) {
  const [, setLocation] = useLocation();
  
  // Fetch current user on app load
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) return null;  // Not logged in
      return res.json();
    },
    staleTime: Infinity,   // Never re-fetch unless invalidated
    retry: false,          // Don't retry on 401
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => apiRequest("POST", "/api/auth/login", { email, password }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }),
  });
  
  // Provide context to all children
  return (
    <AuthContext.Provider value={{
      user, isLoading, isAdmin: !!user?.isAdmin,
      login, register, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Key insight**: `staleTime: Infinity` means React Query never re-fetches the user data automatically. It only re-fetches when `invalidateQueries` is called (after login/logout/register). This avoids unnecessary `/api/auth/user` calls on every page navigation.

---

## FILE 9: `client/src/lib/queryClient.ts` (113 lines) — API Client

```typescript
// API request helper — every mutation goes through this
export async function apiRequest(method, url, data) {
  const headers = {};
  if (data) headers["Content-Type"] = "application/json";
  
  // CSRF: only for mutating requests (POST/PUT/DELETE)
  if (!NON_MUTATING.has(method.toUpperCase())) {
    const token = await ensureCsrfToken();  // Fetches CSRF cookie if missing
    if (token) headers["X-CSRF-Token"] = token;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",  // Always sends cookies (for session auth)
  });
  
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      if (json.message) message = json.message;  // Extract error message
    } catch {}
    throw new Error(message);  // Throws — caught by React Query's onError
  }
  return res;
}

// CSRF token bootstrapping
export async function ensureCsrfToken() {
  const existing = readCsrfCookie();
  if (existing) return existing;
  
  // Only one fetch at a time (prevents race conditions)
  csrfFetchPromise = fetch("/api/csrf-token", { credentials: "include" })
    .then(r => r.ok ? r.json() : null)
    .then(j => j?.csrfToken || readCsrfCookie());
}
```

---

## FILE 10: `client/src/lib/airports.ts` — Airport Database

This is a **static JSON array** of ~150 airports:

```typescript
export const AIRPORTS: AirportEntry[] = [
  { iata: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "US" },
  { iata: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US" },
  // ... 150 entries covering global major airports
];

export function searchAirports(query) {
  // Filters by IATA code, name, city, or country
  // Returns max 8 results for autocomplete dropdown
  return AIRPORTS.filter(a => 
    a.iata.includes(q) || a.name.includes(q) || a.city.includes(q)
  ).slice(0, 8);
}
```

Used in the flight search forms for autocomplete. **Not a dynamic API call** — all data is hardcoded in the frontend.

---

## FILE 11: `client/src/pages/agency/dashboard.tsx` (1616 lines) — Agency Dashboard

This is the largest page file. It has 4 tabs:

### Tab 1: Flights
- Table of all monitored flights
- Each row shows: flight number, route, departure time, risk badge (green/amber/red), live status pill, travelers
- Expandable rows show traveler details
- Stats cards: total monitored, at risk, alerts today, resolved this week
- "Add Flight" button opens a search dialog

### Tab 2: Travelers
- Aggregated view: all travelers across all flights
- Click a traveler → filters to show only their flights

### Tab 3: Alerts
- Flights where alerts have been sent
- Shows response status (traveler responded? selected alternative?)

### Tab 4: Health
- Precision/recall statistics from the `health_reports` table
- Active high-risk flights list
- Past flight analysis with classification badges (hit/miss/false alarm)

---

## FILE 12: `client/src/pages/agency/flight-detail.tsx` (632 lines) — Flight Detail

### Signal Labels
```typescript
const SIGNAL_LABELS = {
  inboundAircraftDelay: "Inbound Aircraft Delay",
  atcGroundStop: "ATC Ground Stop",
  atcGroundDelay: "ATC Ground Delay",
  originWeather: "Weather at Origin",
  destinationWeather: "Weather at Destination",
  timeOfDayRisk: "Time of Day",
  historicalRisk: "Historical Reliability",
};
```

### SignalBar Component
```typescript
function SignalBar({ name, value, max }) {
  // Renders a horizontal bar showing signal contribution
  // Color: green (low) → amber → red (high)
  return (
    <div>
      <div>{name}: {value}/{max}</div>
      <div className="bar" style={{width: `${(value/max)*100}%`}} />
    </div>
  );
}
```

### Simulation Controls
You can enter a target score (0-100) and click "Run Simulation" → POSTs to the API, which forces a re-score with simulated parameters. Agency can test "what if" scenarios.

---

## FILE 13: `server/lib/disruption/weatherSignal.ts` (166 lines) — Weather Scoring

### IATA → ICAO Conversion
```typescript
function iataToIcao(iata) {
  // Most US airports: prepend "K" (JFK → KJFK, LAX → KLAX)
  // Special cases: HNL → PHNL, LHR → EGLL, etc.
  return NON_K_ICAO[code] || `K${code}`;
}
```

### Flight Category from METAR
```typescript
function categoryFromMetar(visibilityMiles, ceilingFt) {
  if (vis < 1 || ceil < 500) return "LIFR";   // Lowest — dangerous
  if (vis < 3 || ceil < 1000) return "IFR";    // Instrument — poor
  if (vis < 5 || ceil < 3000) return "MVFR";   // Marginal
  return "VFR";                                 // Visual — good
}
```

### Risk Contribution Calculation
```typescript
function computeRiskContribution(metar) {
  let risk = 0;
  // Flight category penalties
  if (category === "MVFR") risk += 5;
  if (category === "IFR") risk += 10;
  if (category === "LIFR") risk += 15;
  
  // Thunderstorm: +8
  if (hasThunderstorm) risk += 8;
  
  // Freezing conditions: +5
  if (hasFreezing) risk += 5;
  
  // High wind: +3 per 10kt over 30
  if (windSpeed > 30) risk += Math.floor((windSpeed - 30) / 10) * 3;
  
  // Low ceiling: +5
  if (ceilingFt < 1000) risk += 5;
  
  // Low visibility: +5
  if (visibilityMiles < 3) risk += 5;
  
  return Math.min(risk, 25);  // Capped at 25
}
```

---

## FILE 14: `client/src/lib/passenger-form.ts` — Passenger Form Utility

### Types
```typescript
export interface PassengerForm {
  firstName: string;
  middleName?: string;
  lastName: string;
  dobMonth: string;      // "1" - "12" (select dropdown)
  dobDay: string;        // "1" - "31"
  dobYear: string;       // "1905" - current year
  gender: "" | "m" | "f" | "x" | "u";
  title: "mr" | "ms" | "mrs" | "miss" | "dr";
  residenceCountry: string;
  residenceState?: string;
  knownTravelerNumber?: string;   // TSA PreCheck
  knownTravelerCountry?: string;
  redressNumber?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportExpiry?: string;
}
```

### Key Functions

**composeBornOn()**: Combines month/day/year → "1990-03-15"
```typescript
function composeBornOn(p) {
  return `${p.dobYear}-${p.dobMonth.padStart(2,'0')}-${p.dobDay.padStart(2,'0')}`;
}
```

**isValidBornOn()**: Validates the date exists AND is in the past
```typescript
function isValidBornOn(iso) {
  // Creates Date from YYYY-MM-DD
  // Checks round-trip (Feb 30 fails)
  // Checks date is in the past (born before today)
}
```

**validatePassenger()**: Returns errors object
```typescript
function validatePassenger(p, passportRequired) {
  const errs = {};
  if (!p.firstName.trim()) errs.firstName = "First name is required";
  if (!p.lastName.trim()) errs.lastName = "Last name is required";
  const dob = composeBornOn(p);
  if (!dob) errs.bornOn = "Date of birth is required";
  if (p.residenceCountry === "US" && !p.residenceState) errs.residenceState = "State is required";
  // KTN/redress pairing: if number provided, must have issuing country
  return errs;
}
```

**serializePassenger()**: Trims and only includes non-empty optional fields
```typescript
function serializePassenger(p) {
  return {
    firstName: p.firstName.trim(),
    ...(p.middleName?.trim() ? { middleName: p.middleName.trim() } : {}),
    // Only include knownTravelerNumber if actually provided
    ...(p.knownTravelerNumber?.trim() ? { knownTravelerNumber: p.knownTravelerNumber.trim() } : {}),
  };
}
```

---

## SUMMARY: The Architecture in One Picture

```
USER'S BROWSER                    SERVER (Node.js + Express)                  EXTERNAL APIs
═══════════════                   ════════════════════════                   ═══════════════
                                  │
[React App]                       │  server/index.ts
  ┌─ App.tsx (routes)             │    ├── helmet (CSP)                     ──→ Stripe API
  ├─ AuthProvider (auth)          │    ├── express.json()                   
  ├─ ThemeProvider (light)        │    ├── Logging middleware                
  └─ QueryClientProvider (API)    │    ├── Error handler                    
                                  │    └── Bootstrap:                       
[Pages]                           │       ├── applyBootMigrations()         ──→ PostgreSQL DB
  ├─ landing.tsx                  │       ├── registerRoutes()              
  ├─ auth.tsx                     │       ├── serveStatic()                 
  ├─ dashboard.tsx                │       └── httpServer.listen()           
  ├─ request-call.tsx             │           ├── initStripe()              ──→ Stripe
  ├─ proposals.tsx                │           ├── startMonitoringEngine()   ──→ AeroDataBox
  ├─ flight-search.tsx            │           └── startTestFlightSeeder()      │ aviationweather.gov
  ├─ billing.tsx                  │                                              │ nasstatus.faa.gov
  ├─ agency/dashboard.tsx         │                                              │ SerpApi
  └─ disruption/selection.tsx     │                                              
                                  │  server/routes.ts (10951 lines)              
[API Calls]                       │    ├── /api/auth/*                      ──→ SendGrid
  └─ apiRequest()                 │    ├── /api/duffel/*                    ──→ Duffel API
     └─ fetch()                   │    ├── /api/bland/*                     ──→ Bland AI
        └─ server checks cookie   │    ├── /api/proposals/*                 ──→ PostgreSQL
           └─ session.userId      │    ├── /api/payments/*                  ──→ Stripe
                                  │    ├── /api/admin/*                     
                                  │    ├── /api/agency/*                    ──→ PostgreSQL
                                  │    ├── /api/disruption/*                   │ AeroDataBox
                                  │    └── /api/hotels/*                    ──→ 5 providers
                                  │                                              
                                  │  server/lib/disruption/                      
                                  │    ├── monitor.ts (every 30 min)           
                                  │    ├── riskScorer.ts (prediction)           
                                  │    ├── flightStatus.ts (AeroDataBox)    ──→ AeroDataBox
                                  │    ├── weatherSignal.ts (METAR)         ──→ aviationweather.gov
                                  │    ├── nasStatus.ts (FAA)               ──→ nasstatus.faa.gov
                                  │    ├── carrierHealth.ts (database)          
                                  │    ├── historicalOtp.ts (14 days)       ──→ AeroDataBox
                                  │    ├── alternativeFinder.ts             ──→ SerpApi
                                  │    └── alertSender.ts                   ──→ SendGrid/Twilio
                                  │                                              
[PostgreSQL Database]             │  shared/schema.ts                           
  25 tables in total              │    Each pgTable() → SQL table               
                                  │    Each createInsertSchema() → Zod validation
                                  │    Each $inferSelect → TypeScript type      
```
