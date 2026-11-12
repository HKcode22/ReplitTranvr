# November 12 — optional four/five/six PRE horizons: full-ledger cost sensitivity, not a paid approval

**Owner preference:** If real budget plus genuine feature/label coverage support it, favor more useful horizon updates instead of remaining locked to three by habit. Conversely do not add 4/5/6 merely because the account has a 50k/60k maximum or because each extra logical planning group looks cheap. **ONE canonical Amendment E**. No V0087–V0092 migration/role reinstallation, no new paid provider, no new airborne vendor.

## Actual work completed in this branch

A deterministic **offline** evaluator, [`phase5OptionalHorizonTierBudget_v39.mjs`](../../server/lib/disruption/phase5OptionalHorizonTierBudget_v39.mjs), compares tiers:

| Tier | Base and optional prediction issue times | Additional logical airport×segment×horizon groups |
|---|---|---:|
| Current **3** | T−24h, T−6h, T−90m | 0 |
| Optional **4** | above + **T−3h** | 136 |
| Optional **5** | above + **T−3h, T−12h** | 272 |
| Optional **6** | above + **T−3h, T−12h, T−45m** | 408 |

These are **hypotheses**, not a scientific finding that T−3h/T−12h/T−45m improve traveler predictions. The sixth's T−45m may be too late for some travelers or already after actual off-block for early flights; test that independently. The current f.8 plan's 31 parent batch-days have **34 active segments and four airport slots**; three horizons imply 408 logical source groups, four 544, five 680 and six 816. The change **does not generate/activate any new PRE due task**.

## Do not confuse source planning groups with charged REST calls

A single FIDS airport time-range request may cover multiple eligible flights; pagination/partition/refresh/source-age can multiply actual calls. Input to the estimator is the **physical GET count assumed for each new horizon**; it never infers paid calls from 136 logical groups. The current plan treated ordinary FIDS as **Tier 2 / 2 API units per physical request**, subject to live provider/account verification. For illustration only:

| Assumed new GETs per additional horizon group | Four-horizon incremental REST | Five-horizon incremental REST | Six-horizon incremental REST |
|---|---:|---:|---:|
| 1 | 272 units | 544 units | 816 units |
| 4 | 1,088 units | 2,176 units | 3,264 units |

This is not a full-cycle spend quote, live provider call tally, or recommended refresh frequency. The 50,000 project **cycle** cap is lower than the observed grandfathered 60,000 **subscription entitlement**; 60k does not automatically authorize spending 60k. The project still needs up-to-date charge cycle, remaining quota, seven separate REST spending categories, startup/burst/transport retry reservations, physical POST recovery and Event/Flight Alert SEND credits.

**Full arithmetic** of the new helper:

- Spendable REST now = **min(max(0, project-cycle ceiling − project-cycle already-used units), provider-reported remaining units)**.
- Project reserved future REST exposure = baseline FIDS + all other REST categories + POST outcome recovery + retries/diagnostics + explicit approved Alert refill REST-unit conversion + protected REST margin.
- Four/five/six tier incremental REST = **total assumed new physical FIDS GETs × verified per-GET cost**. A tier fits mathematically only if *the entire reservation including margin* is ≤ spendable REST.
- Flight Alert SEND credits are a separate resource: **expected SEND credits + protected alert floor − actual available Alert credits** is the nominal refill need. The comparison to approved REST refill units is nominal and **does not certify the real account's current conversion rate, refill approval, provider contract or balance**. One more PRE snapshot **need not** trigger an additional Alert subscription/SEND.
- The helper always returns **`phase6PaidGo:false`**, **`extraSignedQueueHorizonPermitted:false`**, no provider calls or DB writes; it will not silently convert hypothetical input figures into live approval.

The [five-horizon earlier source-backed rationale](2026-11-12_HORIZON_LITERATURE_FIVE_HORIZON_BUDGET_AND_PHASE7_INFERENCE.md) and [independent current Phase6 cost/deadline audit](2026-11-10_INDEPENDENT_PHASE6_PARALLEL_AUTOMATION_DESIGN_AND_BUDGET_AUDIT.md) remain authoritative for their measured versus illustrative distinctions.

## Why adding horizons still needs real engineering and a source measurement

**We can implement it, but cannot assert it is feasible merely from the monthly limit.** Existing `PRE_HORIZON_OFFSET_MIN`, V0087 horizon CHECK, V0091 registration, V0092 signed queue claim, Stage14/GH packet schemas, cutoff-safe source refresh, T24 prerequisite/witness protocol, scorecards, 31-day frozen calendar and budgets were written for the exact **three** original horizon strings. Adding any actual 4th/5th/6th therefore requires **prospective additive** SQL migration(s), scoped role/claim review, new signed pre-issue packet and DB-clock tests, source range/availability measurement, budget cap recomputation, real correct-condition missingness and protected splitting.

Separately, the **real feature coverage** may be thin even for T−6h. [Rich Stage14 feature bridge PR #593](https://github.com/HKcode22/ReplitTranvr/pull/593) is the immediate implementation priority: original source-bound FIDS/route plus genuine NOAA weather and history receipts with independent feature release. Extra horizons with empty/duplicated features would not create more independent operating flights, just repeated correlated rows and extra requests.

**Decision for present execution:** preserve 3 paid live horizons until new GET costs, same-flight as-of source coverage, and exact budget-day/alert reservations are independently confirmed, while getting code/CI for richer existing features ready. If actual room and marginal decision value justify expansion, assess 4 first, then 5, then 6 by measured benefit rather than a mandatory three→six jump. A one-time or limited future **nonpaid** rehearsal can evaluate tier feasibility, but cannot backfill observations after any PRE cutoff. No vendor email is needed to finish the offline/engineering parts.

**Current evidence:** owner installed V0087–V0092 real Neon PG16 *inert*, 0 tasks, 0 provider calls at that readback. No live per-category 31-day budget frozen, source Contents ML use/retention terms certified, future original→T24/V0081→T6/T90→POST pilot, or independently signed Phase5 scientific freeze. **Phase5 FREEZE HOLD / Phase6 paid GO NO.** Do not install/repeat SQL until new work is tested, independently reviewed and owner-signed. This checkpoint creates no new payable work.
