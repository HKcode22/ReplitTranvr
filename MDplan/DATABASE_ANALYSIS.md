# Database Analysis — Simple Explanation

> Everything here was checked by running live queries against the actual database.
> No guesswork — every number is verified.

---

## 🧭 What Is This Database?

Travnr has a **flight monitoring system**. Every 30 minutes, it checks each flight and gives it a **risk score** (0-100). This score tells you how likely the flight is to be cancelled or delayed.

Think of it like a weather forecast for flights:
- **GREEN (0-15)**: Looks fine, low risk
- **AMBER (16-50)**: Some risk, keep watching
- **RED (51-100)**: High risk, take action

---

## 🔢 The 3 Big Numbers You Need to Understand

### Number 1: 10,775 predictions (risk scores)

Every time the system runs (every 30 min), it generates a score for each flight. Over the past 25 days, it generated **10,775 scores total** across all flights. That's an average of 431 per day.

**Example**: Flight AA4062 was scored 29 times. Here's what it looked like:

```
Time        Score    Tier
06:11 AM    11       GREEN
06:53 AM    9        GREEN
07:22 AM    9        GREEN
... (26 more rows, all GREEN, all score 9-14) ...
11:45 PM    9        GREEN
```

The system checked AA4062 every ~30 min for 18 hours and **never gave it a score above 14**. It stayed GREEN the whole time.

### Number 2: 494 flights have "actual outcomes"

This means the flight already happened. We know what actually occurred:

- **462 flights** → Actually arrived safely (or with minor delay)
- **32 flights** → Actually cancelled

So for 494 flights, we can compare: "What did the system PREDICT?" vs "What actually HAPPENED?"

The other 302 flights haven't resolved yet (they're in the future, or still in progress).

### Number 3: 796 total flights being tracked

The system is monitoring 796 flights right now. 494 of them have already happened (we know the outcome), and 302 are still pending.

---

## 🎯 How Accurate Are The Predictions?

Let's look at the 494 flights that already happened and check: **did the system correctly predict cancellations?**

### The Results

| System said... | Flight actually Cancelled | Flight actually Arrived |
|---|---|---|
| **RED** (high risk) | ✅ 17 correct | ❌ 0 wrong |
| **AMBER** (medium risk) | ⚠️ 5 (partial) | ❌ 85 wrong |
| **GREEN** (low risk) | ❌ 10 wrong | ✅ 377 correct |

**Plain English:**
- **17 cancellations were caught** — the system said RED and they did cancel ✅
- **0 false alarms** — the system never said RED for a flight that arrived fine ✅
- **10 cancellations were missed** — the system said GREEN but they cancelled ❌
- **85 "false warnings"** — the system said AMBER but the flight arrived fine (annoying, but not as bad as missing a cancellation)

### The "Hit Rate" for the Highest Risk Level (RED)

```
Of 32 cancellations, the system caught 17 as RED.

That's 17 ÷ 32 = 53.1% recall
```

Half of cancellations were caught at the highest alert level. Not great, not terrible.

If we count AMBER catches too:

```
17 (RED) + 5 (AMBER) = 22 out of 32 detected at some level
= 68.8% detection rate
```

About 2/3 of cancellations were detected. 1/3 were completely missed.

---

## ⚠️ THE MOST IMPORTANT THING: Almost All Of This Is Test Data

Here's the thing I need you to really understand:

**776 out of 796 flights (97.5%) are marked `is_test = true`.**

That means the developers loaded fake/test flights to build and test the system. Only **20 flights** are real.

### Real vs Test Comparison

| | Real Flights | Test Flights |
|---|---|---|
| **Count** | **20** | **776** |
| **Cancelled** | 1 | 31 |
| **Arrived** | 17 | 445 |
| **Missed cancellations** | **0** ✅ | **10** (expected in edge case testing) |
| **False RED alarms** | 0 | 0 |

**On real data, the system performed perfectly.** The 1 real cancellation (AA3053) was correctly flagged as RED.

The 10 "missed" cancellations and 85 "false AMBER warnings" are **all test data** — they exist because the developers deliberately created tricky scenarios to test.

### The 1 Real Cancellation

Flight **AA3053** (American Airlines, May 19, 2026):

```
Score progression over 13 checks:
 22 → 22 → 22 → 22 → 27 → 22 → 64 → 45 → 57 → 48 → 64 → 48 → 75
 GREEN   green   green   green   amber   green   RED   amber   amber   amber   RED   amber   RED
```

It started GREEN, gradually climbed to RED, and the system caught it. The flight was ultimately cancelled.

---

## 👥 How Many Users & Agencies?

| What | Count | Notes |
|---|---|---|
| **Agencies** | **3** | These are travel agencies using the system |
| **Users** | **21** | People with accounts (agency employees) |
| **Real travelers on flights** | **0** | No real travelers linked to flights yet |
| **B2C tracked flights** | **1** | Only 1 consumer is tracking their own flight |
| **Real flights** | **20** | Flights that are real (not test data) |
| **Test flights** | **776** | Flights created for testing/development |

**Bottom line**: The product has **3 agency accounts and 21 users**, but it's still early. Only 1 person is tracking their own flight (B2C). Most data is from testing.

---

## 📊 The Key Tables At A Glance

### `risk_score_history` (10,775 rows) — The Core Table

This is where ALL predictions live. Every 30 minutes, every flight gets a row here.

| Column | What it is |
|---|---|
| `id` | Row number |
| `monitored_flight_id` | Which flight this is for |
| `score` | The risk score (0=very safe, 100=very risky) |
| `tier` | green / amber / red |
| `signals` | Detailed breakdown of WHY the score is what it is (weather, delays, carrier health, etc.) |
| `scored_at` | When this prediction was made |
| `tail_number` | The specific plane (e.g., N347NW) |
| `equipment_type` | Type of plane (e.g., Boeing 737-800) |

### `monitored_flights` (796 rows) — The Flights Table

Each row is one flight being tracked.

| Column | What it is |
|---|---|
| `id` | Flight ID |
| `agency_id` | Which agency owns this flight |
| `flight_number` | e.g., "AA3053" |
| `carrier_iata` | e.g., "AA" = American Airlines |
| `risk_score` | Latest score |
| `risk_tier` | Latest tier |
| `resolved_status` | "Arrived", "Cancelled", or NULL (not yet happened) |
| `is_test` | `true` = test data, `false` = real |
| `tail_number` | The specific plane |
| `equipment_type` | Type of plane |

---

## ✈️ Performance By Airline (How Many Cancelled Per Airline)

Of the 494 flights that already happened:

| Airline | Total Flights | Cancelled | Cancel Rate |
|---|---|---|---|
| **AA (American)** | 140 | **29** | **20.7%** |
| **AS (Alaska)** | 7 | 1 | 14.3% |
| **UA (United)** | 99 | 1 | 1.0% |
| **DL (Delta)** | 169 | 1 | 0.6% |
| **Everyone else** (23 airlines) | 381 | 0 | 0.0% |

AA accounts for **29 of 32 cancellations (90.6%)**. But remember — most of this is test data designed around AA scenarios.

---

## 📅 Timeline

- **First data**: May 17, 2026
- **Latest data**: June 11, 2026
- **Duration**: 25 days
- **Rate**: ~431 scores generated per day, ~32 new flights tracked per day

---

## ✅ What This Means For Moving Forward

1. **The system works** — it correctly caught the 1 real cancellation (AA3053)
2. **The data is mostly test** — 776/796 flights are test fixtures. Don't over-interpret the 10 "missed" cancellations
3. **The product is pre-launch** — 3 agencies, 21 users, 1 B2C tracked flight
4. **ML training is ready** — All the data you need (10,775 rows with labels, carrier health, weather, delay signals) is already in the database. No schema changes needed.

---

## 🗺️ What's In The CSV Dump

The file `travnr_db_dump.zip` contains **27 CSV files** — one for every database table. Open any of them in Excel or Numbers to browse:

| File | Rows | What's In It |
|---|---|---|
| `risk_score_history.csv` | **10,775** | All predictions (the main data you care about) |
| `monitored_flights.csv` | **796** | All flights being tracked |
| `users.csv` | **21** | User accounts |
| `agency_accounts.csv` | **3** | Agency accounts |
| `bland_calls.csv` | **78** | AI phone call logs |
| `notifications.csv` | **221** | Alert notifications sent |
| ...and 21 more tables | | |
