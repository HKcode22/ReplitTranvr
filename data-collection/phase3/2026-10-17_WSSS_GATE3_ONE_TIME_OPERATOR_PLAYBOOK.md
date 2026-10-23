# WSSS Gate 3 — one-time, supervised live operator playbook (17 October 2026)
**Operator action document / future execution, not an automatic script. Last verified 2026-10-17 18:00 PDT.**

> **Run only once within the frozen user authorization.** This document is proposed in a **documentation-only PR**. It must NOT be merged into `main` before the live run, since that would change the GitHub head and break the pinned published receiver and GitHub watchdog. Read it from this PR branch. The executable source and approved AUTH already exist on pinned `main` and production Replit. Never invoke Replit AI Agent, Cloudflare, a generic credit-canary script, or an unreviewed deploy.

## 1. At-a-glance decision card (show to another operator)

| Field | Exactly authorized value / rule |
| --- | --- |
| Purpose | **Gate 3 integration safety**, not a redo of old WSSS scientific fieldwork |
| Operator's local time | **Saturday 17 October 2026, 20:00 PDT** (Los Angeles); Stage A begins **19:52–19:57 PDT**, not before |
| Exact UTC start | **Sunday 18 October 2026, 03:00:00Z**; paid CREATE allowed only to **03:00:15Z** |
| Airport and direction | WSSS departures, airport-level Flight Alert (`FlightByAirportIcao`) |
| Exposure | Intended **600 seconds**; stop early if credit, watchdog, or custody safety demands it; do not claim full duration if censored |
| Credits | **50 Alert-credit SOFT stop**, provider does not guarantee a 50-credit hard limit; brief burst overrun possible but unbounded spend not authorized |
| Maximum creations | **ONE** paid CREATE. **ZERO automatic retries**, even if provider response is ambiguous |
| AUTH ID | `AUTH-20261018-G3WSSS01` |
| AUTH file | `data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json` |
| AUTH SHA-256 | `7ef03886961fa8a84677062862c675a00a1a6b646eb1407269be4e3831cb2746` |
| GitHub and published Replit pinned source | `1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00` |
| Reviewed source tree | `6a80cad85524341333c9b8d8b196fa1011667717` |
| Replit published host | `https://replit-tranvr--hk84164.replit.app` |
| GitHub workflow | [Phase3 Gate3 WSSS Independent Safety Sidecar](../../.github/workflows/phase3-gate3-independent-safety.yml) (manual dispatch on **main** only) |
| Project evidence | [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38), [AUTH hash approval](2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md), [science/operations runbook](2026-10-16_GATE3_WSSS_SCIENTIFIC_TOLERANCE_AND_OCT17_LIVE_RUNBOOK.md) |
| Provider minimum | Fresh strict account GET/LIST, **>=1500** Alert credits, **>=1000** protected floor after soft50, positive API units and zero other active CreditBased subscriptions |
| GitHub environment caveat | `phase2g-paid` exists and named secrets were seen; **protection_rules=[]** as last checked; this is not reviewer-approved environment enforcement |
| Status at document writing | Production source and public receiver verified, AUTH approved, strict earlier account read-only PASS; **no Gate3 paid CREATE yet; no Gate3 scientific PASS** |

## 2. Before 19:52 PDT: read-only checks; no session reservation

**Have two independent views ready.** Terminal A is the interactive **Replit Shell** running the actual source-reviewed owner. Browser B is **GitHub Actions** plus Issue #38, or a second shell for `gh` commands. Keep Terminal A open: once Stage A creates the durable PREPARED UUID, it pauses awaiting two numbers. Avoid closing the terminal, sleeping the machine, restarting Replit, or starting a second owner.

Use the following in **Replit Shell**. It performs read-only GETs and consistency checks only. Do not paste the live token or API key into a chat or GitHub comment:

```bash
set -Eeuo pipefail
set +x
cd ~/workspace
PIN=1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00
AUTH=data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json
SHA=7ef03886961fa8a84677062862c675a00a1a6b646eb1407269be4e3831cb2746
test -z "$(git status --porcelain)"
test "$(git rev-parse 'HEAD^{tree}')" = "$(git rev-parse "${PIN}^{tree}")"
test "$(sha256sum "$AUTH" | awk '{print $1}')" = "$SHA"
gh auth status >/dev/null
gh api rate_limit --jq '.resources.core | {limit,remaining}'
node --import tsx --input-type=module <<'NODE'
import 'dotenv/config';
import {reviewGate3CurrentProviderAccountV39}
 from './server/lib/disruption/gate3OwnedPreExposure_v39.ts';
await reviewGate3CurrentProviderAccountV39(50);
console.log('STRICT_PROVIDER_GET_LIST_ACCOUNT_PASS_READONLY');
NODE
curl --fail --silent --show-error --max-time 20 \
 https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime \
 | PIN="$PIN" node -e '
 let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{
 const x=JSON.parse(s);
 const ok=x.status==="PASS"&&x.git_head===process.env.PIN&&
 x.prepaid_route_registered===true&&x.prepaid_source_custody_ready===true&&
 x.retention_hours===168;
 console.log(JSON.stringify({public_git_head:x.git_head,source_custody_route_pass:ok}));
 if(!ok)process.exitCode=2;
 });'
echo READ_ONLY_ADMISSION_CHECKS_PASS
```

**Important:** GitHub `gh auth status` does NOT automatically make `GITHUB_TOKEN`/`GH_TOKEN` available to the Node operator. Export `GH_TOKEN` privately *in Terminal A's same shell* immediately before Stage A: `export GH_TOKEN="$(gh auth token)"`. Keep `set +x`; never echo this token. Node requires an authenticated GitHub API token because it re-verifies the job and lease every few seconds. Likewise ensure `V39_DATABASE_TARGET_CONFIRM=production` and exact `V39_DATABASE_RUNTIME_URL`, `AERODATABOX_API_KEY` are present in the operator process through configured Replit environment/secret settings. The project's `dotenv/config` loads the applicable local environment; do not print secret values. If configuration is absent, **HOLD** rather than improvising a production connection or copying secrets into terminal history.

**Before any paid exposure:** no active/settling other Gate3 PREPARED owner, open incident that actually blocks authorization, old unresolved provider subscription or unexpected balance change. The Stage A owner and sidecar enforce further independent DB/provider checks; an old read-only result is never a waiver. Do not re-run production migration V0065: its controlled production state was previously prepared and is separately checked by the owner.

## 3. Precisely at 19:52–19:57 PDT (02:52–02:57 UTC): start ONE Stage A owner

**Do not run this at 19:45.** The shell owner enforces a 3–8 minute lead before `03:00:00Z`. Time cannot be recovered by changing the AUTH, extending the UTC window, or moving the clock. Stage A is **a production PostgreSQL reservation**, though still **not a paid provider CREATE**.

In **Terminal A** on the exact source-reviewed tree (a Replit publication metadata commit with the same source-tree SHA is allowed):

```bash
set +x
export GH_TOKEN="$(gh auth token)"
export V39_DATABASE_TARGET_CONFIRM=production
cd ~/workspace
npx tsx scripts/v39_gate3_one_wsss_operator_v39.ts \
  --auth-id AUTH-20261018-G3WSSS01 \
  --auth-file data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json \
  --window WSSS/departures/2026-10-18T03:00:00Z+600s \
  --icao WSSS \
  --credits 50 \
  --seconds 600 \
  --expected-published-head 1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00
```

**Required Stage A result:** ONE JSON record with `status:"PREPARED_NO_CREATE"`, `session_id` UUID, `auth_sha256`, `expected_head`, `start_utc`, `provider_created:false`. The process then asks `Enter independent GitHub watchdog RUN_ID COMMENT_ID:`. **Do not enter anything yet**; record that single UUID privately, keep Terminal A open. If Stage A returns HOLD or crashes, **do not simply rerun**: the durable SQL source owner may exist and need explicitly reviewed recovery. If the window has already advanced past 19:57, **HOLD rather than rush**. Never invent a UUID or use an old one.

## 4. Immediately after PREPARED: manually dispatch the independent safety workflow on GitHub

In GitHub open [Actions / Phase3 Gate3 WSSS Independent Safety Sidecar](https://github.com/HKcode22/ReplitTranvr/actions/workflows/phase3-gate3-independent-safety.yml). Use **Run workflow**, branch **main**, with the exact inputs shown below. `session_id` is the **fresh UUID printed by Stage A** and must be manually copied; `<PREPARED_UUID>` is a placeholder, not a literal input.

| Workflow input | Enter |
| --- | --- |
| `confirm` | `WATCH_G3_WSSS_EXACT_NO_CREATE` |
| `expected_head` | `1a9a0ca9dc2750fdc7ad170c543dff7d49e20e00` |
| `auth_id` | `AUTH-20261018-G3WSSS01` |
| `auth_file` | `data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json` |
| `auth_sha` | `7ef03886961fa8a84677062862c675a00a1a6b646eb1407269be4e3831cb2746` |
| `session_id` | exact fresh `PREPARED_NO_CREATE.session_id` |
| `start_utc` | `2026-10-18T03:00:00Z` |

This is a **separate** GitHub Actions process. Its GitHub token has `issues:write`; it verifies source SHA, approved AUTH bytes, the published receiver, the exact prepared LOGGED+UNLOGGED SQL owner and live provider state. It cannot create a Flight Alert subscription. It publishes a metadata-only JSON lease comment on [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) **as `github-actions[bot]`**, then updates the lease heartbeat approximately every 15 seconds. A queued Actions job, a green workflow name, a manually typed comment or a status `running` without a fresh authenticated bot lease are **NOT** sufficient.

In the workflow job output find **`status:"ARMED_MONITOR_ONLY_NO_CREATE"`** with exact matching `session_id` and `expected_head`. It includes `github_run_id` and `github_comment_id`. Verify the comment belongs to `github-actions[bot]` and the workflow job is still **in_progress** on exact pinned `main`. You can check the comment's numeric ID by opening the [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) link in the output or inspecting the JSON comment with the authenticated GitHub CLI; do not confuse an older checkpoint comment with the fresh watchdog **lease** comment.

**Return to Terminal A** and enter **only two decimal integers separated by one ASCII space**:
```text
<GITHUB_RUN_ID> <GITHUB_COMMENT_ID>
```
Do NOT put placeholders literally; never enter these IDs before actual ARMED evidence. The owner's source independently checks the GitHub API job `in_progress`, exact workflow, bot actor, correct session/hash/start time and fresh 25-second heartbeat, then checks the provider account and lease again immediately before paid CREATE.

## 5. At 20:00:00 PDT / 03:00:00 UTC: ONE paid CREATE, conditional

After the authenticated ARMED handoff, **Terminal A automatically waits for 03:00:00 UTC**, performs fresh provider GET/LIST and bot heartbeat checks, and allows **at most one** AeroDataBox CREATE up to `03:00:15Z`. **Do not run a second command to CREATE, retry an apparent timeout, re-dispatch a different UUID or use `scripts/credit_canary.ts`.** Unknown provider success after timeout is ambiguous and must be handled as HOLD with account-level recovery.

Normal observation is **up to 600 seconds** from actual subscribed exposure, with a 5-second local watchdog, independent GitHub watchdog and an intended 50-credit **soft** stop. An early safety stop is legitimate cost protection, but its scientific duration must be **censored**, never reported as an uncensored full 600 seconds. The independent sidecar's absolute backstop is approximately **03:10:30Z**, plus rescue oversight through **03:15:30Z**; this extra rescue time is **not extra approved science time**. The provider has **no hard 50-credit spending ceiling**: a send burst can overrun this trigger. If an exact-owned provider subscription remains active and the owner disappears, the independently running sidecar can inspect and delete only that exact owned ID; if identity remains ambiguous, **HOLD and independent manual recovery** (never delete a foreign ID).

## 6. What successful closure actually means

**A. Operational / safety:** exact-owned subscription DELETE **verified absent**; no foreign active billable subscription; settled provider balance read **at least three times stably**, no unbounded exposure; durable owner/session and raw signed callback/Blob SHA identity are preserved. Neither a GitHub Action marked success nor an owner's exit code alone proves this.

**B. Original strict instrumentation certificate:** the checked-in `gate3CanaryTerminalAssessment_v39.ts` requires accurate uncensored full window, equal external provider credits vs internal durably received item credits, positive meaningful evidence, valid source and verified DELETE. If exact mismatch, early stop, overrun or missing custody, **keep the original HOLD/FAILED reason**. Do NOT fabricate a successful paid Gate3.

**C. Scientific research use:** valid, uniquely identifiable, durably read-back flight observations are not automatically erased by a small billed-versus-received discrepancy. Existing exploratory research-only screening uses **both** <=2 positive billed-credit gap AND <=1% of billed items, with genuine full duration/identity/custody/settlement preconditions; this is a *proposed* screen and not a universal statistical theorem or new paid authorization. A 50-credit 10-minute canary cannot necessarily meet a 1% fraction for even one missing billed item. Quantify the actual denominator and selective missingness, report bias/sensitivity; distinguish *credit items*, *webhook requests*, *flight identities* and *physical missing-flight rate*. Original Phase2G/YSSY/WSSS historical labels never change. See [scientific tolerance rationale](2026-10-16_GATE3_WSSS_SCIENTIFIC_TOLERANCE_AND_OCT17_LIVE_RUNBOOK.md).

## 7. HOLD / abnormal exit decision guide

| Observed problem | Do this (no new paid side effect) |
| --- | --- |
| Local source-tree mismatch, public SHA mismatch, AUTH hash mismatch, stale clock, expired AUTH | Stop; do not publish/rewrite/override while authorizing this run |
| Source prepared but GitHub Action remains queued, bot ARM missing, stale heartbeat, workflow has no proper secrets | Do not enter identifiers into Terminal A; diagnose original single prepared UUID and provider inventory |
| No 3–8 minute lead remains; deadline passed | HOLD; **do not** change UTC, duration or attempt a late CREATE |
| Ambiguous CREATE response, owner exits unexpectedly, unknown provider state | Preserve logs safely, perform strict provider LIST and durable SQL read-only ownership review; do not CREATE again |
| Confirmed unique exact-owned subscription needs stop | Let the reviewed owner or sidecar verify and DELETE only its exact owned ID; separate manual deletion requires authenticated independent approval |
| Provider credits exceed intended soft50 or callbacks stop | Record actual overrun/censoring and initiate safe exact-owned stop; never infer provider-enforced hard cap |
| GitHub job success but live owner failure / small delivery gap | Reconcile provider/SQL/Blob receipts independently; safety and data usefulness are separate from strict instrumentation PASS |
| No reliable source-custody evidence or unknown scientific denominator | Label HOLD / secondary descriptive only; no invented or global completeness percentage |

## 8. Post-run evidence and project handoff

Record a **dated, public-safe metadata-only** checkpoint in Issue #38 and under this Phase3 folder **after** live run, with: exact source/tree+published commit; AUTH ID+SHA; prepared UUID (UUID only as project metadata, **avoid publishing sensitive subscription/callback identifiers**); GitHub workflow run and bot lease comment IDs; actual owner start/end, 600s exposure achieved or censored, stop reason; provider exact-owned DELETE evidence and three stable credit checks (amounts only if policy permits); signed raw original SHA/size count + SQL/source custody proof (never raw payload or secrets); external/internal billed-credit gap, scientifically qualified/failure status; no second CREATE; outstanding incident and next steps.

**Do not interpret this runbook as a scheduled/background agent.** The 19:45 reminder is informational only. A human must supervise Terminal A and manually dispatch the independent job. If user cannot supervise the UTC window, do not substitute a new time without separately reviewed authorization.

### Sources and cross-links

- [One-shot approved AUTH JSON](../authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS01.json), [independent approval addendum](2026-10-16_GATE3_WSSS_AUTH_SHA_APPROVAL_ADDENDUM.md), [current Gate3 owner source](../../scripts/v39_gate3_one_wsss_operator_v39.ts), [watchdog source](../../scripts/v39_gate3_independent_watchdog_v39.ts), [watchdog lease verification](../../server/lib/disruption/gate3WatchdogLiveLease_v39.ts).
- [Operational+scientific three-track rationale](2026-10-16_GATE3_WSSS_SCIENTIFIC_TOLERANCE_AND_OCT17_LIVE_RUNBOOK.md), [frozen scientific Plan](../plans/V3.9_DataCollectPlan_f.8.md), [original evidence ledger](../evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md).
- GitHub source releases [PR60](https://github.com/HKcode22/ReplitTranvr/pull/60) and [PR61](https://github.com/HKcode22/ReplitTranvr/pull/61), independently verified source and hosted parity documented in [Issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38).
