# Research measurement scorecard — Phase 2G / five-airport early pilot

**Purpose:** multi-axis, "fit-for-purpose" quality assessment, not a post-hoc weighted score and not a change to historical ACCEPT/FAIL. **No published framework mandates 99%, 99.134%, 2 credits or 100% as universal scientific-validity cutoffs.** The following are descriptive observed ratios with explicit denominators. `RESEARCH_OBSERVATION_COMPLETE` can be green for YSSY while `FROZEN_P25_RECONCILIATION=DELIVERY_GAP` remains red.

## Source-based framework

- [NIST Research Data Framework SP 1500-18r2 §4.5](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html) describes fitness for purpose and distinct completeness, accuracy, reliability, consistency and timeliness. A percentage for one dimension is **not** a total trustworthiness score.
- [ISO/IEC 25012:2008](https://www.iso.org/standard/35736.html) defines general structured-data quality characteristics used to set stakeholder-specific quality requirements. It does **not** establish a single aviation-research passing number.
- [STROBE reporting statement, items 12(c) and 12(e)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2636253/) calls for describing how missing data are handled and sensitivity analyses.
- [AeroDataBox Flight Alert API 2026](https://aerodatabox.com/flight-alert-api-2026/) says alert credit is charged when sent (one per flight item, including failed send). Thus billed credits are **not** confirmed HTTP-delivery attempts at the receiver. The signed HMAC secret and local 2xx logs do **not** independently attest provider attempts.
- [NIST measurement uncertainty overview](https://www.nist.gov/itl/sed/topic-areas/measurement-uncertainty) separates numerical measurement uncertainty from claims of perfect inference.

## YSSY P25 measured quality axes

| Dimension | Numerator/denominator | Description/result | Inference limit |
|---|---|---|---|
| Exposure time | 7203.639 / 7200 s | **100% target-window attained** (uncensored) | Scheduled exposure does not prove every possible notification captured |
| Integrity of observed originals | 58 SHA+size verified / 58 refs | **100%** readback; 308832 bytes | Only the 58 received originals, not invisible upstream deliveries |
| Item-cost consistency of received originals | 229 saved-body credit claims / 229 stored flight items | **100% agreement**, duplicates=0 | Saved-body cost claims not independent provider proof |
| External-to-internal credit reconciliation | 229 observed items / 231 provider billed credit-units | **99.134199%**; 2-units gap (0.865801%) | This is a **billed-credit reconciliation fraction**, NOT statistically measured probability of callback delivery |
| Resolved operator row fraction | 221 operator-resolved rows / 229 saved items | **96.50655%** | 8 other rows quarantined; identity context and systematic selection may differ |
| Observed collection density | 229 / (7203.639 / 3600) | **114.442 received items/hour**, descriptive | Not the official persisted `rows_per_hour` (NULL due to DELIERY_GAP). Does not auto-pass frozen anchor score |
| Successfully responded callbacks | 58 observed successful 2xx / 58 observed webhooks | **100% among observed callback requests** | Unknown denominator of provider attempted sends; no sender-level reliability inference |
| Missingness mechanism/bias | UNKNOWN | **NOT YET ESTABLISHED** | Missing items could be disproportionately late/delayed or selectively lost, even when small |
| Legal retained derived material | SOURCE-CLASSIFICATION-PENDING | **NOT YET ESTABLISHED** | Raw AeroDataBox contents expire starting 2026-10-20; legitimate permitted derived analysis must be established |

**Do not average the above rates**: denominators and semantics differ, and no scientifically defensible global importance weights are registered. A 100% integrity rate on received originals does not cancel out an 0.8658% externally billed credit gap or bias from missing high-delay observations.

## Descriptive received-item throughput comparison — not formal anchor rank

| Site | Frozen original state | Observed items/hour | Interpretation |
|---|---|---:|---|
| WSSS (probe11) | completed/MATCH | **160.498** | Formal capacity ≥60 passed |
| SKBO (probe15) | completed/MATCH | **150.498** | Formal capacity ≥60 passed |
| **YSSY (probe19)** | failed/DELIVERY_GAP but full-duration stored items and complete source SHA | **114.442** (post-hoc derived 229/7203.639h) | Above numerical 60 threshold on observed-density calculation; **official stored field NULL**. Qualified research, not formal score |
| OMAA (probe12) | completed/MATCH | **73.999** | Formal capacity ≥60 passed |
| MMUN (probe14) | completed/MATCH | **23.000** | Below 60, independently accepted observed data but does not qualify as high-capacity anchor |

The rankings above are **one throughput axis**, not a full `anchor_score` (which needs exogenous components, chain links and stability, and its frozen reference). No causal airport-population inference from two-hour purposive regional observations. No label of 5 independent population-representative replicates.

## Research acceptance and sensitivity disposition

1. **Green completed observation / research inventory inclusion:** YSSY yes, with tier `B_DEGRADED_OBSERVED_ONLY` and exact source/receipt provenance.
2. **Formal P25 historical reconciliation and confirmatory score:** `failed/DELIVERY_GAP`, untouched. Draft PR #36's future bounded-gap qualifier can be adopted only with prospective thresholds, missingness analysis, source/licence gates and owner approval.
3. **Preliminary sensitivity:** At most 2 externally billed but unreceived credit-units identified. Their **identities, observation times, delay severities and causal missingness mechanism are unknown**. Do not add two imaginary rows/legs or assume uniform absence. Without independent provider attempt-level truth, we cannot quantify a binomial confidence interval for "callback delivery success" from 229/231 without unjustified iid assumptions.
4. **Feature/label selection:** stratify available receiver source evidence by time/identity/quarantine status; test optimistic and adversarial missing-notification scenarios in any model performance analysis; preserve chronological split and availability-at-cutoff boundaries. A sensitivity analysis finding that rare/high-delay outcomes could change a conclusion should keep it exploratory.
5. **Prospective future quality policy:** pre-register exact eligibility, effect of gaps on anchor score and rank, verified source custody, duration, safe billing, and identity before affected run. Keep NIST/ISO requirements separate from chosen project-specific thresholds.

## Engineering follow-up

Draft `phase2gTerminalOwnerHandoff_v39.ts` plus the wired GitHub watchdog patch remove one specifically reproduced potential false safety incident: zero active subscription **after exact 120m deadline** while expected owner cleanup is still inside existing 300s grace; before deadline, with any foreign billable subscription, and after grace all still trigger original recovery. This may address incident31's observed end-of-run race but does **not** resolve the earlier two-credit mismatch. Initial no-provider CI applies; deployment requires separate risk review and future version freeze. To reduce upstream gaps, continue already present <7s transport warning telemetry, rapid canonical source store+SQL commit, heartbeat, Replit published receiver with durable custody, and never silently turn provider retries on: billable retries change independent SEND accounting and budget. Request independent sender web-hook delivery attempt logs from provider for definitive root cause, if obtainable; otherwise cause remains unknown.

## Gate progression

Early-pilot Compact6 `artifacts/phase2g-compact6-early-pilot-scope-reduction-freeze-20261002.json` expressly *retires automatic Stage2 four-hour confirmation*. It does **not** retroactively alter P25 exact reconciliation. Finite 2G closeout remains: source evidence and metadata preserved (DONE), incident31 and 58 live objects (OPEN), legal retention/derived-work handling and pilot qualified acceptance (OPEN); only then optional 2H decision, then Phase3 Gate3→0.5→4. **No new paid action.**
