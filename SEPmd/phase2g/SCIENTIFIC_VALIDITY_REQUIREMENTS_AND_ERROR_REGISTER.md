# Phase 2G Scientific Validity Requirements, Error Register, and Pre-Paid Checklist

**Created:** 2026-09-26 06:04 PDT / 2026-09-26 13:04 UTC  
**Repository:** HKcode22/ReplitTranvr  
**Branch:** phase2g-mmun-identity-repair-20260925  
**Purpose:** one fail-closed register of scientific requirements, implementation requirements, known failure modes, source basis, test evidence, and current status. This is intended to prevent a paid probe from executing merely because infrastructure is green while a scientific contract is missing or mismatched.

> Rule: A green GitHub workflow is necessary but not sufficient. A probe is promotion-valid only when infrastructure, accounting, scientific measurement, protocol comparability, and evidence retention all satisfy the frozen contract.

---

## Status vocabulary

- **PASS** — requirement currently supported by evidence.
- **FAIL** — known violation; affected result cannot be accepted.
- **BLOCKED** — cannot yet establish requirement.
- **LEGACY** — historically accepted under an older implementation; preserve but do not silently equate with current contract.
- **REVIEW_REQUIRED** — scientific/protocol decision must be frozen before affected scoring.
- **NOT_APPLICABLE** — does not apply to this operation.

---

## A. Scientific unit and identity

| ID | Requirement | Why it matters | Source basis | Current implementation/test expectation | Current status |
|---|---|---|---|---|---|
| SCI-ID-001 | One real scheduled operating leg must have one stable physical `flight_instance_id`. | Unique-flight yield must count flights, not provider updates or strings. | V3.9 §7/§9; same-aircraft/leg reasoning in Chen & Li 2019 and Zheng et al. 2021. | Canonical identity fields: operating carrier/number, route, service date, original scheduled gate-out; exact schedule reuse before fuzzy matching. | **REPAIR IN PR #9** |
| SCI-ID-002 | Repeated webhook updates must not create new flights. | Prevents double counting and false stability/yield. | V3.9 §9 stability rule (“Retries/updates never recount a flight”). | Regression: same exact leg with later callsign/aircraft enrichment reuses same ID. | **FAIL in P2G13 v1; repair required** |
| SCI-ID-003 | Mutable enrichment (callsign, aircraft registration, status) must not split an exact scheduled leg. | Provider knowledge evolves over time. | Project identity semantics + provider payload behavior. | Provisional key excludes callsign when operating flight number exists. | **REPAIR IN PR #9** |
| SCI-ID-004 | Ambiguous identities remain bounded/quarantined; do not force a match. | Prevents false certainty. | V3.9 identity-bounds rule. | Preserve confirmed lower and confirmed+ambiguous upper. | PASS conceptually; live Q4 312 demonstrated intended quarantine. |
| SCI-ID-005 | Codeshare/operator classification must distinguish operating leg from marketing labels. | Multiple public flight numbers may refer to one physical operator leg. | V3.9 codeshare contract. | Operator resolution + ambiguous-unknown quarantine tests. | PASS in current test surface; reverify after repair. |

---

## B. Tail-chain / delay-propagation validity

| ID | Requirement | Why | Source basis | Evidence needed | Status |
|---|---|---|---|---|---|
| SCI-TAIL-001 | Aircraft registration/tail is separate from flight number and physical leg identity. | One tail flies many legs; delay propagates along aircraft itinerary. | Chen & Li 2019; Zheng et al. 2021. | Code stores aircraft_reg separately from flight_instance_id. | PASS conceptually. |
| SCI-TAIL-002 | A chain link requires confirmed compatible physical legs and the same verified tail. | Prevents counting unrelated observations as propagation evidence. | V3.9 §9.1; aircraft-chain literature. | Metric reducer uses resolved physical IDs + stable tail continuity. | P2G13 could undercount because late tail enrichment was quarantined; repair/test required. |
| SCI-TAIL-003 | Tail-chain metric must not use marketing flight-number count as a substitute for physical-leg continuity in current contract. | Legacy proxy can differ from actual leg sequence. | V3.9 physical identity amendment. | v2 metric tests. | LEGACY for WSSS/OMAA; corrected for future probes. |

---

## C. Stage-1 measurement comparability

| ID | Requirement | Why | Source basis | Current status |
|---|---|---|---|---|
| SCI-COMP-001 | Candidates entering one common yield ranking must use a compatible metric definition. | Ratios/scores are not meaningful if numerator/reference measure different constructs. | General measurement validity; V3.9 §9.2 explicitly requires common yield components. | **REVIEW_REQUIRED:** WSSS/OMAA legacy NULL contract vs future physical-v2 candidates. |
| SCI-COMP-002 | WSSS primary reference must be measured under the identical target-2h, 500-cap-censored reference protocol if current §9.2 normalization is retained. | Controls exposure/protocol differences. | Binding V3.9 §9.2. | Historical P2G11 is 2h but legacy metric implementation. Corrected-contract reference requirement unresolved. |
| SCI-COMP-003 | OMAA fallback/diagnostic reference must be contract-compatible if it is used in normalization/ranking. | Same reason as WSSS. | V3.9 §9.2. | Historical OMAA is successful but legacy metric implementation. |
| SCI-COMP-004 | Do not solve incompatibility after seeing remaining candidate outcomes. | Prevents outcome-driven rule selection. | Pre-specification/anti-bias project principle; NIST sampling planning supports pre-planned scheme. | Must freeze solution before remaining results can influence it. |

### Current scientific decision required

Before final compact-six ranking, choose and freeze one of the following without using future outcomes:

**Option A — comparable remeasurement:** obtain corrected two-hour physical-v2 measurements for the historical Stage-1 rows whose yield metrics enter the common scoring/reference system.

**Option B — scoring/normalization amendment:** prospectively redesign the yield normalization so legacy metrics are not mixed with corrected physical metrics.

No current evidence supports pretending the old and new metrics are identical.

---

## D. Stage-1 sampling/exposure

| ID | Requirement | Source/rationale | Status |
|---|---|---|---|
| SCI-SAMP-001 | All ordinary Stage-1 candidate probes use the frozen target exposure class (2h, matched weekday/time class, protected cap) unless prospectively amended. | Project protocol; NIST supports pre-planned comparable sampling, not the specific 2h value. | PASS as protocol. |
| SCI-SAMP-002 | Two hours must not be described as a literature-proven optimal duration. | No cited paper establishes this. | PASS documentation requirement. |
| SCI-SAMP-003 | Rows/hour capacity gate is feasibility, not part of yield score. | Binding V3.9 §9. | PASS design. |
| SCI-SAMP-004 | Stability uses only complete 15-minute buckets inside actual exposure; insufficient buckets -> insufficient sample, not fabricated score. | Binding V3.9 §9.2. | Reverify tests after metric repair. |
| SCI-SAMP-005 | A censored/short run cannot be treated as a full Stage-1 measurement even if reconciliation later MATCHes. | Prevents exposure bias. | P2G08 historical lesson; current owner/finalizer enforce. |

---

## E. Stage-2 meaning

| ID | Requirement | Binding rule | Status |
|---|---|---|---|
| SCI-S2-001 | Compact Stage 2 is conditional, not an automatic four-hour rerun of all six airports. | Phase-2G amendment §20.7. | PASS documentation correction. |
| SCI-S2-002 | Current Stage-2 trigger set includes fewer than five valid Stage-1 candidates, capacity failure, identity-bound rank instability, invalid references, or non-robust fifth/sixth membership. | §20.7. | PASS. |
| SCI-S2-003 | A 4h Stage-2 result cannot silently replace the §9.2 identical-2h WSSS/OMAA Stage-1 reference. | §9.2 exposure binding. | PASS interpretation; amendment required if changed. |

---

## F. Reconciliation / delivery completeness

| ID | Requirement | Source | Status |
|---|---|---|---|
| SCI-REC-001 | External settled provider spend is authoritative denominator. | AeroDataBox billing docs + Phase-2G amendment. | PASS. |
| SCI-REC-002 | Only exact MATCH is currently promotion-valid. | Compact-six amendment. | PASS. |
| SCI-REC-003 | Positive external-minus-received gap is terminal/non-scoreable under current rule. | P2G06 amendment. | PASS. |
| SCI-REC-004 | No received explicit cost/item disagreement. | Provider/plan accounting contract. | PASS for P2G13. |
| SCI-REC-005 | Durable reconciliation evidence exists before raw/transient cleanup. | Phase-2G amendment. | PASS for latest runs. |

---

## G. Provider/raw-content handling

| ID | Requirement | Rationale | Status |
|---|---|---|---|
| ENG-RET-001 | Raw provider payload is durably persisted before HTTP 2xx. | Prevent acknowledged-but-lost deliveries. | Production-path requirement. |
| ENG-RET-002 | Paid detailed normalized provider-identifying fields remain in approved transient surface. | Retention/data-minimization architecture. | PASS architecture; review provider terms at point of use. |
| ENG-RET-003 | Exact-session cleanup only after terminal evidence is durable. | Preserve audit evidence while respecting purpose deletion. | PASS; P2G13 39/39 cleanup verified. |
| ENG-RET-004 | Cleanup must prove zero session/delivery/item/live-blob rows for the exact session. | Prevent orphaned provider content. | PASS P2G13. |

---

## H. Time and causal leakage

| ID | Requirement | Source basis | Status |
|---|---|---|---|
| SCI-TIME-001 | Scheduled flight time and webhook received time remain separate clocks. | Basic event-time/availability-time requirement in V3.9. | PASS design. |
| SCI-TIME-002 | Future/revised information may not leak into an earlier prediction snapshot. | V3.9 as-known-at-cutoff rule; standard predictive validity principle. | Later Phase-6/ML requirement, not current probe scoring. |
| SCI-TIME-003 | Retimes are schedule versions of a physical flight unless positive distinct-leg evidence exists. | Binding identity requirement. | Reverify parity tests. |

---

## I. Geographic/candidate selection

| ID | Requirement | Basis | Status |
|---|---|---|---|
| SCI-GEO-001 | Compact six were chosen prospectively from the frozen shortlist without using observed yield. | Phase-2G amendment + anti-selection-bias rationale. | PASS historical freeze. |
| SCI-GEO-002 | One candidate per macro-region is a project stratification/cost compromise, not a universal statistical theorem. | NIST stratification principles. | PASS documentation. |
| SCI-GEO-003 | Do not substitute a new airport after seeing yield except through frozen replacement protocol. | V3.9 anti-bias rule. | PASS. |

---

## J. Scientific provenance

| ID | Requirement | Status |
|---|---|---|
| PROV-001 | Every scientific proposition cites a source that actually supports that proposition. | Ongoing. |
| PROV-002 | Project-specific constants are labeled project-specific, not falsely attributed to literature. | Required; provenance report created 2026-09-26. |
| PROV-003 | Provider behavior cites provider documentation, not academic papers. | Required. |
| PROV-004 | Engineering controls are labeled engineering/reproducibility controls. | Required. |
| PROV-005 | For each implementation requirement map Plan → code → test → command → evidence. | Binding Implementation Log responsibility. |

---

## K. Known historical failures and prevention controls

| Event | Failure | Scientific disposition | Prevention |
|---|---|---|---|
| early WSSS pre-Gate | runtime/default issue; premature paid action | invalid | gate sequencing / safe defaults |
| WSSS probe 1 | transient runtime/session loss | censored invalid | durable binding/recovery |
| P2G06 WSSS | 220 external vs 219 received | MISMATCH | reconciliation evidence/exact rule |
| P2G07 WSSS | provider control-plane 502 | censored invalid | retries/exact recovery |
| P2G08 WSSS | balance 502 + false completion path | censored invalid | censoring guard |
| P2G09 WSSS | Replit process replacement | censored invalid | GitHub owner/watchdog |
| P2G10 WSSS | webhook secret mismatch | censored invalid | zero-credit secret binding |
| P2G11 WSSS | full-duration/MATCH | successful historical execution | preserve |
| OMAA P2G03 | full-duration/MATCH | successful historical execution | preserve |
| MMUN P2G13 | full-duration/MATCH provider execution, but physical-identity v1 defect | scientific metric invalid | exact schedule reuse, stable ambiguity key, v2 tests |

---

## L. Required gates before the next paid MMUN defect-correction run

All must be PASS on one exact source state:

1. P2G13 operational closure verified — **PASS**.
2. P2G13 scientific-invalid disposition preserved — **PASS/documented**.
3. Exact schedule-leg identity reuse implemented.
4. Callsign-enrichment provisional-key regression fixed.
5. VB2102 live-pattern regression test passes.
6. AM501 live-pattern regression test passes.
7. Late tail-enrichment/chain metric regression passes.
8. Migration 0061 fresh apply passes.
9. Migration replay/idempotence passes.
10. TypeScript passes.
11. targeted identity/metric tests pass.
12. full V3.9/offline tests pass.
13. lint/registry/traceability/contradiction scanner pass.
14. production build passes.
15. **Scientific comparability policy is explicitly frozen as either immediate remeasurement or deferred-before-ranking; draft branch must not silently force an unreviewed sequence.**
16. exact approved Git HEAD synced to Replit.
17. managed runtime reports exact HEAD and expected route/retention.
18. fresh zero-credit callback proof.
19. fresh GitHub/Replit DB + webhook-secret binding.
20. fresh weekday runtime/budget/AUTH for MMUN.
21. paid preflight reports MMUN as the exact intended target with zero blockers.
22. GitHub owner + independent watchdog are the only lifecycle owners.
23. no automatic retry if the corrected attempt fails.

---

## M. Reference sources

### Aviation research
- Chen, J. & Li, M. (2019), “Chained Predictions of Flight Delay Using Machine Learning,” AIAA SciTech. https://junchen.sdsu.edu/proceedings/scitech_gnc19_Chen.pdf
- Zheng, Z.; Wei, W.; Hu, M. (2021), “A Comparative Analysis of Delay Propagation on Departure and Arrival Flights for a Chinese Case Study,” Aerospace 8(8):212. https://www.mdpi.com/2226-4310/8/8/212
- SJSU ScholarWorks record: https://scholarworks.sjsu.edu/faculty_rsca/2410/
- Zheng, Z.; Zou, B.; Wei, W.; Tian, W. (2023), “A Data-Light and Trajectory-Based Machine Learning Approach for the Online Prediction of Flight Time of Arrival,” Aerospace 10(8):675. https://www.mdpi.com/2226-4310/10/8/675
- SJSU ScholarWorks record: https://scholarworks.sjsu.edu/faculty_rsca/4774/

### Statistical design
- NIST populations/sampling: https://www.itl.nist.gov/div898/handbook/ppc/section1/ppc134.htm
- NIST define sampling plan: https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc33.htm
- NIST sampling schemes/stratification: https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc332.htm
- NIST sample-size considerations: https://www.itl.nist.gov/div898/handbook/ppc/section3/ppc333.htm

### Provider
- AeroDataBox Flight Alert API guide: https://aerodatabox.com/flight-alert-api-2026/
- Provider OpenAPI/current contract pages as pinned by V3.9 Plan §19.
- AeroDataBox Terms/plan terms as cited by prerequisite P.

---

## N. Non-negotiable interpretation rule

A successful provider execution can still produce a scientifically invalid metric.
A scientifically improved metric can still contain a software bug.
A historical successful run can remain historically successful while becoming non-comparable to a later metric contract.
None of those facts alone authorizes an unlimited rerun.

Every affected decision must state exactly which layer failed:
- provider/infrastructure;
- accounting/reconciliation;
- scientific measurement implementation;
- comparability/protocol;
- or evidence/retention.
