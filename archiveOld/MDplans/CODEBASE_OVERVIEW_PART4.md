# Travnr Codebase Analysis — Part 4: Deep Answers to Remaining Questions

This document answers every remaining question from Part 3 feedback. It covers data security, every risk signal with its exact formula and weight, the health report system, the Bland AI end-to-end flow, Claude's role, agency vs individual traveler model, API costs, ML feasibility, and much more.

---

## Table of Contents

1. [Data Security — Is Passenger Data Safe?](#1-data-security--is-passenger-data-safe)
2. [passenger-form.ts — Utility Module vs React Component](#2-passenger-formts--utility-module-vs-react-component)
3. [AeroDataBox API Call — Where Is It?](#3-aerodatabox-api-call--where-is-it)
4. [Risk Score Formula — Every Signal, Weight, and Horizon Explained](#4-risk-score-formula--every-signal-weight-and-horizon-explained)
5. [Health Reports — Table, Code, TP/FP/FN/TN, Claude Summary](#5-health-reports--table-code-tpfp-fntn-claude-summary)
6. [Risk Score History — Where Training Data Is Stored](#6-risk-score-history--where-training-data-is-stored)
7. [Features vs Outcomes — How Predictions Are Measured](#7-features-vs-outcomes--how-predictions-are-measured)
8. [Non-Linear Interactions Explained](#8-non-linear-interactions-explained)
9. [Testing Accuracy Without Wasting Resources](#9-testing-accuracy-without-wasting-resources)
10. [ML Training — GPU Costs, Replit, Colab, and Realistic Path](#10-ml-training--gpu-costs-replit-colab-and-realistic-path)
11. [Reducing API Calls — Current vs Optimized](#11-reducing-api-calls--current-vs-optimized)
12. [Human Disruption Data — Aviation-Edge and Security Incidents](#12-human-disruption-data--aviation-edge-and-security-incidents)
13. [Agency vs Individual Traveler — The Business Model](#13-agency-vs-individual-traveler--the-business-model)
14. [Total Cost Analysis — APIs + GPU + Hosting](#14-total-cost-analysis--apis--gpu--hosting)
15. [Complete Disruption Factors — All 20 Data Points](#15-complete-disruption-factors--all-20-data-points)
16. [Travnr vs FlightAware — Key Differences](#16-travnr-vs-flightaware--key-differences)
17. [Bland AI — Complete End-to-End Deep Flow with Code](#17-bland-ai--complete-end-to-end-deep-flow-with-code)
18. [Claude's Role — What It Does vs Bland vs Deterministic Code](#18-claudes-role--what-it-does-vs-bland-vs-deterministic-code)
19. [Deterministic Function vs AI Agent — The Alternative Search](#19-deterministic-function-vs-ai-agent--the-alternative-search)
20. [Webhook Flow — How the Call Ends and Data is Processed](#20-webhook-flow--how-the-call-ends-and-data-is-processed)

---

## 1. Data Security — Is Passenger Data Safe?

### Current Security Measures

| Layer | What Travnr Does |
|-------|------------------|
| **Transport** | All traffic goes over HTTPS (TLS). Express.js sessions use `secure: true` in production. |
| **Password storage** | bcrypt hashing (salted, one-way) — `server/routes.ts` line ~1440: `hash(password, 10)` |
| **Session auth** | `express-session` with `connect-pg-simple` (PostgreSQL-backed sessions). Session ID stored in an httpOnly cookie. |
| **CSRF** | Double-submit cookie pattern in `queryClient.ts` — every fetch sends `X-CSRF-Token` header matched against a server-set cookie. |
| **API auth** | All sensitive routes check `isAuthenticated` or `isAgencyAuthenticated` middleware which validates `req.session.userId`. |
| **Bland webhook auth** | `x-bland-secret` HMAC-signed header verified on every webhook call. |
| **Database** | PostgreSQL 16 on Replit — no encryption at rest (Replit does not offer this). No column-level encryption for PII. |

### What Is NOT Encrypted (Risks)

- **Passport numbers, emails, phone numbers** — stored as plaintext in PostgreSQL columns (`travelerEmail`, `travelerPhone`, passport data in `users` table).
- **Database at rest** — Replit does not provide encrypted storage volumes.
- **No PII minimization** — passport details are stored even after the booking is complete (no auto-purge).

### The passenger-form.ts Concern

> "This is React TS handling sensitive data like passport and saving it in PostgreSQL... but this is being entered on the browser client side... this is not safe"

You are correct that data is **entered on the browser client side** — that's how every web app works. The flow is:

```
Browser (React form) → HTTPS POST → Express server → PostgreSQL
```

The sensitive data is **in transit** (HTTPS encrypted) and **at rest** (plaintext in DB). The weak point is the database at rest. Standard mitigations would be:

1. **Column-level encryption** — encrypt passport fields with AES-256 using a server-side key before storing.
2. **Auto-purge** — delete passport data 30 days after the flight.
3. **PCI compliance** — if accepting credit cards directly (Travnr uses Stripe, so card data never touches Travnr's server — Stripe handles it).

For a production launch, column-level encryption for passport fields would be recommended. The Travnr codebase currently does **not** implement this.

---

## 2. passenger-form.ts — Utility Module vs React Component

> "You're saying it's not a React component it's a utility module, I don't get it"

This file is **not a React component** — it does not return JSX. It is a **TypeScript module** (a `.ts` file, not `.tsx`) that exports:

| Export | What it is |
|--------|-----------|
| `PassengerForm` | A TypeScript **type/interface** — defines the shape of form data |
| `PassengerErrors` | Another TypeScript type for validation error shapes |
| `composeBornOn()` | A pure function that converts 3 dropdown values (month/day/year) → "YYYY-MM-DD" |
| `isValidBornOn()` | Pure function that validates the date is real and in the past |
| `decomposeBornOn()` | Pure function that splits "YYYY-MM-DD" back into 3 values |
| `validatePassenger()` | Pure function that checks all fields, returns `PassengerErrors` |
| `serializePassenger()` | Pure function that formats the data for the API call |
| `MONTHS`, `DAYS`, `YEARS` | Constant arrays for `<select>` dropdown options |
| `emptyPassenger()` | Factory function returning a blank `PassengerForm` |

### How It's Used

The **React components** that render the form UI are in the page files. They import `validatePassenger` and `serializePassenger` from this module. For example:

```typescript
// In some React component file (e.g., CheckoutPage.tsx)
import { validatePassenger, serializePassenger } from "../lib/passenger-form";

function BookingForm() {
  const [form, setForm] = useState<PassengerForm>(emptyPassenger());

  function handleSubmit() {
    const errors = validatePassenger(form, true);  // ← calls the utility
    if (Object.keys(errors).length > 0) return;
    const payload = serializePassenger(form);       // ← calls the utility
    fetch("/api/book", { method: "POST", body: JSON.stringify(payload) });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* JSX for the actual form inputs lives here, not in passenger-form.ts */}
    </form>
  );
}
```

**Why separate the logic from the component?** So that:
1. The same validation/serialization can be used by **multiple** React components (guest booking page AND authenticated checkout).
2. The logic can be unit-tested without mounting React.
3. The server-side code could also import and reuse the same validators.

---

## 3. AeroDataBox API Call — Where Is It?

AeroDataBox is called from **two files** in `server/lib/disruption/`:

### File 1: `flightStatus.ts` (live flight data)

Lines 110-140: `fetchFlightsByNumber()`:
```typescript
const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${date}`;
const resp = await aerodataboxFetch(url, {
  headers: {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
  },
});
```

The function has **3 fallback strategies**:
1. **Compact form** (e.g., `AA4551`) — primary lookup
2. **Spaced form** (e.g., `AA 4551`) — fallback for codeshares
3. **FIDS departure list** — last resort, fetches ALL departures from the origin airport for the day and searches for the flight number in the list

### File 2: `historicalOtp.ts` (historical on-time performance)

Lines 108-110:
```typescript
const url = `https://aerodatabox.p.rapidapi.com/flights/number/${normalized}/history/recent`;
const resp = await aerodataboxFetch(url, {
  headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "aerodatabox.p.rapidapi.com" },
});
```

### Rate Limiting

All AeroDataBox calls go through `aerodataboxLimiter.ts` which enforces a **minimum 500ms gap** between calls via a promise chain:

```typescript
const MIN_INTERVAL_MS = 500;
// ...queues each request so they never overlap within 500ms
```

This prevents HTTP 429 (rate limit exceeded) from RapidAPI.

---

## 4. Risk Score Formula — Every Signal, Weight, and Horizon Explained

### The Complete Math

```
Total Score = SUM(weightedSignal₁ ... weightedSignal₁₀)
Clamped = Math.min(100, Math.max(0, Total))

Tier:
  Short horizon:  green < 25, amber 25-59, red ≥ 60
  Medium horizon: green < 22, amber 22-49, red ≥ 50
  Long horizon:   green < 18, amber 18-39, red ≥ 40

Cancellation override: score = max(score, 75), tier = red
```

### What Is "Horizon"?

Horizon is how many hours until the flight departs. It controls **which signals matter most**:

| Horizon | Time Window | Meaning |
|---------|------------|---------|
| **Short** | ≤ 4 hours | Flight is about to leave. Real-time data (inbound aircraft, ATC, weather) is very reliable. Historical patterns barely matter. |
| **Medium** | 4-24 hours | Mix of real-time and historical. Both matter. |
| **Long** | > 24 hours | Future flight. Historical patterns (day of week, airline track record) dominate. Live data is speculative. |

### Horizon Weight Tables

Weights are multipliers applied to raw signal points:

| Signal | Short | Medium | Long | Why |
|--------|-------|--------|------|-----|
| `inboundAircraftDelay` | **1.0** | 0.6 | **0.0** | Inbound delay only matters when the plane should already be in the air (short). For future flights, no inbound exists yet. |
| `atcGroundStop` | **1.0** | 0.9 | 0.3 | ATC issues matter now and soon. Far-future ATC is unpredictable. |
| `atcGroundDelay` | **1.0** | 0.9 | 0.4 | Same logic as ground stop. |
| `originWeather` | **0.9** | 0.7 | 0.4 | Weather forecasts are reliable 4h out, less so 24h+, and unreliable days ahead. |
| `destinationWeather` | **0.8** | 0.6 | 0.3 | Destination weather matters slightly less than origin. |
| `carrierHealth` | **1.0** | **1.0** | **1.0** | Always matters — an airline's operational record is consistent regardless of horizon. |
| `historicalOtp` | **0.3** | 0.6 | **1.0** | Historical data barely matters when we have live data (short). It's ALL we have at long range. |
| `timeOfDayRisk` | **1.0** | 0.8 | 0.6 | Time-of-day patterns matter most at short range when the specific flight time is confirmed. |
| `dayOfWeekRisk` | **0.5** | 0.8 | **1.0** | Day-of-week patterns matter most far in advance (schedule planning). |
| `connectionRisk` | **0.5** | 0.8 | **1.0** | Late-day flights have higher ripple risk — matters more at long range. |

### Signal 1: `inboundAircraftDelay` (0-40 raw points)

Measures whether the **same aircraft** arriving on its previous leg is late (which cascades to this flight).

```typescript
function inboundDelayRaw(delayMinutes, cancelled):
  if cancelled → 40 points
  if ≤ 0 min  → 0
  if ≤ 15 min → 8
  if ≤ 30 min → 16
  if ≤ 60 min → 28
  > 60 min    → 40
```

**Source**: AeroDataBox live status — reads `arrival.delay.arrival` on the same tail number's previous flight.

### Signal 2: `atcGroundStop` (0 or 20 raw points)

Is the FAA enforcing a **ground stop** at origin or destination?

```typescript
function atcGroundStopRaw(nas):
  if nas.hasGroundStop → 20
  else → 0
```

**Source**: `nasstatus.faa.gov` — FAA's National Airspace System status API (free).

### Signal 3: `atcGroundDelay` (0-15 raw points)

Is the FAA enforcing a **Ground Delay Program (GDP)**?

```typescript
function atcGroundDelayRaw(nas):
  if !nas.hasGroundDelay → 0
  if avgDelay ≥ 60 min → 15
  if avgDelay ≥ 30 min → 10
  if avgDelay ≥ 15 min → 7
  else → 5
```

**Source**: Same FAA API as ground stop. Both origin AND destination ATC are checked, then collapsed to the worst case.

### Signal 4: `originWeather` (0-20 raw points, capped)

```typescript
function originWeatherRaw(weather):
  return Math.min(20, Math.max(0, weather.riskContribution))
```

The `riskContribution` is computed from **METAR weather data** from `aviationweather.gov` (free NOAA API):

| Condition | Points |
|-----------|--------|
| Flight category VFR | 2 |
| Flight category MVFR | 10 |
| Flight category IFR | 18 |
| Flight category LIFR | 25 |
| Thunderstorm present | +10 |
| Freezing conditions | +5 |
| Gust ≥ 25 kt OR wind ≥ 30 kt | +3 |
| **Clamped to max** | **25** |

Then `originWeatherRaw` caps it at 20.

**Source**: `aviationweather.gov/api/data/metar?ids=KJFK&format=json` — free NOAA weather data.

### Signal 5: `destinationWeather` (0-15 raw points)

Same as origin weather but multiplied by **0.7** and capped at 15:

```typescript
function destinationWeatherRaw(weather):
  return Math.min(15, Math.max(0, weather.riskContribution * 0.7))
```

Destination weather matters **less** than origin weather because:
- Arrival delays are bufferable (planes can hold in the air)
- Departure delays directly push back the schedule
- Passengers are more affected by origin delays (they're stuck at the gate)

### Signal 6: `carrierHealth` (1, 3, 4, 7, or 10 raw points)

Measures the airline's performance over the last 24 hours using **self-reported data** from the Travnr database:

| Condition | healthScore |
|-----------|------------|
| Sample < 3 flights | 3 (unreliable — fallback) |
| Cancel rate > 15% OR avg delay > 60 min | 10 |
| Cancel rate > 8% OR avg delay > 30 min | 7 |
| Cancel rate > 3% OR avg delay > 15 min | 4 |
| Otherwise | 1 |

**Source**: Travnr's own `risk_score_history` table (NOT an external API). It queries the last 24h of scores for the same airline code across all monitored flights.

### Signal 7: `historicalOtp` (2, 5, 6, 10, or 15 raw points)

Based on the flight number's historical on-time performance from AeroDataBox:

| Condition | riskPoints |
|-----------|-----------|
| Sample < 3 flights | 5 (unreliable) |
| On-time rate ≥ 85% | 2 |
| On-time rate ≥ 70% | 6 |
| On-time rate ≥ 55% | 10 |
| On-time rate < 55% | 15 |

**Source**: `AeroDataBox /flights/number/{flight}/history/recent` — looks at the last ~14 days of this flight number. Cached for 6 hours.

### Signal 8: `timeOfDayRisk` (0-4 raw points)

Flights later in the day accumulate delay from earlier system-wide congestion:

```typescript
function timeOfDayRaw(departureTime):
  if no time → 1
  if hour < 14 → 0   (morning - least delayed)
  if hour < 18 → 1   (early afternoon)
  if hour < 20 → 2   (late afternoon)
  else → 4            (evening - most delayed)
```

### Signal 9: `dayOfWeekRisk` (0-4 raw points)

Different days of the week have different systemic delay risk:

```typescript
function dayOfWeekRaw(departureDate):
  pts = { 1: 4, 5: 4, 0: 3, 4: 2, 3: 1, 2: 0, 6: 1 }
  //          Mon  Fri  Sun  Thu  Wed  Tue  Sat
```

| Day | Points | Why |
|-----|--------|-----|
| Monday | 4 | High business travel + weekend ripple |
| Tuesday | 0 | Lowest travel volume |
| Wednesday | 1 | Moderate |
| Thursday | 2 | Building toward weekend |
| Friday | 4 | Peak congestion (highest travel day) |
| Saturday | 1 | Low business travel |
| Sunday | 3 | Weekend return travel |

### Signal 10: `connectionRisk` (0-5 raw points)

Later departures face more accumulated system risk:

```typescript
function connectionRiskRaw(departureTime):
  if no time → 2
  if hour < 10 → 0
  if hour < 14 → 1
  if hour < 18 → 3
  else → 5
```

This is similar to `timeOfDayRisk` but with a wider range (0-5 vs 0-4) because it specifically models the risk of **connecting flights** — a late-day departure is more likely to involve passengers arriving on delayed inbound connections.

### Worked Example: Full Score Computation

Let's compute a real example for flight `AA100 JFK→LAX departing 2026-07-15 at 18:30` (3 hours from now = short horizon):

**Raw signals:**
- Inbound aircraft: 35 min late → 28 points
- ATC ground stop: false → 0 points
- ATC ground delay: true, 20 min avg → 7 points
- Origin weather: IFR + thunderstorm → 18 + 10 = 28, capped at 25 → originWeatherRaw caps at 20
- Destination weather: VFR → 2 × 0.7 = 1.4, capped at 15 → 1 point
- Carrier health: AA has 12% cancel rate → 7 points
- Historical OTP: 78% on-time → 6 points
- Time of day: 18:30 → 2 points
- Day of week: Wednesday → 1 point
- Connection risk: 18:30 → 3 points

**Apply short-horizon weights:**
- inboundAircraftDelay: 28 × 1.0 = 28
- atcGroundStop: 0 × 1.0 = 0
- atcGroundDelay: 7 × 1.0 = 7
- originWeather: 20 × 0.9 = 18
- destinationWeather: 1 × 0.8 = 0 (rounded)
- carrierHealth: 7 × 1.0 = 7
- historicalOtp: 6 × 0.3 = 1 (rounded)
- timeOfDayRisk: 2 × 1.0 = 2
- dayOfWeekRisk: 1 × 0.5 = 0 (rounded)
- connectionRisk: 3 × 0.5 = 1 (rounded)

**Total:** 28 + 0 + 7 + 18 + 0 + 7 + 1 + 2 + 0 + 1 = **64**

**Short horizon thresholds:** amber ≥ 25, red ≥ 60 → **RED tier**

---

## 5. Health Reports — Table, Code, TP/FP/FN/TN, Claude Summary

### The Database Table

The `health_reports` table is defined in `shared/schema.ts:599-615`:

```typescript
export const healthReports = pgTable("health_reports", {
  id: serial("id").primaryKey(),
  generatedAt: timestamp("generated_at").defaultNow(),
  flightsAnalyzed: integer("flights_analyzed"),
  flightsFlagged: integer("flights_flagged"),
  truePositives: integer("true_positives"),
  falsePositives: integer("false_positives"),
  falseNegatives: integer("false_negatives"),
  trueNegatives: integer("true_negatives"),
  precision: real("precision"),
  recall: real("recall"),
  avgScoreDisrupted: real("avg_score_disrupted"),
  avgScoreOnTime: real("avg_score_on_time"),
  claudeSummary: text("claude_summary"),
  rawData: jsonb("raw_data"),
  requestedByAgencyId: integer("requested_by_agency_id"),
});
```

### How It Works (Code in `routes.ts:10606-10947`)

The health report is **agency-only** (not for individual users). It is generated on-demand via:

```
POST /api/agency/health-report   (triggered by agency dashboard button)
GET  /api/agency/health-report/latest   (get most recent report)
```

**Step-by-step logic:**

1. **Query past flights** — finds all monitored flights for this agency with `departureDate < today` (past flights).

2. **For each flight, find the peak risk score** — queries `risk_score_history` for the highest score ever recorded for that flight.

3. **Get the actual outcome** — uses `resolvedStatus` (set by the resolution cycle) or falls back to a live AeroDataBox call to determine what actually happened.

4. **Classify each flight** using a **60-point threshold** (red tier = ≥ 60):

   | Condition | Classification |
   |-----------|---------------|
   | Score ≥ 60 AND actually disrupted (delayed ≥ 30min or cancelled) | **True Positive** ✅ |
   | Score ≥ 60 AND not disrupted | **False Positive** ❌ |
   | Score < 60 AND actually disrupted | **False Negative** ❌ |
   | Score < 60 AND not disrupted | **True Negative** ✅ |

5. **Compute statistics:**
   - `precision = TP / (TP + FP)` — "When we said red, how often were we right?"
   - `recall = TP / (TP + FN)` — "Of all actual disruptions, how many did we catch?"

6. **Send to Claude** — the raw data is formatted into a prompt asking Claude to write a plain-English analysis. The prompt includes per-flight breakdowns, precision/recall numbers, and current high-risk flights.

7. **Store the report** — saves everything to `health_reports` table so the agency can view it later.

### Is the Health Report Only for Agencies?

**Yes.** The health report endpoint is gated by `isAgencyAuthenticated` middleware. Individual users (`userMonitoredFlights`) do **not** have a health report feature. They get individual flight alerts via email instead.

### Is There Positive/Negative?

Yes — the four classifications (TP/FP/FN/TN) are standard **binary classification metrics**:
- **Positive** = system predicted disruption (score ≥ 60, red tier)
- **Negative** = system predicted no disruption (score < 60)
- **True** = prediction matched reality
- **False** = prediction did not match reality

### Where is the Health Report UI?

The health report is part of the agency dashboard. The API endpoint exists at `routes.ts:10606`, and the agency dashboard's "Health" tab calls these endpoints. The agency dashboard React component is at `client/src/pages/agency/dashboard.tsx` (~1616 lines).

---

## 6. Risk Score History — Where Training Data Is Stored

### The `risk_score_history` Table

Defined in `shared/schema.ts:617-628`:

```typescript
export const riskScoreHistory = pgTable("risk_score_history", {
  id: serial("id").primaryKey(),
  monitoredFlightId: integer("monitored_flight_id").notNull(),
  score: integer("score").notNull(),         // 0-100
  tier: text("tier").notNull(),              // green/amber/red
  signals: jsonb("signals").notNull(),       // ALL raw signal data
  tailNumber: text("tail_number"),
  equipmentType: text("equipment_type"),
  scoredAt: timestamp("scored_at").defaultNow().notNull(),
});
```

### What Gets Stored in the `signals` JSONB Column

Every 30-minute monitoring cycle stores a complete snapshot. The signals JSONB includes:

```json
{
  "signals": {
    "inboundAircraftDelay": 28,
    "atcGroundStop": 0,
    "atcGroundDelay": 7,
    "originWeather": 18,
    "destinationWeather": 1,
    "carrierHealth": 7,
    "historicalOtp": 1,
    "timeOfDayRisk": 2,
    "dayOfWeekRisk": 0,
    "connectionRisk": 1,
    "historicalRisk": 1,
    "horizon": "short",
    "hoursUntilDeparture": 3.2,
    "historicalOtpSampleSize": 28,
    "historicalOtpSource": "aerodatabox"
  },
  "cancelled": false,
  "horizon": "short",
  "hoursUntilDeparture": 3.2,
  "nasOrigin": {
    "hasGroundStop": false,
    "hasGroundDelay": true,
    "avgDelayMinutes": 20,
    "programs": [...]
  },
  "nasDestination": { ... },
  "carrierHealth": {
    "cancellationRate24h": 0.12,
    "avgDelay24h": 35,
    "sampleSize": 42,
    "healthScore": 7,
    "reliable": true
  },
  "originWeather": {
    "flightCategory": "IFR",
    "hasThunderstorm": true,
    "hasFreezing": false,
    "windSpeedKt": 22,
    "gustSpeedKt": 35,
    "visibilityMiles": 2.5,
    "ceilingFt": 800
  },
  "destinationWeather": { ... },
  "flightStatus": {
    "status": "Scheduled",
    "delayMinutes": 35,
    "inboundDelayMinutes": 35,
    "cancelled": false,
    "departureTime": "2026-07-15T18:30:00Z"
  }
}
```

### How to Query It

```sql
-- View all history for a specific flight
SELECT * FROM risk_score_history 
WHERE monitored_flight_id = 42 
ORDER BY scored_at DESC;

-- Find peak score for each flight
SELECT monitored_flight_id, MAX(score) as peak_score, 
       COUNT(*) as num_cycles
FROM risk_score_history 
GROUP BY monitored_flight_id;

-- Get the last 50 scores across all flights
SELECT * FROM risk_score_history 
ORDER BY scored_at DESC LIMIT 50;
```

### This IS the Training Data

The `risk_score_history` table **is your training dataset**. Each row is one observation with:
- **Features**: all 10 signals (inboundAircraftDelay, atcGroundStop, etc.) plus weather conditions, horizon, time data
- **Actual outcome**: needs to be joined with `monitoredFlights.resolvedStatus` (which is populated by the resolution cycle)

To get a complete labeled dataset for ML training:

```sql
SELECT 
  r.score as predicted_score,
  r.tier as predicted_tier,
  r.signals->'signals'->>'inboundAircraftDelay' as inbound_delay,
  r.signals->'signals'->>'originWeather' as origin_weather,
  r.signals->'signals'->>'carrierHealth' as carrier_health,
  r.signals->'signals'->>'historicalOtp' as historical_otp,
  r.signals->'signals'->>'timeOfDayRisk' as time_of_day,
  r.signals->'signals'->>'dayOfWeekRisk' as day_of_week,
  r.signals->'signals'->>'horizon' as horizon,
  r.signals->'originWeather'->>'flightCategory' as weather_category,
  r.signals->'originWeather'->>'hasThunderstorm' as thunderstorm,
  r.signals->'carrierHealth'->>'cancellationRate24h' as carrier_cancel_rate,
  m.resolvedStatus as actual_outcome,
  m.resolvedDelayMinutes as actual_delay,
  CASE WHEN m.resolvedStatus = 'Cancelled' OR m.resolvedDelayMinutes >= 30 
       THEN 1 ELSE 0 END as actual_disrupted
FROM risk_score_history r
JOIN monitored_flights m ON r.monitored_flight_id = m.id
WHERE m.resolvedStatus IS NOT NULL
  AND m.status IN ('completed', 'cancelled')
ORDER BY r.scored_at DESC;
```

---

## 7. Features vs Outcomes — How Predictions Are Measured

> "I'm confused — how are features and outcomes compared to perfect future predictions?"

### The Current System

The risk scorer **does not learn** from past data. It uses fixed formulas (the 10 signals with hand-tuned weights). Each 30-minute cycle:

1. **Reads current features** — live AeroDataBox status, weather, FAA ATC, carrier health
2. **Computes a score** — using the hardcoded formulas
3. **Stores the score** — in `risk_score_history`
4. **Later, after the flight departs** — the resolution cycle runs every 6 hours and updates `monitoredFlights.resolvedStatus` with what actually happened

### How to Compare Prediction vs Reality

The health report (`routes.ts:10622`) does exactly this comparison:

```typescript
const disrupted = actualCancelled || actualDelay >= 30;

if (peakScore >= 60 && disrupted) classification = "true_positive";
if (peakScore >= 60 && !disrupted) classification = "false_positive";
if (peakScore < 60 && disrupted) classification = "false_negative";
if (peakScore < 60 && !disrupted) classification = "true_negative";
```

The comparison is: **"Did the system ever predict red (score ≥ 60) at any point during monitoring? And did the flight actually end up disrupted (cancelled or ≥30min late)?"**

### What "Perfect" Would Look Like

Perfect prediction means:
- Every flight that ends up cancelled/delayed → **red tier before departure** (true positive)
- Every flight that departs on time → **green tier throughout** (true negative)

### How Much Data Exists

With 100 users and 50 monitored flights per day, each flight generates ~48 score entries per day (30-min cycles × 24 hours), so roughly **2,400 data points per day**. Over one month, that's ~72,000 labeled examples. This would be enough to train a simple ML model (see section 10).

---

## 8. Non-Linear Interactions Explained

> "What do you mean by non-linear interactions?"

### Linear vs Non-Linear

**Linear**: The effect of each signal is independent. You just add them up:
```
Score = (delay × 1.0) + (weather × 0.9) + (carrier × 1.0) + ...
```
This is what Travnr does now. The interaction between signals is **zero** — thunderstorm + Monday morning = thunderstorm points + Monday points, no extra multiplier for the combination.

**Non-linear**: The combined effect is different from the sum of individual effects. For example:

```
True disruption risk = (delay × 1.0) + (weather × 0.9) 
                       + (delay × weather × 2.0)    ← interaction term
```

This captures that **a delay + bad weather together** is much worse than the sum of each alone (because the plane can't make up time in bad weather).

### Real Examples of Non-Linear Interactions in Aviation

| Signal A | Signal B | Linear Sum | Real-World Risk | Why |
|----------|----------|------------|-----------------|-----|
| Inbound late (35 min) | Destination thunderstorm | Medium | **Very High** | Can't speed up to make up time if destination is in a hold pattern |
| Friday evening | Major airport (JFK) | Medium | **High** | Friday + JFK = compounding congestion (not just additive) |
| Carrier cancel rate 15% | Historical OTP 50% | Medium | **High** | Both signals point to the same systemic issue — they reinforce each other |
| ATC ground delay | Origin LIFR | Medium | **Very High** | Weather causing ATC issues — double-counting the same root cause |

### How ML Handles This

A **decision tree** (XGBoost, Random Forest) automatically discovers non-linear interactions:

```
if weather == "LIFR" AND carrierHealth > 8 AND horizon == "short":
    risk = 85   ← high-risk cluster
elif weather == "LIFR" AND carrierHealth > 8 AND horizon == "long":
    risk = 45   ← same conditions but far out = lower risk
```

The tree learns that the **combination** of LIFR + sick carrier + short horizon is especially dangerous, not just the sum of their individual effects.

### Current System's Limitation

The current formula has **zero non-linear terms**. The only conditional logic is:
- The horizon weight table (which is just per-signal multiplication)
- The cancellation override (forced 75+)

Adding even simple interaction terms like `inboundDelay × weatherPenalty` would improve accuracy. An ML model would discover these automatically.

---

## 9. Testing Accuracy Without Wasting Resources

### Approach: Offline Testing on Historical Data

You do **not** need to burn API credits to test accuracy. The `risk_score_history` table already contains everything you need.

### Step 1: Export the data

```bash
# Connect to the database and export
PGPASSWORD=<password> psql -h <host> -U <user> -d travnr \
  -c "COPY (
    SELECT r.score, r.tier, r.signals, 
           m.resolvedStatus, m.resolvedDelayMinutes
    FROM risk_score_history r
    JOIN monitored_flights m ON r.monitored_flight_id = m.id
    WHERE m.resolvedStatus IS NOT NULL
  ) TO '/tmp/training_data.csv' CSV HEADER;"
```

### Step 2: Write a Python script to compute accuracy metrics

No API calls needed. Just read the CSV:

```python
import csv, json

data = []
with open('/tmp/training_data.csv') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Parse signals from JSON
        signals = json.loads(row['signals'])
        peak_score = max(...)  # or just use the stored score
        actual = row['resolvedstatus']
        delay = int(row['resolveddelayminutes'] or 0)
        disrupted = (actual == 'Cancelled') or (delay >= 30)
        
        predicted_red = (int(row['score']) >= 60)
        
        data.append({
            'predicted': predicted_red,
            'actual': disrupted,
            'score': int(row['score']),
        })

# Compute metrics
tp = sum(1 for d in data if d['predicted'] and d['actual'])
fp = sum(1 for d in data if d['predicted'] and not d['actual'])
fn = sum(1 for d in data if not d['predicted'] and d['actual'])
tn = sum(1 for d in data if not d['predicted'] and not d['actual'])

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall = tp / (tp + fn) if (tp + fn) > 0 else 0
print(f"Precision: {precision:.1%}")
print(f"Recall: {recall:.1%}")
```

### Step 3: Simulate New Weight Configurations

You can test alternative weight formulas **without any external API cost**:

```typescript
// In your test script, just re-run the scoring function locally
// using the SAME cached input data
const testResults = historicalData.map(entry => {
  const newScore = myNewFormula(entry.signals);
  return {
    predicted_red: newScore >= 60,
    actual_disrupted: entry.actual_disrupted,
  };
});
```

The risk scorer (`scoreFlightRisk`) is a **pure function** — given the same inputs, it produces the same outputs. No API calls needed for re-scoring if you cache the raw inputs.

### Step 4: Track Over Time

The health report already does this. Run it weekly to see if precision/recall are improving.

---

## 10. ML Training — GPU Costs, Replit, Colab, and Realistic Path

### How Much Data Do You Need?

| Model Type | Minimum Data | Good Data | Ideal Data |
|-----------|-------------|-----------|------------|
| Simple logistic regression | 200-500 labeled flights | 1,000+ | 5,000+ |
| XGBoost / Random Forest | 500-1,000 | 2,000-5,000 | 10,000+ |
| Neural network | 2,000-5,000 | 10,000+ | 50,000+ |

With 100 users monitoring 50 flights/day, you'd have ~1,500 labeled flights per month (after resolution). This is enough for XGBoost after 2-3 months.

### GPU Cost Options (Ranked Cheapest First)

| Option | Cost | GPU | Ease of Use | Notes |
|--------|------|-----|-------------|-------|
| **Google Colab Free** | **$0** | T4 (16GB) | Easy | Session limit, good for prototyping. 50 flights × 10 signals = trivial data size — this would train in seconds. |
| **Google Colab Pro** | **$10/mo** | V100/T4 | Easy | Longer sessions, better GPU priority. |
| **Lightning.ai** | **$0-8/mo** | T4 | Very Easy | VSCode in browser with GPU. Free tier (CPU only), $8/mo for GPU. |
| **RunPod** | **$0.39/hr** | RTX 4090 | Moderate | Pay by the second. One training run = ~$0.39. |
| **Kaggle** | **$0** | T4 (30hrs/wk) | Easy | Free GPU time. Very good for training. |
| **Modal** | **$0/hobby** | A10G | Moderate | Pay per second only when used. Good middle ground. |

### Recommended Path (Cost-Effective)

1. **Export data** from PostgreSQL to CSV (free)
2. **Upload to Google Colab** (free T4 GPU)
3. **Train XGBoost model** (takes < 1 minute for this data size)
4. **Export model as `model.json`** (XGBoost can export a JSON format)
5. **Load model in TypeScript** using `xgboost-node` or a simple ONNX runtime
6. **Run inference in the server** — no GPU needed for inference (CPU is fine for 10-input predictions)

### Can Travnr Stay on Replit with ML?

**Inference (making predictions)** — YES. XGBoost inference on CPU is trivially fast. You load the model in the Node.js server and call `model.predict(features)`. Replit can handle this with zero changes.

**Training** — NO. You train on Colab (free GPU), then export the model. You never train on Replit.

### ML Integration Code (How It Would Look)

```typescript
// server/lib/ml/predictor.ts
import * as xgboost from 'xgboost';

let model: any = null;

export async function loadModel(): Promise<void> {
  const fs = await import('fs');
  const modelBuffer = fs.readFileSync('./models/disruption_model.json');
  model = await xgboost.XGBRegressor.fromJSON(modelBuffer.toString());
}

export function predictML(features: number[]): number {
  if (!model) return -1; // fallback
  const prediction = model.predict([features]);
  return Math.min(100, Math.max(0, Math.round(prediction[0] * 100)));
}
```

### GPU Cost Summary for Training

```
One-time training (Colab free):          $0.00
Weekly re-training (Colab free):         $0.00
Monthly GPU cloud (Colab Pro):          $10.00
Inference per 50 flights × 48 cycles:   $0.00 (runs on existing Replit CPU)

Total ML cost:                          $0-10/month
```

**Most ML projects at this scale never need to pay for GPU.** The free tiers are sufficient.

---

## 11. Reducing API Calls — Current vs Optimized

### Current Call Count Per 30-Minute Cycle (50 Flights)

| API | Calls per Flight | Total for 50 Flights | Cost/Request | Total Cost/Cycle |
|-----|-----------------|---------------------|-------------|-----------------|
| AeroDataBox (flight status) | 1-3 (due to fallback chain) | 50-150 | $0.003-$0.012 (varies by plan) | ~$0.15-$0.60 |
| AeroDataBox (historical OTP) | 1 (cached, only first cycle) | 0 (after cache populated) | $0.012 | ~$0 (after first cycle) |
| aviationweather.gov (METAR) | 2 (origin + dest) | 100 (50 flights × 2) | Free | $0 |
| nasstatus.faa.gov (FAA ATC) | 2 (origin + dest) | 100 (50 flights × 2) | Free | $0 |
| SerpApi (alternatives) | Only when red tier fires | ~5-15 per cycle | ~$0.01 | ~$0.05-$0.15 |
| **Total** | | **~250-350 calls** | | **~$0.20-$0.75/cycle** |

### Monthly Cost at Current Rate

- Cycles per day: 48 (every 30 min)
- Days per month: 30
- Total cycles: 1,440
- Monthly AeroDataBox cost: **~$288-$1,080** (depends on RapidAPI plan)
- Monthly total: **~$300-$1,200**

### Optimization Strategies

| Strategy | Savings | Implementation |
|----------|---------|---------------|
| **Skip API calls when tier hasn't changed** | ~50-70% | If flight was green last cycle and still > 4h out, skip AeroDataBox. Check weather only every 2nd cycle. |
| **Batch METAR requests** | 50% | `aviationweather.gov/api/data/metar?ids=KJFK,KLAX,KBOS...` — one call for ALL airports |
| **Increase interval to 60 min for long-horizon flights** | 50% on distant flights | Only score every 60 min when horizon > 24h. Every 30 min when < 4h. |
| **Skip AeroDataBox when weather is VFR + carrier is healthy** | Variable | If weather is clear AND carrier has < 3% cancel rate AND no known issues, skip live status and use cached OTP data only |
| **Use SquawkBird or other flat-rate API** | Potentially large | AeroDataBox on RapidAPI is metered. A flat-rate provider might be cheaper for high volume. |
| **Cache FAA NAS status globally** | 90% | The FAA ATC ground stop/delay data is the same for ALL flights at the same airport. Cache it for 5 minutes instead of calling per flight. |

### Optimized Call Count

| Optimization | New Calls per Cycle | Monthly Cost |
|-------------|-------------------|-------------|
| Skip calls for unchanged green flights | 100-150 | ~$120-$200 |
| + Batch METAR 1×/cycle | 80-130 | ~$100-$180 |
| + 60-min interval for long horizon | 60-100 | ~$80-$150 |
| + FAA ATC cache | 50-80 | ~$70-$130 |

**The FAA NAS status and aviationweather.gov calls are free** — they add zero monetary cost regardless of volume, only time.

---

## 12. Human Disruption Data — Aviation-Edge and Security Incidents

### The Aviation-Edge API

URL: `https://aviation-edge.com/flight-delay-reason-api/`

This API provides **delay reason codes** for flights after they occur. It does **not** provide:
- Real-time security incident data
- Passenger disturbance data
- Predictive data

### What It Returns

```json
{
  "flight": { "iataNumber": "AA100", ... },
  "delay": "72",
  "delayReason": "SECURITY",  // ← this is what you want
  "delayReasonDetail": "Security check - additional"
}
```

### Other Delay Reason Values

| Code | Meaning |
|------|---------|
| SECURITY | Security breach, threat, or evacuation |
| LATE_AIRCRAFT | Inbound aircraft delay |
| AIR_CARRIER | Airline operational issue |
| WEATHER | Weather-related |
| NAS | National Airspace System (ATC) |
| AIRCRAFT_TECHNICAL | Maintenance issue |

### Does It Provide Passenger Disturbance Data?

**No.** "SECURITY" refers to the **flight** being delayed by a security procedure (e.g., TSA line, bag check, gate evacuation). It is NOT:
- A specific passenger causing problems
- A detailed incident report
- Data that can predict future passenger behavior

### Where to Get Real Passenger Disurbance / Incident Data

This data is **extremely difficult to obtain** in real time because:

| Source | Real-time? | Cost | Availability |
|--------|-----------|------|-------------|
| FAA Incident Database (NTSB) | No (weeks/months delay) | Free | Only after investigation |
| Airline internal reports | Yes | N/A | Not public — airlines keep this confidential |
| Aviation Safety Network | No | Free | Historical only |
| News/Media reports | Semi | Free | Not structured, needs NLP |
| Social media monitoring | Real-time | API costs | Low signal-to-noise |

**Bottom line**: There is no commercially available API for real-time passenger disturbance data on specific flights. The security incident data would need to be entered manually by airport/airline staff, and no public API exposes this in real time.

### Could Aviation-Edge Help the Prediction?

Yes, but only for **historical analysis** — you could correlate past SECURITY delay reasons with other signals to find patterns. It would not help predict future disturbances.

---

## 13. Agency vs Individual Traveler — The Business Model

> "I'm confused — is this for both agency and individual travelers? What is agency?"

### Travnr's Business Model

Travnr is **B2B-first** — it is designed for **travel agencies** to use with their **clients**.

```
Travel Agency (Travnr customer)
  ├── Agency Dashboard (monitor flights, manage travelers)
  ├── Adds client bookings (with traveler names, emails, phones)
  └── Travnr monitors flights and alerts the AGENCY's travelers
```

### What "Agency" Means Here

An **agency** is a travel agency or corporate travel desk that:
- Has clients with booked flights
- Uses Travnr to monitor those flights for disruption
- Sends alerts to their clients (travelers) when disruption is detected
- Presents alternative flight options

The `agencyAccounts` table stores agencies. The `monitoredFlights` table links flights to an agency. The `flightTravelers` table stores the **agency's clients** (passengers).

### How Individual Users Fit

There is also an **individual user** model (`users` + `userMonitoredFlights` table) where a regular person can sign up and monitor flights for themselves. This is a secondary feature — the primary focus is the agency model.

### Why The Disruption Flow Is Agency-Focused

The disruption flow (monitoring → scoring → alerting → alternatives → selection) is built for an **agency workflow**:

1. Agency adds client flights to monitoring
2. Travnr scores every 30 minutes
3. When a flight goes red, Travnr emails the AGENCY'S CLIENT with alternatives
4. The client clicks a link, reviews alternatives, and can select one
5. Travnr notifies the agency of the client's selection

This flow makes sense for an agency because:
- The agency manages multiple clients' bookings
- The agency wants to proactively handle disruptions
- The alternatives are pre-vetted by Travnr's risk scorer

### UI Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/agency/dashboard` | Agency | Monitor all client flights |
| `/agency/flight/:id` | Agency | View flight risk details, signal breakdown |
| `/disruption/selection/:token` | Agency's client | Choose alternative flight |
| `/book/:token` | Guest (anyone) | Book flights via Bland AI call |
| `/dashboard` | Individual user | Their own flights |
| `/call-history` | Individual user | Past Bland AI concierge calls |

---

## 14. Total Cost Analysis — APIs + GPU + Hosting

### Monthly API Costs (50 Flights, 30-Min Cycle)

| Service | Plan | Cost/Month | Notes |
|---------|------|-----------|-------|
| **AeroDataBox** (via RapidAPI) | RapidAPI Pro ($25/mo) + AeroDataBox credits | ~$25 + $200-800 in credits | Pricing: ~$0.003-0.012/call for flight status. Historical OTP is "Tier 3" (6 units). 100 flights * 48 cycles = ~4,800 calls/day. |
| **SerpApi** (Google Flights) | SerpApi Pro ($50/mo) | $50 | ~5,000 searches/mo included. Only used when red tier fires. |
| **Bland AI** | Bland Growth ($199/mo) | $199 | 2,500 min included, $0.12/min overage. Each concierge call ~2-5 min. |
| **SendGrid** | Free tier | $0 | 100 emails/day free. Travnr will exceed this if monitoring 50 flights with 3 travelers each = 150 alert emails/cycle × 48 cycles... |
| **aviationweather.gov** | Free (NOAA) | $0 | No rate limits, no cost. |
| **nasstatus.faa.gov** | Free (FAA) | $0 | No rate limits, no cost. |
| **Twilio** (if SMS alerts) | ~$0.0079/SMS | ~$50-150+ | Only if SMS alerts are enabled per traveler. |
| **PostHog** | Free tier | $0 | 1M events/mo free. |
| **Sentry** | Free tier | $0 | 5K events/mo. |
| **Anthropic (Claude)** | Pay-as-you-go | ~$10-50 | Only for health report (1-2 calls per week) + call summaries (per Bland call). |
| **Duffel API** | Duffel Growth ($399/mo) | $399 | For flight booking/search. Each offer request = ~$0.10. If agency books 50 flights/mo = ~$5 in API, but the $399 flat fee covers it. |

### Estimated Monthly API Total

| Scenario | Cost |
|----------|------|
| **Low usage** (10 flights, agency only, few alerts) | ~$500-700/mo |
| **Medium usage** (50 flights, moderate alerts, some Bland calls) | ~$1,000-2,000/mo |
| **High usage** (100+ flights, heavy Bland AI, SMS alerts) | ~$2,000-4,000/mo |

### GPU/ML Cost

| Component | Cost |
|-----------|------|
| Training (Google Colab free) | $0 |
| Weekly re-training (Colab free) | $0 |
| Inference on Replit CPU | $0 |
| **Total ML** | **$0/mo** (beyond Replit subscription) |

### Replit Hosting

| Plan | Cost | Notes |
|------|------|-------|
| Replit Core | $25/mo | 2 vCPU, 4GB RAM, 2GB storage — likely insufficient |
| Replit Pro | $50/mo | 4 vCPU, 8GB RAM, 8GB storage — borderline |
| Replit Teams/Scalable | ~$100-200/mo | Dedicated VM, auto-scaling |

### Grand Total Estimate

```
Low usage:      ~$550-750/mo  (Replit + essential APIs)
Medium usage:   ~$1,100-2,100/mo
High usage:     ~$2,200-4,200/mo
```

---

## 15. Complete Disruption Factors — All 20 Data Points

Here is every data point the disruption engine considers, organized by category:

### Live Operational (5 inputs)
| # | Factor | Source | Type | Max Points |
|---|--------|--------|------|-----------|
| 1 | Inbound aircraft delay | AeroDataBox | Numeric (min) | 40 |
| 2 | Flight cancelled status | AeroDataBox | Boolean | Override → 75+ |
| 3 | Flight delay minutes | AeroDataBox | Numeric (min) | Used for confirmation alert |
| 4 | Tail number / equipment | AeroDataBox | Text | Metadata only |
| 5 | Departure time (actual) | AeroDataBox | Time | Used for time-of-day scoring |

### Air Traffic Control (2 inputs)
| # | Factor | Source | Type | Max Points |
|---|--------|--------|------|-----------|
| 6 | Ground stop at origin or destination | FAA NAS API | Boolean | 20 |
| 7 | Ground delay program at origin or destination | FAA NAS API | Numeric (min) | 15 |

### Weather (7 inputs)
| # | Factor | Source | Type | Max Points |
|---|--------|--------|------|-----------|
| 8 | Origin flight category (VFR/MVFR/IFR/LIFR) | NOAA METAR | Categorical | 25 |
| 9 | Origin thunderstorm present | NOAA METAR | Boolean | +10 |
| 10 | Origin freezing conditions | NOAA METAR | Boolean | +5 |
| 11 | Origin wind gust ≥ 25kt | NOAA METAR | Boolean | +3 |
| 12 | Destination flight category | NOAA METAR | Categorical | 25 (×0.7) |
| 13 | Destination thunderstorm | NOAA METAR | Boolean | +10 (×0.7) |
| 14 | Destination freezing | NOAA METAR | Boolean | +5 (×0.7) |

### Historical / Statistical (4 inputs)
| # | Factor | Source | Type | Max Points |
|---|--------|--------|------|-----------|
| 15 | Historical on-time rate (14 days) | AeroDataBox | Numeric | 15 |
| 16 | Historical OTP sample size | AeroDataBox | Numeric | Threshold (min 3) |
| 17 | Time of day | Computed from schedule | Numeric | 4 |
| 18 | Day of week | Computed from date | Numeric | 4 |

### Carrier (2 inputs)
| # | Factor | Source | Type | Max Points |
|---|--------|--------|------|-----------|
| 19 | Carrier health score (24h cancellations + delays) | Travnr DB (self-reported) | Numeric | 10 |
| 20 | Connection risk (late-day departure) | Computed from schedule | Numeric | 5 |

### What Is NOT Considered

These factors are **not included** in the current system:

| Missing Factor | Why Not Included | Feasibility |
|---------------|-----------------|-------------|
| Passenger disturbance/security | No real-time API exists for this | Would need manual entry or custom integration |
| Crew availability / scheduling | No public API | Airlines don't expose this |
| Aircraft maintenance history | No public API | Airlines keep this private |
| Airport congestion (FAA rate) | Partially covered by ATC ground stop/delay | Could add explicitly |
| Holiday/travel surge dates | Not in current model | Easy to add (calendar data) |
| Political events / strikes | Not in current model | Hard to automate — news NLP |
| Weather forecast (not just current) | Not in current model | Could add NOAA forecast API |
| Connecting passenger counts | Not in current model | Airlines don't expose this |
| Airline financial health | Not in current model | Public data, quarterly only |

---

## 16. Travnr vs FlightAware — Key Differences

| Feature | Travnr | FlightAware |
|---------|--------|-------------|
| **Target audience** | Travel agencies (B2B) | Everyone (B2B + B2C) |
| **Flight tracking** | Via AeroDataBox (3rd party) | **Own** global network of ADS-B receivers + datalinks |
| **Disruption prediction** | Heuristic risk scoring (0-100) | Does NOT predict disruption — shows real-time status |
| **Alternative flights** | Searches Google Flights via SerpApi, presents ranked options | Does not offer alternatives |
| **Traveler alerts** | Email + SMS to agency's clients | Email + SMS + app push |
| **Bland AI voice concierge** | Books flights via phone call | No voice concierge |
| **Flight booking** | Duffel API (books real tickets) | FlightAware is tracking only — no booking |
| **Data sources** | 3rd-party APIs (AeroDataBox, NOAA, FAA) | **Own** data network (more accurate, lower latency) |
| **Pricing** | ~$550-2,000/mo (all-in with APIs) | $0-$499/mo (varies by plan) |
| **Risk scoring** | Proactive (predicts disruption before it happens) | Reactive (shows what's happening NOW) |
| **Health report** | Claude-generated accuracy analysis | No accuracy analysis |

### FlightAware's Advantage

FlightAware has its **own worldwide network of ADS-B receivers** — they don't rely on AeroDataBox or any third party. This means:
- More accurate (they see the actual aircraft position)
- Lower latency (real-time, not API-polled)
- Lower operational cost (no API credits)
- Harder to replicate (requires hardware infrastructure)

Travnr's advantage is the **prediction + alternative finding + AI concierge** — FlightAware does none of these.

---

## 17. Bland AI — Complete End-to-End Deep Flow with Code

### Overview

Bland AI is an **AI phone call platform**. Travnr uses it in two modes:

1. **Outbound**: Server calls a traveler (triggered by agency or user request)
2. **Inbound**: Traveler calls a Travnr phone number (a "DID" — Direct Inward Dialing number)

### Complete Outbound Call Flow

```
1. USER (agency dashboard or website) clicks "Call Traveler"
         ↓
2. Server builds the "task" prompt (what Bland's AI should say)
         ↓
3. Server calls Bland API POST /v1/calls with phone number + task
         ↓
4. Bland calls the traveler's phone (outbound)
         ↓
5. AI assistant talks to traveler following the prompt
         ↓
6. Mid-call, Bland POSTs to our /api/bland/dynamic-data for traveler info
         ↓
7. Call ends → Bland POSTs to our /api/bland/webhook with transcript
         ↓
8. Server parses transcript, searches flights, emails options to traveler
```

### Step-by-Step Code Walkthrough

#### Step 1: Building the Call (routes.ts ~5560, ~9120)

```typescript
// When a user triggers a call from the UI:
const blandCall = await bland.dispatchCall({
  phoneNumber: traveler.phone,
  task: bland.buildTravelConciergePrompt({
    userName: traveler.name,
    destination: searchParams.destination,
    // ... other context
  }),
  webhookUrl: `${baseUrl}/api/bland/webhook`,
  dynamicDataUrl: `${baseUrl}/api/bland/dynamic-data`,
  dynamicDataHeaders: { "x-bland-secret": bland.getWebhookSecret() },
});
```

#### Step 2: dispatchCall sends to Bland API (bland.ts:225-265)

```typescript
export async function dispatchCall(opts) {
  const config = buildBlandCallConfig({...opts});  // Build the shared config
  const payload = {
    phone_number: opts.phoneNumber,
    from: "+14159148074",   // Travnr's caller ID
    ...config,
  };
  // Retry up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const data = await blandRequest("POST", "/calls", payload);
      return { callId: data.call_id, status: data.status || "queued" };
    } catch (err) { ... sleep(2000); ... }
  }
}
```

#### Step 3: The Config That Controls the AI (bland.ts:140-208)

```typescript
function buildBlandCallConfig(opts) {
  return {
    task: opts.task,              // ← The prompt that controls the AI's behavior
    webhook: opts.webhookUrl,     // ← Where Bland sends the transcript when call ends
    webhook_events: ["call.ended"],
    voice: pickVoice(),           // ← Random voice from pool (Allan, Carl, Sophie, etc.)
    model: "enhanced",            // ← Bland's best model
    noise_cancellation: true,
    interruption_threshold: 100,  // ← Can be interrupted
    endpoint_sensitivity: 0.35,   // ← Waits for natural pause
    end_call_phrases: ["Talk soon"],  // ← Hangs up when AI says "Talk soon"
    analysis_schema: getTravelAnalysisSchema(),  // ← Post-call structured extraction
    dynamic_data: [{              // ← Mid-call data fetching
      url: opts.dynamicDataUrl,
      method: "POST",
      body: { phone_number: "{{phone_number}}", call_id: "{{call_id}}" },
      response_data: [
        { name: "traveler_info", data: "$.traveler_info", context: "..." },
        { name: "email_info", data: "$.email_info", context: "..." },
        // ... more fields injected into the AI's context mid-call
      ],
    }],
  };
}
```

#### Step 4: The Prompt (bland.ts:307-367)

The prompt is a detailed instruction to Bland's AI that controls the entire conversation:

```typescript
function buildTravelConciergePrompt(context) {
  return `You are a professional travel concierge assistant for Travnr...
  1. Greet the traveler warmly...
  2. Ask where they want to fly...
  3. Single-airport cities: do NOT ask which airport...
  4. Multi-airport metros: offer one alternative...
  ...
  7. Say "Perfect — you'll have your options in your inbox within a minute. Talk soon."
  `;
}
```

**Key**: This prompt tells the AI exactly how to behave — what to ask, when to not ask, what to say at the end. The phrase "Talk soon" triggers the hangup (via `end_call_phrases`).

#### Step 5: Mid-Call Dynamic Data (routes.ts:7686-7853)

During the call, Bland's AI needs to know who it's talking to. It POSTs to `/api/bland/dynamic-data` with the caller's phone number.

```typescript
app.post("/api/bland/dynamic-data", async (req, res) => {
  const { phone_number, call_id } = req.body;
  
  // Step 1: Try to find user by call_id (outbound calls stored in DB)
  let userId = null;
  if (call_id) {
    const blandCall = await storage.getBlandCallByBlandId(call_id);
    if (blandCall) userId = blandCall.userId;
  }
  
  // Step 2: If not found, try by phone number (inbound callers)
  if (!userId && phone_number) {
    const phoneMatch = await storage.getUserIdByPhone(phone_number);
    if (phoneMatch) userId = phoneMatch.userId;
  }
  
  // Step 3: Build response context for the AI
  let travelerInfo = "No traveler profile found.";
  let bookingInfo = "No recent bookings.";
  let emailInfo = "No email on file — ask at the end of the call.";
  
  if (userId) {
    const profile = await storage.getProfile(userId);
    travelerInfo = `Name: ${profile.name}, Home airport: ${profile.homeAirport}...`;
    // ...
  }
  
  // Step 4: Return to Bland — these get injected into the AI's context
  return res.json({
    traveler_info: travelerInfo,
    booking_info: bookingInfo,
    email_info: emailInfo,
    previous_proposal_info: previousProposalInfo,
  });
});
```

**The answer to "who is looking up the user?"** — **OUR server** (the Travnr Express.js server). When Bland needs user data during the call, it makes an HTTP POST to our `/api/bland/dynamic-data` endpoint. Our server looks up the user by phone number in PostgreSQL and returns the data. Bland injects it into the AI's context. **There are no if-statements in the AI itself** — the AI just receives the data as context.

#### Step 6: Post-Call Webhook (routes.ts:7363-7650)

When the call ends, Bland POSTs to `/api/bland/webhook`:

```typescript
app.post("/api/bland/webhook", async (req, res) => {
  const payload = req.body;
  const blandCallId = payload.call_id;
  
  // Save transcript, summary, recording
  const updateData = {};
  if (payload.concatenated_transcript) updateData.transcript = payload.concatenated_transcript;
  if (payload.summary) updateData.summary = payload.summary;
  
  // If inbound call (guest, no account), generate proposal directly
  // If outbound call (has account), trigger proposal generation
  // Fire-and-forget Claude summary generation for admin view
  
  return res.json({ received: true }); // Always 200 — prevent Bland retries
});
```

#### Step 7: Post-Call Analysis

Bland runs `analysis_schema` as a **separate LLM pass** over the transcript AFTER the call ends. It extracts structured data:

```json
{
  "origin_iata": "STL",
  "destination_iata": "LIS", 
  "departure_date": "2026-07-15",
  "passengers": 4,
  "cabin_class": "economy",
  "email": "user@example.com"
}
```

This is **not spoken during the call** — it's a post-processing step. The traveler never hears these field names.

#### Step 8: Proposal Generation (routes.ts:6336-6529)

The extracted data drives flight search:

```typescript
async function generateGuestProposalForInboundCall(opts) {
  const details = parseTravelDetailsFromTranscript(transcript, summary, analysis);
  
  // Resolve email from phone map or analysis
  // Resolve airports from city names → IATA codes
  // Search Duffel + SerpApi for flights
  // Pick best 3 offers
  // Save guest_proposal row
  // Email options to traveler
}
```

### Does Our System "Know" What the User Wants?

**Yes, but only after the call ends.** During the call:
- Bland's AI is following the prompt deterministically (asking questions in order)
- The AI has access to the dynamic data (user profile, previous proposals)
- The AI responds naturally based on what the traveler says

After the call:
- Bland sends the transcript + analysis_schema result
- **Travnr's deterministic code** parses the analysis (not the AI transcript)
- The parsed data (origin, destination, dates) drives the Duffel/SerpApi search
- The results are emailed to the traveler

**There is no AI agent autonomously searching flights during the call.** The AI ONLY talks to the traveler. After the call, standard code does the searching.

### Visual Flow

```
TRAVELER'S PHONE                BLAND AI CLOUD              TRAVNR SERVER
     │                              │                            │
     │  ← incoming call (inbound)   │                            │
     │  or Bland calls traveler     │                            │
     │  (outbound)                  │                            │
     │                              │                            │
     │──── AI conversation ────────→│                            │
     │  "Where you flying?"         │                            │
     │← "I want to go to Lisbon"─  │                            │
     │                              │──── POST /dynamic-data ──→│  ← Server looks up
     │                              │←── traveler_info ─────────│    user by phone
     │                              │                            │
     │  "I see you're based in      │                            │
     │   St. Louis..."              │                            │
     │                              │                            │
     │  "...Talk soon!"             │                            │
     │←──── call ends ──────────── │                            │
     │                              │──── POST /webhook ───────→│  ← Transcript arrives
     │                              │   (transcript + analysis)  │
     │                              │                            │
     │                              │                      ┌──── Parse analysis
     │                              │                      ├──── Search Duffel
     │                              │                      ├──── Search SerpApi
     │                              │                      ├──── Pick 3 best
     │                              │                      ├──── Save proposal
     │←─── email with options ─────│                      └──── Send email
     │                              │                            │
```

---

## 18. Claude's Role — What It Does vs Bland vs Deterministic Code

### Where Claude Is Used

Claude (Anthropic) appears in **three** places in the codebase:

| Location | Purpose | File | When Called |
|----------|---------|------|-------------|
| **Call Summary** | After a Bland call ends, Claude reads the transcript and produces a one-line admin summary (e.g., "Family of 4, STL→LIS, Jun 12-22, premium econ") | `server/lib/callSummary.ts` | After every completed Bland call |
| **Health Report** | Claude analyzes the precision/recall data and writes a plain-English assessment of the disruption prediction system | `server/routes.ts:10856-10918` | When an agency requests a health report (weekly/manually) |
| **Proposal Email** | Claude writes personalized email body text for flight proposals | `server/lib/proposalEmailPersonalizer.ts` | When sending flight options to a traveler |

### What Claude Does NOT Do

- Claude does **not** take any actions
- Claude does **not** make any decisions
- Claude does **not** control Bland AI
- Claude does **not** search for flights
- Claude does **not** modify risk scores or monitoring

### The Division of Labor

```
DETERMINISTIC CODE (TypeScript)
├── Risk scoring (scoreFlightRisk)
├── Flight status fetching (getFlightStatus)
├── Weather fetching (getAirportWeather)
├── ATC status (getNasStatus)
├── Alternative flight search (findLowRiskAlternatives)
├── Alert dispatch (sendTravelerAlert)
├── All API routing and auth
└── Database read/write

BLAND AI
├── Voice conversation with traveler
├── Natural language understanding
└── Structured data extraction (post-call analysis_schema)

CLAUDE (Anthropic)
├── Summarizing call transcripts → admin one-liner (callSummary.ts)
├── Analyzing health report data → plain-English report (routes.ts:10856)
└─- Personalizing proposal email text (proposalEmailPersonalizer.ts)
```

**Claude is purely a text analysis/summarization tool. It never takes actions.**

---

## 19. Deterministic Function vs AI Agent — The Alternative Search

> "You said it's a deterministic function, not an AI agent — what does the code look like?"

### The Code

`server/lib/disruption/alternativeFinder.ts:63-158` — here is the simplified flow:

```typescript
export async function findLowRiskAlternatives(flight, count = 3) {
  // STEP 1: Search Google Flights via SerpApi (deterministic API call)
  const rawFlights = await searchGoogleFlights({
    origin: flight.originIata,
    destination: flight.destinationIata,
    departureDate: flight.departureDate,
  });

  // STEP 2: Take the first 10 results
  const candidates = rawFlights.slice(0, 10);

  // STEP 3: For each candidate, run the risk scorer
  for (const candidate of candidates) {
    const result = await scoreFlightRisk({
      flightNumber: candidate.flightNumber,
      carrierIata: candidate.carrierIata,
      departureDate: flight.departureDate,
      departureTime: candidate.departureTime,
      originIata: flight.originIata,
      destinationIata: flight.destinationIata,
    });

    // Skip red-tier alternatives (no point recommending a flight at risk)
    if (result.tier === "red") continue;

    scored.push({
      flightNumber: candidate.flightNumber,
      riskScore: result.score,
      riskTier: result.tier,
      price: candidate.price,
      // ...
    });
  }

  // STEP 4: Sort by risk score (lowest = safest)
  scored.sort((a, b) => a.riskScore - b.riskScore);

  // STEP 5: Return the 3 safest alternatives
  return scored.slice(0, count);
}
```

### Why This Is Deterministic, Not AI

- **No AI decision-making**: The logic is `fetch → filter → score → sort → pick 3`
- **Same input always produces the same output**: Given the same flight + SerpApi results, you'll always get the same top 3
- **No learning, no autonomy**: The function cannot decide to search differently, try a different route, or negotiate with the traveler

### How an AI Agent Version Would Look Different

An AI agent would be:
```typescript
// THIS IS NOT WHAT TRAVNR DOES — this is what an AI agent would look like
async function findAlternativesAIAgent(flight) {
  const agent = new TravelAgentAI();
  
  // Agent decides what to do based on context
  const plan = await agent.decide({
    tools: ["search_flights", "check_weather", "check_price", "call_airline"],
    goal: `Find alternatives for ${flight.flightNumber} from ${flight.originIata} to ${flight.destinationIata}`
  });
  
  // Agent might decide to search a different route, check nearby airports, etc.
  // Agent might call the airline to hold a seat
  // Agent makes its own decisions about what to do next
}
```

Travnr does **not** do this. The alternative finder is a fixed pipeline of deterministic steps.

---

## 20. Webhook Flow — How the Call Ends and Data Is Processed

### Complete End-to-End Webhook Processing Chain

```
1. Call ends (AI says "Talk soon" → Bland hangs up)
         ↓
2. Bland POSTs to /api/bland/webhook
   Headers: x-bland-secret (HMAC auth)
   Body: {
     call_id: "abc123",
     status: "completed",
     call_length: 185,           // seconds
     concatenated_transcript: "Agent: Hi there!\nTraveler: Hi...",
     summary: "Traveler wants to fly STL→LIS...",
     analysis: { origin: "STL", destination: "LIS", ... },
     recording_url: "https://...",
     variables: { ... dynamic data that was injected mid-call ... }
   }
         ↓
3. Server verifies x-bland-secret header matches expected hash
         ↓
4. Server looks for existing bland_calls row by call_id
   - If NOT found AND metadata.source == "inbound_phone" → GUEST BRANCH
   - If found AND has callRequestId → OUTBOUND BRANCH
         ↓
5. INBOUND GUEST BRANCH:
   ├── Mark blandCallId as "dispatched" (idempotency — prevent duplicate processing)
   ├── normalize phone number → phoneE164
   ├── fire-and-forget: generateGuestProposalForInboundCall()
   │     ├── parse email from phone↔email map or analysis
   │     ├── parse destination/origin from analysis
   │     ├── search Duffel + SerpApi for flights
   │     ├── pick best offers
   │     ├── save guest_proposal row
   │     └── email options to traveler
   └── return 200 (always)
         ↓
6. OUTBOUND BRANCH (user has an account):
   ├── Save transcript, summary, recording to bland_calls row
   ├── Save analysis_schema result to variables.__analysis
   ├── Update call status → "completed"
   ├── Create notification for user ("Concierge call completed")
   ├── Fire-and-forget: Claude call summary generation
   │     ├── Read transcript from DB
   │     ├── POST to Anthropic API
   │     ├── Parse Claude's JSON response
   │     └── Save aiSummary to bland_calls.variables
   ├── If callRequestId exists:
   │     ├── triggerProposalGenerationOnce()
   │     │     ├── parse travel details from transcript
   │     │     ├── resolve airports (city names → IATA codes)
   │     │     ├── search Duffel for flights
   │     │     ├── save proposal to itinerary_proposals
   │     │     ├── generate proposal options
   │     │     └── if no flights found, create "no flights" proposal
   │     └── update callback request status → "completed"
   └── return 200 (always)
         ↓
7. Traveler receives email with flight options
         ↓
8. Traveler clicks link → reviews options → selects one
         ↓
9. Travnr sends confirmation, agency is notified
```

### Key Design Principles

1. **Always return 200** — Bland retries on non-200 responses. Returning 200 even on errors prevents duplicate processing.

2. **Idempotency** — The `inboundGuestProposalDispatched` Set ensures the same `call_id` is never processed twice.

3. **Fire-and-forget** — Heavy processing (Duffel search, Claude summarization) runs asynchronously after the 200 response. The webhook never blocks on slow external APIs.

4. **Swallowing errors** — Every error handler logs the error but never propagates it to the response. This prevents Bland from retrying into an error loop.

5. **Phone↔email map** — When an inbound caller is identified, the server upserts a `phone_number → email` mapping so the next call from the same number is faster.

---

## Summary of Key Insights

1. **Passenger data is NOT encrypted at rest** in PostgreSQL. This is a real security gap for production use, especially given passport data is stored.

2. **The risk scorer uses 10 hand-crafted signals** with horizon-dependent weight tables. There is zero ML involved currently.

3. **Training data already exists** in `risk_score_history` + `monitoredFlights.resolvedStatus`. You can export it today and train an XGBoost model on Google Colab for free.

4. **Claude is used for text analysis only** (summaries, health reports, email personalization). It does not control anything.

5. **Bland AI handles the phone conversation** but the intelligence about what to do after the call is entirely deterministic TypeScript code.

6. **The alternative finder is NOT an AI agent** — it's a fixed pipeline (SerpApi → risk score → sort → pick 3).

7. **API costs dominate** (~$500-2,000/mo). The main cost drivers are AeroDataBox ($200-800+), Bland AI ($199), and Duffel ($399).

8. **GPU/ML costs are $0** if using Google Colab free tier for training and running inference on existing Replit CPU.

9. **The health report system is agency-only** and generates precision/recall metrics with Claude-written analysis.

10. **The system does not learn** — it uses fixed formulas. Converting to ML would likely improve accuracy from ~60-75% to ~80-90% with sufficient labeled data.
