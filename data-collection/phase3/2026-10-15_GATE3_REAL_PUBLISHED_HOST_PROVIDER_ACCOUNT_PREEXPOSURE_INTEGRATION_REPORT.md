# October 15, 2026 (PDT) — Phase 3 / Gate 3: Real Published-Host + Provider-Account + Atomic Session Owner Pre-Exposure Integration

**LATEST SELF-CONTAINED RESTART REPORT.** This is an active Phase3 *engineering* checkpoint, NOT a paid Gate3 certificate, provider bill, schema migration, GitHub-to-Replit deployment or authorized production action.

**Repository and code:** `HKcode22/ReplitTranvr`, unmerged DRAFT [PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36), branch `phase2g-pragmatic-science-and-checkpoints-20261012`. Executive board [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38); [START_HERE](START_HERE.md); earlier [Oct15 exact source reservation report](2026-10-15_GATE3_LEDGER_BOUND_PREPARED_SOURCE_RESERVATION_AND_DETAILED_REPORT.md); [Oct15 Actions/host architecture checkpoint](2026-10-15_PHASE3_GATE3_GITHUB_ACTIONS_CALLBACK_AUTOMATION_READONLY_CHECKPOINT.md). Binding experiment documents: `SEPmd/V3.9_DataCollectPlan_f.8.md` §§16–17 and `SEPmd/V3.9_IMPLEMENTATION_LOG.md` §1.8.

## 1. Milestone and reason for this work

**Phase 2G qualified pilot CLOSED.** Original five-anchor strict Gate2 NOT_PASSED, but 58 verified saved YSSY originals are qualified research observations with external Alert credits 231 vs internal received item-credit count 229. No paid rerun; small disclosed research missingness and an exact isolated instrumentation certificate are different questions. Future Phase6 prospective four HUBs WSSS/OMAA/SKBO/YSSY with 2 MID/1 REGIONAL per parent batch day subject to Gate4/5 calendar and source rights.

**Phase3 is not a weekday subscription or another two-hour YSSY experiment.** A small single-airport **Gate3 paid-credit accounting canary** must occur only after real sender/provider and callback/DB/object proof. Then **Gate0.5** prospectively tests native timestamp/T/actual departure/runway target/FIDS pilot, then **Gate4** verifies SEND-aware spending limits (cap100, margin10/soft90) and one independently authorized small live check. Current statuses: all three LIVE gates NOT PASSED. Phase3 **Oct20 target / Oct22 contingency AT RISK**.

**Current architecture is preserved:** GitHub Actions can be the *manually authorized* paid owner and independent watchdog (control plane); AeroDataBox's paid Alert subscription POSTs notification directly into the **existing Replit published** `https://replit-tranvr--hk84164.replit.app/api/v1/webhooks/aerodatabox/:secret/prepaid/:sessionId` (data plane); Replit acknowledges only after durable original source and session accounting into PostgreSQL and Object Storage. Published Autoscale and bounded **6 main +6 backup 15s receiver-health checks, 180s cumulative/max2 outage episodes** were previously approved. These are **not provider delivery retries**; `maxDeliveryRetries=0`. No Cloudflare, VM upgrade, redundant workspace Git audits or paid YSSY 2h redo.

**Actual uncovered integration blocker:** the existing latest ledger-bound `prepareGate3LedgerBoundSessionV39` can now match approved source AUTH to one atomic LOGGED/UNLOGGED PREPARED session, but could be invoked *before* checking the currently **deployed published callback identity** and **current live AeroDataBox account/billable subscriptions**. This creates orphaned/unusable reserved sessions if host or account is not ready. Caller-provided boolean `providerAccountVerified=true` would not be real proof. Need actual strict observations in the same ordered owner stage, no pretending an offline source test is paid permission.

## 2. This session's concrete integrated source change — one actual owner stage, not another fake live PASS

**New module:** `server/lib/disruption/gate3OwnedPreExposure_v39.ts`. It composes previous ledger-bound preparer, the real public Replit runtime endpoint, and the existing strictly validated AeroDataBox read-only SDK:

1. Verify the submitted **original AUTH bytes** against the **fixed, checked-in** `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` using existing exact ledger-bound pure review **BEFORE ANY network or database operation**. Check predecessor IDs, Phase3/Gate3, one uppercase ICAO, imminent frozen UTC window, <=100 approved Alert ceiling, fixed 1–3600 seconds, cleanup, REST=0, explicit expiration. Ledger SHA approval itself is not a cryptographic human signature.
2. Issue **one GET** to exactly `https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime` using `verifyGate3PublishedPrepaidHostV39` with an explicitly reviewed expected published Git SHA. Require HTTP200 and exact v39 schema PASS, exact published hash, registered prepaid callback, `prepaid_source_custody_ready=true`, 168h raw retention, Replit published mode and bucket prefix `replit-objstore`, no provider mutation; allow **either Autoscale or Reserved VM**. No POST, no callback body, no webhook secret. Mismatch or unavailable GET -> HOLD. **A GET cannot verify a real signed callback or Blob SHA readback** and does not by itself certify new PR source has been published.
3. Use the REAL existing provider SDK only for **strict read-only** `getBalanceEvidenceStrict()` and `listSubscriptionsStrictWithRetry()` with no CREATE/DELETE/refill. Require properly typed current Alert balance >=1500, and after the entire frozen potential small canary ceiling >=1000 protected floor, strict valid API quota (remaining >=1), no **active CreditBased** subscriptions from anyone. A failed/indeterminate strict LIST, low balance, malformed inventory or active billable -> HOLD **without reserving a new source session**. Never report an invalid account as zero active. **These provider GET/LIST calls are NOT executed in this ChatGPT session or CI**; running the live owner stage with credentials requires an independently approved read-only preflight scope. This stage does not produce or persist account balances, provider IDs, or source payloads.
4. After those independent observations, **re-read the fixed approved ledger**, revalidate exact auth and invoke existing `prepareGate3CanaryDraftWithPoolV39` to atomically reserve **ONE** durable LOGGED PREPARED owner and same UUID/ICAO UNLOGGED callback source, with advisory lock and prior PREPARED or risky FAILED account-HOLD. An unknown BEGIN/COMMIT/ROLLBACK outcome drops the pool connection and requires separate immutable SQL recovery, never duplicate CREATE. No provider subscription is created by the source reservation.
5. Return `REAL_HOST_AND_ACCOUNT_READS_SOURCE_PREPARED_ONLY`; `paidCanaryCertified=false`, `humanPaidAuthorizationVerifiedHere=false`, `liveSignedCallbackShaReadbackVerified=false`, `providerSubscriptionCreatedHere=false`. Dependency injection for the focused *mock* tests must never be treated as source authenticity or a paid pass token. The actual provider-capable runner still hard-stops **`GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY` BEFORE provider API**. The public GET is not a substituted signed callback test.

**New regression test:** `tests/phase3_gate3_owned_preexposure_v39.test.ts`, with a synthetic ledger only in isolated Vitest memory and mocked fetch/SDK/PG, tests:
- Replit published **Autoscale AND Reserved VM** valid, while wrong published git SHA/registered route/custody/retention/bucket or unknown hosting class refuses.
- Current provider low balance/foreign active CreditBased subscription refuses (inactive historic sub allowed); no token disclosure.
- A nonapproved/modified AUTH performs **ZERO network, provider, or PG** calls.
- Invalid published host performs **ZERO provider/PG** calls; foreign active billable account performs ZERO PG/CREATE.
- One positive read-only host+provider observational path performs exactly one existing SQL reservation owner and runtime with no paid GO; ambiguous COMMIT refuses and destroys pooled connection. **Mock success is NOT proof of production host/provider/account/callback health**.
- Existing full V3.9 no-provider and disposable PostgreSQL suites remain separate and must be re-run on this exact code SHA.

**Important distinction:** Future approved READ-ONLY host GET and provider GET/LIST can happen without Alert paid SEND credits, but those are external provider/account requests requiring the user's review/approval. We made no such requests while writing this patch. Real compiled source is still DRAFT, not deployed.

## 3. CI, code history and clear progress

- **Previous prior SHA `af9a4f9760f864bbdcaa3521ba64cf7655c8f20a` is VERIFIED 4/4 no-provider CI**: [full V3.9 #38762296164](https://github.com/HKcode22/ReplitTranvr/actions/runs/38762296164); [focused #38762296151](https://github.com/HKcode22/ReplitTranvr/actions/runs/38762296151); [disposable PG #38762296309](https://github.com/HKcode22/ReplitTranvr/actions/runs/38762296309); [public read-only #38762296241](https://github.com/HKcode22/ReplitTranvr/actions/runs/38762296241) all completed/success.
- This session bundles **new actual pre-exposure integration module + regression + this dated report + top of START_HERE** in ONE atomic GitHub source commit on PR36. Record exact new SHA, number of CI PASS/FAIL, job logs and any corrective action on [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38), without a separate checkpoint-only commit that triggers another 4 workflows. Do not inherit green status from prior SHA.
- No `main` merge, no Replit publish, no version-gated V0065 production SQL migration, no provider API GET/LIST/CREATE/refill, no stored original deletion, no signed callback POST, no paid credit use. Source code compiles only when newly committed CI verifies it.

## 4. What is STILL missing for ACTUAL Gate3 and how to make the deadline

| Decisive requirement | Current truth | Next evidence |
| --- | --- | --- |
| Frozen source/auth source reservation | Implemented in prior tested code; NEW host+provider observation ordering in this draft | Verify new exact-sha no-provider CI |
| GitHub Actions read-only check | Draft manual workflow `phase3-gate3-owner-readonly.yml`, requires reviewed `main`, exact SHA, a real ledger-approved AUTH and live `V39_DATABASE_RUNTIME_URL` | Review and later promote to approved source |
| Real GitHub Actions **PAID Gate3 owner** | **STILL MISSING / NOT AUTHORIZED**; current runner retains pre-provider STOP | Wire one versioned owner to actual prepaid runtime, authenticated signed webhook and strictly owned subscription DELETE/settlement, 6+6 health/watchdog and immutable logged result. No fake caller booleans. |
| Production V0065 + actual new release parity | Draft schema/code not deployed. Old published earlier SHA and clean workspace descendant with identical tracked paths do NOT establish new PR36 deployed | Exact reviewed release, migration, rollback and host identity scope |
| Hosted no-provider signed callback original/source proof | **NOT EXECUTED** | Separate operator approval for one bounded signed HTTP POST using real exact session route, raw-before-2xx + PG/Blob SHA readback, with rights/cleanup |
| Current provider account proof | Not executed; new code only staged | Operator approved real strict GET balance/quota and LIST active subscriptions, protected floor |
| Small paid canary | NOT RUN / NOT PASSED | Separate signed human AUTH single airport+UTC time+limit, >0 real callback items, strict owned DELETE, >=3 stable equal provider balance reads, exact external vs received item-credit equality for this isolated test. Inconclusive/ambiguous provider CREATE/DELETE => durable HOLD, no automatic restart |
| Native Gate0.5 & SEND Gate4 | NOT PASSED | Separate consent/budgeted native FIDS/T/actual departure/target sample, then cap100/margin10 offline + tiny live check |

**Next exact coding work:** implement the REAL provider-capable run owner orchestration with actual published signed callback readback and independent watchdog/cleanup, reusing `runPrepaidLiveWindowV39` and existing `gate3CanaryTerminalOwner_v39.ts`, not another generic boolean test. Keep the pre-provider STOP until real host/account/source proof and separate signed paid authorization are demonstrated. User can review a bounded no-provider host/migration test scope when a reviewed release is actually ready.

**Deadline:** Phase3 target Tue Oct20/fallback Thu Oct22 2026 **AT RISK**; Phase4 Gate5/Phase5 versioned four-HUB freeze/Phase6 31 parent batch days are later, conditional and not live. Do not invent a weekday as a hard constraint for Gate3.

**Retention urgency:** P2G24 earliest 168h original TTL Oct15 ~21:02 PDT, YSSY P25 earliest Oct19 ~20:06 PDT. Separate lawful retention/incident31 check; earlier 30/30 source SHA audit done, DO NOT repeat merely for a new chat, change retention, export protected blobs into GitHub, or delete/extend without reviewed authority.

## 5. Precise continuity resume order

1. Read this report then `START_HERE.md`, [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) last comment.
2. Verify current PR36 commit, the four exact-sha Actions and the two new files `gate3OwnedPreExposure_v39.ts`, `phase3_gate3_owned_preexposure_v39.test.ts`.
3. If CI fails, inspect exact job logs and only repair the demonstrated issue, recording failed SHA and recheck; do not declare PASS early.
4. Prioritize the real signed provider-capable paid owner and narrow deployment/0-provider source proof approval; no repetitive YSSY rerun, VM debate, 2h paid soak or endless simulated helpers. Two **separate human permissions** are needed: first scoped new-release/migration/no-provider callback/original SHA proof and real provider READ ONLY account checks; then bounded actual paid Gate3 one-airport AUTH.
5. After actual Gate3 outcome, run separately frozen Gate0.5 then Gate4; update dated checkpoint each substantive work session.

**No operator shell action is necessary for this new draft code itself. The user's next action is a narrowly scoped approval AFTER the reviewed host/prod testing plan and actual Gate3 runner are available.**
