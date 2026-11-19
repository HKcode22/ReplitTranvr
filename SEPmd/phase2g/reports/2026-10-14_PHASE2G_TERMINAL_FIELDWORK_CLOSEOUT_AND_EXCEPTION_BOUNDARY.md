# Phase 2 / Gate 2 — terminal fieldwork closeout, scientifically qualified pilot, and formal exception boundary
**Prepared 2026-10-14 UTC. Closeout of experimental fieldwork, not a retrospective frozen Gate-2 PASS.**
**Repo:** HKcode22/ReplitTranvr. **Scope:** Oct-2 Compact6 reduced *early pilot*; original Plan f.8 §§9, 17, 20 and implementation Log §§1.7.7–1.8 remain identifiable. **Baseline main:** `f5b1347b7b9aebd6830302394ea2cc5775aedbf4` at inspection. This decision is additive: immutable source probes, Plan, owner CI and reconciliations are NOT rewritten.

## Direct answer: What was still holding Gate 2?
Not an unfinished YSSY two-hour collection, an additional silent cleanup action, a missing CI job, or another automatic Stage-2 run. The blocker is **acceptance semantics under the existing frozen rule**: five formally eligible anchor candidates + historical exact-MATCH. Five measured windows are complete; three meet that formal screen. MMUN measures ~22.9996 physical-v2 observations/h (<60/h). YSSY was fully uncensored but its historical status remains `failed/DELIVERY_GAP` on 231 externally billed vs 229 received (2-unit gap). Its official score/rate is NULL and the original strict rule cannot promote it. The October-2 early-pilot amendment retired **automatic** four-hour Stage-2, but did not turn a Stage-1 failure into PASS or exempt the 60/h screen.

## Final scientific **fieldwork** disposition — no more Stage-1/Stage-2 collection scheduled
| Airport | Verified observation | Original eligibility | Research use |
|---|---|---|---|
| WSSS/probe11 | full-window, MATCH; 160.498/h | PASS | confirmed reference site |
| OMAA/probe12 | full-window, MATCH; 73.999/h | PASS | confirmed reference site |
| MMUN/probe14 | full-window, MATCH; 22.9996/h | FAIL capacity | valid low-yield pilot observation, not a qualifying anchor |
| SKBO/probe15 | full-window, MATCH; 150.498/h | PASS | confirmed reference site |
| YSSY/probe19 | 7203.639s uncensored; 58/58 original blobs SHA/bytes read back; 308832 original bytes; 229 saved item and 229 cost-claim units | FAILED original strict reconciliation; original official rows/h NULL | **B_DEGRADED_OBSERVED_ONLY** qualified received-data pilot research, not a formally scored anchor |
| LKPR | explicitly deferred | NOT MEASURED | no inference / no hidden additional paid obligation |

The final **acquisition-fieldwork decision** is `COMPLETE_5_OBSERVED_WINDOWS` / `NO_MORE_AUTO_PHASE2_PAID_TARGETS`. The **original frozen Gate-2 certification** remains `NOT_PASSED_UNSATISFIED`, not `PASS`; its prior report's `HOLD_NOT_PASSED` is historical and not replaced with a fictitious verified anchor pool. **Administratively** the pilot can be **terminally disposed as evidence-complete with exceptions**, meaning no repeat studies are pending under the Oct-2 early-pilot study. This is a terminal report of what was observed, not an assertion that the original Plan's Phase-3 LIVE predecessor requirements were earned.

## Quantitative YSSY research qualification and sensitivity limits
- 229/231 = **0.99134199134 (99.1342%)** is *settled billed-unit-to-received-claimed-unit reconciliation*; discrepancy 2/231 = **0.8658%** of billed units. It is **not** an independent random-trial callback-success estimate, nor independently authenticated provider attempts/HTTP POST deliveries.
- SHA/size verified for all 58 **received** original envelopes; 0 observed saved-original duplicate refs or source item/cost disagreements. This proves the 229 recorded saved items were accounted for correctly **within retained sources**, not that all provider SENDs arrived.
- An archived item inventory reported 221 resolved physical-v2 rows and 8 quarantined among 229 saved items; raw-item and distinct-physical-identity denominators must never be confused. YSSY's official capacity metric is still NULL. No after-the-fact `229/2h` calculation is formal anchor evidence.
- Missing two billed credit units do **not** prove two unique missing physical flights, nor quantify lost labels, delayed-flight enrichment or population coverage. The unknown sender/ingress mechanism could be MNAR; no universal 1% tolerance law exists. In predictive flight-delay inference, keep YSSY B data **separately marked** and test worst-case missingness/scenario exclusions rather than training as if complete random sampling were established.
- For descriptive, retained-source pilot analyses, use only permitted derived metadata with complete source/provenance traceability and disclosure. YSSY cannot be used for *confirmatory frozen five-anchor selection*, cross-region unbiased claims, external billing reconciliation PASS, or a Phase-6 production manifest solely from this record.

This is consistent with [NIST SP 1500-18r2 §4.5](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html) (quality is purpose-dependent) and [STROBE missingness/sensitivity disclosure](https://pmc.ncbi.nlm.nih.gov/articles/PMC2636253/). Neither supplies a universal acceptance percentage.

## Phase 2 work that is **not** an excuse for new YSSY paid probes
1. **Evidence capture DONE:** same exact original saved objects verified independently, same 229 item/cost claims, external 231 and failed probe19 retained. Probe 11/12/14/15 comparisons recorded in the closeout evidence and JSON; no hidden extra selected pilot site.
2. **Source retention follow-through remains scheduled outside acquisition:** 58 LOGGED refs were live at last source/operator audit, with allowed expiry times from **2026-10-20T03:06:15.502Z to 05:02:12.501Z**. Confirm lawful permitted nonraw derived evidence first. Do not upload raw provider event payloads to GitHub or delete early. After expiry, independent scoped retention dry-run, explicit operator-approved deletion and per-object verified tombstones. Ordinary exact-session cleanup `--apply` must NOT run because its UNLOGGED session row vanished.
3. **Internal incident 31** (not GitHub PR #31): historical end-window watchdog/ownership cleanup race remains OPEN until separately reviewed closure criteria (58 verified tombstones, zero active provider billables, zero active probes/budget, exact incident scope). Nothing in this report closes it or rewrites P25 reconciliation.
4. **Live freshness check NOT DONE here:** latest Replit real SQL and provider LIST at operator audit reported zero active billable and zero transient sessions/deliveries/items. GitHub CI cannot refresh that fact. Draft PR36 provides a read-only checker but it has not been executed on Replit under this closeout.
5. **Methodology decision for *future live* progression STILL REQUIRED:** original Plan/Log mandate Gate2 PASS before real Gate3. To proceed with a live Phase3 canary without original five anchors, an explicit dated scientist/operator **qualified-pilot-only scope and entry amendment** must be separately approved *before* new authorization. It must name exploratory aim, inclusion/exclusion rules, risk of unknown missingness, reduced anchor pool (three accepted + separate YSSY observed B; MMUN contextual only), no retrospective promotion, pilot representativeness limits, remaining incident/TTL safeguards, and exact Gate3 zero-gap rule. A generic “finish Phase 2” request does not in itself approve those changed scientific inference claims.
6. **Phase3 offline GO:** design/test exact prepaid-session Gate3 ingress+ledger, 0-paid hosted no-provider parity, Gate0.5 measurement provenance, Gate4 controller-cap integration. **Paid Phase3 NO-GO** until that revised predecessor/entry decision is accepted and exact fresh bounded AUTH and hosted receiver proof exist. The current legacy paid canary is incompatible and hard-blocked in draft PR36.

## What "closed" means — no silent renaming of gates
- `phase2_acquisition_fieldwork = COMPLETE`.
- `phase2_early_pilot_scientific_report = COMPLETE_WITH_QUALIFICATIONS`.
- `original_gate2_acceptance = NOT_PASSED`. Frozen original 5-anchor certificate absent; this is terminal adverse evidence, not a successful PASS.
- `original_probe19_reconciliation = DELIVERY_GAP`; immutable.
- `new_qualified_pilot_exception = NOT_YET_SIGNED`; cannot waive live Gate3 predecessor until accepted.
- `incident31_and_retention = OPEN_POSTRUN_OBLIGATIONS`; track to deadline without repeating experimental window.
- `Phase3_offline = ALLOWED`; `Phase3_paid = BLOCKED`.

## Single remaining human decision, if live progression is desired without more paid Phase 2 experiments
Record exactly: **“Approve a separately versioned qualified early-pilot Gate-2 exception for exploratory continuation using the three original eligible sites (WSSS, OMAA, SKBO) plus YSSY as B observed-data research only; MMUN as contextual low-yield data; no original five-anchor PASS, no exact-reconciliation override, no new YSSY/automatic Stage2, no Phase3 paid dispatch until independent receiver/credit/incident safeguards and new bounded AUTH.”**

This proposal is **NOT signed** by creating the file. It must be independently reviewed/approved before a consequential Phase3 entry change. If not approved, original Gate2 remains terminal NOT_PASSED and only offline research is allowed. Do not infer approval from a green CI check.

## Refs / checkpoint
- [Docs-only PR #37](https://github.com/HKcode22/ReplitTranvr/pull/37) contains this closeout; **do not merge without source/Plan review**.
- [Machine-readable prior observation record](2026-10-14_PHASE2G_GATE2_EARLY_PILOT_FIELDWORK_CLOSEOUT_RECORD.json) preserves separate `fieldwork COMPLETE` / `original Gate2 HOLD_NOT_PASSED` facts.
- [Original Plan §9, §17, §20](../../V3.9_DataCollectPlan_f.8.md) and [Implementation Log §1.7, §1.8](../../V3.9_IMPLEMENTATION_LOG.md).
- [Draft production hardening PR #36](https://github.com/HKcode22/ReplitTranvr/pull/36) unmerged/undeployed.
- No paid calls, subscription/DB change, deletion, new provider reservation, production publishing, or historical data mutation was performed in this documentation closeout.
