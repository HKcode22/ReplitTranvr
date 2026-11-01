# November 1, 2026 — Gate 5 actual GitHub running-job attestation integration

**Scientific status: HOLD.** Phase 5 FREEZE HOLD / Phase 6 NO-GO. No production V0076 activation, source HTTP, new paid cohort, SQL grants or schedule. This file lives in Phase4, not Phase3. Binding Plan V3.9-f.8 §§5–7 and 16–17, issue [#293](https://github.com/HKcode22/ReplitTranvr/issues/293).

## Concrete gap addressed

Prior three-owner `.github/workflows/phase4-gate5-three-physical-owner-rehearsal.yml` did launch distinct GitHub job names, but the source-owner timing checks operated on **synthetic 2027** clocks and the job did not independently read Actions API evidence that it was currently **in progress**. This work adds a reusable local validator and a protected, short-lived actual GitHub job API attestation without pretending that a rehearsal proves a physically running owner hours ahead of a real future horizon.

## What is implemented

- `phase4Gate5GitHubRunningJobEvidence_v39.ts`: validates the exact checked-out 40-hex SHA against the authorized repository `main` push context; known distinct owner job names; GitHub run ID and run number, workflow name, run attempt = 1, run/head SHA and repository, **real Actions API run and job BOTH in_progress**, job ID/name identity and mandatory GitHub run-created/run-started/job-started clocks. Observed process start and API verification must occur after real job start and within bounded wall-clock windows. Wrong branch, queued/completed/replayed job, stale/late start, foreign source, modified digest and prohibited paid/production credentials fail closed.
- `scripts/v39_phase4_gate5_github_live_job_attestation_actions.ts`: a protected GitHub-hosted process reads its own `GET /actions/runs/{run_id}` and `GET /actions/runs/{run_id}/jobs` with **ephemeral read-only GitHub Actions token**. Four maximum short retries are only for GitHub REST eventual consistency; no AeroDataBox retries. Checks unique matching job name; outputs only job identity and observed timestamps plus explicit **paid=false / future prearm=false / Gate5=false**.
- Rehearsal workflow: all three actual jobs receive `actions: read` and `contents: read`, checkout with `persist-credentials:false`, and each calls the API attestation before its existing **synthetic physical cutoff** rehearsal. New source, test and CLI paths trigger on main push after reviewed merge.
- Focused Vitest tests: all three jobs accepted with valid mocked run/job API values, negative mismatched IDs/sha/branch, queued/completed/late/replayed jobs, clock contradiction, extra production/provider credentials; checks workflow remains push-only, not scheduled and does not include provider or DB access.
- External provider source and license cannot be authenticated by GitHub metadata. This proof is of a **short rehearsal running NOW**, not of a job being early for any real T−24h, T−6h or T−90m slot. Current manifest remains `SYNTHETIC_WSSS_20270115_NOT_APPROVED`; production activation pin remains NULL, restricted V0076 role ACL unchanged.

## Verification requirements and next stage

1. Review four mandatory repository CI checks before merging. After merge, independently inspect all three actual GitHub owner-job logs, including the API-verified `in_progress` result and separate synthetic rehearsals. A green check alone is insufficient.
2. Do not silently substitute a hypothetical calendar schedule for a real owner. A later reviewed future cohort must independently freeze source semantics/rights, time windows and exact code/manifest, actually start three separate Github jobs sufficiently early, attest each while running, stage and activate V0076 under DB-clock and restricted-role controls, reserve every physical attempt before *any* paid GET, record receipts and persist PRE, then reconcile with an independent cohort audit.
3. Vendor [#200](https://github.com/HKcode22/ReplitTranvr/issues/200) source-native selected T, actual-only runway labels and physical operator identity; [#300](https://github.com/HKcode22/ReplitTranvr/issues/300) lawful source-content retention through and after Nov7 remain external blockers. Prior full Gate5 PASS is not claimed; Oct31 T−6h remains UNOBSERVED. Avoid repeating original account-identification questions; the free balance measurement is not a license.

No Replit shell is required. The owner's bounded paid-work authorization is acknowledged; this remains independently no-spend/no-provider work.
