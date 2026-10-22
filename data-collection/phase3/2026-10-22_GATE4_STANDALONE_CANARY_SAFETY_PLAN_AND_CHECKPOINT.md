# Phase 3 Gate4 — isolated live-canary readiness foundation (2026-10-22)

> **LATEST VERIFIED 2026-10-22: Gate4 account/prepaid-host foundation READONLY READY, NOT LIVE GATE4.** Replit operator ran exact CI-reviewed source `1345c548d6fdfde175505179a39e1408cfe019ef` with the observed published Git head `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e`, cap 20, unsettled reserve 10. Status `ACCOUNT_AND_PREPAID_HOST_READONLY_READY`, exit 0, 2,037 provider credits, 0 active billable subs, 0 active/unended local rows, 0 API FIDS/Alert CREATE/DELETE and 0 DB writes. **Independent STOP not armed, Gate4 callback not proven, hard cap not certified, no signed paid AUTH and Phase6 not started.** The live published code is not the draft Gate4 PR source; DO NOT use this PASS to merge/publish/start a paid canary. See the latest section at the bottom for exact output, safety requirements and next actions.

**Status: draft / no paid authorization / no live canary.** Active goal: a dedicated small, bounded Gate4 Alert subscription trial, NOT a restart of Phase2/YSSY or the frozen Phase6 1900-credit collector. Owner's approved qualified Phase2 early-pilot closeout remains in force. Previous broad language treating the accepted qualified YSSY research as an overall scientific failure was corrected in issue #38.

Source baseline [Gate4 PR #95](https://github.com/HKcode22/ReplitTranvr/pull/95) at `acbeaa6282b71452457c6496a6c7c1533deb6a04`: four no-provider workflows SUCCESS including 1813 tests PASS/19 skipped, real disposable PG admission contention PASS and actual V3.9 CREATE/DELETE/strict-inventory hardening. Main `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814` unchanged.

## New scope-locked standalone safeguards

`server/lib/disruption/gate4StandaloneSafety_v39.ts` implements:
- Pure **dedicated small-canary account foundation**: exactly three equal strict provider balance readings, validated provider quota, zero active CreditBased subscriptions, zero active Phase6 batches, configured canary cap 1–100 credits, separately declared >0 unsettled SEND burst reserve and protected floor >=1000 credits. Requires balance - (planned cap + reserved potential overrun) >= floor. This conservatively checks planning headroom, and explicitly declares `actualProviderHardCapCertified:false`, `paidAuthorization:false`, `liveGate4Certified:false`. It does not claim billing can be physically capped by a client poller.
- Injectable independent **exact-known-subscription-ID STOP policy**: strict LIST before and after, subject type+ICAO matching, no other foreign active CreditBased subscriptions, invoke only `deleteExactVerified(id)` and check zero active afterward; source-level result is `DELETE_VERIFIED_PENDING_SETTLEMENT`, never a settled Gate4 certificate. Unknown provider CREATE response / no owned ID is `HOLD_UNCONFIRMED`, **never auto-delete based solely on airport or creation timestamp**; this demands a separate human-reviewed orphan/owner rescue.
- Negative synthetic no-provider tests include balance drift/low floor, missing burst, active foreign subscription, unknown ID, wrong subject, failed DELETE, strict LIST outage and post-delete still active. These prove policy logic only; independent physical watchdog process and separately approved paid scope still must be wired.

## Required next steps before live Gate4
1. Verify exact-source TypeScript and no-provider CI at new PR95 revision.
2. Add and execute a **read-only Gate4-specific** owner checking *real published host* source parity, strict account balance x3, strict LIST, source/billing floors, and exact receipt/published callback route. This is not a paid CREATE.
3. Engineer independent **outside-controller** STOP supervisor with persisted owned subscription ID, manual exact-owner rescue for ambiguous CREATE response, fail-closed timeouts and billing gap; do not rely on only `setInterval` watchdog.
4. Freeze one short Gate4 trial window, conservative credit plan and separate exact human AUTH, with explicit possible SEND after STOP warning; no provider-enforced cap has been demonstrated.
5. Following distinct signed paid approval: one real small subscription, independent DELETE readback, ≥3 stable post-STOP balances, internal received/SEND discrepancy, confirmed second-start refusal if prior unsettled, durable incident receipt. Only these together can certify live Gate4. Gate3 and Gate05 remain separately assessed for Phase3 overall.

No Replit AI Agent, Cloudflare, Phase2 administrative work, SQL writes, billable provider mutations, or Phase6 collection authorized by this draft.

## P0 STOP safety correction before certification

An independently discovered foreign billable subscription must not PREVENT attempted DELETE of the *already positively owned exact ID*. The source was revised so the STOP helper still calls the exact `deleteExactVerified(ownedId)` if the owned ID and subject match, even when another active billable subscription appears. It NEVER deletes an unrelated ID; the terminal all-account-clear remains a `HOLD_UNCONFIRMED` if that foreign resource persists. A new no-provider negative test checks exact owned DELETE under foreign coexistence. This prevents an over-conservative ownership guard from prolonging a known billable exposure. No live subscription has been created or deleted; tests are pending at the new commit.

## 2026-10-22 02:34 PDT — Owner read-only real preflight HOLD, cause suppressed by v1

Owner ran exact pinned Gate4-only `GATE4_ISOLATED_READONLY` Shell procedure using HEAD `664d9f64a0c293362659cf9b61d53db5d9d3d288`, expected published `f5b1347b7b9aebd6830302394ea2cc5775aedbf4`, proposed cap20 and extra reserve10. The CLI emitted only `{"schema":"v39.gate4.isolated-preflight.v1","status":"HOLD_READONLY_FOUNDATION_FAILED","gate4LivePassed":false,"paidAuthorization":false,"alertCreateRequests":0,"databaseWrites":0}`. No later success banner or billed CREATE appeared. The source catch suppressed the root stage and error, so **do not attribute the HOLD to the host, provider or database without evidence**; no reason for override, no repeat of identical diagnostic.

Follow-up Gate4-only source patch (proposed) adds whitelisted per-stage report `failedStage` (host verification vs free provider LIST vs strict balance #1/#2/#3 vs DB connect/identity/query vs account policy) and a **redacted, fixed reasonCode** known for host, strict balance and strict inventory errors; unknown exceptions print only `REDACTED_STAGE_FAILURE`. This change must pass CI and owner rerun before asserting readiness. No Phase2/YSSY administrative action authorized. Source still cannot create/delete subscriptions or start Phase6; published prepaid host contract remains only compatibility, not Gate4 callback proof.

## 2026-10-22 02:54 PDT — redacted-stage diagnostic committed, CI verified; owner rerun still required

**Exact verified GitHub state (not runtime readiness):**
- Production `main` = `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814` (verified unchanged).
- Gate4 research source diagnostics commit = `1345c548d6fdfde175505179a39e1408cfe019ef` (parent `664d9f64a0c293362659cf9b61d53db5d9d3d288`). Draft [PR #95](https://github.com/HKcode22/ReplitTranvr/pull/95) is OPEN, DRAFT, unmerged, base main unchanged.
- Exact source commit GitHub workflows: **4/4 completed SUCCESS**: V3.9 Offline Safety run [39756693741](https://github.com/HKcode22/ReplitTranvr/actions/runs/39756693741); YSSY P25 Public Receiver Identity (No Provider) [39756693799](https://github.com/HKcode22/ReplitTranvr/actions/runs/39756693799); Real PG Receiver Faults (No Paid Provider) [39756693797](https://github.com/HKcode22/ReplitTranvr/actions/runs/39756693797); Focused Release (No Provider) [39756693723](https://github.com/HKcode22/ReplitTranvr/actions/runs/39756693723). Offline Safety job reported SUCCESS for TypeScript, offline V3.9 tests, full suite, lint and production build; this is NOT evidence of live provider correctness.
- The preflight exception handler now prints `v39.gate4.isolated-preflight.v2` including fixed `failedStage` and whitelisted/redacted `failureCode`; it does not print raw caught network/DB errors or tokens. Verified at [commit](https://github.com/HKcode22/ReplitTranvr/commit/1345c548d6fdfde175505179a39e1408cfe019ef).
- **The actual root cause of the earlier `HOLD_READONLY_FOUNDATION_FAILED` is still UNKNOWN.** There has been NO verified post-fix live preflight result in this checkpoint. Do not infer a host outage, bad provider account, or database failure from the older v1 output.

**Next owner operator action — separate, scoped READONLY diagnostic only (no PR merge, checkout, subscription CREATE/DELETE, credit refill, Phase6 or DB writes):**

```bash
bash <<'GATE4_DIAG_V2_ISOLATED_READONLY'
set -Eeuo pipefail
set +x
cd ~/workspace
ROOT="$PWD"
MAIN="ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814"
BRANCH="research/gate4-sendaware-safety-20261021"
PIN="1345c548d6fdfde175505179a39e1408cfe019ef"
HOST_HEAD="f5b1347b7b9aebd6830302394ea2cc5775aedbf4"
test "$(git ls-remote origin refs/heads/main | awk '{print $1}')" = "$MAIN"
git fetch --no-tags origin "refs/heads/$BRANCH"
test "$(git cat-file -t "$PIN")" = "commit"
git merge-base --is-ancestor "$PIN" FETCH_HEAD
test -d "$ROOT/node_modules"
test -f "$ROOT/.env"
CHECK="$(mktemp -d /tmp/gate4-diag-v2.XXXXXX)"
git archive "$PIN" | tar -x -C "$CHECK"
ln -s "$ROOT/node_modules" "$CHECK/node_modules"
cd "$CHECK"
if DOTENV_CONFIG_PATH="$ROOT/.env" node --import tsx \
  scripts/v39_gate4_isolated_preflight_v39.ts \
  --dry-run --published-head "$HOST_HEAD" --cap 20 --reserve 10
then
  RC=0
else
  RC=$?
fi
printf 'GATE4_READONLY_DIAGNOSTIC_EXIT=%s\n' "$RC"
printf 'ALERT_CREATE=0 DATABASE_WRITES=0 PHASE6_NOT_STARTED\n'
GATE4_DIAG_V2_ISOLATED_READONLY
```

**Source pin versus moving review branch:** GitHub checkpoint updates advance the DRAFT branch beyond source commit `1345c548...`; the exact `git archive "$PIN"` remains cryptographically pinned to the CI-passed code. The `merge-base --is-ancestor` gate verifies the pinned source remains on the fetched branch without incorrectly requiring the branch head to equal the historical code pin. No `main` changes.

**Result interpretation:** `HOLD_READONLY_FOUNDATION_FAILED` plus `failedStage`/`failureCode` is a fail-closed, actionable diagnostic, not a canary PASS; `ACCOUNT_SAFETY_HOLD` plus `reason` means actual account safety policy was evaluated and refused. `ACCOUNT_AND_PREPAID_HOST_READONLY_READY` allows only consideration of the next engineering/authorization review, not paid execution. All three outcomes keep `gate4LivePassed:false`, `paidAuthorization:false`, and independent STOP / exact canary callback proof incomplete. On result, capture only sanitized status, stage/code/reason, exit code and reviewed source SHA in the next checkpoint. No correction or override until evidence inspected.

## 2026-10-22 — owner v2 preflight pinned-source result: PUBLISHED_HOST_IDENTITY HOLD

The owner executed the corrected, GitHub CI-passed **isolated read-only preflight** from exact source commit `1345c548d6fdfde175505179a39e1408cfe019ef` in Replit. Main pin remained `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814`; dependencies existed; no local `.env`, so Replit injected environment used. Verified output:

```json
{
  "schema": "v39.gate4.isolated-preflight.v2",
  "status": "HOLD_READONLY_FOUNDATION_FAILED",
  "failedStage": "PUBLISHED_HOST_IDENTITY",
  "failureCode": "PUBLISHED_HOST_IDENTITY_OR_AVAILABILITY_HOLD",
  "action": "REVIEW_EXACT_FAILED_STAGE_NO_OVERRIDE",
  "gate4LivePassed": false,
  "paidAuthorization": false,
  "alertCreateRequests": 0,
  "databaseWrites": 0
}
```

Shell also reported `PREFLIGHT_EXIT_CODE=2`, `PHASE6_NOT_STARTED`. **No real provider LIST, three strict balances, or database identity/query were reached**: these conditions are UNKNOWN, not PASS or FAIL. Distinct public-host causes remain (a) GET/timeout/HTTP availability failure vs (b) status 200 but runtime JSON contract or pinned deployed git-head mismatch. The `gate4ReadonlySafeFailureCodeV39` currently intentionally groups these to prevent raw-error leakage. Replit network endpoint observations are still absent; do not claim the published deployment failed, changed SHA, or needs republishing. No paid provider action, Cloudflare, Replit AI Agent, SQL writes or Phase6 collector is authorized.

### Next *one* targeted public-host GET only; no provider calls

From owner's `~/workspace` Shell, run this code via Node; no secrets/response body/bucket names are emitted. It compares the exact public host runtime contract used by `verifyGate3PublishedPrepaidHostV39` without altering any state. Route and SHA are hard-coded to verified source, **not** caller supplied:

```bash
node --input-type=module <<'NODE'
const expected="f5b1347b7b9aebd6830302394ea2cc5775aedbf4";
const url="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const report={schema:"v39.gate4.public-host-diagnostic.v1",method:"GET",
  providerRequests:0,alertCreateRequests:0,databaseWrites:0,phase6Started:false};
try {
 const response=await fetch(url,{
   method:"GET",headers:{accept:"application/json"},
   signal:AbortSignal.timeout(12000),redirect:"manual"
 });
 report.httpStatus=response.status;
 let d=null;
 if(response.status===200) {
   try { d=await response.json(); } catch { report.jsonParseOk=false; }
 }
 const object=d && typeof d==="object" && !Array.isArray(d) ? d:null;
 const checks={
   http200:response.status===200,
   validJsonObject:object!==null,
   schema:object?.schema==="v39.phase2f-workspace-runtime.v1",
   status:object?.status==="PASS",
   pinnedGitHead:object?.git_head===expected,
   prepaidRoute:object?.prepaid_route_registered===true,
   prepaidSourceCustody:object?.prepaid_source_custody_ready===true,
   retentionHours:object?.retention_hours===168,
   noProviderMutation:object?.provider_mutation===false,
   ownerMode:object?.runtime_owner_mode==="replit-published-deployment",
   publishedDeployment:object?.published_deployment===true,
   durability:["autoscale","reserved-vm"].includes(String(object?.runtime_durability_class)),
   bucketPrefixForm:typeof object?.bucket_prefix==="string" &&
      object.bucket_prefix.startsWith("replit-objstore")
 };
 report.failedChecks=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
 report.observedGitHead=/^[a-f0-9]{40}$/.test(object?.git_head??"") ?
   object.git_head : null;
 report.status=report.failedChecks.length===0?"HOST_CONTRACT_MATCH":
   "HOLD_HOST_HTTP_OR_CONTRACT";
 if(report.failedChecks.length) process.exitCode=2;
} catch(e) {
 report.status="HOLD_HOST_GET_EXCEPTION";
 report.exceptionClass=["TimeoutError","AbortError","TypeError"].includes(e?.name)?
   e.name:"REDACTED_EXCEPTION";
 process.exitCode=2;
}
console.log(JSON.stringify(report,null,2));
NODE
```

**Review rule:** If transport/HTTP failed, investigate the published URL/availability from Replit (read-only first). If `pinnedGitHead` alone failed, investigate release identity and owner-controlled publishing separately; do not silently accept a new head. If other contract fields failed, inspect live deployment/runtime capability read-only; do not weaken Gate4 or assume Gate3-compatible prepaid route proves Gate4 Alert callback. On exact host PASS, rerun the preflight only after a fresh review; do not create subscriptions. Record the operator's sanitized diagnostic and exact next action in this checkpoint. All broad Gate4 and paid/Phase6 approval remain closed.

## 2026-10-22 — public GET isolated identity discrepancy: deployment reports acd084dc

**User-executed independent public GET** of `https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime` (no provider requests, no billing mutations) returned:
- `httpStatus:200`
- `failedChecks:["pinnedGitHead"]` only; all other *explicitly evaluated* runtime contract fields passed, including schema, PASS, prepaid route registered/source custody, 168h retention, no provider mutation, owner deployment mode, published flag, accepted durability and bucket-prefix form.
- `observedGitHead:"acd084dc22e00dc94b4aa3cb4bf2c65558991e4e"`
- `status:"HOLD_HOST_HTTP_OR_CONTRACT"` refers **only to the old SHA pin** on this check; public host GET and other contract fields succeeded. Historical expected host SHA `f5b1347b7b9aebd6830302394ea2cc5775aedbf4` is now inconsistent with observed runtime identity.

**Independent GitHub history verification, performed read-only in same session:** `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e` exists in HKcode22/ReplitTranvr. Its commit message is "Approve unique WSSS08 9 PM PDT and preserve withdrawn WSSS07 8 PM authorization" (Gate3 authorization, NOT a Gate4 runtime release attestation). GitHub compare `f5b1347...acd084dc` returned `ahead`, with 262 newer commits; compare `acd084dc...main` returned `ahead_by:12, behind_by:0`, merge-base `acd084dc`. Current main remained `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814`. Thus the observed SHA is a real descendant of the historical deployment pin and ancestor of main. This supports **stale expected identity pin as the immediate reason for the read-only HOLD**, not a missing public host or another contract mismatch. However, the returned self-reported SHA is not an independent binary/code attestation: **no assertion that the published artifact was reviewed for Gate4, no implicit owner approval, no deployment action and no reason to edit the strict host-verifier logic**. The GitHub commit itself says merging does not deploy Replit or bypass live gates.

**Next allowed investigation:** Run the existing CI-reviewed isolated `v39_gate4_isolated_preflight_v39.ts` from exact pinned code commit `1345c548d6fdfde175505179a39e1408cfe019ef`, replacing the **read-only comparison parameter only**: `--published-head acd084dc22e00dc94b4aa3cb4bf2c65558991e4e`, `--cap 20 --reserve 10 --dry-run`. Keep `main` unchanged and use the isolated `git archive` with no Replit AI Agent or republish. This RECHECKS host live before proceeding to strict free provider LIST, three balances, and database READ ONLY; any new mismatch/timeout holds. Interpret any `ACCOUNT_AND_PREPAID_HOST_READONLY_READY` solely as provisional account/prepaid-host preflight, **not a Gate4 Alert SEND/STOP, callback routing, deployment safety, independent watchdog or paid authorization certificate**. The no-provider CI at code pin `1345c548` passed previously. Record the next sanitized preflight status/stage/reason and zero mutation counts. No subscription CREATE/DELETE/refill, live trial, Phase6 or administrative SQL writes is approved.

## 2026-10-22 — real Gate4 account/prepaid-host read-only foundation PASSED

### Real owner Shell evidence (read-only, operator observed)
- Source: exact reviewed/CI-passed `1345c548d6fdfde175505179a39e1408cfe019ef`, executed via `git archive` in a temporary directory, dependency symlink from Replit workspace, no local dotenv, using Replit-injected runtime environment. No code checkout, deploy or merge.
- Production `main` SHA checked: `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814`.
- Published host expected `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e`; matching PREPAID compatibility identity GET succeeded. As separately observed before this preflight, live host was HTTP 200 and other v39 runtime contract fields matched.
- Command output `schema:v39.gate4.isolated-preflight.v1`, `status:ACCOUNT_AND_PREPAID_HOST_READONLY_READY`, `reason:READONLY_ACCOUNT_FOUNDATION_ONLY`, `PREFLIGHT_EXIT_CODE=0`.
- `observedBalance:2037`; `preflightCanaryCap:20`; `extraUnsettledReserve:10`; `plannedExposurePlusReserve:30`; `protectedFloor:1000`. Remaining planning headroom: `2037 - 30 - 1000 = 1007`. **Only a modeled headroom calculation; no provider-enforced maximum spend.**
- `strictProviderActiveBillable:0`; `livePhase6OrUnendedLocalRows:0`. The source must have satisfied all three matching provider credit readings, quota validations, DB identity and live activity checks to return READY; raw individual quota values and provider request receipts were not logged, so do not invent them.
- `publishedRuntimeGitHeadMatched:true`, `publishedPrepaidCallbackCompatibilityChecked:true`, **`gate4CanaryCallbackRouteProven:false`, `independentStopProcessArmed:false`, `actualProviderHardCapCertified:false`, `gate4LivePassed:false`, `paidAuthorization:false`**.
- `paidFidsRequests:0`, `alertCreateRequests:0`, `providerDeleteRequests:0`, `databaseWrites:0`; Shell reports `ALERT_CREATE=0 DATABASE_WRITES=0 PHASE6_NOT_STARTED`.
- Node PostgreSQL printed a **nonfatal future-semantics TLS deprecation warning** for sslmode prefer/require/verify-ca. This did not cause failure. In a future **separate** config review, explicitly require appropriate verified TLS/certificate behavior (`sslmode=verify-full` if consistent with connection provisioning); never print or commit the production DATABASE_URL and do not change live secrets as a side effect of a Gate4 PASS.

### Gate4 current readiness separation (source vs live)

| Requirement | Status | Evidence / restriction |
|---|---|---|
| Strict account inventory, balance, quota, protected floor | **PASS at this operator observation** | Exact read-only foundation; credit/account state can change |
| Published runtime and PREPAID callback compatibility | **PASS at this operator observation** | Checked observed `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e`; this is not an Alert callback test |
| Production database identity + zero active/unended local rows | **PASS at this operator observation** | Transaction READ ONLY; no persisted write |
| Gate4 draft SEND-aware decision, CREATE/DELETE hardening, admission race guards | **CI-PASS draft, NOT DEPLOYED** | Draft PR #95 based on main; successful CI at `1345c548`, source code not merged to deployed runtime |
| Dedicated independently running externally supervised STOP with persisted exact-owner ID and health/ACK | **NOT PROVEN/NOT ARMED** | Pure `stopGate4ExactOwnedV39` is an injected helper only; no evidence of external process; Gate05 worker is a separate distinct scope, not automatically reusable |
| Real Gate4 Alert callback identity + ACK and time-bound delivery | **NOT PROVEN** | Host's PREPAID route registered only, not Gate4's Alert receiver integration |
| Provider SEND after STOP behavior, billing drift & 3 stable post-STOP balances | **NOT TESTED LIVE** | Cannot infer a hard cap from balance poll/simulated threshold |
| Ambiguous CREATE result exact-owner recovery and foreign exclusion | **SOURCE SAFEGUARDS ONLY** | No paid CREATE/DELETE; manual rescue if provider ID unknown |
| Signed per-trial cap/window/source, separate explicit paid GO | **NOT AUTHORIZED** | 20 + 10 are diagnostic parameters, not a paid authorization artifact |
| Phase6 1900-credit collector | **NOT STARTED; NOT AUTHORIZED HERE** | Remains isolated from Gate4 canary |

### Next engineering sequence (NO PAID activity)

1. **Preserve this exact foundation result** but treat it as a timestamped observation; require a fresh full read-only check before any later paid authorization. Do not repeat the now-resolved outdated SHA investigation.
2. Define and build a **Gate4-specific independent STOP runtime** on the draft branch. It must execute outside Replit controller lifecycle, bind an exact trial AUTH and known provider subscription ID to trusted durable custody, use independent approved credentials and liveness, fail closed on missing owner evidence, attempt exact-owner DELETE under a scoped emergency, and confirm strict provider inventory and account settlement. The existing pure helper and Gate05 safety worker are NOT themselves proof of this Gate4 lifecycle.
3. Complete no-provider tests: process crash / stale heartbeat, lost CREATE response, failed PG persist after CREATE, failed DELETE, strict LIST outage, foreign subscription coexistence, callback suppression/ACK failure, operator alert delivery and recovered STOP readback. Include a disposable PostgreSQL lifecycle plus a mock provider SEND-after-DELETE/overshoot envelope. Prove neither app restart nor ambiguous ownership silently authorizes a second start.
4. Separately audit the actual Gate4 Alert callback route and the deployment/provenance delta between deployed `acd084dc22e00dc94b4aa3cb4bf2c65558991e4e` and draft PR #95. A future protected reviewed merge and owner-controlled republish are **distinct decisions**, not consequences of READY status.
5. Only after that evidence, present a narrowly bounded exact trial authorization (time, location/filter, soft cap 20, 10 reserve, protected floor, overrun disclosure, STOP ownership) for **fresh human approval**. Do not use a prior Gate3/WSSS or Gate05 AUTH for Gate4.
6. Following authorization (not now), run one paid trial with independent DELETE readback, post-STOP 3 stable balances, provider-vs-internal SEND gap examination, second-start refusal until settled and durable incident/report evidence. No silent retries, no Phase6 escalation.

**Authority boundary:** No live Gate4 pass, no paid provider CREATE/DELETE/refill, no production DB writes, no publication/PR merge, no Replit AI Agent, no Phase6 starts. Status remains **READONLY FOUNDATION PASSED; GATE4 LIVE HOLD**.

## 2026-10-22 — Gate4 independent STOP candidate engineering (DRAFT, NO LIVE PROCESS)

**Exact source head:** `30f18bd25fd369d5aed8963938ecfd9b3801dee3` in DRAFT, unmerged [PR #95](https://github.com/HKcode22/ReplitTranvr/pull/95), base `main=ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814`. This work **does not change the successful read-only foundation** (2,037 provider credits at observation, 0 active billable, 0 open collector). No new provider observations here and no paid calls.

### Implemented code, still unarmed
- [`gate4IndependentStopCandidate_v39.ts`](https://github.com/HKcode22/ReplitTranvr/blob/research/gate4-sendaware-safety-20261021/server/lib/disruption/gate4IndependentStopCandidate_v39.ts) introduces a narrow, dependency-injected **candidate** policy for a future external safety process. Immutable ticket is bound to *independently reviewed* source SHA, exact scope UUID, authorization SHA256, owned provider subscription ID, ICAO, and a maximum 40-minute signed start/STOP window. Mismatches or missing ID fail closed and never invoke LIST/DELETE. **Signature authenticity and ID provenance are NOT established by equality checks here** and remain mandatory external prerequisites.
- A positive identity binding allows `WATCH` before start, immediate `STOP` at/after signed deadline, and during the signed window `STOP` if independent heartbeat evidence is absent, wrong-scope, over 15 seconds old, missing heartbeat, heartbeat older than 30 seconds, or implausibly future-dated. *Mutable heartbeat is not in the immutable ticket.* No automatic controller-supplied heartbeat can self-certify health; future external process must query an authenticated observation and independently establish process liveness.
- Injected STOP action delegates ONLY to existing `stopGate4ExactOwnedV39` (strict pre/post subscription inventory and exact matching subject/ID, no airport- or timestamp-based ownership guess). A successful helper result means `DELETE_VERIFIED_PENDING_SETTLEMENT`, **NOT** post-STOP credit settlement, true SEND overshoot control or an independently armed service. No provider/deployment/DB import in the new candidate module.
- Existing exact-owned STOP now additionally rejects **duplicate active provider subscription IDs** even if one matching row has the correct ICAO, preventing an ambiguous inventory from authorizing deletion.
- New `tests/phase3_gate4_independent_stop_candidate_v39.test.ts` contains **12 written no-provider cases** covering clock/deadline boundaries, missing/stale/wrong-scope independent heartbeat evidence, exact ID and authorization mismatch, healthy no-op, correct owned-only DELETE/readback, wrong subject, unrelated billable coexistence, strict LIST errors, DELETE failures and persistent provider activity. One extra duplicate-ID negative test added to `tests/phase3_gate4_standalone_safety_v39.test.ts`.

### Verification/next steps

- At this checkpoint, CI on exact `30f18bd25fd369d5aed8963938ecfd9b3801dee3` **started and was in progress**; **DO NOT CLAIM CURRENT HEAD PASS UNTIL COMPLETED SUCCESS**. Prior CI for baseline `347364167...` passed; not a substitute for new code tests. Check [PR #95 checks](https://github.com/HKcode22/ReplitTranvr/pull/95/checks).
- The new module is **NOT a full runnable independent STOP supervisor**: no independently provisioned environment, no separate signed AUTH verification, no durable authenticated subscription-ID custody, no deployed safety worker, no actual external liveness, no alert delivery ACK or credential boundary. It accepts injectable dependencies for *offline tests*. Running this alone on the app Shell would not meet independence.
- Highest-priority next slice: design a separately permissioned **Gate4-specific** safety process with verified signature/root pin + durable per-trial custody + independently observed heartbeat and safe exact-ID provider LIST/DELETE operations. Prove fail-closed handling for signed-scope mismatch, unknown remote CREATE outcome, last-minute provider SEND and post-DELETE credit settlement. Test crash/timeout/reconnect and independent deployment/liveness/alert acknowledgments, then review source for deployment **only with new explicit approval**.
- Do not borrow Gate05's scoped FIDS STOP role, which has different database functions and trust boundaries. No Replit AI Agent, no Cloudflare, no PR merge, no published republish, no paid AeroDataBox Alert CREATE/DELETE/refill, no production SQL writes, and no Phase6. Gate4 live/callback/hard credit cap remain **NOT CERTIFIED**.

## 2026-10-22 — Gate4 offline Ed25519 STOP ticket and exact custody binding

**Current source exact pin**: `d6e41d4c6da86f75ebc3f20bdcc69902a2661a3d` on research branch `research/gate4-sendaware-safety-20261021`, DRAFT PR #95, no merge/deployment. Current protected main remains `ffb5c142e51ab8bb3d9ce7ca944ccc1216a73814`.

### Offline engineering completed
- New source: `server/lib/disruption/gate4SignedStopCustody_v39.ts` (commit `d6a2ae89b0e737e3e0ccf4e73716ba135ca774fa`), separate from prior `gate4IndependentStopCandidate_v39.ts`.
- Computes a **domain-separated SHA256** signing message over exact stop-ticket JSON bytes, verifies **Ed25519 detached signature** against the separately reviewed exact SPKI DER key fingerprint, and requires an independently approved **exact raw-ticket byte SHA256**. Strict canonical JSON requires exact ordered fields, no duplicate keys, no reordered/unknown fields, no alternate escape encodings, no trailing whitespace or BOM, and valid exact UTC fields.
- Exact independent pins bind `sourceCommit`, scope UUID, authorization SHA256, **one exact provider subscription ID**, ICAO, and start/STOP UTC times. Altered byte digest, wrong key, changed signature, wrong source/authorization/ID/ICAO/time are fail-closed. New negative cases prove pins cannot be silently derived from a changed ticket.
- `executeGate4SignedStopCandidateV39` verifies the signature/pins **BEFORE** touching injected provider operations and then calls the previously reviewed candidate STOP helper. STOP remains exact known ID + strict LIST pre/post; successful response is ONLY `DELETE_VERIFIED_PENDING_SETTLEMENT`. The output does not include raw keys, provider ID, URL or authorization bytes.
- Added 12 crypto and provider-mock negative/positive tests in `tests/phase3_gate4_signed_stop_custody_v39.test.ts`, including swapped signer keys, manipulated signature/JSON, wrong authorization/source/owned-ID, and mocked STOP-without-actual-credit-settlement.

### Precise trust limitations
- A mathematically valid Ed25519 signature proves **only possession of the key matching a supplied fingerprint**. It cannot establish who is authorized to sign or that a human approved this exact provider experiment. Production trustworthy fingerprints, independently reviewed ticket digests, source/window/ID pins, secret custody and signer provenance must be prepared and verified **outside** the untrusted ticket, app environment, and GitHub PR before being used. Self-pinning the signer or deriving pins from the ticket is disallowed.
- The signed ticket is a **post-CREATE exact-ID STOP authorization/custody artifact candidate**, NOT a provider CREATE authority or proof that the id was authentically persisted after provider CREATE. Lost provider CREATE responses with unknown ID remain `HOLD` requiring a separate owner-supervised manual orphan resolution.
- The code does **NOT** implement deployed independent process, authenticated external heartbeat source, separately trusted time/clock, credential provisioning, liveness/alert ACK, durable store, release approval, external STOP audit receipt, post-DELETE SEND overrun envelope, or account settlement. Do NOT infer `independentSupervisorArmed`, `gate4LivePassed`, provider hard cap, or billable permission from tests.
- No production provider GET/CREATE/DELETE/refill, SQL mutations, republish, live Gate4 subscription, Phase6, Replit Agent, or Cloudflare. Previous real Gate4 preflight remains `ACCOUNT_AND_PREPAID_HOST_READONLY_READY` at prior 2037-credit observation, not an everlasting account certificate.

### CI evidence and next step
- Prior STOP candidate checkpoint source `6edb855cf62e97cdb5c388035857ad8fb918cd6c`: all four no-paid GitHub workflows completed SUCCESS, including broad V3.9 Offline Safety.
- At the time of this section, new `d6e41d4...` GitHub workflows were still running: Public Receiver Identity and Focused Release completed SUCCESS; Real PG Receiver Faults completed SUCCESS at last job check; broad V3.9 Offline Safety was in TypeScript processing. **Do not say 4/4 passed before the final status is checked.**
- On exact-head full green, next engineer: add a **pure durable-custody/monotonic-revision policy** with tamper/rollback and post-CREATE unknown-ID failure cases, then a separate Gate4-only service review for independent launch/ACK and mock-provider crash/restart exercises. Do not launch a safety process in Replit Shell and do not use Gate05/FIDS permissions for Gate4 Alert STOP.
