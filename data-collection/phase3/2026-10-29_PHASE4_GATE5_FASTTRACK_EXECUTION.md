# Phase 4 / Gate 5 rapid execution checkpoint (2026-10-29)

Binding: Plan V3.9-f.8 sections 5, 7.5, 16 step 17-19; original Implementation Log section 1.9 and 2.22. This is an additive dated checkpoint, NOT retroactive revision of historic plan, trials, authorizations, or scientific acceptance.

## Real entry state
- Gate 3 operational canary qualified; Gate 4 NEXT4 operational small live proof qualified; Gate 0.5 most recent WSSS one-hour 28/28 SHA originals and 151 notification items, but original scientific target unverified and 0/151 location objects.
- Historic YSSY P25 remains 231 billed versus 229 received. Do not infer perfect all-provider callback completeness from latest WSSS run.
- First bounded live adsb.lol six-GET run #40858556582 passed: 76 fresh point observations, 22 aircraft candidates, 18 repeated and 54 plausible segments, zero paid provider; cannot establish operating-flight linkage, schedule delay, or reliability through the day.
- Phase 4 OFFLINE work is authorized by recorded user direction; PAID FIDS, callback, source retention/migration or production release is NOT authorized from this note.

## Seven finite Phase4 work units and blockers
1. P4-A: Make misleading live Gate5 owner fail closed (formerly hard-coded 0 outside population). COMPLETE in PR source, check CI before merge.
2. P4-B: Build pure, bounded, 3-horizon role-aware FIDS-vs-webhook census: first selected-T, as-of population by cutoff, outside captures, expected vs created snapshots, null zero denominator rates, unknown/domestic/international, verified outcome and nested AIRBORNE stages. COMPLETE in offline module/tests, pending CI.
3. P4-C: Map authentic FIDS and LOGGED callback observations into typed source facts with exact airport/service window/version/available_at/identity and lawful retention. NOT DONE; pure module does not read production.
4. P4-D: Obtain a genuinely prospective same-cohort primary FIDS schedule sample with true T and permitted REST budget; previous FIDS requests were not frozen pre-T for the same 151-Alert WSSS cohort. LIVE SOURCE HOLD; no new paid FIDS without a reviewed, bounded specific authorization.
5. P4-E: Verify real PRE snapshot rows per 24h/6h/90m and POST six-stage eligible/observed/usable/complete/snapshot/labeled flight-level funnel; persist lawful LOGGED identities surviving PostgreSQL restart; reject ambiguous ADS-B joins. PARTIAL existing builders, sample proof and durability pending.
6. P4-F: If source/legal access allows, validate country/route/airline, region/tier/time and US FAA/BTS spot-check. NULL and source-not-available are distinct from measured zero. PENDING.
7. P4-G: Independent evidence/CI/source-terms review, explicit Gate5 HOLD or PASS with denominators and frozen manifests. OFFLINE CI can pass, real live Gate5 remains HOLD.

## Critical path, minimized manual work
Now merge reviewed offline mathematics and prohibition on fabricated Gate5 PASS; avoid new infrastructure. Next implement read-only source adapter and restart tests using existing fidsCensus_v3, flightInstanceCanonical_v3, preSnapshotBuilder_v3, and operational journal. Parallelize Phase5 offline calendar/manifest preparation but no final freeze. Only the independently reviewed source/target gap can establish strict Gate5 eligibility. Do NOT copy postflight FIDS values into earlier T cutoffs; do NOT count ADS-B aircraft candidates as airline flights.

No historical data downloads; no vendor email; no Cloudflare or Replit AI Agent; no manual timed Replit operations. GitHub main remains source of truth. No new AeroDataBox spend or SQL/production deployment. This note is a milestone report, not a release authorization.
