# Phase 4 — Night-before WSSS paid FIDS readiness check

**Timebox:** Friday October 30, 2026 PDT, before the Saturday October 31 GitHub FIDS attempts. This is a new **zero-provider** check; the original dated paid workflow is unchanged.

## Objective
Run a real, protected PostgreSQL **READ ONLY** transaction from GitHub **tonight**, using the same DB connection selection as the existing paid script, to verify the exact prerequisite DB writer grants, immutable FIDS trigger, expiry trigger and original-cohort source-receipt count **before** tomorrow's time-sensitive provider attempts. The code cannot INSERT even though it checks whether the runtime DB user has INSERT privileges. No Aerodatabox key is supplied and no provider REST, weather, Alert, or subscription action occurs. SQL and operator summarize only counts/booleans, not credentials, flight identities, raw content or source SHA.

**Workflow:** `.github/workflows/phase4-wsss-night-preflight-no-provider.yml`. Triggers automatically on `main` when the new script or workflow is merged, no manual Replit shell. Operator `scripts/v39_phase4_night_preflight_no_provider_actions.ts` requires GitHub main, exact repository, first push attempt, no paid cron/provider key, and execution before `2026-10-31T09:00:00.000Z` (2 AM PDT). A delayed run HOLDs without spending.

## How to interpret

- `PRE_PAID_INFRASTRUCTURE_DB_WRITER_READY_NOT_QUOTA_PROVEN` verifies **DB reachability/retention-schema/permissions** at the time of the audit, not account quota, live service response, scheduled GitHub dispatch precision or science Gate 5 PASS.
- `HOLD_DB_SCHEMA_WRITER_OR_RETENTION` or `P4_NIGHT_PRECHECK_HOLD_NO_PROVIDER_NO_DATABASE_WRITE` means investigate the exact GitHub job condition without manually replaying paid code.
- `existingWsssRetainedSourceReceipts=0` is *missing or expired bounded source evidence*, **not** zero departing flights, and does not override tomorrow's frozen sampling.
- The paid attempt itself still runs its real live API/OpenAPI/quota and database preflight, at most **one GET per slot**, expected 2 REST API units, no provider retries, within the 15-minute cutoff guard. The 3:07/7:37 AM PDT schedules and the separate 12:15/3:15 PM PDT after-service no-provider audits remain unmodified.
- Neither this infrastructure check nor tomorrow's provider receipt alone proves operating identity, independent selected-T, actual versus estimated runway label, complete capture, persisted certified PRE, or Phase 6 readiness.

**Owner action:** none. Existing CI tests on the pull request must pass before merging, and the main-branch preflight run should be inspected for the measured result. No Replit terminal command or secrets in chat.
