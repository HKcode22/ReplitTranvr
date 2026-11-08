# Phase 5 — November 8 live cold-start and shortest legitimate release path

**Observed, not hypothetical.** At `2026-11-08T08:18:35.246Z`, the owner ran the exact-sha reviewed [PR #478](https://github.com/HKcode22/ReplitTranvr/pull/478) **READ ONLY** `neondb` inventory and reported `PHASE5_OWNER_READONLY_INVENTORY_SUCCESS_NO_PROVIDER_NO_DB_WRITES`. This is the project’s current live source of truth for these table counts; exact user-output archive is [issue #416, comment 6719194093](https://github.com/HKcode22/ReplitTranvr/issues/416#issuecomment-6719194093). Prior Phase4 flight records in different tables are outside this inventory. No provider HTTP or SQL writes occurred.

## 1. Don't reinstall anything: the schema is not the blocker

`missingTables=[]` across all 16 named Phase5 calendar/source/budget/witness tables. **Seven expected NOLOGIN groups exist**, `missingNoLoginRoles=[]`. Prior V0079–V0083 actual owner installations (V0083 second DB connection verified) and four dedicated GitHub worker identities were already completed. Re-running migrations/worker credential commissioners can only waste time and may corrupt one-time privileges.

All **16 examined tables have exactly zero rows** as of the snapshot:

| Real production table / class | 2026-11-08 08:18:35Z rows |
| --- | ---: |
| `clean.adb_phase6_calendar_day` | 0 |
| `clean.adb_sampling_draw` | 0 |
| `clean.adb_phase6_authorization` | 0 |
| `clean.phase5_fids_allowed_query_v39` | 0 |
| `clean.phase5_fids_physical_attempt_v39` | 0 |
| `clean.phase5_fids_original_binding_v39` | 0 |
| `clean.phase5_fids_github_prearm_v39` | 0 |
| `clean.phase5_fids_cycle_budget_v39` | 0 |
| `clean.phase5_fids_utc_charge_budget_v39` | 0 |
| `clean.phase5_fids_seven_rest_release_v39` | 0 |
| `clean.phase5_fids_cycle_rest_category_cap_v39` | 0 |
| `clean.phase5_fids_utc_rest_category_budget_v39` | 0 |
| `clean.phase5_fids_exact_query_partition_v39` | 0 |
| `clean.phase5_other_rest_reviewed_call_v39` | 0 |
| `clean.phase5_other_rest_physical_reservation_v39` | 0 |
| `clean.phase5_t24_postcommit_witness_v39` | 0 |

`phase6AuthorizationEnabled=false`, `phase5ScientificFreezePassed=false`, `phase6PaidGo=false`. `certifiedPhysicalFlightIdentities=null` means *not assessed*, NOT that the provider has no flights. A Node `pg` SSL deprecation warning accompanied an otherwise successful read-only result; do not misdiagnose it as a database failure.

## 2. What should happen next, in the right order

The binding [f.8 plan](../plans/V3.9_DataCollectPlan_f.8.md) and [Nov7 scope-control](2026-11-07_PHASE5_EXIT_CRITICAL_PATH_STOP_STAGE_NUMBERING_AND_SCOPE_CONTROL.md) distinguish **Phase5 final preparation** from **31 actual Phase6 batch-days**. The empty source and witness tables are compatible with a collection that has not legally begun; they are NOT, by themselves, failures of the ready source modules.

### A — Freeze one *future* scientific and lawful collection contract

- Historical original Gate5 physical wheels-off PASS is **not available**. The [Nov6 G5A pilot](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md) already supports its **narrow** authentic provider-schedule-revision PRE/POST operation, not physical operated-leg or actual wheels-off claims. Do NOT buy the same three-horizon FIDS-only demonstration again.
- [Proposed Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261107_Prospective_Schedule_Revision_Primary.md) has a future *provider schedule revision ≥15 min* at T−6h, separate native operating-leg and conditional query-filtered service populations, missing/unknown preserved, immutable first T, Brier score vs training-only event prevalence, chronological 20/5/6 batch-day split. This **must be reviewed and adopted prospectively**, not treated as already approved or as an actual delay endpoint.
- [Issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300) already documents grandfathered RapidAPI Team Ultra, prior current-quota evidence, the existing submitted retention inquiry, official post-Nov7 Terms and unresolved individual-record normalized Contents/ML purpose+TTL/backup. Do NOT ask owner for the subscription again or send repeat provider emails; finish a narrowly lawful retention/expiry architecture or independent per-class permission evidence **before paid retained source GO**. Owner has previously authorized expenditure; that is not the provider’s license.

### B — Generate and sign one prospective **31 batch-day schedule**, not 31 days of Phase5 work

- Actual `adb_phase6_calendar_day` has **zero rows**. The current pure [finite candidate solver](../../server/lib/disruption/phase5F8FiniteCandidateSolver_v39.mjs) and [structural guard](../../server/lib/disruption/phase5F8CrossoverCalendarFreezeGuard_v39.mjs) prove **candidate** feasibility only. They do not generate dates or attest a real frozen future calendar.
- Freeze actual future UTC starts, **26×4h / 3×2x2h with exact 60-min inactive gap / 2×up-to-6h**, exactly five paired crossovers (three split comparisons, two six-hour comparisons), all six UTC slots per six-day block, 20 train / 5 validation / 6 protected test batch-days, 24h *prior end→next start* airport washout, eligible source geometry and REST/Alert cap; fail if candidate is UNSAT, don't silently relax hard constraints.
- **Scientific issue to reconcile before signing:** the current global candidate solver demands literal `airports` for all 31 parent days, while the binding REGIONAL sampling is adaptive after previous valid Phase6 observations and four-airport selection must be prospective before the T24 source cutoffs. Do **not** precompute future adaptive airports from post-freeze yields. A freezeable time/region/role template plus separately committed and later reviewed real draw, with pair-2 replay tied to pair-1, may require a *versioned, prospective* plan clarification and independent acceptance. Don't forge a full SAT PASS with invented airport identities.
- Budget proofs: use current live pinned FIDS range and per-request charge and seven physical UTC REST category budgets + separate Alert SEND budget. Stage22/Stage8/Stage9 and V0082/V0083 guards exist as code but freeze rows are still **0**. Do not use synthetic 240-minute tests as live account-range evidence.

### C — Arm only approved GitHub workflows *after* the above predicates are genuinely met

- Dedicated `SOURCE/PREPARE/PRE/T24-WITNESS` GitHub connection credentials are already commissioned and read-only verified. A [manual one-GET workflow](../../.github/workflows/phase5-one-reviewed-prospective-fids-get-main-manual.yml) exists, but doesn't itself implement the continuous 31-day SOURCE→on-time T24 PRE→two-transaction witness→T6/T90 PRE→POST/receiver loop.
- The [early airport draw owner](../../server/lib/disruption/phase5EarlyAdaptiveDrawOwner_v39.ts) *requires* `clean.adb_phase6_authorization.enabled=true` and `phase5FreezeApproved=true`. That is appropriate for a finally approved Phase6 run, but creates a **real pre-FREEZE pilot sequencing conflict** if one demands new real-flight Phase5 evidence from the same owner. Reuse the Nov6 narrow pilot where scientifically adequate, or create a distinctly reviewed narrow Phase5 evidence authority; **do not fake final FREEZE or turn on global Phase6 prematurely**.
- Preserve source-original response custody, 24h/6h/90m *actual* cutoffs, no missed-cutoff backfill, T24 independent post-COMMIT witness, bounded missingness, original POST and receiver/Alert safety, physical GET-before-paid ledger, STOP and no duplicate expenditure.

### D — One independent final review and separate GO

- Review the *actual signed calendar, signed scientific source-use model, real budget/release manifest, protected receiver and reviewed code*, then publish one independent Phase5 FREEZE **PASS/HOLD**. Formal Phase6 activation needs its **own** separate approval and controls; a row count, unit test, migration, provider balance or prior limited FIDS pilot cannot substitute for it.

## 3. Minimal next software deliverable, not another install task

The highest-value remaining coding is a genuine calendar/source scheduling *integration*, because the repo currently has pure calendar/Stage8–9 DB writers, one manual FIDS GET and separate PRE/witness functions but no certified end-to-end main-only release owner for the frozen schedule. Use the existing Phase5 tables, GitHub roles and code—not new generic V00xx migrations or repeated read-only status loops. Make one small reviewable PR per **actual defect**, and avoid claiming finished external source rights or scientifically observed flights before evidence.

**No new AeroDataBox API call is required to explain this empty live database.** If fresh account/provider metadata is materially needed to validate budgeted physical source pricing/range at the release decision, user requests a short reviewed immutable Replit Shell command using the existing Replit API key, with a sanitized permanent GitHub checkpoint, never a RapidAPI-dashboard request.

**Status on this date:** infrastructure PASS; frozen calendar+category budgets not started; prospective source and witnesses not started; first-cycle rights+scientific target pending review; Phase5 scientific FREEZE **HOLD**, Phase6 paid GO **NO**.
