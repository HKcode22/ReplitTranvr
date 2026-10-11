# P2G24 sparse / idle-to-wake 146-minute observer — primary artifact audit

**Primary source:** GitHub Actions [run #37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772), job `114034360285`, completed **SUCCESS** on 2026-10-09. Artifact `11651273770`, `phase2g-p2g24-sparse-observer-evidence`, contains `requests.csv` and `summary.json` (configured 30-day artifact retention).

**Scientific disposition:** **PASS for all six *sampled* published health/binding checkpoints; NOT an end-to-end paid webhook, continuous uptime, provider delivery or Phase6 readiness PASS.** No AeroDataBox account/API calls; no scientific SQL queries or DB mutations.

## Raw evidence integrity

| File | Bytes | SHA-256 |
|---|---:|---|
| Downloaded ZIP `p2g24_sparse_146m_evidence.zip` | 1,117 | `25e713f9ad861a45e8b4e6ca380ee9548d731d55333bbe7a1ea0e4a567405d4b` |
| `requests.csv` | 2,705 | `c72ac2e3d036dc53f0130dda4afe521508c4014bb54c8d8c7d4c6fbdd84ca9e8` |
| `summary.json` | 532 | `dce6e450e92eab8f777cde6cf47c934d3faa548da4654265487c356920ba5d0a` |

Parsed CSV has **30 requests**, 5 distinct expected checks at each of **6** scheduled minutes (+0, +29, +59, +88, +117, +146); exactly **30 PASS, zero FAIL**, all matching expected HTTP 200 or deliberately wrong-secret 404. Summary states `PASS_SPARSE_146_MIN` and duration **146.063 minutes**.

Started `2026-10-09T21:29:34.951Z`; finished `2026-10-09T23:55:38.749Z`.

## Checkpoint diagnostics

| Scheduled minute | Root GET `/` ms (200) | Wrong-secret POST ms (expected 404) | Runtime identity ms (200) | Secret binding ms (200) | DB-string binding ms (200) | All checks |
|---:|---:|---:|---:|---:|---:|---|
| 0 | **5,391** | 241 | 147 | 71 | 75 | PASS |
| 29 | 240 | 182 | 122 | 155 | 79 | PASS |
| 59 | 264 | **2,340** | 103 | 140 | 68 | PASS |
| 88 | 238 | 251 | 146 | 149 | 78 | PASS |
| 117 | 280 | 235 | 83 | 112 | 162 | PASS |
| 146 | **3,254** | 220 | 81 | 71 | 72 | PASS |

Detailed start/end UTC timestamps are present for each request in the CSV; these are **individual network check latencies**, not actual provider signed-webhook response times. All requests had an **8,000ms** per-request timeout. Three checks exceeded 1,000ms (root at 0 and 146; wrong-secret at 59), but were successful. They could reflect backend startup, routing, edge or network jitter; no instance identifiers are available, so attributing them to an Autoscale cold start or a ~59m platform timer is speculative.

## Comparison with continuous observer

| Property | Continuous run [#37920862702](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702) | Sparse run [#37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772) |
|---|---|---|
| Test duration | 130m | 146.063m |
| Cycle timing | every ~15s, 520 cycles | six checkpoints 29–30m apart |
| Checks | 2,600 | 30 |
| Failed health contracts | 0 | 0 |
| Longest request | 5,166ms | 5,391ms |
| Provider live calls / scientific SQL | none / none | none / none |
| Primary limitation | frequent checks may suppress Autoscale idle | failures **between** widely separated checkpoints go undetected; unrelated Replit traffic may still prevent true idle |

**Important caution:** The successful sparse observation is not proof of 146-minute uninterrupted availability, and two successful observations are not equivalent to testing a real receiving/writing endpoint under the paid experiment's workload.

## Revised hypotheses and risk

1. **Missing readiness route / published replacement:** original P2G24 receiver lacked root `GET /`. This was fixed; the source shows the four supervisor checks themselves were already in place before the fix. Thus successful current health does not prove a specific original failing supervisor stage. Published instance replacement/startup reason at `2026-10-09T04:58:21Z` remains **unknown** without Replit platform logs.
2. **Replit intermittent latency / jitter:** multiple several-second requests appear in both independent experiments. Their causes are unmeasured; worth instrumenting per-stage and request-level latency, especially provider's stricter callback response budget. **No 8s timeouts observed.**
3. **Development-workspace environment:** earlier `.replit.dev` P2G23 and local `nohup` observer faced different lifecycle guarantees from published Autoscale. Do not conflate them.
4. **Actual signed ingestion:** neither monitor tested correct-secret prepaid route with a valid disposable session, object-store persistence, DB transaction completion, 2xx-after-durable semantics, retry/replay, or post-crash UNLOGGED integrity.
5. **Provider 260/259 external/internal reconciliation (P2G22):** a separate verified issue, not fixed by a root route or successful HTTP health checks.

## Next actions (no paid authorization)

- [x] Preserve entire sparse observer CSV and summary checksums in this report; primary ZIP retained in GitHub Action artifact.
- [x] Confirm P2G24 30/30 underlying referenced raw provider blob bytes and hashes (see [operator read-only audit](2026-10-09_P2G22_P2G24_OPERATOR_READONLY_AUDIT.md)).
- [ ] Obtain Replit deployment lifecycle/replacement and root health-check logs for **04:58:15–04:59:10 UTC October 9**.
- [ ] Design and run mocked end-to-end prepaid handler success/duplicate, injected DB/object-store failure, lost acknowledgment, and replay tests with a **disposable fake session and fake store**; do not call production route or real provider.
- [ ] Independently establish actual published `dist/index.mjs` release digest; `/__v39/workspace-runtime` SHA is a configured claim.
- [ ] Review externally billed 260 vs internally received 259 P2G22 against provider attempt logs and persisted receipts, preserving zero-tolerance policy.
- [ ] Only after tests and authorization, run a **controlled nonprovider synthetic real-ingest** experiment against an isolated test namespace to validate network/DB/storage integration, and prove deletion/retention scope. No production scientific row mutation during offline CI.
- [ ] Preserve Phase6 NO-GO until all critical delivery/settlement/availability/ownership gates pass.

Related: [incident report](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md), [Phase6 criteria](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md), [GitHub issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).
