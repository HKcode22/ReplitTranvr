# Phase 5 Stage 26 checkpoint — Teach the code while advancing real access commissioning

**2026-11-07 UTC.** This change joins the user's two priorities: understand our real Phase 5 backend code in detail **without delaying** scientifically correct implementation. The earlier complete implementation log remains a historical record; Plan f.8 can be transparently amended prospectively when observations/mathematics warrant it.

## New owner teaching materials

1. [Start Here: FREEZE, FIDS, FIDS-only pilot, PRE/POST, selected T, ML data leakage, budget and HOLD](PHASE5_START_HERE_FREEZE_FIDS_PILOT_GLOSSARY_20261107.md). Defines scientific freeze as a reviewed/versioned experimental protocol, not an immutable plan or a STOP switch. Distinguishes the Phase4 FIDS-only schedule-revision pilot from actual physical operating-leg/runway/Alert proof. Shows the genuine Stage23 installation and Stage24/25 status. No account re-identification.
2. [Section B Deep Code Lab: line-by-line TypeScript/JavaScript/embedded PostgreSQL](PHASE5_SECTION_B_DEEP_CODE_LAB_LINE_BY_LINE_20261107.md). Real source excerpts with GitHub line anchors from sampling decisions, early readback, finite candidate solver recursion, segmented source cutoff interval union, `Pool.connect()`, SQL `SELECT`, `INSERT`, `$1` binding, V0079's **mutating `SELECT function()`**, error paths and COMMIT/ROLLBACK. Marks abridged excerpts and teaching pseudocode explicitly, and includes exercises with solutions.
3. [Existing full 14-lesson engineering guide](PHASE5_ENGINEERING_FIELD_GUIDE_FILE_BY_FILE_20261107.md) and [Phase5 README](README.md) updated to link those two easy-onramps, fix stale preinstalled/installed wording, and make the expanded Section B source map discoverable.

These documents **do not block engineering** or change source/data/spending permissions. Owner can study them at any pace.

## Actual engineering — Stage 26 four production NOLOGIN roles without activation

Previous independent evidence:
- Stage23 owner production Replit Shell `P5_EMPTY_V0079_80_81_SCHEMA_DURABLE_INERT`: 8 staged tables, 1 index, 9 helper functions, zero PUBLIC privilege, zero production source grants, zero new flight rows/GETs/Alerts. **Do not rerun**.
- Stage24 T6/T90 witness-gated writer merged PR #455.
- Stage25 four isolated **NOLOGIN disposable PostgreSQL16** role matrix merged PR #456 `main=eca8ff557aece054d131aef18fe0722205ddc1ed`.
- Stage25 read showed **one concrete missing role privilege** for the staged Stage9 PREPARED-query writer: `SELECT` on `clean.adb_phase6_authorization`. The proposed owner installer now includes this permission while still denying PRE/source crosswrites.

New [Stage26 owner commissioning script](../../scripts/v39_phase5_stage26_four_nologin_roles_owner_once.mjs) is a real production-capable **atomic four-role installer** (but **not executed in production yet**). No secrets/passwords, `LOGIN`, role memberships or new source worker. Specifically:
- Checks explicit literal `P5_STAGE26_FOUR_NOLOGIN_ROLES_ONCE=INSTALL_FOUR_NOLOGIN_P5_ROLES_WITH_NO_RUNTIME_MEMBERS`, distinct admin/runtime DB URLs, engine PG16 primary `neondb`, account `CREATEROLE`, installed eight V0079/V0080/V0081 relations and guarded V0079/V0080 functions, and the snapshot ID sequence. Any mismatch HOLD before changing objects.
- One `SERIALIZABLE` PostgreSQL transaction and advisory lock creates **four NOLOGIN NOINHERIT** future permission groups: plan publisher, physical FIDS source, flight PRE, independent T24 witness. Grants only the reviewed SELECT/INSERT/EXECUTE/SEQUENCE privileges and validates both positive/negative `has_table_privilege` checks.
- No login, no password, no granted member, no app runtime activation. A separate future reviewed credential/membership step is needed before any code can use those groups. This is intentional, because the source role's two `SECURITY DEFINER` functions can mutate paid API reservation ledgers if granted to a real active caller.
- After COMMIT, a separate transaction confirms roles still exist and forbidden operations still fail; duplicate installation or ambiguous COMMIT quarantine (never blindly retry). Test-only forced rollback proves no partial roles survive.
- [Dedicated disposable real PG16 workflow](../../.github/workflows/phase5-stage26-nologin-role-installer-disposable-pg16.yml) tests B0062→V79/80/81 migration, injected rollback, all four restricted NOLOGIN roles, no runtime membership, and repeated installer refusal. **No production URLs/credentials or AeroDataBox API keys in CI.**

**CI and merge status must be read from the current exact-head PR before any action**. A successful CI-only test does not mean production roles are installed. If CI passes, source-pin the exact main SHA and installer blob before offering the user **one** Replit Shell command, with explicit note that role creations/grants are persistent DB changes but do not bill the provider or activate collection. A `CREATEROLE` permission failure would be a legitimate HOLD requiring approved owner work; no superuser escalation guess.

## Remaining critical Phase5 work

Reviewed real production credentials for precisely these groups (not app runtime), GitHub-only daily source/source-original/prospective T24 and independent Stage17 T24 witness, genuine T6/T90 original PRE cutoffs, receiver/POST/Alert/AIRBORNE verified physical operating-leg outcome and missingness reports; actual signed 31 batch-day five-crossover calendar, measured provider range/cost, external provider-native selected T evidence, legal normalized Contents purpose/retention review under #300, and independent FINAL scientific FREEZE and separate Phase6 GO.

**Current scientific status: Phase5 FREEZE HOLD / Phase6 paid GO NO.** User's existing RapidAPI plan/balance records already documented in GitHub; don't repeat email/account searches. Do not misstate nonpaid CI as an executed paid source call.
