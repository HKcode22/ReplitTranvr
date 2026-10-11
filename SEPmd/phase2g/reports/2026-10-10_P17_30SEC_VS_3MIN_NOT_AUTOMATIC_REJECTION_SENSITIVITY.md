# P15/P17 — 30 seconds versus three minutes of Replit health uncertainty: no magical bias threshold

Date: October 10, 2026 (PDT). Isolated draft `phase2g-p2g24-github-observer-20261009`; NOT deployed, merged, approved for paid collection or used to rewrite the frozen original V3.9 F.8 experiment.

## User's correction to the earlier strictness

The user correctly argues that a 30-second interruption might hide important flight delays just as a 3-minute outage might, and 117 observed minutes during a 120-minute scientific pilot might be worth preserving. The earlier blanket implication that a 3-minute gap is especially scientifically catastrophic **cannot be supported without source-level evidence and a defined research estimand**. This is a good reason to consider a prospectively frozen **6 primary + 6 emergency health-check** tolerance and to keep observed partially censored data, NOT grounds for silently declaring original all-data F.8 scientific success.

The important distinction is:

1. **Health-check availability:** three failed 15-second GET/ping checks do not themselves prove any AeroDataBox POST was lost. A green GET does not establish every sender POST was received.
2. **Delivery completeness:** source-authenticated original AeroDataBox sending/attempt ledger vs exact observed delivery/item source identity, including billable per-flight-item credits.
3. **Scientific impact:** which eligible confirmed physical flights' departure-delay outcomes were missing and whether missingness depends on time/airport/delay. Bias cannot be inferred solely from fraction of elapsed health-check uncertainty.

### Pure time-coverage arithmetic (NOT paid source completeness)

| One uncertain interval | Length | Time observed in 120m | Time-covered percentage |
|---|---:|---:|---:|
| One failed check envelope | 30s | 119m30s | 99.5833% |
| One minute | 60s | 119m | 99.1667% |
| Two minutes | 120s | 118m | 98.3333% |
| Three minutes | 180s | 117m | 97.5000% |
| Five minutes | 300s | 115m | 95.8333% |

There is **no industry-wide 30-second, 3-minute or 5-minute validity rule** for a time-indexed dataset. Google SRE's [Embracing Risk](https://sre.google/sre-book/embracing-risk/) defines *service* error budgets, while its [availability guidance](https://sre.google/sre-book/availability-table/) explicitly explains why operation-weighted failures are usually preferable to downtime alone when traffic is uneven. An SRE availability budget is not itself scientific missingness acceptance for runway delays.

The U.S. National Academies' [Missing Data: Conclusions and Recommendations](https://www.nationalacademies.org/read/12955/chapter/8) recommends preserving observed data, documenting missingness and conducting sensitivity analysis under transparent assumptions. Its [Sensitivity Analyses chapter](https://www.nationalacademies.org/read/12955/chapter/7) discusses departures from MAR toward MNAR and how estimates can depend on missing values. These principles transfer to scientific monitoring but **are not a rule that a specific flight-data loss percentage must pass**.

### Direct outcome-sensitivity illustration, NOT actual YSSY observations

Suppose 117 real eligible flights have a mean delay of 5 minutes, and the original authenticated sender has independently proven exactly 3 eligible flights missing. Under an illustrative—not scientifically proven—outcome support `[0,120]` minutes, the complete 120-flight mean might range from `(117×5+3×0)/120 = 4.875` to `(117×5+3×120)/120 = 7.875` minutes. This means the upper hypothetical mean can exceed 5 minutes by 2.875 minutes **even if the missing items happened inside a 30-second interval**. This is not a claim all YSSY delays are bounded at 120 minutes; a 500-minute upper support would change the upper mean to `17.375` and the shift to `12.375` minutes. We have no license to use any empirical bound without external justification.

Conversely, an independently evidenced three-minute health outage **with zero missing provider flight items** has no item-count loss in that interval, regardless of health availability. This does not automatically establish other F.8 science gates, but it is much better evidence of continuity than an HTTP GET alone.

If the authoritative missing-item count is UNKNOWN, no finite or meaningful source-completeness bound follows solely from `117/120` time coverage or the Replit database's number of received rows. Inferring source loss from a stable Poisson rate or preceding traffic would require disclosed assumptions and would not be factually exact without provider evidence.

### Historical WSSS caution

Different WSSS runs existed. One past recap describes two consecutive callback health failures before recovery on the following watchdog check, but other WSSS probes did not have the same health pattern; an older P2G06 WSSS study had healthy GET/watchdog checks yet **220 external Alert credits** with unmatched internal reconciliation and was classified failed/MISMATCH. We should not interpret the cited **30 seconds as known lost AeroDataBox source**, nor confuse watchdog GET retry/checks with provider's separately billed delivery retries (kept `maxDeliveryRetries:0`). Verify any single WSSS example from immutable corresponding probe/run and UTC log before claiming exact send continuity.

## Implemented, verifiable tests, zero cost

- `experiments/phase2g_rehearsal/synthetic_short_vs_three_minute_gap_impact_v39.ts` calculates exact union of health-uncertainty intervals within an immutable 7200s window; attributes overlap to all eight 900s bins without counting overlapping health spans twice. 30s, 60s, 120s, 180s, repeated 30s intervals; population mean sensitivity **only when authenticated external sender/flight-item identities and assumed outcome range are explicitly supplied**. Produces `null` missing flight count and `null` sensitivity without that proof.
- `tests/phase2g_synthetic_short_vs_three_minute_gap_impact_v39.test.ts` includes 16 direct parameterized/offline tests: both 30s and 3min unknown source, all four durations, zero-missing item full provenance, 30s 3 high-delay missing vs 3min zero, 1-item 3min scenario, per-15m bin boundary, overlapping interval union, repeated separate incidents, tampered source, invalid support and permanent `paidLaunchAuthorized:false`/F.8 false output.
- Existing `synthetic_multi_episode_six_plus_six_v39.ts` remains a **prospective** two-tier per-outage reset/cumulative whole-run time-budget design. A new distinct outage gets six primary attempts plus six source-gated emergencies; a single green health cycle during flapping cannot reset them. At least one prospectively documented cap is necessary to avoid unlimited incidents and unbounded paid exposure. The model is not wired to the paid supervisor.

**Verified CI:** [GitHub Actions #38108316525](https://github.com/HKcode22/ReplitTranvr/actions/runs/38108316525) at tested SHA `9a0a0a0b252206f81ed4f0accf521806d5fd89f1`: **BOTH jobs SUCCESS**, **549/549 offline tests (53 suites) +55/55 real disposable PostgreSQL16 integrations**, true PostgreSQL SIGKILL reconfirms UNLOGGED state loss.

## Decision and near-term independent evidence

A **three-minute individual transient-health tolerance is worth a formal prospective science/risk amendment**, not an inherently prohibited dataset. A proof-based **complete-source receipt** can be accepted for further F.8 science adjudication even with failed GETs; independently quantifiable partial item loss could support an explicitly censored/subset scientific result. A no-provider-ledger unknown gap still cannot be certified as complete, even if it is 30 seconds. Scientifically legitimate observed rows should be preserved under proper source/privacy rules, rather than dismissed by default.

Operational 6+6 extended monitoring might be possible **only** with explicitly frozen maximum billable exposure, source/callback confidence, known single-owner protection and automatic hard-stop on uncertain cleanup/credit ceiling. Paid owner still defaults legacy three-strike; selecting candidate is refused because deployed verifier is absent. A true fixed external HTTPS front-door, authoritative sender source and original 260/259 reconciliation remain release blockers; three Replit backend URLs alone do not solve first-hop loss.

**No paid AeroDataBox calls, live production database reads/writes, cloud resource changes, Replit import/publish, Cloudflare or merge performed.**
