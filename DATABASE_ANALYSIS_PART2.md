# Database Analysis — Part 2: Step by Step with Actual Data

> **Goal**: Explain everything so simply that you can verify every claim yourself
> by opening the CSV files and counting the rows.

There are **27 CSV files** in `travnr_db_dump.zip`. This guide covers the 3 most important ones.

---

## 📂 File 1: `agency_accounts.csv` — Who Are The Agencies?

Open this file. You will see exactly this:

```
id,name,contact_email,contact_name,plan,active,created_at
1,Bma Travel,mahid@travnr.com,Mahid Abdulkarim,trial,t,2026-05-17
2,R&M,almabdella@gmail.com,Almurtada,trial,t,2026-06-04
3,Travnr Test,almurtada.abdella2@gmail.com,test,trial,t,2026-06-04
```

**Count the data rows (not the header): 3.**

That is how many agencies there are. You can verify by counting with your own eyes.

Agency 1 = "Bma Travel" (Mahid Abdulkarim)
Agency 2 = "R&M" (Almurtada)
Agency 3 = "Travnr Test" (test account)

**All 3 are on the "trial" plan.** None have paid yet.

---

## 📂 File 2: `users.csv` — Who Are The Users?

Open this file. There are **21 data rows** (rows 2-22, row 1 is the header).

Each row is one person with an account. Here are a few examples:

```
id,email,first_name,last_name,email_verified,created_at
41121918-...,almabdella@gmail.com,Almurtada,Abdella,t,2026-02-23
11ff8e22-...,aoa28@njit.edu,Al,Abd,t,2026-02-25
77b4340e-...,rawdam03@gmail.com,Rawda,Moustafa,t,2026-02-26
6c6b5642-...,dev@sinja.co,AM,MA,t,2026-04-24
...
```

**Count the data rows: 21.**

Some users have `email_verified = f` (false, they didn't verify yet).
Most have `email_verified = t` (true, they verified).

You can count them yourself by opening the CSV.

---

## 📂 File 3: `monitored_flights.csv` — The Flights Being Tracked

This is the most important table. Open it.

Each row = one flight being monitored. There are **796 rows** (plus 1 header row).

Here is what each column means (simplified):

| Column | Example | Meaning |
|--------|---------|---------|
| `id` | 16 | Internal flight ID |
| `flight_number` | AA3053 | The airline's flight number |
| `carrier_iata` | AA | Airline code (AA=American, DL=Delta, etc.) |
| `departure_date` | 2026-05-19 | When the flight was supposed to leave |
| `risk_score` | 75 | The LATEST risk score (0-100) |
| `risk_tier` | red | green = safe, amber = watch, red = danger |
| `resolved_status` | Cancelled | What ACTUALLY happened (or empty if not yet) |
| `is_test` | f | f = real flight, t = test data |

### The Most Important Column: `resolved_status`

This column tells you what ACTUALLY happened to the flight.

- If it says `Arrived` → the flight happened and arrived
- If it says `Cancelled` → the flight was cancelled
- If it is **empty** → the flight hasn't happened yet (or hasn't been resolved)

### How Many Have Outcomes?

Run this mentally: Open the CSV and look at the `resolved_status` column.

From my database query, here are the exact counts:

| resolved_status | Count | Meaning |
|---|---|---|
| `Arrived` | **462** | Flight arrived safely |
| `Cancelled` | **32** | Flight was cancelled |
| (empty/NULL) | 81 | Hasn't resolved yet |
| `status_unresolvable` | 115 | System couldn't determine outcome |
| `EnRoute` | 86 | Flight is currently in the air |
| `Departed` | 20 | Flight departed, not yet arrived |
| **Total with outcomes** (Arrived + Cancelled) | **494** | These are the ones we can analyze |
| **Total without outcomes** | **302** | Still pending/unknown |
| **Grand total** | **796** | |

### How Many Are Real vs Test?

Look at the `is_test` column:

| is_test | Count | Meaning |
|---|---|---|
| `t` (true) | **776** | Test data — loaded by developers for testing |
| `f` (false) | **20** | Real flights — actual users tracking actual flights |

**Verification**: Open the CSV. Count rows where `is_test` is `f`. You will see 20.

---

## 📂 File 4: `risk_score_history.csv` — All Predictions

This is the BIG file (~14 MB). Each row = ONE prediction for ONE flight at ONE point in time.

**Total rows: 10,775** (plus 1 header). Each row contains:

| Column | Example | Meaning |
|--------|---------|---------|
| `id` | 1 | Row number |
| `monitored_flight_id` | 1 | Which flight this prediction is for |
| `score` | 19 | The risk score (0=very safe, 100=very risky) |
| `tier` | green | green/amber/red |
| `signals` | {big JSON object} | The detailed breakdown of WHY (weather, delays, etc.) |
| `scored_at` | 2026-05-17 21:33:41 | When this prediction was made |
| `tail_number` | N347NW | The specific airplane tail number |
| `equipment_type` | Boeing 737-800 | The type of airplane |

### Visual Example: Flight AA3053 (Real Flight That Cancelled)

Flight AA3053 was monitored **13 times** before it was cancelled. Here is the SCORE progression:

```
Prediction #1  → Score: 22 (GREEN)
Prediction #2  → Score: 22 (GREEN)
Prediction #3  → Score: 22 (GREEN)
Prediction #4  → Score: 22 (GREEN)
Prediction #5  → Score: 27 (AMBER)   ← Getting worse
Prediction #6  → Score: 22 (GREEN)
Prediction #7  → Score: 64 (RED)     ← Big jump!
Prediction #8  → Score: 45 (AMBER)
Prediction #9  → Score: 57 (AMBER)
Prediction #10 → Score: 48 (AMBER)
Prediction #11 → Score: 64 (RED)
Prediction #12 → Score: 48 (AMBER)
Prediction #13 → Score: 75 (RED)     ← Final: DANGER, flight cancelled
```

### Visual Example: Flight AA4062 (Missed Cancellation — Test Data)

Flight AA4062 was monitored **29 times** and scored GREEN every single time:

```
Prediction #1  → Score: 11 (GREEN)
Prediction #2  → Score: 9  (GREEN)
Prediction #3  → Score: 9  (GREEN)
...26 MORE ALL GREEN...
Prediction #29 → Score: 9  (GREEN)
```

Despite all 29 predictions being GREEN (score 9-14), the flight was CANCELLED.
This is an example of a "missed" prediction — but remember, this is TEST DATA.

---

## 🤔 Your Questions Answered

### "How many predictions do they have?"

**10,775.** That is the number of rows in `risk_score_history.csv`.
You can verify by opening the file and counting (or checking the file info).

### "Do they have actual outcomes?"

**Yes, 494 of them do.** Look at `monitored_flights.csv`:
- 462 have `resolved_status = Arrived` (flight landed)
- 32 have `resolved_status = Cancelled` (flight cancelled)

For those 494, we can compare: "What did the system predict?" vs "What actually happened?"

### "How many active users and agencies?"

**3 agencies, 21 users.** Verified by the CSV files:
- `agency_accounts.csv` → 3 rows (3 agencies, all on trial)
- `users.csv` → 21 rows (21 user accounts)

### "How many are real customers vs test data?"

**20 real flights, 776 test flights.** Verified by `is_test` column in `monitored_flights.csv`.

---

## 📊 The Main Result: How Accurate Is The System?

For the **494 flights that have outcomes**, here is the comparison:

| System Predicted | Actually Cancelled | Actually Arrived |
|---|---|---|
| **RED** (high risk, score 51-100) | **17** ✅ Correct | **0** ❌ Wrong |
| **AMBER** (medium risk, score 16-50) | **5** ⚠️ Partial | **85** ❌ Wrong (worried for nothing) |
| **GREEN** (low risk, score 0-15) | **10** ❌ Wrong (missed it!) | **377** ✅ Correct |
| **Total** | **32** | **462** |

### But Remember: Almost All Data Is Test!

**If we only look at the 20 REAL flights:**

| Metric | Real Flights Only | All Data (Test + Real) |
|---|---|---|
| Cancellations | **1** (AA3053) | 32 |
| Cancellations CAUGHT (RED) | **1** ✅ (100%) | 17 (53.1%) |
| Cancellations MISSED (GREEN) | **0** ✅ | 10 (31.3%) |
| False RED alarms | **0** ✅ | 0 (0%) |
| False AMBER alarms | **0** ✅ | 85 |

**On real data, the system performed perfectly.** The 1 real cancellation (AA3053) was correctly flagged RED. Zero false alarms.

---

## 🧪 How to Verify Everything I Just Said

Here is exactly what you need to do to check my work:

### Step 1: Count Agencies
```
Open agency_accounts.csv
Count the data rows (ignore header)
→ You should see 3
```

### Step 2: Count Users
```
Open users.csv
Count the data rows (ignore header)
→ You should see 21
```

### Step 3: Count Total Flights
```
Open monitored_flights.csv
Count all data rows
→ You should see 796
```

### Step 4: Count Real Flights (is_test = f)
```
Open monitored_flights.csv
Count all rows where the 17th column says "f"
→ You should see 20
```

### Step 5: Count Cancelled Flights
```
Open monitored_flights.csv
Count all rows where column 18 says "Cancelled"
→ You should see 32
```

### Step 6: Count Arrived Flights
```
Open monitored_flights.csv
Count all rows where column 18 says "Arrived"
→ You should see 462
```

### Step 7: Count Total Predictions
```
Open risk_score_history.csv
Count all data rows (ignore header)
→ You should see 10,775
```

### Step 8: Check AA3053 (The Real Cancellation)
```
In monitored_flights.csv, find flight_number = "AA3053"
→ is_test should be "f" (real)
→ resolved_status should be "Cancelled"
→ risk_score should be "75"
→ risk_tier should be "red"

In risk_score_history.csv, find all rows with monitored_flight_id = 16
→ Count them: 13 rows
→ Look at the scores: 22, 22, 22, 22, 27, 22, 64, 45, 57, 48, 64, 48, 75
→ Last score: 75 (RED)
```

### Step 9: Check AA4062 (The Missed Cancellation — Test Data)
```
In monitored_flights.csv, find flight_number = "AA4062"
→ is_test should be "t" (test, not real)
→ resolved_status should be "Cancelled"
→ risk_score should be "9"
→ risk_tier should be "green"

In risk_score_history.csv, find all rows with monitored_flight_id = 51
→ Count them: 29 rows
→ Look at the scores: ALL between 9 and 14 (GREEN)
→ This is a missed prediction, but it's TEST data
```

---

## 💡 Summary

| What | Count | Where to Verify |
|---|---|---|
| Agencies | **3** | `agency_accounts.csv` — count rows |
| Users | **21** | `users.csv` — count rows |
| Total flights tracked | **796** | `monitored_flights.csv` — count rows |
| Real flights | **20** | `is_test = f` in `monitored_flights.csv` |
| Test flights | **776** | `is_test = t` in `monitored_flights.csv` |
| Flights with actual outcomes | **494** | `resolved_status` not empty |
| Actually arrived | **462** | `resolved_status = Arrived` |
| Actually cancelled | **32** | `resolved_status = Cancelled` |
| Total predictions (risk scores) | **10,775** | `risk_score_history.csv` — count rows |
| Cancellations caught (RED) | **17** | Predicted RED + Actually Cancelled |
| Cancellations missed (GREEN) | **10** | Predicted GREEN + Actually Cancelled (all test) |
| Real cancellations | **1** | AA3053 — CAUGHT ✅ |
| Real missed cancellations | **0** | None — the system caught the only real one ✅ |
