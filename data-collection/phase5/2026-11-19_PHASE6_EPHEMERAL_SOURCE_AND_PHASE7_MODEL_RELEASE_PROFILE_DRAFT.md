# Phase 6 ephemeral-source / Phase 7 model-release profile

**Status: draft release profile; not a source-use approval, not a replacement for the immutable Phase 5 freeze, and not a Phase 6 paid GO.**

## Decision

Phase 6 may use AeroDataBox material in a short-lived operational source layer to construct a narrowly defined Phase 7 model-release representation. The long-lived object is not a source response, normalized flight row, flight identifier, or an assertion that existing `clean.flight_snapshots` or `clean.flight_outcomes` qualify as a Derived Work.

| Product | Purpose | Retention |
| --- | --- | --- |
| Operational source custody | on-time PRE/POST construction and short-lived recovery | existing FIDS/raw expiry controls; deletion/tombstone only |
| Phase 7 release artifact | model training, validation, calibration, reproducibility | only after independent review certifies the exact output as a permitted non-reconstructable Derived Work |

The frozen Phase 5 manifest remains immutable. Any future signed release binds this profile's exact schema/version; it must not mutate the frozen manifest or manufacture `sourceRightsApproved`.

## Excluded from the Phase 7 artifact

When originating from AeroDataBox or encoding a recoverable provider record, exclude raw payloads; response/request hashes; provider/query/delivery/account IDs; evidence JSON; flight number; callsign; carrier; tail/registration; airport code/name; exact route; exact scheduled/revised/actual timestamp; flight-instance or population-member IDs; and direct values merely copied into `features_json`, `provenance_json`, `flight_outcomes`, or `historical_feature_store`.

Deleting a raw body while keeping one of those is not enough. Hashing or shortening a flight identity is not enough.

## Model-useful representation

An approved release row has a random non-reversible row ID, horizon, preassigned split, missingness/quality flags, and a versioned dictionary of discretised feature and label buckets. The temporary source-to-release mapping expires with the source layer and never appears in the release row. The artifact cannot join back to FIDS, webhook, raw, snapshot, outcome, or population tables after expiry.

This preserves the Phase 7 scientific objective: supervised training and protected evaluation require a fixed feature vector, label, horizon, split, and missingness state—not provider response bodies. It does not promise an accuracy level in advance.

## Controls required before use

1. Commit an allowlist for every feature/label, its source class, transform, bucket rule, and reconstruction-risk rationale. Unknown or direct-copy fields reject the row.
2. Limit source-to-release linkage to the existing source-custody period (never over 24h).
3. Test prohibited-field rejection and prove the release row cannot rejoin an expired source table.
4. Keep raw/FIDS expiry separate from the release/model lifecycle.
5. Assign grouped partitions before training; never use a post-cutoff fact in features or let temporary duplicate identities cross protected splits.
6. Bind a final source-enable approval to this exact contract, current terms/account review, and a reviewer decision on the exact output. The approval ledger remains empty until that happens.

## Current disposition

`clean.flight_snapshots`, `clean.flight_outcomes`, and `clean.historical_feature_store` remain candidate/mixed source surfaces. Their names and current matrix rows are not the new release artifact and do not settle the field-level review. This proposal preserves the existing guardrails; it does not enable paid collection.