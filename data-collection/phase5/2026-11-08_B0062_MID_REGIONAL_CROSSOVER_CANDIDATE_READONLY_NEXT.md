# Phase5: verified B0062 MID/REGIONAL crossover candidate census — next owner READ ONLY

**Prepared 2026-11-08 UTC.** **Status: implementation ready for CI review; production output not yet observed.** This is the next critical scientific input after the actual [four-HUB owner-frame proof](evidence/2026-11-08_owner_four_hub_live_b0062_frame_readonly.json) and proposed [Plan f.8 Amendment D](../plans/V3.9_DataCollectPlan_f.8_Amendment_D_20261108_Four_HUB_Prospective_Scope.md). No AeroDataBox subscription call, POST, paid flight SOURCE request, database mutation, Phase5 FREEZE, or paid Phase6 GO.

## 1. What the real owner has already verified

- The real B0062 `neondb` frame has `4,346` airport rows, all with the active frame hash, `1,125` dual PRE/POST eligible and no observed frame hash mismatches at 2026-11-08T14:20:54Z.
- Exact four owner-selected HUBs **WSSS / OMAA / SKBO / YSSY** were separately proven `HUB`, `frameHubDualEligible=true`, schedule + live feed, four mapped regions and `problems=[]` on 2026-11-08T14:43:24Z.
- Those sites are **only the HUB slot candidates**. Each of five paired crossover groups still requires one simultaneously eligible MID_A, a **different** MID_B, and one REGIONAL airport. The existing `solveV39FourAnchorExploratoryDraft` exercises four-HUB/five-pair arithmetic with *synthetic* `M1A`/`R1` placeholders. That is a fixture, **not real selected MID/REGIONAL airport evidence**. A four-airport structural HUB pass alone does not make fake pair airport identities factual.

## 2. Real twelve tier×region frame cells

Read-only B0062 report already verified:

| Frozen macroregion | MID dual PRE+POST | REGIONAL dual PRE+POST |
| --- | ---: | ---: |
| Asia-Pacific | 53 | 80 |
| Europe | 149 | 167 |
| Gulf/Africa | 15 | 28 |
| North America | 181 | 251 |
| Oceania | 19 | 27 |
| South America | 10 | 34 |
| **Total** | **427** | **587** |

The report now planned in `scripts/v39_phase5_mid_regional_crossover_candidates_readonly_once.mjs` narrows to an **up-to-four-per-cell screening shortlist**. It requires exact production `ACTIVE` reference/frame/region/tier hashes matching earlier owner readbacks; validates the full `4346/1125` frame and all 12 prior counts; then queries `in_frame=true`, `tier_verified=true`, both `pre_eligible` and `post_eligible`, `feed_schedule=true` and `feed_live OR feed_adsb`, no exclusion reason, valid positive traffic/density/diversity metrics. It includes actual ICAO, tier, mapped region, frozen annual observed departure proxy, route-network degree, effective-carrier diversity index and reference international share. It returns a deterministic `candidatesSha256` for this screening snapshot.

This is a **screening convenience**, not a randomized pair selection: ranking by *historical frozen observed movements* is a documented offline shortlist heuristic, not a selection probability, provider flight coverage guarantee, or scientific representativeness proof. It can omit less-busy eligible airports, so its 48 returned top candidates are **not** the full adaptive sampling universe of 1,014 MID+REGIONAL eligible records. It must not become the implicit only eligible universe for ordinary days. Future exact pair airport identities must come from the frozen full B0062 frame and prespecified sampling rules and be cross-checked separately if the list needs more than four per cell.

## 3. How the database query works (technical learning)

The new query uses PostgreSQL `ROW_NUMBER() OVER (PARTITION BY tier,region ORDER BY traffic_metric_value DESC,icao ASC)`. A window function assigns rank **within each of twelve disjoint tier/region groups**; ties break lexicographically by ICAO so two runs with unchanged frozen input pick the same metadata order. `COUNT(*) OVER (PARTITION BY tier,region)` computes each **stricter feed-qualified cell's count before the rank cap**. The outer `WHERE rank <= 4` (SQL query shorthand) returns at most 48 candidate rows, while a separate `GROUP BY tier,region` query validates all 12 underlying original B0062 counts.

The `frame_version=$1`, `frame_hash=$2`, `traffic_reference_hash=$3` predicates **bind every candidate to the same frozen reference**. The extra `feed_schedule` and `feed_live|feed_adsb` restrictions are additional operational feasibility checks, not proof the current paid provider returns a particular flight at a future time. Real source custody/callback, per-flight cutoff, licensing, response service range and seven-category physical REST spending remain separate.

The connection uses `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` and `ROLLBACK`. A transaction with a consistent snapshot prevents mixing changing registry/version rows; PostgreSQL READ ONLY refuses SQL writes even if accidentally attempted. The script also refuses unexpected source hashes, schema, mismatch counts, data types, duplicate ICAOs or missing strict tier/region cells rather than silently converting invalid rows into an approved pair.

## 4. Outcome and next release boundaries

A result `MID_REGIONAL_12_CELLS_CANDIDATES_ONLY_NOT_PAIR_FREEZE` means the exact current B0062 frame supplied twelve screened region/tier shortlists with 0 provider calls and DB writes. It **does not** mean 5 crossover pairs are already sampled, future ordinary days were selected, actual T−24h/T−6h/T−90m originals exist, ML/source retention rights were verified, real 31 day calendar was signed, or historical five-anchor Gate2 became a PASS. Missing strict cells yield `HOLD_INCOMPLETE_STRICT_MID_REGIONAL_CELLS`; no candidate substitution or paid fallback.

After production owner runs the exact GitHub pinned READ ONLY launcher **once** and posts the sanitized results, select/freeze real five crossover airport-set templates using reviewed upstream seed/rotation and the full eligible frame, check the MID 7-day exclusion and REGIONAL coverage floor without post-treatment leakage; construct candidate **31 ordered parent batch-days** (26×4h, 3×2×2h, 2×≤6h, 5 matched pair contrasts, ≥24h end→start washout, six UTC slots) then obtain exact provider-range partitioned SOURCE-refresh timing and seven REST category costs with verified current account bounds. Independent audit and signed scientific FREEZE remain separate. AeroDataBox email replies are **not** a prerequisite for offline engineering.

No additional P25 admin closeout, V0079–V0083 reinstall, synthetic signed webhook replay, Replit Git reset, unreviewed paid subscription create, or premature Phase6 GO.
