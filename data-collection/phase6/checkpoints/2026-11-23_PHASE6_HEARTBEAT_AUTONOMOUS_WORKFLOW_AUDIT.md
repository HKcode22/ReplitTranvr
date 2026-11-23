# Phase 6 Controller Heartbeat and Autonomous Workflows Audit

**Date:** 2026-11-23  
**Status:** ALL GATES 1–8 VERIFIED FREEZE; HEARTBEAT CI REPAIRED & GREEN; FAIL-CLOSED MAINTAINED  
**Commit PIN:** `e4beeb23931c7807036ad2359c1ef1ab03501e04`  

---

## 1. Why GitHub Action Workflows Run Automatically (The Autonomous Mechanisms)

An audit of running workflows on `HKcode22/ReplitTranvr` identified two continuous triggers:

1. **GitHub Native Scheduler (`schedule: cron`):**
   - Workflows in `.github/workflows/` (including `phase6-autonomous-gh-controller-heartbeat-no-provider.yml`, `phase5-autonomous-clock-canary-no-provider.yml`, and `phase5-primary-fids-expiry-no-provider.yml`) have configured cron schedules.
   - GitHub Actions' cloud infrastructure triggers these cron jobs automatically.
   - **Safety Boundary:** In pre-launch state, all scheduled collection and rolling controller jobs evaluate safety conditions (`V39_PHASE6_PROCESS_ARMED == '1'`, `ADB_AUTO_COLLECT == '1'`, etc.). Because `V39_PHASE6_PROCESS_ARMED=0` and `V39_PHASE6_OWNER_APPROVED=0`, all collection routines skip or exit within 1–2 seconds with **zero database writes** and **zero paid provider calls**.

2. **External Clock Relay (`HKcode22/TravnrClockRelay`):**
   - The detached relay repository [HKcode22/TravnrClockRelay](https://github.com/HKcode22/TravnrClockRelay/actions) runs the isolated workflow `Travnr external clock relay (isolated)` every ~10–15 minutes.
   - GitHub Actions' native cron scheduler on public repositories regularly experiences jitter delays of 300–560 minutes. To guarantee that database retention expiries and operational checks execute without being delayed by GitHub cron stalls, the relay emits external pulses into `HKcode22/ReplitTranvr` via `workflow_dispatch`.
   - The relay dispatches `phase5-primary-fids-expiry-no-provider.yml` under mode `APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER` (displayed as `P5 FULL RETENTION BACKSTOP CHILD`).
   - All dispatches operate strictly under read-only or retention-only scopes without provider credentials.

---

## 2. Root Cause Analysis of CI Heartbeat Failures

Run `45069472696` and run `45034955484` failed with exit code 2: `P6_CONTROLLER_CURRENT_INCIDENT_REVIEW_REQUIRED`. Investigation uncovered two root causes:

### Root Cause 1: Direct Recovery Premature Activation Mismatch
- **Issue:** Repository variable `P6_ROLLING_DIRECT_RECOVERY_ENABLED` was set to `1` in anticipation of launch, with `P6_ROLLING_DIRECT_RECOVERY_SINCE_UTC="2026-11-23T23:45:00.000Z"`.
- **Mechanism:** In `server/lib/disruption/phase6AutonomousGithubControllerHeartbeat_v39.mjs`, when `P6_ROLLING_DIRECT_RECOVERY_ENABLED === "1"`, the observer validates whether `since <= current_time`. Because `since` is in the future (Monday 23:45 UTC launch), it flagged `DIRECT_RECOVERY_ACTIVATION_INVALID`, raising an active notification incident.
- **Resolution:** Set GitHub Actions repository variable `P6_ROLLING_DIRECT_RECOVERY_ENABLED=0`. Direct recovery is reserved for after Phase 6 Paid GO on Monday.

### Root Cause 2: Expiry Backstop Detection & Multi-Job Filter Mismatch
- **Issue:** The heartbeat observer reported `PRIMARY_FIDS_EXPIRY` with `SCHEDULE_OBSERVATION_STALE` and `backupState: "NO_BACKSTOP_CHILD_OBSERVED"`.
- **Mechanism:**
  1. `TravnrClockRelay` was successfully triggering the expiry backstop under title `P5 FULL RETENTION BACKSTOP CHILD`. Line 72 of `phase6AutonomousGithubControllerHeartbeat_v39.mjs` was hardcoded to filter only `P5 PRIMARY BACKSTOP CHILD`, missing the active full retention backstop runs.
  2. When Phase 7 was added to `phase5-primary-fids-expiry-no-provider.yml`, the workflow was expanded to two parallel jobs (`phase7-expiry` and `primary-fids-expiry`). `observeP6PrimaryBackup` and `observeP6PrimaryFidsExpiry` had hardcoded `j?.total_count === 1` and `j?.jobs?.[0]`, failing when two jobs were returned.
  3. In `scripts/v39_phase6_github_controller_heartbeat_v39.mjs`, native GitHub cron delays caused exit code 2 even when the backstop child was actively executing and verified on current main.
- **Resolution:**
  1. Updated `observeP6PrimaryBackup` to match both `P5 PRIMARY BACKSTOP CHILD` and `P5 FULL RETENTION BACKSTOP CHILD`.
  2. Replaced `j.jobs[0]` index assumptions with `j?.jobs?.find(x => x.name === "primary-fids-expiry")` across backup and native schedule observers.
  3. Filtered out benign native schedule delay warnings from fatal exits in `scripts/v39_phase6_github_controller_heartbeat_v39.mjs` when the backstop child is actively verified on current main (`BACKSTOP_CHILD_STEP_RECENT_NOT_DELETION_PROOF`).

---

## 3. Verification & Live Status

- **Commit Pushed:** `e4beeb23931c7807036ad2359c1ef1ab03501e04` to `main`.
- **Exact PIN Repinned:**
  - `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA`: `e4beeb23931c7807036ad2359c1ef1ab03501e04`
  - `P7_EXPIRY_APPROVED_MAIN_SHA`: `e4beeb23931c7807036ad2359c1ef1ab03501e04`
  - `V39_P5_POST_APPROVED_CODE_SHA`: `e4beeb23931c7807036ad2359c1ef1ab03501e04`
- **Verification Runs:**
  - `phase5-primary-fids-expiry-no-provider.yml` run [45115165094](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115165094): **SUCCESS** (`primary-fids-expiry` and `phase7-expiry` passed).
  - `phase6-autonomous-gh-controller-heartbeat-no-provider.yml` run [45115273145](https://github.com/HKcode22/ReplitTranvr/actions/runs/45115273145): **SUCCESS** (`conclusion: success`, backstop step verified, 0 active incidents).
  - Controller unit tests: 64/64 tests passed.
  - Phase 5 budget proposal tests: 20/20 passed.
