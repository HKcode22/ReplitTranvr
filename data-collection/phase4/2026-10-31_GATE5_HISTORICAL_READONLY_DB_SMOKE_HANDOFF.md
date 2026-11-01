# Phase 4 Gate 5 — historical PostgreSQL schema smoke only (no provider)

**Prepared October 31, 2026.** This work is a GitHub Actions SQL/schema compatibility test of the **already observed October 31 WSSS service cohort 17:00–18:00 UTC**. It does not establish a new prospective cohort, original Gate5 certification, verified runway departure, or recovered T−6h.

## Reason and immutable scope

- Future same-cohort Gate5 cannot yet be genuinely frozen: official provider-native selected T, actual-versus-estimated runway, operating/codeshare identity, legal raw retention and measured acquisition grid are not independently certified. The new parameterized SQL function can still be tested on retained OLD originals without external API calls.
- The reviewed static manifest is [2026-10-31_GATE5_HISTORICAL_SCHEMA_SMOKE_MANIFEST.json](2026-10-31_GATE5_HISTORICAL_SCHEMA_SMOKE_MANIFEST.json), content SHA-256 **c3785cfae051fd0cf4ef3dd68a3a9d8b0079c89cd34c002fe5610000ff318853**, with WSSS, the exact past service interval, original paid run [#41202671665](https://github.com/HKcode22/ReplitTranvr/actions/runs/41202671665), T−6h UNOBSERVED, T−24h UNOBSERVED at its fixed cutoff and Phase5/6 explicitly false.
- The SHA is checked from the exact file bytes and all fields are compared to immutable literals in the new operator script. It is a historical scope lock, **not** permission to collect or spend.
- New workflow: .github/workflows/phase4-gate5-historical-cohort-schema-smoke-readonly.yml. Push-to-main for its exact code/manifest/workflow paths only; no schedule or workflow_dispatch. GitHub environment phase2g-paid supplies **only** the existing GATE05_AUTOMATION_DATABASE_URL reader secret at the audit step. No AeroDataBox API key, HTTP calls, subscriptions, or REST credits.
- Runner: scripts/v39_phase4_gate5_historical_cohort_smoke_readonly_actions.ts. Confirms repo, push event, main, first attempt, exact job/workflow/ref, checked-out commit and absence of provider secrets; creates PostgreSQL default read-only session, then REPEATABLE READ READ ONLY transaction with SQL query timeouts and ROLLBACK in finally. Calls the already merged phase4Gate5FreshCohortReadOnly_v39.ts aggregate-only function.
- Tests: tests/phase4_gate5_historical_cohort_smoke_actions_v39.test.ts. Guarded GitHub provenance, true SHA digest, tampering, wrong retry/branch, provider-secret refusal, SQL transaction safety and intentionally historical missingness.

## Verification and scientific result

**Prepared != executed.** Only after required PR CI passes and this workflow merges to main can its own real GitHub job establish DB connectivity/schema compatibility and current source retention. The previous October 31 paid and retrospective audit workflows, and the hash-locked canonical Implementation Log, are unchanged.

The new generic SQL inventories retained raw FIDS original receipts, provisional population and tags, PRE rows linked to retained source, provisional identity-resolved callbacks, and stored wheels-off label statuses. If originals are expired, it must return **NULL source-dependent denominators**, not a measured zero. The selected T, full physical operator denominator, actual-only target, callback coverage outside the complete provider universe and certified PRE all remain unproven. A green SQL job is NOT Gate5 PASS.

## Follow-on

1. Read actual historical SQL smoke run and job logs. If SQL fails, repair it with nonpaid code and regression CI; do not mutate source originals or waive read-only.
2. Resolve authenticated provider semantics under [issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200), including per-record actual/estimated runway and first observed selected native T, plus physical operating-leg proof.
3. For the **next genuine prospective cohort**, create a different frozen approved manifest and independent GitHub-only runner. Track [issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293). This old historical smoke cannot be relabeled as a new attempt.
4. Connect certified PRE writer, source-as-of full 24h/6h/90m nonadaptive FIDS grid, retained original provenance, denominator/capture and actual outcome certification before scientific Gate5 and Phase5/6 review.

**Current decision: Gate5 HOLD. Phase5 freeze HOLD. Phase6 NO-GO. No Replit command and no new paid GET needed.**

Start with [Phase4 redo root-cause checkpoint](2026-10-31_GATE5_REDO_ROOTCAUSE_AND_RESTART_HANDOFF.md), [fresh-cohort audit implementation checkpoint](2026-10-31_GATE5_FRESH_COHORT_READONLY_AUDIT_HANDOFF.md), and binding [V3.9-f.8 Plan](../plans/V3.9_DataCollectPlan_f.8.md).
