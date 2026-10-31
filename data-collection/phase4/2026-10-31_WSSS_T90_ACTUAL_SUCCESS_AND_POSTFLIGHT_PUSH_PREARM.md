# Phase 4 — 2026-10-31 WSSS T−90m actual paid receipt and protected after-service audits

## Binding references
- Plan [V3.9 DataCollectPlan f.8](../plans/V3.9_DataCollectPlan_f.8.md), Phase 4 / Gate 5; [implementation log](../implementation/V3.9_IMPLEMENTATION_LOG.md).
- [Oct 31 T−6h scheduler incident, T−90m recovery design](2026-10-31_WSSS_T6_GITHUB_SCHEDULER_MISS_T90_PUSH_PREARM_RECOVERY.md).
- [Actual GitHub run #41202671665](https://github.com/HKcode22/ReplitTranvr/actions/runs/41202671665), head main `5688ab9c845b55ce5cf6e468196b35d7df144792`; [source semantics/Gate5 issue #200](https://github.com/HKcode22/ReplitTranvr/issues/200#issuecomment-6544839713).

## Source collection: verified from completed actual GitHub job logs, not inferred from a green check

| Evidence | Measured result |
|---|---|
| Date/time GitHub wait ended | 2026-10-31 14:37:00.000Z = 07:37:00 PDT |
| Physical FIDS GET began | 2026-10-31 14:37:02.350Z = 07:37:02 PDT |
| Frozen requested service cohort | WSSS departures 2026-10-31 17:00–18:00Z (10–11 AM PDT) |
| Horizon | T−90m candidate cutoff 2026-10-31 15:30Z |
| Request count | 1 billable provider GET, 0 provider retries, 0 Alerts |
| Quota delta | 2 measured REST API units; expected 2 |
| Normalized / database-inserted observations | 86 / 86 |
| Storage state | `ORIGINAL_STORAGE_CONSISTENT_PROSPECTIVE_FIDS_CANDIDATE` |
| Original decoded body and canonical envelope | 1 bounded verified readback, 0 rejected integrity in sample |
| Independent SQL audit | Completed success, no new provider calls / database writes |
| Scientific Gate5 PASS | **NO** |
| Phase5 freeze / Phase6 trial authorization | **NO** |

Physical HTTP wire-byte preservation, confirmed operating-flight identity, provider-selected T, and actual-only wheels-off outcomes are NOT proven. The source evidence is the actual decoded body and persistent envelope. Do not call the 86 source observations 86 certified distinct commercial flights.

### Source-specific production audit observations
- Same WSSS 17:00–18:00Z service cohort: **1 retained FIDS query receipt**, **86 primary population observations**; same-cohort funnel **0 invalid lineage**, **0 certified core/operating identities**, **86 eligible provisional T−90m analytic candidates**, 0 at prior T−24h/T−6h as-of cutoffs for this retained source.
- PRE feature engine created **86 in-memory previews at T−90m**, 0 persisted certified PRE. All 86 have classification unknown and optional live webhook/weather missing; do not retroactively enrich earlier horizons.
- Broad WSSS original-receipt inventory across all available query sources included **31 timestamp-precision anomalies** (member available_at exactly 1ms ahead of parent receipt in original source-clock fields); source response hash mismatch rows 0. A separate precision-reconciled diagnostic is reported, not independent certified cutoff eligibility.
- The after-flight physical leg / callback and target coverage have **not yet been measured after the 10–11 AM PDT service interval**. Before-departure zeros must not become observed zero capture rates.
- The 03:07 PDT T−6h GitHub schedule never dispatched; latest admissible physical GET start 03:45 PDT passed. This horizon remains **UNOBSERVED**, not zero, and is not backfilled. Earlier T−24h dated scheduled GET was severely late and held before paid work; a separate Oct30 13:49Z original FIDS GET returned 24 original observations, but its 24-hour raw read limit prevents indefinite comparisons.

## Protect 12:15 PM and 3:15 PM read-only after-flight audits

The existing fixed-date GitHub scheduled [post-service audit](../../.github/workflows/phase4-gate5-wsss-postwindow-outcomes-readonly.yml) is **best effort** and suffered broader scheduler reliability concerns. Add a separate **push-prearmed, one-time, no-provider** [Actions workflow](../../.github/workflows/phase4-wsss-postflight-push-prearm-20261031.yml). This new workflow only starts from its first main-branch merge push, checks GitHub event/main/ref/first attempt/workflow provenance, and uses two sequential jobs:
1. First runner is armed ahead of **2026-10-31 19:15Z = 12:15 PM PDT**; it waits without provider or DB secrets; actual bounded repeatable-read SQL audit is run only after the target time using protected `GATE05_AUTOMATION_DATABASE_URL`.
2. Second runner begins after first (even when first fails, for later independent evidence) and waits until **2026-10-31 22:15Z = 3:15 PM PDT**; same independent READ ONLY audit.
3. Each job is bounded below six hours (350 / 340 min). Protect 1st start and reject a reading before the actual target or more than four hours late. GitHub waiting consumes hosted runner minutes.
4. Keep the two **existing read-only GitHub cron audits** as an independent safe fallback. They might duplicate safe reads, **not paid provider calls**, and both are separated from the new waiting concurrency group. Do not remove historical run records or falsify either trigger mode.
5. Audit step uses the actual existing `scripts/v39_gate5_source_inventory_readonly_actions.ts` under PostgreSQL `REPEATABLE READ READ ONLY`. No AeroDataBox API key is passed; the audit step rejects an injected provider key. No Replit command, no Cloudflare, no Agent, and no manual timed dispatch.

**Acceptance:** merge only after required PR checks; verify a real first job exists and is visibly waiting, not merely that a workflow file was merged. At 12:15/3:15 inspect actual logs/time, retention/expiry, source candidate populations, PRE preview/persisted distinction, identity-joined callbacks, true observed versus missing/censored labels. A workflow green conclusion does **not** imply Gate5 PASS. Missing identity/label semantics remain HOLD pending provider-native or independent confirmed evidence. No Phase6 trial or new paid request follows from this observation.