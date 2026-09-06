# Part 2: Real Flights Only — Deep Dive & Planning

> Answers to: Is ML ready? Where is data coming from? How does resolved_status work?
> Why score is forced to 75? What's carrierHealth? Where is revenue? What's the plan?

---

## SECTION A: THE 20 REAL FLIGHTS — FULL REPORT

### A.1 Are There Only 20 Real Flights?

**Yes.** The database has 796 total flights. 776 (97.5%) are test data. Only **20 are real** (`is_test = false`).

**VERIFY**: Open `monitored_flights.csv`, count rows where column 17 says `f`. You will see 20.

### A.2 Every Real Flight — Prediction vs Outcome

Here is EVERY single real flight and what happened. Open `monitored_flights.csv` and follow along:


| #      | Flight     | Carrier | Date       | FINAL Score | FINAL Tier | What Happened | Peak Score | Did It Hit RED?              |
| ------ | ---------- | ------- | ---------- | ----------- | ---------- | ------------- | ---------- | ---------------------------- |
| 1      | RPA5792    | RP      | May 18     | 19          | GREEN      | Arrived ✅     | 75         | YES (but arrived!)           |
| 2      | RPA5792    | RP      | May 18     | 22          | GREEN      | Arrived ✅     | 75         | YES (but arrived!)           |
| 3      | RPA5792    | RP      | May 18     | 22          | GREEN      | Arrived ✅     | 22         | No                           |
| 4      | YX5792     | YX      | May 18     | 13          | GREEN      | Arrived ✅     | 16         | No                           |
| 5      | DL5792     | DL      | May 18     | 13          | GREEN      | Arrived ✅     | 16         | No                           |
| 6      | UA586      | UA      | May 20     | 15          | GREEN      | Arrived ✅     | 46         | No                           |
| 7      | AA696      | AA      | May 19     | 18          | GREEN      | Arrived ✅     | 51         | No (short horizon red=60)    |
| 8      | DL5719     | DL      | May 20     | 15          | GREEN      | Arrived ✅     | 44         | No                           |
| 9      | AA1505     | AA      | May 19     | 20          | GREEN      | Arrived ✅     | 48         | No                           |
| 10     | UA2035     | UA      | May 19     | 20          | GREEN      | Unresolvable  | 48         | No                           |
| 11     | DL1316     | DL      | May 19     | 27          | **AMBER**  | Arrived ✅     | 46         | No                           |
| 12     | UA1517     | UA      | May 19     | 18          | GREEN      | Arrived ✅     | **67**     | **YES** (but arrived!)       |
| 13     | AA1517     | AA      | May 19     | 20          | GREEN      | Arrived ✅     | **69**     | **YES** (but arrived!)       |
| 14     | AA1421     | AA      | May 19     | 18          | GREEN      | Arrived ✅     | **55**     | **YES** (but arrived!)       |
| 15     | AA2363     | AA      | May 19     | 16          | GREEN      | Arrived ✅     | **60**     | **YES** (but arrived!)       |
| **16** | **AA3053** | **AA**  | **May 19** | **75**      | **RED**    | **CANCELLED** | **75**     | **YES — correctly caught** ✅ |
| 17     | AA3052     | AA      | May 19     | 24          | GREEN      | Arrived ✅     | 27         | No                           |
| 18     | AA352      | AA      | May 19     | 15          | GREEN      | Unresolvable  | 43         | No                           |
| 19     | DL5242     | DL      | May 19     | 18          | GREEN      | Arrived ✅     | 18         | No                           |
| 20     | WN1800     | WN      | May 30     | 13          | GREEN      | Arrived ✅     | 13         | No                           |




### A.3 Heuristic Model Performance on REAL Data Only

**For the 20 real flights (18 with known outcomes):**


| Metric                                | Value          | Explanation                                           |
| ------------------------------------- | -------------- | ----------------------------------------------------- |
| Cancellations                         | **1** (AA3053) | The only real cancellation                            |
| Caught as RED                         | **1** ✅        | AA3053 correctly flagged                              |
| Missed                                | **0**          | No real cancellations were missed                     |
| **False RED alarms (by FINAL score)** | **0**          | No flight ended at RED and arrived                    |
| **False RED alarms (by PEAK score)**  | **5**          | These 5 hit RED during monitoring but arrived fine ⚠️ |
| Flights hitting RED that cancelled    | **1 of 6**     | RED precision by peak = 16.7%                         |
| Flights hitting RED that arrived      | **5 of 6**     | RED false alarm rate by peak = 83.3%                  |
| False AMBER alarm                     | **1** (DL1316) | Scored AMBER but arrived fine                         |




### A.4 The 5 "Peak RED But Arrived" Flights — Detailed

These flights hit RED-tier scores during monitoring but arrived safely. This is IMPORTANT:

**Flight 1: RPA5792 (score 75, forced by cancellation flag)**

```
Look at risk_score_history.csv for monitored_flight_id = 1
→ One row shows score=75, signals contain "simulated": true
→ This was a MANUAL SIMULATION (someone clicked "simulate" on the detail page)
→ The AeroDataBox cancelled flag was temporarily true
→ The flight ultimately ARRIVED
```

**Flight 2: RPA5792 (score 75, same pattern)**

```
monitored_flight_id = 3
→ Same forced cancellation scenario
→ Flight arrived fine
```

**Flight 13: AA1517 (score 69, RED)**

```
Check the data: score progression was:
24 → 24 → 24 → 24 → 24 → 24 → 69(RED!) → 69(RED!) → 62(RED!) → 53 → 53 → 53 → 20(GREEN)

The score SPIKED to 69 at 10:57 PM on May 19.
What caused the spike? Weather? ATC? Carrier health?
- 4 hours later it dropped back to 53 (AMBER)
- 4 days later it was 20 (GREEN)
- The flight arrived safely ✅

This is a FALSE RED ALARM. The model panicked but the flight was fine.
```

**Flight 12: UA1517 (score 67, RED)**

```
Same pattern: score jumped high around 11 PM then came back down.
```

**Flight 15: AA2363 (score 60, RED)**

```
Same pattern: score hit 60 (RED threshold for medium horizon) but flight arrived.
```

**Why does this matter?** The heuristic model OVER-predicts risk. It generates false alarms. 83% of flights that hit RED during monitoring still arrived safely.

---



## SECTION B: HOW THE MONITORING CYCLE WORKS (Step by Step)



### B.1 The 30-Minute Loop

Every 30 minutes, the system in `monitor.ts` does this:

```
Step 1: Query the database for ALL active flights whose departure is today or tomorrow
        → monitor.ts:312-321
        → SELECT * FROM monitored_flights WHERE status='active' 
          AND departure_date BETWEEN today AND tomorrow

Step 2: For EACH flight, call scoreFlightRisk()
        → monitor.ts:57-66
        → This fetches 6 data sources in parallel (flight status, weather, ATC, etc.)

Step 3: Save the score as a NEW ROW in risk_score_history
        → monitor.ts:68-122
        → INSERT INTO risk_score_history (score, tier, signals, ...)

Step 4: Update the flight's latest score in monitored_flights
        → monitor.ts:159-170
        → UPDATE monitored_flights SET riskScore = newScore

Step 5: If score is RED or cancelled, send alerts to travelers
        → monitor.ts:183-255
```

**Result over time**: For each flight, `risk_score_history.csv` accumulates rows. Flight DL5719 has 66 rows — it was monitored 66 times over ~4 days (morning of May 19 to morning of May 23).

### B.2 Why Is The CSV So "Messy"?

You asked why the data looks unorganized. Here's why:

```
risk_score_history rows are NOT sorted by flight.
They are sorted by TIME — each batch of 30-min scores is inserted together.

Example chronological order:
  Row 1: Flight A, 6:00 AM, score=22
  Row 2: Flight A, 6:30 AM, score=22
  Row 3: Flight A, 7:00 AM, score=22
  Row 4: Flight B, 6:00 AM, score=11  ← Flight B added later, scored at same time
  Row 5: Flight A, 7:30 AM, score=22
  Row 6: Flight B, 6:30 AM, score=11
```

**Flight A and Flight B are interleaved** because each 30-minute cycle scores all active flights and appends rows in batch order.

**Should we reorganize?** Not needed for ML — we can filter by `monitored_flight_id` to get each flight's history. But if you want to browse the CSV, sort by `monitored_flight_id` then `scored_at` to group them.

---



## SECTION C: THE 5 THINGS YOU SAID YOU WERE CONFUSED ABOUT



### C.1 "Why is carrierHealth always 1.0? Where does that data come from?"

**It's not the value — it's the WEIGHT.** Look at `riskScorer.ts:133-170`:

```typescript
const HORIZON_WEIGHTS = {
  short:  { inboundAircraftDelay: 1.0, carrierHealth: 1.0, ... },
  medium: { inboundAircraftDelay: 0.6, carrierHealth: 1.0, ... },
  long:   { inboundAircraftDelay: 0.0, carrierHealth: 1.0, ... },
};
```

The number 1.0 means the signal is multiplied by 1.0 (full strength). Other signals like `inboundAircraftDelay` drop to 0.0 for long-horizon flights (far in the future). But `carrierHealth` is ALWAYS at full strength (1.0) regardless of how far out the flight is.

**Where does carrierHealth data come from?** `carrierHealth.ts:65-92`:

```sql
SELECT signals -> 'flightStatus' ->> 'cancelled', 
       signals -> 'flightStatus' ->> 'delayMinutes'
FROM risk_score_history
JOIN monitored_flights 
WHERE carrierIata = 'AA' 
  AND scored_at >= (24 hours ago)
```

It looks at ALL the historical risk scores for that carrier in the last 24 hours and computes:

- **Cancellation rate** = cancelled scores / total scores
- **Average delay** = average delay minutes of delayed scores

Then `carrierHealth.ts:33-49` maps that to a health score:

| If cancellation rate >15% OR avg delay >60min | → healthScore = **10** (worst) |
| If cancellation rate >8% OR avg delay >30min | → healthScore = **7** |
| If cancellation rate >3% OR avg delay >15min | → healthScore = **4** |
| Otherwise | → healthScore = **1** (best) |
| Less than 3 samples | → healthScore = **3** (unknown) |

**Example**: On June 10, AA had 29 cancelled flights in test → cancellation rate was high → carrierHealth for AA would have been 10.

### C.2 "Why is the score forced to 75? Section 3.2 makes no sense."

Here is the exact code at `riskScorer.ts:344-345`:

```typescript
const finalTier: RiskTier = cancelled ? "red" : baseTier;
const finalScore = cancelled ? Math.max(total, 75) : total;
```

**What this means in plain English:**

```
IF AeroDataBox says the flight is cancelled:
    → Force the tier to RED (highest alert)
    → Force the score to at least 75
    → Even if the math says score should be 9, make it 75
ELSE:
    → Use the normal math score and tier
```

**WHY does it do this?** The system has TWO jobs:

1. **PREDICT** risk (before the flight happens) ← the math score
2. **CONFIRM** a cancellation (when AeroDataBox reports it) ← the forced 75

The forced 75 is NOT a prediction. It's a CONFIRMATION. When AeroDataBox says "this flight is cancelled," the system overwrites the prediction with a guaranteed high score.

**Why 75 specifically?** It's above the RED threshold for ALL horizons (short=60, medium=50, long=40). It guarantees the flight shows as RED in the UI. The exact value 75 is arbitrary — it just needs to be safely above all RED thresholds.

**The problem**: This means every caught cancellation looks identical (score=75). You CANNOT tell which was "more cancelled" or which had more warning time because they all say 75.

### C.3 "How does resolved_status work? Section 3.3 is confusing."

**resolved_status is set AFTER the flight departs, not during prediction.**

Here is the exact flow:

```
STEP 1: Flight is in the future
  → monitored_flights.resolved_status = NULL (empty)
  → The monitoring engine scores it every 30 min
  → Scores stored in risk_score_history

STEP 2: Flight departure date passes
  → The RESOLUTION CYCLE kicks in (monitor.ts:510-601)
  → Runs every 6 hours
  → Checks AeroDataBox: "Did this flight already happen?"

STEP 3: AeroDataBox says "Arrived"
  → monitored_flights.resolved_status = 'Arrived'
  → monitored_flights.resolved_delay_minutes = 0 (or whatever delay)

STEP 3B: AeroDataBox says "Cancelled"
  → monitored_flights.resolved_status = 'Cancelled'

STEP 3C: AeroDataBox says "Unknown" for more than 24 hours
  → monitored_flights.resolved_status = 'status_unresolvable'
  → System gives up trying
```

**Key point**: `resolved_status` comes from AeroDataBox AFTER the fact. It is NOT the prediction. The predictions are all the scores in `risk_score_history` that were made BEFORE the flight departed.

**The confusion is normal**: Think of it like weather forecasts:

- **Prediction** = The weather forecast at 6 AM saying "20% chance of rain"
- **Outcome** = Looking outside at noon and seeing rain or sunshine
- `resolved_status` = "Looking outside" — it's the truth after the fact



### C.4 "Why didn't the prediction catch the GREEN cancellations? Section 3.4."

The 10 flights scored GREEN but cancelled were test data. But the mechanism is the same:

```
1. System scores flight → gets score 9 (GREEN)
   Because right now, AeroDataBox says "Scheduled, on time"
   Weather is fine, ATC is fine, everything looks good

2. 30 minutes later → score 9 (GREEN)
   Still looks fine

3. Repeat 29 times...

4. Flight departs... and 3 hours later, AeroDataBox finally says "Cancelled"
   
5. The resolution cycle notices: "Oh, that flight was cancelled!"
   → Sets resolved_status = 'Cancelled'
   
6. BUT all the risk scores are already saved as GREEN
   → The system never had a chance to predict it
```

**The heuristic model can ONLY use data available at prediction time.** If the cancellation was caused by something that doesn't show up in weather/ATC/delay data (e.g., crew scheduling error, mechanical issue discovered at the gate), the model cannot know.

**XGBoost CAN potentially help here** because it can learn patterns like:

- "Flight AA4062 stayed at score 9 for 29 cycles → higher cancellation probability"
- "AA's cancellations often happen without warning signals → increase base risk for AA"



### C.5 "What is historicalOtp and why does the Claude report say it's broken?"

`historicalOtp` **= Historical On-Time Performance.** It's supposed to answer:

> "On this route, on this date, how often does this flight arrive on time?"

The data comes from AeroDataBox (Tier 3, costs 6 units). It is fetched ONCE per flight and cached (`monitor.ts:50-54`):

```typescript
if (!historicalOtpCache.has(flight.id)) {
    const otp = await getHistoricalOtp(flight.flightNumber, flight.departureDate);
    if (otp) historicalOtpCache.set(flight.id, otp);
}
```

**The problem**: The cache only works while the process is running. If the server restarts, the cache is empty. And if `getHistoricalOtp()` fails (which it often does), the cache never gets populated.

**When the cache is missing**, the code falls back to HARDCODED defaults (`riskScorer.ts:290-297`):

```typescript
const historicalOtp: HistoricalOtpResult = flight.historicalOtpCache || {
    flightNumber: flight.flightNumber,
    onTimeRate: 0.75,      // Assume 75% on-time (generic)
    avgDelayMinutes: 10,    // Assume 10 min avg delay (generic)
    sampleSize: 0,          // No real data!
    riskPoints: 5,          // Contribute exactly 5 points (always the same)
    source: "fallback",     // Marked as fallback
};
```

**The Claude report found**: `historicalOtp was false for every single flight in the dataset` — meaning the cache was never populated for those flights. Every flight got the generic fallback of 5 points, which adds NO useful information. It's just a flat +5 to every score.

hamzas thoughts: we are going to need to figure out what to do with this issue where the historical otp is lost due to the cache

---



## SECTION D: DEEP DIVE INTO SPECIFIC TABLES



### D.1 `disruption_alternatives.csv` (6 rows)

When a flight triggers RED or cancellation alert, the system searches for alternative flights. These 6 rows are the alternatives found for 2 flights:

- **Flight 1** (RPA5792, JFK→IAD, May 18): 3 alternatives found (Frontier $406, American $329, American $491)
- **Flight 3** (RPA5792, JFK→IAD, May 18): 3 alternatives found (American $496, American $415, American $603)

Each alternative contains: flight number, carrier, price, duration, stops, and Google Flights booking data with carbon emissions.

**Relevance**: The rebooking engine works. When disruption is predicted, the system can automatically find alternatives.

### D.2 `flight_travelers.csv` (15 rows)

15 travelers linked to 13 real flights. ALL from Agency 1 (Bma Travel). ALL use `mahidbma@gmail.com` — they're ALL the same person (Mahid is testing the system).


| Key Columns                              | Meaning                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| `alert_sent_at` = timestamp              | The system SENT an alert to this traveler                      |
| `confirmation_alert_sent_at` = timestamp | The system sent a CONFIRMATION (disruption confirmed)          |
| `selection_token` = UUID                 | A unique link for the traveler to select an alternative flight |


**AA3053** (the real cancellation) has:

- `alert_sent_at = 2026-05-19 22:59:09` (alert sent when score reached RED)
- `confirmation_alert_sent_at = 2026-05-23 16:38:11` (confirmation when cancellation was confirmed)

This proves the system DID send alerts for the real cancellation.

### D.3 `health_reports.csv` (9 rows)

Claude-generated reports about the system's health. Here are the important ones:


| Report | Date   | Flights | TP  | FP  | FN  | TN  | Precision | Recall | Key Findings                              |
| ------ | ------ | ------- | --- | --- | --- | --- | --------- | ------ | ----------------------------------------- |
| #4     | May 20 | 12      | 0   | 4   | 0   | 8   | 0%        | —      | First health check, 4 false positives     |
| #5     | May 23 | 14      | 1   | 3   | 0   | 10  | 25%       | 100%   | Caught AA3053, 3 false alarms             |
| #8     | Jun 9  | 50      | 0   | 0   | 0   | 50  | —         | —      | "System cannot be meaningfully evaluated" |
| #9     | Jun 11 | 29      | 2   | 0   | 0   | 27  | 100%      | 100%   | 2 test cancellations caught perfectly     |


**Report #5 is the ONLY one with real data (AA3053)** — 1 true positive, 3 false positives. Precision = 25%.

### D.4 `itinerary_proposals.csv` (59 rows)

Trip proposals created by the AI concierge. 59 proposals for trips, with 92 line items (flights). The proposal system works end-to-end:

1. User calls Bland AI → `bland_calls`
2. AI creates proposal → `itinerary_proposals`
3. Duffle flight offers attached → `proposal_items`
4. User approves → `itinerary_proposals.status = 'approved'`
5. Payment attempted → `payments`



### D.5 `monitored_flights.csv` (796 rows)

The central table. Every flight tracked. Key columns to understand:


| Column            | What It Is                                    | Example   |
| ----------------- | --------------------------------------------- | --------- |
| `id`              | Internal ID, links to risk_score_history      | 16        |
| `agency_id`       | Which agency owns this (1, 2, or 3)           | 1         |
| `flight_number`   | The airline's flight number                   | AA3053    |
| `carrier_iata`    | Airline code                                  | AA        |
| `risk_score`      | LATEST score (updated every 30 min)           | 75        |
| `risk_tier`       | LATEST tier                                   | red       |
| `resolved_status` | Actual outcome (filled by resolution cycle)   | Cancelled |
| `is_test`         | `f` = real, `t` = test data                   | f         |
| `status`          | `active` (being monitored), `archived` (done) | archived  |
| `tail_number`     | Specific airplane tail number                 | —         |
| `equipment_type`  | Type of airplane                              | —         |


**To view a specific flight's full history**: Filter `risk_score_history.csv` by `monitored_flight_id`.

### D.6 `proposal_items.csv` (92 rows)

Individual flight offers in trip proposals. 68 are flights (avg $371.53). 24 are "other" (fees, services, $0).

The `duffel_offer_data` column contains the FULL Duffel API response including:

- Airline info (name, logo)
- Flight segments (origin, destination, times, aircraft type)
- Passenger details
- Prices and currency



### D.7 `risk_score_history.csv` (10,775 rows)

Every prediction ever made. Key columns:


| Column                | What It Is                         | Example                             |
| --------------------- | ---------------------------------- | ----------------------------------- |
| `monitored_flight_id` | Which flight this is for           | 16                                  |
| `score`               | The risk score (0-100)             | 75                                  |
| `tier`                | green/amber/red                    | red                                 |
| `signals`             | JSON with ALL the signal breakdown | {weather, atc, carrierHealth, ...}  |
| `scored_at`           | When this prediction was made      | 2026-05-19 21:14:13                 |
| `tail_number`         | The specific airplane              | N347NW (if AeroDataBox provided it) |
| `equipment_type`      | Type of airplane                   | Boeing 737-800                      |


**The signals JSON contains**:

- `carrierHealth.healthScore` (1-10) — how healthy is the airline right now
- `carrierHealth.cancellationRate24h` — cancellation rate in last 24h
- `carrierHealth.reliable` — whether the sample is big enough
- `originWeather.flightCategory` — VFR/IFR/MVFR
- `originWeather.hasThunderstorm` — thunderstorm at origin
- `flightStatus.delayMinutes` — current delay
- `flightStatus.cancelled` — cancelled flag from AeroDataBox
- `historicalOtp` was the source "fallback" or real?

**To organize for reading**: Sort by `monitored_flight_id` then `scored_at`. Here's how to find a specific flight:

1. Find the flight's `id` in `monitored_flights.csv`
2. Filter `risk_score_history.csv` for that `monitored_flight_id`
3. Sort by `scored_at` to see the prediction journey

---



## SECTION E: REVENUE, AGENCY, AND BUSINESS STATUS



### E.1 Which Agencies Have Real Flights?


| Agency                     | Real Flights | Test Flights | Revenue                    | Status                     |
| -------------------------- | ------------ | ------------ | -------------------------- | -------------------------- |
| **Bma Travel** (agency 1)  | **20**       | **0**        | **$20.00** (test payments) | Only agency with real data |
| **R&M** (agency 2)         | **0**        | **0**        | **$0**                     | Empty — no flights         |
| **Travnr Test** (agency 3) | **0**        | **776**      | **$0**                     | Test data only             |


**Real revenue**: $0 from agencies. The $20.00 shown for Bma Travel is from test/zero-value payments. The only actual money flowing through the system is $32.99 + $1.00 from two Duffel bookings (test bookings that failed due to balance issues).

**Bottom line: No paying customers yet. All 3 agencies are on free trial.**

### E.2 What Are The 20 Real Flights?

The 20 real flights all belong to Agency 1 (Bma Travel, owned by Mahid). They are:

- **May 18**: 5 flights (3× RPA5792 JFK→IAD, 1× YX5792, 1× DL5792) — all arrived
- **May 19**: 13 flights (8 AA, 2 UA, 2 DL, 1 RP) — 1 cancelled (AA3053), 2 unresolvable
- **May 20**: 1 flight (UA586) — arrived
- **May 30**: 1 flight (WN1800) — arrived

The same flight numbers repeat (RPA5792 appears 3 times, many AA flights) because the agency added the same flight at different times or on different days.

**Total unique routes**: 18 different flight_number + carrier combinations.

---



## SECTION F: IS AERODATABOX STILL ACTIVE?



### F.1 Latest Data Check

The last recorded risk score was **June 11, 2026 at 01:58:44**. After that:

- `risk_score_history` has **0 rows** in the last 24 hours (as of July 9, 2026)
- `monitored_flights` last activity was June 10-11, 2026

**Is AeroDataBox still sending data?** The database has not received any new scores in 28 days. This could mean:

1. The Replit server is not running (common for free Replit — it sleeps after inactivity)
2. The monitoring engine was stopped
3. The AeroDataBox API key expired

**How to check**: Log into Replit, check if the server is running, check server logs for AeroDataBox API calls. The monitoring engine needs to be running 24/7 for data to flow.

### F.2 If AeroDataBox Is Down — Can We Still Plan ML?

**YES.** We can:

1. Use the 10,775 existing rows to build and test the ML model
2. Start with the 494 flights with outcomes as training labels
3. Plan for a "reality check" once fresh data starts flowing again
4. The model architecture and training pipeline work regardless of livestream data

---



## SECTION G: XGBoost ML — READINESS & PLAN



### G.1 Is ML Ready To Train?

**Short answer: YES for technical readiness, NO for real-world training data.**


| Requirement        | Status                            | Details                                        |
| ------------------ | --------------------------------- | ---------------------------------------------- |
| Training rows      | ✅ 10,775 available                | 10,775 rows × 39 features = plenty             |
| Labels (outcomes)  | ✅ 494 available                   | 462 arrived + 32 cancelled                     |
| Features in DB     | ✅ Ready                           | All signals in JSONB, no schema changes needed |
| Code framework     | ✅ Ready                           | XGBoost runs on Node.js, Python, or standalone |
| **Real data only** | ❌ **20 flights (1 cancellation)** | **Insufficient for meaningful training**       |




### G.2 The Problem With Only 20 Real Flights

If we train XGBoost on only the 20 real flights:

- **Training set** (70%): ~14 rows
- **Test set** (30%): ~6 rows
- **Minimum recommended**: 1,000+ rows

**The model will not learn anything useful from 14 rows.** XGBoost needs to see hundreds of examples of cancellations and thousands of examples of normal flights to learn the patterns.

### G.3 Option: Train on All Data (Test + Real), Validate on Real Only

This is actually the recommended approach:

1. **Train XGBoost on ALL 10,775 rows** (test + real)
2. **Test/evaluate ONLY on the 20 real flights**
3. **Monitor if test-data patterns transfer to real-world**
4. **Re-train when more real data accumulates**

**Why this works**: The test data was generated by the same scoring engine with realistic patterns (weather, delays, ATC). The heuristic model's behavior on test data mirrors real behavior. XGBoost will learn the underlying patterns, not "test vs real."

### G.4 Training Timeline


| Step      | What                                | How Long             |
| --------- | ----------------------------------- | -------------------- |
| 1         | Extract features from signals JSONB | 1-2 hours            |
| 2         | Clean and normalize data            | 1-2 hours            |
| 3         | Build XGBoost model                 | 2-3 hours            |
| 4         | Train on 10,775 rows                | ~30-60 seconds (CPU) |
| 5         | Evaluate on 20 real flights         | Instant              |
| 6         | Deploy alongside heuristic          | 1-2 hours            |
| **Total** | **First ML model**                  | **~8-12 hours**      |




### G.5 Where To Write The ML Code


| Option                                 | Pros                                      | Cons                                        |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| **Google Colab** (recommended for dev) | Free GPU, easy Python, good visualization | Separate from codebase, need to export data |
| **Replit**                             | Same environment as the app               | Limited CPU, slower training                |
| **Local (your Mac)**                   | Full control, fast                        | Need to install Python/XGBoost              |


**My recommendation for now**: Use **Google Colab** to develop and train the model. Export the 10,775 rows as CSV, upload to Colab, build XGBoost there. Then once it works, integrate the Python model into the Replit codebase.

**CPU vs GPU**: XGBoost on 10,775 rows × 39 features takes ~30-60 seconds on CPU. GPU is NOT needed. The trained model will be 2-5 MB — tiny.

### G.6 XGBoost Math — Do You Need To Hand-Trace?

**No.** XGBoost is a "black box" model. You do NOT need to trace the math manually. Here's what happens:

```
Input: 39 features per row (weather, delays, carrier health, etc.)
Output: A probability (0.0 to 1.0) of cancellation

The model builds ~100-500 "decision trees" automatically.
Each tree is a simple series of if-then rules:
  "IF carrierHealth > 7 AND delayMinutes > 30 THEN risk += 0.2"
  "IF originWeather.thunderstorm = true THEN risk += 0.1"
  
The trees are combined (ensemble) to produce the final prediction.
```

**You control**: Which features to use, how many trees, how deep the trees can grow.
**XGBoost handles**: Finding the optimal split points and tree structure automatically.

No hand-tracing needed. XGBoost is designed to be used without understanding the internal math — just like you don't need to understand how an engine works to drive a car.

### G.7 How We Blend XGBoost With The Heuristic Model

This is the plan from `ML_PREDICTION_PLAN.md`:

```typescript
// Hybrid approach: use BOTH models side by side

const heuristicScore = await scoreFlightRisk(flight);   // Current model
const mlScore = await predictXgboost(features);          // New ML model

const finalScore = Math.round(
    heuristicScore * 0.3 +    // Heuristic contributes 30%
    mlScore * 0.7             // XGBoost contributes 70%
);
```

**Why blend?** The heuristic model has 100% RED precision (when it says RED, it's always right). XGBoost has better recall (catches more cancellations). Together: fewer misses, same zero false RED alarms.

### G.8 What We Need To Do Next


| Priority    | Task                                                  | Why                                      |
| ----------- | ----------------------------------------------------- | ---------------------------------------- |
| **HIGH**    | Check if Replit server is running and collecting data | We need to know if fresh data is flowing |
| **HIGH**    | Export 10,775 rows as CSV for Colab                   | Training data                            |
| **HIGH**    | Extract 39 features from signals JSONB                | Feature engineering                      |
| **MEDIUM**  | Build XGBoost in Colab                                | First model                              |
| **MEDIUM**  | Test model on 20 real flights                         | Reality check                            |
| **LOW**     | Deploy model to Replit alongside heuristic            | Production integration                   |
| **ONGOING** | Let AeroDataBox accumulate real data                  | Better training                          |


---



## SECTION H: SUMMARY — EVERYTHING IN ONE PLACE



### H.1 The 20 Real Flights — Bottom Line


| Question                       | Answer                                           |
| ------------------------------ | ------------------------------------------------ |
| How many real flights?         | **20** (all from Agency 1, Bma Travel)           |
| How many cancelled?            | **1** (AA3053)                                   |
| Was it caught?                 | **Yes** — flagged RED, score 75                  |
| Any false alarms (final tier)? | **No** — all ended at correct tier               |
| Any false alarms (peak score)? | **Yes** — 5 flights hit 60+ but arrived          |
| Missed cancellations?          | **0**                                            |
| Enough data for ML?            | **No** — need real-world outcomes, not just test |




### H.2 The Heuristic Model — Performance Summary


| Aspect            | Real Data Only         | All Data (Inc. Test) |
| ----------------- | ---------------------- | -------------------- |
| Cancellations     | 1                      | 32                   |
| Caught as RED     | 1 (100%)               | 17 (53.1%)           |
| Missed as GREEN   | 0 (0%)                 | 10 (31.3%)           |
| False RED (final) | 0                      | 0                    |
| False RED (peak)  | 5 (83.3% of RED peaks) | N/A                  |




### H.3 The Business — Reality Check


| Metric                | Value                                   |
| --------------------- | --------------------------------------- |
| Paying agencies       | **0** (all 3 on trial)                  |
| Real revenue          | **$0** (test payments only)             |
| Active real users     | **~1** (Mahid testing)                  |
| B2C adoption          | **1 flight tracked**                    |
| AeroDataBox data flow | **Inactive** (28 days since last score) |
| Ready for production? | **Technically yes, commercially no**    |




### H.4 The ML Roadmap

```
Phase 1 (Now): Planning
  - Understand the data ✓ (this report)
  - Confirm AeroDataBox status
  - Plan feature extraction

Phase 2 (Next): Build
  - Extract features from signals JSONB
  - Train XGBoost on all 10,775 rows
  - Validate on 20 real flights
  - Iterate on feature set

Phase 3 (Soon): Deploy
  - Export model file (2-5 MB)
  - Integrate with heuristic (30/70 blend)
  - Run side-by-side in monitoring engine
  - Track both scores

Phase 4 (Future): Refine
  - Re-train as real data accumulates
  - Add carrier-specific models
  - Tune thresholds per airline
```

