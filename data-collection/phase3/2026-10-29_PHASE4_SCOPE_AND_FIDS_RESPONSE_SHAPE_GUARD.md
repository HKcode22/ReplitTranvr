# Phase 4 Gate 5 — fail-closed flight scope and requested FIDS arrays
Date: 2026-10-29 PDT. Binding: [V3.9 Plan f.8](../plans/V3.9_DataCollectPlan_f.8.md) §§4.3–4.4,5,5.1,7,16–17; [Implementation Log](../implementation/V3.9_IMPLEMENTATION_LOG.md) §§1.9,2.22. Continuing from PR #268 merge `705a130d791e94e1e68e952c070ae1be7d96cae8` (its postmerge offline-safety completed PASS).

## Why this is required

An inspected current `classifyScope` implementation promoted a returned flight to `confirmed_core` if **either** `isCharter === false` alone, or `isCargo === false && isPrivate === false` even with **no** charter observation. This incorrectly treats missing scheduled/charter status as affirmative evidence for scheduled commercial passenger scope, contrary to Plan §4.3. A raw FIDS query with `withCargo=false` and `withPrivate=false` is not, by itself, proof that every returned flight is a verified scheduled passenger service. The original Gate 5 denominator must not silently turn unknown status into confirmed core.

The gateway also returned `departures: []` / `arrivals: []` for missing arrays unless a caller explicitly required a departure list; the production `fetchFidsPopulation` caller had not requested that validation. A malformed provider object missing the requested movement array could thus be misreported as a measured zero-member source observation. That would distort both coverage and expected PRE snapshots.

## Prospective code change

1. `classifyScope` now requires **all three explicit Boolean negatives** `isCargo=false`, `isPrivate=false`, and `isCharter=false` before emitting `confirmed_core`. Otherwise it returns `unknown`, unless a positively observed `isCargo=true`, `isPrivate=true`, or `isGeneralAviation=true` makes it `auxiliary`. An observed charter-positive record remains `unknown` pending independent verification of the provider's charter semantics and exclusion policy. Explicit request filters never serve as replacement per-record evidence. Even three negatives are *candidate scope evidence* subject to Gate 5 provider-field reliability review; they do not prove physical operating identity or actual runway time.
2. `fetchFidsPopulation` requires the `departures` array for Departure queries, `arrivals` for Arrival, and both for Both. `fetchFidsAirport` refuses missing/wrong-type required arrays. Existing default behavior for unrelated direct/legacy gateway calls remains unchanged; an optional unrequested opposite-direction array does not become mandatory. Missing required provider records return `null` / unavailable, not a fabricated measured zero. Valid present empty array still correctly means zero rows observed within that successful response.
3. Add negative counterexample tests for partial/unknown charter flags, GA, cargo/private, all requested-direction shapes, and valid empty lists. No raw historical source, schema, REST budget, webhook/Alert owner, or subscription is modified.

## Scientific disposition and next decision

The one real Tier-2 paid feasibility run #40978316445 returned a matching aircraft/flight status, 2 measured API units, and **no** original runwayTime or provider id. Combined with open issue #200 on actual-versus-estimated/scheduled wheels-off semantics, this is not a reason to repeat an identical paid GET. PR #268 improved prospective fetch-decoded FIDS body custody (not compressed HTTP wire bytes). This scope repair closes a separate false-denominator risk, but does not retroactively certify any previously retained WSSS operators or produce T−24h/T−6h/T−90m same-cohort snapshots. **Strict Gate5: HOLD**; Phase5 final FREEZE/Phase6: **NO-GO** until evidence and sequence meet Plan f.8.

The remaining external-semantic dependency should be resolved from provider contract/authenticated clarification or an owner-approved, versioned target amendment. No Cloudflare, Replit AI Agent, timed Replit shell, new paid provider attempt, new STOP or scheduling in this code-only PR.
