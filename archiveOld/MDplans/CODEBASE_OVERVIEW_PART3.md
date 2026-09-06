# Travnr Codebase Overview — Part 3: Deep Questions Answered

---

## 1. DATABASE SIZE — How Much Space Are We Using?

We **don't know** the exact size because there's no monitoring built in. But we can estimate:

**PostgreSQL on Replit's free tier**: typically **500MB - 1GB** storage limit.

**What takes space:**
- User accounts, profiles, call requests, proposals → tiny (<1MB for light usage)
- Bland AI call transcripts (stored as text) → biggest consumer. Each call is ~5-50KB of transcript
- Risk score history (`risk_score_history` table) → grows with each 30-min cycle per flight
- Guest proposals → JSONB proposal data (1-5KB each)
- Hotel searches → raw API payloads stored in JSONB

**At 100 users, 500 calls, 5000 risk score entries**: probably **under 50MB**. If you scale, transcripts and risk score history grow fastest.

You can check exact usage by running `npm run dev` and querying:
```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
```

**On Replit**, PostgreSQL is provisioned automatically with a default storage limit. Replit's paid tiers have higher limits.

---

## 2. CAN WE RUN THIS OUTSIDE REPLIT? (GitHub, Local, VPS)

**Yes, absolutely.** This is a standard Node.js/Express/PostgreSQL app. Replit is just where it was built.

### To run it locally or on GitHub:
```bash
# 1. Clone the repo (or copy files)
# 2. Install PostgreSQL locally (or use a cloud Postgres like Supabase/Railway)
# 3. Set environment variables:
export DATABASE_URL="postgresql://user:pass@localhost:5432/travnr"
export SESSION_SECRET="your-secret-here"
export DUFFEL_API_TOKEN="..."
export BLAND_AI_API_KEY="..."
export SENDGRID_API_KEY="..."
export AERODATABOX_API_KEY="..."
export STRIPE_SECRET_KEY="..."
export ANTHROPIC_API_KEY="..."

# 4. Install and run
npm install
npm run db:push  # Creates database tables
npm run dev      # Starts on port 5000
```

### What changes:
- Stripe's `stripe-replit-sync` integration is Replit-specific (uses Replit connectors). You'd need to replace `server/lib/stripeClient.ts` with direct Stripe SDK usage
- Vite's `@replit/vite-plugin-runtime-error-modal` is Replit-specific but harmless (just a dev overlay)
- The `.replit` file is Replit config — delete it when migrating

### Can it run from GitHub?
**Yes.** GitHub itself doesn't "run" code (it's a code host), but you can:
- **Clone to your machine** and run locally
- **Deploy to Railway/Render/Fly.io** — each requires a PostgreSQL addon
- **Deploy to Vercel** (with serverless functions — would need adaptation since Express runs as a long-lived server)
- **Deploy to AWS** (EC2 + RDS for Postgres)

### The mathematical/scoring parts:
Pure TypeScript functions (`scoreFlightRisk` in `riskScorer.ts`). No special hardware needed. Runs on any CPU.

---

## 3. AUTHENTICATION — How Does It Work Exactly?

**It's NOT Firebase Auth, NOT Auth0, NOT OAuth.** It's custom **session-based auth** built from scratch:

### The stack:
```
bcryptjs     → password hashing (12 rounds)
express-session → session management (cookie-based)
connect-pg-simple → stores sessions in PostgreSQL
```

### Flow step by step:

**Register:**
1. User fills form in React → `POST /api/auth/register` with `{ email, password, firstName, lastName, phone }`
2. Server hashes password: `bcrypt.hash(password, 12)` — this creates a long hash string like `$2b$12$...`
3. Server stores in `users` table: `{ id, email, password: <hash>, firstName, lastName }`
4. Server sends verification email via SendGrid with link containing a random token
5. Server creates a session: `req.session.userId = user.id` → sets a cookie in the browser

**Login:**
1. User enters email + password → `POST /api/auth/login`
2. Server looks up user by email in `users` table
3. Compares: `bcrypt.compare(password, storedHash)` — if true, password is correct
4. Server sets `req.session.userId = user.id` → browser gets a session cookie
5. Frontend redirects to dashboard

**Checking if logged in:**
1. Any page load → `GET /api/auth/user`
2. Server checks if `req.session.userId` exists
3. If yes, looks up user in database and returns user object
4. If no, returns 401 → frontend shows as logged out

**Logout:**
1. `POST /api/auth/logout`
2. Server destroys the session: `req.session.destroy()`
3. Browser removes the cookie

### The cookie:
- Name: `connect.sid` (default express-session)
- Stored in `sessions` table in PostgreSQL
- Expires after 30 days
- HttpOnly (JavaScript can't read it), Secure (HTTPS only in prod), SameSite

### React side:
`client/src/lib/auth.tsx` provides a React context (`AuthProvider`) that:
- Calls `GET /api/auth/user` on app load via React Query
- Exposes `user`, `login()`, `register()`, `logout()` to all components
- The `isAdmin` flag checks if user email ends with `@travnr.com`

### Agency auth:
Separate session field: `(req.session as any).agencyId`. Same mechanism, separate table (`agency_accounts`).

### CSRF protection:
Double-submit cookie pattern. Every mutation request includes a `X-CSRF-Token` header that must match a `csrf_token` cookie.

---

## 4. `passenger-form.ts` — What Is It For?

This is a **shared form utility** for the airline flight booking checkout. When a user books a flight, they need to enter passenger details exactly as they appear on a passport:

```
First name, Last name, Date of birth
Gender, Title (Mr/Ms/Mrs/Miss/Dr)
Residence country + State
Known Traveler Number (TSA PreCheck)
Redress Number
Passport number, country, expiry
```

The file provides:
- `PassengerForm` interface — TypeScript definition of all fields
- `emptyPassenger()` — creates a blank form
- `validatePassenger()` — checks required fields, date of birth validity, KTN/redress pairing
- `composeBornOn()` — combines month/day/year selects into YYYY-MM-DD
- `serializePassenger()` — converts form to the JSON the server expects
- Month/day/year arrays for the dropdown selectors

**It's NOT a React component.** It's a utility module with types and pure functions. The actual form UI is in the page components (`guest-booking.tsx`, `flight-search.tsx`).

---

## 5. `queryClient.ts` — What Is It?

This is the **API communication layer** for the entire frontend. Every fetch from the React app goes through this file.

```typescript
// apiRequest — used by ALL mutations (POST/PUT/DELETE)
export async function apiRequest(method, url, data) {
  // 1. Ensure CSRF token cookie exists
  // 2. Attach X-CSRF-Token header
  // 3. Attach Content-Type: application/json
  // 4. fetch() with credentials: "include" (sends cookies)
  // 5. If response is not ok, throw error
  // 6. Return response
}

// getQueryFn — used by ALL data fetching (GET via React Query)
export const getQueryFn = ({ on401 }) => async ({ queryKey }) => {
  const res = await fetch(queryKey[0], { credentials: "include" });
  if (res.status === 401 && on401 === "returnNull") return null;
  // ... handle errors, return JSON
};

// QueryClient — the TanStack React Query instance
export const queryClient = new QueryClient({ /* default options */ });
```

**Why it matters:** Every React component that shows data uses React Query with `queryKey: ["/api/..."]`. The `queryClient` handles caching, refetching, and error states globally. `apiRequest` centralizes CSRF tokens, credentials, and error handling so no page needs to write raw `fetch()`.

---

## 6. WHERE IS USER DATA STORED?

**All user data is in PostgreSQL.** Not localStorage, not cookies (except the session ID), not files.

The `users` table stores:
```json
{
  "id": "uuid",              // Primary key
  "email": "user@example.com",
  "password": "$2b$12$...",  // Hashed (never plain text)
  "firstName": "John",
  "lastName": "Doe",
  "emailVerified": true/false,
  "profileImageUrl": null,
  "createdAt": "2026-01-15T..."
}
```

Related tables:
- `traveler_profiles` — passport info, preferences (linked to user by `userId`)
- `call_requests` — call history (linked by `userId`)
- `itinerary_proposals` — flight proposals (linked by `userId`)
- `payments` — payment history (linked by `userId`)
- `notifications` — user notifications (linked by `userId`)
- `saved_cards` — payment cards (linked by `userId`)
- `bland_calls` — AI call records (linked by `userId`)
- `user_monitored_flights` — flights the consumer is watching (linked by `userId`)

The dashboard shows data queried from these tables via API endpoints that read from the database. Nothing is stored client-side.

---

## 7. DUFFEL vs AERODATABOX — Which Is Used and When?

**They serve completely different purposes and are NOT backups of each other:**

| Aspect | Duffel API | AeroDataBox |
|--------|-----------|-------------|
| **Purpose** | Flight **bookings** (search, price, buy tickets) | Flight **status tracking** (is it delayed/cancelled?) |
| **Data** | Future flights, schedules, prices, availability | Live operational status, delays, cancellations, history |
| **Used for** | Users searching and booking flights | Disruption monitoring, checking if flights are on time |
| **Does it book?** | ✅ Yes — creates real airline bookings | ❌ No — read-only |
| **Does it track?** | ❌ No | ✅ Yes — real-time status |
| **API cost** | Pay per booking | Pay per API call (RapidAPI) |

**Duffel** is used for the **travel concierge flow**: user requests a flight → Bland AI calls them → transcript parsed → Duffel searches flights → proposal created → user books.

**AeroDataBox** is used for the **disruption prediction flow**: agency adds flight → `monitor.ts` runs every 30min → `flightStatus.ts` calls AeroDataBox → `riskScorer.ts` combines with weather/FAA/carrier data → score computed → alerts sent.

### SerpApi (Google Flights) — The "Backup" for Duffel

SerpApi IS used as a **complement** to Duffel. Inside the flight search endpoint:

```typescript
const [offerRequest, serpApiOffers] = await Promise.all([
  duffel.offerRequests.create({...}),     // Search Duffel
  searchSerpApiFlights({...}),            // Search Google Flights
]);

const duffelOffers = offerRequest.data.offers || [];
const allOffers = mergeSerpApiOffers(duffelOffers, serpApiOffers);
```

**Both run at the same time** (Promise.all = parallel). SerpApi catches flights (especially low-cost carriers) that Duffel doesn't have. The `mergeSerpApiOffers()` function merges and deduplicates them. The "pick 3 best offers" algorithm (`pickThreeOffers`) selects from the combined pool.

**So they ARE compared — but only for flight search, not for disruption tracking.**

---

## 8. THE RISK SCORER MATH — The Exact Formula

Let me write it as a mathematical equation:

### The Score Function

```
totalScore = min(100, max(0, Σ(weight_i × signal_i)))
```

Where:
- `signal_i` = raw points for each factor (0 to max_i)
- `weight_i` = horizon-based weight (0.0 to 1.0)
- `i` ∈ {inboundDelay, atcStop, atcDelay, originWx, destWx, carrierHealth, historicalOtp, timeOfDay, dayOfWeek, connectionRisk}

### Raw Signal Functions (the "formulas" written in code):

**1. Inbound Aircraft Delay** (0-40 raw points):
```
f(delay) = 0,                    if delay <= 0
           8,                    if 1 <= delay <= 15
           16,                   if 16 <= delay <= 30
           28,                   if 31 <= delay <= 60
           40,                   if delay > 60  OR  flight cancelled
```

**2. ATC Ground Stop** (0-20 raw points):
```
f(hasStop) = 20,  if ground stop active at origin or destination
             0,   otherwise
```

**3. ATC Ground Delay** (0-15 raw points):
```
f(avgDelay) = 0,   if no ground delay program
              5,   if avgDelay >= 15 min
              10,  if avgDelay >= 30 min
              15,  if avgDelay >= 60 min
```

**4. Origin Weather** (0-20 raw points):
```
f(riskContribution) = min(20, max(0, weather.riskContribution))
```
Where `weather.riskContribution` is computed from METAR:
- Flight category: VFR=0, MVFR=5, IFR=10, LIFR=15
- Thunderstorm: +8 if present
- Freezing conditions: +5 if present
- Wind > 30 knots: +3 per 10kt over 30
- Ceiling < 1000ft: +5
- Visibility < 3 miles: +5

**5. Destination Weather** (0-15 raw points):
```
f(wx) = min(15, max(0, weather.riskContribution × 0.7))
```
(Same as origin but at 70% scale.)

**6. Carrier Health** (1-10 raw points):
```
f(cancelRate, avgDelay) = 1,   if cancelRate=0 AND avgDelay<15
                           4,   if cancelRate<5% AND avgDelay<30
                           7,   if cancelRate<15% OR avgDelay<60
                           10,  otherwise
```

**7. Historical OTP** (2-15 raw points):
```
f(onTimeRate) = 2,   if onTimeRate >= 90%
                5,   if onTimeRate >= 80%
                6,   if onTimeRate >= 70%
                10,  if onTimeRate >= 50%
                15,  if onTimeRate < 50%
```

**8. Time of Day** (0-4 raw points):
```
f(hour) = 0,  if hour < 14 (before 2pm)
          1,  if 14 <= hour < 18 (2pm - 6pm)
          2,  if 18 <= hour < 20 (6pm - 8pm)
          4,  if hour >= 20 (after 8pm)
```

**9. Day of Week** (0-4 raw points):
```
f(day) = 4,  Monday
         0,  Tuesday
         1,  Wednesday
         2,  Thursday
         4,  Friday
         1,  Saturday
         3,  Sunday
```

**10. Connection Risk** (0-5 raw points):
```
f(hour) = 0,  if hour < 10
          1,  if 10 <= hour < 14
          3,  if 14 <= hour < 18
          5,  if hour >= 18
```

### Horizon Weights (the multipliers):

**Short horizon (≤4 hours until departure):**
```
w_inbound = 1.0    (live aircraft data matters most)
w_atcStop = 1.0
w_atcDelay = 1.0
w_originWx = 0.9
w_destWx = 0.8
w_carrierHealth = 1.0
w_historicalOtp = 0.3   (barely matters — we can SEE what's happening)
w_timeOfDay = 1.0
w_dayOfWeek = 0.5
w_connectionRisk = 0.5
```

**Medium horizon (4-24 hours):**
```
w_inbound = 0.6
w_atcStop = 0.9
w_atcDelay = 0.9
w_originWx = 0.7
w_destWx = 0.6
w_carrierHealth = 1.0
w_historicalOtp = 0.6
w_timeOfDay = 0.8
w_dayOfWeek = 0.8
w_connectionRisk = 0.8
```

**Long horizon (>24 hours):**
```
w_inbound = 0.0    (plane hasn't flown yet — can't know)
w_atcStop = 0.3    (ATC too far out to predict)
w_atcDelay = 0.4
w_originWx = 0.4
w_destWx = 0.3
w_carrierHealth = 1.0
w_historicalOtp = 1.0   (best predictor far out)
w_timeOfDay = 0.6
w_dayOfWeek = 1.0
w_connectionRisk = 1.0
```

### Final Calculation Example:

Say a flight is 6 hours out (medium horizon), has 20min inbound delay, no ATC issues, MVFR weather at origin, VFR at destination, carrier health=4, historical OTP=80% on-time, departing at 7pm on Friday:

```
Raw: inbound=16, atcStop=0, atcDelay=0, originWx=5, destWx=0, 
      carrier=4, otp=5, timeOfDay=2, dayOfWeek=4, conn=5

Weighted (medium):
  inbound: 16 × 0.6 = 9.6 → 10
  atcStop:  0 × 0.9 = 0
  atcDelay: 0 × 0.9 = 0
  originWx: 5 × 0.7 = 3.5 → 4
  destWx:   0 × 0.6 = 0
  carrier:  4 × 1.0 = 4
  otp:      5 × 0.6 = 3
  timeDay:  2 × 0.8 = 1.6 → 2
  dayWeek:  4 × 0.8 = 3.2 → 3
  conn:     5 × 0.8 = 4

Total = 10 + 0 + 0 + 4 + 0 + 4 + 3 + 2 + 3 + 4 = 30

Tier: medium horizon thresholds → amber >= 22, red >= 50
30 >= 22 → AMBER (moderate risk)
```

---

## 9. ACCURACY OF THE PREDICTION — And Can It Be Improved With ML?

### Current accuracy:
There's a `health_reports` table that tracks:
- `truePositives` (correctly predicted disruption)
- `falsePositives` (predicted disruption but flight was fine)
- `falseNegatives` (missed disruption)
- `precision` and `recall` computed from these

**But the health report feature appears to be partially built** — there's an API endpoint `/api/agency/health/generate` that computes it, but it's not automatic. The accuracy depends on how well the heuristic weights were tuned.

### Likely accuracy range: 60-75% (rough estimate)
Heuristic systems like this are decent at catching obvious disruptions (hurricane at airport, aircraft stuck in another city) but miss subtle patterns. The thresholds are generous (red at 50 for medium horizon) so it probably catches most real disruptions but has false positives.

### Can supervised ML improve it?

**Yes, absolutely.** Here's what you'd need:

1. **Training data**: The `risk_score_history` table already has features + outcomes. Each row has the signals (inbound delay, weather, etc.) AND whether the flight was actually disrupted (stored when the resolution cycle runs). That's labeled training data.

2. **Features you have** (already in the signals JSONB):
   - Inbound delay, ATC status, weather category, carrier stats, time-of-day, day-of-week, OTP, connection risk
   - Also the horizon, tail number, equipment type

3. **Label**: The `resolvedStatus` column on `monitoredFlights` — "Cancelled" = 1, "Arrived" = 0, "Delayed" ≥ 30min = 1

4. **Model you'd use**: Gradient Boosting (XGBoost/LightGBM) or Random Forest. These work well on tabular data with mixed features.

5. **What would improve**: ML would learn non-linear interactions (e.g., "thunderstorms at a specific airport + specific carrier" matters more than the sum of individual signals). It would also learn optimal thresholds rather than hand-picked ones.

### Can Replit handle ML training?

**No.** Replit provides:
- **CPU only** (no GPU)
- Limited RAM (varies by tier, ~1-4GB)
- No persistent storage for models

**For ML training you'd need:**
- **Local machine** with a GPU (or Google Colab for free GPU)
- **Or cloud services**: AWS SageMaker, Google Vertex AI, or a VPS with GPU (Lambda Labs, Vast.ai)
- Model would be trained externally, exported as ONNX or TensorFlow.js, and loaded into the TypeScript server for inference
- Or you'd run a Python microservice alongside the Node.js server

---

## 10. HOW MANY API CALLS TOTAL?

Let me count every external API call the server makes:

### Per user action (booking a flight):
| Call | API | Count |
|------|-----|-------|
| Duffel suggestions | Duffel | 2 (origin + destination) |
| Duffel offer request | Duffel | 1 |
| SerpApi search | SerpApi | 1 |
| Duffel offer get | Duffel | 1 (per offer viewed) |
| Duffel component key | Duffel | 1 (per checkout) |
| Stripe PaymentIntent | Stripe | 1 (per payment) |
| SendGrid email | SendGrid | 1-3 (verify, confirm, proposal) |

### Per Bland AI call:
| Call | API | Count |
|------|-----|-------|
| Bland dispatch | Bland AI | 1 |
| Bland webhook | (incoming from Bland) | 2-4 (started, ended, transcript) |
| Duffel suggestions | Duffel | 2 (resolve origin/dest) |
| Duffel offer request | Duffel | 1 |
| SerpApi search | SerpApi | 1 |
| SendGrid email | SendGrid | 1 (guest proposal) |

### Per monitoring cycle (every 30 min per flight):
| Call | API | Count |
|------|-----|-------|
| AeroDataBox flight status | AeroDataBox | 1-3 (with fallbacks) |
| AviationWeather METAR × 2 | aviationweather.gov | 2 |
| FAA NAS Status | nasstatus.faa.gov | 1 (cached shared) |
| SerpApi (if red tier) | SerpApi | 1 (search alternatives) |
| SendGrid (if alerting) | SendGrid | 1-5 (per traveler alerted) |

### Total per monitored flight per hour: ~6-8 external API calls

### For 50 monitored flights: 300-400 API calls per hour from monitoring alone

**This is NOT cheap.** AeroDataBox charges per API hit, SerpApi charges per search. The `aerodataboxLimiter.ts` ensures 500ms spacing to avoid rate limits.

---

## 11. THE DISRUPTION ENGINE — Deeper Flow

### Step-by-step walkthrough of the FULL disruption flow:

```
1. AGENCY LOGS IN
   → POST /api/agency/auth/login
   → Sets agencyId in session

2. AGENCY ADDS A FLIGHT TO MONITOR
   → POST /api/agency/flights
   → Body: { flightNumber, carrierIata, departureDate, originIata, destinationIata, travelers: [{name, email, phone}] }
   → Server inserts into `monitored_flights` table
   → Server inserts travelers into `flight_travelers` table
   → Server immediately runs `scoreFlightOnce(flightId)` for an initial score

3. BACKGROUND MONITORING ENGINE (started at server boot)
   → setInterval(runCycle, 30 * 60 * 1000)  // every 30 min
   → Also runs once 15 seconds after boot

4. INSIDE runCycle():
   a. Query all active monitored flights for today/tomorrow
   b. For each flight, call processFlight():
      
      processFlight() does:
      
      i.   Check if historical OTP is cached (if not, fetch from AeroDataBox)
      ii.  Call scoreFlightRisk() which:
           1. Computes hoursUntilDeparture
           2. Determines horizon (short/medium/long)
           3. Makes 6 PARALLEL API calls (Promise.all):
              - getFlightStatus() → AeroDataBox
              - getAirportWeather(origin) → aviationweather.gov
              - getAirportWeather(dest) → aviationweather.gov
              - getNasStatus(origin) → FAA NAS
              - getNasStatus(dest) → FAA NAS
              - getCarrierHealth() → database query (no external API)
           4. Computes raw signals from each data source
           5. Applies horizon weights
           6. Sums weighted signals → total score (0-100)
           7. Determines tier (green/amber/red) based on horizon thresholds
           8. If cancelled: forces score to min(75) and tier to red
           9. Returns RiskScoreResult
      
      iii. Store result in risk_score_history table
      iv.  Update monitored_flights with new score/tier
      v.   If tier is RED and travelers haven't been alerted:
           1. Search for alternatives via findLowRiskAlternatives()
              - Calls SerpApi (Google Flights) for same route/date
              - Scores each alternative with scoreFlightRisk()
              - Returns up to 3 lowest-risk alternatives
           2. Store alternatives in disruption_alternatives table
           3. Call sendTravelerAlert() which:
              - Builds HTML email with disruption reason + alternative cards
              - Sends via SendGrid to each traveler
              - If SMS enabled, also sends text
           4. Mark travelers as alerted (alertSentAt = now)
      
      vi.  If AeroDataBox CONFIRMS disruption (delay >= 30min or cancelled):
           1. Send confirmation alert (different email: "Flight now confirmed delayed")
           2. Mark confirmationAlertSentAt

5. TRAVELER RECEIVES EMAIL
   → Email has: "Your flight AA4551 has high disruption risk"
   → Shows 3 alternative flights with prices and risk scores
   → "Select this flight" links: /disruption/<selectionToken>
   → "Keep my original flight" link

6. TRAVELER CLICKS LINK
   → Client loads client/src/pages/disruption/selection.tsx
   → Fetches data from /api/disruption/flight/<token>
   → Shows alternatives with departure/arrival times, prices
   → User clicks "Select this flight"
   → POST /api/disruption/select/<alternativeToken>
   → Server updates flight_travelers with their choice
   → Notifies agency: "Traveler selected alternative flight"

7. RESOLUTION CYCLE (every 6 hours)
   → For flights past departure date with no resolved status
   → Check AeroDataBox for final status (Arrived/Cancelled/Delayed)
   → Store resolvedStatus and resolvedDelayMinutes
   → After 24h with no data, mark as "status_unresolvable"
```

---

## 12. HOW ALTERNATIVE FLIGHTS ARE SEARCHED

The `findLowRiskAlternatives()` function in `alternativeFinder.ts`:

```
1. Gets the current flight's route (origin → destination) and date
2. Calls `searchSerpApiFlights()` which:
   - Hits SerpApi (Google Flights) with the same origin/destination/date
   - Returns list of candidate flights with prices, times, carriers
3. For each candidate flight (skip if same flight number):
   a. Call scoreFlightRisk() for that candidate
   b. Record the risk score
4. Filter out red-tier candidates (too risky themselves)
5. Sort remaining by risk score ascending
6. Return up to 3 lowest-risk options
7. Each option gets a random selectionToken (UUID) for the traveler link
```

**There is NO AI agent that autonomously searches.** It's a deterministic function: SerpApi search → risk score each → return top 3.

---

## 13. `Promise.all` — What Does It Mean?

```typescript
const [a, b, c] = await Promise.all([
  doSomething(),    // Starts immediately
  doAnother(),      // Starts immediately (doesn't wait for above)
  doThird(),        // Starts immediately
]);
```

`Promise.all` runs all the functions **in parallel** (at the same time). Without it, you'd wait for each one sequentially:

```typescript
// Sequential (slow)
const a = await doSomething();   // Wait 500ms
const b = await doAnother();     // Wait 500ms more
const c = await doThird();       // Wait 500ms more
// Total: 1500ms

// Parallel with Promise.all (fast)
const [a, b, c] = await Promise.all([
  doSomething(),   // 500ms
  doAnother(),     // 500ms (same time)
  doThird(),       // 500ms (same time)
]);
// Total: 500ms (all finish at roughly the same time)
```

In the risk scorer:
```typescript
const [
  statusResult,        // AeroDataBox flight status
  originWeather,       // aviationweather.gov METAR
  destinationWeather,  // aviationweather.gov METAR
  nasOrigin,           // FAA NAS status
  nasDestination,      // FAA NAS status
  carrierHealth,       // Database query
] = await Promise.all([...]);
```

All 6 calls fire at once. Total time ≈ the SLOWEST single call (usually AeroDataBox at 800-1200ms). Without Promise.all, it would take 3-5 seconds.

---

## 14. ALL DISRUPTION FACTORS — The Complete List

Here is EVERY data point the system considers:

**Real-time operational (live API calls):**
1. Current delay of the inbound aircraft arriving
2. Whether the inbound flight was cancelled
3. Current FAA ground stop programs at origin and destination
4. Current FAA ground delay programs at origin and destination
5. Current weather category at origin (VFR/MVFR/IFR/LIFR)
6. Thunderstorms at origin
7. Freezing conditions at origin
8. Wind speed/gusts at origin
9. Visibility at origin
10. Ceiling height at origin
11. Same 4-10 for destination
12. Live flight status from AeroDataBox (Scheduled/EnRoute/Delayed/Cancelled)

**Historical/aggregated:**
13. Carrier's cancellation rate in the last 24 hours
14. Carrier's average delay in the last 24 hours
15. Flight's on-time performance over the last 14 days
16. Flight's average delay over the last 14 days

**Static/heuristic:**
17. Time of day (later = riskier)
18. Day of week (Mon/Fri = riskiest)
19. Connection traffic volume by hour
20. Horizon (how many hours until departure — affects weighting)

### What is NOT considered (potential improvements):
- Airport congestion (number of scheduled departures)
- Seasonal weather patterns (hurricane season, winter storms)
- Airline crew availability
- Previous day's cancellation cascade
- Aircraft mechanical history
- Security incidents
- Airline financial health
- Political events/strikes
- **Passenger disturbance on the plane** — NOT included. This type of disruption is extremely rare and would not be predictable from the data sources used. The system focuses on operational/weather causes.

---

## 15. SHARED/SCHEMA.TS — Detailed Data Model Walkthrough

This file is the **single source of truth** for the database structure. Let me walk through every table group:

### Group 1: User System
```
users(id, email, password, firstName, lastName, profileImageUrl, emailVerified, verificationToken, passwordResetToken, passwordResetExpires, createdAt, updatedAt)
```
- `id` = UUID generated by PostgreSQL (gen_random_uuid())
- `password` = bcrypt hash (not plain text)
- `emailVerified` = false until user clicks verification link

```
sessions(sid, sess, expire)
```
- Used by connect-pg-simple for express-session storage
- `sess` = JSONB containing session data (userId, etc.)

```
traveler_profiles(id, userId, name, phone, homeAirport, passportCountry, dateOfBirth, gender, title, passportNumber, nationality, seatPreference, hotelPreference, dietaryNotes, budgetRange, loyaltyPrograms, notes, updatedAt)
```
- One profile per user (linked by userId)
- Stores everything needed to book a flight (passport details, preferences)

```
saved_cards(id, userId, cardBrand, lastFour, expiryMonth, expiryYear, cardholderName, isDefault, createdAt)
```
- NOT storing full card numbers (PCI compliance)
- Just the last 4 digits and brand so user can identify their saved card

### Group 2: Concierge Call System
```
call_requests(id, userId, tripType, destination, phone, dateFrom, dateTo, flexibility, timeWindow, status, notes, createdAt)
```
- `status` = requested → scheduled → completed → cancelled
- Created when user submits "Request a Call" form

```
bland_calls(id, callRequestId, userId, blandCallId, phoneNumber, status, duration, transcript, transcriptJson, recordingUrl, summary, variables, errorMessage, startedAt, endedAt, createdAt)
```
- `blandCallId` = Bland AI's external call ID
- `transcript` = full text of the phone conversation
- `variables` = JSONB storing Bland's analysis output + Claude summaries
- Each call_request can have multiple bland_calls (if user was called multiple times)

```
callback_requests(id, name, phone, email, status, blandCallId, transcript, summary, recordingUrl, createdAt)
```
- For the PUBLIC callback form on the landing page (no login required)

```
phone_email_map(phone, email, createdAt, updatedAt)
```
- Maps phone numbers to emails for returning callers
- Used by Bland AI's dynamic-data endpoint to identify callers

### Group 3: Proposals & Payments
```
itinerary_proposals(id, userId, callRequestId, title, summary, totalEstimate, status, createdAt)
```
- `status` = draft → sent → approved → rejected
- Created after Bland AI call is processed and Duffel search returns results

```
proposal_items(id, proposalId, type, description, priceEstimate, duffelOfferId, duffelOfferData)
```
- Line items within a proposal (one per flight segment)
- `duffelOfferData` = JSONB storing the full Duffel offer (pricing, segments, carrier)

```
payments(id, userId, proposalId, stripeCheckoutSessionId, stripePaymentIntentId, duffelOrderId, duffelBookingRef, amount, currency, status, ...)
```
- `status` = unpaid → processing → paid → failed → pending_manual
- Ties Stripe payments to Duffel bookings

```
guest_proposals(id, token, email, originIata, destinationIata, departureDate, returnDate, passengers, cabinClass, proposalData, status, createdAt, expiresAt)
```
- `token` = random UUID (used in email links)
- `proposalData` = JSONB with all flight options (prices, segments, carriers)
- `expiresAt` = 24 hours from creation
- No account needed — guest enters email on the phone call

### Group 4: Disruption Monitoring System
```
agency_accounts(id, name, contactEmail, contactName, password, plan, active, createdAt)
```
- Separate from users table
- `password` = bcrypt hashed (same as users)
- `plan` = trial (future: paid tiers)

```
monitored_flights(id, agencyId, flightNumber, carrierIata, departureDate, departureTime, originIata, destinationIata, riskScore, riskTier, lastCheckedAt, redTierFirstAt, cancelledAt, tailNumber, equipmentType, status, ...)
```
- `riskScore` = 0-100 (updated every 30 min)
- `riskTier` = green/amber/red
- `redTierFirstAt` = timestamp when first hit red (used for lead-time analysis)
- `status` = active → completed → archived

```
flight_travelers(id, monitoredFlightId, agencyId, travelerName, travelerEmail, travelerPhone, selectionToken, selectedOptionId, selectedAt, alertSentAt, ...)
```
- `selectionToken` = UUID used in disruption email link
- `selectedOptionId` = which alternative the traveler chose (null if not yet)

```
risk_score_history(id, monitoredFlightId, score, tier, signals, tailNumber, equipmentType, scoredAt)
```
- `signals` = JSONB containing the full signal breakdown (see Part 2 section 15)
- Time series — every 30-min cycle appends a new row

```
disruption_alternatives(id, monitoredFlightId, flightNumber, carrierIata, carrierName, departureTime, arrivalTime, durationMinutes, stops, price, riskScore, riskTier, offerData, selectionToken, createdAt)
```
- `offerData` = JSONB with SerpApi flight details
- `selectionToken` = UUID for traveler to select this option

```
health_reports(id, generatedAt, flightsAnalyzed, flightsFlagged, truePositives, falsePositives, falseNegatives, trueNegatives, precision, recall, avgScoreDisrupted, avgScoreOnTime, claudeSummary, rawData)
```
- Accuracy metrics for the prediction model
- `claudeSummary` = Claude-generated analysis of the report

```
user_monitored_flights(id, userId, flightNumber, carrierIata, departureDate, ...)
```
- Consumer version of monitored_flights (separate from agency)
- Users add flights via the "Monitor Flight" page

### Group 5: Hotels (Phase 2, Admin-Only)
```
hotel_searches(id, userId, callRequestId, proposalId, provider, request, status, errorMessage, rawProviderPayloadTruncated, createdAt, completedAt)
hotel_options(id, searchId, provider, providerHotelId, name, address, starRating, guestRating, images, amenities, roomName, nightlyPrice, totalPrice, currency, ...)
hotel_bookings(id, userId, hotelOptionId, paymentId, provider, providerBookingId, confirmationNumber, status, travelerDetails, ...)
```

### Group 6: Misc
```
system_settings(key, value)                              — Simple key-value config
promo_codes(id, code, overrideAmountCents, forceManual, maxUses, ...)  — Discount codes
notifications(id, userId, type, title, body, linkUrl, readAt, createdAt)  — User notifications
calendar_entries(id, userId, paymentId, proposalId, entryType, date, label, details)  — Travel calendar
trip_requests(id, paymentId, userId, type, message, createdAt)  — Cancel/change/refund requests
```

---

## 16. BLAND AI CALL FLOW — Complete End-to-End Walkthrough

```
USER JOURNEY:
=============

1. USER REQUESTS A CALL
   Page: /request-call (client/src/pages/request-call.tsx)
   → Fills form: destination, dates, phone number
   → POST /api/call-requests
   → Creates `call_requests` row with status="requested"

2. SERVER DISPATCHES AI CALL
   → Server automatically calls bland.dispatchCall():
     a. Builds the AI prompt via buildTravelConciergePrompt():
        "You are a professional travel concierge for Travnr..."
        (Full 100+ line prompt in server/lib/bland.ts)
     b. The prompt tells the AI to:
        - Greet user warmly by name
        - Ask where they want to fly (with airport disambiguation rules)
        - Ask origin (same rules)
        - Ask dates
        - Ask ONE combined preferences question
        - Ask for email
        - Recap and say "Talk soon."
     c. POST to Bland AI API: https://api.bland.ai/v1/calls
        Body includes:
        - phone_number: user's phone
        - task: the concierge prompt
        - webhook: https://travnr.com/api/bland/webhook
        - dynamic_data: https://travnr.com/api/bland/dynamic-data
        - voice: randomly picked from pool (Allan, Carl, Sophie, etc.)
        - analysis_schema: fields to extract post-call (origin, dest, dates, etc.)
     d. Stores bland_call_id in `bland_calls` table

3. BLAND AI CALLS THE USER
   → User's phone rings
   → AI agent talks naturally:
      "Hi John, this is Sophie from Travnr..."
      "Where are you looking to fly?"
      "And where are you departing from?"
      "What dates are you thinking?"
      "Before I put this together — any preferences?"
      "Perfect, you'll have your options in your inbox within a minute. Talk soon."
   
   DURING THE CALL (dynamic data):
   → When Bland needs user info, it POSTs to /api/bland/dynamic-data
   → Server looks up user by phone number in:
     1. bland_calls table (by call_id)
     2. traveler_profiles (by normalized phone)
     3. phone_email_map table
   → Returns traveler_info, booking_info, proposal_info, email_info
   → This data is injected into the AI's context mid-conversation
   → For example: "I see we already sent you options for Paris..."

4. CALL ENDS → BLAND SENDS WEBHOOK(S)
   → POST /api/bland/webhook (with x-bland-secret header)
   → Event types:
     - call.started (call is in progress)
     - call.ended (call completed — contains transcript + analysis)
   → Payload includes:
     - concatenated_transcript: full conversation text
     - summary: Bland's auto-summary
     - analysis: extracted fields (origin_iata, destination_iata, etc.)
     - recording_url: MP3 of the call
     - call_length: seconds

5. SERVER PROCESSES WEBHOOK
   a. Updates bland_calls row with transcript, summary, status
   b. If completed:
      - Updates call_request status to "completed"
      - Creates notification for user
      - Fires Claude call summary (fire-and-forget):
        POST to Anthropic with transcript
        Claude returns: { one_liner, structured: {route, dates, pax, cabin, budget, preferences}, confidence }
        Stored in bland_calls.variables.aiSummary
   c. Triggers PROPOSAL GENERATION

6. PROPOSAL GENERATION (triggerProposalGenerationOnce)
   a. parseTravelDetailsFromTranscript()
      - Extracts origin, destination, dates from transcript using:
        1. Bland's post-call analysis (high confidence)
        2. <TRAVEL_DETAILS> structured block (medium confidence)
        3. Regex fallback (low confidence — scans for IATA codes, date patterns, etc.)
   b. resolveAirport() — calls Duffel suggestions API to convert city names to IATA codes
   c. Searches Duffel API for flights matching origin/dest/dates
   d. Also searches SerpApi (Google Flights) as supplement
   e. Merges results with mergeSerpApiOffers()
   f. Picks best 2 offers (diverse carriers, budget-aware sorting)
   g. Creates itinerary_proposal row in database
   h. FIRE-AND-FORGET: sends guest proposal email:
      - Creates guest_proposals row with token
      - Builds HTML email with option cards
      - Sends via SendGrid to user's email
      - Also sends SMS if configured

7. USER RECEIVES PROPOSAL
   → Email with subject: "Your flight options from Travnr"
   → Shows 2-3 flight options with prices, times, carrier logos
   → Links to: /proposal/guest/<token>
   → Or user logs in to see in-app at /proposals

8. USER BOOKS
   → Clicks "Book this flight"
   → Enters passenger details (passenger-form.ts)
   → DuffelCardForm tokenizes credit card (PCI-compliant)
   → POST /api/duffel/book-direct or POST /api/proposals/:id/book-duffel
   → Server creates order on Duffel API
   → Payment via Stripe (if needed) or direct Duffel card payment
   → Booking reference stored in payments table
   → Confirmation email sent
   → Calendar entry created
```

---

## 17. THE "HEURISTIC SCORING" — Yes, It's Pre-Written

The entire risk scorer formula was **hand-written by a developer**. Nobody trained a model, nobody ran a regression, nobody optimized weights against historical data.

The developer sat down and thought:
- "How many points should inbound delay be worth? Let's say 0-40."
- "Should historical OTP matter 3 hours before departure? No, let's reduce its weight to 0.3."
- "When should amber trigger? Let's say 25 for short horizon, 22 for medium, 18 for long."

**These numbers are guesses**, refined by testing. A better approach would be:
1. Collect 10,000 risk_score_history rows with their resolvedStatus
2. Train an XGBoost model to predict cancelled/delayed vs on-time
3. The model would learn optimal weights, non-linear interactions, and thresholds
4. Replace the hand-written `scoreFlightRisk()` with model inference

But the current system works and is transparent — you can explain exactly why any score is what it is by looking at the signal breakdown.

---

## 18. THE HOTEL PROVIDERS — Which Is Active?

```
server/lib/hotels/providers/
├── amadeusHotels.ts    ← Searches Amadeus
├── duffelStays.ts      ← Searches Duffel Stays
├── expediaRapid.ts     ← Searches Expedia Rapid
├── hotelbeds.ts        ← Searches Hotelbeds
├── mock.ts             ← Returns fake data for testing
└── ratehawk.ts         ← Searches RateHawk
```

They're wired in `server/lib/hotels/index.ts` with a provider selection function. All configured providers are searched. Results are merged and deduplicated, then ranked by `rank.ts`.

**This is Phase 2 and admin-only.** The hotel search is NOT user-facing yet — only accessible via admin test endpoints behind `ENABLE_HOTEL_SEARCH` feature flag.

**There is no "backup"** — they're all searched simultaneously. If a provider fails, its results are skipped and the others' results are used.
