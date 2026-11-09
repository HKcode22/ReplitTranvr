# 2026-11-09 — actual 48 B0062 MID/REGIONAL airport candidates; full-frame five-crossover preselection

## Actual owner evidence, verified not inferred

The owner ran the already merged PR #499 GitHub source-pinned Replit READ ONLY on 2026-11-09 **02:54:44.082 UTC**. It returned **`MID_REGIONAL_12_CELLS_CANDIDATES_ONLY_NOT_PAIR_FREEZE`**, no missing tier×region cells, `4,346` active-frame rows, `1,125` dual PRE/POST eligible rows and exactly **48** up-to-four-per-cell shortlist records. All twelve cells were represented, with **0** paid provider calls, **0** database changes and **0** webhook posts.

The [complete owner JSON, no synthetic substitution](evidence/2026-11-09_mid_regional_12cell_owner_live_b0062_readonly.json) is now archived. It contains exactly the user-returned 48 airport ICAOs/regions/tiers/feed flags/observed departure proxy/network degree/carrier diversity/international share, as well as all current frozen hashes.

**Independent hash reproduction**: `SHA256(JSON.stringify({frameHash,regionHash:regionMappingHash,tierHash,candidates}))` equals the reported `f960476cce18b0cb868440fc10c9815a3f95837da8b74a9a2f645ae659d22479`. A Vitest regression reads the *actual archived JSON*, reproduces the digest and asserts false freeze and paid-GO flags.

### Complete 12-cell verified counts

| Region | MID dual-eligible | REGIONAL dual-eligible | REGIONAL stricter screen |
|---|---:|---:|---:|
| Asia-Pacific | 53 | 80 | **79** |
| Europe | 149 | 167 | 167 |
| Gulf/Africa | 15 | 28 | 28 |
| North America | 181 | 251 | 251 |
| Oceania | 19 | 27 | 27 |
| South America | 10 | 34 | 34 |
| **Total** | **427** | **587** | **586** |

MID stricter screen remains 427. Thus **427 + 586 = 1,013** distinct MID/REGIONAL airports passed the additional schedule + (live or ADS-B) and valid-metadata restrictions, one fewer than initial `427+587=1,014` dual-eligible airport records. The specific excluded Asia-Pacific REGIONAL ICAO and exclusion mechanism **were not returned** by this ranked screen, so do not invent its identity or assert which field failed.

### The full actual top-four screening list — airport codes only

| Region | MID, ranked #1–4 | REGIONAL, ranked #1–4 |
|---|---|---|
| Asia-Pacific | RJFF, RKSS, VVNB, WADD | VDTI, RKJJ, RJNK, RJOK |
| Europe | EGGW, EGPH, LIML, LPPR | EFRO, LGMK, LEAM, EGFF |
| Gulf/Africa | FAOR, LLBG, OMSJ, GMMN | FALA, GMMW, DTMB, OEMA |
| North America | TJSJ, KPIT, PANC, KSMF | TIST, KBFI, KAVP, MMOX |
| Oceania | YPPH, YPAD, NZCH, YBCG | NZNP, YMAV, YHBA, YPKG |
| South America | SABE, SBKP, SBRF, SAEZ | SBUL, SACO, SARI, SAZS |

**Critical distinction:** these 48 are ranked on pre-period historical observed traffic; there is **no claim they are randomly chosen**. Taking only these top-four from each cell would bias the sampling toward high-volume airports and discard 965 additional strict-qualified airports. The four owner-chosen HUBs WSSS/OMAA/SKBO/YSSY remain independently verified and separate from this candidate list. Earlier fixture airports (`M1A`, `R1` etc.) are never valid real airport selections.

## Next actual proof: seeded sampling over all 1,013 strictly eligible MID/REGIONAL airports

A new read-only `scripts/v39_phase5_fullframe_five_pair_preselection_readonly_once.mjs` uses **all** exact current active B0062 source-eligible MID/REGIONAL records, rather than cherry-picking 48 high-traffic shortlisted rows. It only queries airport reference and eligibility metadata, **never AeroDataBox flight response bytes**.

The following CSPRNG `256`-bit **airport-selection seed was generated BEFORE examining any full-frame selected IDs and committed in GitHub**:

`71c2e5b845c8fce696c5371e05c3b5f06a43e2378a4a308867eb9a0a5f4be1e0`

Its independent SHA-256 commitment is:

`c5e772c91a9e853f9db83378f4323a9670938fb9ec2a16ea4978ced60528703b`

This is the prospective *airport sampling* seed, **NOT** the future independent randomized **treatment-order** seed. It is public and deterministic after being fixed; it is not chosen after seeing prospective outcomes.

**Sampling algorithm** (precommitted before the future actual owner DB readback):

1. Derive SHA-256-separated `calendarRegionSeed` and `fourHubAnchorRotationSeed` from the selection seed; reproduce precisely the first five region/HUB template draws used by the existing `solveV39FourAnchorExploratoryDraft` to avoid hidden region mismatches.
2. Each pair contains a real owner HUB, two distinct real MID airports and one real REGIONAL airport, with the target MID/REGIONAL region selected **before** selecting an actual airport; two different MID regions in each pair. Four different owner HUBs appear across five pairs; one repeats legitimately.
3. For each tier×region cell, order **all** strict-qualified airport ICAOs by `SHA256(seed|pairId|slot|icao)`. Take the first yet unused ICAO. This gives a reproducible pseudo-random ranking within the entire eligible cell, not a traffic-first top-four cap. Require **15 different MID/REGIONAL ICAOs** across all five pairs (no repetition by accident).
4. Return five exact *candidate four-airport sets* and a digest of those chosen ICAOs. The output remains **`FIVE_FULL_FRAME_PAIR_CANDIDATE_TEMPLATES_ONLY_NOT_FROZEN`**, not an approved real-world calendar or a signed pair assignment. The same four airports must eventually replay within each crossover's second period; independent treatment order will be randomized **only after** the airport templates are reviewed/frozen.
5. Reject a changed active registry or wrong hashes, unexpected counts `4346/1125`, any of 12 changed strict cell counts, missing/duplicate ICAO, invalid feed/traffic, or unexpected PostgreSQL context. Use one verified `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` / `ROLLBACK`. No subscription mutation, HTTP, raw-original access, or DB writes.

**Why this is still not scientific FREEZE:** the full 31-batch-day calendar needs real future dates, six balanced UTC starts, five crossover pairs' 24h end→start washout and retained evaluation partition; seven physical REST charging categories by UTC GET date, current provider range limits, real SOURCE/3 PRE/POST receiver custody and independent rights/expiry audit. The old five-anchor Gate2 was not passed and YSSY old P25 `failed/DELIVERY_GAP` is not retrospectively repaired. The precommitted airport seed is a **method**, not a guarantee of current future provider flights or of representative inference outside the selected operational frame.

### Technical study lesson

`ROW_NUMBER() OVER (PARTITION BY tier,region ORDER BY traffic_metric_value DESC)` generated the **48 high-volume screening records**. That is useful for inspection but is **not uniform airport sampling**.

By contrast, `SHA256(seed|pairId|slot|icao)` deterministically reorders **all** qualifying airports in a cell without using their future outcomes or traffic magnitude as the ranking key. Conditioning on the region and tiers is **stratified sampling**; avoiding previously used ICAOs is **sampling without replacement**. The protocol must account for selected-region probabilities and inclusion probabilities when making weighted estimates; merely hashing does **not** make four purposively selected HUBs globally representative.

**Status:** 48-case actual production census archived and checksummed; full 1,013-case seeded five-pair proposal query prepared but not yet actually executed; no signed pair set, no signed 31-day calendar, no scientific Phase5 FREEZE, no paid Phase6 GO. No waiting on vendor email, no repeated historic P25 operations, no V0079–V0083 reinstall.
