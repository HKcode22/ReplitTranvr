# Phase 2G Prospective Scientific-Observability Hardening

**Frozen before:** first physical-v2 corrected Stage-1 paid run  
**Date:** 2026-09-27  
**Scope:** WSSS-v2, OMAA-v2, MMUN-v2, then remaining compact-six Stage-1 probes  
**Effect on scoring:** none  
**Effect on candidate order:** none  
**Effect on paid retry policy:** none  
**Purpose:** detect measurement-contract failures during a live probe instead of discovering them only in post-run forensic analysis.

---

## 1. Motivation

P2G13 MMUN completed its provider exposure and reconciled exactly, but a post-run identity audit revealed a scientific measurement defect:
- an exact scheduled leg could be resolved first and later quarantined after callsign/aircraft enrichment;
- the same logical leg could receive an unstable provisional identity key.

The infrastructure watchdog already monitored:
- callback failures;
- provider balance;
- internal credit exposure;
- deadline/cleanup behavior;
- active billable subscription safety.

It did not expose enough **scientific measurement health** during the live window.

This amendment adds read-only scientific observability to the independent GitHub watchdog.

---

## 2. Scientific-health cadence

During an active Stage-1 probe, the independent GitHub watchdog reads aggregate scientific-health state approximately every 30 seconds using the existing runtime database.

The monitor:
- performs no AeroDataBox provider call;
- performs no provider mutation;
- performs no database mutation;
- reads only the exact bound runtime session;
- writes aggregate counts/violation codes to GitHub logs and a JSONL workflow artifact.

No raw provider payload, flight number, callsign, aircraft registration, provider flight ID, or other row-level provider-identifying content is copied into the scientific-health evidence log.

---

## 3. Diagnostic fields

The scientific-health snapshot includes aggregate counts such as:
- total runtime item rows;
- rows missing provider flight ID;
- rows missing callsign;
- rows with aircraft registration present;
- resolved rows;
- quarantined rows;
- resolved operator rows;
- quarantined operator rows;
- marketing rows;
- ambiguous codeshare rows;
- distinct confirmed physical flight IDs;
- distinct provisional identity keys;
- exact-scheduled-leg eligible rows/groups;
- repeated exact scheduled-leg groups;
- mixed resolved/quarantined exact-leg groups;
- late-aircraft-enrichment physical IDs.

These values are diagnostic. They are not new score components.

---

## 4. Hard scientific-contract violations

The watchdog may fail closed only for the following measurement-contract violations:

1. **metric_contract_mismatch**  
   The active probe is not bound to the current physical-v2 metric contract.

2. **resolved_row_missing_physical_id**  
   A row claims resolved identity without a physical flight instance ID.

3. **quarantined_row_has_physical_id**  
   A row claims quarantined identity while simultaneously retaining a physical flight instance ID.

4. **resolved_row_nonoperator**  
   A row is marked identity-resolved even though the normalized codeshare interpretation is not resolved operator.

5. **exact_leg_identity_split**  
   One exact operating-carrier/flight/origin/destination/service-date/scheduled-gate-out group contains more than one confirmed physical flight instance ID.

6. **resolved_then_quarantined_exact_leg**  
   An exact scheduled operating leg has already been resolved, then a later observation of that same exact leg is quarantined. This directly guards the P2G13 VB2102/AM501 failure pattern.

7. **exact_leg_provisional_key_drift**  
   One exact scheduled operating leg accumulates multiple provisional ambiguity keys.

If any hard violation is detected while the probe is probing or settling:
- the watchdog invokes exact owned-session recovery;
- the provider subscription is deleted/verified safe;
- the durable probe stop reason is written as:
  `scientific_contract_violation:<violation_code>`;
- the attempt remains historical failed/censored scientific evidence;
- no automatic retry is authorized.

---

## 5. What MUST NOT stop a run

The following observations alone must never trigger early termination:

- low unique-flight yield;
- low tail-chain yield;
- high or low stability;
- many provider IDs missing;
- many callsigns missing;
- many aircraft registrations missing;
- a high number or proportion of ambiguous/quarantined observations;
- a low number of confirmed physical flights;
- an airport producing an undesirable score.

Those are scientific outcomes/diagnostics. Stopping because of them would introduce outcome-dependent selection bias.

The scientific-health contract therefore records:

`outcome_metric_used_for_stop = false`

and unit tests enforce that ambiguity/poor yield alone remains non-terminal.

---

## 6. Human-readable live output

In addition to structured JSON, the watchdog prints a compact line similar to:

~~~text
SCIENTIFIC_HEALTH status=PASS_WITH_AMBIGUITY items=40 resolved=31 quarantined=9 physical_ids=28 exact_groups=29 repeated_exact_groups=7 identity_splits=0 resolved_then_quarantined=0 key_drift=0 late_tail_enrichment=3 violations=none
~~~

This makes the live GitHub Actions log useful to an operator without requiring a post-run SQL audit.

---

## 7. Machine-readable evidence

The watchdog writes aggregate snapshots to:

`artifacts/phase2g-scientific-health-<budget-day>-<github-run-id>.jsonl`

The paid workflow uploads this file with 30-day artifact retention even if the watchdog job fails.

The owner job likewise uploads:
- owner log;
- owner status JSON;
- owner heartbeat JSON.

---

## 8. Manual read-only inspection

The operator may inspect current scientific health without touching the provider:

~~~bash
bash scripts/v39_phase2g_monday_wsss_v2_prepare_v39.sh scientific-health
~~~

For the Monday helper this reads the bound Monday budget-day probe only.

The underlying command is:

`scripts/v39_phase2g_scientific_health_snapshot_v39.ts`

It performs:
- provider calls = 0;
- provider mutations = 0;
- database mutations = 0.

---

## 9. Recovery reason preservation

Scientific watchdog failures must not be mislabeled as generic infrastructure exits.

The abnormal-exit recovery path accepts only a tightly validated scientific stop reason of the form:

`scientific_contract_violation:[a-z0-9_]+`

and preserves that exact reason on the durable probe row.

This allows later reports to distinguish:
- infrastructure failure;
- provider/accounting failure;
- scientific measurement-contract failure.

---

## 10. No change to promotion math

This amendment:
- does not change Stage-1 duration;
- does not change credit ceilings;
- does not change WSSS/OMAA/MMUN recovery order;
- does not change anchor-score weights;
- does not change ambiguity-bound promotion logic;
- does not add a new outcome threshold.

Its only scientific role is earlier detection of invalid measurement behavior.

---

## 11. Regression requirements

Before the next paid run, CI must prove:
- ambiguity/poor yield alone does not create a hard violation;
- v1/null metric contract does create a hard violation;
- resolved→later-quarantined exact leg is detected;
- exact-leg physical-ID split is detected;
- provisional-key drift is detected;
- impossible resolved/quarantined row shapes are detected;
- read-only SQL result mapping is correct;
- the production watchdog uses the monitor;
- scientific recovery preserves a specific scientific stop reason.

---

## 12. Interpretation

This hardening does not guarantee that no unknown scientific failure can ever occur.

It improves:
- detection latency;
- operator visibility;
- root-cause specificity;
- evidence preservation;
- credit containment when a known measurement invariant is violated.

The experimental objective remains:
**zero recurrence of known failure classes, fail closed on newly detected contract violations, and never alter a run based on whether its scientific outcome is favorable.**
