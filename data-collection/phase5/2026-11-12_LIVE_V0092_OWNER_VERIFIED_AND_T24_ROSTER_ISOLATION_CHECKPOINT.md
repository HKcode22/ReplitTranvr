# November 12, 2026 — V0092 LIVE: Phase 5 C+D scoped claims, watchdog, T24 source-roster separation

**Ground truth:** owner's pasted Replit Shell output in this session, installer pinned to **GitHub main** commit `c8ee87b2c4da86b9e51393f4ed957a5cf0a6b707`, SQL blob `b44f2e6b43d6874ab00530e149cabcbe89d499a1`, plus independently read GitHub PR/CI statuses. The database itself was **not queried from ChatGPT**; do not claim independent live SQL confirmation or real flight acquisition.

## REAL production V0092 result — do not reinstall

Owner used the reviewed one-shot `scripts/v39_phase5_cd_v0092_owner_once.mjs`. The output explicitly returned:

```json
{
  "status": "V0092_SIGNED_PACKET_HORIZON_CLAIM_COMMISSIONED_INERT",
  "reviewedSqlGitBlob": "b44f2e6b43d6874ab00530e149cabcbe89d499a1",
  "verified": {
    "queueRows": 0,
    "realDatabase": "neondb",
    "ownerDbRole": "neondb_owner",
    "functionOwner": "phase5_cd_queue_function_owner_v39",
    "existingPreRole": "phase5_fids_pre_writer_prod_20261107",
    "signedOnlyClaimExecute": true,
    "oldUnscopedPreClaimRevoked": true,
    "directPreQueueUpdateGranted": false,
    "newLoginCreated": false,
    "realTasksEnrolled": 0
  },
  "providerCalls": 0,
  "paidProviderCalls": 0,
  "githubWorkerScheduled": false,
  "sourceRightsCertifiedHere": false,
  "phase5ScientificFreezePassed": false,
  "phase6PaidGo": false
}
```

**V0087–V0092 are now all owner-confirmed installed in the real project Neon PG16. Never rerun any of their installer scripts.** No flight was enrolled, no PRE/POST was written by this operation, no provider requests, no new GitHub workers. The Node `pg` SSL-mode future-warning was nonfatal; separately audit `sslmode=verify-full` compatibility during normal secure client upgrades, not by changing unrelated credentials now.

## GitHub code milestones and real deployment boundaries

- [#586 signed-horizon V0092](https://github.com/HKcode22/ReplitTranvr/pull/586) merged at `c8ee87b...`; now owner-confirmed LIVE **schema/function only**, zero tasks.
- [#587 bounded unattended T24 Stage14→separate V0081 witness](https://github.com/HKcode22/ReplitTranvr/pull/587) merged `f27db74aaa2e03ca899f239df219b07f68d4c5fa`, tests green; GH schedule is **default STOP**. It adds a separate reviewed T24 singleton roster hash; no signed genuine future source packet yet.
- [#588 V0087 lease recovery watchdog](https://github.com/HKcode22/ReplitTranvr/pull/588) merged `7584bad80b1cc83ed46f98983b64dc11bbba3dcf` after 5 green jobs plus 1 expected skip. Existing restricted PRE role invokes the already installed reaper; unknown COMMIT is QUARANTINED without automatic replay. **Not armed or live-run**.
- **Current narrowly scoped fix:** canonical `.github/workflows/phase5-cd-github-one-source-register-main-manual.yml` previously routed `P5_CD_GH_PRE_ROSTER_SHA256` to the late T6/T90 secret even when owner manually selected `T-24h`. That meant preparing an independent T24 singleton required overwriting the later worker's reviewed roster hash. Route the registration's *effective* `P5_CD_GH_PRE_ROSTER_SHA256` to **`P5_CD_GH_T24_ROSTER_SHA256` when `inputs.horizon_mode=='T-24h'`**, retaining the unchanged `P5_CD_GH_PRE_ROSTER_SHA256` for T6/T90. The original preparation gate and one-transaction V0091 registrar remain unchanged, with runtime source/rights and exact-review gates still mandatory. Focused CI guards source+consumer separation. No paid source, no database connection from tests.

## Remaining finite Phase 5 exit sequence

1. **Real next-flight source and rights:** independently review provider Contents/ML/retention purpose (open [issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300)); select one *future* signed four-airport/physical operating flight with real original V0079 binding, native scheduled departure milestone, actual reservation and exact response hash. The canonical V0091 registrar accepts only a genuine unexpired source and positive remaining PRE cutoff. Do not invent an original or reclassify conditional service as physical.
2. **Prospective one-flight canary:** with separate Phase5 canary authorizations, correctly signed packet and original PREPARE login, register its T24 task once; allow only genuinely time-safe PRE; independently commit/read V0081 witness; register/claim T6/T90 only where prior witnessed T24 is real; reconcile unknown COMMIT outside automatic workers. A missed horizon is **censored**, never backfilled. Do **not** automatically re-run V0091 on ambiguous ACK.
3. **POST and collector continuity:** reuse already merged GH early draw/source child, seven REST-category budget and future V0083 POST/receiver paths, but the latter remain **separately paid after approved release**; test signed future POST and source recipient/STOP without hardcoded Phase4 Nov5 cohort. Finish day-level 31-parent-day roster rotation, source + PRE/POST handoff and no-human watchdog/accounting.
4. **ONE canonical Amendment E:** T−6h *actual gate-out* departure-delay minutes is **conditional primary candidate**, T−90m update, T−24h comparator, distinct AIRBORNE arrival ETA. Flight status/revised schedule and free ADSB.lol *estimated takeoff* are different outcome tiers, not actual gate-out. Capture missingness; ensure licensed retained features, source as-of clock, identity and matched observed labels before protected Phase7 evaluation.
5. **Independent release decision:** source-use/backup/TTL rights, same-milestone label, daily 50k internal project ceiling (legacy account most recently observed 60k available; entitlement ≠ rights), Alert credits, 31-day exposure and explicit STOP/owner visibility. Issue a separate signed Phase5 freeze and *then* paid Phase6 GO only on evidence. User's authorization of paid spending is **not** a scientific/license certification.

**Nov 13** interim engineering review, **Nov 20** conditional target for Phase5 readiness, not promises. The 31-parent-day run starts **inside Phase6**, not before Phase5. Never repeat completed Phases 1–4 assets, add a second queue, Cloudflare, Replit AI Agent or another paid ADS-B provider.

**Current release status:** Phase5 scientific FREEZE **HOLD**; Phase6 paid GO **NO**. Live V0092 installed, GH workers not armed, queue remains 0 at last owner proof. Next engineering work must target authentic source→witness→POST and unattended roster/recovery rather than schema installation.
