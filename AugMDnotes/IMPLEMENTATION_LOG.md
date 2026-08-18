# V3.9 Implementation Log — tracker (explained, plain-English)

> Connected to: `AugMDnotes/V3.9_DataCollectPlan.md` (the binding spec, PART 1).
> This file records **what has been implemented, what is being implemented, what
> still needs doing, and how — step by step** so any work can be audited and
> re-checked if something goes wrong.
>
> Status legend: `[x]` done · `[~]` in progress · `[ ]` pending · `[!]` blocked
> **Newest info is at the TOP of this file.** Scroll up for latest, down for history.

---

## 📍 0. WHERE WE ARE RIGHT NOW (read this first)

**We are at Phase 1 (Gate 0) — DONE ✅. Phase 2 (Gates 1–2) has STARTED: the
coverage frame is measured and sane. No money has been spent on collection yet, by design.**


| Item                           | Status                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Balance                        | ✅ **2,901 credits** (was 862) — above the 1,300 reserve+min floor                                        |
| Refill conversion              | ✅ **CONFIRMED**: `npm run refill -- 1` → 862→863 (1 unit = 1 credit)                                     |
| Migrations 0017/0018/0019/0020 | ✅ all applied (fresh boot)                                                                               |
| Watchdog config                | ✅ `budget=1900, dailyCap=1900, softStop=50, autoCollect=false`                                           |
| `npm run health`               | ✅ `PASS balance 2901 credits (live-api)` — balance bug fixed                                             |
| `npm run gate0`                | ✅ runs; `floor intact YES`, `invariant HOLDING`                                                          |
| **`npm run coverage` (Gate 1)**| ✅ **step 10 DONE**: `universeCount 4332`, `catalogCount 276`, `catalogInUniverse 267` (sane: 4332 ≥ 276) |
| Credits spent on collection    | ✅ **0** — watchdog is in safe mode, nothing started                                                      |
| ⚠️ Known hazard                | one old boot (02:07) had `autoCollect=true` (Run-button start); set the Replit Secret to prevent forever |


**What is NOT done yet (next actions, in order — full detail in §3):**

1. [ ] Verify `ADB_AUTO_COLLECT=0` took effect (`npm run logs:last | grep "watchdog started" | tail -1` → ends `autoCollect=false`).
2. [ ] (Optional) Set `ADB_MONTHLY_UNITS=60000` + `ADB_PLAN=Ultra` Secrets (values from the plan §3.2/§13).
3. [ ] **Confirm "use the plan's 6 macro-regions" (yes/no)** ← the only decision needed. **The script is already built** (`npm run build-catalog`, step 11) — waiting on your yes.
4. [ ] **Run `npm run build-catalog`** (step 11) on Replit → record the tier × region frame.
5. [ ] **Run the two-stage anchor probe** (step 12) → lock the 5-airport pool + scores.
6. [ ] Then Phase 3 gates (canary, SOFT_STOP, foreign subscriptions) → Phase 4 census → **only then** the 31-day run.

> ⚠️ **Do NOT start the 31-day run.** `ADB_AUTO_COLLECT` stays `0` until all
> gates (1–5) pass.

---

## 1. 🧭 PLAIN-ENGLISH GUIDE — WHAT WE'RE DOING + WHAT ALL THIS OUTPUT MEANS

> If you're confused, read THIS section. It explains the whole project in simple
> words, what `rl5.md` showed, and what every line of that output means. It also
> answers the questions you asked me.

### 1.1 The one-sentence goal

**We are building a scientifically valid dataset of flight-delay events** so that,
later, we can build/predict delays. To do that, we pay a data provider called
**AeroDataBox** for flight data. We get **60,000 API credits per month**, and we
must collect data for **31 days without wasting money or breaking the math**. The
whole plan is the checklist of "gates" we pass before we're allowed to start.

**We are NOT collecting data yet.** Everything so far has been *safety checks*
to make sure: (a) the money system works, (b) the code won't overspend, and (c)
we know which airports we can actually collect from.

### 1.2 The 3 commands you ran in `rl5.md`, in plain English

Your `rl5.md` file shows you ran three commands, in this order:

| Command             | What it does (plain English)                                                                       | Verdict |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| `npm run health`    | The "doctor's checkup" — is the server alive, is money OK, is data flowing?                        | ✅ balance OK, 2 things "FAIL" (explained below) |
| `npm run gate0`     | The "money report" — prints the whole monthly budget, and checks the two safety rules.              | ✅ clean |
| `npm run coverage`  | The "airport map" — asks AeroDataBox which airports it actually covers, and checks how many of OUR chosen airports are on it. | ✅ clean |

You also ran `gate0` and `coverage` a second time each — that's fine, they're
free to run and just print the same report again.

### 1.3 `npm run health` — every line explained

```
FAIL  data flow     last row 8695 min ago — data has stalled
PASS  balance       2901 credits (live-api)
PASS  rows today    0
PASS  rows total    4316
FAIL  active batch  none running right now (idle)
```

| Line | Meaning | Good or bad? |
| ---- | ------- | ------------ |
| `balance 2901 (live-api)` | You have 2,901 credits on the account right now (read live from the API, not a stale copy). | ✅ **The important one — PASS.** We needed ≥ 1,300. |
| `rows today 0` | No new data collected today. | ✅ Expected — we haven't started collecting yet. |
| `rows total 4316` | 4,316 rows already stored (from earlier testing). | ✅ |
| `data flow FAIL` | No new row has arrived in a long time (8,695 min ≈ 6 days). | ⚠️ **Expected, not a bug** — nothing has been started, so of course nothing flows. Turns green only after we begin the real run. |
| `active batch FAIL` | No collection batch is running right now. | ⚠️ **Same reason** — we haven't started anything. |

So: the "FAIL" lines are the *status "paused on purpose"*, not errors. The line
that actually matters — **balance** — is GREEN.

### 1.4 `npm run gate0` — the money report, explained

This prints the monthly budget and two safety checks. The two lines people ask
about are:

```
Latest Flight-Alert balance    2,901 credits (live-api)
Permanent floor (1000) intact  YES
Run-total invariant (≤ 57,900) HOLDING
```

| Line | Meaning |
| ---- | ------- |
| `Permanent floor (1000) intact YES` | The plan says we must **never** spend below 1,000 credits (that's the emergency cushion). Your balance is 2,901, which is above 1,000 → the floor is "intact" (safe). |
| `Run-total invariant (≤ 57,900) HOLDING` | The plan says the whole 31-day run must spend **no more than 57,900 credits**. We've spent **0** so far → 0 ≤ 57,900 → the limit "holds". "HOLDING" just means *still true / still in range*. |

Think of it like a bank account with two rules: "never go below the $1,000
cushion" (floor intact) and "never spend more than $57,900 total" (invariant
holding). Both are checked every time you run `npm run gate0`.

### 1.5 `npm run coverage` — what it did and why it matters

**Why we ran it:** before collecting data, we must prove we can actually get
data from the airports we want. AeroDataBox doesn't cover every airport in the
world, so we ask it: "which of OUR 276 chosen airports are you able to give us?"

**The output, line by line:**

```
universeCount (union)     : 4332    ← AeroDataBox covers 4,332 airports worldwide
catalogCount (ours)       : 276     ← we chose 276 airports for our dataset
catalogInUniverse         : 267     ← 267 of our 276 are collectable ✅
catalogMissingFromUniverse: 9       ← 9 of ours are NOT covered (excluded, fine)
universeNotInCatalog      : 4065    ← the other 4,065 ADB airports we don't want (fine)
byTier (ours, in universe):
  HUB       30/30                  ← all 30 big hubs collectable ✅
  MID       89/87                  ← 87 of 89 mid airports collectable
  REGIONAL  157/150                ← 150 of 157 regional airports collectable
```

**What it means:** of our 276 target airports, 267 are confirmed collectable.
The 9 missing ones (2 mid + 7 regional = 9 ✓) are simply airports AeroDataBox
doesn't cover, so we remove them from the "sampling frame" — that's a normal,
expected step, not a failure. The sanity rule from the plan is
`universe ≥ catalog` → `4332 ≥ 276` ✅.

**This is the first Phase-2 check, and it PASSED.** It's the number we record so
that later we can honestly say "our sample was drawn from a measured, known
universe."

### 1.6 Your questions, answered

**Q1. What does "floor intact YES, invariant HOLDING" mean?**
→ Explained above in §1.4. Short version: "we still have way more than the
1,000-credit safety cushion" (floor intact) and "we've spent 0 out of the
57,900-credit total budget, so the spending limit still holds" (invariant
holding). Both are GREEN.

**Q2. I set `ADB_AUTO_COLLECT=0` in Replit config, not Secrets — is that OK?**
→ Yes. Either way works as long as the value actually reaches the server. The
proof is in the log line:
`[adb-collector] watchdog started (... autoCollect=false)`.
If a fresh boot prints `autoCollect=false`, the config setting is working. The
only risk is if Replit ever starts the app *without* reading that config value —
which is why the secret is the more robust spot, but config is fine.

**Q3. Which files did you edit?**
→ Full list with line numbers in **§7** below ("THE CODE CHANGES"). The short
version: the controller (watchdog), the research-store file, the webhook
routes, the database migration list, plus 4 scripts you run on Replit
(`health`, `gate0`, `refill`, `coverage`) and `package.json` wiring them up.

**Q4. How do `npm run coverage` / `npm run gate0` / `npm run health` work? Are
they scripts?**
→ Yes, exactly. In `package.json` there is a `"scripts"` block. Each entry maps
a short name to a TypeScript file run with `tsx`:
`npm run health` → `tsx scripts/check_collection_health.ts`
`npm run gate0` → `tsx scripts/gate0_budget_report.ts`
`npm run coverage` → `tsx scripts/measure_coverage.ts`
`npm run refill` → `tsx scripts/refill_credits.ts`
They run directly from the Replit shell — no server needed.

**Q5. So... are we done? What next?**
→ We finished Phase 0 + most of Phase 1, and just did the FIRST check of Phase 2
(coverage ✅). Not done yet — next is building the stratified catalog (deciding
the exact airport mix), then the anchor probe, then more gates. **Nothing has
spent any money, and the 31-day run has NOT started.** Full roadmap in §8.

---



## 2. LATEST — RUN REPORT #4 (from `rl4.md`, 2026-08-17) — ✅ IT ALL WORKED

You pulled the code, booted, and verified. Here is the line-by-line verdict.

### 2.1 What you did and the results


| Step                                          | What the log shows                                                                                                                 | Verdict                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `git pull origin main`                        | `AugMDnotes/... IMPLEMENTATION_LOG.md, replitLogs3.md, scripts/check_collection_health.ts, scripts/gate0_budget_report.ts` updated | ✅ got all my fixes onto Replit   |
| Fresh boot (`ADB_AUTO_COLLECT=0 npm run dev`) | migrations `0017/0018/0019/0020` all `applied`                                                                                     | ✅ full S-layer stack live        |
| Watchdog                                      | `budget=1900, dailyCap=1900, softStop=50, reserve=1000, minBatch=300, autoCollect=false`                                           | ✅ safe mode                      |
| `npm run health`                              | `PASS balance 2901 credits (live-api)` + `PASS rows today 0` + `PASS rows total 4316`                                              | ✅ **the live-balance fix works** |
| `npm run gate0`                               | `Latest Flight-Alert balance 2,901 credits (live-api)`, `Permanent floor (1000) intact YES`, `Run-total invariant HOLDING`         | ✅ full budget report clean       |
| Heartbeats                                    | `balance=2901 rowsToday=0 canStart=true` (after refill)                                                                            | ✅ watchdog now *sees* the refill |




### 2.2 The heart of it — the balance went LIVE

Compare these two heartbeat lines from your own log:

```
03:54:59  heartbeat balance=862  rowsToday=0 canStart=false  ← before refill, below floor
04:04:59  heartbeat balance=2901 rowsToday=0 canStart=true   ← after refill, above floor ✅
```

`canStart=false → canStart=true` is exactly the Gate-0 result we wanted: the
controller is now **allowed** to start a batch. It will not start one on its own
because `autoCollect=false` — that is the correct safe state.

### 2.3 NEW in this log: `npm run coverage` — Phase 2 Gate 1, step 10 ✅

You ran the coverage measurement (I'd planned it as the very next step — you
beat me to it, and it works):

```
universeCount (union)     : 4332
worldScheduledCommercial  : 4072 (ATAG 2023)
catalogCount (ours)       : 276
catalogInUniverse         : 267
catalogMissingFromUniverse: 9
universeNotInCatalog      : 4065
byTier (ours, in universe):
  HUB       30/30
  MID       89/87
  REGIONAL  157/150
```

What each line means:

| Line                          | Meaning                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `universeCount 4332`          | AeroDataBox's airport list (the "universe" we can sample from) — 4,332 airports               |
| `catalogCount 276`            | Our own target catalog — 276 airports                                                        |
| `catalogInUniverse 267`       | 267 of our 276 airports are actually collectable (in the universe)                           |
| `catalogMissingFromUniverse 9`| 9 of ours (2 MID + 7 REGIONAL) aren't in ADB's feed — correctly excluded from the frame      |
| `universeNotInCatalog 4065`   | ADB has 4,065 airports we don't target — fine, we only sample our catalog                    |
| `byTier`                      | Coverage per tier: HUB 30/30 ✓, MID 89/87, REGIONAL 157/150 (totals = 276 ✓, missing = 9 ✓) |

Sanity check from the plan (`universe ≥ catalog`): `4332 ≥ 276` ✅ **Gate 1 step 10 PASSED.**
The frame is now measured and sane — this is the number we record before trusting
any sampling claim.

### 2.4 The 2 remaining `FAIL` lines — both expected (not bugs)

```
FAIL  data flow     last row 8344 min ago — data has stalled
FAIL  active batch  none running right now (idle)
```

- `data flow` **FAIL** — no batch has been started yet (pre-gates), so no new
rows. It will flip to PASS only after the first real batch after the gates.
- `active batch` **FAIL** — nothing is running because nothing was started.
Same reason.
- These are **status, not errors**. The important line — balance — now PASSES.



### 2.5 ⚠️ One thing to note: the 02:07 boot had `autoCollect=true` again

In your `logs:last` history there is a boot at `02:07:06` with
`autoCollect=true`. This is the **same Run-button / auto-restart** issue from
Run #2: Replit started the server with bare `npm run dev` (no env prefix). It
did **no damage** — balance was still 862 < 1,300, so `canStart` stayed
`false` the whole time — but it is the reason you must add the Replit Secret
(step 2 below) so this can never happen again.

---



## 3. 📋 WHAT TO DO NEXT — the exact steps from the plan (read when back in Replit)

> Source: `V3.9_DataCollectPlan.md` §17 runbook. We are here: **Phase 2 (Gates
> 1–2), step 10 done ✅, steps 11–12 next.** We are still **Phase 1 done**, no
> money spent on collection, auto-collect still OFF.

### The order, at a glance

| # | Step (from plan §17)                     | Who does it         | Status |
| - | ---------------------------------------- | ------------------- | ------ |
| 10 | `npm run coverage` → record universeCount | you (done)          | ✅ |
| 11 | **Stratified catalog build**             | **I write the script, you run it** | ⏳ next |
| 12 | **Two-stage anchor probe** → lock 5 airports | **I write the script, you run it** | ⏳ after |
| 13–15 | Phase 3: canary, SOFT_STOP test, foreign-subscription check | you + me | pending |
| 16 | Gate 0.5: inspect real payloads          | you + me            | pending |
| 17+ | Phase 4: census validation               | you + me            | pending |
| —   | FREEZE + the 31-day run                  | you + me            | **NOT YET** |

> ✅ YES — §17 ("Step-by-step runbook") is a real section of
> `V3.9_DataCollectPlan.md` (the file in the `AugMDnotes` folder). Everything
> below is taken from that file, section by section.

---

### Step A — housekeeping: how to actually check the two things

**A1. Verify `ADB_AUTO_COLLECT=0` is working (your config).**

You already put it in Replit config — good. To PROVE it took effect, run this
in the Replit shell:

```bash
npm run logs:last | grep "watchdog started" | tail -1
```

Look at the end of that line. If it ends with `autoCollect=false`, ✅ it works.
If it shows `autoCollect=true`, the config value didn't reach the server yet —
**trigger a fresh boot** (press the Run ▶ button, or save any file, which
restarts `tsx --watch`) and re-check. The value is read once at server start,
so the check only matters after a boot.

**A2. `ADB_PLAN` and `ADB_MONTHLY_UNITS` — I found the answers IN the plan.**

- `ADB_MONTHLY_UNITS = 60000` — the plan says this over and over: **"60,000 API
  units (monthly entitlement)"** (§3.2 line 146) and "Refill: **60,000 —
  monthly Ultra quota**" (§13).
- `ADB_PLAN = Ultra` — the plan's own words (§13): the refill is the **"monthly
  Ultra quota"**. So the RapidAPI plan is called **Ultra**.

So set these two Replit Secrets:

```text
ADB_MONTHLY_UNITS = 60000
ADB_PLAN = Ultra
```

> ⚠️ One honest caveat: §3.2 says "VERIFY the actual plan at Gate 0" — the plan
> *documents* Ultra/60,000, but only your teammate's RapidAPI login can 100%
> confirm what the account is actually billed as. Setting `Ultra`/`60000` from
> the plan is correct; if your teammate ever reads the RapidAPI dashboard and
> it says something else, update the value. Setting these two vars just stops
> `npm run gate0` from printing `VERIFY_AT_GATE_0`.

---

### Step B — the stratified catalog build (plan §17 step 11; §4, §6, §27.1)

**First, the main idea — this is the part that was confusing. Read slowly:**

The plan talks about THREE different lists. Do not mix them up:

| List | What it is | Size (measured) |
| ---- | ---------- | --------------- |
| **Universe** | Every airport AeroDataBox can give us (the whole "world" of available airports) | **4,332** |
| **Catalog** | The 276 airports WE chose to study (our curated list, in `adbAirportCatalog_v3.ts`) | **276** |
| **Frame** | The airports we can ACTUALLY collect from = **our catalog ∩ AeroDataBox's universe** | **267** |

**So YES — the 267 IS part of the plan.** It's not a new number I invented:
the plan §4 says the universe is measured by coverage →
`universeCount / catalogInUniverse / universeNotInCatalog`, and step 10 of the
runbook says *"Run `npm run coverage`; record universeCount / catalogInUniverse."*
`catalogInUniverse = 267` is literally the number the plan tells us to record.
Our 9 missing airports (2 MID + 7 REGIONAL) are NOT in AeroDataBox's universe,
so they can't be in the frame.

**Are we "sampling the universe" (all 4,332)?** No. The plan's own structure
(§7) collects from the **frame** (~267) using a rotating selection — 1 HUB + 2
MID + 1 REGIONAL per day. We can't sample 4,332 airports on 1,900 credits/day;
we sample **within** the frame, stratified so the sample is representative.

**What step 11 actually does — "build the stratified catalog":**

The frame (267 airports) gets organized into **cells** by
**primary strata = traffic tier × macro-region** (plan §4, §6). A "cell" is
a group like:

```text
HUB × North America   →  KJFK, KLAX, KORD, KATL, ...   (which hubs, how many)
MID × Europe          →  EDDM, LIRF, LEBL, ...         (which mids, how many)
REGIONAL × Asia       →  VVDN, WADD, ...                (which regionals, how many)
```

The plan's requirements for step 11 (§27.1 #2), verbatim:
1. Frame stratified by **traffic tier × macro-region**.
2. **No tier-empty cells** (every tier must appear in every region — this is
   the guardrail that stops the "frame is accidentally one geography" trap).
3. **Balancing variables** (international share, carrier diversity, timezone,
   network degree) **reported WITHIN each stratum, never crossed** into the
   primary strata (crossing more would explode the cell count — §4, §6).
4. `catalogInUniverse` fraction reported; **zero-yield airports stay in the
   frame**, only coverage-failed airports leave.

**The macro-regions — confirmed from the plan itself.** §23 lists the priority
regions (verbatim):

> "Priority anchor regions (bases the shortlist): North America (KLAX, KORD,
> KJFK, KATL), Europe (EGLL, EDDF, LFPG, EHAM, LEMD), Asia-Pacific (WSSS,
> RJTT/HND, VHHH/RKSI), Gulf/Africa (OMDB, OMAA), South America (SBGR, SAEZ),
> Oceania (YSSY, NZAA)."

That is **6 regions**: North America · Europe · Asia-Pacific · Gulf/Africa ·
South America · Oceania. Since they're in the plan, **we use all 6** — I will
not merge Oceania. (The 5-airport anchor pool in §13 picks one from 5 of these
6 — KLAX/EGLL/WSSS/SBGR/OMDB — but the catalog strata uses all 6.)

**Your only confirmation (yes/no):** "Use the plan's 6 macro-regions."
Once you say yes, I build the script.

**What the script will output:**

```text
Frame: 267 airports (our 276 catalog ∩ AeroDataBox universe)
Stratum (tier × region)            airports   in-universe
HUB × North America                      x           x
HUB × Europe                             x           x
... (every tier × every region)          ...         ...
REGIONAL × Oceania                       x           x
→ no tier-empty cells: ✓
Balancing within strata: intl share, carrier diversity, tz, degree — reported
```

---

### Step C — the two-stage anchor probe (plan §17 step 12; §9, §23)

**Why it exists (the main idea):** every day, the collection runs 4 slots — 1
HUB ("anchor") + 2 MID + 1 REGIONAL (§7, §8). The **anchor slot** is the
backbone of the sample. The plan currently uses a *provisional* anchor pool:
`KLAX · EGLL · WSSS · SBGR · OMDB` (§13). But §23 has a hard rule:

> "Never use the current sample's observed degree as the only basis ... is a
> feedback loop that self-justifies its own selection." And: "anchors are
> chosen by measured yield + network properties (§23), never by fame."

So we must **prove** those 5 are the right anchors with a *standardized
measurement* — not just assume famous airports are good. That measurement is
the two-stage anchor probe.

**Step C, numbers 1–3, explained in plain English:**

1. **Stage 1 — shortlist & measure (the "interview round").** We pick ~10–12
   candidate airports across regions (from §23's list). Each is probed with the
   SAME **2-hour** collection, at the SAME time-of-day and SAME weekday-class
   (so the comparison is apples-to-apples — no "peak for A, off-peak for B").
   We record three numbers per airport:
   - `rows/credit` — how much data we get per credit spent,
   - `chain-links/credit` — how many flight-to-flight connections (the
     aircraft-rotation chains) per credit,
   - `stability` — is this consistent, or one lucky day?
   We also **re-probe WSSS and OMAA** the same way as calibration (the plan
   says WSSS ≈ 331 rows/h, OMAA ≈ 127 rows/h — those become our baselines).

2. **Stage 2 — the "finalist round".** The top ~5–6 from stage 1 get a longer
   confirmation probe (more data → more confidence).

3. **Score & lock — the math.** Every candidate gets one number:

   ```text
   anchor_score =
       40%  exogenous traffic        (published schedules — NOT our data)
     + 20%  geographic / network diversity
     + 20%  carrier / international diversity
     + 20%  standardized observed yield (from the probe)
   ```

   The probe is only **20%** — a single great probe day can't override years of
   scheduled traffic (§23). **Station/API capacity is a separate PASS/FAIL gate**
   (an airport that can't physically serve enough data is disqualified) — it is
   NOT part of the score, so we never choose "easiest to collect" over "most
   useful information." The final **pool of 5 is locked with its scores** before
   the run.

**Budget:** all probing is hard-capped **inside the 1,900/day budget** (§9 "Total
probe spend hard-capped within the 1,900/day budget").

**What you will do (after I build it):** `npm run anchor-probe -- --stage 1` →
paste output → `npm run anchor-probe -- --stage 2` → paste output → we lock the
pool. **This is the first command that actually spends a few credits** — small
and capped, but it's real spend, which is exactly what the plan wants us to
verify before the full run.

---

### Step D — do NOT do these yet (the gates are there for a reason)

- ❌ Do **not** start `npm run dev` without `ADB_AUTO_COLLECT=0`.
- ❌ Do **not** delete any AeroDataBox subscriptions (that's Phase 3 step 13).
- ❌ Do **not** start the 31-day run. It waits for ALL gates 1–5 (§17).

---

### What I need from you right now (so I can build step 11)

1. Confirm **"use the plan's 6 macro-regions"** (yes/no). ← the only decision needed.
2. (Optional) Set the two Secrets from Step A2: `ADB_MONTHLY_UNITS=60000`,
   `ADB_PLAN=Ultra`, and run the A1 check command.
3. Then I build `npm run build-catalog` and hand you the exact command to run.

---



## 4. RUN REPORT #3 (from `replitLogs3.md`, 2026-08-16) — ✅ REFILL WORKED

**This is the log where we closed Gate 0's refill + conversion checks.**


| What you ran             | What the log shows                                        | Verdict                           |
| ------------------------ | --------------------------------------------------------- | --------------------------------- |
| `npm run refill`         | `creditsRemaining: 862`                                   | ✅ read-only check works           |
| `npm run refill -- 1`    | `Refilling 1 credit(s) ... Success. New balance: 863`     | ✅ **1 unit = 1 credit CONFIRMED** |
| `npm run refill -- 2038` | `Refilling 2038 credit(s) ... Success. New balance: 2901` | ✅ **full refill SUCCESS**         |
| Fresh boot               | migrations `0017/0018/0019/0020` all `applied`            | ✅ S-layer stack live              |
| Watchdog                 | `budget=1900 ... autoCollect=false`                       | ✅ safe mode                       |


**Balance math (from the log):** 862 → +1 → 863 → +2,038 → **2,901**. Now
`2,901 ≥ 1,300` so collection is *allowed* — but `autoCollect=false` keeps it
stopped. Exactly right for Gate 0.

**The 3 "FAIL" lines you were scared about — explained:**

1. `FAIL balance 866` — **a stale-read bug in the health tool, now FIXED.** It
  read the DB column (last webhook row = 866) instead of the live API
   (2,901). `check_collection_health.ts` + `gate0_budget_report.ts` now call
   `getBalance()` live first and print `(live-api)` / `(db-snapshot)`.
2. `FAIL data flow` — expected: no batch started yet (pre-gates).
3. `FAIL active batch` — expected: nothing started yet.

---



## 5. RUN REPORT #2 (from `replitLogs2.md`, 2026-08-16) — ✅ 0020 FIXED



### 5.1 What worked

- **Migration 0020 APPLIED** on the fresh 23:58 boot — the `loc_reported_utc`
fix is confirmed. All 4 airborne tables exist. **Bug closed.**
- All 4 Phase-0 migrations (`0017/0018/0019/0020`) applied.
- Watchdog config correct (`budget=1900, softStop=50, autoCollect=false`).
- **Zero credits spent** (reserve floor held everything).



### 5.2 The 3 suspicious things, explained

1. `0020 failed` **still appears (14:47, 20:06)** — those are OLD boots
  *before* your redeploy. `collector.log` is append-only, so past failures
   stay visible. The final 23:58 boot **succeeded** — that is the proof.
2. `refillToFullBudget` **changed 3138 → 2038** — expected. The number is
  `budget + reserve − balance`: old code budget 3000 → 3138; new Phase-0 code
   budget 1900 → 2038. Confirms the 1900 budget delta went live.
3. **⚠️ The real anomaly: one boot at 20:06 ran** `autoCollect=true`**.**
  Root cause: Replit's **Run ▶ button** runs bare `npm run dev` from `.replit`
   (no `ADB_AUTO_COLLECT=0`). Your shell command was correct. Nothing spent
   because balance < 1,300. **Fix:** Replit Secrets `ADB_AUTO_COLLECT=0`.



### 5.3 Refill question answered

YES — you can refill without the RapidAPI dashboard because your teammate
added billing. `refillBalance()` (`aerodataboxLimiter_v3.ts:147`) sends only
`x-rapidapi-key`; RapidAPI honors it because the *account* carries the payment
method. Use `npm run refill -- N`.

---



## 6. RUN REPORT #1 (from `replitLogs1.md`, 2026-08-16) — 0020 bug found + fixed



### 6.1 What worked

- Server booted (`[express] serving on port 5000`).
- Migrations `0018/0019` applied.
- **Phase 0 R-delta config LIVE**: `budget=1900, dailyCap=1900, softStop=50, autoCollect=false` — the code changes were active on first real run.
- `npm run health` + `npm run gate0` both ran.
- Zero credits spent.



### 6.2 What failed — the 0020 bug you spotted

```
[migrations] failed to apply 0020_collection_v39_airborne_time_series.sql:
        column "loc_reported_utc" does not exist
```

**Why:** migration 0020's index referenced `loc_reported_utc`, but that column
was missing from the table definition. PostgreSQL refused, and because the file
is one transaction, **all 4 airborne tables rolled back**.

**Fix (already applied):**

- `migrations/0020_collection_v39_airborne_time_series.sql` — added
`loc_reported_utc TIMESTAMPTZ` to `raw_airborne_events`.
- `server/lib/disruption/flightDataPrePostStore_v3.ts` — airborne insert now
writes `loc_reported_utc` (column list + values updated 32→33 params).
- Verified: every index column exists; typecheck clean.



### 6.3 The blocker then

Balance 862 < reserve+min (1,300) → collection paused by design. This is what
Gate 0 fixed (refill → 2,901).

---



## 7. 🔍 THE CODE CHANGES AND WHERE — for your curiosity

Everything below is Phase 0 work already in the repo. Read the files to see it.

### 7.1 `server/lib/disruption/adbCollectionController_v3.ts` (the "watchdog")


| Change                                                                            | Where                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Budget default 3000 → **1900**                                                    | `:81` (`batchBudget`)                                                                      |
| Reserve floor 1000                                                                | `:82` (`reserveCredits`)                                                                   |
| Min batch 300                                                                     | `:84` (`minBatchCredits`)                                                                  |
| Daily cap 1900                                                                    | `:95` (`dailyCreditCap`)                                                                   |
| SOFT_STOP margin 50 (stops at 1900−50=1850)                                       | `:102` (`softStopMargin`)                                                                  |
| `ADB_AUTO_COLLECT=0` disables auto-start                                          | `:124-125` (`autoCollect`)                                                                 |
| `maxDeliveryRetries = 0` (1 item = 1 credit)                                      | around `:376` + batch creation                                                             |
| R6 template freeze: refuses wrong window shape / tier mix / crossover-2-without-1 | `readRunTemplate` `:265`, `checkTemplateFreeze` `:331`, called in `startBatchInner` `:593` |
| R7 versioned manifest stamped at batch start                                      | `writeManifest` `:284`, `readManifest` `:319`, called `:709`                               |
| Crossover block completion recorded                                               | `stopBatch` writes `crossover_block_done` `:785`                                           |
| `sampling_weight` stays NULL (removed illegal `1/p`)                              | batch-create SQL                                                                           |




### 7.2 `server/lib/disruption/flightDataPrePostStore_v3.ts` (the "research store")


| Change                                                                                  | Where                                  |
| --------------------------------------------------------------------------------------- | -------------------------------------- |
| `researchEventKey()` — SHA-256 key `evt                                                 | flight                                 |
| `appendResearchEvents()` — writes `flight_events` + `raw_airborne_events`, never throws | `:252`                                 |
| Airborne insert writes `loc_reported_utc` (the 0020 fix)                                | `:280`, `:308`, `:343`, `:365`, `:376` |




### 7.3 `server/routes_v3.ts` (the webhook ingress)


| Change                                                         | Where      |
| -------------------------------------------------------------- | ---------- |
| Imports `appendResearchEvents`, `researchEventKey`             | `:39-40`   |
| Webhook handler calls `appendResearchEvents(...)` after upsert | `:170-172` |




### 7.4 Migrations (schema)


| File                                                       | What                                                                                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/0018_collection_v39_delivery_failure_flag.sql` | R5: delivery-failure flag + pause                                                                                                   |
| `migrations/0019_collection_v39_population_and_events.sql` | S1 `flight_population`; S2 raw envelope on `adb_ingest_events`; S3/S4 `flight_events` (event_key, 4 timestamps, 8 ASPM milestones)  |
| `migrations/0020_collection_v39_airborne_time_series.sql`  | S5: `raw_airborne_events`, `clean_airborne_points`, `flight_trajectory`, `flight_airborne_snapshots` (+ the `loc_reported_utc` fix) |
| `server/db.ts`                                             | `BOOT_MIGRATIONS` now lists `0018/0019/0020` (`:37-39`)                                                                             |




### 7.5 Scripts (run from the Replit Shell)


| File                                 | Command                 | What                                                    |
| ------------------------------------ | ----------------------- | ------------------------------------------------------- |
| `scripts/gate0_budget_report.ts`     | `npm run gate0`         | Budget-partition report (§3.2) — now reads live balance |
| `scripts/check_collection_health.ts` | `npm run health`        | PASS/FAIL health — now reads live balance               |
| `scripts/refill_credits.ts`          | `npm run refill [-- N]` | Read balance / refill N credits (1 unit = 1 credit)     |
| `scripts/credit_canary.ts`           | `npm run canary`        | R1 exclusivity assert + R3 credit math (Phase 3)        |
| `scripts/measure_coverage.ts`        | `npm run coverage`      | Phase 2: airport coverage (universe/catalog)            |
| `scripts/build_stratified_catalog.ts`| `npm run build-catalog` | Phase 2 step 11: stratified frame (tier × macro-region) |
| `package.json`                       | —                       | `refill`, `gate0`, `coverage`, `build-catalog` scripts  |


---



## 8. THE PHASES (the whole journey, from the plan §17)


| Phase | Name            | What it is, in plain English                                                                                     | Status                                                   |
| ----- | --------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **0** | Code deltas     | Make the code safe, budget-protected, scientifically valid. No money spent.                                      | ✅ DONE                                                   |
| **1** | Gate 0          | Record plan/units/balance, one 1-credit refill, confirm 1 unit = 1 credit, print budget report, commit manifest. | ⏳ NEARLY DONE (refill + conversion ✅; report ✅; manifest ⏳) |
| **2** | Gates 1–2       | `npm run coverage` (✅ step 10 done), stratified catalog (✅ script built, ⏳ run after user confirms 6 regions), anchor probe (step 12 ⏳) → lock 5 airports. | ▶️ IN PROGRESS (step 10 ✅, 11 almost, 12 next) |
| **3** | Gates 3–4 + 0.5 | Delete foreign subscriptions, credit canary, SOFT_STOP test, inspect real payloads.                              | pending                                                  |
| **4** | Gate 5          | Census validation (FIDS population vs webhook events).                                                           | pending                                                  |
| **5** | FREEZE          | Write versioned manifest, hash test rows. Config cannot change after.                                            | pending                                                  |
| **6** | 31-day run      | Real run: 1,900 credits/day × 31 days.                                                                           | pending                                                  |


**Key rule:** the 31-day run (Phase 6) waits for all gates (1–5) to pass.

---



## 9. THE MONEY NUMBERS (why the budget matters)


| Number          | Meaning                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **60,000**      | Total monthly API units (real entitlement — VERIFY at Gate 0)                                         |
| **57,900**      | *Spendable* experimental envelope = 58,900 refill − 1,000 floor. **Binding limit for the whole run.** |
| **1,900/day**   | Daily credit ceiling (~60,000 ÷ 31). Watchdog never exceeds it.                                       |
| **1,000 floor** | `ADB_RESERVE_CREDITS` — controller refuses to spend below this.                                       |
| **1,000 REST**  | Separate line for census/FIDS/probes — never from the 57,900 envelope.                                |


Arithmetic: `57,900 + 1,000 floor + 1,000 REST + 100 unallocated = 60,000 ✓`

---



## 10. HOW TO RUN ON REPLIT (commands)


| Purpose                                        | Command                           |
| ---------------------------------------------- | --------------------------------- |
| Start server, NO auto-collect (safe)           | `ADB_AUTO_COLLECT=0 npm run dev`  |
| Start server, auto-collect ON (run phase only) | `npm run dev`                     |
| Live log stream                                | `npm run logs`                    |
| Last 200 log lines (paste back)                | `npm run logs:last`               |
| Full recent log                                | `tail -n 1000 logs/collector.log` |
| Health check                                   | `npm run health`                  |
| Budget report                                  | `npm run gate0`                   |
| Refill / check balance                         | `npm run refill [-- N]`           |
| Canary (Phase 3)                               | `npm run canary`                  |
| Coverage (Phase 2, step 10)                    | `npm run coverage`                |
| Stratified catalog (Phase 2, step 11)           | `npm run build-catalog`           |
| Typecheck                                      | `npm run check`                   |


**To see after a fresh safe boot (the "good" log):**

- `[migrations] applied 0018/0019/0020...` → migrations worked
- `[adb-collector] watchdog started (window=4h, budget=1900 ... autoCollect=false)` → config correct
- `canStart=true` → balance OK (after refill)
- any `error` / `⚠ ALERT` lines → paste back to me

---



## 11. AUDIT SNAPSHOT (what existed before Phase 0 — for the record)


| Item                                       | Plan delta                | Code state at audit              | Verified  |
| ------------------------------------------ | ------------------------- | -------------------------------- | --------- |
| Credit accounting (ledger + balance delta) | V3.9 §11, migration 0017  | exists                           | `git log` |
| `maxDeliveryRetries = 0`                   | §15 R-delta / §45.5       | controller + canary              | grep      |
| Daily credit cap 1,900                     | §3.3 / DD-R               | `:95`                            | read      |
| `ADB_BATCH_BUDGET` default                 | §22 fix 3 (must be 1900)  | ❌ was 3000 → FIXED (§7.1)        | read      |
| R1 subscription exclusivity                | §15                       | canary assert — FIXED            | read      |
| R3 credit canary                           | §15                       | `credit_canary.ts` — present     | read      |
| R7 versioned manifest                      | §15                       | `writeManifest` — FIXED          | read      |
| R2 SOFT_STOP margin                        | §15                       | `:102` — FIXED                   | grep      |
| R5 delivery-failure flag                   | §15, migration 0018       | — FIXED                          | ls        |
| R6 crossover template freeze               | §15                       | — FIXED                          | grep      |
| S1–S5 population/airborne layers           | §15, migrations 0019–0020 | — FIXED                          | ls        |
| Gate-0 budget-partition report             | §17 step 3                | `gate0_budget_report.ts` — FIXED | grep      |


---



## 12. CHANGE LOG (append-only, newest first)



### 2026-08-17 — `npm run build-catalog` implemented (Phase 2 step 11)

- **New script `scripts/build_stratified_catalog.ts`** + `build-catalog` in
  `package.json`. Builds the stratified sampling frame: our 276 catalog ∩
  AeroDataBox universe → **primary strata = traffic tier × macro-region**
  (plan §4/§6/§27.1). Uses the plan's own 6 macro-regions (§23).
- Verifies plan requirements: **no tier-empty cells**, `catalogInUniverse`
  fraction, missing-from-universe list, zero-yield stays in frame.
- **Tested locally** (mocked coverage): 18 cells (3 tiers × 6 regions), all 276
  ICAOs mapped, no empty cells. **0 new TS errors** (typecheck clean for the new
  file; the 57 pre-existing errors in `server/routes.ts` + client are untouched).
- Needs user yes/no on "use the plan's 6 macro-regions" then run on Replit.

### 2026-08-17 — Step-by-step detail added for Steps A–C (from the plan)

- **Step A answered from the plan:** verification command for `ADB_AUTO_COLLECT`
  (`npm run logs:last | grep "watchdog started" | tail -1` → must end
  `autoCollect=false`); `ADB_MONTHLY_UNITS = 60000` and `ADB_PLAN = Ultra`
  (both documented in the plan §3.2/§13 — no need to ask the teammate).
- **Step B clarified the three lists** (universe 4,332 / catalog 276 / frame
  267 = catalog ∩ universe). Confirmed **267 is the plan's own recorded number**
  (§4, step 10). **We do NOT sample the whole universe** — we sample the frame.
- **Macro-regions confirmed from the plan §23 (verbatim): 6 regions** — North
  America, Europe, Asia-Pacific, Gulf/Africa, South America, Oceania. No merge.
- **Step C anchor probe explained in plain English** — why (prove anchors by
  measured yield, not fame §23), the interview/finalist rounds, the fixed
  scoring formula, capacity as a separate gate, and that probing is the first
  real (small, capped) spend.
- Updated §0 next-actions + §8 phases to reflect the 6-region choice pending
  user yes/no.

### 2026-08-17 — Next-steps section rewritten from the plan (§3)

- Rewrote **§3 WHAT TO DO NEXT** into the full plan-ordered steps: Step A
  (housekeeping: Secret + VERIFY placeholders), Step B (stratified catalog
  build = plan §17 step 11 + §4: primary strata tier × macro-region, balancing
  variables within), Step C (two-stage anchor probe = step 12 + §9/§23:
  standardized probes, fixed scoring formula, capacity as feasibility gate),
  Step D (what NOT to do yet). Added the plan's priority macro-regions and the
  exact "what I need from you" list.
- Updated the §0 dashboard next-actions and §8 phases table to match.
- Awaiting user decision on the 5 macro-regions before building
  `npm run build-catalog`.

### 2026-08-17 — Plain-English guide added + coverage recorded + renumber

- Added **§1 PLAIN-ENGLISH GUIDE**: what we're doing, what `rl5.md` shows, and
  every line of `health` / `gate0` / `coverage` explained in simple words.
- Answered the user's questions in the log itself (§1.6): "floor intact /
  invariant HOLDING" meaning, `ADB_AUTO_COLLECT=0` in Replit config vs Secrets,
  which files were edited, and how `npm run <x>` scripts work.
- Recorded the **`npm run coverage` result (Phase 2 step 10 ✅)**:
  `universeCount 4332`, `catalogCount 276`, `catalogInUniverse 267`
  (sanity: 4332 ≥ 276 ✓).
- Renumbered all sections (old §1→§2 … §11→§12) to fit the new §1 guide.
- `rl5.md` = the same run as `rl4.md` plus the coverage output (health/gate0
  duplicated). No new failure; the 2 `FAIL` lines remain expected (pre-gates).



### 2026-08-17 — Run #4 analyzed (`rl4.md`); log reorganized

- **Run #4 = SUCCESS.** User pulled the code, booted, ran `npm run health`
(now `PASS balance 2901 credits (live-api)`) and `npm run gate0` (balance
2,901, floor intact, invariant HOLDING). Heartbeats: `balance=2901 canStart=true` after refill; `autoCollect=false`; zero credits spent.
- **Note:** an old 02:07 boot again showed `autoCollect=true` (Run-button
start). No damage (balance was low). Action: Replit Secrets
`ADB_AUTO_COLLECT=0`.
- **gate0 placeholders** `VERIFY_AT_GATE_0` come from env vars `ADB_PLAN` /
`ADB_MONTHLY_UNITS` (`gate0_budget_report.ts:43-44`) — fill from teammate.
- **Reorganized this log:** newest-on-top layout, added a "WHERE WE ARE NOW"
dashboard, added a code-changes reference (§7), moved run reports newest-first.



### 2026-08-16 — Run #3 analyzed (`replitLogs3.md`) + live-balance fix

- Refill SUCCESS: 862 → `-- 1` → 863 (conversion confirmed) → `-- 2038` → 2901.
- **Fixed stale-read bug:** `check_collection_health.ts` + `gate0_budget_report.ts`
now read balance LIVE from AeroDataBox (`getBalance()`), print `(live-api)` /
`(db-snapshot)`.
- Report added (§3 here).



### 2026-08-16 — Run #2 analyzed (`replitLogs2.md`)

- Migration 0020 CONFIRMED APPLIED; `3138→2038` explained (budget 3000→1900).
- autoCollect mystery solved (`.replit` Run button has no env prefix).
- Refill now possible via API key (teammate added billing); added
`scripts/refill_credits.ts` + `npm run refill`.

