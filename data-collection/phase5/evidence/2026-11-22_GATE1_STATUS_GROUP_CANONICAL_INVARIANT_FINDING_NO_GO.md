# Gate 1 — canonical status-grouping invariant violation in the PR #937 candidate (NO GO)

**2026-11-22 UTC. Reviewed main `c6d9bc8512cb67ce7a8e11b68f9e89008bf861fb`; PR #937 head
`60d664462140daab7352c17063ad58c50f67e76c`.** This is a review finding, not an approval. No
provider call, no database access, no policy commission, no paid GO.

## Finding

The proposed grouping in
`data-collection/phase5/evidence/2026-11-21_native_status_exact_contract_group_candidate_NOT_APPROVED.md`
(and in the owner branch candidate
`2026-11-21_GATE1_CONCRETE_16_FIELD_TRANSFORM_REVIEW_CANDIDATE_NOT_APPROVED.json`) puts
`Canceled` and `CanceledUncertain` in the same bucket:

```
bucket 3 = ["Delayed", "Canceled", "Diverted", "CanceledUncertain"]
```

That violates a required canonical invariant:

- `server/lib/disruption/canonicalRules.ts` → `INV-NO-MERGE`: "CanceledUncertain not merged with
  Canceled", type `INVARIANT`, `required: true`.
- `server/lib/disruption/requirementMatrix_v3.ts` → "CanceledUncertain must NOT be merged with
  Canceled".
- `data-collection/plans/V3.9_DataCollectPlan_f.8.md` → preserves `Canceled`, `Diverted` and
  `CanceledUncertain` as distinct states; `CanceledUncertain` is never promoted to confirmed
  cancellation.

The PR #937 validator (`validatePhase7ReviewedTransformationProfile`, `categorical_group_dictionary`
branch) enforces structure only: exact 13-token domain, no duplicates or foreign tokens, at least
two groups, at least two values per group, `bucketCount === groups.length`, feature role restricted
to `reported_pre_departure_status`. It does **not** enforce `INV-NO-MERGE`, so a structurally valid
policy could commission the forbidden merge.

## Minimal correction (review candidate, still not approved)

Split the two cancellation states. One minimal six-bucket candidate:

| Bucket | Inputs |
|---|---|
| 0 | `Unknown`, `Expected` |
| 1 | `CheckIn`, `Boarding`, `GateClosed` |
| 2 | `Departed`, `EnRoute`, `Approaching`, `Arrived` |
| 3 | `Delayed`, `Diverted` |
| 4 | `Canceled` |
| 5 | `CanceledUncertain` |

This preserves the required separation. Whether `Delayed` and `Diverted` should share a bucket, and
whether `Diverted` should be isolated, remain scientific review questions; they are not invariant
violations. The corrected grouping is a candidate only.

## Recommended code guard (not implemented here)

Before any Gate 1 policy approval, add an explicit check in the `categorical_group_dictionary`
branch: reject any group containing both `"Canceled"` and `"CanceledUncertain"`. That makes the
frozen invariant fail closed instead of relying on reviewer memory. This is a new executable change
and therefore needs its own reviewed bridge; it was not added to PR #937 by this record.

## Non-effects

`providerCalls=0`, `databaseReads=0`, `databaseWrites=0`, `policyCommissioned=false`,
`sourceEnabled=false`, `phase6PaidGo=false`.
