# 2026-11-12 PST / 2026-11-13 UTC — separate least-privilege B0062 and V0093 prelaunch writer LOGINS

**Status:** owner-only, STOP-default commissioning code, disposable PostgreSQL16 test candidate. **Not actually run against production Neon; two LOGINs and secrets are not claimed live.** The independently installed V0079–V0093 schemas and all previous SOURCE/PRE/POST worker logins are preserved. Scientific FREEZE HOLD, Phase6 paid NO-GO.

## Verified actual engineering gap

The already merged [#603 B0062 inert calendar/UTC writer](../../server/lib/disruption/phase5B0062InertCalendarUtcBudgetStage_v39.mjs) and [#608 V0093 cost-only seven-category freeze writer](../../server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs) were tested on disposable PG16 with two restricted dedicated LOGIN identities. They each **require** `current_user = session_user` equal to an exact approved pattern and an allowlisted privilege matrix. An existing V0082 `NOLOGIN` group is not a replacement for either dedicated session credential; the two production writer LOGINs have not yet been verified as commissioned.

This is **not a request to reinstall** V0079–V0093 or the three Stage30 nonpaid worker logins, and it is not the independently verified `neondb_owner` V0093 schema migration. The actual post-V0093 source/calendar/budget table counts were all zero as of `2026-11-13T04:35:08.247Z`, not a live check performed by this patch.

## New exact scoped owner-only implementation

[`scripts/v39_phase5_prelaunch_two_narrow_logins_owner_once.mjs`](../../scripts/v39_phase5_prelaunch_two_narrow_logins_owner_once.mjs) commissions **only two previously absent dedicated NOINHERIT LOGIN roles** and, in a separately approved owner Shell, two private GitHub Actions connection URL secrets. It does NOT create new tables, apply SQL migrations, stage a calendar, freeze categories, create source queries, or enable any Phase6 authorization.

1. `phase5_b0062_prelaunch_stage_prod20261113` can **SELECT** only the ten already reviewed B0062/V0079/V0082 staging and guard tables; **INSERT** only calendar, disabled authorization, cycle and physical UTC budget. No UPDATE/DELETE/TRUNCATE. No operating flight/raw/source POST/PRE privileges. Secret name: `P5_V39_B0062_PRELAUNCH_STAGE_DATABASE_URL`.
2. `phase5_fids_budget_freeze_prod20261113` can **SELECT** only the eight already reviewed B0062/V0079/V0082 category-review tables; **INSERT** only typed V0093 release, seven cycle caps, per-physical-UTC seven-category rows. No UPDATE/DELETE/TRUNCATE. No operating flight/raw/source POST/PRE privileges. Secret name: `P5_V39_V0093_COST_ONLY_BUDGET_DATABASE_URL`.

The existing writers accept both exact role names under their respective `^phase5_*_...$` restricted naming patterns **when** independently pinned in reviewed input; they never auto-discover a role or change the manifest. These roles are **not** members of existing roles, and neither has `CREATEROLE`, `CREATEDB`, SUPERUSER, REPLICATION, or BYPASSRLS.

The owner commissioner requires one exact reviewed GitHub **main SHA**, separately supplied explicit one-use consent, ADB/other provider keys absent from the process, original PG16 primary, zero study/source rows, installed typed V0093, no preexisting exact role/secret, and two narrow table-level ACL readbacks. It follows existing V0083's tested GitHub encrypted-secret-before-DB-COMMIT pattern with rollback+scoped secret cleanup on a precommit failure. Any ambiguous/postcommit SQL outcome is **QUARANTINE / no blind retry**. It never prints passwords or URLs. No elevated LOGIN, cross-membership, or schema changes are permitted.

**Important:** commissioning permission is not authority to run the #603 and #608 staging writers. Those require a **different** independently signed genuine future calendar/treatment + exact current provider range, 31 physical UTC seven-category cap and source rights review, then an independent exact poststage audit [#619](2026-11-12_EXACT_B0062_V0093_INDEPENDENT_POSTSTAGE_ROW_AND_BUDGET_READBACK.md). The manifest rights and user-specific model target are still separate decisions.

## Disposable verification and accurate limits

New isolated PostgreSQL16 Actions workflow `phase5-b0062-v0093-two-narrow-logins-owner-disposable-pg16.yml` installs the already-existing schema only in a **throwaway local container**. Tests inject a mock GitHub secret driver (never real credentials), exercise mismatched SHA, preexisting secrets, injected precommit failure/rollback+secret cleanup, successful two-role commission, all table allow/deny ACLs and no memberships/admin, and refuse the second attempt. It asserts zero calendar, source, physical GET or budget release rows throughout.

**No live Neon, GH secret, provider or production flight write occurs from CI.** A green test certifies the design on disposable PG16 only. We must still independently inspect actual production ownership/privilege state and receive explicit exact owner authorization before any real commissioning. No Replit Agent, no paid action, no old migration reinstall.

## Release sequence still required

- Finish authentic future **31** B0062 parent days: 10 genuine corrected paired windows, 21 ordinary HUB/region plans with MID/REGIONAL ICAOs unknown until prospective draw, independent treatment and 31 draw-seed commitments, 24h global END→START washout and first T−24h lead.
- Check current AeroDataBox/RapidAPI balance/unit/range and legally permitted Contents/ML retention/use, verify seven actual physical UTC REST categories, POST reserved units and separate Alert SEND/STOP.
- Commission these two narrow roles separately (only if current exact production state and credentials justify it), then run **already implemented** #603 disabled-auth 31-day writer and #608 V0093 cost-only category writer with the exact signed input and separate independent readbacks.
- Only independently issue Phase5 scientific FREEZE and separately Phase6 paid GO. Then real GitHub source→operating-flight originals→C+D T24/T6/T90→POST/receiver/STOP happens prospectively with honest missingness.

**Do not claim** that 31-day signed/source feature/POST packets, legally authorized operations, auto packet enrollment, source credit purchases or client-ready physical delay predictions exist just because the LOGIN commissioner passes CI.
