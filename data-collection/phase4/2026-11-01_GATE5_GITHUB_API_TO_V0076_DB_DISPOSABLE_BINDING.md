# November 1, 2026 — Gate 5 real GitHub running-job identity bound to V0076 disposable PostgreSQL

**Status: engineering integration only, not a scientifically admitted cohort.** Binding Plan V3.9-f.8 §§5–7 and 16–17. Do not modify the hash-locked Implementation Log, historic October 31 source receipts, or Phase3 files. Phase5 FREEZE HOLD; Phase6 NO-GO. This change runs **zero paid AeroDataBox calls**.

## Why this closes a genuine gap

- [PR #320](https://github.com/HKcode22/ReplitTranvr/pull/320) independently verified in-progress GitHub owner-job clocks, but those jobs only checked simulated horizon timing in memory with no V0076 persistence.
- [PR #319](https://github.com/HKcode22/ReplitTranvr/pull/319) verified `PREPARED→ACTIVE` in disposable real PostgreSQL, but its simulated owner used a fabricated numeric GitHub run ID and an application-chosen start timestamp.
- Neither alone demonstrated that a **real GitHub Actions API-attested run ID and job-start time** survive the V0076 PostgreSQL PREPARED owner admission and guarded ACTIVE transition.

## Change: proof chain, no live provider

1. New `phase4Gate5V0076DisposableRunningOwner_v39.ts` validates the **exact current GitHub main-push workflow/run/job identity, SHA and attempt** from independent `GET /actions/runs/{run_id}` and `GET /actions/runs/{run_id}/jobs`: run and exact job both `in_progress`, unique job, real run creation/start and job start, strictly bounded process observation + verification chronology. Rejects queued/completed/spoofed/foreign/late/stale, provider secrets or production DB URLs. Outputs `futureCohortPrearmVerified=false` and `realProviderCallsAuthorized=false`.
2. New separate read-only GitHub API helper uses only the short-lived `github.token` with `actions:read` and `contents:read`. Bounded eventual-consistency retries affect GitHub metadata only, not provider source or irreversible FIDS reservation. No external schedule controls.
3. Existing isolated disposable PG16 workflow `phase4-gate5-v0076-active-transition-disposable-pg16.yml` now obtains this proof **before any V0076 DB writes**, derives the synthetic owner's `actualOwnerProcessStartedAtUtc` from the real GitHub API **job-start** timestamp, and binds the actual `GITHUB_RUN_ID` into the same immutable owner row. An explicit PostgreSQL readback checks that run ID and start match the independent API metadata.
4. Existing no-provider transaction regressions remain: tampered same-count query fails ACTIVE and rolls back; restore exact query, allow disposable ACTIVE once; reject replay and premature physical reservation. **No real flight-time cutoff or provider HTTP is exercised.**
5. New regression suite verifies real job metadata fail-closed, actual clock ordering, run ID/branch/commit/attempt/job mismatch, stale observed API metadata, active/completed status, no production credentials, and workflow isolation.

## Invariants intentionally NOT satisfied by this test

- Source cohort service times in the job are still dynamically synthetic `WSSS` future times, not a real reviewed nonadaptive T−24h/T−6h/T−90m prospective observation.
- Valid GitHub API metadata is **not** provider-native selected T, observed actual-only wheels-off, unique physical operating leg, lawful retention or certified persisted PRE.
- `P4_G5_ACTIVE_LIVE_RELEASE_SHA_V39=null`, `P4_G5_PREPARED_OWNER_LIVE_RELEASE_SHA_V39=null`, `P4_G5_PAID_MANIFEST_RELEASE_PIN_V39=null`; production restricted role grants remain unchanged. The disposable DB uses localhost `gate5_activation`, and test records disappear with the GitHub job.
- All external evidence blockers remain under [#200](https://github.com/HKcode22/ReplitTranvr/issues/200) and [#300](https://github.com/HKcode22/ReplitTranvr/issues/300). The real full prospective source/PRE/callback/outcome audit is [#293](https://github.com/HKcode22/ReplitTranvr/issues/293). Historical October 31 T−6h remains `UNOBSERVED`, never backfilled.

## Acceptance / next handoff

Require **four mandatory PR CI success checks**, merge only with verified head SHA, and independently inspect the main-push disposable PG16 job logs for `githubApiRunningVerified:true`, actual verified job time and run ID, exactly one ACTIVE test owner, three exact queries, zero physical attempts, zero reserved REST units, zero provider calls, zero production writes and explicit strict Gate5 false. Record the resulting PR and GitHub run IDs here once verified. A green CI does not certify real flight science.

No Replit shell command or additional paid approval is necessary for this engineering slice.
