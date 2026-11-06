# G5A WSSS 14:00Z — live three-horizon evidence, source-use expiry and POST handoff

**Record created November 6, 2026 (Pacific). Status: LIVE OPERATIONAL CHECKPOINT, NOT A GATE 5 SCIENTIFIC PASS.**

This page is a source-of-truth handoff for `WSSS_G5A_20261106_1400Z`, anchored to immutable `main` commit `66ff4908cbd63a19668485c935da49fc18652654` and frozen grid content SHA256 `02865331b9137c2ffb4d7e2b0a8c2a6016d0838051fd04f09a44c6f02e238667`. This checkpoint branch is **documentation-only**; do not merge it into `main` while prospective GitHub owners, POST or audit are running. It does not change the source owner, jobs, secrets, budget, provider access, SQL, population, or timed schedules.

## Evidence-based ledger (as observed; source counts != independent science verdict)

| Horizon | GitHub run | Verified status | Originals | Actual on-time PRE | Source |
|---|---|---|---|---|---|
| T−24h | [#42022373703](https://github.com/HKcode22/ReplitTranvr/actions/runs/42022373703) | completed / success | 3/3 bound | 12 distinct on-time | GH final closeout + owner read-only PG audit |
| T−6h | [#42159915594](https://github.com/HKcode22/ReplitTranvr/actions/runs/42159915594) | completed / success | 3/3 bound | 12 distinct on-time | GH final closeout + owner read-only PG audit |
| T−90m | [#42193627043](https://github.com/HKcode22/ReplitTranvr/actions/runs/42193627043) | **in progress at latest live GitHub verification** | third of three originals reported committed in owner log at ~05:00 PST; no final closeout yet | 2 of 2 cutoffs reached at 04:44:25 PST independently valid; additional writer activity after 05:00 requires closeout/readback | GH owner log and 04:44 read-only PG audit |

**Do not call T−90m complete until GitHub final closeout plus production readback.** Frozen T−90m PRE cutoffs span **04:35–05:25 PST** Friday; expected closeout ~05:30 PST. All time claims in this document are PST, UTC−08:00. The sole live owner GitHub run #42193627043 was prearmed at 01:15:16 PST on the correct pinned commit.

### Underlying read-only database proofs

- **Friday 04:44:25 PST (2026-11-06T12:44:25.191Z)**: PostgreSQL `REPEATABLE READ READ ONLY` confirmed exact V0076 owner IDs; T−24h=12/12 and T−6h=12/12 distinct cutoff-safe PRE records, `late=0`, `missing_hash=0`; T−90m had two valid retained source originals (48 normalized member rows, 12 qualifying operating identity keys apiece), two on-time PRE records, 12 frozen T anchors, 2 cutoffs reached, 10 future, 0 missed or invalid due snapshots. Project reserved REST units 16/24 at that moment. This audit issued zero provider calls and zero DB writes.
- **At ~05:00 PST**, user-supplied GitHub log had `G5A_ORIGINAL_AND_OPERATING_POPULATION_V0077_COMMITTED` with `horizon:T-90m, queryIndex:2, normalizedRows:48, sourceQualifiedIdentityKeys:12, originalBound:true, providerPaidAttempts:1`; this is owner log evidence of third original, pending final read-only database confirmation.
- The first stricter user-authored read-only audit failed **inside its own SELECT** due to PostgreSQL `uuid = text` comparison (`f.population_query_id=s.population_query_id`). This was **not** a GitHub source-writer or PRE failure. A repaired read-only diagnostic cast both IDs to text; it completed successfully, confirmed 0 invalid due cutoffs and left production unmodified.
- Repeated `lateNoBackfill` is the PRE writer's count of all candidate cutoffs already passed, including ones with on-time snapshots; it is **not** independently a missed-PRE count. Use the frozen-cutoff `due_missing_or_invalid` read-only reconciliation.

### T−24h original content retention: captured before expiry; do not extend rights

The original T−24h slot 0 was genuinely captured at **Thu Nov 5 05:30 PST**, the raw original was bound, and the 12 T−24h PRE records were **persisted on time before cutoff**. An owner production read-only audit on Friday **04:44 PST** returned for slot 0: `reserved=1, bound=1, raw_missing=0, raw_expired=0, rights_window_elapsed=1, normalized_members=48`, with `source_use_expires_at_utc=2026-11-06T12:30:00.714Z` (**Fri 04:30 PST**). It also returned `retained_usable_now=0`. In other words, the first original was **collected**, but source-use rights had passed their 23-hour limit by audit time. The saved PRE snapshots/hashes persist separately; they are not a license to reopen/rehydrate or use expired raw data. Other original slots have their own expiries. Final audit must respect each original's time-bounded use rights and explicitly document any inability to re-examine contents.

### Next: POST needs one genuine GitHub prearm, not a new Replit source call

1. Wait for the **T−90m** job to **complete successfully**, verify the actual closeout and the same frozen three-horizon PRE evidence in read-only PG. Preserve all observed partial records, no retrospective backfill.
2. Post workflow: `.github/workflows/phase4-gate5-g5a-nov06-1400z-wsss-real-post.yml` (Git blob `c1ac33dac4af0c034de34144355c5d671922c683`), POST script `scripts/v39_phase4_gate5_g5a_nov06_1400z_prospective_post_schedule_observation.ts` (Git blob `46d7d48dae1a24c14ee28a08a4e73de1852f4ee6`), frozen grid blob `e08a1d19e684f58c63b654e72e6f4f5039832def`.
3. Recommendation: **one guarded manual POST GitHub workflow_dispatch at ~05:45–06:00 PST**, after T−90m readback and no competing POST owner. It must not make paid calls from Replit; POST code enforces its own live GitHub job-start cutoff **07:25 PST** and source/budget/three-horizon checks. The no-manual fallback is four best-effort scheduled prearms **06:40, 06:52, 07:07, 07:22 PST**; previous scheduled delays make an independent early guarded POST prearm preferable. Once dispatched, do **not repeat**.
4. Actual paid POST timestamps: **07:40, 08:10, 08:40 PST**; POST aggregate after **09:01 PST**. POST measures **provider-reported scheduled-departure revisions**, **not certified wheels-off actual delay**. Fail-closed missing/unknown, no false negatives.
5. Independent audit workflow is `.github/workflows/phase4-gate5-g5a-nov06-1400z-independent-final-audit.yml`, four scheduled read-only audits **09:12/09:18/09:24/09:30 PST** (Git blob `b0cf12a09d64727858e2129a9b167d775bc17c46`). Confirm real audit run and results rather than treating a unit-test run or workflow creation as scientific evidence.

## Non-negotiable acceptance boundaries

Source-native scheduled T, composite operating-leg identity/scope, lawful Content rights, selected cohort, callback/POST/watermark completeness, missingness stratification, potential selection bias and actual-only wheels-off outcomes require independent reconciliation under Plan f.8 v3.9 and the implementation log. A "green" GH owner can succeed with incomplete PRE/source, so audit by *persisted actual counts*. Preserve scientifically bounded missingness without fabricating zero events, PASS, backfill, billable credits or provider authorization. `scientificGate5Passed=false`; `phase5FreezeAuthorized=false`; `phase6Authorized=false`. Reuse no expired original. No Cloudflare, Replit timed collection/AI Agent, duplicate paid GETs or direct main changes while the cohort is active.

**Documentation-only checkpoint.** Parent issue [#293](https://github.com/HKcode22/ReplitTranvr/issues/293) contains chronological owner verification messages; the branch/PR is not a production deployment.
