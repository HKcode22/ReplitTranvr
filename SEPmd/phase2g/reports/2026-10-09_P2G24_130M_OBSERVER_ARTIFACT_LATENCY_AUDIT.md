# P2G24 130m observer: raw-artifact audit and latency analysis

**Verified from downloaded GitHub Actions artifact ZIP, not from a screenshot.** Source [run #37920862702](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702), artifact `11617790710` named `phase2g-p2g24-observer-evidence`, created 2026-10-09 13:08:28 UTC. Preserve the original ZIP before GitHub's 30-day expiry.

## Integrity manifest

| File in ZIP | Length (bytes) | SHA-256 |
|---|---:|---|
| `checks.csv` | 180,502 | `415f7e5dcf14472fef6fb376c315d2832af643d62b9ccf0144977f39dc16e92c` |
| `summary.json` | 557 | `1756e063aa257b573dfd969b918496eb351033e2a9ea9ecc03e80ea8eff27d3c` |

`summary.json`: `status=PASS_ZERO_CREDIT_130_MIN`, `samples=520`, `total_checks=2600`, `failed_checks=0`, `max_consecutive_failed_samples=0`, `max_sample_gap_seconds=15.007`. The CSV contains exactly 2,600 parsed observation rows, 520 of each stage, all `PASS`; first and last recorded row timestamps `2026-10-09T10:58:29.113Z` and `2026-10-09T13:08:13.694Z`. Final loop completion at `13:08:28.183Z`. Expected runtime commit SHA `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653`.

## Latency distribution (ms; calculated from CSV)

| HTTP stage | Count | Median (p50) | p95 | p99 | Maximum |
|---|---:|---:|---:|---:|---:|
| root_health | 520 | 110 | 234 | 408 | **4,271** |
| wrong_secret_route | 520 | 108 | 226 | 277 | **4,842** |
| published_runtime | 520 | 67 | 93 | 175 | **5,166** |
| webhook_secret_binding | 520 | 67 | 103 | 133 | **5,097** |
| runtime_db_binding | 520 | 67 | 84 | 169 | **4,599** |

These percentiles use the observed sorted index at floor(n×percentile), not confidence intervals. Exact responses were expected HTTP 200 (root/runtime/bindings) or 404 (wrong-secret route); none breached the per-request 8s timeout.

## Eleven individual requests taking over 1,000 ms

`checks.csv` stores a per-*cycle-end* UTC timestamp (same for all five checks); the cycle's precise per-request start timestamp is not separately recorded. The elapsed-minute field also refers to cycle completion, not exact request arrival. Do not infer single-request network or instance-event causation to the millisecond.

| Elapsed min | Cycle | Health stage | Time ms |
|---:|---:|---|---:|
| 44.844 | 180 | wrong_secret_route | 4,842 |
| 45.098 | 181 | webhook_secret_binding | 5,097 |
| 45.847 | 184 | published_runtime | 5,166 |
| 46.335 | 186 | runtime_db_binding | 4,599 |
| 62.052 | 249 | root_health | 1,740 |
| 73.530 | 295 | root_health | 1,413 |
| 92.072 | 369 | root_health | 1,318 |
| 92.072 | 369 | runtime_db_binding | 2,459 |
| 92.303 | 370 | wrong_secret_route | 2,790 |
| 92.826 | 372 | root_health | 4,271 |
| 94.294 | 378 | wrong_secret_route | 2,269 |

**Pattern:** intermittent higher latency at minute ~45–46 and ~92–94 and isolated other events (62, 73); 11/2,600 requests >1s. All passed. Approximately 45–47min distance between the two observed clusters is a descriptive coincidence, **not proof of a periodic platform timer**, autoscaler rotation, or a particular root cause. There is insufficient information on Replit instance IDs, DNS, TLS, GitHub runner, edge routing, database, or real webhook workload for causal attribution.

## Interpretation for failure prevention

1. The repaired published receiver passed active availability/binding sampling over both historical 59m and 88m boundaries; there was **no repeat of the paid supervisor's triple health-check failure**.
2. Nonetheless brief 4–5s response times are real and close enough to the 8s request timeout to warrant **warning-level latency observation and detailed telemetry**, particularly during real webhook delivery. They do **not** warrant falsely declaring the probe unhealthy.
3. The current supervisor's sequential four-stage check has **a separate 8s timeout per stage**, checks every 15s while suppressing overlapping cycles. Wall-clock stall duration could exceed 15s if several stages are slow; future failure-injection should exercise that interaction and verify three-strike reset/recovery policy.
4. The observer's continuous 15s polling might suppress Replit Autoscale idle/sleep behavior. Sparse or true idle-to-wake checks, Replit instance lifecycle logs and realistic non-provider synthetic ingest are required for a confidence-increasing causal test.
5. These results cannot guarantee 1,900/day credit throughput or 7-day experimental reliability. Maintain **Phase6 NO-GO** until separate verified load, persistence, reconciliation, and backend recovery gates pass.

## Reproducible local CSV verification

After downloading artifact `11617790710` as ZIP, without credentials or provider/database calls:
```python
import zipfile, csv, io, hashlib, collections
with zipfile.ZipFile("p2g24-observer-evidence.zip") as z:
    for name in ("checks.csv", "summary.json"):
        blob=z.read(name)
        print(name, len(blob), hashlib.sha256(blob).hexdigest())
    rows=list(csv.DictReader(io.StringIO(z.read("checks.csv").decode())))
    print("row_count",len(rows),"nonpass",sum(r["result"]!="PASS" for r in rows))
    for check in sorted(set(r["check"] for r in rows)):
        t=sorted(int(r["latency_ms"]) for r in rows if r["check"]==check)
        print(check,"count",len(t),"p50",t[len(t)//2],"p95",t[int(len(t)*.95)],"p99",t[int(len(t)*.99)],"max",t[-1])
```

## Scientific disposition

**Integrity:** Artifact CSV and summary extracted and content SHA-256 recorded.  
**Availability:** **PASS in tested active zero-credit mode.**  
**Cause of P2G24 original ~59m failure:** **unresolved**.  
**Authorization to collect paid provider events or lift Phase6 blockers:** **NO**.

Related: [incident timeline](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md) · [safety/readiness gates](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md).
