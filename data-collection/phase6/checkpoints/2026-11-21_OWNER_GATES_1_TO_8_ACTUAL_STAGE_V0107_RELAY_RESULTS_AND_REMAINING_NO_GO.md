# Phase 6 fixed gates 1–8 — actual owner commissioning, accepted evidence, and remaining blockers

**Checkpoint date:** 2026-11-21 UTC (owner shell observed at approximately 14:41–14:43 UTC).  
**Disposition:** `PHASE6_PAID_GO=false`; no SOURCE authorization, no paid FIDS acquisition.  
**Evidence status:** This is a *review-only checkpoint branch*. **Do not merge this document or any new executable to production main without controlled reviewed main/pin/stage transition.** The actual commissioned disabled stage binds current production main `781140cde71af3b72376c2db9f0fdb84204a2b7c`.

## Governing decisions — not new blockers

- Controlling register: [2026-11-20 fixed Phase 6 gates](./2026-11-20_FIXED_PHASE6_LAUNCH_COMPLETION_REGISTER_NO_GO.md) and master issue [#413](https://github.com/HKcode22/ReplitTranvr/issues/413).
- Exact runnable frozen owner handoff was review-only PR [#933](https://github.com/HKcode22/ReplitTranvr/pull/933), head `ff24033ad2994e854454ee68805e0d1f39232bba`, script Git blob `0272671819bec1827ff65bd21cd6cf9ee91b27f6`. Its six exact-head checks all passed, including full Offline Safety `44914177129` and handoff-contract `44914177194`. The predecessor moving PR #932 is superseded. Do not merge #933 merely to execute the owner script.
- AeroDataBox bounded published-Terms source use remains reviewed in `data-collection/phase5/evidence/2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md`: ordinary Contents short-lived; genuine Derived Works separately verified; Article 5.8 identifiers used for identification/linking/retrieval, not copied source training records. No personalized extended-caching exception assumed.
- Amendment E T−6 continuous actual-gate-out target is **conditional**. True same-leg actual-only attestation generates a numerical label when lawfully observed; otherwise explicitly CENSORED. Generic ADB revised/runway/status or ADS-B are not substitutes. Future nonzero numerical labels are **not** a pre-launch blocker.
- Preserved scientific design f.8/A/B/C/D1/D2/E and Monday geometry: 31 days, 6,144 source templates, 36,740 reserved units, maximum 1,280/day, first planned SOURCE 2026-11-23T23:45:00Z, independent authorization before 23:10Z, outcome tail 2026-12-29T04:00:00Z. No unreviewed budget or calendar change.
- No regenerated keypairs, recreated roles, replacement Neon database, vendor replacement, rebuilt legacy stage, or retrospective PRE.

## Evidence from **actually executed** Replit owner handoff

The owner supplied a complete redacted shell transcript (2026-11-21 UTC). The GitHub workflows and production readback jobs below were independently checked.

### Gate 5 — DONE (exact disabled stage)

1. Deterministic existing-stage recovery and reviewed Monday package preparation returned `MONDAY_REVIEWED_PRIVATE_PACKAGE_PREPARED_NO_GO`, review digest `3eb640b6aa44de9c137847da70bee74d0a7d2897d14ad60975726fe6c55a63e1`.
2. The owner actually executed one bounded atomic `DISABLED_STAGE_MOVED_PROSPECTIVELY_NO_SOURCE_NO_PAID_GO` transition. Old cost rows preserved; 31 parent days changed prospectively; authorization stayed disabled.
3. The **independent production database readback passed**: `P6_PROSPECTIVE_DISABLED_STAGE_REVISION_READBACK_PASS_NO_GO` and `GATE5_EXACT_MONDAY_DISABLED_STAGE_AND_ARCHIVED_COST_VERIFIED`.
4. Exact committed new identities:
   - main/code: `781140cde71af3b72376c2db9f0fdb84204a2b7c`
   - stage packet SHA-256: `a4c30369fcb52eb58da2dd12ec0ea9dabb07fe41b171f44fcb766d0408b3f682`
   - cost SHA-256: `ebf61e512a40c03e3bd3be679a83f995645b199f0bbb172f82677e9cb7976f0e`
   - manifest SHA-256: `b2a691cb411af61c2bfdc42c55506e0ee86e45bfa3e22b420bbd738dc98ee4e4`
   - config SHA-256: `ee4ec9f6ca3e0f123512c8aa463cadd07a8892a3fedc4c316fe0c1b64731457c`
   - calendar SHA-256: `55ea0dd4b50d43af11af65a1e2910928e98a731ffa5efdeda7eee98ac451077b`
5. These committed stage/cost writes **must not be repeated**; further auditing should use official read-only reconciliation. This checkpoint is not a new stage approval or SOURCE enable.

### Gate 3 — V0107 installed; retention certification still OPEN

- Owner installed V0107 on real production under STOP and obtained `V0107_COMMISSIONED_PROFILE_STILL_DISABLED_NO_GO`, with `committedFunctionReadback=true`, stopped auth/batches/subs/deletion incidents/originals all zero and **two controlled DB function replacements**. Profile: `V0107_VERIFIED_FUTURE_POST_23H_MARGIN`.
- Current-main primary verifier [run 44915274503](https://github.com/HKcode22/ReplitTranvr/actions/runs/44915274503), job 136879435867, returned `PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES` and exact current main/profile, all nine pre-existing hazard counters zero, no provider calls, no DB writes.
- Relay target triggered actual protected production child [run 44915360246](https://github.com/HKcode22/ReplitTranvr/actions/runs/44915360246), job 136879694022. Its log verified `PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED` under `APPLY_DUE_ONLY`, real restricted actors and the V0107 profile. The live/eligible/due original counts were **zero**, so no purge was needed or observed. `backupOrPitrVerified=false`, `completeRetentionDeploymentVerified=false`, `phase6PaidGo=false`.
- **Still required:** physical due-time and failure fencing under genuine work, 24h FIDS/168h ordinary-source deadlines, proactive margin, complete object/backup/PITR/log/restore handling and missed-native-schedule mitigation. No zero-work receipt proves populated-workload physical deletion or 2-minute receipt latency.

### Gate 7 — real relay drift fixed; full autonomous rehearsal still OPEN

- Owner set and read back `P5_PRIMARY_FIDS_DEADLINE_PROFILE`, `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` and the external relay variables `TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID`, `TRAVNR_APPROVED_TARGET_MAIN_SHA`, `TRAVNR_CRON_RELAY_SHA`.
- Real relay [44915339874](https://github.com/HKcode22/TravnrClockRelay/actions/runs/44915339874) executed, returned `TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF`, identified target child 44915360246; child later completed SUCCESS and was separately inspected. This **resolves the previous target-main-drift preflight** for that scoped primary wake.
- Before repin, native controller heartbeat [44900124671](https://github.com/HKcode22/ReplitTranvr/actions/runs/44900124671) reported stale schedule observations; external managed-cron audit [44906842652](https://github.com/HKcode22/TravnrClockRelay/actions/runs/44906842652) found 11 HTTP ACKs and one unresolved identity in 12 sampled planned slots. Neither is fixed by relabeling a successful HTTP acknowledgement as verified execution.
- **Still required:** a bounded end-to-end *no-provider* rehearsal of PRE/POST actors, private storage, rolling SOURCE control, budget/STOP paths, native+external schedule continuity and actual target acknowledgement/child execution across required modes. Keep failing cron/heartbeat evidence visible.

### Gate 8 — isolated free account prearm NOT RUN, exact defect located

- The final stage of the owner bulk runner attempted `node review-tools/p6_launch_free_account_prearm_current_v39.mjs`, but this module exists **only on frozen review-only PR #933**, not released production main. The resulting `MODULE_NOT_FOUND` is a packaging/checkout-path error, **not** evidence of an inadequate account balance.
- Verified reviewed prearm script blob on #933: `bf6dff6e0f654836069b4cc289e5c7e750b28213`, standalone Node ESM; requires `AERODATABOX_API_KEY`, and explicitly limits requests to `GET /subscriptions/balance` and `GET /subscriptions/webhook`. It includes no FIDS/source or mutation call. Fetch to a temporary private `.mjs` file with exact Git blob SHA and Node syntax/hash validation, then run with production DB credentials removed, `ADB_AUTO_COLLECT=0`, `V39_PHASE6_PROCESS_ARMED=0`, `V39_PHASE6_OWNER_APPROVED=0`. **Do not rerun Gates 5/3/7 just for this check.**
- The actual free balance/subscription/allowance prearm readback remains pending, as do the exact scoped SOURCE ledger approval and separate paid GO. The current committed ledger `data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json` still contains 29 evidence records and **0 approvals**; blanket owner authorization is not an exact audit-ready entry.

## Fixed eight gates — what IS / IS NOT done now

| Gate | Implemented/verified | What remains | Disposition |
|---|---|---|---|
| **1. Independent PRE** | Native signed producer, restricted role/read transport, full-width flight-identity protections, tests and merged implementation | Actual independently accepted 16-field and purpose-bound reference policy bytes, local signer/reader placement and exact stage-specific commission/readback; disarmed real actor preflight | **IN PROGRESS / NOT COMMISSIONED** |
| **2. Independent POST** | Reviewer/settlement/recovery/transport implemented; Amendment E censoring understood | Exact protected reviewer/reader/publisher roles, policy byte/secret readback and no-provider actor rehearsal | **IN PROGRESS / NOT COMMISSIONED** |
| **3. Retention** | Production V0107 installed; actual current-main primary VERIFY, relay-driven primary child run success with zero live originals | Positive populated-workload hard/proactive deadline, backup/PITR/log/restore custody, operator STOP proof | **IN PROGRESS / FUNCTION UPGRADE DONE** |
| **4. Executable review and merge** | PR #926 merged; scoped technical review accepted and final executable checks passed; #931 Monday decision merged | Separate runtime/source admission still outside Gate 4 | **DONE (SCOPED EXECUTABLE GATE)** |
| **5. Disabled Monday stage** | Actual atomic disabled revision, exact independent stage/cost/archived-original readback | No replay. Subsequent code/main changes require controlled approval/pin transition | **DONE** |
| **6. Protected runtime** | Existing six recovered candidate policy bytes/owner keypairs and static installer implemented | Current Monday six exact reviewed policies + 31 static values + PRE/POST/runtime bindings installed with independent readback | **NOT DONE / BLOCKED ON REVIEWED INPUTS** |
| **7. Autonomous rehearsal** | Actual primary-only relay repin + real protected child execution | Full zero-provider native/relay/clock/actor/budget/recovery rehearsal, stale schedule incident resolution | **IN PROGRESS / PARTIAL** |
| **8. Separate SOURCE admission & paid GO** | Account prearm helper code on PR #933; older account evidence; paid paths remain stopped | Isolated fresh free read, scoped approval ledger, verified source enable/STOP readback, separate paid GO, post-GO first actual SOURCE receipt | **NOT DONE / SOURCE DISABLED** |

## Exact next safe execution order

1. **Only** isolated Gate-8 account prearm using the reviewed #933 prearm script blob and a temporary private file; capture redacted JSON. Do not rerun completed Monday/V0107 commissioning.
2. Review/commission existing Gate-1 PRE and Gate-2 POST independent field, reference, signer, publisher and reader policies; ensure real production credentials are separate and protected. No invented long-lived right from categorical normalization or hashing.
3. Use the already-existing Gate-6 owner six-policy/31-static assembler once with *actual* scoped review decisions and an exact approved SOURCE artifact. Do not fabricate the approval ledger, regenerate keypairs, or install source enable early.
4. Reconcile exact existing primary/rolling native and relay paths; obtain **one** honest bounded no-provider integrated Gate-7 rehearsal and actual readback. Distinguish child success from cron manager ACK-only gaps.
5. Finish the remaining retention/backup/PITR certification, no overwrite of provider-shaped full originals beyond allowed TTL.
6. Only when the scoped SOURCE ledger and all relevant independent production observations are valid, execute existing separate SOURCE enable, verify exact readbacks, then separately authorize paid GO under the existing cap/floor. The first authentic paid SOURCE receipt is post-GO execution proof, not an impossible prelaunch input.
7. Re-evaluate the first SOURCE deadline (2026-11-23 23:45Z) prospectively. If it is missed, preserve study geometry and advance through an explicitly reviewed prospective correction; never backdate or rewrite PRE.

**No new source or paid provider GET, backend/source enable, signer creation, production DB write, workflow dispatch, or main change is performed by committing this checkpoint to a review-only branch.**

## Additional callback publication result — actual Replit status SUCCESS

After the owner's clean current-main synchronization, the connected Replit publish operation was executed once for the existing `ReplitTranvr` app (`d2a063c7-c2c2-4f46-9db4-3a3850d2eb1f`). The connector reported successive `pending`, `building`, `promoting`, and finally **`success`** for the existing deployment `c11d7f04-1b9b-4e39-977a-5fb50138d134`, public URL `https://replit-tranvr--hk84164.replit.app`. This resolves the earlier **publish-operation failure** as of this observation. The .replit runtime stays callback-only, with `ADB_AUTO_COLLECT=false`, and the V5 build wrapper is `scripts/v39_phase5_callback_release_v5_reviewed_build_v39.sh`.

Independent GitHub comparison `c3c3050e12c4e327f9c82c35c95f856f3c1cbd20...781140cde71af3b72376c2db9f0fdb84204a2b7c` contains **zero changes in V5 guarded `client/`, `server/`, `shared/` or listed main build inputs**. This is static provenance evidence. The publish API's `success` does **not** independently attest the live HTTP receiver's exact build metadata, signed webhook delivery, raw-before-2xx custody, production database policy or provider balance. A separate public-root fetch was not accessible to the inspecting web client, so HTTP health is **not claimed**. Preserve these remaining Gate-6 acceptance limits; do not republish again solely to turn an API success badge into callback-science proof. No paid SOURCE enable or GO was performed by publishing.
