# Phase4 P4-F grouped source-uncertain candidate coverage — 2026-10-29

Normative: [V3.9-f.8 §5](../plans/V3.9_DataCollectPlan_f.8.md), [Implementation Log §1.9](../implementation/V3.9_IMPLEMENTATION_LOG.md). Follows completed [PR #254](https://github.com/HKcode22/ReplitTranvr/pull/254), [#255](https://github.com/HKcode22/ReplitTranvr/pull/255), [#256](https://github.com/HKcode22/ReplitTranvr/pull/256).

## Source-only change
- Adds pure, bounded `phase4Gate5StratifiedCoverage_v39.ts` to report horizon-specific candidate PRE coverage grouped by originating airport, tier, region, source operating airline, source route, **airport-local schedule hour** and domestic/international/UNKNOWN country evidence (country cannot be inferred by ICAO prefix).
- Independently calculates primary source FIDS cohort (not webhook-selected), as-of membership by each first-observed T cutoff, snapshot expected/created and source-lineage violations, webhook captured, required/optional feature flags and source-flagged target observability. Outside candidate FIDS vs known-but-too-late FIDS are separate; webhook items with no proven identity stay `unresolvedWebhookItems`, not fictitiously assigned a route.
- Service interval and callback-receipt windows are separately parameterized. Zero denominators output NULL + source-uncertainty reason, not zero. Public dimensional cells with fewer than three flight candidates are suppressed but still counted in aggregate numerators/denominators.
- Every result says **OFFLINE_CANDIDATE_SOURCE_NOT_INDEPENDENTLY_CERTIFIED**; neither the candidate source contract nor a supplied label flag can prove source completeness, real flight identity, exact T source semantics, or a live scientific Gate5 PASS. No paid calls, database access/mutations, provider subscription changes or automatic Phase6 launch.

## Remaining gates to close
1. Independent *prospective same-cohort* FIDS receipts with durable `available_at` before T−24h/T−6h/T−90m. Existing WSSS 151 alert items (0 locations) and disjoint earlier paid FIDS GETs cannot serve as one prospective three-horizon dataset.
2. Original cryptographically verified producer-to-flight ↔ aircraft linkage with valid source-use rights and LOGGED restart replay; existing free adsb.lol observations are only aircraft trajectory candidates.
3. Actual-wheel-off vs scheduled-wheel-off source semantics, true owner-reviewed PRE/POST labels, any available FAA/BTS comparative source for US flights.
4. Independently reviewed Gate5 denominators, fixed source manifest, all mandatory predecessor proofs; **strict Gate5 and Phase5 final FREEZE remain HOLD**, Phase6 paid collection separately authorized only after completion.

No user manual timed Replit commands, Cloudflare, provider email or additional paid provider requests. This is an additive checkpoint and does not overwrite historic evidence.
