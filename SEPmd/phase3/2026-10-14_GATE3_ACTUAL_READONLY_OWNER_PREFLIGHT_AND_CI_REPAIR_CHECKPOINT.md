# 2026-10-14 PDT — Phase3 Gate3 REAL read-only owner admission, restored source CI, exact restart

**CANONICAL RESTART CHECKPOINT.** Repository `HKcode22/ReplitTranvr`; draft unmerged PR [#36](https://github.com/HKcode22/ReplitTranvr/pull/36), branch `phase2g-pragmatic-science-and-checkpoints-20261012`. Check this file first, then [START_HERE](START_HERE.md), [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38), [Phase3–6 active roadmap](2026-10-14_EXECUTION_SPRINT_ROADMAP_DEADLINES_AND_EVIDENCE_GATES.md), `SEPmd/V3.9_DataCollectPlan_f.8.md` §§16–17 and `SEPmd/V3.9_IMPLEMENTATION_LOG.md` §1.8. Current Phase3 objective is **Gate3 paid-accounting instrument → separate Gate0.5 native clocks/target/FIDS pilot → Gate4 SEND-aware controller and tiny live check**. Phase3 target **Oct20**, fallback **Oct22**, conditional on actual evidence. Phase2G original five-anchor strict Gate2 NOT_PASSED but owner closed qualified initial fieldwork; no new paid YSSY rerun. Prior P25 58 SHA-verified originals with 231 billed/229 received item-cost claims remains original historic reconciliation red, not definitive 2 lost flights.

## Why code was necessary, without starting a paid experiment

The actual `runPrepaidLiveWindowV39` already has a gated PREARMED Phase3 session selector but deliberately throws `GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY` **before any provider calls**. The pre-existing `reviewGate3OwnerPreflightV39` checks hash-approved exact AUTH bytes against independently loaded evidence ledger and the same-ID LOGGED owner and UNLOGGED prepaid runtime row, but there was **no operator-usable read-only CLI invoking this live SQL contract**. A passing offline fixture is not a prepared real session. The new `scripts/v39_gate3_owner_readonly_v39.ts` is the real, independently usable **prepaid Gate3 owner admission READ stage**, not another synthetic paid runner.

### Exact new files/changes — one bundled GitHub commit for one normal CI wave

- **New executable read-only owner inspection:** `scripts/v39_gate3_owner_readonly_v39.ts`, npm alias `v39:gate3:owner:read-only`. Requires exact `--auth-id`, `--auth-file`, `--session-id`, `--icao`, `--credits` (1–100), `--seconds` (1–3600), `--airport-filter-window` matching exact ICAO/departures/timestamp+seconds. Rejects extra `--paid`, duplicate or missing options. Loads exact AUTH JSON bytes and **independently checked-in** `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md`; computes SHA and invokes existing `reviewGate3OwnerPreflightV39` against the real SQL JOIN in **`BEGIN TRANSACTION READ ONLY`**, with `ROLLBACK`. Uncertain BEGIN/ROLLBACK destroys pooled PG connection. Output is a bounded, sanitized JSON `READONLY_AUTH_SESSION_MATCH_NOT_PAID_AUTH` or `HOLD`, always `providerCalls=0`, `databaseWrites=0`, `hostedPostCalls=0`, `paidCanaryAuthorized=false`. Does not prepare a session, migrate schema, verify published receiver, list subscriptions, create/delete provider subscription, or certify live Gate3.
- **Tests:** `tests/phase3_gate3_owner_readonly_cli_v39.test.ts` exercises real existing AUTH/SQL preflight with injectable synthetic PostgreSQL read-only responses, exact ledger hash and session scope, unknown flags rejected before I/O, missing ledger authority with zero source SELECT, DB connection/SELECT faults and unknown transaction ACK client destruction. Full disposable-PG PREPARED owner tests already exist elsewhere; these focused tests don't touch production.
- **Stale reviewer fix:** `gate3SourceCompatibilityReview_v39.ts` and its test previously required the legacy canonical wrapper to **delegate** to incompatible `credit_canary.ts`. The preceding commit intentionally replaced the wrapper with direct NO-GO and caused the full offline safety CI to fail one outdated assertion. Reviewer now explicitly demands direct `refuseLegacyGate3CanaryReceiverV39()` and `process.exitCode=2`, rejects any restoration of `spawnSync` to legacy script. Legacy canary's nonprepaid ledger remains honestly flagged as **NOT A REAL GATE3 OWNER**; we have not marked source live-ready.
- **One package alias** and this dated checkpoint plus top-level `START_HERE` are included in the same atomic new Git commit, not an individual push per file. No additional CI-triggering checkpoint-only commit should be needed; put final CI verification on issue38.

### Prior CI truth and new check

Previous one-commit SHA `19b2e9c7a1a3b7f09a6795adf678e3e72718c18c` had **3/4 success** (public receiver #38685154095, focused #38685154126, disposable PG #38685154088) and **full Offline Safety FAILURE #38685154124**, exactly 1 outdated `phase3_gate3_source_compatibility_review_v39.test.ts` assertion still expecting the old paid delegate (1321 tests passed, one failed). We read the actual failed job log, rather than claiming 4/4. This new commit fixes that source-review contract and adds the actual read-only admission driver. **Check exact NEW PR36 HEAD and its four PR-triggered no-provider Actions before claiming they succeeded.** No live provider or production SQL action in any CI.

## Next two actual operator approvals, NOT NOW

**Before running even the new read-only owner command on production**, the reviewer must approve the exact V0065 migration/release, a signed ledger-pinned AUTH, a specifically scoped new PREPARED owner and same-ID UNLOGGED session, and an appropriate read-only database access boundary. `V0065` is currently DRAFT and NOT APPLIED live, no real Gate3 owner/session exists; therefore running this command now would HOLD. An eventual command template (NOT executable as a paid launch):

```bash
npm run v39:gate3:owner:read-only -- \
  --auth-id AUTH-YYYYMMDD-REVIEWED \
  --auth-file /path/to/reviewed-operator-auth.json \
  --session-id EXACT_PREPARED_UUID \
  --icao REVIEWED_ICAO \
  --credits EXACT_SMALL_APPROVED_CEILING \
  --seconds EXACT_FIXED_WINDOW_SECONDS \
  --airport-filter-window 'ICAO/departures/YYYY-MM-DDTHH:MM:SSZ+NNNs'
```

**Zero-provider live proof approval** (separate): reviewed deployed exact receiver `/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId`, bounded signed source test POST, raw durably committed before HTTP 2xx, Blob/PG exact SHA readback and cleanup with no provider SEND or provider credential exposure; this is a hosted write and needs explicit scope. Current published Replit Autoscale + bounded 6-primary+6-contingency 15-second receiver-health policy is accepted by newer supervisor; DO NOT reopen Reserved VM debate or repeat local Git diffs.

**Tiny provider paid canary approval** (distinct, after hosted proof): one ICAO, fixed start/end, exact max 1–100 Alert credits and <=3600-second exposure, protected account floor/REST limits, zero foreign billable inventory, owner/stop/delete, source rights. Need live SDK balance/list and one strict owned CREATE/DELETE, >0 received items, raw-before-2xx, >=3 actual stable provider balance reads, exact `external=before-after` vs owned received/attempt credit accounting (tol0 for isolated instrumentation), no failed callback, immutable LOGGED terminal receipt. Never mistake scientific fitness of previous partial YSSY rows for exact Gate3 bookkeeping. If ambiguous account outcome, HOLD no automatic second paid CREATE. **`npm run v39:gate3:canary` is deliberately disabled**; paid executor not yet implemented/reviewed; do not remove hard stop or invoke `scripts/credit_canary.ts`.

## Actual next engineering path and status

1. Check one current combined SHA CI; fix only demonstrated failure and record on issue #38. Avoid hundreds of CI triggers from micro commits. Existing prior SQL PREPARED / FAILED / SETTLED candidate modules have disposable PG tests, but NOT yet a fully reviewed provider-capable runner.
2. Next actual programming milestone is to integrate **one** independently reviewed owner that consumes a verified prearmed source session and true provider host/readback/account inventory without caller-fabricated booleans, then connects prepaid runner and final LOGGED disposition; separate zero-provider hosted proof and exact signed AUTH required. Keep the current `GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY` NO-GO until independently justified.
3. Gate0.5: separately prefreeze minimum notifications/unique/completed/airborne points and actual native FIDS/T/target/actual-milestone clock. Gate4: controller cap 100, margin10, soft stop90, SEND without callback and second-start refusal and tiny separate live check. Gates3/0.5/4 **NOT PASSED**. No premature Phase4/5/6 launch.
4. **User action now:** none required for Git history, Autoscale or paid calls. When code is reviewed, ask ONE explicit bounded authorization for live host/migration/zero-provider POST, followed only later by a separate explicit small paid provider AUTH with actual user-selected scope. Never spend simply because user says 'continue'.

Historical raw retention: P2G24 30/30 already independently verified original SHA+bytes and earliest 168h TTL Oct15 ~21:02 PDT; YSSY 58 first TTL Oct19 ~20:06 PDT. Keep lawful rights/incident31 distinct; no early deletion, no unapproved retention extension or protected raw GitHub export.

## Activity boundary / recovery pointer

All changes in this session are on **DRAFT unmerged PR36 only**. No Replit publish, main merge, live SQL DML/migration, provider GET/CREATE/DELETE, Alert paid credits, refill, webhook POST, original deletion, VM change, or auto launch. PR36 prior title renamed to Phase3; repeated YSSY workflow names represent shared CI, not renewed YSSY collection. Resume by checking **new exact commit SHA, four CI conclusions**, and issue38 final comment, not by re-auditing Phase2G.
