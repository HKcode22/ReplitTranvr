# 05 — Where real source evidence lives: V0076, V0077, hashes, transactions and the 23-hour clock

## Why this lesson exists

You asked, "Did we save T−24h data before it expired?" To answer correctly we must distinguish:

1. **Original FIDS response** and the permission window to *reuse that original*.
2. **Normalized population rows** derived from it.
3. **PRE snapshots committed before flight cutoffs**, containing permitted feature values plus source/provenance hashes.
4. **Budget reservations** that protect against repeatedly paying for the same observation.

An original expiring later doesn't mean the older PRE was never created. Conversely, a retained hash is not permission to use the copyrighted original after expiry.

## The read-first files

- `phase4Gate5DurablePreparedOwner_v39.ts` — PREPARED owner/query ledger.
- `phase4Gate5OwnerActiveTransition_v39.ts` — real prepared-to-ACTIVE admission.
- `phase4Gate5PhysicalOwnerDispatchGuard_v39.ts` — computes query digest and physical deadline.
- `scripts/v39_phase4_gate5_g5a_nov06_1400z_real_wsss_horizon_owner.ts` — performs actual bounded reservation+GET.
- `phase4Gate5AtomicBoundSourceV39.ts` — binds the exact original, normalized rows and owner into one DB transaction.
- `fidsCensus_v3.ts` — source response transformation and original decoded bytes check.

## Block 1: immutable query slots and budget

The frozen grid has **3 horizons × 3 slots = 9 PRE queries**. Each is limited to one physical paid attempt with an expected 2 units. Total planned PRE maximum = **18 project units**. Three POST slots at 2 each can bring the cohort project ceiling to **24 units**. A local project ledger reserving 2 units does **not** independently prove actual provider billing.

Each allowed query has a digest derived from the manifest, horizon, ordinal, cutoff and source range. If a query is silently moved from 4:00 to 4:05, its digest changes and the reviewed plan no longer matches.

## Block 2: durable reservation happens **before** the paid GET

Representative owner code:

```ts
await db.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
const res = await db.query(
  "SELECT clean.reserve_phase4_g5_fids_physical_attempt_v39" +
  "($1,$2,$3,$4,$5,$6) AS committed_at_utc",
  [manifestSha, owner.ownerDigest, boundRunId,
   entry.queryDigest, 1, expectedReservationSha256]
);
await db.query("COMMIT");
attempted++;
```

This is a shortened excerpt; the actual script also verifies the returned row, handles rollback and checks clock/quota. **Why reserve first?** If a paid GET times out after reaching the provider, blindly sending it again might spend another unit and duplicate evidence. Recording the irreversible attempt first means we can report an **UNKNOWN** result instead of silently replaying it.

The owner requires `attempt===1` in its injected `budgetOwner.reserve` callback. A provider library's generic retry capability does not override this G5A per-slot *one physical GET* restriction.

## Block 3: receive and validate the *actual decoded* original response

The source library checks its fetch-decoded body evidence, including original decoded byte length, base64 string and SHA256, and verifies that those bytes parse into the departures/arrivals arrays used for normalization. That is stronger than merely reconstructing a JSON envelope after parsing.

```ts
const bytes = Buffer.from(evidence.bodyBase64, "base64");
if (createHash("sha256").update(bytes).digest("hex") !== evidence.bodySha256)
  throw Error("P4_G5_V0077_ORIGINAL_DECODED_BYTES_SHA_HOLD");
```

A **SHA256 hash** is a fingerprint of bytes. It helps detect mismatched source custody and downstream re-linking. It does not mean the provider guaranteed every field was correct, or that the project's Content use/retention license is proven.

## Block 4: one atomic transaction for raw, normalized and binding

`persistP4G5BoundFidsDbOnlyV39` calls `persistFidsObservation` with a callback that executes **before COMMIT**:

```ts
const inserted = await persistFidsObservation(
  query, rows, async (db, facts) => {
    const reservations = await db.query(
      P4_G5_V0077_COMMITTED_ATTEMPT_READ_SQL_V39,
      [expectedReservationSha256, queryDigest, manifestSha,
       horizon, expectedOwnerGithubRunId, authorizationSha]
    );
    // Validate owner is ACTIVE and reservation is exact.
    // Insert source original binding, then verify counts/hashes.
  }
);
```

The code excerpt names variables descriptively; inspect the actual source for exact scoped property names. **Atomicity** means raw+members+binding either all commit, or the transaction rolls back. This prevents a source response being logged as usable when its owner/budget/source hash linkage failed halfway.

The original binding table stores `population_query_id`, `expected_reservation_sha256`, `query_digest`, `manifest_sha256`, `original_response_sha256`, `rights_review_artifact_sha256`, `source_use_expires_at_utc`. Together those answer *which original, from which reviewed source slot, and until when may it be used?*

## Block 5: guard actual durable availability, not just GET start

The binding verifies that the attempt was committed before the provider retrieval; source durable time is no later than the grid source cutoff; the DB clock's precommit checks are still ahead of the cutoff (with safety margin). These checks refuse a late successful response masquerading as an on-time observation.

Common SQL:

```sql
SELECT clock_timestamp() AS db_now_utc;
```

This clock is supplied by PostgreSQL, rather than trusting the GitHub runner's clock alone.

## Block 6: the 23-hour source-use expiry

In the current source owner, the expiry is set as:

```ts
const expires = iso(query.availableAtUtc.getTime() + 23 * 3600000);
```

The actual persisted `availableAtUtc` is tied to source availability. 23 hours is a conservative code-defined use window; don't automatically infer it grants rights beyond actual provider terms. Later source eligibility SQL requires the original-use expiry still to be in the future.

**Measured T−24h slot 0:** on Friday Nov 6 at 04:44 PST, a read-only database query found `reserved=1`, `bound=1`, `raw_missing=0`, `raw_expired=0`, `normalized_members=48`, `rights_window_elapsed=1`, and `source_use_expires_at_utc=2026-11-06T12:30:00.714Z`, which equals **04:30 PST**. It was genuinely captured a day earlier, and T−24h has 12 saved on-time PRE snapshots. The reason `retained_usable_now` became 0 was the **expiry clock**, not a lost original. We must not restore/reuse the expired original merely because its bytes still physically exist.

### Diagram of the difference

```text
Thu 05:30 T24 original collected, bound and normalized
Thu 06:05–06:55 T24 flight-specific PRE snapshots committed on time
Fri 04:30 source-use lifetime for first original expires
Fri 04:44 audit sees PRE still saved, original still bound, raw use now barred
```

## Block 7: why code prints "unknown" rather than replaying

`G5A_SOURCE_NOT_PERSISTED_AFTER_RESERVED_PAID_ATTEMPT` means a reserved attempt did not establish a trusted original. Since the provider could have billed the attempt, the code doesn't send another paid GET on the same slot. A missing later source is not a zero-flight census and a missing POST isn't a negative label.

## Exercises

1. What can a hash detect? What can it **not** prove about legal rights or field semantics?
2. Why is a DB transaction with rollback safer than inserting raw data, population members and original binding in three unrelated commits?
3. If the provider responds after an attempt times out, why is automatic retry risky?
4. Explain why "T24 original no longer usable now" and "T24 PRE successfully saved yesterday" can both be true.
5. Identify the differences among `attempt reserved`, `original bound`, `normalized members persisted`, and `PRE written`.
