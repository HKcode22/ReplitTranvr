# Phase 2G — what really happened in the real-airport trials (September–14 October 2026)

**Read this to explain the historical pilots without overstating failure or success.** Start with [one-page management summary](../PROJECT_STORY_FOR_PEERS_AND_MANAGEMENT.md), [main study home](../README.md) or [all 58 original reports, incidents and runbooks](ALL_REPORTS.md).

> **Core conclusion:** Five studied sites supplied real received-data fieldwork, and the owner accepted a **qualified early-pilot research closeout** by 14 October. **The original strict five-anchor Gate2 promotion was not PASSED.** WSSS/YSSY data are not “worthless” just because some SEND-billed items were not received; their **original accounting protocol failures remain failures**. Prospective new science acceptance rules must be versioned and justified, not used to falsify historical ledgers.

## The 90-second explanation for colleagues

- **What:** Paid, bounded real AeroDataBox Flight Alert subscriptions at multiple airport sites, first as limited tests and later qualifying Stage1 windows, to measure transport/identity/source feasibility and site-specific yield.
- **Why:** An airplane API may bill SEND even when our webhook is down; our server's request counter may count batch payloads rather than physical flights; a successful POST tells us little about sample selection or target/label validity.
- **How:** Frozen one-run AUTH+budget, Replit receiver, callback raw-original readback hashes, PostgreSQL persistent and transient state, provider credit balance and exact-owned DELETE, scientific identity + per-site candidate metrics, independent failure/incident reports.
- **When:** Historical named examples from **Sep16 OMAA**, **Sep21 WSSS**, **Sep25–26 MMUN**, **Sep29–Oct3 WSSS/OMAA/SKBO**, and **Oct13 YSSY**, closed with qualifications **Oct14**.
- **Where:** [Reports](reports/) · [Incidents](incidents/) · [Amendments](amendments/) · [Runbooks](runbooks/) · [all reports index](ALL_REPORTS.md) · [historical ledger](../evidence/README.md).
- **What next:** Separate **Phase3/Gate3** tests current production one-subscription/independent-watchdog operations, not yet another Phase2G validation. [Phase3 README](../phase3/README.md).

## The fieldwork scorecard — do not confuse “pilot observed” with “formal gate approved”

The following **five-site** closeout is from [2026-10-14 Gate2 evidence and decision](reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md). Each entry refers to a completed historical observation; “yield” denotes the recorded specific official metric where it exists, **not guaranteed global arrivals/departures coverage**.

| Site / historic probe | Approximate observed Stage1 span | Original credit reconciliation | Recorded official capacity / yield | How to communicate accurately |
| --- | --- | --- | --- | --- |
| **WSSS / 11** | ~2h uncensored | MATCH | **160.498 items/hour**, ≥60 project capacity screen | Accepted reference; **older P2G06 WSSS was a different, one-credit-gap run** |
| **OMAA / 12** | ~2h uncensored | MATCH | **73.999/hour**, ≥60 | Accepted reference; earlier Sept16 OMAA P2G03 was also historically successful |
| **MMUN / 14** | ~2h uncensored | MATCH | **22.999/hour**, below 60 | Real received observations; **not eligible as capacity anchor** under that screen |
| **SKBO / 15** | ~2h uncensored | MATCH | **150.498/hour**, ≥60 | Accepted reference |
| **YSSY / 19 (P25)** | **7203.639s** uncensored (~120.06 min) | **DELIVERY_GAP: 231 external vs 229 internal** | Official score **NULL**; descriptive 114.442/hour, not a scoreable promotion metric | Verified source and real observations; original frozen strict protocol **FAILED**; qualified secondary research candidate separately |

**Historical nuance:** The WSSS P2G06 one-credit gap was earlier than WSSS probe 11's successful reference. The OMAA Sept16 report retains a `P2G02` filename but actually identifies AUTH **P2G03**/durable probe 2. Report file names, AUTH IDs, budget day IDs, SQL `probe_id`, and airport codes are different identifiers—never join them by guessing.

## Where the numerical discrepancies came from

Define `external SEND-billed items = provider stable pre/post balance debit`, `internal received items = sum(costCredits) over verified original persisted callbacks`, `gap = external - internal`, and `credit capture = internal / external`. Data-cost arithmetic is auditable, **but a charged item is not automatically one distinct missing physical flight**.

### WSSS P2G06, 21–22 September

[Exact reconstruction](reports/2026-09-21_P2G06_WSSS_RECONSTRUCTION.md) inspected **36 original SHA-verified payloads (282,218 bytes)** and found **219 flight items**, **134 reconstructed physical-flight identities** and **93 registrations**. The provider's balance declined by **220 Alert credits**: `220-219=1` unaccounted billed credit, credit capture **219/220 = 99.54545%**. There were **zero explicit cost-vs-item discrepancies in the 36 received originals**. That combination is evidence of a missing charged SEND/delivery or other unreconciled provider interval item, not zero science. It does not prove the missing item's specific flight, reason, or effect on delay inference. It also does not contradict that a *later* WSSS window successfully passed its own accounting screen.

### YSSY P25, 13 October

[Original P25 report](reports/2026-10-13_P25_YSSY_120MIN_COMPLETED_PROTOCOL_FAIL_RESEARCH_CANDIDATE.md) and [14 October independent closeout](reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md): **58/58 original bodies hash+size checked (308,832 bytes)**; **229 durably received notification items**, **107 physical-flight identities**, 58 successful HTTP requests with **0 recorded callback failure** in the receiving source. The independent final account/reconstruction records **231 externally billed** items. Ratio **229/231 = 99.13420%**, *billed-credit capture* not measured complete airport coverage. The full scientific observation interval was **7203.639 seconds**. The original paid owner's exact-candidate rule was `PROBE_DELIVERY_COMPLETENESS_FLOOR_V39 = 1`, so P25 terminal **FAILED/DELIVERY_GAP** despite useful received evidence. A GitHub Actions **safety** job reported success independently; that is **not** proof the paid owner's scientific gate passed. Provider reason for the two billed-but-unobserved items remains unproven.

## Failures, causal classification, genuine fixes

| Class | Historic example | Explanation and corrective lesson |
| --- | --- | --- |
| **Ingress/infrastructure** | Temporarily unreachable callback and Replit development/published deployment differences | Verify publicly reachable exact receiver/secret/session rather than infer availability from app deployment label. Sep16 OMAA preflight **correctly BLOCKED**, then passed when health was proven. |
| **Provider billing vs HTTP** | WSSS 220/219; YSSY 231/229 | AeroDataBox bills **SEND flight items**; callback may not arrive or may arrive with retries. Keep separate cost-ledger and received-original-ledger and disclose gap; do not infer that every charged item has a persisted webhook. |
| **Scientific identity/measurement** | MMUN physical identity collision, marketing callsign vs actual operating flight and normalized repeated leg | A successful transport/data count can still produce an invalid **flight identity**. Quarantine ambiguous rows and use physical flight identity contract; do not promote an apparently large but conflated sample. |
| **Run/process reliability** | Replit worker/owner restarts, webhook response duration, callback-only deployment and provider notification backoff | Preserve durable source before 2xx ACK; make clean recovery explicit, watchdog independent, avoid automatic ambiguous second CREATE, test restart faults on disposable PostgreSQL. |
| **Account/operator timing** | Stale plan balance, provider quota, 3-minute retry confusion, window miss and branch SHA drift | Freeze exact UTC, API entitlement, one-run session and source SHA; distinguish 6+6 callback delivery attempts (policy) from **new subscription CREATE retry** (forbidden). |
| **Scientific comparability** | Reference scheduled vs observed ADS-B movements; unequal airport selection/replay windows | Prospectively define which construct and denominator are being ranked. A complete observation interval at a low-yield airport does not prove good anchor capacity. |
| **Documentation/coordination** | Two historically competing “canonical” Phase2G indexes; repeated QA sessions, hundreds of history files | Keep original Git blobs intact but designate one **current** phase overview, dated runbook and issue checkpoint, and archive/sort historic claims without treating old labels as current authority. |

The [complete root-cause/failure register](reports/2026-09-26_PHASE2G_COMPLETE_FAILURE_ROOT_CAUSE_AND_PREVENTION_REPORT.md), [current failure matrix](FAILURE_REGISTER_AND_PREVENTION_MATRIX.md) and [scientific validity/error register](SCIENTIFIC_VALIDITY_REQUIREMENTS_AND_ERROR_REGISTER.md) provide deeper per-incident evidence and fixes. **Do not simplify every incident to “Replit outage” or every mismatch to “bad data.”**

## Scientific interpretation, uncertainty and why perfectionism cost time

There are **three distinct decisions**:

1. **Operational/account safety**: the right account, source, subscription ID, bounded spend/stop and preserved original evidence. A missing exact-owned DELETE or ambiguous CREATE is a **hard HOLD** regardless of whether some data look useful.
2. **Original frozen paid instrumentation result**: exact billing equality, required uncensored window, source custody and recorded metrics. A positive gap correctly remains **DELIVERY_GAP**, and later discussion cannot retroactively turn that original test green.
3. **Scientific usability of valid observations**: fit-for-purpose interpretation, including *how much* missingness, *which types* missing, independent denominator, bias and sensitivity. Under a separately proposed exploratory screen, `positive gap <=2` **and** `gap/billed <=1%` plus source/identity/settlement conditions can qualify a verified dataset **for review**, without granting a formal instrumentation PASS or asserting MCAR.

The user's criticism of binary “everything failed” descriptions was justified when they erased genuine valid source observations. But **the converse is also false**: statistical tolerance is not a waiver for a wrong physical identity, missing original source, unknown billable subscription, biased flight denominator or code pretending all eligible flights arrived. [NIST fitness for purpose](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html), [STROBE missingness and sensitivity reporting](https://www.strobe-statement.org/checklists/), [Rubin's missing data framework](https://dash.harvard.edu/entities/publication/73120378-8764-6bd4-e053-0100007fdf3b) and [AeroDataBox send billing](https://aerodatabox.com/flight-alert-api-2026/) are better references than an invented universal 0% loss requirement.

**What genuinely took effort:** real source SHA custody, nonlinear/duplicate flight identity, transient vs durable SQL, independent provider account reconciliation, retention and callback ownership, time-window comparability and unexpected partial acknowledgments. **What we would shorten:** repeated full P25 CI for an unchanged failed record; introducing many parallel draft amendments/runbooks without current status index; dozens of speculative reliability changes before a single dedicated actual Gate3 canary; recoding the same small-gap question as if it automatically invalidated all derived research. Each code hardening should respond to a reproduced P0 risk with a minimal test and checkpoint; otherwise defer.

## Original gate disposition and forward scientific plan

The [Oct14 owner-approved qualified early-pilot exception](amendments/2026-10-14_APPROVED_PHASE2_QUALIFIED_EARLY_PILOT_EXCEPTION_AND_PHASE3_BOUNDARY.md) **closed five-site fieldwork administratively**, allowed Phase3 *engineering* to proceed, but did **not** retrospectively pass the frozen five-anchor Gate2 promotion. As a *future prospectively amended* study the four proposed anchor hubs are **WSSS, OMAA, SKBO, YSSY** plus independent MID/MID/REGIONAL sites. **MMUN** is preserved as studied context, not promoted to a main capacity hub. Full prospective Phase5 sampling/credit/denominator freeze is still ahead. Phase3's current WSSS one-shot canary is an **engineering safety test**, not a rerun of P2G06 or P25, and has separate AUTH.

### How to find original sources without getting lost

| Location | Use |
| --- | --- |
| [All reports — 58 originals](ALL_REPORTS.md) | Start with dated original title; group by technique/failure |
| [reports/](reports/) | Measured WSSS, OMAA, MMUN, SKBO, YSSY reports, P25 results and approved closeout |
| [incidents/](incidents/) | Historical operational failures, raw evidence preservation and retention obligations |
| [amendments/](amendments/) | Proposed vs prospectively approved protocol changes — read original approval status |
| [runbooks/](runbooks/) | Dated historical execution plans; **not** automatically executable under current production |
| [legacy-lowercase index](legacy-lowercase/README.md) and [legacy-uppercase index](legacy-uppercase/README.md) | Two separately preserved September “canonical” sources; do not collapse on case-insensitive macOS or silently replace |
| [shell-only guardrail](operations/OPERATOR_SHELL_ONLY_GUARDRAIL.md) | No Replit AI Agent, no unreviewed paid actions, owner-directed shell operations |
| [58+ other artifacts](../evidence/README.md) | Original ledger, provider/source custody proofs and audit trail |
| [Phase3 current](../phase3/README.md) | One-time **new** WSSS Gate3 safety canary and future Gates0.5/4 |
| [Wave B 460-file manifest](../../docs/repository-maintenance/manifests/2026-10-15_WAVEB_ACTUAL_460_BLOB_RELOCATION.csv) | Old physical paths moved to `data-collection` with original Git blobs intact |

### Source-integrity rule

The 32 historical authorization records and original scientific/report evidence remain **historical**, not permission to perform new paid experiments. Their legacy `SEPmd/` and `artifacts/` strings are intentionally unchanged for SHA custody. The Oct17 Gate3 AUTH is a new separately reviewed and SHA-pinned file; it authorizes one bounded future exposure only if the real receiver, provider account and independent watchdog are ready.

**Bottom line for a presentation:** “We collected real multi-site aviation data, found site-specific rates, isolated small charged-vs-received losses, preserved the exact original records, fixed identity and reliability mechanisms, and separated qualified research use from strict accounting validity. We did *not* certify a global population or complete the main ML experiment.”
