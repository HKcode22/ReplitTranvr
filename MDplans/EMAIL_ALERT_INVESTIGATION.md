# Email Alert Investigation — Why Team Mates Are Getting Delay Emails

## The Email They Received

> **Subject:** Travr for Travnr TestAction needed: Flight AA249 on 2026-07-28 — high delay risk
>
> Flight AA249 from ORD to MEX on 2026-07-28 is at high delay risk.
>
> The aircraft operating your flight is currently delayed by 84 minutes on its inbound leg.

---

## Root Cause: The Test Flight Seeder + Monitor Engine Are Sending Real Emails

There are **two things running together** that cause this:

### 1. The Test Flight Seeder Adds Real Flights Daily

`server2/lib/disruption/testFlightSeeder.ts` runs at boot and every day at 06:00 UTC. It queries **AeroDataBox** for real flights departing from:

```typescript
const SEED_AIRPORTS = ["DFW", "ORD", "ATL", "JFK", "LAX", "BOS"];
```

It fetches departures in four time buckets, selects up to 3 flights per bucket per airport, and inserts them into `clean.monitored_flights_v2` as **test flights** with `isTest = true` assigned to the **"Travnr Test" agency**.

This is where **AA249 from ORD to MEX** came from. It's a real AA flight that AeroDataBox returned as departing ORD on 2026-07-28.

### 2. The Monitor Engine Scores Them and Sends Emails

Every 60 min, `startMonitoringEngine()` (in both `server/index.ts` and `server2/index.ts` at boot) runs the scoring cycle:

```
runCycle()
  → SELECT * FROM clean.monitored_flights_v2 WHERE status = 'active' ... LIMIT 41
  → processFlight(flight)
    → scoreFlightRisk()
      → getFlightStatus()   ← calls AeroDataBox API (costs 2 units)
      → gets back: "inbound leg delayed by 84 minutes"
      → risk tier = "red" (high delay risk)
    → sendTravelerAlert()   ← sends SendGrid email to travelers
```

### 3. The Email Content is Generated Here

| What you see | Code location |
|---|---|
| `Travnr for Travnr Test` | `alertSender.ts` line 328: `from: { name: `Travnr for ${agency.name}` }` |
| `Action needed: Flight AA249 on 2026-07-28` | `alertSender.ts` line 171: subject line template |
| `The aircraft operating your flight is currently delayed by 84 minutes on its inbound leg.` | `alertSender.ts` lines 89-92: built from `flightStatus.inboundDelayMinutes` |
| `high delay risk` (red tier) | Determined by `riskScorer.ts` thresholds |

### 4. The 84 Minutes Inbound Delay

Comes from AeroDataBox API in `flightStatus.ts` (lines 310-341):

```typescript
// Either directly from the API response:
inboundDelay = arrival.delayMinutes  // = 84

// Or computed from scheduled vs actual arrival time:
inboundDelay = actualTime - scheduledTime  // = 84 min
```

This fed into `inboundDelayRaw(84)` = 40 points. Combined with other signals, total score exceeded the "red" threshold, triggering the email.

---

## Why This Is Happening Now

Both servers start their monitoring engines at boot:

| Server | File | Line | What starts |
|--------|------|------|-------------|
| `server/` (v1) | `server/index.ts` | 320 | `startMonitoringEngine()` + `startTestFlightSeeder()` |
| `server2/` (v2) | `server2/index.ts` | 320 | `startMonitoringEngine()` + `startTestFlightSeeder()` |

**v1 seeder is disabled** (returns 0). **v2 seeder is active** and seeds real flights daily.

**Both monitors are active** and both call their local `sendTravelerAlert()`. So a flight could trigger **two emails** (one from each server) if it appears in both the v1 `monitored_flights` table and the v2 `clean.monitored_flights_v2` table.

---

## Who Is Getting These Emails?

The test flight seeder creates flights with `agencyId` pointing to the **"Travnr Test"** agency. The `flight_travelers` table links travelers to flights. When `processFlight()` detects a red-tier risk, it queries pending travelers for that flight and sends each one an email via **SendGrid** (`@sendgrid/mail` package).

If team mates' email addresses are in the `flight_travelers` table for test flights, they will receive these alerts.

---

## How to Stop the Emails

1. **Disable the test flight seeder** — Comment out the `startTestFlightSeeder()` call in `server2/index.ts` line ~320. This stops new test flights from being added.

2. **Disable alert sending for test flights** — In `server2/lib/disruption/alertSender.ts`, add a check at the top of `sendTravelerAlert()`:
   ```
   if (flight.isTest) return;
   ```
   This prevents emails for any flight marked as `isTest = true`.

3. **Archive existing test flights** — Run SQL:
   ```sql
   UPDATE clean.monitored_flights_v2 SET status = 'archived'
   WHERE is_test = true AND status = 'active';
   ```
   This prevents the monitor from picking them up in future cycles.

4. **Remove team mates from flight_travelers** — If they shouldn't be receiving alerts for test flights, remove their records from the `flight_travelers` table.

---

## Summary

| Item | Answer |
|------|--------|
| **Why are emails being sent?** | The test flight seeder adds real flights → monitor scores them every 60 min → detects red risk → sends SendGrid email |
| **Which server?** | Both server/ and server2/, but server2/ is the active one |
| **What triggers "84 min inbound"?** | AeroDataBox returned arrival data showing the inbound aircraft was 84 min late |
| **Who gets the emails?** | Anyone listed in `flight_travelers` for that flight |
| **Is this a bug?** | No — it's working as designed. The test flight seeder is supposed to seed flights so the system can be demoed. The emails being sent to real people is the unintended part. |
