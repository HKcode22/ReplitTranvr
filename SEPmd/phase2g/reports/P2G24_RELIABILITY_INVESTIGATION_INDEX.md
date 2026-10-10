# P2G24/YSSY — incident investigation workspace and evidence register

**All times UTC unless specified.** This is an *isolated, unmerged* research branch; **not authorization to run paid AeroDataBox Stage-1, change live deployment, or begin Phase 6.** All current experimental gate recommendations are conservative: NO-GO until outstanding cause and durability evidence is resolved.

## What we proved

- The published callback receiver had a missing `GET /` 200 readiness route, repaired in [draft PR #26](https://github.com/HKcode22/ReplitTranvr/pull/26).
- Failed YSSY P2G24: GitHub supervisor stopped after 3 consecutive callback failures at 04:58:26/41/56 UTC; historical stage reason was not recorded. Real 2h endpoint scientific duration was not achieved.
- Independent **continuous** Github origin observer [#37920862702](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702) passed 130m, 520 cycles, 2,600 checks, zero failures. Some 4–5s latency spikes occurred.
- Offline **behavioral fault injection** [#37993249895](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993249895) passed 18 actual function test assertions, receiver regressions and TypeScript.
- Earlier WSSS, OMAA, MMUN, SKBO GitHub owner runs have successful two-hour owner outcomes. At comparable near-hour scientific-health checkpoints, P2G24 YSSY had 132 items, SKBO 130 and WSSS 158; no evidence of uniquely excessive YSSY cumulative item volume. WSSS itself recovered from two transient callback-health failures in a successful run.
- P2G22 YSSY is a **separate** scientific child-exit failure after ~121m, not the same callback-watchdog failure as P2G23/24.
- Operator read-only database audit: P2G24 remains `failed`, `duration_censored=true`, `reconciliation_status=UNRESOLVED`; UNLOGGED session runtime 0; 30 durable webhook-blob refs not marked deleted. No underlying blob byte/hash verification yet.

## Read documents (recommended order)

1. [P2G22–24 incident timeline and conclusions](2026-10-09_P2G24_CALLBACK_INCIDENT_AND_130M_OBSERVATION.md).
2. [2,600-check artifact audit, latency outliers and SHA-256s](2026-10-09_P2G24_130M_OBSERVER_ARTIFACT_LATENCY_AUDIT.md).
3. [Machine-readable evidence checksum manifest](P2G24_ZERO_CREDIT_130M_OBSERVER_EVIDENCE_MANIFEST.json).
4. [Cross-airport scientific-health load/status comparison](2026-10-09_P2G24_CROSS_AIRPORT_SCIENTIFIC_HEALTH_COMPARISON.md).
5. [P2G22 distinct 260/259 delivery-gap failure and existing regression coverage](2026-10-09_P2G22_DELIVERY_GAP_ROOT_CAUSE_CLASS.md).
6. [Phase 6 reliability gates and unresolved hypotheses](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md).
7. [Replit platform incident/support request (sanitized)](2026-10-09_P2G24_REPLIT_PLATFORM_INCIDENT_REQUEST.md).

## Controlled tests

| Test | GitHub workflow | Status |
|---|---|---|
| 130m **continuous** authenticated health/binding, zero provider requests | [run #37920862702](https://github.com/HKcode22/ReplitTranvr/actions/runs/37920862702) | **PASS**; raw CSV/JSON as downloadable artifact ID `11617790710` |
| Offline actual `callbackHealthy` behavior in mocked network and 18 assertions | [run #37993249895](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993249895) | **PASS** |
| 146m **sparse** external health/binding at +0/+29/+59/+88/+117/+146m, no provider calls | [run #37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772) | **IN PROGRESS** when index written; inspect run for later status |

A pass for continuous/sparse HTTP tests does **not** prove actual paid webhook ingress, object-store/DB durable persistence, delivery retries, reconciliation, unique physical-flight-instance validation, provider budget, or original instance replacement cause.

## Live blockers and change control

- [GitHub issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28) tracks the Replit 04:58 UTC instance replacement cause, secure platform logs, safe startup, object-blob verification deadline and Phase 6 prerequisites.
- [Draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27) holds only investigation reports/tests/workflows on isolated branch. [Draft PR #26](https://github.com/HKcode22/ReplitTranvr/pull/26) contains receiver repair. **Neither PR merged**, and `main` / original full Travnr app are unchanged by this investigation.
- Existing paid YSSY P2G24 raw object refs begin expiring **2026-10-16 04:02 UTC**. Verify bytes before that (with separately reviewed read-only exact-session method); do not run cleanup or relabel probe.
- Obtain Replit internal Autoscale instance lifecycle and readiness/port logs; past GitHub boolean-only watchdog checks cannot reveal exact failing stage after the fact.
- Required next true end-to-end proof: approved disposable signed synthetic webhook (NO AeroDataBox), verify 2xx only after persistent object and DB reference, failure/retry/idempotency semantics; **needs separate fixture design and authorization**.

This register is evidence-based, versioned and intentionally records remaining uncertainty. It should be updated with exact GitHub run evidence and Replit platform incident response, rather than assumed success.


## Read-only raw object verification: prepared, NOT executed

- Source: [`scripts/v39_p2g24_readonly_blob_integrity_audit.ts`](../../../scripts/v39_p2g24_readonly_blob_integrity_audit.ts) (resolve from repository root if relative navigation differs).
- **Run #37994341372** of the [offline test workflow](https://github.com/HKcode22/ReplitTranvr/actions/runs/37994341372) passed compilation of this auditor, 18 callback-health assertions, pre-existing receiver regressions and typecheck. It **did not** execute the auditor or read live production objects.
- Script is scoped to probe 18 / P2G24 exact UUID, requires durable failed/censored/UNRESOLVED record and exactly 30 undeleted refs; reads DB under `BEGIN TRANSACTION READ ONLY`; downloads raw object bytes only with explicit `--verify-objects`; compares SHA-256 and size but never prints provider content, object names or secrets. It does not delete or write DB state.
- Actual live object integrity remains **unverified** until this is run in an appropriately authorized environment, before the earliest object expiry on October 16 UTC.
- Preserved cross-airport scientific-health snapshot ZIPs and active 130-minute observer ZIP in a separate locally generated `P2G24_GitHub_Evidence_Backup_20261009.zip`. The GitHub Actions originals remain accessible in their cited run artifacts until retention expiry.


## 2026-10-09 final sparse observation + next offline persistence tests

- [Primary 146-minute sparse CSV/summary audit](2026-10-09_P2G24_SPARSE_146M_OBSERVER_ARTIFACT_AUDIT.md): GitHub [run #37993757772](https://github.com/HKcode22/ReplitTranvr/actions/runs/37993757772) **PASS**, 6 checkpoints (+0,+29,+59,+88,+117,+146), exactly **30/30 expected health/binding checks PASS**. Raw ZIP artifact `11651273770`, CSV/JSON SHA-256s and exact per-stage latencies recorded. Root latency **5391ms** at +0 and **3254ms** at +146; wrong-secret **2340ms** at +59. **No evidence of a real signed provider webhook, actual cold start, or uninterrupted availability between sparse probes**; root health cannot prove SQL uptime.
- [Offline prepaid persistence fault-injection suite](https://github.com/HKcode22/ReplitTranvr/blob/phase2g-p2g24-github-observer-20261009/tests/phase2g_p2g24_prepaid_persistence_fault_injection_v39.test.ts) added to execute the **actual** `persistPrepaidProbeWebhookV39` function against mocked DB and storage; cases cover durable-before-2xx ordering, duplicate retry idempotency, failed upload, corruption before acknowledgement, and database INSERT after object write failure. Empty-flight fixture intentionally excludes physical-flight ID materialization; independent scientific identity tests remain required. CI [run #38009253110](https://github.com/HKcode22/ReplitTranvr/actions/runs/38009253110) **COMPLETED SUCCESS**, including these five tests, previous callback-health tests, receiver regressions, a no-execution blob-auditor compile and server typecheck.


## 2026-10-09 Replit published Autoscale startup evidence / timestamp interpretation

[Replit platform lifecycle and sparse GitHub correlation](2026-10-09_P2G24_REPLIT_LIFECYCLE_COLD_START_GITHUB_CORRELATION.md) is now the primary evidence for published process termination/start behavior. Operator's platform log excerpt shows **five termination signals**, several subsequent starts and **41 healthcheck-`/` failures before app listening**; two root requests in sparse monitor exactly coincide with new app startup (+0 root 5391ms, +146 root 3254ms). These are **sampled cold-start/wake/replacement associations**, not confirmed process-kill reason or dropped real provider notifications.

**Original incident log range search correction**: GitHub historical owner timestamps `2026-10-09T04:58:21–05:00:00Z` correspond to **Thursday October 8, 2026 about 9:58–10:00 PM PDT** in Replit Cloud's apparent Pacific-display logs. The separate Oct 9 11:04–17:18 PDT pasted platform log does **not** show original P2G24 watchdog failure. Preserve/export the correct incident log window before retention expiry.

These newly added findings do not change failed/censored/UNRESOLVED historical probes or lift Phase6 NO-GO. Runtime can be healthy at monitoring checkpoints and still undergo process recycling; Reserved VM and durable independent ingress are candidate mitigations requiring review, not changes made.
