# Phase 5 — independent scheduling rehearsal (not collection authorization)

Baseline: main 6f518add10d00567a95fbcaf3650ebf608da8a60. Keep this code on an isolated deployment branch. Do not merge it merely to deploy an external worker: primary retention has an exact main pin.

## Actual schedule-history observation

Repository Actions schedule history: 286 runs, retrieved via three pages. Selected lanes include SOURCE 30 runs, median gap 405.9 min, maximum 786.3 min; PRE 20 runs, median 392.4 min, maximum 998.4 min; primary expiry 3 runs, median 478 min, maximum 572.4 min. SOURCE and PRE were inert/skipped. These are run-creation intervals, not provider observations, worker-start latency, or a reconstruction of expected cron slots.

## Design

One independent UTC clock, initially 15-minute slots. Existing GitHub worker workflows, scoped actors, signed authorizations, budget and leakage guards remain authoritative. Native schedules remain fallback. The clock never gets database, provider, webhook or signing credentials. An external trigger can mitigate missing cron creation but cannot eliminate GitHub runner queue delays/outages.

Four modes: OBSERVE and OBSERVE_PRIMARY (GET only), PROBE (fixed read-only heartbeat workflow), PRIMARY_BACKUP (candidate fixed primary expiry workflow). Only PROBE is proposed for first dispatch trial. PRIMARY_BACKUP must NOT be activated yet: it could cause previously approved cleanup writes; private-mode configuration is checked twice before dispatch but could change before the queued job starts. Require a workflow-side private VERIFY_ONLY fence or explicit stable-config disposition, plus actual probe evidence and separate review. There is no SOURCE/PRE/POST dispatch path in this candidate.

The journal is single-instance, locked, append-only, fsynced, bounded, and scoped to an exact trial ID, UTC interval, main and mode. One attempt per 15-minute slot, no catch-up burst, durable ATTEMPT before POST, exact ACK and independent run/job readback; uncertain POST, corrupt/truncated journal, scope drift, failed primary child or changed main fail closed. Do not restore an old journal snapshot, delete/reinitialize it, or rotate it after unknown dispatch. Explicit fresh trial scope is required for a subsequent reviewed trial.

Native Python 3.13.5 compile + unittest: 29/29 passed locally. API is mocked; journal uses actual local filesystem and locking. No actual external deployment, dispatch, live provider call, or DB mutation was performed. Code/test Git blobs bad564f23b5c0d10a8511e5f10e06a8ff11a6ca1 and c17423aeca95abfaeb0681ddaae6f684b77e9cd4.

## Proposed deployment on Render (not yet provisioned)

One background worker only, using this branch and root directory data-collection/phase5/review-tools/external-clock. Python standard library; build command: python -m unittest -q test_clock_bridge.py. Start command: python clock_bridge.py --loop. Pin runtime Python 3.13. Do not enable auto-deploy during the trial. Durable 1 GB disk mounted /var/data; no ephemeral substitute. A background worker with disk is selected instead of a stateless cron service so an unknown POST cannot be forgotten on restart. No public inbound endpoint required.

First mode OBSERVE with TRAVNR_CLOCK_MAIN_SHA set to the exact baseline and a narrowly scoped, expiring repository GitHub credential as secret TRAVNR_CLOCK_GITHUB_TOKEN. Contents read and Actions read are sufficient for observation. Never send a credential to chat or log it. Dispatch needs Actions write, which is repository-wide permission, not restricted to a single workflow; application allowlist is additional defense, not a token permission boundary. Variable read access is only for the later primary candidate. No provider/DB/signing credentials are permitted.

After real read-only API observation, set PROBE and exactly RUN_BOUNDED_READONLY_HEARTBEAT_ONLY in TRAVNR_CLOCK_CONFIRM, actual prospective TRAVNR_CLOCK_START_UTC and TRAVNR_CLOCK_END_UTC (max 48 hours), and fresh random 32-hex TRAVNR_CLOCK_TRIAL_ID. Explicitly run python clock_bridge.py --init-journal once on attached persistent disk with the same trial env; then start --loop. Never auto-initialize on restart. Keep the disk through reconciliation. If initialization fails, inspect, not recreate. Trial stops new POST at deadline; suspend the service after reconciliation to avoid continuing charges.

Measure external UTC slots, POST acknowledgments, dispatch-to-job-start, terminal observation step and deferrals. Candidate 24h trial = 96 aligned slots; evaluate eligible dispatches separately from busy deferrals, missing external ticks, and unknown dispatches. Suggested initial target 95% of acknowledged, observed jobs start within 120 seconds, no unknown dispatch or unexplained external-tick gaps over 15 minutes; this is a proposal, not a proven SLA or full 5/10-minute collection readiness. Record sample size, p50/p95/max and all misses. Existing heartbeat can deliberately fail on a schedule-gap diagnostic; do not conflate that with runner startup.

## Next release gates

Prove external trigger and persistent journal in deployed environment before any cleanup backup. Then review exact worker-side fences and timing budget, reuse existing signed C+D route admission and durable settlement for SOURCE/PRE/POST, obtain final rights/policy/custody and calendar/cost authorization. Separate paid GO remains false. The independent clock does not resolve rights, source labels, signer custody or scientific FREEZE.
