# P01–P20 release ledger — Sunday October 11 YSSY, no Cloudflare

**Evidence freeze:** October 10, 2026 PDT. **Target time class:** Sunday Oct 11 20:00–22:00 PDT = Monday Oct 12 03:00–05:00 UTC = Monday Oct 12 14:00–16:00 AEDT (Sydney). Frozen operating-hours window is eligible, **execution_authorized=false**.

**Source of truth:** F.8/Implementation Log frozen protocol; master [P01–P20 tracker](2026-10-10_YSSY_REMAINING_GATES_AND_120MIN_ZERO_CREDIT_REHEARSAL.md), [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28), [draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27) and [Replit-only pivot](2026-10-10_P09_P15_P20_REPLIT_ONLY_POSTGRES_BACKUP_PIVOT_NO_CLOUDFLARE.md). These status labels distinguish *tested offline subgates* from *validated actual published science*.

The operator has declined Cloudflare and authorized zero-AeroDataBox-credit isolated rehearsal, without authorizing new paid hosting or live webhook/DB/secret contamination. Do not create Cloudflare resources, a second paid AeroDataBox subscription, change the frozen original callback, alter production main, or activate a paid probe. A development Replit standby without an independently available original source first hop is **not** automatic webhook failover.

| Gate | Current evidence | Open real-world release requirement |
|---|---|---|
| P01 — Replit original cause | General Autoscale/no replay reply; exact Oct 9 platform replacement unknown | Engineering/Quinn incident diagnosis and deployment-time mitigation |
| P02 — evidence preservation | 30 historical Oct9 P2G24 original-content references; expiry reported around Oct16 | **Verify actual original object bytes/readback and 30 digests now**; preserve failure/censor and source timestamps |
| P03 — physical flight v2 | Actual disposable PostgreSQL identity cases green | Verify published code and nonempty operator/source semantics |
| P04 — real callback parser/route | Actual persistence/duplicate/lost ACK fixture tests; parser guard draft | True complete published-equivalent request path, storage and real isolated test |
| P05 — 10-second sender ACK | 22-way synthetic burst had late source ACKs despite DB commit | Measure actual hosted full POST P50/P95/P99 and cold starts with provider deadline |
| P06 — SQL contention | Outside-pool LOGGED intent + fake object store throughput promising, original connection lock risk reproduced | Integrate reviewed crash-safe lock redesign without losing dedup/originals |
| P07 — published health | Draft root/checkpoint and DB preflight tests | Exact published revision and live scientific/storage witness |
| P08 — telemetry | Sanitized per-stage timers in draft | Verify publishing/runtime capture without raw/secret exposure |
| P09 — original first-hop | Local 127.0.0.1 original-wire fsync spool survives backend outage | **No independently hosted original webhook ingress** outside failing primary; cannot prove unseen POSTs |
| P10 — backup feasibility | Cloudflare declined; existing two Replit apps and read-only PG | Replit-only cost, isolation, URL routing, source persistence; no free HA assumption |
| P11 — source identity | Synthetic attempt + wire SHA/HMAC models | Authentic provider sent-attempt and original UTC/identity verification; untrusted header != proof |
| P12 — replay & current SQL | Disposable current SQL/receipt verification, mock failover | Current deployed physical-v2 route, idempotence, raw replay and storage readback |
| P13 — UNLOGGED crash | Real PG SIGKILL loses UNLOGGED, LOGGED refs survive | Restore exact 120m source/window/owner/items or censor, without duplicate LOGGED raw |
| P14 — sender billing | Exact NUMERIC readers, negative 260 external /259 internal regression | **Authoritative attempted-provider-send and item-level credit reconciliation** |
| P15 — 6+6 watchdog | Per-outage 6+6 pure policy tested; actual owner imports it but supplies `evidence:undefined` | Signed independent original source/credit witness, global risk budget and reviewed prospective policy |
| P16 — cleanup | Synthetic interrupted/unknown owner/stop and orphan checks | Complete real sender subscription lifecycle with signed deletion, drain and cost state |
| P17 — science | UTC-bin sensitivity and 30s-vs-3m tests, no false PASS from time percentages | Authentic item-level missedness and effect on runway-delay inference |
| P18 — primary/standby published parity | Primary publish success; Travnr publish success but reported **older without physical-flight-v2**, dev URL 502 | Actual published exact SHA, test route, same correct science DB/bucket/secret/owner |
| P19 — human paid authorization | Operator authorized **synthetic zero-credit rehearsal**, NOT live paid owner | A separate frozen prospective paid authorization after P01–P20 hard gates |
| P20 — full synthetic 120m hosted R0–R11 | Time-accelerated mock suite; new 127.0.0.1 **real-clock** local runner with short CI smoke and opt-in full 120m mode | **Real published-equivalent isolated 120-minute POST**, 10s ACK/cold starts, full R0–R11 and signed original-source artifacts |

### Concrete work on current draft investigation branch

- `experiments/phase2g_rehearsal/synthetic_replit_local_wallclock_v39.ts`: opt-in **real monotonic elapsed time** local raw fsync/HTTP sender+receiver. `--smoke` lasts about 1.2 seconds (eight source records). `--full-120m` lasts 7200 actual elapsed seconds and schedules **120 original source attempts**, one/minute, 15 per elapsed 15-minute bin, with two actual 3-minute periods when the local receiver returns 503 while localhost frontdoor accepts and retains source. Periodic local-only checkpoint messages, no network other than 127.0.0.1, no DB, no provider, no paid secret. 120m must be actually run; a passing smoke test is NOT that result.
- `tests/phase2g_synthetic_replit_local_wallclock_v39.test.ts`: the 8-record smoke, missing-mode and production-credential hard veto, refusal to pass 118-minute or fake modes. Exact source acknowledgment must include raw SHA, original attempt hash and measured <=10s.
- **Important limit:** This measures a local *Replit-host runtime* if run inside a workspace, but DOES NOT exercise any published `*.replit.app`/ `*.replit.dev` public ingress, cold-start route, real V3.9 PostgreSQL or App Storage. Its original 8 bins are relative wallclock partitions, NOT independently authenticated AeroDataBox UTC source buckets. `paidYssyGoAuthorized` is always false.
- Initial code [GitHub Actions #38114574844](https://github.com/HKcode22/ReplitTranvr/actions/runs/38114574844) passed **612/612 offline tests across 59 suites + 76/76 disposable real PG**, true SIGKILL LOGGED=1 / UNLOGGED=0. **Latest verified code [GitHub Actions #38114708358](https://github.com/HKcode22/ReplitTranvr/actions/runs/38114708358)** at `8de3610fb6370bb99e9d56b0b94a95e9ef7de0bf`: **both jobs SUCCESS**, 612/612 offline /59 suites, 76/76 real disposable PostgreSQL16, true SIGKILL LOGGED=1/UNLOGGED=0. This includes measured <=10-second original source acknowledgment, exact attempt SHA, checkpoint newline and truthful relative elapsed-time bins. An intermediate failing offline commit `0e5a383` had a transient test expectation for the renamed elapsed-bin field and was fixed before the exact verified final source; no production tests/data were altered.

### Operator shell evidence — run P02 preservation FIRST

On original primary Replit `~/workspace`, use the zero-mutation `node --import tsx --input-type=module` snippet provided in this ChatGPT session. It prints local branch/HEAD and nonsecret environment-variable existence plus **READ ONLY** `pg_postmaster_start_time()`, exact YSSY probe-18 failed/censored state and count/min/max expiry/deletion-marked for P2G24 30 original blob references. No provider API calls or database writes. **This first step verifies REFERENCES, not actual blob bytes.** Avoid exposing actual secret values, DB URI, bucket identifier, callback path tokens, raw provider body. If historical session or file differs, stop and investigate; do not "repair" original evidence.

The existing audit `scripts/v39_p2g24_readonly_blob_integrity_audit.ts --verify-objects` performs 30 original blob downloads and local SHA/length comparisons under a `BEGIN TRANSACTION READ ONLY`. It must be run only if the exact file exists in the running checkout at the reviewed commit and access is authorized; observe aggregate results only. Do not force checkout/republish simply to obtain a script.

### Optional isolated local rehearsal (AFTER reviewed GitHub CI and P02)

This is the **local-only** Replit Shell dry run. A separate detached git worktree prevents altering the current live app checkout, and a **fully empty child environment** prevents passing provider/database/blob credentials. It uses the **same existing Replit app's terminal resources** without a new host, but verify actual account compute quotas/pricing. The full run is a manual 2-hour process: an operator must keep the Shell/runtime alive and collect printed PASS/FAIL; abrupt suspension is **CENSORED/FAILED**, not a PASS.

```bash
cd ~/workspace
git fetch origin phase2g-p2g24-github-observer-20261009
TEST_WORKTREE="/tmp/p2g-stage1-rehearsal-${PPID}-$$"
git worktree add --detach "$TEST_WORKTREE" origin/phase2g-p2g24-github-observer-20261009
ln -s "$PWD/node_modules" "$TEST_WORKTREE/node_modules"
cd "$TEST_WORKTREE"
env -i PATH="$PATH" HOME="$HOME" TMPDIR=/tmp P2G_LOCAL_SYNTHETIC_ONLY=YES \
  node --import tsx experiments/phase2g_rehearsal/synthetic_replit_local_wallclock_v39.ts --smoke
# Only if smoke PASS_LOCAL_ONLY, P02 evidence is safely preserved, and
# continuing for two actual hours uses no incremental billed service:
env -i PATH="$PATH" HOME="$HOME" TMPDIR=/tmp P2G_LOCAL_SYNTHETIC_ONLY=YES \
  node --import tsx experiments/phase2g_rehearsal/synthetic_replit_local_wallclock_v39.ts --full-120m
```

Run **neither** command in the published provider callback owner process. This does not make a paid GO, does not replace the required real hosted/public POST rehearsal, and must not be described as independently durable source capture when ingress itself goes down. No `npm install` or secret values are necessary if the existing workspace has the correct pinned `node_modules`.

**Final decision:** Sunday Oct 11 20:00 PDT remains paid **NO-GO on currently verified evidence**. Multiple genuine scientifically required hard gates remain outstanding. The user should not be promised that the remaining P09/P14/P18/P20 deployment and source-authentication work can be completed before the slot. Keep any historically failed or censored paid measurements unchanged.


## Oct 11 user-science-flexibility decision and P02 live evidence

[Permanent joint operator/assistant decision record](../decisions/2026-10-11_YSSY_6PLUS6_SCIENTIFIC_MISSINGNESS_DECISION_RECORD.md) supersedes any *categorical* inference that a 3-minute GET outage automatically invalidates all valid received flights. Three-minute (180s) is an OPERATIONAL 6+6 tolerance budget, not proof of a 3-minute data gap or bias; fresh per-incident allowance needs verified closure and a cumulative whole-run budget. No live 6+6 source witness deployed.

New isolated P17 conditional **OBSERVED-SUBSET DESCRIPTIVE ONLY** path (not F.8 pass) allows an auditable received-only subset even when provider sender census is unknown. Operational 30s/60s/120s/180s/300s uncertainty alone does not determine the valid recorded subset. This requires stored SHA/readback, confirmed physical-v2/codeshare quarantine, UTC bin/metric semantics, no duplicate/owner corruption and PG lifecycle provenance; no missing-source count or unbiased overall mean is invented. Verified CI [#38115130386](https://github.com/HKcode22/ReplitTranvr/actions/runs/38115130386) source `f13f8e5bbbaaa2eb96dff6d7a18339308f7ddeef` **628/628 offline, 76/76 disposable PostgreSQL, both success**, unclean PG LOGGED/UNLOGGED proof.

**P02 new actual read-only original Replit stdout:** Oct 11 05:20:47Z original primary is clean at local manual-receiver-repair branch commit `d5db303d25694f355289587e97cb4972a975b87e` (not found in connected GitHub; do NOT reset). At Oct 11 05:20:34.452Z PG server had just started; reason unknown. Original failed/censored/UNRESOLVED YSSY probe 18 unchanged. 30 blob REFERENCES, deletion-marked=0, expiries October 16 04:02–04:52 UTC. **Actual 30 object-content SHA/length audit STILL PENDING**, do not confuse SQL references with bytes. Continue without Cloudflare or extra paid services; paid Sunday YSSY still NO-GO.


## Oct 11 P02 real original blob bytes **PASS — 30/30 operator-run SHA/size readback**

The operator executed the reviewed exact-hash audit-or-inline-fallback P02 original historic YSSY probe-18 script in the existing primary Replit Shell, reporting status `PASS_ALL_30_SHA256_AND_BYTES`, `references=30`, `verified=30`, `mismatched=0`, `inaccessible=0`, `failures=[]`, `database_mutations=0`, `object_storage_mutations=0`, `aerodatabox_calls=0`. This **closes P02's actual stored-object retrieval/hash/byte-size check at the observation time** (operator-supplied evidence), replacing the prior 'actual bytes still pending' status for that specific subgate. The verified stored content is not authenticated literal original HTTP wire and cannot reveal source sends lost before Replit or reconcile credits; the historical failed/censored/UNRESOLVED probe remains unchanged. Expiry metadata still begins Oct 16. Full [P02 audit checkpoint](2026-10-11_P02_REAL_YSSY_ORIGINAL_30_BLOBS_SHA256_READBACK_OPERATOR_EVIDENCE.md).

**Remaining P02 caveat**: cryptographic signed independent archive/expiry preservation, unreceived provider source and historic failed scientific interpretation are separate; no automatic raw-content backup or retention extension is authorized. P09/P14/P18/P20 remain hard release investigation tasks.

### Next nonmutating P18 fact check

The existing published `GET /__v39/workspace-runtime` contract in `server/lib/disruption/workspaceRuntimeHealth_v39.ts` returns only a runtime-*claimed* `git_head`, route owner, prepaid route flag, retention hours, deployment/owner mode and durability class. A public GET can distinguish a published source-version mismatch from a source currently omitted/unauthenticated. It does **not cryptographically prove image/hash attestation, real provider POST behavior, common bucket/DB/secret identity, raw-wire, or full original source continuity**. Operator may run a bounded timeout GET of both existing published origins and share **only sanitized** fields; no callback secret, webhook POST, provider API, live DB query, or deployment mutation. A cold start may itself be observed, and a 503/404 remains a failing/unknown published gate.

**Do not silently mark tomorrow's paid YSSY GO because P02 passed**. Partial scientifically useful received-data analysis is separate from frozen F.8 complete delivery and financial/provider-sender safety.
