# Gate 1 — verified public FlightStatus domain and grouped candidate (NOT APPROVED)

Owner's actual Nov21 local command downloaded the public OpenAPI specification and matched SHA256
`63b8daf194858a27ea487308f34839def760aadda2acd9f81c82c466f9de7f09`, version `1.15.4.0`.
Reported `EXACT_PROVIDER_CONTRACT_VERIFIED`, billableProviderCalls=0, databaseWrites=0, phase6PaidGo=false.
The downloaded temporary file was deleted by the owner script's trap. Evidence here is the owner's reported exact-hash result; no live flight observation was made.

## Exact source domain

`Unknown, Expected, EnRoute, CheckIn, Boarding, GateClosed, Departed, Delayed, Approaching, Arrived, Canceled, Diverted, CanceledUncertain`.

The existing original FIDS compiler reads the native `status` field unchanged as a bounded string from the matched operating movement, then binds it to the original source availability. Source-shaped Packet A remains unchanged.

## Proposed model-input grouping — review candidate, not final scientific or rights decision

| Candidate bucket | Exact input domain | Meaning |
|---|---|---|
| 0 | Unknown, Expected | No stronger affirmative progress or disruption signal reported; Unknown does not mean expected or on time |
| 1 | CheckIn, Boarding, GateClosed | Reported pre-departure process progress; no actual gate-out attestation |
| 2 | Departed, EnRoute, Approaching, Arrived | Provider reports departure/travel/arrival progress; not a verified physical milestone |
| 3 | Delayed, Canceled, Diverted, CanceledUncertain | Provider reports an exception or uncertain cancellation; not equivalent to delay minutes or a confirmed cancellation |

The candidate is exhaustive (13/13 tokens exactly once), disjoint, non-injective (2/3/4/4 possible inputs at the isolated dictionary level), case-sensitive, and explicit. The executable validator requires every recovered public token exactly once across approved groups and rejects foreign/missing tokens, singleton buckets, ambiguous memberships and invertible native dictionaries. Actual source-present unexpected status fails the existing parity/write guard; absent evidence remains honest missingness. No implicit fallback bucket.

This test is necessary but NOT sufficient for non-reconstruction: cross-horizon trajectories, availability patterns, route/timing priors and other released features may identify a single status. Nor does group membership prove predictive information parity. Before any independent policy approval, review joint reconstruction with the actual release design and first-cycle conditional target, including the cost of merging delayed/canceled/diverted, and explicit missingness, censoring, source and group linkage rules. A grouped status never becomes an actual gate-out or outcome. Do not infer absolute non-reconstructability or force adoption of this candidate.

The approved bounded published Terms review remains separate; no new personalized exception or extended caching is assumed. No code changes to Packet A, original calendar or continuous Amendment E label. Original source remains subject to bounded custody. No policy commissioned, no source enabled, no paid GO.

PR #937 exact implementation head before this documentation commit: `124363dc727619f4a2007319ae46888f18601600`. Earlier scoped CI was for an earlier head, not this change. Exact new CI required.
