# Cross-airport scientific-health comparison: YSSY P2G24 vs prior successful owners

**Evidence source:** Downloaded GitHub Actions `phase2g-scientific-health-*.jsonl` artifacts for a successful WSSS, OMAA, MMUN and SKBO Stage-1 paid owner and failed/censored YSSY P2G24. This report compares **scientific-health *item* counts**, not provider notifications, prepaid credits, or fully reconciled completed-probe results. Same reported metric contract: `v39-physical-flight-instance-v2` for all five sources.

## Scientific-health artifact sources (retention-limited)

| Airport and GitHub run | Artifact ID | ZIP SHA-256 |
|---|---:|---|
| WSSS [36413290291](https://github.com/HKcode22/ReplitTranvr/actions/runs/36413290291) | 10970903779 | `849b299c446e5fa3934912478d6f5110553946daa88982ba291cd9acd2a988ea` |
| OMAA [36559290299](https://github.com/HKcode22/ReplitTranvr/actions/runs/36559290299) | 11035241689 | `1a1f6dc10102d300fb55111bab1369b2765a41f6f16e74fda0a320ba7f7980ec` |
| MMUN [36852662251](https://github.com/HKcode22/ReplitTranvr/actions/runs/36852662251) | 11163551296 | `8500b647f21397ed1ff4e3124931f1890555961dd1c1a34f1e60c136fcd89b65` |
| SKBO [36998609342](https://github.com/HKcode22/ReplitTranvr/actions/runs/36998609342) | 11227601762 | `4d005afb9794da5440a40a8930ebfd4300f38ae49519c6ac5c273acac1b3519e` |
| YSSY P2G24 [37881617397](https://github.com/HKcode22/ReplitTranvr/actions/runs/37881617397) | 11596189334 | `254bc6b610080aef6c14945d8750072ba81343eb490d11913932a7ebab8bfcb1` |

Artifacts are zipped JSONL status snapshots, typically every ~30s. Counts shown below were taken from the JSONL record closest to **60 minutes since first recorded scientific-health snapshot**, not exactly 60m after subscription creation. Relative timing can differ by startup offsets. They are *not* treatment-matched controlled experiments.

## Near-60-minute comparison

| Airport | Approx. item rows | Resolved items | Quarantined items | Resolved physical IDs | Near-minute-60 snapshot |
|---|---:|---:|---:|---:|---|
| WSSS | **158** | 150 | 8 | 81 | 2026-09-28 12:04:56 UTC |
| SKBO | **130** | 114 | 16 | 78 | 2026-10-02 12:02:30 UTC |
| YSSY P2G24 | **132** | 132 | 0 | 80 | 2026-10-09 04:59:24 UTC |
| OMAA | **51** | 47 | 4 | 28 | 2026-09-29 12:04:35 UTC |
| MMUN | **11** | 11 | 0 | approx. 8 | 2026-10-01 12:02:07 UTC |

**Interpretation:** The known item volume for YSSY (~132 by end of its censored hour) is comparable to SKBO (~130) and **below** WSSS (~158), both successful owner runs. Thus a simple explanation that “YSSY failed because it carried uniquely more observed item rows than other airports” is not supported. This **does not** rule out differences in peak concurrency, raw callback payload size, provider retry burst timing, backend load, unique routes or event-specific code paths; none of those metrics was established by these snapshots.

## End-of-run scientific-health records (different observation durations)

| Airport | Owner terminal outcome | Last health status | Last item rows | Last resolved | Quarantined | Distinct resolved physical IDs | Hard-violation flags in final health snapshot |
|---|---|---|---:|---:|---:|---:|---|
| WSSS | GitHub owner success | PASS_WITH_AMBIGUITY | 321 | 308 | 13 | 141 | 0 |
| SKBO | GitHub owner success | PASS_WITH_AMBIGUITY | 301 | 271 | 30 | 149 | 0 |
| OMAA | GitHub owner success | PASS_WITH_AMBIGUITY | 148 | 140 | 8 | 75 | 0 |
| MMUN | GitHub owner success | PASS_WITH_AMBIGUITY | 46 | 45 | 1 | 28 | 0 |
| **YSSY P2G24** | **GitHub owner failed/censored** | **PASS** | **132** | **132** | **0** | **80** | **0** |

*Actual machine status for MMUN is `PASS_WITH_AMBIGUITY`; table cell corrected below to disambiguate the typographic string. The counts do not prove every full probe later reconciled, even for successful GitHub owner jobs.*

**Crucial distinction:** `v39.phase2g-scientific-health.v1.status=PASS` in a one-minute scientific-health sample means the instantaneous physical-flight-instance identity gates had no hard violation *at that moment*. It is **not** a completed two-hour paid collection verdict. P2G24 remained `clean.adb_anchor_probe.status=failed`, `duration_censored=true`, `reconciliation_status=UNRESOLVED`, and missing UNLOGGED runtime in subsequent read-only audit. Do not relabel it successful.

## Comparison with callback infrastructure findings

- WSSS successful [owner #36413290291](https://github.com/HKcode22/ReplitTranvr/actions/runs/36413290291) logged **two transient callback health failures ~25m** before recovery, yet child finished with exit 0. An unreliable callback check was therefore not exclusive to YSSY.
- P2G23 YSSY had one transient failure ~59m, then three consecutive fatal failures ~88m on original development callback.
- P2G24 YSSY had three fatal failures ~59m on new published Autoscale receiver (older pre-fix route/readiness).
- P2G22 YSSY failed after ~121m with **child exit 1, no watchdog trigger**; separate scientific/settlement cause.

These four observations make infrastructure lifecycle and supervisor **availability** a meaningful hypothesis, but only instance-level Replit logs can identify the trigger.

## Further scientifically valid discriminating tests

1. Compare actual **per-minute** deliveries, traffic spikes, callback response latency/5xx/retries, raw request bytes and object-store writes, not only cumulative item rows.
2. Log per-stage owner health reason, HTTP code, and duration in subsequent *authorized* probe; no provider secret/body.
3. Test idle Autoscale wake separately from continuously polled receiver [sparse observation #37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772).
4. Use disposable, reviewed synthetic webhook payload replay to verify 2xx is only returned after durable bytes and DB reference (requires separate authorization).
5. Preserve exact scientific/credit evidence, do not delete or force MATCH; only conduct a paid reattempt after signed go/no-go gates.

**Disposition: no new paid/Phase6 run authorized.** [Incident report](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md) · [Phase6 blockers](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md)
