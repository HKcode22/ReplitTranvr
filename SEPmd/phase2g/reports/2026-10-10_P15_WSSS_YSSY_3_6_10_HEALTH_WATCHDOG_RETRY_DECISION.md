# Phase 2G P15 — WSSS/YSSY health-watchdog tolerance 3 vs 6 vs 10; science-protecting alternative

**2026-10-10. TEST/REVIEW ONLY. NO provider calls/credits, no live owner edit, no Replit publish, no scientific database operation, no cloud provisioning. Current paid YSSY Stage 1 NO-GO.**

## One essential distinction

- The **existing owner callback HEALTH supervisor** in `scripts/v39_phase2g_stage1_logged_supervisor_v39.ts` invokes four sequential authenticated health checks, polls every `CALLBACK_POLL_MS=15_000`, resets `callbackFailureCount=0` upon a healthy check, and triggers `workspace_callback_unreachable_threshold` SIGTERM at **3 consecutive failures**. Checks have independent 8-second request timeouts, so 3, 6 or 10 samples do **not** correspond to guaranteed exact 45/90/150 seconds of real downtime. The script does **not** prove that arbitrary-flight webhook POSTs were delivered merely because it got a healthy result.
- The **AeroDataBox subscription delivery retry** policy is a DISTINCT provider contract, currently frozen `maxDeliveryRetries=0`. Increasing that number can change billable provider attempts, replay/dedupe and the frozen scientific protocol. **NOT proposed** here.
- Increasing health tolerance alone does not improve actual webhook availability or prevent scale-to-zero, interrupted work or PostgreSQL UNLOGGED state loss. It simply defers termination and could let **more payable exposure** accumulate during missing-data intervals.

## Evidence that the idea is worth examining

- Historic successful WSSS v2 [paid owner #36413290291](https://github.com/HKcode22/ReplitTranvr/actions/runs/36413290291), previously audited in [cross-airport health comparison](2026-10-09_P2G24_CROSS_AIRPORT_SCIENTIFIC_HEALTH_COMPARISON.md): callback checks failed at **2026-09-28 11:29:10 and 11:29:25 UTC**, then recovered. The **three-consecutive-failure** limit did not fire; WSSS had independently adjudicated accepted 120-minute scientific/accounting outcome. **This does not prove it would have survived three/four/five consecutive callback outages or a webhook outage.**
- Historic failed YSSY P2G24 [owner #37881617397](https://github.com/HKcode22/ReplitTranvr/actions/runs/37881617397): published callback-health failures **2026-10-09 04:58:26/41/56 UTC**, supervisor SIGTERM, 120-minute exposure censored and accounting unresolved. Root Autoscale/replacement trigger remains pending Replit support ticket `#564568`. A longer limit *might have allowed a future healthy check* but this was not observed; **we cannot retroactively assume recovery**, missing webhook absence or experiment validity.
- Replit [deployment types documentation](https://docs.replit.com/features/publishing/deployment-types) confirms Autoscale can reduce instance count to zero when idle; Reserved VM is always running and has fixed monthly cost. Reserved VM can reduce sleep exposure, but does not guarantee exact source/credit reconciliation or post-crash flight reconstruction. No deployment changes approved.

## Proposed SCIENTIFICALLY CONDITIONAL experimental policy, not a live config change

| Event | Current 3-strike contract | Offline 6/10 candidate | Scientific disposition |
|---|---|---|---|
| One or two transient timeouts, then health restored | Continue, reset failure counter | Same | Never certify science based only on GET/health |
| Three transient failures; independent source/durable edge proof **unavailable** | Stop + exact cleanup/settlement | STOP AT THREE even if candidate is 6 or 10 | Preserve censor/unknown attempts |
| Three to five transient health failures; **independently proven durable original bytes, source timestamps, owner and billable-attempt correspondence** | Stops at 3 | **Conditional** `DEGRADED_BUT_DURABLE` until at most check 6; 10 as sensitivity analysis | No scientific PASS until complete original 120m source/window/every item verified |
| Six to nine transient failures, all independent durable evidence continuously verified | Stops at 3 | 6 stops at sixth; 10 can temporarily remain degraded | 10 not preferred without measured benefit and extra risk approval |
| Wrong webhook secret/build/owner, database lifecycle integrity failure | Existing stop at 3 health observations | **Stop immediately** on independently established hard-contract mismatch | Fail closed; distinguish configuration from transient transport |
| Provider-emulator 260 sender vs 259 edge/internal, TTL/backlog expiry, first-edge UTC or raw SHA mismatch | Current 3-strike monitoring cannot by itself detect all | **Stop/censor**, regardless of "green" health response or higher threshold | No inferred missing delivery, no repaired clock |
| Health recovers but upstream source-attempt identities remain unproven | Health counter reset | Monitoring recovery ≠ scientific completion | Must reconcile or censor |
| Subscription provider delivery retries | 0, frozen | **Remain 0** | New bounded and prospective independent science/budget amendment required to change |

**Candidate limits are comparison parameters only.** No separate process currently provides trusted, real-time independent AeroDataBox sender-attempt records and fully durable exact first-edge/source evidence, so the `DEGRADED_BUT_DURABLE` predicate is **NOT currently implementable or payable-live-authorizable** with evidence in this repo.

## Added isolated safeguards

- `experiments/phase2g_rehearsal/synthetic_watchdog_tolerance_gate_v39.ts`: test-only `3|6|10` policy evaluator with strictly fixed 15s poll, 3-current-policy baseline and 0-provider-retry invariant; matches independently declared upstream attempt/credit totals to durable edge, authenticated owner/unique lease, full original raw bytes/168h retention/first UTC, physical-v2 items/eight bucket reconstructibility, backed-up UNLOGGED science and nonexpired bounded backlog. Known attempt mismatch or hard integrity failure vetoes *any* tolerance. Never returns live authorization, scientific PASS or provider retries.
- `tests/phase2g_synthetic_watchdog_tolerance_gate_v39.test.ts`: 16 scenarios for historical 2-failure WSSS pattern, historical triple YSSY failure, 6/10 eventual recovery and upper bound, 260 vs 259, a green health response with lost source, changed owner/build/secret/DB, missing 168h retention, unsafe UNLOGGED/physical items, long Queue backlog and invalid provider-retry config.
- `tests/phase2g_signed_attempt_watchdog_corroboration_v39.test.ts`: 3 further scenarios using a separately HMAC-signed synthetic provider-emulator sender ledger and edge signed receipts. **Even perfectly matched signed synthetic attempts do not permit six-strike grace unless durable 168h original raw storage is separately attested**. Conversely, a deliberately missing edge attempt stops immediately. Simulating attested raw durability allows conditional degraded monitoring but still refuses production authorization.
- **Critical testing limit:** all independent safety predicates and 168h storage evidence are synthetic fixtures; some are input Booleans rather than verifier-obtained production proofs. These tests measure **decision logic**, not actual source integrity, provider identity, two-hour live uptime, distributed queue receipt, Cloudflare quota/cost, signed production owner trust or implementation of a new owner mode.

## P01–P20 remaining workload: progress vs paid-launch closure

The [original twenty-gate inventory](2026-10-10_YSSY_REMAINING_GATES_AND_120MIN_ZERO_CREDIT_REHEARSAL.md) has not been superseded; do not mark an entire gate PASS just because its isolated regression is green.

| Group | IDs | Evidence already advanced | Still required to close |
|---|---|---|---|
| Historical forensics and provider accounting | P01, P02, P14 | P2G22 260/259 preserved; signed synthetic attempt identity comparisons; failure timing & 30 raw refs identified | Quinn platform evidence; exact read-only object bytes/SHA before Oct 16 expiry; real independent provider attempt/billing accounting |
| Real HTTP, performance and metadata | P03–P08 | Actual V3.9 Express route and physical-v2 PostgreSQL fixtures; source SHA and latency/lock fault injections | Published byte-to-ACK equivalent load P99, owner/live DB/storage proof, non-leaking live telemetry and signed bundle identity |
| Durable first receipt and failover backup | P09–P12 | Signed synthetic wire-vs-canonical SHA, temporary Queue fake, edge-first UTC race fix, LOGGED metadata test | Cross-instance full-wire durable-before-2xx ingress, independent first UTC, live queue replay/timeout/DLQ, 168h raw object retention, credit-safe dual-store ordering, $0 incremental cloud feasibility |
| Reconstruction and owner safety | P13, P15–P17 | Synthetic owner signature and two-stage bind, LOGGED uniqueness, actual UNLOGGED crash, per-item physical-v2 lost-row censor, **3/6/10 watchdog model** | Genuine full per-item recovery without false PASS; complete owner takeover/cleanup/lease, exact credit and 8x15m clock continuity; proposed degraded mode audited prospectively |
| Final authorization and real rehearsal | P18–P20 | Detailed runbooks, draft gated proposals and accelerated declared 120-minute model | Reviewed/merged/deployed source matches, new prospectively approved YSSY retry amendment and AUTH, real isolated **wall-clock 120m** POST + R1–R11 hosted no-provider rehearsal and explicit final human GO |

**How much remains?** All 20 P01–P20 remain **open at least in their live/release exit conditions**, despite considerable partial test progress. This is **not 20 untouched items**. The smallest critical path still spans: prove durable backup that maintains original 120m scientific truth; independently reconcile actual provider costs/attempts; validate published-equivalent POSTs and Replit lifecycle; complete a live-equivalent but isolated 120-minute no-provider R0/R1–R11 rehearsal; approve/verify a fresh bounded scientific retry. These steps cannot be reduced to a numeric readiness percentage or assumed completion date.

## Review disposition

**Recommendation:** Do **not** change `CALLBACK_CONSECUTIVE_FAILURE_LIMIT=3` in the paid supervisor today. Study **6 conditional checks** first, **10 for stress sensitivity only**, and do not enable either in paid execution without independent durable signed-source continuity, bounded queue/backlog, owner/subscription safety, zero missing original provider attempts, exact scientific 120-minute/15-minute-bucket identity, an explicit amendment and final approval. Original provider delivery retries stay **0**.

WSSS's two recoverable health failures show the current three-strike policy can already avoid an unnecessary stop for brief transients. YSSY's three failures do not prove a fourth would have passed; allowing it without evidence risks replacing an honest censored probe with an apparently successful but incomplete one. Do not uncritically equate conservative detection with engineering availability, and do not require zero transient health errors when every independent science condition can be proven.

Draft PR #27 remains unmerged and not deployed. Sunday Oct 11, 8–10 PM PDT YSSY remains **paid NO-GO** as of this investigation.
