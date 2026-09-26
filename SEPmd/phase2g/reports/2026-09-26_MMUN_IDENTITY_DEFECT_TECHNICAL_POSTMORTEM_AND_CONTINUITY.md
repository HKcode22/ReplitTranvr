# Phase 2G MMUN Identity Defect — Technical Postmortem and Continuity Record

Recorded: 2026-09-26 00:24 PDT / 2026-09-26 07:24 UTC

Repository: HKcode22/ReplitTranvr

Historical source states:
- P2G13 MMUN source HEAD: 2ff4149b8ba7f2125ee2fd2b6be95f8f82adf779
- P2G11 successful WSSS source HEAD: 7253bdede325db3b34a2530701bc92a3e322e598
- Physical-flight correction commit before P2G13: da65e0e9a2672e5cbbb9d15dfae7f3afb96d3b27
- Current repair branch: phase2g-mmun-identity-repair-20260925
- Draft PR: #9

Purpose: preserve a precise explanation of what happened, what the terminology means, what was and was not wrong with WSSS/OMAA/MMUN, and what must happen next. This report is a continuity/postmortem record. It does not itself authorize a provider action and does not replace the binding V3.9 plan or implementation log.

---

## 1. Executive conclusion

Three questions must remain separate:

1. Did the paid Stage-1 run execute safely and completely?
2. Did provider/callback/accounting reconcile correctly?
3. Did the scientific metric implementation conform to the physical-flight identity rule required by V3.9?

OMAA probe 2 / AUTH P2G03:
- completed its intended Stage-1 window;
- duration_censored=false;
- stop_reason=null;
- reconciliation=MATCH;
- its historical report records it as valid completed Stage-1 evidence.

WSSS probe 9 / AUTH P2G11:
- completed the full two-hour Stage-1 exposure;
- duration_censored=false;
- stop_reason=null;
- reconciliation=MATCH;
- GitHub gate, owner and independent watchdog succeeded;
- exact-session cleanup deleted all 67 retained blobs;
- finalizer returned PASS_COMPLETED_AND_BUDGET_CLOSED;
- zero active billable subscriptions remained.

Therefore OMAA and WSSS were successful Stage-1 executions under the implementation that existed when each ran.

MMUN probe 10 / AUTH P2G13:
- completed the full two-hour provider exposure;
- duration_censored=false;
- stop_reason=null;
- 52 external credits = 52 internal received credits;
- 39 callback requests, 39 successful 2xx responses, zero callback failures;
- provider subscription deleted;
- reconciliation=MATCH.

However, retained MMUN item-level evidence directly exposed a defect in the newly introduced physical-flight identity implementation. Repeated observations of the same exact scheduled physical leg could be resolved once and later quarantined when callsign/aircraft enrichment appeared.

Therefore:

~~~text
P2G13 provider execution = PASS
P2G13 accounting = MATCH
P2G13 physical-identity scientific metrics = INVALID
P2G13 must not be used as final promotion evidence
~~~

MMUN therefore requires a defect-correction rerun after the implementation is repaired.

---

## 2. What a physical flight identity means

A public flight number is not the same thing as one physical flight instance.

Example:

~~~text
VB 2102
MMUN -> MMVR
scheduled 2026-09-25 11:00 UTC
~~~

AeroDataBox can send several webhook observations about that one physical leg:

~~~text
11:03:
  flight number = VB 2102
  scheduled = 11:00
  callsign = null
  aircraft registration = null

12:02:
  flight number = VB 2102
  scheduled = 11:00
  callsign = VIV2102
  aircraft registration = XA-VXY
~~~

Those are two observations of one real flight, not two flights.

The project therefore needs a stable internal flight_instance_id representing the physical leg. Conceptually it is based on stable leg attributes such as:

~~~text
operating carrier
operating flight number
origin
original destination
service date
original scheduled gate-out
~~~

Repeated updates must reuse the same flight_instance_id.

This matters to Stage-1 because the observed-yield calculation uses confirmed distinct physical flights, identity bounds, stability/first-observation timing, and confirmed tail-chain links.

---

## 3. Callsign and aircraft registration

A callsign is an operational/radio identifier. Example:

~~~text
public flight number = VB 2102
callsign = VIV2102
~~~

The provider may omit the callsign on an early callback and add it later.

Aircraft registration is the aircraft/tail identifier, for example XA-VXY or N838AM.

Both can be useful enrichment. Neither should cause an already-known exact scheduled physical flight to become a new identity merely because the field appeared later.

---

## 4. Normal production resolver versus prepaid Phase-2G resolver

The repository has two identity-persistence environments.

### 4.1 Normal production resolver

File:
server/lib/disruption/flightInstanceCanonical_v3.ts

The normal path stores canonical identity state in long-lived identity tables such as:
- clean.webhook_flight_identity
- clean.webhook_flight_schedule_version

When no provider flight ID exists, the normal resolver creates a schedule-aware identity alias containing:

~~~text
operating carrier
operating flight number
origin
original destination
initial service date
exact scheduled gate-out UTC
~~~

It checks this exact alias before moving to fuzzy/callsign/retime matching.

Therefore an observation with the exact same scheduled leg is recognized as an update of the retained leg before callsign heuristics are needed.

### 4.2 Prepaid Phase-2G resolver

File:
server/lib/disruption/prepaidProbeRuntime_v39.ts

The paid Phase-2G safe path deliberately does not use the logged long-lived identity tables.

Its source comment explicitly states that it uses only:
clean.prepaid_probe_item_runtime

That table is UNLOGGED, session-local and purpose-deleted with the paid probe.

This separation exists because Phase-2G provider-identifying normalized data is intentionally transient under the provider-content safety/retention design.

Having a separate persistence adapter is therefore reasonable.

The failure was behavioral drift: the prepaid adapter reimplemented the identity rule but initially omitted one exact-schedule lookup that already existed in the normal resolver.

---

## 5. Exact P2G13 defect

At MMUN P2G13 HEAD 2ff4149b..., the no-provider-ID prepaid path:

1. loaded prior resolved candidates with the same carrier/flight/route near the same service date;
2. calculated schedule time distance;
3. considered a prior identity a strong match when callsign matched and the schedule was within 12 hours;
4. when there was no strong match but a same-date/nearby identity existed, it quarantined the observation as ambiguous.

Old key logic:

~~~ts
const strong = enriched.filter(
  (candidate) =>
    candidate.callsignMatch &&
    candidate.deltaHours <= 12,
);

if (strong.length === 1) {
  return priorPhysicalIdentity;
}

if (ambiguousNearby) {
  throw WebhookIdentityAmbiguityError;
}
~~~

The missing step was an exact scheduled-leg lookup before the callsign/fuzzy block.

The repair branch now first queries for exactly:

~~~sql
session_id
provider_flight_id IS NULL
resolved physical identity
same operating_carrier
same operating_flight_number
same origin_icao
same destination_icao
same initial_service_date
same scheduled_gate_out_utc
~~~

If there is exactly one match, it reuses that flight_instance_id immediately.

That mirrors the exact schedule-aware behavior of the normal production resolver.

---

## 6. Second defect: provisional ambiguity key used mutable callsign

At P2G13 HEAD, a no-provider-ID provisional identity key included:

~~~text
operatingCarrier
operatingFlightNumber
originIcao
destinationIcao
scheduledGateOutUtc
callsign
~~~

Therefore these two observations could hash differently:

~~~text
observation 1: callsign = null
observation 2: callsign = VIV2102
~~~

even though all stable scheduled-leg fields were identical.

The repair removes callsign from the provisional scheduled-leg key whenever a real operating flight number exists. Callsign remains last-resort evidence only when no usable operating flight number exists.

---

## 7. Live MMUN proof

A retained P2G13 audit at 26 items showed:

~~~text
total_items = 26
provider_flight_id missing = 26
logical scheduled-leg groups = 23
repeated groups = 3
mixed resolved/quarantined groups = 2
groups with quarantine = 3
~~~

VB 2102:
- first observation MMUN -> MMVR, scheduled 11:00 UTC, callsign null, aircraft null;
- identity resolved to leg:e7159686;
- later observation had the same exact scheduled leg but callsign VIV2102 and aircraft XA-VXY;
- later observation was quarantined instead of being attached to leg:e7159686.

AM 501 showed the same resolved-then-quarantined pattern.

Q4 312 is different: its provider codeshare state remained Unknown / ambiguous_unknown, so its quarantine follows the intended fail-closed codeshare rule.

---

## 8. Scientific effect of the defect

The webhook data itself was not lost.

The problem occurs after persistence when observations are grouped into physical flights.

Effects:

1. The ambiguity upper bound can be widened by a later update of an already-known leg.
2. Late aircraft registration enrichment can be disconnected from the confirmed flight.
3. Tail-chain evidence can therefore be understated.
4. The Stage-1 observed-yield calculation can be altered.

Therefore P2G13 cannot be accepted as final scientific promotion evidence even though provider execution and reconciliation passed.

---

## 9. What WSSS and OMAA measured before Friday

At WSSS P2G11 HEAD 7253bd... and OMAA P2G03 HEAD f068204..., prepaid metrics used the legacy implementation.

The exact SQL counted:

~~~sql
count(DISTINCT flight_number) AS unique_flights
~~~

Confirmed lower count:

~~~sql
count(
  DISTINCT CASE
    WHEN codeshare_status='IsOperator'
    THEN flight_number
  END
) AS confirmed_lower
~~~

Tail links were approximated by grouping on aircraft_reg and counting distinct flight_number values.

First-observation grouping used runtime_flight_key.

The old runtime key hashed:

~~~text
number
providerId
departure ICAO
arrival ICAO
scheduled departure
callsign
~~~

This is not identical to a canonical physical flight_instance_id.

This is why commit da65e0e9... introduced migration 0060 and the explicit physical-flight metric contract on September 25.

---

## 10. Did the exact MMUN defect happen in WSSS or OMAA?

We cannot prove that the exact VB2102/AM501 resolved-then-quarantined defect occurred in WSSS or OMAA, because the exact Friday prepaid physical-identity resolver did not exist in those runs.

WSSS and OMAA used the older flight-number/runtime-key metric path.

Therefore MMUN exposed a defect in the Friday physical-identity upgrade itself, not the exact same prior WSSS code path.

However, there is a separate historical limitation:

- the old WSSS/OMAA metrics were less precise than the physical-flight rule required by the plan;
- their transient provider item rows were purpose-deleted after cleanup;
- exact corrected physical metrics cannot now be reconstructed from those historical payloads.

Therefore the following distinction is required:

- WSSS and OMAA executions succeeded;
- they remain successful historical Stage-1 evidence;
- their legacy metric values are not mathematically interchangeable with later physical-flight metric values;
- the September 25 canonical amendment explicitly forbids blindly mixing those legacy NULL-contract values with corrected physical-flight evidence for final promotion normalization.

This comparability issue must not be mislabeled as an infrastructure failure.

---

## 11. WSSS formal paid Stage-1 attempt history

There have been seven formal durable WSSS Stage-1 probes through P2G11.

1. Probe 1 / P2G02
   - failed, censored, UNRESOLVED;
   - UNLOGGED runtime/session state disappeared while provider subscription existed.

2. Probe 4 / P2G06
   - full duration but failed reconciliation;
   - provider external spend 220 vs 219 internal received;
   - one-credit delivery gap / MISMATCH.

3. Probe 5 / P2G07
   - failed/censored/UNRESOLVED;
   - AeroDataBox control-plane HTTP 502 during balance/delete handling.

4. Probe 6 / P2G08
   - failed/censored;
   - repeated provider balance-control-plane 502;
   - reconciliation later MATCH, but censored run was excluded and false-completion behavior was corrected.

5. Probe 7 / P2G09
   - failed/censored/UNRESOLVED;
   - Replit development workspace/process replacement killed the supervisor/child.

6. Probe 8 / P2G10
   - failed/censored/UNRESOLVED;
   - GitHub/Replit webhook secret mismatch caused callback 404 rejection while provider spent credits.

7. Probe 9 / P2G11
   - SUCCESS;
   - full two-hour exposure;
   - uncensored;
   - stop_reason=null;
   - reconciliation=MATCH;
   - 67 callback blobs cleaned exactly;
   - runtime rows zero;
   - zero active billable subscriptions;
   - finalizer PASS_COMPLETED_AND_BUDGET_CLOSED.

There was also an earlier pre-Gate/premature WSSS incident before the formal durable sequence; it is not one of these seven durable Stage-1 probe rows.

---

## 12. OMAA history

OMAA durable probe 2 / AUTH P2G03:

- completed;
- uncensored;
- stop_reason=null;
- reconciliation=MATCH;
- report path:
  SEPmd/phase2g/reports/2026-09-16_P2G02_OMAA_SUCCESS.md
- the report explicitly records it as historical valid Stage-1 evidence.

OMAA must not be described as an infrastructure failure.

---

## 13. What probe 2, probe 9 and probe 10 mean

The compact six candidate airports are:

~~~text
WSSS = Asia-Pacific
OMAA = Gulf/Africa
MMUN = North America
LKPR = Europe
SKBO = South America
YSSY = Oceania
~~~

A probe number is only the sequential database primary key in clean.adb_anchor_probe.

Examples:

~~~text
probe 2  = OMAA successful attempt
probe 9  = WSSS P2G11 successful attempt
probe 10 = MMUN P2G13
~~~

It is not a region number and not the candidate's ordinal position.

---

## 14. Why WSSS is primary yield reference and OMAA is fallback

The Stage-2 promotion code standardizes observed-yield components against a reference airport.

The frozen rule is:

1. WSSS is the primary reference if it has valid positive capacity/yield evidence.
2. OMAA is used as fallback only if WSSS cannot serve as the reference.

This is a normalization rule, not a statement that WSSS is a more important geographic region.

All six compact candidates are independent macro-region candidates.

---

## 15. Meaning of NULL, v1 and v2 metric contracts

These are metric implementation versions, not airport versions or quality scores.

Legacy / NULL:
- OMAA and successful WSSS were run before the explicit physical-flight metric contract was stored.
- Their durable metric_contract_version is NULL.

v1:
- commit da65e0e9... introduced v39-physical-flight-instance-v1.
- P2G13 MMUN used v1.
- P2G13 exposed the exact-schedule/callsign-enrichment defect.

v2:
- the repair branch proposes v39-physical-flight-instance-v2.
- v2 means the physical-flight implementation after repairing the P2G13 identity-parity bug.
- it is not a new scientific concept; it is a corrected implementation/version marker.

---

## 16. Meaning of the draft “one additional v2 measurement” rule

The current draft repair branch introduced a proposal to perform:

~~~text
WSSS -> OMAA -> MMUN
one v2 attempt maximum each
~~~

The purpose was anti-bias and metric comparability, not because WSSS or OMAA infrastructure failed.

The logic was:
- WSSS/OMAA historical metric rows are legacy NULL-contract;
- MMUN v1 is invalid;
- final promotion should not mix incompatible metric definitions;
- if remeasurement is used to solve that, it must be bounded prospectively rather than repeated until a preferred score appears.

This proposal exists on the draft repair branch. It must not be described as proof that WSSS P2G11 or OMAA P2G03 failed.

Whether reference/candidate remeasurement is ultimately required for final Stage-2 promotion is a separate scientific comparability decision from the immediate MMUN defect-correction rerun.

---

## 17. Current honest project state

~~~text
OMAA:
  Stage-1 execution SUCCESS
  historical metric contract = NULL

WSSS:
  P2G11 Stage-1 execution SUCCESS
  historical metric contract = NULL

MMUN P2G13:
  provider execution PASS
  reconciliation MATCH
  physical-identity metric implementation INVALID
  requires corrected rerun

LKPR:
  not yet successfully measured
  old P2G05 was a pre-launch refusal, not an LKPR scientific failure

SKBO:
  not yet run

YSSY:
  not yet run
~~~

---

## 18. Immediate forward path

P2G13 currently still needs final exact-session cleanup/finalization.

Latest read-only state:

~~~text
probe 10 status = settling
reconciliation = MATCH
duration_censored = false
runtime sessions = 0
runtime deliveries = 0
runtime items = 0
live retained blobs = 39
open incidents = 0
active billable subscriptions = 0
budget day = OPEN
~~~

Exact-session cleanup dry-run proved:

~~~text
mode = DRY_RUN
expected_live_blobs = 39
observed_live_blobs = 39
runtime rows = 0/0/0
active billable subscriptions = 0
provider mutation = false
~~~

Next closure step:
1. exact-session blob cleanup;
2. preserve cleanup receipt and SHA;
3. settling finalizer;
4. close the budget day;
5. independent final read-back.

Before another paid MMUN:
- exact schedule-leg reuse must be present;
- callsign enrichment must not split the provisional scheduled-leg identity;
- VB2102/AM501 live-pattern regressions must pass;
- late aircraft/tail enrichment regression must pass;
- migration/schema/typecheck/tests/lint/traceability/contradiction scan/build must pass;
- Replit and GitHub must be rebound to one exact approved HEAD;
- fresh zero-credit callback verification must pass;
- fresh weekday runtime, budget day and AUTH are required.

No weekend paid Stage-1 execution.

The intended immediate defect-correction target is MMUN on an eligible matched weekday window.

After a valid MMUN result, ordinary Stage-1 progression is toward LKPR, SKBO and YSSY unless a separately documented binding scientific comparability decision requires additional reference work before final promotion.

---

## 19. Final promotion comparability remains a separate question

Do not confuse this with WSSS/OMAA execution failure.

Facts:
- WSSS and OMAA completed successfully.
- Their historical metric rows use the legacy NULL contract.
- The canonical September 25 amendment says those old values must not be mixed blindly with corrected physical-flight metrics for final Stage-2 promotion/normalization.
- Their transient provider rows have been purpose-deleted, so exact corrected metrics cannot simply be recomputed from those old runs.

Before final Stage-2 promotion/ranking, the project must freeze a scientifically defensible solution to that comparability problem.

Possible classes of solution include:
- obtaining comparable corrected measurements where the binding ranking requires them; or
- prospectively changing the normalization/reference method without using observed outcomes to choose the rule.

That decision is separate from whether P2G11 WSSS and P2G03 OMAA successfully executed. They did.

---

## 20. Important repository paths

Binding/project documents:
- SEPmd/V3.9_DataCollectPlan_f.8.md
- SEPmd/V3.9_IMPLEMENTATION_LOG.md
- SEPmd/phase2g/FAILURE_REGISTER_AND_PREVENTION_MATRIX.md
- SEPmd/phase2g/amendments/2026-09-25_PHYSICAL_FLIGHT_IDENTITY_METRIC_CORRECTION.md
- SEPmd/phase2g/reports/2026-09-16_P2G02_OMAA_SUCCESS.md

Identity code:
- server/lib/disruption/flightInstanceCanonical_v3.ts
- server/lib/disruption/prepaidProbeRuntime_v39.ts
- server/lib/disruption/prepaidProbeMetricContract_v39.ts
- server/lib/disruption/anchorPromotion_v39.ts

Schema/migrations:
- migrations/0055_prepaid_probe_unlogged_runtime.sql
- migrations/0058_phase2g_reconciliation_evidence.sql
- migrations/0060_phase2g_physical_flight_metrics.sql
- repair branch: migrations/0061_phase2g_physical_flight_metrics_v2.sql

Regression tests:
- tests/prepaid_identity_adapter_v39.test.ts
- tests/prepaid_identity_persistence_v39.test.ts
- tests/prepaid_identity_resolution_v39.test.ts
- tests/prepaid_physical_metrics_v39.test.ts
- tests/phase2g_stage1_rerun_policy_v39.test.ts

WSSS success evidence:
- GitHub workflow run 35990540643
- artifacts/phase2g-exact-session-purpose-cleanup-P2G11-WSSS-1790256137133.json
- artifacts/phase2g-settling-finalizer-probe9-1790256179176.json

MMUN P2G13:
- GitHub workflow run 36126990149
- durable probe 10
- AUTH-20260925-P2G13
- budget P2G-S1-20260925-12
- session e343329e-4966-482d-8e51-1b7867deed1c

---

## 21. Continuity rules

1. Do not call successful WSSS/OMAA executions infrastructure failures.
2. Do not call P2G13 provider transport a failure; the invalid component is its identity-derived scientific metric implementation.
3. Never rerun a candidate merely because an observed score is undesirable.
4. Any paid rerun or remeasurement needs a prospectively documented non-outcome reason.
5. Keep execution validity, reconciliation validity and metric-contract validity separate.
6. Preserve all historical attempts; never rewrite old evidence as though later code had run.
7. Finish exact P2G13 cleanup/finalization before freezing the next paid authorization.
8. No weekend paid Stage-1 run; frozen Stage-1 class is weekday.
9. After code changes, rerun exact offline CI and zero-credit GitHub/Replit binding.
10. Keep final Stage-2 promotion blocked until metric comparability is prospectively resolved.
