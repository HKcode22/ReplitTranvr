# Oct 28 Gate05 retry5 read-only settlement: inactive provider, stale ACTIVE owner, bounded closeout

**Verified October 28, 2026 10:51:16 UTC, GitHub Actions, NOT assumed from chat history.** Canonical issue [#173](https://github.com/HKcode22/ReplitTranvr/issues/173#issuecomment-6467159460) and [PR #221](https://github.com/HKcode22/ReplitTranvr/pull/221).

## What is now proven

- Source `main` exactly `9ddac718395eb5c319e706bfea2c6f2f317c039d`, postmerge offline safety [#40674380301](https://github.com/HKcode22/ReplitTranvr/actions/runs/40674380301) SUCCESS.
- Original paid CREATE controller [#40667765747](https://github.com/HKcode22/ReplitTranvr/actions/runs/40667765747) succeeded at 10:15:12 UTC on original `f6094c6...` code. This was **one real paid subscription**, not a free/retry-only process.
- Independent STOP [#40667867823](https://github.com/HKcode22/ReplitTranvr/actions/runs/40667867823) had a FREE `/subscriptions/balance` telemetry outage, but its detailed emergency report verified deletion of the exact known provider ID at 10:19:14 UTC. The process's overall exit remained FAILURE. The observation is ~254 seconds, NOT 60 minutes; actual callback/flight/airborne counts remain unmeasured and not invented.
- Independent FREE [read-only settlement #40675181436](https://github.com/HKcode22/ReplitTranvr/actions/runs/40675181436), run 10:49:41–10:51:19 UTC on repaired `main`, job [#122771654168](https://github.com/HKcode22/ReplitTranvr/actions/runs/40675181436), SUCCESS. Exact subscription ID was present in database; **not active** in both current provider LIST reads; **zero foreign active** subscriptions; free balance at 10:50:37 and 10:51:16 UTC **1,981 Alert credits**, stable. Net account difference from pre-CREATE 1,981 is **zero as observed**, not an assurance of final zero billed sends or a zero-cost study.
- Remaining inconsistency: V0074 LOGGED owner scope `e69ffa34-d8a6-456f-a49c-9dd459e6d294` still **ACTIVE**. Its unique partial index permits at most one nonterminal owner, so new scope commissioning is structurally blocked until this specific old owner has a safe terminal transition.

## Proposed source-only corrective closeout

Review `scripts/v39_gate05_retry5_exact_owned_closeout_once_v39.ts`, `.github/workflows/phase3-gate05-retry5-exact-owned-db-closeout.yml`, and `tests/phase3_gate05_retry5_exact_owned_db_closeout_v39.test.ts` in the companion PR; **not deployed or dispatched by adding files**.

The one-use, GitHub-time-only workflow is explicitly manually dispatched under protected `phase2g-paid`; it does NOT call provider CREATE/DELETE/FIDS/refill. It verifies old paid controller and STOP run source/status, successful independent old settlement run; obtains **two new** provider FREE balance+LIST snapshots 30 seconds apart, verifies that neither exact nor foreign subscription is active; validates existing identity/authorization/window/id/cost fields and stable authorized counter with no refill. After all checks, one serializable-with-owner-lock, conditional compare-and-swap transition marks **only** the exact old LOGGED owner `ACTIVE → STOPPED`, stamps a SHA256 evidence commitment and the database closeout time. It preserves the original provider ID, source fields, signed authorization and run times, the earlier actual DELETE timestamp separately in the ledger and all UNLOGGED receiver/callback/raw evidence untouched. A failure or ambiguous COMMIT is held for read-only forensic review; no automatic retry. V0074's terminal state and immutable trigger are the source of truth.

**Meaning of `STOPPED`:** the exact provider subscription is confirmed inactive and the owner is terminal, **not** a scientific 60-minute PASS, **not** a final bill invoice and **not** a claim of representative trajectory observations. Final account billing can post late. No further paid scope or reused old financial token is authorized by this engineering closeout.

## Why Gate 0.5 science remains OPEN

Binding [Plan f.8 §16](../plans/V3.9_DataCollectPlan_f.8.md) requires a prospective dedicated adequately sampled cohort with frozen thresholds and verified source clocks, selected T/target, real physical-leg identity, PRE/POST provenance, cadence, recovery and retention. Earlier WSSS12 FIDS 30+30 objects/4 REST units, WSSS08 canary 19 credits, and Gate4 NEXT4 5/5 are real **technical scoped** successes, not substitutes for this strict Gate0.5 pilot. OpenAPI `runwayTime` actual-or-estimated and `scheduledTime` unspecified gate/runway semantics still prevent claiming true actual-wheels-off minus scheduled-wheels-off from unverified values. Preserve null and right-censoring; do not change estimands or tolerance after seeing observations.

YSSY P25 231 external billed vs 229 retained item credits, 58 successful receiver 2xx envelopes, historical 6+6 healthy and lost old raw, remains a **distinct, genuine 2-credit gap with unknown provider SEND attempt ledger**. Phase4 offline work may continue; Phase4/6 new paid collection remains separately gated.

## Immediate sequence

1. Obtain PR CI/review and merge only if the exact safe no-provider tests pass.
2. The **one** reviewed DB-only closeout may then be invoked from GitHub after verifying the current main/source. Its environment may require existing protected reviewer approval. Do not manually edit SQL, and do not repurpose the old retry5 paid workflow.
3. Perform read-only post-closeout account/owner confirmation, allow delayed billing to settle, preserve time/censoring evidence.
4. Design any **new** prospective paid science scope only with its own fresh bounded cost authority, prospective sampling, exactly owned independent STOP, source validity and genuine measured denomination. No automatic paid retries.

No Cloudflare, no Replit AI Agent, no Replit shell timing, no provider refills, no fabricated scientific PASS.
