# Phase 5 — final design freeze and Phase 6 operational readiness

**Scope correction, Nov 6 2026 Pacific.** This is **Phase 5**, not a YSSY pilot or another Phase4 Gate5 test. Owner asks to move forward without concealing known scientific limitations. This document creates a coherent Phase5 readiness checklist; **it does not authorize Phase6 paid start, source-use extensions, or a retroactive Gate5 PASS**.

## 1. Phase ownership — keep work properly organized
- **Historical Phase2G / YSSY issue #28:** investigate old paid Alert SEND→receiver delivery gaps and specific Autoscale/UNLOGGED storage issues; optional separate one-flight future diagnostic **only after** deployed SHA, custody, provider source rights and credits/STOP are independently verified. See [Phase2G forensic and microprobe plan](../phase2g/2026-11-06_YSSY_DELIVERY_GAP_RECHECK_MICROPROBE_DECISION.md).
- **Phase4 Gate5 / issue #293:** original full scientific Gate5 HOLD; the Nov6 G5A on-time FIDS 3-horizon→POST schedule-revision pilot is authentic and complete **for that narrower measurement**. Optional targeted one-horizon physical-source/alert linkage check stays **in Phase4**, not Phase5. See [Phase4 residual scientific decision](../phase4/2026-11-06_GATE5_RESIDUAL_SCIENCE_ONE_HORIZON_TEST_DECISION.md).
- **Phase5 (this document / issues #344, #413, #300):** finalize and freeze what will be collected, source permissions, sample design, separate GHA producer and PRE pipeline, deployed receiver and budget safety, data quality/visibility, release manifest and first-day GO/STOP.
- **Phase6:** run the approved 31-day collection *only after* independent Phase5 freeze, then measure and improve operational reliability prospectively using versioned interventions and protected daily review.
- **Phase7:** train/validate only on lawful, source-qualified as-of PRE features and target-specific observed / censored labels. Outcome/receipt silence must not be a negative label.

## 2. Phase5 freeze checklist (not all passed as of Nov6)

| Requirement | Testable acceptance | State |
| --- | --- | --- |
| Sampling frame and stratification | Frozen airports/tiers/regions/UTC rotation, code-share/operator rules, source plan, genuine eligible physical legs separated from conditional keys, one-way train/test grouping | OPEN |
| 31-day manifest/calendar | Actual start date, per-day airport/service windows, T−24h/T−6h/T−90m exact owner trigger schedule, frozen allowed exceptions, versioned SHA; no retroactive scheduling | OPEN |
| GitHub-only FIDS producer→PRE | Real versioned FIDS original and source-hash, V0076 physical attempt before paid GET, V0077 binding, cutoff-safe PRE even with no webhooks/weather, bounded retries/cost ceiling, real POST audit | **PARTIALLY PROVED** by G5A; not 31-day producer |
| Alert provider subscription and receiver | Reviewed HTTPS+secret URL, exact currently deployed receiver SHA, raw-before-2xx custody, durable restart-safe originals, provider SEND reconciliation, safe STOP/DELETE/unknown CREATE protection | **PARTIAL**; source code fix PR412 merged, deployed/actual callback not certified |
| Optional ADS-B & NOAA | Provider terms/ODbL and as-of/weather issue clocks, optional source separately marked missing, per-flight positive identity linkage and legal usable evidence. No mandatory ADSB uptime or exact wheels-off claim | **RESEARCH ONLY** |
| Outcomes and missingness | Frozen separate target taxonomy: status terminal, comparable schedule revision, actual-only when truly observed, ADS-B takeoff *proxy* distinctly labeled; positive/negative/censored, nullable denominators and stratified bias/selection | PARTIAL |
| Lawful use / retention | Account-specific AeroDataBox normalized-record/ML purpose, source-specific technical expiry, backup removal schedule, no blanket permanent-Contents warehouse; free sources separately licensed | **OPEN** (issue #300, Nov7 terms) |
| Budget and independent safety | Provider current remaining REST/Alert credits, daily/total project ceilings, 6+6 callback health, protected reserve and unknown CREATE safety, incident review, actual STOP/DELETE, no duplicate paid dispatch | PARTIAL |
| Protected real-data visibility | A secured schema/record explorer showing only currently permitted columns/rows, as-of availability, source/horizon, null-rate, reason for censor, cohort partition and logged provenance | NOT YET DEPLOYED |
| Pre-start final independent review | All acceptance evidence on real reviewed source/manifest, no missing P0 safety blocker, signed explicit Phase5 FREEZE and separate Phase6 GO/first-day monitor | **NO-GO** |

## 3. Manage the 31-day study with scientific comparability and honest improvement

**Freeze a constant estimand and measurement contract**, not every possible operating detail. Freeze source frame and primary outcome definitions, eligibility, PRE cutoffs, sampling probabilities, source clocks, feature observation availability, legal rights, and train/test grouping before Day 1. Every day records real planned/attempted/successful source requests and normalized independent flights by airport/tier/UTC, every eligible/pre-written PRE, webhook active/SEND/received/inside/outside/unresolved, AIRBORNE eligible→observed→linked→usable, POST positive/negative/pending/censored, and cost/incident/rights expiry. A source with **no data** is missing/unknown, not a negative event.

**Allow** documented reliability repairs and instrumentation improvements prospectively. Every change gets a collector SHA, effective UTC, protocol version, affected rows and audit, never changing past PRE snapshots. If change alters inclusion, target definition, selection probability or provider feed, preserve a new analysis stratum and reassess its representativeness. Day 1–30 cannot be pooled as if a new source or label class had always existed. Evaluate late days on separately held-out time/operated legs; do not let repeated horizon versions leak across splits.

**Automatic safety STOP rather than normal missingness:** provider source-use violation, unbounded paid credit exposure, wrong published receiver SHA, raw persistence failing before 2xx, unknown provider CREATE without safe reconciliation, cross-flight identity collision, no legal source/PRE eligibility or lost source cutoffs. **Tolerable quality issue with explicit NULLs**: small measured callback gap, optional weather or ADS-B coverage loss, absent final status for some flights or individual censoring while core durable source and time windows remain valid.

**One paid experiment is not an estimator:** if a one-event delivery succeeds and no failures are seen, with iid Bernoulli assumptions a one-sided exact 95% binomial upper bound on failure probability is 95%, because (1-p)^1=0.05 implies p=0.95. It proves the tested path can work once, not that month-long outage risk is low. Independently track multiple observed provider SENDs and RECEIPTs with denominators only during authorized live collection.

## 4. Concrete next Phase5 work (without waiting for old pilot closure)
1. Implement separate GitHub-only Phase6 FIDS schedule using the proven G5A producer, with a frozen time/airport matrix and hard credits/one-shot idempotency. The Phase6 alert watchdog does NOT perform FIDS; do not assume Alert subscriptions automatically populate PRE.
2. Implement and test versioned exact source→flight identity crosswalk with quarantine for marketing/ambiguous aliases, consistent across FIDS, webhook and optional ADS-B.
3. Build authenticated, strictly rights-filtered data explorer and daily denominator/missingness scorecard; output source columns with NULLs, not fabricated values, and legal expiry.
4. Verify live deployed receiver callback before any first subscription, independently test restart-safe storage, and only then consider separately approved low-credit one-flight proof in its owning Phase2G or Gate5 issue.
5. Audit account-specific use / retention and actual provider balance; produce frozen manifest, per-day budget and independent Phase5 GO/STOP release decision.

**Source standards:** [STROBE](https://pmc.ncbi.nlm.nih.gov/articles/PMC2636253/) observation reporting (denominators/missingness), [TRIPOD+AI](https://www.bmj.com/content/385/bmj-2023-078378) model transparency (general principles, not aviation certification), [AeroDataBox terms](https://aerodatabox.com/terms) account-specific Content use, [ADSB.lol docs](https://api.adsb.lol/docs). These references do not override actual frozen f.8/[Amendment B](../plans/V3.9_f.8_Gate5_Amendment_B_20261102_Restore_Scientific_Acceptance.md).

**Decision:** Phase5 nonpaid implementation GO now; Phase5 formal FREEZE NO-GO pending criteria; Phase6 paid activation NO-GO. Do not confuse that with discarding the completed Phase4 FIDS pilot.
