# Phase 5 — GitHub PREPARE one source-bound flight task (after V0091 owner install)

**Date:** 2026-11-12 Pacific. **Engineering implementation STAGED, owner release still STOP.**

## Reuse, no repetition

- V0087–V0090 are **already LIVE** by owner-submitted private Replit readbacks. Do not reinstall.
- PR #579 (merged `d95611d7750c9cb064d74c914561dfe6c1a5089f`) added **STOP-default signed GitHub T−6h/T−90m PRE execution**, real V0088 inside the original Stage14 transaction and existing Stage28 dedicated PRE identity; zero real flight jobs dispatched yet.
- PR #580 (merged `9da3ac7ac897de8a967f8f4e99c8f18fdc79178d`) added V0091 source-bound one-flight task registration via **existing Stage30 PREPARE NOLOGIN group**, an actual one-shot V0091 owner installer and a **passing disposable original FIDS→V0087 queue→Stage14 test**. V0091 was **not** installed live when this document was authored. Owner must run the pinned new V0091 Replit command and provide sanitized `V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT` readback before GH registrar can work.

## New code: the missing existing-source→queue GH packet registrar

- `server/lib/disruption/phase5CdGithubPrepareRegistrationGate_v39.ts` is an **independent PREPARE-only** release gate: manual `workflow_dispatch`, exact reviewed SHA on `main`, signed frozen roster and real signed source-rights/manifest SHA, STOP-clear, existing PREPARE login `phase5_p30_prepare_login_20261107`, no PRE login, no provider/source/runtime/witness credentials, no paid HTTP.
- `scripts/v39_phase5_cd_github_one_source_bound_enqueue_v39.ts` **reuses** `verifyP5CdFrozenRoster` from the PR579 C+D PRE controller, which supports the already-established witnessed later `T−6h` and `T−90m` packet types. Requires exactly ONE reviewed packet in the frozen roster for initial canary. Uses original Stage14 `preflightP5Stage14ReviewedPermitV39` before opening a DB connection. After valid roster verification, opens the **existing Stage28 SET-only PREPARE pool** and invokes `clean.phase5_cd_register_source_flight_v39` once with exactly the ten reviewed inputs. V0091 itself verifies real bound original, rights hash, first native T, normalized single confirmed operating leg, time cutoff, raw source retention, and uniqueness, before writing **one** durable READY queue task. Caller cannot substitute the expiry; it comes only from immutable V0079 binding.
- `.github/workflows/phase5-cd-github-one-source-register-main-manual.yml` runs only on manually dispatched `main` with a separately set `P5_CD_GH_PREPARE_SOURCE_ENABLED=1` repository variable, exact confirmation string, exact SHA and STOP-clear existing secrets, and **only the existing `P5_V39_PREPARE_DATABASE_URL`**, never source/provider/PRE/witness. Missing any owner/reviewer release condition is HOLD before `npm ci` or DB access. No schedule or blind auto-retry for source enrollment.
- `tests/phase5_cd_github_prepare_source_registration_offline_v39.test.ts` checks one explicit Phase5 non-provider canary vs separate post-freeze Phase6 GO, wrong repository/ref/attempt, STOP, code mismatch, forbidden credentials, exact V0091 ten arguments and no caller expiry. Real V0091 SQL+Stage14 source fixture already independently tested by PR580.

### Why one packet initially?

A DB registration request can commit successfully and lose its acknowledgment. A blind GH retry could then hit the immutable duplicate key or conceal a source data issue. Restricting the initial canary to one exact reviewed flight/packet makes independent readback and duplicate/unknown-commit quarantine manageable. This is a **pilot safety bound**, not a month-long one-flight quota; extend after actual crash and due-window evidence. Any missing source is simply a missing/censored eligible sample, not the invalidation of the experiment.

### Scientific and scheduling limits (still OPEN)

- This code does **not** call AeroDataBox, spend an Alert, upload a new source, synthesize a native T, normalize extra records or install V0091 live. **It registers only an already-bound and reviewed ORIGINAL**. Source provider requests use previously reviewed GH-only acquisition workflows separately.
- **T−24h** still requires the existing V0081 **independent post-COMMIT witness** and has not been wired into the new queue controller. The old standalone-later-without-T24 protocol is separately reviewed and NOT silently bypassed here. The T6/T90 registrar needs a genuine witnessed earlier T24 for the original Stage14 later path.
- Signed SHA/owner approval are not self-certifying provider Contents rights or source use for ML. Bounded missingness and genuine physical labels still need review; free ADSB.lol wheels-off is not aircraft gate-out.
- PRE controller GitHub cron `*/5` might miss its three-minute own-cutoff window; never backfill. Early source enrollment and targeted dispatch, empirical jitter distribution and STOP/reaper evidence remain necessary.
- Owner deadline: Nov 13 interim progress, Nov 20 outside target for realistic Phase5 readiness, contingent on actual source and permit. No unconditional Phase6 paid GO.

**Status:** V0087–V0090 live, V0091 **staged until owner confirms**, GH source registrar code built but default STOP, no real PRE, Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.
