> **STATUS UPDATE — superseded 2026-11-13 06:36:21 UTC:** The separate independent live Neon read-only login check is **NO LONGER PENDING**. The actual main-branch manual GitHub Actions [run #43379809484](https://github.com/HKcode22/ReplitTranvr/actions/runs/43379809484) returned `P5_B0062_V0093_BOTH_REAL_LOGINS_INDEPENDENT_PG16_READONLY_PASS_NO_GO`, with **both real dedicated GitHub-secret-authenticated roles** tested independently. [Read the full exact live PASS checkpoint](2026-11-13_ACTUAL_B0062_V0093_BOTH_RESTRICTED_LOGINS_INDEPENDENT_READONLY_PASS_NO_GO.md). This older entry below preserves the historical owner commissioning receipt and historical pending status only; **do not rerun** the commissioner. Science FREEZE HOLD; paid Phase6 NO-GO.

# 2026-11-12 PDT / 2026-11-13 UTC — real B0062 + V0093 production LOGIN commissioning SUCCESS, independent readback pending

**Status: ACTUAL owner-reported success receipt, no production SQL schema reinstall and no paid collection.** This is **not** merely a disposable PG16 CI result and **not** an independent readback of the two logins after the transaction. Keep these two forms of evidence separate.

## Exact genuine owner Replit receipt (2026-11-12 local evening)

The project owner ran the SHA- and Git-blob-pinned one-use script from [merged PR #620](https://github.com/HKcode22/ReplitTranvr/pull/620) using approved GitHub main `db6352ab4b73a47702fd2c675bdae398e4b1bd20` and exact script blob `8de7bae4858de8263ee44162e59dd3cd6683162b`, with `DATABASE_URL` only in their private Replit Shell. The owner supplied the actual terminal result:

```json
{
  "status": "P5_B0062_AND_V0093_TWO_NARROW_LOGINS_COMMISSIONED_NO_GO",
  "productionLoginCount": 2,
  "encryptedGithubSecretsCreated": 2,
  "secretNames": [
    "P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL",
    "P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL"
  ],
  "directTableGrantsOnly": true,
  "noRoleMemberships": true,
  "noSourceOrFlightACL": true,
  "dbSourceRowsWritten": 0,
  "calendarOrBudgetRowsWritten": 0,
  "providerCalls": 0,
  "phase5ScientificFreeze": false,
  "phase6PaidGo": false
}
```

This output followed `COMMIT` and a same-process catalog readback in the installer, not merely an attempt to create roles. Two new SQL logins reportedly committed and two GitHub Actions encrypted secrets reportedly appeared. **Never rerun that one-shot installer; it intentionally rejects existing roles/secrets.**

Two exact SQL login names:
- `phase5_b0062_prelaunch_stage_prod20261113`: **INSERT only** into approved calendar, disabled authorization and cycle/physical-UTC budget staging; limited SELECT review tables.
- `phase5_fids_budget_freeze_prod20261113`: **INSERT only** into three V0093 typed-cost seven-category release/caps/UTC daily-category tables; limited SELECT review tables.

Neither identity is the historical Stage30 PREPARE worker, Stage14 PRE writer, T24 witness, SOURCE read-only identity, V0083 POST role, nor the `neondb_owner` schema installer. This commissioning must **not** be used to create a second queue, another worker, new migration or paid provider access.

The `pg-connection-string` SSL message in owner Shell is a dependency warning about future interpretation of `sslmode` aliases, **not an observed TLS failure**. No credentials or connection URLs should ever be copied into GitHub issue comments, PRs or documentation.

## Why an independent new session still matters

The original installer verified table grants and no memberships in the same transaction, then committed; it also checked again in the same connection. Independent verification should authenticate **both actual GitHub secret connection URLs as the exact new role logins**, on independent PG16 sessions, with read-only transactions, and check effective grants across the complete allow/deny matrix. Also inspect `SECURITY DEFINER` routines accessible through PUBLIC or explicit EXECUTE that could bypass direct table ACL; absence of `INSERT` grants alone cannot prove no executable privilege escalation.

Proposed verification: [STOP-default manual exact-main GitHub Actions workflow](../../.github/workflows/phase5-b0062-v0093-two-new-logins-independent-readonly-manual.yml), using [dedicated independent auditor](../../scripts/v39_phase5_two_stage_logins_independent_live_readonly_once.mjs), with PR-only zero-secret mock tests and a separate disposable PostgreSQL16 integration test that **really reconnects as both restricted roles after committing them** in a local container. **Do not claim real independent Neon PASS until an explicitly manually dispatched main workflow finishes successfully with both secret-backed role sessions.** That workflow does NOT mutate role/credential/SQL state, call AeroDataBox, or activate Phase6. It requires an exact reviewed main SHA and explicit affirmative confirmation.

## Phase 5→6 actual remaining critical path (after this one-time credential installation)

1. Authenticate the two real logins with a fresh restricted READ ONLY readback; if a role/function permission anomaly is detected, HOLD and review instead of replaying commissioning.
2. Finish independently reviewed **future** 31-day B0062 parent calendar with ten paired windows and 21 **unselected** ordinary MID/REGIONAL airport identities, day seeds, protected 20/5/6 partition and genuine T−24h/washout geometry. Do not replace genuine selection with synthetic airport identities.
3. Review actual current RapidAPI/AeroDataBox REST unit balance/range and Contents rights, seven physical UTC categories and separate Alert credits and REST/POST STOP. Keep conservative documented limits but do not pretend old plan quota is fresh.
4. Using the existing #603 disabled-authority stage writer and #608 typed seven-category cost freeze **only with actual independently pinned approved packet and their new restricted logins**, then invoke existing #619 independent exact production readback. **Nothing about credential commissioning authorized those two writes**.
5. Finish true 31-day automatic signed day/shard publication, source original → independently reviewed operating-leg packet → V0091 task registration → Stage14/V0081 T24/T6/T90 → V0083 POST/receiver/STOP, bounded capacity and true missingness. [Current open issue #553](https://github.com/HKcode22/ReplitTranvr/issues/553).
6. Independent Phase5 scientific FREEZE and separately explicit paid Phase6 GO. No new paid source GET or backfill before the applicable GO.

**Bottom line:** The two credentials are a real completed owner operation, not a reason to reinstall migration V0079–V0093, repeat YSSY/WSSS probes, or claim month-long Phase6 automation. Scientific FREEZE **HOLD**, paid Phase6 **NO-GO**.
