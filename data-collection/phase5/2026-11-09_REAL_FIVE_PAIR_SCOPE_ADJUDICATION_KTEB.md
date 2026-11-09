# 2026-11-09 — Five real B0062 crossover pair proposals; independent scientific operating-scope adjudication

**Evidence class:** actual, source-pinned production PG16 READ ONLY; **not** a scientific FREEZE, signed pair assignment, provider-confirmed schedule or paid Phase6 GO.

## 1. Exactly what the November 9 owner readback established

The owner executed the immutable GitHub-blessed PR #500 launcher at `2026-11-09T03:29:33.421Z`. This returned `FIVE_FULL_FRAME_PAIR_CANDIDATE_TEMPLATES_ONLY_NOT_FROZEN`, with **all 1,013** strict dual PRE/POST MID/REGIONAL B0062 records considered, 12 region×tier cells and exactly 5 four-airport paired *proposals*. `sourceShortlistHash=f960476cce18b0cb868440fc10c9815a3f95837da8b74a9a2f645ae659d22479`. The exact production JSON is [archived without alteration](evidence/2026-11-09_five_full_frame_pair_owner_readonly_original.json). Every row of the original 48-candidate screening snapshot and these five real pairs remains checkable on GitHub.

**Independent digest verified:** SHA-256 of JSON `[{pairId,icaos:[HUB,MID_A,MID_B,REGIONAL]}]` exactly equals the production `3dbcc18dd44bdbb7e5323766a9a6bfacacc0bb2e38e3ccce9aff442611738763`. Independently hashing the original 256-bit random seed as *bytes* reproduces `c5e772c91a9e853f9db83378f4323a9670938fb9ec2a16ea4978ced60528703b`. Four owner's HUBs WSSS/OMAA/SKBO/YSSY, 15 unique strict-selected MID/REGIONAL ICAOs, no duplicate non-HUB, no new future-run-day airports chosen. No paid provider calls/DB/webhook writes; `treatmentOrderRandomized=false`, `crossoverAirportSetSigned=false`, `thirtyOneBatchDayCalendarSigned=false`.

| Experimental pair | HUB | MID_A | MID_B | REGIONAL | Original structural result |
|---|---|---|---|---|---|
| 1 | OMAA | OMSJ | SPJC | KDEC | Five-pair candidate, not a source PASS |
| 2 | WSSS | SBFL | TJSJ | LSZB | Five-pair candidate, seasonal flight-volume scope still to check |
| 3 | YSSY | **KTEB** | LFQQ | NZNP | **HOLD: KTEB has no scheduled common-carrier passenger service** |
| 4 | SKBO | EBAW | NZNS | RJNK | Candidate, airline seasonality matters |
| 5 | SKBO | YBUD | RKTU | FAKM | Candidate, low-volume regional sensitivity |

A limitation we can tolerate scientifically is **low scheduled flight count** with quantified zero/unknown denominator, but a site **categorically unavailable for scheduled airline flights** is not ordinary missingness when the scientific target is passenger-disruption for scheduled airline departures. A `feedSchedule=true` airport-reference flag or exogenous traffic proxy **cannot** certify the operating-leg target population. This particular discovery warrants a narrowly scoped correction before any signed pair assignment.

## 2. KTEB is a sourced, exogenous hard scope exclusion for scheduled passenger flights

**Primary sources, predating our prospective selection:**

- [Port Authority of New York and New Jersey, Airport Rules and Regulations, XVI.1.1, effective April 1 2025, printed page 71](https://www.panynj.gov/content/dam/airports/pdfs/Airport_Rules_Regs_4_1_25.pdf): explicitly excludes scheduled common-carrier passenger operations at Teterboro Airport.
- [FAA Teterboro Airport Environmental Assessment, Appendix Q, September 2026, §LO004-4 response at page 47](https://www.faa.gov/airports/environmental/environmental_documents/fonsi-rod-TEB-2026-appendix-q1.pdf): states TEB is a nonprimary general-aviation reliever **not certificated for scheduled commercial airline service**, and redevelopment does not change that classification.
- [FAA Teterboro Airport flight deck](https://www.faa.gov/flight_deck/teb) describes its business/general aviation role.

This is **not a new finding that commercial charters are nonexistent**: the restriction refers specifically to *scheduled passenger common-carrier service*. KTEB may still have extensive charter and business aviation movements. That distinction shows why `frozenObservedDepartures=51029` in the B0062 proxy can coexist with zero valid scheduled-airline service. The post-draw exclusion is **transparent** and must not be falsely described as a precommitted airport exclusion. It was found *after* the seed selected the airport but *before* any Phase6 collection or treatment allocation, using official documentation published before the draw. Record this eligibility adjudication explicitly rather than disguising it as ordinary missingness, weakening scope to all private charters, or pretending the old sample never contained KTEB.

**Other low-volume/seasonal airports** (LSZB, EBAW, KDEC, NZNP, FAKM) still require future period-specific physical source/operating-leg and schedule checks, not invented automatic removals. In particular a narrow seasonal carrier timetable may yield zero flights in the study period; preserve observed/reachable/unsupported denominators. No actual paid AeroDataBox query occurred and no new provider contact is necessary to run the offline source eligibility work.

## 3. Strict deterministic conditional replacement — no shopping for a favored airport

The new version of `scripts/v39_phase5_fullframe_five_pair_preselection_readonly_once.mjs` **retains** the full frozen 1,013-row B0062 census unchanged, the exact same precommitted 256-bit airport selection seed `71c2e5b845c8fce696c5371e05c3b5f06a43e2378a4a308867eb9a0a5f4be1e0`, identical six-region cycle/derangement, and unmodified four owner HUBs. It re-derives the original five real proposals from the entire real 1,013 rows and requires their selected ICAO hash to **exactly** match the owner's archived `3dbcc18...` and pair3 `MID_A=KTEB`. If that original fingerprint is not reproduced, the script returns **HOLD**, makes **no changes**, and does not improvise any other selection.

Only after the original is reproduced, it reruns the identical SHA256-within-stratum airport ranking with a **single public, source-backed scope exclusion `KTEB`**. It skips KTEB when choosing the first unused eligible airport within the same North America MID cell for `pair-3, MID_A`. It then verifies that **none of the other nineteen pair slots changed** and the KTEB replacement is different; all four original HUBs/region assignments and 14 other MID/REGIONAL ICAOs remain exactly as originally drawn. There is **no manual choose**, no change of statistical seed, no alteration of the frozen B0062 registry or database, and no attempt to create a new fictitious 1,012-row census.

The repaired readback reports original and corrected SHA-256 digests, exactly which one slot changed, authoritative publication sources, `exclusionAdjudicatedAfterFirstDraw=true`, `ownerOriginalProposalPreservedUnmodified=true`, new status `FIVE_POST_SELECTION_SCOPE_ADJUDICATED_PAIR_CANDIDATES_NOT_FROZEN`, plus still-false `crossoverAirportSetSigned`, treatment-order seed and Phase5/6 release flags. No provider HTTP, DB mutations, webhook POST or credential egress. The reviewed launcher verifies the exact main Git blob SHA, main ancestry, completed main safety CI and performs a READ ONLY transaction with `ROLLBACK`.

**Scientific integrity:** post-selection adjudication can affect inclusion probabilities, so the future estimand must explicitly condition on this scope restriction; do not describe it as an original pre-specified exclusion. This targeted repair is not evidence that every other sampled airport has adequate provider-native scheduled flight coverage. Period-specific coverage and physical operating-leg scope remain pre-Phase5-FREEZE checks, with bounded missingness reported. Do not demand "perfect" source data or email replies; do not accept physically invalid scheduled service as ordinary noise.

## 4. Next scientific engineering tasks following corrected review

Verify the exact one-airport replacement and unaffected 19 pair slots, then decide which proposed pairs meet scheduled-passenger source and seasonal eligibility, still independent of any treatment/POST outcomes. After reviewed pair-set admission, separately precommit the **treatment-order** seed; construct a real prospective 31-batch-day calendar (26×4h, 3×2x2h, 2×up-to-6h; five matched treatment pairs; six UTC rotations, ≥24h washout), full physically partitioned SOURCE→T−24h/T−6h/T−90m PRE→POST/STOP timing and seven-category REST UTC charge-day budget. Independent science FREEZE and paid Phase6 GO remain separate; account/provider email response not an offline progress blocker. No P25 admin rerun, old signed POST one-shot retry, V0079-V0083 migrations, Cloudflare or Replit AI Agent.
