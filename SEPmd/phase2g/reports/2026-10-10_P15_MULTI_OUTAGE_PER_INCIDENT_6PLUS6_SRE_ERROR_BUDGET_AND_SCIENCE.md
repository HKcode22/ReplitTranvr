# P15/P17/P19 prospective review: 6+6 RESETS per outage, NOT per-run error-budget reset

Date: October 10 2026 Pacific. User's precise request: transient outage #1 may use up to **six primary + six emergency checks**; when a verified healthy receiver recovers, outage #2 starts again at **primary check 1** (not 2+6 or the remainder of the first episode). If eleven health polls fail but the twelfth is fully healthy, treat as potentially recovered rather than a twelfth failure. Also examine whether 3 missing minutes in a 120-minute observation destroy all scientific value.

**This is a zero-provider-credit, zero-production-write, no-Cloudflare, no-third-account, draft-only research proposal; it does NOT change frozen F.8 Stage-1, live paid supervisor (3-strike default; explicit 6+6 refused), published Replit, or historical P2G22/P23/P24 failed/censored status.**

## Verified industry precedents, NOT claims of universally accepted thresholds

- Google's SRE [error-budget policy](https://sre.google/workbook/error-budget-policy/) accumulates missed SLO exposure over a larger window and revises availability goals rather than requiring absolute 100% uptime; outage classes and multiple incidents count towards an ongoing budget. Its [SLO document](https://sre.google/workbook/slo-document/) explicitly warns a load balancer may not observe failed requests which never reached it. **For YSSY, PostgreSQL alone cannot prove all AeroDataBox sends arrived.**
- AWS [retries/backoff guidance](https://docs.aws.amazon.com/wellarchitected/2023-04-10/framework/rel_mitigate_interaction_failure_limit_retries.html) advocates bounded recoverable transient retries and warns of retry storms; [graceful degradation/circuit-breaker](https://docs.aws.amazon.com/wellarchitected/2022-03-31/framework/rel_mitigate_interaction_failure_graceful_degradation.html) discusses half-open trial recovery and closing a breaker after healthy probes. Health-check polls in this plan **ARE NOT** AeroDataBox billable delivery retries; latter remain frozen maxDeliveryRetries 0.
- The US EPA [data considerations](https://www.epa.gov/n-steps-online/data-considerations) and [quality assurance for air sensors](https://www.epa.gov/air-sensor-toolbox/quality-assurance-air-sensors) explicitly describe missed samples/equipment failure and measured completeness. Short gaps don't force discarding all observed data. But systematic missing observations can bias estimated relationships.
- Roderick Little's peer-reviewed [2021 review of missingness assumptions](https://www.annualreviews.org/content/journals/10.1146/annurev-statistics-040720-031104) and [longitudinal missing data review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3016756/) distinguish MCAR/MAR/MNAR and support preplanned sensitivity analyses rather than pretending unknown observations are present. A time-fraction gap cannot establish an item-fraction loss or an ignorable mechanism.

## Math and source fidelity

- 3 / 120 = **2.5% of elapsed time**, 117 / 120 = **97.5% time coverage**. This is valuable **observed exposure**, not a proof of a 2.5% ceiling on missing *flight items* or delay bias.
- Hypothetical extreme bias example: 117 observed flights at 5 minutes delay, but 3 unobserved flights at 120 minutes delay. Observed mean 5 minutes; true 120-flight mean (117*5+3*120)/120 = **7.875 minutes**, or a **36.5% underestimation relative to the true mean** even with only 3 missing flights. This is NOT actual YSSY, only why outcome-dependent missingness matters.
- If n external AeroDataBox billable items during the gap are not independently known, **missingFlightItems = unknown**; counting PostgreSQL callback rows as expected sent rows is invalid. Independent provider-origin attempt identity, per-flight-item billed cost, source UTC/raw SHA and 8 bins are needed to bound actual loss. The historical P2G22 260 vs 259 mismatch is STILL unresolved and cannot be accepted retrospectively.
- Original frozen 120min window, physical-flight-instance-v2/IsOperator eligibility, future-time split, exact cost ceiling, full 168h original source retention and cleanup must not be revised after seeing data. A new prospectively approved **censored exploratory analysis** can use 117 minutes with explicit dropout spans, without promoting it to original complete F.8 PASS.

## Recommended state machine for *prospective* 6+6

| State | Count | Interpretation / guard |
|---|---|---|
| Healthy | no active incident | Continue if owner, frozen budget and DB/source checks are valid |
| Primary incident | failed polls 1..6 | Consider bounded tolerance ONLY after frozen operator acceptance of worst-case blind provider spend; do not infer zero lost paid items |
| Emergency | failed polls 7..11 | Independent authenticated full source attempts/credits + original eight-bin replay, bounded queue and budget must be verified; otherwise STOP rather than silently blind-spend |
| Twelfth health probe successful | after 11 failed polls | **RECOVER episode**, not twelve failures; enforce ~180s total observed upper-envelope, authoritative source continuity and a stable full-contract health check |
| Twelfth health probe failed | 12 failures | STOP owned provider subscription and preserve source/credit evidence |
| Green GET without independent sender truth | half-open recovery | Require two consecutive full healthy probes to close health incident; mark source completeness **unknown/censored**, not a valid F.8 PASS |
| Next distinct incident | after verified health closure | Reset incident failure index to **1 of 6+6**, but NEVER reset *whole-run* cumulative exposure, number of outages or credit-risk budget |

A 15s polling schedule from a **previous healthy at t=0**, first failure t=15, failed probes through t=165, recovered probe at t=180 has a **3 minute potential unknown-delivery envelope**, though first-to-recovered health check separation is 165s. Observed failed GET does not time-stamp beginning or end of original provider POST loss precisely. Actual callback POST latency/time and upstream ledger are needed.

**Unlimited per-incident resets are unsafe**. For illustration only, a hypothetical pre-frozen model caps: max 180s fault envelope per episode, 360s aggregate, at most two outage episodes, plus a bounded blind-paid credit ceiling. These numbers are **test fixture values, not approved YSSY power-analysis or paid threshold**. Two three-minute episodes => 6/120 = 5% of elapsed time; 4 episodes => 12/120 = 10%, yet every individual incident could have passed a three-minute limit. A scientific missing-item cap per 15m bucket also needs to be independent of a mere time cap.

## Newly implemented (draft only)

`experiments/phase2g_rehearsal/synthetic_multi_episode_six_plus_six_v39.ts` implements synthetic multi-incident state transitions including an unchanged per-episode 6+6 allowance after recovery, **full-contract** healthy stabilisation, conservative failure exposure measured from preceding healthy-to-return, hard stop on an unknown scheduler gap, source-gated emergency, cumulative error-budget exhaustion, frozen maximum incident count, owner/budget hard-stop and explicit no original science/no paid launch outputs. A healthy POST GET does not authenticate external AeroDataBox receipt.

`tests/phase2g_synthetic_multi_episode_six_plus_six_v39.test.ts` exercises 12 cases including 4 failures -> recovery -> reset to new primary check 1, 11 fails then successful 12th health probe, 12 actual failures stop, half-open flapping *does not reset*, independent-source emergency precondition, multiple resolved outages consuming aggregate error budget, no unlimited episode count, hard identity failure, unauthorized billed risk, missed owner interval and explicit NO-paid/F.8-PASS.

The CI workflow now automatically tests both new files alongside prior 521 offline regressions and 55 real disposable PostgreSQL integrations. Live production handler, owner policy, subscription, callbacks, budget and user authorizations remain unchanged.

## Backup availability priorities (without new Cloudflare or charge)

1. Existing GitHub repository branch + pinned immutable source and offline CI are **software and reproducibility backup**, not incoming webhook durability.
2. Read-only direct PostgreSQL from existing GitHub owner can observe RECEIVED data and restarts independent of Replit HTTP; it cannot accept a provider's HTTPS POST.
3. Existing teammate Almabdella deployment should be independently checked for source revision, ownership/publish permission, correct HTTPS route, signed secret/DB binding and cross-app original raw bucket access **before** being considered a warm standby; currently those are unverified. A temporary `.replit.dev` workspace is not an always-on paid ingress.
4. Only after proven first backup and routing: a third Replit account may import the exact pinned GitHub commit without manually copying source, but creating it, paying for it or configuring production secrets needs user authorization and may create correlated Replit failure exposure.
5. Most importantly, one **fixed** AeroDataBox callback URL must deliver to a front door available when original hk84164 is down. Three backends without automatic front-door rerouting, three subscriptions or mid-experiment resubscription **do not** protect notifications already sent to hk84164.

## GO/NO-GO

The original P2G22/P23/P24 scientific freeze/retry rule remains intact; no actual next YSSY paid attempt is authorized. A future amended *censored* interpretation and 6+6 could be researched but needs original-source billing evidence, bounded credits, owner safety and formal prospectively frozen scientific review. **No paid YSSY launch from this file.**
