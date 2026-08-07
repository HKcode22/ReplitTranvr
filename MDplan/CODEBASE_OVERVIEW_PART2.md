# Travnr Codebase Overview — Part 2: Deep Dive

> Reading this after Part 1. Answers every specific question you asked.

---

## 1. THE DUPLICATE FOLDER PROBLEM — Explained

You noticed "two client folders" and "so many duplicates." Here's what's happening:

### The real codebase is at the ROOT:

```
/Users/hk/Downloads/Travnr-Environment-Setupzip/   ← THIS IS THE REAL ONE
    ├── client/        ← Has 27 pages, more features
    ├── server/        ← Full server with disruption engine
    ├── shared/        ← Schema
    ├── migrations/    ← SQL migrations
    ├── scripts/       ← Utility scripts
    ├── .git/          ← Git repository
    ├── package.json   ← v1.0.1 (newer, more deps)
    └── ...
```

### The NESTED duplicate is a STALE COPY:

```
/Users/hk/Downloads/Travnr-Environment-Setupzip/Travnr-Environment-Setup/   ← STALE COPY
    ├── client/        ← Only 15 pages (missing 12+)
    ├── server/        ← Older version
    ├── shared/        ← Same schema
    ├── package.json   ← v1.0.0 (older, fewer deps)
    └── ...
```

**Why it exists**: Someone likely extracted a `zipFile.zip` inside the project folder, creating a nested copy. Or Replit created a backup. The nested copy has NO `.git/` folder and is missing Sentry, Stripe React, Helmet, Twilio, PostHog, Anthropic SDK, and many pages.

| Feature | Root (real) | Nested (stale) |
|---------|-------------|----------------|
| Pages | 27 | 15 |
| Git history | ✅ Has `.git/` | ❌ No `.git/` |
| Disruption engine | ✅ Full | ✅ Partial |
| Sentry monitoring | ✅ Yes | ❌ No |
| Stripe React components | ✅ Yes | ❌ No |
| Twilio SMS | ✅ Yes | ❌ No |
| PostHog analytics | ✅ Yes | ❌ No |
| Helmet security headers | ✅ Yes | ❌ No |
| Anthropic SDK (Claude) | ✅ Yes | ❌ No |
| SEO pages (privacy, terms) | ✅ Yes | ❌ No |
| Agency pages (3 files) | ✅ Yes | ❌ No |
| Disruption pages (2 files) | ✅ Yes | ❌ No |
| Unique files it has | — | `calendar-page.tsx` |

**The nested `Travnr-Environment-Setup/` folder can be IGNORED or deleted.** It's a fossil.

---

## 2. WHAT IS DRIZZLE ORM? (And Where Is the Database?)

### Drizzle ORM
Drizzle is a **TypeScript SQL ORM** (Object-Relational Mapper). It lets you write database queries using TypeScript code instead of raw SQL.

**Without Drizzle**, you'd write:
```sql
SELECT * FROM users WHERE email = 'test@example.com';
```

**With Drizzle**, you write:
```typescript
db.select().from(users).where(eq(users.email, 'test@example.com'));
```

The schema is defined in `shared/schema.ts` using Drizzle's table builder:
```typescript
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  // ... more columns
});
```

This schema serves **three purposes**:
1. **TypeScript types** are auto-derived (e.g., `User`, `InsertUser`)
2. **Database tables** are created from it (via `npm run db:push`)
3. **Query validation** with Zod (via `drizzle-zod`)

### Where Is the Database?

The database is **PostgreSQL 16**, hosted on Replit's infrastructure. When you see `.replit`:
```
modules = ["nodejs-20", "python-3.11", "postgresql-16"]
```

That `postgresql-16` line tells Replit to **provision a PostgreSQL 16 database automatically**. The connection string is injected as:
```
DATABASE_URL=postgresql://...
```

You never see the actual URL because it's set as a **Replit secret** (not in `.env`). The code accesses it in `server/db.ts`:
```typescript
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);
```

**It is NOT Firebase.** It's a standard PostgreSQL relational database running on Replit's cloud servers. All data (users, flights, proposals, risk scores, etc.) is stored in this PostgreSQL database.

---

## 3. REPLIT — What Is It and Why Is It Involved?

Replit (replit.com) is a **cloud IDE** — you code in a browser, it hosts the app. Think "Google Docs for coding." 

The `.replit` file defines:
- What language runtime to use (Node.js 20)
- What database to provision (PostgreSQL 16)
- What port to listen on (5000)
- How to build and deploy

**No Firestore, no Firebase Auth, no Firebase anything.** The `.local/` folder with SQLite files is Replit's own internal state for its agent/tools — not your app's data.

---

## 4. WOULD THIS CODE EVEN RUN? (And Those Red Error Lines)

**Yes, it would run.** The "red stuff lines" you see are likely:

1. **TypeScript errors** in your editor because `node_modules` aren't installed. The code imports packages like `@duffel/api`, `@sendgrid/mail`, etc. Without `npm install`, your editor can't resolve them and shows red squiggles.

2. **Missing environment variables**. The code checks for `DATABASE_URL`, `BLAND_AI_API_KEY`, `DUFFEL_API_TOKEN`, etc. at startup. They fail gracefully with warning logs, but missing critical ones like `DATABASE_URL` would prevent the app from starting.

3. **TypeScript strict mode** errors. The `tsconfig.json` has `"strict": true`, so things like `null` checks that aren't perfectly handled show errors.

**To run it:**
```bash
npm install     # Install dependencies (resolves all import errors)
npm run db:push # Create database tables
npm run dev     # Start the server
```

On Replit, the `.replit` file auto-runs `npm run dev` when you hit "Run". The database is auto-provisioned.

---

## 5. EVERY FILE IN `client/src/lib/` — Explained

| File | What It Does | Lines |
|------|-------------|-------|
| `airports.ts` | **Airport database**. Contains a hardcoded list of ~150 major airports worldwide with IATA code, name, city, country. Has a `searchAirports()` function for autocomplete filtering. Used in flight search forms. | ~200 |
| `airportTimezone.ts` | **Airport timezone mapping**. Maps IATA codes (JFK → America/New_York) to display times in the local timezone of the origin airport. | ~60 |
| `analytics.ts` | **PostHog analytics setup**. Initializes PostHog (only in production, only if user hasn't set Do Not Track). Captures page views and allowlisted business events (call_requested, signup_completed, etc.). Never sends PII. | ~100 |
| `auth.tsx` | **Authentication context** (React context). Provides `login()`, `register()`, `logout()`, and the current `user` object to the entire app. Calls backend API endpoints. Sets up CSRF protection. | ~100 |
| `countries.ts` | **Country database**. Full ISO-3166-1 list of all 249 countries with codes. Also has US states and Canadian provinces for address forms. | ~300 |
| `liveStatus.ts` | **Flight live status display**. Takes flight status data from AeroDataBox (cancelled, delayed, en route, etc.) and returns a label, color, progress bar value, and subtitle for UI rendering. | ~120 |
| `passenger-form.ts` | **Passenger form helpers**. Defines the PassengerForm interface, validation logic, date-of-birth picker helpers, and serialization for the airline-style booking form. Shared between guest and authenticated booking flows. | ~200 |
| `queryClient.ts` | **API client + React Query setup**. Creates the `QueryClient`, provides `apiRequest()` (a fetch wrapper with CSRF tokens, error handling), and `getQueryFn()` for React Query. Every API call in the frontend goes through this. | ~113 |
| `report-error.ts` | **Error reporting utility**. Wraps errors, logs them to console, and forwards to Sentry. Used by React error boundary. | ~25 |
| `sentry.ts` | **Sentry error monitoring setup**. Initializes Sentry (production only, no DNT). Sets user by opaque ID (not email/name). Never sends PII. | ~60 |
| `telemetry-utils.ts` | **Shared telemetry helpers**. `isDoNotTrack()` checks browser DNT setting. `sanitizePath()` strips tokens/IDs from URLs before sending to analytics — e.g. `/book/abc123...` → `/book/:token`. | ~35 |
| `theme.tsx` | **Theme provider**. Currently locked to light mode. Was originally a dark/light toggle but has been locked. Kept as React context for compatibility. | ~35 |
| `utils.ts` | **Utility function**. Just `cn()` — merges Tailwind CSS class names using `clsx` + `tailwind-merge`. Used everywhere for conditional styling. | ~10 |

---

## 6. EVERY FILE IN `client/src/pages/` — Quick Summary

### Main pages (user-facing):

| Page | Route | Purpose |
|------|-------|---------|
| `landing.tsx` | `/` | Public homepage. Typing animation, AI voice animation, callback form. SEO-optimized with FAQ. |
| `auth.tsx` | `/auth` | Login/Register with email verification, forgot password flow. |
| `reset-password.tsx` | `/reset-password` | Password reset form (from email link). |
| `dashboard.tsx` | `/dashboard` | User dashboard with stats, latest call/proposal/booking data. |
| `profile.tsx` | `/profile` | Traveler profile form (passport details, preferences). |
| `request-call.tsx` | `/request-call` | Request an AI concierge phone call. |
| `call-history.tsx` | `/call-history` | History of Bland AI calls with transcripts, recordings. |
| `proposals.tsx` | `/proposals` | List of itinerary proposals. |
| `proposal-detail.tsx` | `/proposal/:id` | Single proposal with line items, Duffel flight cards, book button. |
| `flight-search.tsx` | `/flight-search` | Duffel-powered flight search. |
| `guest-booking.tsx` | `/booking/:token` | Guest checkout flow (no account needed). |
| `guest-proposal.tsx` | `/proposal/guest/:token` | Guest views flight options from email link. |
| `billing.tsx` | `/billing` | Payment history, saved cards management. |
| `trips.tsx` | `/trips` | List of booked trips. |
| `travelers.tsx` | `/travelers` | Manage traveler profiles. |
| `notifications-page.tsx` | `/notifications` | Notification list with read/unread. |
| `manage-trip.tsx` | `/manage-trip` | Public trip lookup by booking ref + last name. |
| `monitor-flight.tsx` | `/monitor-flight` | Consumer flight monitoring (add flights to watch). |
| `agencies.tsx` | `/agencies` | Agency listing/management. |
| `admin-dashboard.tsx` | `/admin` | Admin panel: user management, payments, call monitoring, stats. |
| `contact.tsx` | `/contact` | Contact form. |
| `privacy.tsx` | `/privacy` | Privacy policy (legal page). |
| `terms.tsx` | `/terms` | Terms of service (legal page). |
| `security.tsx` | `/security` | Security & compliance info. |
| `not-found.tsx` | No route match | 404 page. |

### Agency pages (agency/auth required):

| Page | Route | Purpose |
|------|-------|---------|
| `agency/auth.tsx` | `/agency/auth` | Agency login/register. |
| `agency/dashboard.tsx` | `/agency/dashboard` | Agency main dashboard with 4 tabs (Flights, Travelers, Alerts, Health). Stats, flight monitoring, traveler management, health report. |
| `agency/flight-detail.tsx` | `/agency/flight/:id` | Single flight detail with score breakdown, signal bars, live status, simulation controls, score history. |

### Disruption pages (public, accessed from email/SMS link):

| Page | Route | Purpose |
|------|-------|---------|
| `disruption/selection.tsx` | `/disruption/:token` | Traveler sees disruption alert and chooses between 3 alternative flights or keeps original. |
| `disruption/confirmed.tsx` | `/disruption/confirmed` | Confirmation screen after making a selection. |

---

## 7. THE MIGRATIONS FOLDER — What Are SQL and JSON Files?

The `migrations/` folder tracks **database schema changes over time**:

```
migrations/
  0000_add_traveler_profiles_phone_unique.sql   ← Initial schema + fixes
  0000_hotels_phase2_persistence.sql            ← Hotel tables
  0001_trip_requests.sql                        ← Trip request table
  0002_agency_disruption_system.sql             ← ⭐ Disruption/prediction tables
  0003_travelers_health.sql                     ← Health reports
  0004_confirmation_alert.sql                   ← Confirmation alert columns
  0005_aircraft_data.sql                        ← Aircraft tail/equipment columns
  0006_test_flight_seeder.sql                   ← Test flight seeder
  0007_user_monitored_flights.sql               ← Consumer flight monitoring table
  0008_resolved_flight_status.sql               ← Resolution tracking columns
  0009_risk_timestamps.sql                      ← Timestamp tracking columns
  meta/
    _journal.json                               ← Drizzle Kit's migration journal
    0000_snapshot.json                           ← Snapshot of schema at migration 0
    0001_snapshot.json                           ← Snapshot of schema at migration 1
```

**Each `.sql` file** is a raw SQL script that adds tables or columns. They're applied in order at server boot via `server/db.ts` → `applyBootMigrations()` function. These are **idempotent** — they use `CREATE TABLE IF NOT EXISTS` so they can run safely multiple times.

**The `meta/` JSON files** are Drizzle Kit internal state — they track what the schema looked like at each migration so Drizzle can detect drift. You don't need to read them.

---

## 8. THE `scripts/` FOLDER — What Are These?

```
scripts/
  backfill-call-summaries.ts       ← Regenerates Claude AI summaries for old Bland calls
  post-merge.sh                    ← Post-git-merge hook (installs deps, runs migrations)
  test-airport-map.ts              ← Tests airport IATA code lookup
  test-pick-three-offers.ts        ← Tests the "pick best 3 offers" algorithm
  test-voice-pool.ts               ← Tests voice pool selection for Bland AI
```

These are **utility scripts**, not part of the running app. You run them manually with `npx tsx scripts/backfill-call-summaries.ts` for admin tasks.

---

## 9. THE DISRUPTION ENGINE — Every File Explained

All in `/server/lib/disruption/`:

| File | Lines | What It Does |
|------|-------|-------------|
| **`riskScorer.ts`** | 373 | **THE CORE MODEL**. Takes a flight + live data → returns risk score (0-100) and tier (green/amber/red). Combines 10 weighted signals with horizon-aware weighting. This is the "prediction" engine. |
| **`monitor.ts`** | 729 | **THE BACKGROUND LOOP**. Runs every 30 minutes, queries all active monitored flights, calls riskScorer for each, stores results, triggers alerts when tier crosses red or flight is cancelled. Also runs a 6-hour resolution cycle to finalize past flights. |
| **`flightStatus.ts`** | 307 | **LIVE FLIGHT DATA FETCHER**. Calls AeroDataBox API to get current status of a flight. Handles multiple lookup strategies (by flight number, spaced format, FIDS departure lists). Returns status, delays, cancellation flag, tail number. |
| **`weatherSignal.ts`** | 166 | **WEATHER DATA FETCHER**. Calls aviationweather.gov API for METAR data. Translates weather conditions into a riskContribution score (0-25) based on flight category (VFR/MVFR/IFR/LIFR), thunderstorms, freezing conditions. |
| **`historicalOtp.ts`** | 231 | **HISTORICAL PERFORMANCE**. Fetches past 14 days of flight history from AeroDataBox. Computes on-time rate and average delay. Caches results for 6 hours to reduce API calls. |
| **`nasStatus.ts`** | 141 | **FAA AIR TRAFFIC CONTROL STATUS**. Fetches active ground stop/delay programs from FAA's NAS (National Airspace System) status API. Shared cache across all airports, refreshed every 10 minutes. |
| **`carrierHealth.ts`** | 136 | **AIRLINE RELIABILITY**. Looks at recent risk score data from the database for the same carrier. Returns a health score from 1-10, cancellation rate, and average delay. |
| **`alternativeFinder.ts`** | 158 | **ALTERNATIVE FLIGHT SEARCH**. When a flight is flagged as high-risk, searches SerpApi (Google Flights) for alternatives on the same route. Scores each candidate and returns up to 3 lowest-risk options, skipping the exact same flight. |
| **`alertSender.ts`** | 617 | **EMAIL/SMS ALERT ENGINE**. Generates rich HTML emails with disruption reason, risk signals breakdown, and alternative flight cards. Sends to travelers. SMS fallback via Twilio. |
| **`aerodataboxLimiter.ts`** | 27 | **RATE LIMITER**. Ensures minimum 500ms spacing between AeroDataBox API calls to avoid hitting HTTP 429 rate limits. |
| **`testFlightSeeder.ts`** | 246 | **TEST DATA GENERATOR**. Seeds test flights from AeroDataBox departures at 6 major US airports. Runs on startup and daily at 6 AM UTC for demo/testing. |

---

## 10. THE HOTEL PROVIDERS — Every File Explained

All in `/server/lib/hotels/providers/`:

| File | What It Does |
|------|-------------|
| `amadeusHotels.ts` | Searches hotels via **Amadeus** API |
| `duffelStays.ts` | Searches hotels via **Duffel Stays** API (Duffel also does hotels now) |
| `expediaRapid.ts` | Searches hotels via **Expedia Rapid** API |
| `hotelbeds.ts` | Searches hotels via **Hotelbeds** API |
| `ratehawk.ts` | Searches hotels via **RateHawk** API |
| `mock.ts` | **Mock provider** for development/testing (returns fake hotel data) |

These are **admin-only, behind feature flags, Phase 2** — the hotel booking flow is not fully built yet. Currently only accessible via admin test endpoints.

---

## 11. OTHER `server/lib/` FILES — Explained

| File | What It Does |
|------|-------------|
| `bland.ts` | **Bland AI wrapper**. `dispatchCall()` — initiates AI voice calls. `buildBlandCallConfig()` — constructs the call configuration (voice, prompt, webhook, dynamic data). `listCalls()` — fetches call history. `buildTravelConciergePrompt()` — builds the AI agent's conversation script. |
| `callSummary.ts` | **Claude AI call summarizer**. After a Bland call completes, sends the transcript to Claude Sonnet 4.5 to generate a one-line summary + structured data (route, dates, passengers, budget, preferences). Stored on the bland_calls record. |
| `redact.ts` | **PII redaction**. Masks emails, phone numbers, names, passport numbers, tokens, transcripts in log output so no PII leaks to logs. |
| `rateLimit.ts` | **Rate limiting config**. Uses `express-rate-limit` to prevent abuse on auth endpoints, callback requests, guest bookings, contact form, and general API. Configurable via env vars. |
| `sms.ts` | **Twilio SMS sender**. Sends SMS messages, gated behind `SMS_ENABLED` flag. Has dry-run mode. Never throws — SMS failure doesn't block email/proposal flow. |
| `smsTemplates.ts` | SMS message text templates. |
| `emailTemplates.ts` | SendGrid HTML email templates. |
| `phone.ts` | Phone number formatting/normalization (converts to E.164 international format). |
| `stripeClient.ts` | **Stripe integration**. Creates payment intents, confirms bookings, syncs with Stripe. **DO NOT MODIFY** per project instructions. |
| `proposalEmailPersonalizer.ts` | Uses LLM to personalize proposal email content. |
| `isoCountries.ts` | Country code data (server-side). |
| `airportMap.ts` | Airport IATA → timezone mapping (server-side). |
| `passengerForm.ts` | Server-side passenger form validation. |
| `sentry.ts` | Server-side Sentry error monitoring setup. |
| `agencyAuth.ts` | Agency authentication middleware. |

---

## 12. THE RISK SCORER MATH — Deep Explanation

This is the core of your "predictive model." Let me explain it step by step.

### What "Hand-Crafted Heuristic Scoring" Means

It means the developer sat down and **manually assigned point values** to different factors based on their knowledge of aviation. There is no machine learning — no training data, no model fitting, no predictions learned from past data. The math is simple **weighted addition**.

### Step 1: Gather Raw Signals

For each flight, the engine collects data from 5 external APIs simultaneously (in parallel):

```
Promise.all([
  getFlightStatus(...),     → AeroDataBox API
  getAirportWeather(...),   → aviationweather.gov
  getAirportWeather(...),   → (destination)
  getNasStatus(...),        → FAA NAS API
  getNasStatus(...),        → (destination)
  getCarrierHealth(...),    → From database
])
```

### Step 2: Convert Each Signal to Points (Raw Scores)

Each signal has a function that converts raw data into 0-to-max points:

| Signal | Function | Max Pts | How Points Are Calculated |
|--------|----------|---------|--------------------------|
| **Inbound Aircraft Delay** | `inboundDelayRaw()` | 40 | 0 min delay = 0pts, 1-15min = 8pts, 16-30min = 16pts, 31-60min = 28pts, 60+ min = 40pts. If cancelled = 40pts. |
| **ATC Ground Stop** | `atcGroundStopRaw()` | 20 | Has ground stop = 20pts. No = 0pts. |
| **ATC Ground Delay** | `atcGroundDelayRaw()` | 15 | No delay = 0pts. 15min avg = 5pts. 30min = 10pts. 60min+ = 15pts. |
| **Origin Weather** | `originWeatherRaw()` | 20 | Uses `weather.riskContribution` (0-25) capped at 20. |
| **Destination Weather** | `destinationWeatherRaw()` | 15 | Same as origin but at 70% scale, capped at 15. |
| **Carrier Health** | `carrierHealth.healthScore` | 10 | From database: 1 (bad) to 10 (good). These are REVERSED — higher carrier health = higher risk contribution? No wait, let me check... |

Actually, looking at the code more carefully, `carrierHealth.healthScore` is on a scale where 1 = good (reliable) and 10 = bad (unreliable). The `getCarrierHealth()` function in `carrierHealth.ts` returns:
- `healthScore = 1` if cancellation rate is 0% and avg delay < 15min (very reliable)
- `healthScore = 4` for moderate reliability
- `healthScore = 7` for poor reliability
- `healthScore = 10` for very unreliable

So higher healthScore = worse = more risk. This raw value feeds directly into the weighted sum.

| **Historical OTP** | `historicalOtp.riskPoints` | 15 | From the 14-day history. 2pts (90%+ on-time) to 15pts (<50% on-time). |
| **Time of Day** | `timeOfDayRaw()` | 4 | Before 2pm = 0pts. 2-6pm = 1pt. 6-8pm = 2pts. After 8pm = 4pts. Later = riskier. |
| **Day of Week** | `dayOfWeekRaw()` | 4 | Mon=4, Fri=4, Sun=3, Thu=2, Wed=1, Tue=0, Sat=1. |
| **Connection Risk** | `connectionRiskRaw()` | 5 | Before 10am = 0pts. 10am-2pm = 1pt. 2-6pm = 3pts. After 6pm = 5pts. Peak in late afternoon for connecting traffic. |

**Maximum possible raw score**: 40+20+15+20+15+10+15+4+4+5 = **148 points theoretical max** (but capped at 100 later).

### Step 3: Apply Horizon Weights

The system determines the **horizon** (how many hours until departure):
- **Short (≤4 hours)**: `HORIZON_WEIGHTS.short`
- **Medium (4-24 hours)**: `HORIZON_WEIGHTS.medium`  
- **Long (>24 hours)**: `HORIZON_WEIGHTS.long`

Each horizon has a weight multiplier for each signal. For example:

**Short horizon (T-4h)** — live data matters most:
- Inbound delay: ×1.0 (100% of raw points count)
- ATC status: ×1.0
- Weather: ×0.9
- Historical OTP: ×0.3 (barely matters — we can see what's happening NOW)
- Day of week: ×0.5
- Connection risk: ×0.5

**Long horizon (24h+)** — historical patterns dominate:
- Inbound delay: ×0.0 (the plane hasn't even flown yet)
- ATC: ×0.3-0.4 (too far out to predict ATC)
- Historical OTP: ×1.0 (the best predictor far out)
- Day of week: ×1.0
- Connection risk: ×1.0

### Step 4: Calculate Weighted Total

```typescript
let total = Object.values(weightedSignals).reduce((a, b) => a + b, 0);
total = Math.min(100, Math.max(0, total));  // Clamp to 0-100
```

Just adds up all the weighted scores and caps at 100.

### Step 5: Determine Tier

Tier thresholds depend on horizon:

| Horizon | Amber (≥) | Red (≥) |
|---------|-----------|---------|
| Short | 25 | 60 |
| Medium | 22 | 50 |
| Long | 18 | 40 |

The closer to departure, the higher the threshold needed to trigger red. This makes sense — short-term predictions have more reliable data, so you need stronger signals to declare red.

### Step 6: Cancellation Override

If the flight is actually **confirmed cancelled** (from AeroDataBox):
- Score is forced to at least 75 (if it was lower)
- Tier is forced to "red"
- This is a hard override — confirmed cancellation always shows as high-risk

### Step 7: The Loop Runs Again in 30 Minutes

Each cycle, `monitor.ts` re-scores every active flight. As departure approaches, the horizon shifts from long → medium → short, changing which signals dominate. A flight might be green at 48 hours out but turn red 2 hours before departure as live data comes in.

---

## 13. WHERE DOES THE DATA COME FROM? — External APIs Explained

### AeroDataBox
- **URL**: RapidAPI marketplace (rapidapi.com) — `aerodatabox.p.rapidapi.com`
- **API Key**: `AERODATABOX_API_KEY` env var
- **What it provides**: Real-time flight status (delayed, cancelled, en-route, arrived), delay minutes, inbound aircraft delay, tail number, aircraft type, historical on-time performance for past 14 days
- **How it's used**: `flightStatus.ts` and `historicalOtp.ts`
- **Cost**: Paid API via RapidAPI (tiered pricing)

### FAA NAS Status
- **URL**: `nasstatus.faa.gov` — the FAA's National Airspace System status page
- **API Key**: None (free, public data)
- **What it provides**: Active ground stop programs (complete halt of departures to an airport), ground delay programs (metered departures to an airport), average delay minutes
- **How it's used**: `nasStatus.ts`
- **Cost**: Free

### AviationWeather.gov (NOAA)
- **URL**: `aviationweather.gov` — NOAA's weather service
- **API Key**: None (free, public data)
- **What it provides**: METAR weather reports (raw text + parsed data) — visibility, ceiling, wind, thunderstorms, freezing conditions, flight category (VFR/MVFR/IFR/LIFR)
- **How it's used**: `weatherSignal.ts` — fetches METAR for origin and destination airports
- **Cost**: Free

### SerpApi (Google Flights)
- **URL**: `serpapi.com` — scrapes Google Flights search results
- **API Key**: `SERPAPI_API_KEY` env var
- **What it provides**: Alternative flight search results — flight times, prices, stops, carriers
- **How it's used**: `alternativeFinder.ts` — when a monitored flight is disrupted, searches for alternatives
- **Cost**: Paid API (per search credit)

### Duffel API
- **URL**: `api.duffel.com` — travel API for flight search and booking
- **API Key**: `DUFFEL_API_TOKEN` env var
- **What it provides**: Flight offers (pricing, schedules, cabin classes), airport autocomplete, card tokenization, order booking
- **How it's used**: `server/routes.ts` — all flight search and booking functionality
- **Cost**: Paid API (transactional — per booking)

### Bland AI
- **URL**: `api.bland.ai`
- **API Key**: `BLAND_AI_API_KEY` env var
- **What it provides**: Automated AI phone calls — the AI speaks with users naturally, extracts trip info, provides quotes
- **How it's used**: `bland.ts` — dispatching calls, getting transcripts, webhook handling
- **Cost**: Paid API (per call minute)

---

## 14. AUTHENTICATION — How User Login Works

### Password Storage
```typescript
// server/routes.ts
const hashedPassword = await bcrypt.hash(password, 12);  // 12 rounds of bcrypt
```

Passwords are **never stored in plain text**. Bcrypt (12 rounds) is industry-standard.

### Session Management
```typescript
// server/index.ts
app.use(session({
  store: new PgSession({ pool }),  // Sessions stored in PostgreSQL (connect-pg-simple)
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }  // 30 days
}));
```

Sessions are stored in the `sessions` table in PostgreSQL, not in memory. This means sessions survive server restarts.

### Login Flow
1. Frontend sends `POST /api/auth/login` with `{ email, password }`
2. Server looks up user by email in `users` table
3. Compares password with `bcrypt.compare(password, storedHash)`
4. If match, creates a session (sets a cookie)
5. Frontend reads user via `GET /api/auth/user` (which checks the session cookie)

### CSRF Protection
The app uses "double-submit cookie" pattern. Every mutating request (POST/PUT/DELETE) includes a `X-CSRF-Token` header that must match a cookie set by the server. This prevents cross-site request forgery attacks.

### Agency Authentication
Separate from user auth. Agencies have their own login via `/api/agency/auth/login`. They use the same session mechanism but a separate `agency_accounts` table.

---

## 15. THE `shared/schema.ts` FILE — Complete Breakdown

This is the **single most important file** in the project. Every table, every relationship, every TypeScript type is defined here.

### How Drizzle Schema Works

```typescript
// 1. Import Drizzle helpers
import { pgTable, text, varchar, boolean, timestamp, serial, numeric, real, jsonb, index, integer } from "drizzle-orm/pg-core";

// 2. Define a table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  // ...
});

// 3. Define relationships (optional, for joins)
export const usersRelations = relations(users, ({ many, one }) => ({
  travelerProfile: one(travelerProfiles, { fields: [users.id], references: [travelerProfiles.userId] }),
  callRequests: many(callRequests),
  proposals: many(itineraryProposals),
  payments: many(payments),
}));

// 4. Define Zod validation schemas (for API input)
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true /* ... */ });

// 5. Export TypeScript types
export type User = typeof users.$inferSelect;       // Reading from DB
export type InsertUser = z.infer<typeof insertUserSchema>;  // Writing to DB
```

### All Tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `system_settings` | Key-value config storage | key, value |
| `promo_codes` | Discount codes | code, overrideAmountCents, maxUses |
| `users` | User accounts | email, password (hashed), firstName, lastName, emailVerified |
| `sessions` | Session store (connect-pg-simple) | sid, sess (jsonb), expire |
| `traveler_profiles` | Traveler identity info | name, phone, passportNumber, dateOfBirth, seatPreference |
| `saved_cards` | Saved payment cards | cardBrand, lastFour, expiryMonth/Year |
| `call_requests` | Concierge call requests | tripType, destination, phone, dateFrom, dateTo, status |
| `bland_calls` | Bland AI call records | blandCallId, phoneNumber, status, transcript, summary |
| `callback_requests` | Public callback form submissions | name, phone, email, status |
| `phone_email_map` | Phone → email lookup | phone (unique), email |
| `itinerary_proposals` | Flight proposals | title, summary, totalEstimate, status |
| `proposal_items` | Line items within proposals | type (flight/hotel/other), description, priceEstimate, duffelOfferId |
| `notifications` | User notifications | type, title, body, readAt |
| `payments` | Payment records | stripePaymentIntentId, duffelOrderId, amount, status |
| `trip_requests` | Cancel/change/refund requests | type, source, message |
| `calendar_entries` | Travel calendar | entryType, date, label, details (jsonb) |
| `guest_proposals` | Guest booking proposals | token, email, origin/destination, proposalData (jsonb) |
| `hotel_searches` | Hotel search logs | provider, request (jsonb), status |
| `hotel_options` | Hotel search results | name, address, nightlyPrice, totalPrice, amenities |
| `hotel_bookings` | Hotel booking records | provider, confirmationNumber, status, travelerDetails |
| `agency_accounts` | Agency login accounts | name, contactEmail, password, plan |
| `monitored_flights` | ⭐ Flights being monitored | flightNumber, carrier, origin/destination, riskScore, riskTier |
| `flight_travelers` | Travelers on monitored flights | travelerName, email, phone, selectionToken |
| `risk_score_history` | ⭐ Time series of risk scores | score, tier, signals (jsonb) |
| `disruption_alternatives` | Alternative flight offers | flightNumber, price, riskScore, selectionToken |
| `health_reports` | Accuracy reports | precision, recall, avgScoreDisrupted, claudeSummary |
| `user_monitored_flights` | Consumer flight monitoring (separate from agency) | flightNumber, carrier, riskScore, flightStatus (jsonb) |

### The `signals` JSONB Column — What's Inside

The `risk_score_history.signals` column stores a JSON blob with the full breakdown of why a score was what it was:

```json
{
  "signals": {
    "inboundAircraftDelay": 28,
    "atcGroundStop": 0,
    "atcGroundDelay": 0,
    "originWeather": 5,
    "destinationWeather": 3,
    "carrierHealth": 7,
    "historicalOtp": 10,
    "timeOfDayRisk": 2,
    "dayOfWeekRisk": 4,
    "connectionRisk": 3,
    "historicalRisk": 10,
    "horizon": "medium",
    "hoursUntilDeparture": 6.5,
    "historicalOtpSampleSize": 12,
    "historicalOtpSource": "aerodatabox"
  },
  "cancelled": false,
  "horizon": "medium",
  "nasOrigin": { "hasGroundStop": false, "hasGroundDelay": false, "avgDelayMinutes": 0 },
  "nasDestination": { ... },
  "carrierHealth": { "cancellationRate24h": 0.02, "avgDelay24h": 12, "healthScore": 4 },
  "originWeather": { "flightCategory": "VFR", "hasThunderstorm": false },
  "flightStatus": { "status": "Scheduled", "delayMinutes": 0 }
}
```

---

## 16. ERRORS IN THE CODE — Would This Even Run?

**Yes, it would run.** The "red lines" you see are most likely:

1. **Missing node_modules** (most common) — TypeScript can't find `@duffel/api`, `@sendgrid/mail`, etc. Run `npm install` to fix.

2. **Missing env vars** — The code checks for these at runtime. Missing ones log warnings but don't crash (mostly). The app gracefully degrades:
   - No `DUFFEL_API_TOKEN` → flight search disabled
   - No `BLAND_AI_API_KEY` → AI calls disabled
   - No `ANTHROPIC_API_KEY` → call summaries fall back to raw transcript
   - No `SENDGRID_API_KEY` → emails disabled
   - No `DATABASE_URL` → **app crashes** (essential)

3. **TypeScript strict mode** — The project has `"strict": true`. Some type narrowing might produce squiggles in the editor but compile fine.

4. **The `server/storage.ts` file doesn't include agency disruption methods** — The agency disruption code queries the database directly using Drizzle in `server/routes.ts` rather than going through `DatabaseStorage`. This is fine architecturally but means the storage layer is incomplete/split.

---

## 17. WHICH FILES TO READ DEEPLY — Priority List

### MUST READ (to understand the project):

1. **`shared/schema.ts`** — Read until you understand every table. This IS the project's data model.
2. **`server/routes.ts`** — Thick file. Read the route handler function names to understand what the API does.
3. **`server/lib/disruption/riskScorer.ts`** — The prediction model. Focus on the raw signal functions and horizon weights.
4. **`server/lib/disruption/monitor.ts`** — How the monitoring loop works.
5. **`server/lib/bland.ts`** — The AI voice concierge. Read the prompt builder.
6. **`server/index.ts`** — Server bootstrap.
7. **`client/src/App.tsx`** — All routes and app structure.
8. **`server/storage.ts`** — All database queries.
9. **`client/src/lib/auth.tsx`** — Auth context.
10. **`server/db.ts`** — Database connection.

### SHOULD READ (important context):

1. **`client/src/pages/landing.tsx`** — The public face.
2. **`client/src/pages/dashboard.tsx`** — The user's home.
3. **`client/src/pages/agency/dashboard.tsx`** — Agency operations hub.
4. **`client/src/pages/disruption/selection.tsx`** — What travelers see when disrupted.
5. **`server/lib/disruption/alertSender.ts`** — How alerts work.
6. **`server/lib/disruption/flightStatus.ts`** — How flight data is fetched.
7. **`server/lib/disruption/weatherSignal.ts`** — How weather is scored.

### CAN SKIP (read when relevant):

1. `client/src/components/ui/` — All 47 shadcn UI components (standard library, read only if modifying UI)
2. `server/lib/hotels/` — Hotel search (Phase 2, admin-only)
3. `scripts/` — Utility scripts
4. `migrations/` — SQL files (apply themselves at boot)
5. `client/src/lib/airports.ts` — Just data
6. `client/src/lib/countries.ts` — Just data
7. The nested `Travnr-Environment-Setup/` folder — Stale copy

### IGNORE:

- `.claude/` — Claude Code session history
- `.local/` — Replit internal state
- `.agents/` — Agent metadata
- `.config/` — Empty directories
- `dist/` — Build output
- `screenshots/` — Screenshots
- `attached_assets/` — Uploaded files
- `node_modules/` — Dependencies (gitignored anyway)
- `zipFile.zip` — Compressed archive
- `package-lock.json` — Auto-generated

---

## 18. ONE-PARAGRAPH SUMMARY OF THE ENTIRE PROJECT

Travnr is an **AI travel concierge web app** where users sign up, get automated AI phone calls (Bland AI) that chat with them about trip preferences, receive flight proposals (generated from Duffel API), and book flights with card payments (Stripe). Separately, travel **agencies** can log in, add their clients' flights to a monitoring dashboard, and get automatically alerted via email/SMS when the flight shows signs of potential disruption — using a heuristic risk scorer that combines live AeroDataBox status, FAA air traffic control data, weather (NOAA), carrier reliability, and historical on-time performance. The prediction model is NOT machine learning — it's a weighted points system where each signal contributes 0-40 points, adjusted by how close the flight is to departure, summed to a 0-100 risk score. The entire app runs on Node.js/Express with a PostgreSQL database, hosted on Replit, and was built with heavy assistance from Claude Code (an AI coding tool), which is why all the `.claude/` and `.local/` folders with session history and skill templates are scattered throughout.
