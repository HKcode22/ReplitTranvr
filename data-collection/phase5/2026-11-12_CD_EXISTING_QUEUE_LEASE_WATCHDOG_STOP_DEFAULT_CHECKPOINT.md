# Phase 5 — autonomous existing V0087 lease/watchdog, STOP-default (Nov 12)

**Source:** GitHub `HKcode22/ReplitTranvr` and owner's previously pasted private Replit readback. **Code only in this PR, not live.**

## Reused foundations and verified scope

- V0087–V0091 were already installed in real team Neon PG16, inert, with 0 C+D tasks at last owner readback. **Do not reinstall them.**
- PR #586/V0092 signed packet + horizon scoped claim was merged at `c8ee87b2c4da86b9e51393f4ed957a5cf0a6b707` but **was NOT live-commissioned as of this checkpoint**. Owner must run separately reviewed one-shot V0092 install/readback before enabling either PRE worker or watchdog.
- PR #587 merged T24 scheduled singleton + actual PostgreSQL-clock lookahead and independent V0081 witness at `f27db74aaa2e03ca899f239df219b07f68d4c5fa`. Its workflow remains default disabled.
- **No second queue, claims, flight population, PRE writer, source GET, migration, login, privilege grant, Replit Agent, Cloudflare, paid airborne source or POST worker created here.**

## Specific engineering gap resolved

Existing T24 and T6/T90 PRE workers invoke the V0087 reaper only when they run. If GitHub has no due/signed roster, or a PRE job stops/crashes after a lease, expired tasks and uncertain commits could remain without periodic reconciliation. This increment adds a separate **default-OFF** GitHub `*/5` watchdog invoking the **already-installed** V0087 `clean.phase5_cd_reap_once_v39(64)` through the existing limited Stage30 PRE login and Stage28 `SET ROLE` adapter. It neither claims flight tasks nor writes snapshots.

**Before database mutation** the GH runner verifies real Git checkout code lineage to the separately approved executable SHA, existing Phase5 canary or separate Phase6 release, STOP=0, source/rights hashes, exact no-provider credentials, and the existing restricted PRE login. It then checks in real PostgreSQL:
- `current_database()='neondb'`, effective role exactly `phase5_fids_pre_writer_prod_20261107`.
- V0092 scoped claim function installed; old broad claim EXECUTE absent; direct queue UPDATE absent; PRE role has V0087 reaper EXECUTE.
- The only permitted queue action is **one** bounded existing reaper invocation (max 64 rows) per GH job. It reports READY reclaimed unstarted, MISSED real expired/cutoff, or QUARANTINED uncertain after Stage14 start. There is **no automatic retry** for any task whose write might have committed, no auto-ACK, no reread/repair of provider body.

**Scheduled execution** requires repo variable `P5_CD_GH_WATCHDOG_ENABLED=1` plus independently signed existing PRE credentials, gate flags and canary/Phase6 approval; it is omitted/disabled by default and cannot operate merely because schedule exists. Manual `workflow_dispatch` requires the exact no-provider watchdog confirmation and the same release gate. GitHub cancel/failure and cron jitter still exist; dashboard must count quality/missedness rather than assert every lease was checked within five minutes.

## Test, production and scientific boundaries

CI is disposable/mock-only; a pass means **code path tested**, not that Neon reaper was run or source rights independently certified. Tests cover STOP/no DB, unapproved event, pre-V0092 refusal, illegal old global claim/direct UPDATE, restricted role drift, one exact bounded reaper SQL, missed/READY counts, QUARANTINED after unknown write and no automatic replay.

Phase 5 requires still: actual V0092 owner installation, one independently reviewed original future flight and signed frozen packet, prospectively valid T24/T6/T90 where due, POST/receiver/STOP reconciliation, 31-batch-day roster rotation and budget monitoring, scientific actual departure-time label, source Contents/ML rights/retention review and independent final Phase5 freeze. Optional weather/ADS-B/missed horizons become explicitly recorded missingness, never fabricated backfill.

**Release:** Phase5 scientific FREEZE HOLD, Phase6 paid GO NO. Nov13 interim and Nov20 readiness targets conditional. This file must be updated with exact PR CI/merge outcomes only after those outcomes exist.
