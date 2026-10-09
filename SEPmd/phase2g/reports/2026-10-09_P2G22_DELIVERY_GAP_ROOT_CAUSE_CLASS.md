# P2G22 YSSY accounting failure — confirmed from original GitHub owner artifact

**Recorded 2026-10-09; based on primary historical evidence, not speculation.** This is distinct from P2G23/P2G24 callback-watchdog interruptions.

## Confirmed primary evidence

GitHub paid Stage-1 owner [run #37407181205](https://github.com/HKcode22/ReplitTranvr/actions/runs/37407181205) owner evidence artifact `11391881377`, file `phase2g-github-owner-AUTH-20261006-P2G22-20261006T030457Z.log`.

The original owner log explicitly records:

```json
{"schema":"v39.anchor-stage1-execution.v3","status":"FAIL","error":"REFUSED_STAGE1_PROBE_FAILED: YSSY external_internal_delivery_gap"}
```

The supervisor's final record shows `child_exit_code=1`, `callback_watchdog_triggered=false`, `child_signal=null`, and `recovery_exit_code=0`. Owner started `2026-10-06T03:04:59.433Z` and ended `05:06:03.572Z`. Hence **P2G22 did not fail because its parent watchdog terminated it after three callback-health failures.** Its own stage result refused due to a **provider-vs-internal delivery-gap condition** after approximately 121 minutes.

Companion P2G22 scientific health artifact `11391286288` / file `phase2g-scientific-health-P2G-S1-20261006-21-37407181205.jsonl` contains 237 parsed records. The final observed snapshot at `2026-10-06T05:06:33.367Z` reports `status=PASS_WITH_AMBIGUITY`, `hard_violations=[]`, **259 total item rows**, **252 resolved**, **7 quarantined**, **113 resolved physical flight IDs**, **62 repeated exact-leg groups**, **11 late aircraft enrichments**, metric contract `v39-physical-flight-instance-v2`. These are scientific item counts: **they are not automatically the number of provider credits, deliveries, callbacks, or settled notification attempts**. A previously discussed 260-versus-259 accounting gap cannot be verified from this scientific-health snapshot alone.

## What remains unproven

- Exact `external_spend_credits`, `internal_received_credits`, `delivery_gap_credits`, completeness, provider delivery attempts and `callback_success_2xx` at final settlement. The owner log gives the *reason class*, not all credit figures.
- Whether difference arose from provider delivery failure, legitimate provider billing for attempted notifications, a callback 5xx/timeout, a missing/double-counted delivery or crash/UNLOGGED data loss.
- Whether it was the same underlying infrastructure cause as P2G23/P2G24. **Current evidence does not support that conflation.**

## Next discriminating read-only audit (P2G22 only)

Query `clean.adb_anchor_probe` joined to `clean.adb_probe_reconciliation_evidence` for **budget `P2G-S1-20261006-21`** and `YSSY`; retrieve only status, durations, reconciliation amounts/gap/completeness, callback counters and evidence timestamps. No provider requests. Verify durable evidence row identity before interpreting it. The code in `scripts/v39_probe_stage1_owner_v39.ts` explicitly reads:

- `e.external_spend_credits`
- `e.internal_received_credits`
- `e.delivery_gap_credits`
- `e.delivery_completeness`
- `e.callback_requests_seen`, `e.callback_success_2xx`, `e.callback_failures`
- `e.duration_censored`, `e.stop_reason`

Do not mutate the evidence, force `MATCH`, write new fake delivery records, or rerun provider subscriptions to 'repair' historical accounting.

## Distinct parallel failures

- P2G23 [#37720914245](https://github.com/HKcode22/ReplitTranvr/actions/runs/37720914245): GitHub owner watchdog `workspace_callback_unreachable_threshold`, triplet around 2026-10-08 04:32:49–04:33:19 UTC; first transient failure at 04:04:48 UTC. Original development callback.
- P2G24 [#37881617397](https://github.com/HKcode22/ReplitTranvr/actions/runs/37881617397): identical *watchdog class* with three failures around 2026-10-09 04:58:26–04:58:56 UTC; published Autoscale callback.
- The exact health-failure substage was not logged in P2G23/P2G24 prior to diagnostic enhancement.

## Phase6 implication

**Keep separate hard gates for** (1) receiver lifecycle/reachability, (2) provider-to-internal credits and delivery reconciliation, (3) durable raw webhook persistence and recovery, (4) physical-flight-instance scientific identity validity, and (5) prepaid budget/subscription safety. A green 130-minute health monitor closes none of those other gates by itself.

Primary references: [P2G24 incident](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md), [Phase6 blockers](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md), [GitHub blocking issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).