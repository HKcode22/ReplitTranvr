# Replit platform incident request — P2G24 published callback instance transition

**For manual submission to Replit Support/Deployment diagnostics.** No Replit Agent used. Contains no API keys, webhook secrets, HMAC proofs, database URLs, or raw provider payloads.  
**Priority:** Callback receiver unexpectedly became unhealthy ~59 minutes into a prepaid scientific webhook window. Authenticated receiver now repaired, but cause of published instance transition remains unknown.

## App identifiers and non-secret context

- Dedicated callback app Replit project: `ReplitTranvr` (separate callback-only app); public URL: `https://replit-tranvr--hk84164.replit.app`.
- Publication deployment ID observed: `ce096a13-62ff-4f7a-ae6f-3bc91af601d9` (verify against deployment history if a prior deployment ID existed during failure).
- Replit Autoscale, Node.js backend port 5000 forwarded externally on 80; published `node dist/index.mjs`.
- Failure GitHub-paid-owner trace: https://github.com/HKcode22/ReplitTranvr/actions/runs/37881617397
- Owner started `2026-10-09T03:59:10.697Z`.
- GitHub owner callback failures `2026-10-09T04:58:26.622Z`, `04:58:41.629Z`, `04:58:56.637Z`, followed by `SIGTERM` from supervisor for `workspace_callback_unreachable_threshold`.
- Operator-provided Replit deployment log excerpt showed an instance starting at approximately `2026-10-09T04:58:21Z` just before failure; startup `GET /` checks encountered connection refusal, HTTP 500 and subsequently HTTP 404. These are reported observations, not independently retrieved platform event classification.
- Before fix the dedicated callback-only server did not register `GET /`; a new root endpoint returning HTTP 200 was added and manually republished. The published build now reports tested revision `5de44ba66d59c26d9e5ef3b339b7f729ca2f3653`, with root and runtime binding checks passing.
- Independent zero-credit GitHub observer https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702 completed 130m with 520 cycles, 2,600 checks, 0 failures, but continuous 15-second polling might keep Autoscale warm. It also found intermittent ~4–5s latency spikes without HTTP failure.
- An independent **sparse** no-credit receiver check was started to separate idle/wake effects: https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772 (result pending).

## Please investigate from Replit internal platform logs

1. **Exact cause** for new instance startup/replacement near **2026-10-09 04:58:21 UTC**: scale-to-zero and cold wake, routine instance rotation, healthcheck failure/restart, deployment rollout, memory/CPU/OOM, platform recycling, process exit, or internal runtime scheduler? Please provide the evidence and timestamps, not only general autoscale behavior.
2. Were new and old instances overlapping? Which instance or load-balancer target received the GitHub checks at 04:58:26/41/56? What were the load balancer health/readiness states?
3. What HTTP readiness/healthcheck path, expected status, initial delay, retry behavior and timeout were applied at that time? Did the missing root `GET /` 200 route cause failure to mark the new Node server ready?
4. Were there any Node listening-port failures, process crashes, signals, `ENOMEM`/OOM, exceeded resource limits, deploy/re-publish operations, or app-storage start issues preceding the event?
5. Does Autoscale routinely recycle/terminate a serving instance around a one-hour lifetime, regardless of request activity? What uptime guarantees apply to inbound webhook requests during replacement?
6. Can published Autoscale guarantee uninterrupted delivery of externally initiated callbacks? Would a **Reserved VM** reduce cold-start/instance-replacement risk for this use case, and what would pricing/resource tradeoffs be?
7. Which additional published monitoring logs, instance identifiers or support artifacts should be preserved now, and how can we export them without enabling Replit Agent or changing the running deployment?

## Related distinct issue

A previous run against the original full-app Replit **development** URL suffered first transient callback-health failure 2026-10-08 04:04:48 UTC, then three terminal failures ~04:32:49/04:33:04/04:33:19 UTC (owner https://github.com/HKcode22/ReplitTranvr/actions/runs/37720914245). This is not the same published Autoscale app. If available, inspect its development workspace lifecycle separately.

A local `nohup` monitor in the Replit development shell stopped after ~9.89m on 2026-10-09 (PID 1394 absent, no recorded network errors, host PID1 still running). This is also separate from the published receiver issue.

## Handling and impact

The paid YSSY session was terminated safely, subscription cleanup attempted; scientific result preserved **failed, censored, UNRESOLVED**. No data should be silently promoted to a valid 2h sample. There were 30 registered raw webhook blob references pending independent object integrity verification and earliest recorded retention expiry October 16.

**Please reply with instance/lifecycle evidence and a defensible recommended deployment class for two-hour time-bounded paid external webhooks.** A generic 'published' status is not enough to classify the failure. Please avoid publicly exposing webhook authentication tokens, raw provider content or database connection strings.

## Project forensics references

- [Incident report](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md)
- [Latency evidence and hashes](2026-10-09_P2G24_130M_OBSERVER_ARTIFACT_LATENCY_AUDIT.md)
- [Phase6 blockers](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md)
- [Blocking GitHub issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28)

Platform documentation: https://docs.replit.com/features/publishing/deployment-types and https://docs.replit.com/features/publishing/monitoring-a-deployment (accessed 2026-10-09).
