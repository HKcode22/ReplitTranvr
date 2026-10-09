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
5. [Phase 6 reliability gates and unresolved hypotheses](../P2G24_CALLBACK_HARDENING_AND_PHASE6_GATES_20261009.md).
6. [Replit platform incident/support request (sanitized)](2026-10-09_P2G24_REPLIT_PLATFORM_INCIDENT_REQUEST.md).

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
