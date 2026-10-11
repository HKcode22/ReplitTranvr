# P2G24 forensic breakthrough — Replit Autoscale process lifecycle correlated with sparse GitHub observer

**Evidence recorded:** 2026-10-09. **Source 1:** operator-pasted Replit Cloud **published deployment logs** (100 discrete chronological records; visible 2026-10-09 11:04–17:18 in the platform display). **Source 2:** GitHub [146m sparse observer #37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772) downloaded `requests.csv` / `summary.json`, artifact **11651273770**, hashes in [sparse artifact audit](2026-10-09_P2G24_SPARSE_146M_OBSERVER_ARTIFACT_AUDIT.md). **Status:** Directly verified lifecycle/latency correlation at two samples; external platform cause of instance shutdown and original failed P2G24 at 04:58 UTC remains unknown.

## Executive diagnostic

The published Autoscale callback application **was terminated and subsequently relaunched several times**. Its Replit platform log emits `system: received signal terminated` and a `command finished ... signal: terminated` followed by a later `starting up user application`, startup `healthcheck /` 500/connection refused, and then application `V39_CALLBACK_ONLY_SERVER_LISTENING`. This is *compatible* with Autoscale scale-down/wake, but a SIGTERM without a platform-reason code does **not** prove idle scale-down rather than a rollout, platform resource policy, or other termination. Node's termination reported as a command error is not proof of a JavaScript exception/OOM; no unhandled Node exception or OOM appears in this excerpt.

The independent GitHub observer's **first and last slow root requests coincide to within 1–2 seconds with these Replit platform startup events when Replit displayed timestamps are interpreted as Pacific daylight time (UTC−07)**. This is stronger evidence that at least those two multi-second latencies reflect **cold-start/wake/replacement** behavior rather than a consistently slow warm application. It is not a reproducible actual paid callback under cold start, and does not certify availability between sparse checks.

## Important time zone discovery

- GitHub `requests.csv` stores UTC timestamps ending in `Z`.
- Operator's Replit log UI shows times without a time-zone suffix (e.g. `2026-10-09 14:29:36.89`). Its two startup times align precisely with sparse-GitHub event times **only after interpreting the Replit display as `America/Los_Angeles` local time (PDT, UTC−07 on October 9)**. This cross-source match is strong support for display-time-zone inference; inspect the Replit log UI time-zone selector/format to verify explicitly.
- The **original paid P2G24 failure** at `2026-10-09 04:58:21–04:59:05 UTC` corresponds to **Thursday October 8, 2026, 9:58:21–9:59:05 PM PDT**, not Friday October 9 morning in the Replit local-display view. The log excerpt provided here begins Friday October 9 **11:04 AM PDT**, hence **it omits the original failure window**. Filter **Oct 8, 9:57–10:01 PM PDT** or direct UTC `2026-10-09 04:57–05:01` as appropriate. This is the highest-priority incident log to obtain.

## Exact cross-source correlation of slow health checks

| Source event | UTC timestamp | Replit displayed PDT time | Relation |
|---|---|---|---|
| Sparse +0 root request begins | 2026-10-09 **21:29:34.960Z** | **14:29:34.960** | request issued |
| Replit `starting up user application` | inferred 2026-10-09 **21:29:36.890Z** | **14:29:36.890** | 1.930s after root starts |
| Replit `V39_CALLBACK_ONLY_SERVER_LISTENING` | inferred **21:29:38.790Z** | **14:29:38.790** | 3.830s after request starts |
| Sparse +0 root response | inferred from CSV **21:29:40.351Z** | **14:29:40.351** | **5391 ms**, HTTP 200 PASS |
| Sparse +146 root request begins | **23:55:35.051Z** | **16:55:35.051** | request issued |
| Replit `starting up user application` | inferred **23:55:35.850Z** | **16:55:35.850** | 0.799s after request starts |
| Replit `V39_CALLBACK_ONLY_SERVER_LISTENING` | inferred **23:55:37.240Z** | **16:55:37.240** | 2.189s after request starts |
| Sparse +146 root response | inferred from CSV **23:55:38.305Z** | **16:55:38.305** | **3254 ms**, HTTP 200 PASS |

At each of +0 and +146, the first root request appears to arrive while the platform is spinning up the application; the request completes after the listener starts. This strongly ties the **root request latency** to lifecycle startup in two separate samples.

## Process-lifecycle and platform health-check evidence from supplied excerpt

Five distinct `system: received signal terminated` lines in the Replit display:
- `2026-10-09 12:13:28.11`
- `2026-10-09 14:44:48.14`
- `2026-10-09 16:12:38.16`
- `2026-10-09 16:45:18.18`
- `2026-10-09 17:18:48.19`

Four explicit `starting up user application` in excerpt (plus first observed `SERVER_LISTENING` at 11:04:58.87 with preceding startup log truncated):
- `14:29:36.89` → listener **14:29:38.79** → next SIGTERM **14:44:48.14** (~15.16 minutes of observed listener life)
- `14:45:43.84` → listener **14:45:44.52** → next SIGTERM **16:12:38.16** (~86.89 minutes)
- `16:22:51.77` → listener **16:22:53.43** → next SIGTERM **16:45:18.18** (~22.41 minutes)
- `16:55:35.85` → listener **16:55:37.24** → next SIGTERM **17:18:48.19** (~23.18 minutes)
- An earlier listener **11:04:58.87** → SIGTERM **12:13:28.11** (~68.49 minutes) also appears.

The supplied excerpt contains **41** total startup health-check failures (`healthcheck /` status 500 or connection refused), occurring before the logged `SERVER_LISTENING` for each startup; it does **not** prove persistent 500 responses after successful startup. Their close intervals are platform-generated health probes, not necessarily GitHub monitor results. The `no artifact manifests found` / `falling back to deployment run command in .replit` entries are informational when the configured `node dist/index.mjs` follows and successfully starts; they do not, alone, establish a build failure.

**Caution on gaps:** A period between `SIGTERM` and next `starting up user application` is **not automatically continuous downtime**: a scale-to-zero service may have no app process while idle and still accept a subsequent request by starting a new one. Conversely, a request arriving during startup can consume several seconds of an external provider's response timeout. Only request-level evidence can tell whether a paid webhook was dropped or timed out.

## Interpretation and new test design requirement

- Replit documents **Autoscale** can scale down to **zero** when idle and **Reserved VM** runs an always-on dedicated instance. [Official Replit docs](https://docs.replit.com/features/publishing/deployment-types). Without platform internal reason codes, label the observed SIGTERMs **termination/restart cycles compatible with Autoscale** rather than definitively “idle scale-down.”
- At +0 a **5391ms** cold-start-like HTTP GET consumed about **54% of the upstream 10s webhook response envelope**, leaving little tolerance for real PostgreSQL transactions/object-store upload when valid provider content is involved; the GET route itself does not perform those operations. The separate webhook's actual end-to-end response time remains **untested**. **Do not infer P2G22's different .replit.dev 260/259 gap was due to published Autoscale.**
- The paid owner watchdog checks the four health contracts sequentially, each with an 8s limit every 15s, and kills the owner on three consecutive unhealthy cycles. The repaired receiver's root 200 endpoint fixes a *platform-readiness contract* but doesn't alter this threshold; a new cold start may still affect the owner if network binding/edge behavior fails.
- Sparse sampling **proved recovery to health at sample times** but not continuous uptime, absence of dropped paid webhooks, or that every instance transition was due to idle scaling. Avoid adding more simultaneous keepalive monitors that alter autoscaling behavior during controlled tests.
- **Don't change deployment type automatically.** Evaluate paid-plan/budget implications, then (only if explicitly authorized) compare Reserved VM or redundant durable ingress, using fake signed provider-sized payloads under controlled restarts. An always-on VM removes idle scale-to-zero but does not guarantee no crash/redeploy or persistence/reconciliation integrity.
- Preserve published deployment log screenshots/exports for the **original Oct 8 21:58 PDT failure** before retention expiration, and ask Replit Support for instance termination and readiness reason codes, load-balancer routing, whether HTTP requests are buffered during cold start, and guarantees for callback requests on Autoscale.

## Phase6 scientific status

**NO-GO.** A real paid YSSY probe may only be approved after the exact original incident is investigated or robustly mitigated, real signed webhook ingress/ack/durable storage is tested under cold start and forced restart with disposable isolated data, and the independent P2G22 260/259 credit gap remains fail-closed and causally examined.

Cross-references: [P2G24 primary incident report](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md), [sparse 146m artifact audit](2026-10-09_P2G24_SPARSE_146M_OBSERVER_ARTIFACT_AUDIT.md), [zero-provider restart/ingress protocol](2026-10-09_P2G24_NEXT_SYNTHETIC_INGRESS_FAULT_PROTOCOL.md), [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28).
