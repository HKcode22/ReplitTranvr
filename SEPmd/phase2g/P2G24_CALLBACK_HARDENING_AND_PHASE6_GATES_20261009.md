# P2G24 callback reliability hardening and Phase 6 readiness gates

**Status: OPEN / BLOCKING for another paid launch or full data collection.** Companions: [P2G24 incident evidence report](reports/2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md), [draft receiver hardening PR #26](https://github.com/HKcode22/ReplitTranvr/pull/26). Changes here are proposals and explicit acceptance criteria, **not assertions that Phase 6 is ready**.

## Why 130m no-credit PASS is necessary but insufficient

The [GitHub observer #37920862702](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702) passed 520 samples/2,600 check outcomes in 130m; no actual webhook payloads, object-store writes, database transactions, provider deliveries or final reconciliation occurred. In particular, HMAC database-binding only proves consistency of **configuration strings** between GitHub and Replit. The continuous 15s activity may also have suppressed idle Autoscale replacement. A different failure, unrelated to the repeated near-hour watchdog health issues, occurred in P2G22 after 121m.

Do **not** relax the 3-failure fail-closed kill threshold or change historic probe statuses to make an incomplete experiment appear valid. Do not assume paid success solely from green CI.

## Incident mechanisms: ranked but not established

| Hypothesis | Evidence for | Evidence against / missing | Discriminating test |
|---|---|---|---|
| Replit replacement/cold-start plus incorrect root readiness contract | P2G24 platform log excerpt near 04:58:21 UTC and HTTP connection-refused/500/404 root during startup; receiver formerly had no `GET /` | Autoscale instance reason unavailable; previous supervisor logged only boolean, so not certain this caused its failed subcheck | Replit platform replacement reason, startup/readiness timestamps, independent event-based health recorder under the *same* delivery load |
| Idle autoscale scaling/recycling | Dedicated receiver published `autoscale`; 130m continuous polling passes where paid run failed | Real provider delivers callbacks and changes load; active polling may keep it warm | Sparse-poll/idle-to-wake independent checks, warm-vs-idle A/B without paid subscription |
| `.replit.dev` development lifecycle | P2G23 59m transient and 88m terminal; Replit-local `nohup` observer stopped at ~10m while PID1 persisted | Does not directly explain P2G24 published Autoscale failure | Replit project process logs and signal reason; avoid dev shell for persistent monitoring |
| Secret/config/identity mismatch after reinitialization | Each health cycle checks exact SHA, HMAC secret and DB URL binding | First postrepair 130m authenticated binding checks all passed; no per-stage failures recorded during P2G24 | Per-stage failure codes on any *future* outage; compare deployment revision and sealed environment at startup |
| Database/UNLOGGED state loss | P2G24 session runtime empty on Oct 9 later audit; PG startup changed at audit | HMAC DB-binding does not query DB; PG start at 10:33 UTC *after* 04:58 failure; no time-causal link | Read-only Postgres lifecycle and telemetry during future zero-credit non-provider test; verify object bytes separately |
| Real webhook ingest workload, object-store or DB latency | Paid P2G24 fails while read-only authenticated observer passes | Endpoint requests are different; no payload-level fault telemetry from P2G24 stage | Disposable synthetic ingestion fixture with exact isolated credentials, payload integrity, same storage backend and rigorous cleanup |

## Mandatory safety layers to validate before Phase 6

1. **Ingress availability**: independently hosted monitor checks both platform readiness and all actual four supervisor checks. Log `check`, `reason`, HTTP status, elapsed milliseconds and three-strike state, never credentials/URL containing real webhook secret/response bodies.
2. **Idle and cold start**: test first-request delivery after idle period; platform replacement while testing; probe root `GET /` remains fast on cold start, and callback route returns correct auth failure without DB writes. Compare Autoscale vs Reserved VM *only after separately approving deployment/cost change*.
3. **Authentication and version**: exact build git head; secret and DB connection string HMAC bindings; deployment-mode/route owner invariants. Prevent hidden auto commits/config drift and false positive root-only acceptance.
4. **Durable ingestion**: provider-sized synthetic payload with unique disposable test session, signed/authenticated intentionally non-provider fixture; verify 2xx only **after** raw provider bytes persisted, SHA verified, storage confirmation, DB durable references, idempotency and exact acknowledged-delivery accounting. Confirm safe behavior on database/object storage failure. No production live-collection mutation by default; needs separate permission and test fixture design.
5. **Delivery reconciliation**: provider delivery attempts vs physical-flight-instance identity, replay, duplicate, late enrichment, tail chains; internal vs provider credits, 259/260 and 130/132 style gaps; never auto-promote DELIVERY_GAP/UNRESOLVED to MATCH.
6. **Runtime state integrity**: UNLOGGED table reset while active must fail closed; prove durable object metadata and source bytes survive independently, and run exact-session reconstruction only if verified. Different PostgreSQL postmaster start times alone do not determine incident cause.
7. **Process/owner resilience**: GitHub owner, independent watchdog, published receiver, database, provider all have explicit ownership; simulate transient 1–2 failures and fatal 3 failures; prove termination, exact-owned subscription deletion, settling/grace handling and no duplicate subscription. Never suppress watchdog in paid experiment.
8. **Scale and budget**: scientifically representative sustained load, callback sizes, event rates, time zones, airport/region variation, daily 1,900-ish credit budget accounting and hard floor; single active billable subscription ownership at a time; on any mismatch immediate fail-closed.
9. **Recovery and storage retention**: signed zero-credit/controlled operation evidence, no bulk deletes, failing-session exact ID quarantine; copy artifacts before 30-day expiry and raw objects before 168h expiry if permitted. Maintain provenance and hashes.
10. **Scientific validity**: future-time/airport/tail/region holdouts, no hidden sample deletion or post-hoc gate relaxation, frozen metric contract, exact duration and censoring, withheld evaluation data. Stage-1 success never alone implies Phase 6 validity.

## Staged non-paid test plan

### A. Offline behavioral fault injection (no real network)
- Execute the actual TypeScript `callbackHealthy` implementation extracted/transpiled under a mocked fetch. Assert not only boolean but **stage and reason** for 404 expected/wrong, 500/503, invalid SHA/mode, forbidden secret, HMAC config, timeout, network exception.
- Inject failure sequences and verify three-consecutive semantics and recovery reset. Existing string-assertion tests do not fully prove runtime semantics.
- Add route isolation cold starts and port retries. All real provider and DB keys absent in CI.
- **Pass:** every designed failure is detected and classified; no secret logged, no side effects.

### B. Published receiver idle and replacement observation (zero AeroDataBox calls)
- Create **separate** modes: continuous 15s checks, deliberately sparse idle check after documented no requests, and event-driven synthetic failure detection; use independent GitHub runner and persisted evidence.
- Avoid accidentally probing continuously during idle experiment. Compare different deployment revisions only if approved and document costs/scope.
- **Pass:** no missed failures across multiple idle-to-wake cycles at 59m and 88m; retain exact 5-stage diagnostic evidence. Can never prove all future possible restarts.

### C. Synthetic ingest durability (requires separate engineering and explicit approval)
- Isolated non-production test session and storage namespace, complete externally hosted signed callback, verify blob SHA, DB reference, idempotency, retries, lost response and exactly-once logical accounting.
- Simulated broken DB, object store, instance recycle while concurrent requests, and restore.
- **Pass:** nothing acknowledged without durable persistence, all replays converge correctly, no provider calls or historical scientific row contamination.
- **Do not run this on live scientific sessions without a separately reviewed fixture and cleanup safety design.**

### D. Full collection rehearsal and go/no-go
- Assemble Git SHA + artifact SHA + deployment identity + 130m observer + idle/replacement result + synthetic ingestion result + provider budget and original 12-anchor + compact-6 freeze + reconciliation metric version + study design signatures.
- Fresh read-only DB integrity check and account-owner validation; no paid live until explicit authority for exact date/time, credits, airport and trigger conditions.
- **Pass:** all material invariants proven. Missing evidence = **NO-GO**, not waived by prior unrelated successes.

## Replit and GitHub diagnostics required for original 59-minute cause

Request/export supported Replit deployment logs, Autoscale instance lifecycle/scale decisions, memory/CPU/OOM conditions, build/revision, deployment health-probe status and latency, container startup/shutdown reason around **2026-10-09 04:58:21–04:59:05 UTC**. Correlate with GitHub [P2G24 owner job](https://github.com/HKcode22/ReplitTranvr/actions/runs/37881617397). For P2G23 request Replit *development* workspace lifecycle/restarts around **2026-10-08 04:04:48 UTC** and **04:32:49–04:33:20 UTC**. Distinguish platform readiness route `/` from actual webhook success; do not leak the real callback secret in a report/support message.

Also preserve original Replit local observer evidence: started `2026-10-09T10:34:05.996Z`, ended abruptly after sample 40 `2026-10-09T10:43:59.102Z` (9.89m), no HTTP failures, PID 1394 gone; host PID1 started 08:29:24Z (no evidence of full workspace restart). Hypothesis: shell/background process policy. Cause unknown.

## Phase 6 hard blockers (NO-GO until closed with evidence)

- [ ] Confirm exact P2G24 root-cause chain or provide formally reviewed mitigation for unobservable platform replacement
- [ ] Prove idle-to-wake and restart behavior under representative conditions
- [ ] Prove actual webhook durable ingest and idempotency, not just health routes
- [ ] Prove P2G24 30 underlying object bytes/checksums or formally classify missing evidence; respect Oct 16 expiry
- [ ] Separately analyze P2G22 scientific exit code 1 after full duration
- [ ] Prove preserved reconciled physical-flight-instance identity and credit delivery math, including transient failures and restart
- [ ] Check daily provider budget/floor, fresh subscription isolation, and retention limits
- [ ] Verify data-collection plan freeze and implementation log align with runtime code and source revision
- [ ] Receive independent acceptance for any deliberate paid run
- [ ] Ensure evidence reviewed and available after run, without cleanup rewriting status

## Change control

Branch used for investigation: `phase2g-p2g24-github-observer-20261009`. Exact observer run was produced by commit `3f95098ed3e29713ce40fca113b7a8bd3707296b` (prior to documentation commits). Paid Stage-1 workflow and original published receiver remain unchanged by this document. Offline test changes are to be reviewed in isolation; merging callback-only `.replit` settings into the original full Travnr app is out of scope. No Replit Agent.


## External platform evidence (official Replit documentation; not incident-specific proof)

- Replit documents that **Autoscale** deployments add servers when busy and **scale to zero when idle**; it recommends **Reserved VM** for always-on API servers (fixed monthly cost). Source: https://docs.replit.com/features/publishing/deployment-types (consulted 2026-10-09). This gives a credible *class* of startup/idle hazards but does **not** establish that Autoscale initiated P2G24's specific 04:58 instance transition.
- Replit's Monitoring documentation covers HTTP status/latency, app uptime, CPU/RAM and deployment logs, reporting **30-day deployment-log retention** at the time of review. Source: https://docs.replit.com/features/publishing/monitoring-a-deployment (consulted 2026-10-09). Retrieve the deployment instance/startup window before retention expires; do **not** engage Replit Agent.
- Changing the dedicated receiver to Reserved VM may improve always-on behavior but changes hosting cost and operating assumptions. **No deployment-type change has been made or authorized.** It cannot by itself prove end-to-end webhook persistence or provider accounting.

## Verified executed regression additions (2026-10-09)

- [GitHub offline fault injection #37993249895](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993249895) completed **successfully**. Tests execute the extracted real `callbackHealthy` implementation under mocked fetch, assert stage/reason/HTTP status, and exercise the expected HMAC proof; also run existing receiver regressions and TypeScript checks. No provider API key, scientific DB URL or deployment credential was supplied to the offline CI job.
- Source test: `tests/phase2g_p2g24_callback_health_behavior_v39.test.cjs`. This is **health-decision unit behavior**, not a genuine paid owner/probe or actual provider callback delivery.
- [Raw-observation latency audit and hashes](reports/2026-10-09_P2G24_130M_OBSERVER_ARTIFACT_LATENCY_AUDIT.md) demonstrates 11/2,600 individual request latencies >1,000ms (max 5,166ms) even while 100% health contracts passed. [Machine-readable evidence manifest](reports/P2G24_ZERO_CREDIT_130M_OBSERVER_EVIDENCE_MANIFEST.json) records checksums, timings and per-stage percentiles; underlying raw artifact remains [run #37920862702](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702).
