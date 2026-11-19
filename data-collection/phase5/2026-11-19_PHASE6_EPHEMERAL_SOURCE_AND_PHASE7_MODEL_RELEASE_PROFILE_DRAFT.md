# Phase 6 ephemeral-source / Phase 7 model-release profile

**Status: draft release profile; not a source-use approval, not a replacement
for the immutable Phase 5 freeze, and not a Phase 6 paid GO.**

The implementation companion is [the second retention / Phase 7 derived
release packet](2026-11-19_PHASE6_SECOND_RETENTION_PHASE7_DERIVED_RELEASE_PACKET.md)
and its strict packet validator. This draft remains the design rationale; the
companion is the enforceable field/row/packet boundary.

## Decision this profile implements

Phase 6 may use AeroDataBox material in an operational, short-lived source
layer to construct a narrowly defined Phase 7 model-release representation.
The source layer remains subject to the existing hard expiry controls. The
longer-lived object is not a copy of the source response, a normalized flight
row, a flight identifier, or an assertion that existing `clean.flight_snapshots`
or `clean.flight_outcomes` qualify as a Derived Work.

The project therefore retains two distinct products:

| Product | Purpose | Retention disposition |
| --- | --- | --- |
| Operational source custody | prove on-time PRE/POST construction, recover short-lived failures, and enforce source expiry | existing FIDS/raw expiry controls; deletion/tombstone only |
| Phase 7 release artifact | train, validate, calibrate, and reproduce a model from a restricted feature/label representation | only after an independent review certifies the exact representation as non-reconstructable Derived Work under the applicable provider terms; the packet itself never grants that approval |

The Phase 5 frozen manifest remains the predecessor. A future signed release
must bind this profile's exact schema/version and must not mutate that manifest
or manufacture `sourceRightsApproved`.

## What is intentionally not retained in the Phase 7 artifact

The artifact must exclude all of the following when they originate from
AeroDataBox or encode a recoverable AeroDataBox flight record:

- raw payloads, response/request hashes, delivery IDs, provider IDs, query IDs,
  subscription/account facts, provider timestamps, and evidence JSON;
- flight number, callsign, carrier, tail/registration, airport code/name,
  exact route, exact scheduled/revised/actual timestamps, and flight-instance
  or population-member identifiers;
- direct source values merely copied into `features_json`, `provenance_json`,
  `flight_outcomes`, or `historical_feature_store`.

Deleting the raw body while keeping any of the above is not enough. Hashing or
shortening a flight identity is not enough either.

## Minimum model-useful release representation

The exact schema must be approved before a writer is enabled. Its intended
shape is a random, non-reversible training-row identifier plus:

- horizon (`T-24h`, `T-6h`, or `T-90m`), cohort/day bucket, and predeclared
  split assignment;
- discretised/quantised feature bins whose dictionary is versioned and whose
  individual values cannot reconstruct an underlying provider record;
- missingness indicators and source-independent feature versions;
- a binned or otherwise approved target/label, censoring state, and quality
  flags; and
- transform version, feature dictionary hash, and release receipt hash.

The random row identifier must be generated independently of provider identity;
any temporary source-to-row mapping must expire with the source layer. No
artifact field may permit joining back to an expired `clean.flight_population`,
`clean.flight_snapshots`, `clean.flight_outcomes`, webhook, FIDS, or raw table.

This remains useful for Phase 7: supervised training and protected validation
need a fixed feature vector, outcome, horizon, split, and quality/missingness
state. They do not need the provider response body. The trade-off is deliberate:
the model can learn from approved bins/engineered variables, but cannot depend
on an exact long-lived flight replay or an unbounded per-flight archive.

## Required controls before use

1. **Field contract.** Commit an allowlist for every artifact feature and
   target, its source class, transformation, quantisation/bucketing rule, and
   reconstruction-risk rationale. Unknown or direct-copy fields reject the row.
2. **Ephemeral linkage.** Keep the source-to-artifact mapping only in the
   existing source-custody layer, subject to its stricter expiry. A release row
   may never carry that mapping.
3. **Two independent checks.** Test both that prohibited fields are rejected
   and that an approved row cannot be joined to a retained source table after
   expiry. This is a release-test condition, not a claim from a table name.
4. **Retention separation.** The existing expiry owner handles raw/FIDS and
   source-linked normalized fields; a separate artifact lifecycle handles the
   approved release, model weights, calibration aggregates, and deletion at the
   approved research end date.
5. **Evaluation protection.** Assign grouped day/cohort partitions before
   training. Do not use any source identity or post-cutoff fact to construct a
   feature, and do not let multiple representations of the same temporary
   source identity cross the protected split boundary.
6. **Approval binding.** The final source-enable approval must cite (a) this
   exact artifact contract and tests, (b) the current terms/account review, and
   (c) a reviewer decision that the exact output is a permitted
   non-reconstructable Derived Work. The ledger stays empty until then.

The second packet implementation additionally requires exact row keys, a
grouped cohort-to-split fence, consistent missingness (`null` iff missing),
explicit censoring, and numeric-only bucket maps. These are engineering guards
against accidental source copying; they are not a provider-rights determination.

## Current repository disposition

`clean.flight_snapshots`, `clean.flight_outcomes`, and
`clean.historical_feature_store` are **candidate/mixed source surfaces**, not
the Phase 7 release artifact. Their names and existing matrix classification do
not satisfy the field contract above. The current inventory correctly requires
field-level proof for PRE and outcome content. This profile preserves those
guards; it does not reclassify them by owner declaration.

## Readiness outcome

This profile protects the scientific objective: Phase 7 can train and validate
on approved transformed representations without retaining raw provider
responses. It cannot promise a particular accuracy in advance; accuracy still
depends on observed sample size, label coverage, feature signal, and the
protected evaluation. It also cannot authorize the current automated paid
collection by itself. The allowlisted packet builder and rejection tests are
now merged on `main`; any future source-facing writer must still accept only
reviewed bucketed inputs and must be submitted for the independent
terms/source-use review required by the existing Phase 6 activation ledger.
