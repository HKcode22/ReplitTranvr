# Phase 2G — Early-Pilot Completion, Research Fitness, Formal Gate-2 Exception and Phase-3 Handoff
**Prepared 2026-10-14. DRAFT REVIEW/EVIDENCE, NOT protected production gate or payment authorization.**
No new provider calls, payments, deploys, mutations or automatic YSSY rerun authorized by this document.

## 1. Distinguish completion dimensions

| Field | Result | Independent basis |
|---|---|---|
| Five-airport selected early-pilot **observation work** | ✅ **Complete**: WSSS, OMAA, MMUN, SKBO, YSSY each collected ~2h | Operator exact read-only probe11,12,14,15,19 review 2026-10-13T22:18:59Z |
| Original 120m YSSY | ✅ Completed uncensored, 7203.639s | Durable probe19 and archived paid owner |
| YSSY received data | ✅ Real bytes/aggregate: 58/58 originals SHA verified (308832 bytes), 229 items and cost claims | Read-only source review, local aggregate SHA `a42a3736ac362ad38398e51f268273ae10c20103e5a53e21b0852c0f4e063fcf` |
| YSSY billing-vs-received | **2-unit mismatch**: 231 vs 229, 99.134% billed-credit reconciliation, original `failed/DELIVERY_GAP` | Final authoritative `clean.adb_probe_reconciliation_evidence` |
| YSSY research inventory | ✅ Included as **B_DEGRADED_OBSERVED_ONLY**, not already formally capacity-scored | [Immutable evidence inventory](2026-10-13_PHASE2G_EARLY_PILOT_RESEARCH_INCLUSION_MANIFEST.json) |
| WSSS (probe11) | ✅ MATCH, 160.498 rows/h, capacity PASS | Exact cohort DB report |
| SKBO (probe15) | ✅ MATCH, 150.498 rows/h, capacity PASS | Exact cohort DB report |
| OMAA (probe12) | ✅ MATCH, 73.999 rows/h, capacity PASS | Exact cohort DB report |
| MMUN (probe14) | ✅ MATCH, 23 rows/h, **capacity FAIL** | Exact cohort DB report |
| YSSY observed density | ~114.442 items/h, above numerical 60/h **on independently reconstructed observed data**; official rows/h remains NULL | 229/(7203.639/3600); not a frozen formal capacity scorer |
| Provider billable exposure | ✅ 0 active credit-based subscriptions at last explicitly verified postrun query | Operator exact list/get + dry-run, no new paid work |
| Original blob retention and incident #31 | **OPEN**, 58 live raw refs until 2026-10-20T03:06–05:02Z; transient runtime 0 and journal absent | Exact YSSY forensic output. Do not claim complete technical cleanup. |
| Formal Phase 2G/Gate-2 signed acceptance | **HOLD** until approved qualified-pilot closure and prior incident handling | The frozen P25 contract requires MATCH; historic result must not be rewritten |
| Automatic Phase 2H 4h confirms | **NOT REQUIRED for early pilot**, **NOT AUTHORIZED** | Oct2 `early_pilot_scope_reduction.original_stage2_auto_requirement_retired_for_early_pilot=true` |
| Phase-3 LIVE isolated canary | **NOT AUTHORIZED** | Requires Gate2 valid closure and fresh bounded AUTH; Gate3 exact reconciliation tol0 |

## 2. Bounded historical root-cause and proven prospective hardening

**Not found:** defect in accounting of the 58 received saved originals; 229 persisted item identities, 229 saved cost claims, 0 mismatches/duplicates and 0 known callback persistence failures. The 2 unit upstream billable gap occurred before the incident31 end-of-run race. Our code might contribute to ingress/network failure but proof of unobserved sends is not present. A provider sender-side attempt/HTTP-delivery record would be decisive if AeroDataBox support can supply one. Without it, no endless paid reproduction or speculative exact-cause claim.

**Concrete separate defect found in GitHub watchdog:** near terminal end owner deletes its subscription while durable probe status still says probing. Watchdog historic implementation treats exactly zero active billables as isolation loss, generates incident31. Draft source `server/lib/disruption/phase2gTerminalOwnerHandoff_v39.ts` + `scripts/v39_phase2g_github_actions_watchdog_v39.ts` adds bounded owner-handoff grace (after deadline, <300s, exactly zero active billables), with negative tests. It **does not fix upstream sender losses**, does not auto-enable billable retries, and is NOT deployed.

**Existing producer ingress safeguards** reviewed from production: published callback-only HTTP readiness GET, Webhook raw-before-2xx persistence; canonical JSON and source readback; timestamping earliest route admission; 7s sanitized transport warning; bulk per-payload SQL; callback durability. Replit Autoscale upstream inability to reach HTTP is not fully controllable with a receiver-only patch. PR #27 independent durable-frontdoor/replay is an undeployed alternative needing separate end-to-end hosted testing and ownership/funding review. AeroDataBox docs say SEND billing, default retries off; enabling 1–2 paid retries requires prospective run budget/auth, dedup end-to-end and separate operational protocol: https://aerodatabox.com/flight-alert-api-2026/.

## 3. Multidimensional statistical quality / rank

Source [NIST SP 1500-18r2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/1500-18/NIST.SP.1500-18r2.html), [ISO/IEC 25012](https://www.iso.org/standard/35736.html) and [STROBE missingness/sensitivity](https://pmc.ncbi.nlm.nih.gov/articles/PMC2636253/). No universal data quality PASS percentage or well-justified composite weighted score. Keep separate full window completion, exact received-source integrity, billed-credit reconciliation, resolved physical identities, capacity/yield, time-slot/region population coverage, systematic missingness risks, and license/expiry. Dataset can be fit for one descriptive task and not robust for another. YSSY quality axes documented in [scorecard](2026-10-14_P25_SCIENTIFIC_QUALITY_DIMENSIONS_AND_GAP_PREVENTION.md). Its `99.134%` is not a statistically estimated callback-success probability and must not be given an unjustified iid confidence interval.

## 4. Safe finite closeout route, no more YSSY collection

1. **DONE:** verify source SHA/readback of all 58 and saved item/cost equality. Preserve nonraw aggregate and relevant schema/code hashes.
2. **DONE:** verify 0 active provider subs and 0 current UNLOGGED runtime rows in exact-session dry-run. This establishes absence of ongoing spend at observed time, **not** verified raw deletion or historical incident resolution.
3. **DUE BEFORE OCT20 OR VALID TTL**: classify lawful derived work/feature aggregates and metadata; no raw provider payload upload to GitHub, no indefinite copy or speculative attribution; preserve exact allowed derived transformations where authority exists.
4. **DUE AT/AFTER 2026-10-20T05:02:12.501Z:** existing scoped `scripts/v39_phase2_retention_v39.ts` dry-run and then separately authorized audited expiry APPLY (if owner/legal/Plan terms permit). This system can expire/tombstone individual logged object refs even though UNLOGGED P25 session vanished. Never run `v39_phase2g_exact_session_purpose_cleanup_v39.ts --apply` for P25 because it demands a runtime session row.
5. **DRAFT, NOT APPLIED:** `scripts/v39_p25_yssy_incident31_expiry_closeout_v39.ts` dry-run default; only after all 58 have verified deletion tombstones, zero provider active, no active probes/budget, exact incident31/probe19/evidence state. Any admin-only `--apply` requires explicit owner approval and code review and **does not** rewrite probe19 `failed/DELIVERY_GAP`. Historic metric and source-custody statements preserved.
6. **METHODOLOGY REVIEW:** prospective research B tier from draft PR #36. A formal Phase2G promotion decision for YSSY needs a separately approved scope/acceptance interpretation with missingness sensitivity; do not backdate frozen experiment.
7. **DOCUMENTED**: early-pilot observational fieldwork is COMPLETE; formal Gate2 closed state HOLDS pending requirements above. This **does not block offline Phase3 preparation**, only live Gate3 provider actions.

## 5. Actual next stage after early-pilot fieldwork

**Phase 2H under Oct2 early pilot scope:** automatic five four-hour runs **retired**. Treat as optional/conditional, not an instruction to start. Triggered confirmation beyond pilot is a separate question and would require new authorizations.

**Phase 3 (offline preparation now, no paid provider yet):**
- **Gate 3 credit canary:** original Plan/Log §1.8.1 requires isolated real provider SEND-scope item/account balance, raw-before-2xx, 3-read stable settlement, exact `C_external=C_internal` and stop/cleanup. Keep **tol=0** for Gate3, even if future production Research-B allowance becomes ≥0.99. Current `scripts/credit_canary.ts` uses legacy controller/ingress entry and must be audited against new P25 owner/receiver before live use. Do not invoke wrapper with AUTH until Gate2 closes and an exact bounded canary AUTH exists.
- **Gate 0.5 constructibility:** evaluate schedule/observed wheels-off or gate-out target availability at each prediction cutoff, FIDS/snapshot/known-times semantics, source and license; current `scripts/v39_gate05_owner_v39.ts` reads a measurements file/evaluator and does not itself establish paid live collection. Define the measurement harness and tests offline.
- **Gate 4 controller cap and safety:** test budget-day and total, abrupt stops, failure refusal and account floor with synthetic/disposable data. Current `scripts/v39_gate4_owner_v39.ts` checks offline threshold and status, but is not a full approved live safety test.
- **Then:** Phase4 Gate5 population observability → Phase5 calendar and audit/freeze → separately authorized Phase6 full study, if readiness proven.

**No release, paid dispatch, provider calls, production DB mutation, or incident closure was made by this report.**
