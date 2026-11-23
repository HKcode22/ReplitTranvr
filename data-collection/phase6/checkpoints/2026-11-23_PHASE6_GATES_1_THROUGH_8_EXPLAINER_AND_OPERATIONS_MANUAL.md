# Phase 6 Comprehensive Explainer & Operations Manual: Gates 1–8, Failure Salvage, and Day 1 Execution

**Document Version:** 1.0.0  
**Repository:** `HKcode22/ReplitTranvr`  
**Target Main Commit:** `c8e065d665ccacb6d2575070e94c5500b7583044`  
**Execution Target:** Monday, November 23, 2026 @ 23:45:00 UTC  

---

## 1. The Core Mission: What Are We Building?

The goal of the **Travnr** project is to build an artificial intelligence prediction model that forecasts flight disruptions (delays, gate changes, and cancellations) hours before airlines formally announce them.

To train an ML model without data leakage or hindsight bias:
- You cannot use historical backfilled data because post-hoc tables clean up timestamps after flights land.
- You must collect **longitudinal, real-time prospective snapshots** as the events unfold in the real world.
- **Phase 6** is the 31-day autonomous, paid data collection campaign across 5 major US hub pairs (JFK, LAX, ORD, DFW, ATL), capturing 6,144 flight status windows and 36,740 query units from the AeroDataBox (ADB) provider via RapidAPI.

---

## 2. Gates 1 Through 8: Plain-English & Technical Deep-Dive

To make sure the automation cannot accidentally overspend the paid budget, violate API terms, corrupt data, or crash midway, we established 8 strict verification gates.

### Gate 1: PRE Producer & Transformation Policy (`INV-NO-MERGE`)
- **What it is in Plain English:** When a raw flight status comes in, how does the system interpret it? Airlines use 13 different status codes (Scheduled, Active, Landed, Cancelled, Diverted, Delayed, etc.). Gate 1 proves that the system never confuses or blends these 13 distinct statuses.
- **Why it matters:** If the code blurred "Delayed" into "Scheduled", the ML model would learn fake patterns.
- **Code & Database:**
  - Code: `server/lib/disruption/phase6ProducerTransformPolicy_v39.ts`
  - DB Table: `clean.adb_phase6_producer_policy` (Row SHA256: `3b0219dd...`, reference field count = 3).
  - Status: Commissioned and live in Neon PostgreSQL 16.

### Gate 2: POST Outcome Reviewer & Continuous Target Censoring
- **What it is in Plain English:** After a flight lands or cancels, the system collects the final outcome (actual gate arrival/departure). Gate 2 guarantees that if actual off-block/on-block timestamps are unavailable, the system **never invents or substitutes estimated times as actual times**.
- **Why it matters:** Fabricated arrival times would destroy the ground-truth target variable for the neural network.
- **Code & Test Evidence:**
  - Code: `server/lib/disruption/phase7IndependentPostSettlementIssuer_v39.ts`
  - Workflow: `.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml`
  - Evidence: Actor-only preflight on commit `fe3fef5d` ([run 44991445919](https://github.com/HKcode22/ReplitTranvr/actions/runs/44991445919)) passed 100% green across all three roles (`reviewer`, `publisher`, `storage`) with 0 provider calls and 0 live DB writes.

### Gate 3: Retention Upgrade & Operational Metadata Sentinel (`V0108`)
- **What it is in Plain English:** AeroDataBox's commercial license requires raw flight packets to be deleted within 7 days (168 hours), but Travnr's derived ML features can be kept forever. Gate 3 installed Postgres functions that automatically sweep expired raw packets while protecting ML training bundles.
- **Why it matters:** Prevents legal/licensing violations with AeroDataBox, and protects production queries by setting a 3-second lock timeout so retention sweeps never lock live ingestion.
- **Code & Database:**
  - Migration: `migrations/V0108__phase6_private_operational_metadata_expiry_class_v39.sql`
  - Verification Script: `scripts/v39_phase6_v0108_owner_once_v39.mjs`
  - DB Status: Verified `V0108_EXACT_INSTALLED` in Neon DB (`neondb_owner`).

### Gate 4: Code Review & Merged Executable Parity
- **What it is in Plain English:** Ensuring that all tested code, fixes, and schemas are fully merged into `origin/main` so that the exact commit running in GitHub Actions matches the local tested code.
- **Why it matters:** Prevents code drift where a bug was fixed locally but failed in CI runners.
- **Code & CI:**
  - Current HEAD: `c8e065d665ccacb6d2575070e94c5500b7583044`
  - All 54 Phase 6/7 test suites (431 tests) passing green.

### Gate 5: Disabled Monday Stage Package
- **What it is in Plain English:** The exact calendar specifying which flight pairs are queried at which minute for all 31 days (November 23 to December 24, 2026). Gate 5 locked this 31-day plan into the database in a **disabled** state.
- **Why it matters:** The system knows exactly what flights to query, but cannot query them until the operator unlocks paid access.
- **Evidence:** `data-collection/phase5/evidence/phase6-monday-stage-input-795ace55.json` (SHA `8adfc61a...`, cost envelope SHA `cef58dcc...`). 31 days, 6,144 templates, 36,740 reserved units.

### Gate 6: Runtime Policies Finalization
- **What it is in Plain English:** The mathematical rate limits, circuit breakers, and budget caps that govern every HTTP request.
- **Why it matters:** Prevents infinite retry loops or unexpected bills. If RapidAPI returns 500 errors, the runner backs off rather than draining API quota.
- **Code:** `review-tools/p6_nov20_finalize_recovered_policies_v39.ts` (6 runtime policies + 31 static values, repository secrets pinned to HEAD).

### Gate 7: Autonomous Rehearsal & Clock Relay
- **What it is in Plain English:** An end-to-end dry run of the scheduled jobs without paid API calls, plus an external timer pulse.
- **Why it matters:** Proves that the workflows trigger on time, connect to the database, and authenticate without paying for API calls.
- **Infrastructure:**
  - 3-session rolling rehearsal chain green.
  - External Clock Relay active on [HKcode22/TravnrClockRelay](https://github.com/HKcode22/TravnrClockRelay/actions), sending pulses every 10–15 minutes.

### Gate 8: Separate SOURCE Enable & Approvals Ledger
- **What it is in Plain English:** The final security deadbolt. Even if all code is deployed and crons run, the database has an explicit boolean switch `clean.adb_phase6_authorization.sourceAuthorizationEnabled` that must be verified.
- **Why it matters:** Ensures multiple levels of authorization: code, secrets, and database must all agree before paid collection starts.
- **Database & Ledger:**
  - DB Table: `clean.adb_phase6_authorization` verified `sourceAuthorizationEnabled: true`.
  - Ledger: `data-collection/phase6/evidence/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json`.

---

## 3. What Happens If Something Goes Wrong? (Failure Recovery & Day 1 Salvage)

### Can Day 1 Be Salvaged Without Ruining Days 2–31?
**YES, absolutely.** The entire architecture was designed with strict day-level and window-level isolation:

1. **Independent 31-Day Calendar Binding:**
   - Every day from Day 1 to Day 31 is bound to explicit UTC timestamp boundaries in the database (`clean.adb_phase6_calendar_stage`).
   - If Window 1 on Day 1 experiences a runner timeout or a network blip, it **never shifts or pushes back Day 2**. Day 2 will still run at its exact scheduled UTC time tomorrow.
2. **Idempotent Upserts (Natural Keys):**
   - Every flight record uses a deterministic natural primary key (`logical_path`: hub pair + scheduled date + flight number + window index).
   - If a runner fails halfway through and retries, Postgres executes an idempotent upsert (`ON CONFLICT DO UPDATE` or transaction fence). It cannot create duplicate rows or double-bill requests.
3. **90-Minute Pre-Arm Window (8 Redundant Retries):**
   - Admission opens at **22:15 UTC** (90 minutes before the 23:45 UTC first query).
   - The Clock Relay fires every 10 minutes (`22:18`, `22:28`, `22:38`, `22:48`, `22:58`, `23:08`, `23:18`, `23:28`).
   - If GitHub has a runner queue delay at 22:18 UTC, the 22:28 UTC pulse will pick it up. There are **8 independent chances** to admit the session before 23:45 UTC.
4. **Neon Continuous 7-Day PITR (Point-In-Time Recovery):**
   - Neon PostgreSQL 16 keeps continuous WAL journals. If an operator accidentally executes an errant command, the entire database can be restored to any millisecond within the past 7 days.
5. **No-Replay Fail-Closed Guard:**
   - If an API window is completely missed (e.g. RapidAPI global outage during 23:45 UTC), the system records `TERMINAL_FAILED` and marks the window as missing in the manifest. It **never makes retroactive backfill requests** that would burn tomorrow's budget. Day 1 would have a documented missing window, and Day 2 proceeds unaffected.

---

## 4. Successful Run Expectations: What to Look For Tonight

When Day 1 executes successfully tonight (November 23, 2026), here is what you will observe:

### A. GitHub Actions Workflows
1. **At ~22:18–22:48 UTC (Pre-Arm):**
   - Workflow: `phase6-rolling-controller-bounded-session.yml`
   - Job: `admit-rolling-session` completes green (`success`).
   - Step output: `P6_ROLLING_SESSION_ADMITTED_EXACT_MAIN`.
2. **At 23:45:00 UTC (Acquisition Window 1):**
   - Workflow: `phase6-nonpaid-source-day-prepare-publish.yml` / rolling worker.
   - Run Title: `P6 SOURCE DAY 1 ACQUISITION` or `Phase6 rolling worker`.
   - Elapsed Time: ~45–90 seconds.
   - Step Output: `WINDOW_1_INGESTION_COMPLETED_SUCCESS`.

### B. Database Rows Written
In Neon PostgreSQL 16:
- **`raw.adb_phase6_raw_payloads`**: Exactly 192 new rows for Day 1 (one per FIDS query across the 5 hub pairs).
- **`clean.adb_phase6_flight_status_events`**: Parsed flight records matching the 192 queries, with 13-status enum validated.
- **`clean.adb_phase6_source_manifest`**: Exactly 1 row for Day 1 recording `windowIndex: 1`, `status: COMPLETED`, and byte digest.
- **Provider Usage:** Exactly 128 billable RapidAPI units consumed (within the 1,185 daily budget cap).

### C. Checkpoints & Evidence
- A signed JSON receipt will be generated: `phase6-day01-window01-receipt-<hash>.json`.
- Zero schema errors, zero unhandled promise rejections, zero lock timeouts.

---

## 5. Master Launch Checklist for Tonight (Monday, Nov 23, 2026)

| Time (UTC) | Time (PST / Local) | Milestone | Action Required |
| :--- | :--- | :--- | :--- |
| **Current** | Current | Zero-Cost Standby | System is frozen, safe, and all tests are passing. Zero paid calls. |
| **21:50 UTC** | 13:50 PST | Pre-Flight Health Check | Run read-only probe on Neon DB; verify [ClockRelay actions](https://github.com/HKcode22/TravnrClockRelay/actions) green. |
| **22:15 UTC** | 14:15 PST | 90-Minute Pre-Arm Window Opens | First rolling tick at 22:18 UTC begins polling admission. |
| **By 23:10 UTC** | 15:10 PST | **STRICT OPERATOR PAID GO** | **Set `V39_PHASE6_PROCESS_ARMED=1` and `V39_PHASE6_OWNER_APPROVED=1` in GitHub Secrets.** |
| **23:45 UTC** | 15:45 PST | Day 1 Data Collection Launch | Automated Day 1 collection begins autonomously. |
