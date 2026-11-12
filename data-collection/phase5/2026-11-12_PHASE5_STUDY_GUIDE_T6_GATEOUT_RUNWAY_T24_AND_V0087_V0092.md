# Phase 5 study guide — what we predict, gate-out vs runway, and V0087–V0092

**Nov 12, 2026.** Learning/reference text based on current repo code and canonical [Amendment E](2026-11-11_AMENDMENT_E_CANONICAL_TRAVELER_PREDICTIONS_C_D_FREE_ADSB.md), not an independent scientific target-freeze, permission to train on proprietary Contents, a Phase 6 activation, or a report of real model accuracy.

## The exact intended traveler question

**At six hours before a flight's original selected scheduled departure (T−6h), how many minutes before/after the original scheduled GATE departure will the aircraft actually leave the gate?** The preferred research outcome is a signed continuous value, not just delayed yes/no. In the simplest paired **verified same-milestone gate** case:

- Original scheduled gate-out **14:00**; T−24h predictor at 14:00 previous day, T−6h at 08:00, T−90m at 12:30, all anchored to the original selected T.
- Actual gate-out eventually **14:42**; observed outcome is **+42 minutes**. A T−6h *forecast* of **+30** would have a numerical signed error of −12 minutes versus the observed +42, absolute error 12. Forecasts can instead express median and calibrated 10–90% intervals and probabilities of delays ≥15/30/60/120 minutes; none are trained or validated yet.
- T−24h is the early comparator; T−90m updates that same flight's estimate with only *new information actually available* by its own issue time; T−6h is the leading first-cycle candidate. At each issue time, no later POST, revised schedule or airborne trajectory can be inserted into old PRE features.
- **Continuous** = minutes can be negative (early), zero, 12, 42, 105, etc. **Conditional on operation** = calculate delay for a flight that truly operated; cancellation is a distinct probability/outcome, not zero delay.
- **AIRBORNE ETA** = separate after-takeoff forecast of arrival (UTC) with uncertainty, using authenticated position information available after takeoff. Not a T−6h feature.

## Gate versus runway: two different timestamps

Using the same example, scheduled GATE out 14:00, actual GATE out 14:42, actual WHEELS-OFF 15:03. Taxi-out from gate to runway is 21 minutes. If an INDEPENDENTLY VERIFIED scheduled RUNWAY wheels-off were 14:15, then **runway delay = 15:03 − 14:15 = +48 min**. Do not calculate 15:03 − 14:00 = 63 and call it actual gate delay; that includes taxiing.

**Authoritative external definitions:** [FAA ASPM Individual Flight Variables](https://www.aspm.faa.gov/aspmhelp/index/ASPM__Individual_Flights__Definitions_of_Variables.html) explicitly distinguishes scheduled/actual gate-out, scheduled/actual wheels-off and signed gate departure *difference* from nonnegative *delay*. [FAA off-block/actual takeoff definitions](https://cdm.fly.faa.gov/faq/submitting-terminal-flight-data-tfms) distinguish actual off-block (pushback/taxi from parking) from actual takeoff (airborne). [US BTS on-time performance](https://www.bts.gov/explore-topics-and-geography/topics/airline-time-performance-and-causes-flight-delays) bases reported departure punctuality on the **gate**; BTS actual coverage is limited to eligible US domestic reporting, not a worldwide WSSS/YSSY source.

**Important project distinction:** older Gate 0.5/Gate 5 [runway-delay reviewer](../../server/lib/disruption/gate05RunwayDelayLabelAudit_v39.ts) is scheduled-**runway** versus actual **wheels-off**. The new [Amendment E gate-out candidate](../../server/lib/disruption/phase5AmendmentEGateOutDelayLabel_v39.ts) is scheduled-**gate** versus actual **gate-out**. [Existing ADSB.lol research](2026-11-09_ADSBLOL_PHYSICAL_DEPARTURE_LABEL_ERROR_RESEARCH_PROTOCOL.md) may offer an **estimated takeoff proxy**, not a direct gate-out and not a universally actual wheels-off time. Do not merge the timestamps or rename source estimates as actual.

## What does “externally attested” mean?

It means that a separately reviewable **real** source (airport/operator source or explicitly supported semantics with real flight observation), not just our own self-reported boolean, can justify: (1) original selected time actually describes scheduled **gate-out**, (2) outcome actually describes **actual gate-out**, (3) both belong to the same confirmed physical operating flight/airport/date, (4) source was available by each prediction issue time, and (5) retention/ML purpose is permitted. A Git SHA proves file *integrity*, not physical identity, time-field semantics or data rights. A general AeroDataBox `departure.scheduledTime.utc` may be a schedule value **without independently verified gate-out meaning**; `revisedTime` or `runwayTime` alone must not be silently promoted to actual gate-out.

If those facts are unverified, keep a valid PRE for descriptive data/missingness and mark its actual gate-out label **UNKNOWN**, rather than pretend +0 or call wheels-off a gate-out. Conversely, missing gate-out data for some flights does **not** invalidate all observations; report outcome coverage, flight identity tiers, and selection bias honestly. The **preferred gate-out primary remains a conditional candidate**, not a frozen source-validated universal target. A physically distinct target or provider schedule-revision outcome requires its own prospective independent decision before looking at protected results.

## What actually lives in PostgreSQL V0087–V0092?

These are **migration numbers**; they are NOT six separate flight tables.

| Version | Simple description | Real technical mechanism |
| --- | --- | --- |
| V0087 | Durable checklist of flight×horizon PRE jobs, even if a GitHub worker exits | `clean.phase5_cd_pre_task_v39` plus lease/claim, ACK/reap functions, immutability trigger; unique operating flight+horizon |
| V0088 | No unauthorized PRE at a missed cutoff or with a stale owner | Atomic Stage14 PRE write guard tied to V0087 claim/fence and true PostgreSQL clock |
| V0089 | Keep the guard/trigger owned by locked privileged identity | Restricted NOLOGIN function/guard owner; no arbitrary application grants |
| V0090 | Give reviewed PRE worker narrow queue function calls, no direct table editing | Four existing claim/start/ACK/reap functions commissioned under restricted NOLOGIN owner with PRE group EXECUTE |
| V0091 | Enroll a real eligible flight into V0087 queue | PREPARE-only SECURITY DEFINER source registrar validates original V0079 binding, FIDS primary population member, flight/native T, real response hash, source expiry/as-of and own future cutoff |
| V0092 | T24 cannot steal T6/T90 job, or vice versa | `claim_signed_roster_v39(packet_hashes,horizons,owner,limit,lease)`, scoped to exact signed SHA+horizon; revoke broad unscoped claim permission |

**As of the owner's November 12 Replit Shell output:** V0087–V0092 are installed in team `neondb` PG16, V0092 status `V0092_SIGNED_PACKET_HORIZON_CLAIM_COMMISSIONED_INERT`, zero task rows, zero provider calls, no GH workers enabled. **Never reinstall.** The existing C+D T24 witness scheduler, T6/T90 worker and recovery watchdog have merged code but remain stopped until independently signed authentic future evidence, rights and pilot release. Earlier source→candidate reviewer, packet-dossier, one-GET collector, future POST and receiver code is reused; not proof that the real 31-day chain has yet run.

## The minimum next research experiment

One real prospective airport/flight, legitimately source-bound through V0079, source review and immutable packet, then queued T24 → independent V0081 witness → T6/T90 when genuinely possible → real POST and REST+Alert/receiver/STOP reconciliation. Bounded missed horizons are recorded as missingness. The 31-parent-day sample run belongs to Phase 6, **not** a mandatory 31-day rehearsal in Phase 5. Before paid Phase6 GO independently decide label feasibility, exact source use/TTL/backup rights (#300), current budget, airport schedule and safe recovery. All owner paid approvals are noted, but no account-specific Contents rights may be invented.

**Current project state: scientific Phase5 FREEZE HOLD; Phase6 paid GO NO.**
