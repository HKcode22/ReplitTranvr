# Gate 3 — 2026-10-16 PDT / 2026-10-17 UTC — Two-Stage WSSS Watchdog Continuity

**State: DRAFT, NOT PAID, NOT GATE3 PASS.** Do not use the old credit_canary or deploy/execute this proposed code. The three independent source-level paid/recovery release constants are still FALSE; no AeroDataBox CREATE, credit spend, live database writes, Replit republish, or production migration was performed during this work.

## Repository and prior work

Repo HKcode22/ReplitTranvr. Verified base main SHA ec1f6aca1ac53904ef53938f557040e9d562a46f, merged PR58. Prior PR56 provided 5s Gate3 balance polling and exact-owned stop decision; PR57 the independent GitHub Actions sidecar with strict LIST → owned DELETE → LIST recovery; PR58 the verified GitHub Actions bot ARM/ACTIVE/STOPPED lease and fresh heartbeat. New **draft PR59** https://github.com/HKcode22/ReplitTranvr/pull/59 on branch phase3-gate3-two-stage-owner-watchdog-20261017.

Owner's approved scope unchanged: ONE WSSS airport-wide departures Flight Alert canary, **600 seconds intended**, **soft 50 Alert-credit stopping target**, possible overshoot acknowledged (not unlimited spending). Provider CREATE API has no guaranteed hard 50-credit cap. Exact UTC start, run-specific AUTH artifact, ledger pin, and live release are **not yet issued**.

Phase 3 target Oct20 2026 PDT, contingency Oct22; Phase4 Oct22/24, Phase5 Oct25/28. Phase6 first budget-day Oct26–29 at earliest and conditional on completed gates, frozen manifest and its own bounded AUTH. No Cloudflare, new receiver rebuild, Replit AI Agent, premature ML, or P25 retrospective rerun.

## Engineering in this draft

1. Source-only pure two-stage handshake module gate3TwoStageWatchdogAdmission_v39.ts: prepare 3–8 minutes before UTC start, require source custody TTL through the independent 600+300-second monitoring boundary, parse untrusted GitHub run/comment selectors, repeatedly verify a freshly authenticated GitHub Actions bot lease, reject lost heartbeat/wrong identity/late start/operator stop. Immediately before CREATE read current strict provider account inventory and balance; refuse drift from original PREPARED balance. Final lease check and 30-second post-UTC lateness bound. The helper itself has zero provider or SQL operations.
2. Existing one-WSSS operator is staged behind its still-false paid source switches. Stage A reserves EXACTLY one ledger-authenticated LOGGED+UNLOGGED session after verified host/provider preflight; emits the session UUID for a manually dispatched independent GitHub Actions sidecar; awaits operator-entered run ID and bot lease comment ID, verified from GitHub itself rather than trusting the typed numbers. Stage B verifies continuous GH heartbeat until UTC start and on each local active loop, strict clean provider balance/inventory and then delegates exactly one paid CREATE to the existing owner. Missing GH ACK, crashed sidecar or changed account is HOLD/STOP; never retry CREATE.
3. Gate3-only preparer lead extended from 2 to 8 min and session expiry buffer from 600 to 1500 sec for independent watchdog 600+300s rescue and accounting settlement. Sidecar recognizes up to 10min future start to accommodate GitHub startup; actual owner preparation requires <=8min so 25min GitHub job has the intended rescue window.
4. Added provider-free unit regressions for allowed and disallowed times, trustworthy IDs, stale lease during waiting and just before CREATE, account drift and operator stop.

## CI at checkpoint composition

Exact PR59 head at initial check d527eb21dc745687237d04b205eba53979a710e1. Four tests launched. Public Receiver Identity #39004921330 SUCCESS; P25 Focused #39004921338 SUCCESS; Real Disposable PostgreSQL #39004921360 SUCCESS. **V3.9 Offline Safety #39004921376 in progress**; full test, TypeScript, lint/build and subsequent steps require explicit verification. Recheck **latest head SHA**, because a further commit requires re-running CI. No claim that PR59 is ready to merge yet.

## Release-blocking review checklist

- **Clock mismatch**: shared owner currently computes the local 600s cutoff from actual CREATE/BIND, whereas the independent safety sidecar stops at frozen UTC start+600s. A delayed CREATE can be stopped early by the sidecar. Fix this coherently and test real elapsed duration semantics; do not silently report a full observed 600s when not actually observed, or silently extend the user-approved UTC window.
- A failed or interrupted Stage A after PREPARED must leave a durable source/owner HOLD, not trigger an automatic second UUID/CREATE. Any later attempt requires exact account/SQL recovery, no false success.
- All 3 paid release booleans remain FALSE: GATE3_PROVIDER_EXPOSURE_RELEASED_V39, GATE3_INDEPENDENT_WATCHDOG_RELEASED_V39, GATE3_WATCHDOG_LIVE_RELEASED_V39. Do not flip these together without independent release review, provider-free negative test and live source parity.
- Exact future AUTH JSON, SHA256-approved immutable ledger, startNotBefore early enough to stage at -8min, and expiration through settlement still required. Replit published source last previously verified 5ddf44ffb9a1667271e56304ee865b95400c63d6 is behind source-reviewed GitHub. Production V0065 already applied: DO NOT rerun.
- Before actual paid CREATE: approved one-run scope, current published receiver identity, actual strict 0-active CreditBased subscription inventory, balance >=1500 and floor >=1000, approved GitHub environment and live authenticated fresh sidecar lease. Only one CREATE, no automatic retry, only exact-owned DELETE with verified absence, >=3 steady provider credit reads and original SQL/Blob SHA readback. Absent evidence means HOLD, never fabricated PASS. No credentials/raw callback path/provider IDs in GitHub comments.
- Actual credit overshoot beyond the soft 50 target remains technically possible. The strict Gate3 candidate currently requires <=50 and exact external/internal match. If overshoot or observed delivery gap happens, preserve the truthful attempt and scientifically usable measurements, but do not label strict Gate3 PASS.

## Scientific imperfection policy

Real-world missing notifications and a small historical external/internal mismatch do not automatically invalidate every future scientific estimator. Quantify site/time/flight missingness and missing-not-at-random risks; report measured completeness, denominator, sensitivity analyses, and limitations. The amended four-anchor prospective design uses WSSS, OMAA, SKBO, YSSY, plus independent MID/MID/REGIONAL sites; MMUN excluded. The old YSSY 231 billed / 229 received remains an immutable DELlVERY_GAP record, not an erased or fictitiously perfect result. Operational authorization, clean exact ownership and provider account spend must still be strict. No universal NIST/STROBE 0% missingness mandate is presumed. Source: data-collection/phase3/2026-10-14_EXECUTION_SPRINT_ROADMAP_DEADLINES_AND_EVIDENCE_GATES.md.

## Exact next starting point

Check PR59 latest head and four workflows, correct any reproduced CI problems, resolve UTC cutoff / elapsed-duration interaction, test before-CREATE owner loss and GitHub bot heartbeat negative cases, source-review and merge only with three paid source seals closed. After separately checked final AUTH/source release, user-shell checkout reviewed HEAD (no Replit AI Agent), publish and verify the exact Replit git head/receiver, fresh account preflight, one prepared UUID, manually dispatch independent GitHub job, enter bot RUN_ID + COMMENT_ID, confirm fresh verified ARM/ACTIVE lease and exact UTC gate, then one WSSS paid CREATE only if all checks remain green. Collect actual provider DELETE/settlement/custody receipts and truthful Gate3 outcome, then start Gate0.5 native T/FIDS, Gate4 safety cap and Phase4 Gate5 on the revised deadline.

**Do not rerun Phase2/P25 audits, publish without reviewing, or mark Gate3 completed from offline mocks.**


## 2026-10-17 UTC — Source-only clock + liveness follow-up (supersedes initial clock blocker)

At initial source review independent watchdog cut off at frozen UTC+600s whereas paid owner counted full duration from actual CREATE/BIND, potentially producing a scientifically censored canary even under ordinary provider startup latency. This mismatch is addressed in the CURRENT DRAFT source, but NOT yet released or paid-validated: owner CREATE admission is limited to UTC start through +15s; independent watchdog exact stop occurs by UTC+630s, allowing bounded 30s startup/BIND jitter, while existing owner still targets 600s of actual subscribed observation. The 50-credit soft stop and other emergency stop conditions still take precedence. Sidecar rescue monitor extends through UTC+930s, which is NOT a 930s scientific measurement window. An unusually slow CREATE/BIND still triggers stop and honest censored classification. This bounded start-skew policy requires release review and does not create a provider-side hard 50-credit cap.

Additional fail-closed source review fix: independent sidecar now checks runtime state. A failed or settling UNLOGGED session is NOT an active receiving owner even when the row and UUID exist. When an exact-owned billable subscription remains active, such runtime state should trigger exact-owned stop/recovery, not a false MONITOR. Missing source or ambiguous identity remains HOLD with no additional CREATE permission.

Before this checkpoint text edit, branch HEAD was 51dbeb8ce703613964f066f72b429bd7b747a13a. Recheck all **4 workflows on the final exact-HEAD** after this documentation commit, and do not borrow green status from an older SHA.

Source seals are still FALSE, no production host/DB/provider mutation from this draft, and Gate3 NOT PASSED.


## 2026-10-17 UTC — Actual provider CREATE last-moment safety review

Source review found a real time-of-check/time-of-use race: Stage B may authenticate the GH lease and provider account, but the shared prepaid runner performs additional SQL source session authorization before the actual provider CREATE. A GH job can stop or a provider account can change between the original Stage B review and the POST. This is now mitigated in **source-only draft** by a new Gate3-specific beforeProviderCreate callback in the existing prepaid runner, called AFTER SQL source/session selection and IMMEDIATELY BEFORE POST, outside the ambiguous-CREATE catch path. The real WSSS operator rechecks exact in-progress GH Actions bot lease+heartbeat, the authorized UTC start through +15s, and strict 0-active provider inventory with identical initial credit balance (and operator cancellation), refusing with HOLD if any check fails. The callback is required for paid Gate3 when the source seal is eventually separately opened; Phase2 historical pathways remain unchanged. Pure exact UTC tests added. A failed preflight is NOT a remotely committed provider subscription, and the source PREPARED row requires reviewed recovery/no duplicate session.

Corresponding new source edits: prepaidProbeWindow_v39.ts, gate3ActualExecutionOwner_v39.ts, scripts/v39_gate3_one_wsss_operator_v39.ts, gate3TwoStageWatchdogAdmission_v39.ts and its tests. Exact draft head immediately before this documentation commit: a3e196ef31a4f77098fc0ec2002676c2984f309f. The prior green three/four CI checks are superseded: **recheck latest exact commit for all four green workflows**. No live release, no WSSS provider charge, no production mutation, no Gate3 PASS yet.
