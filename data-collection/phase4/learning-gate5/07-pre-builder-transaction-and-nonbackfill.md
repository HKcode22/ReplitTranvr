# 07 — From a staged candidate to a real PRE snapshot: builder, database-clock guard and commit

## Two files, two responsibilities

- `server/lib/disruption/preSnapshotBuilder_v3.ts` builds a prediction-time feature object and performs the actual `INSERT`.
- `server/lib/disruption/phase4Gate5ScopedPreWriter_v39.ts` decides **when** a reviewed GitHub owner may commit that object; it validates manifest/permissions and actual PostgreSQL clock.

This division explains why seeing "eligible source" in the log does not automatically mean "PRE saved".

## Block 1: What a snapshot contains

```ts
export interface PreSnapshot {
  flightInstanceId: string;
  predictionState: typeof PRE_PREDICTION_STATE;
  horizon: PreHorizon;
  predictionCutoffUtc: Date;
  selectedTMilestoneUtc: Date;
  selectedTVersion: string | null;
  populationQueryId: string | null;
  features: PreFeatureOutput[];
  provenance: {
    builderVersion: string;
    fidsResponseHash: string | null;
    frameHash: string | null;
    configHash: string | null;
    missingnessFlags: Record<string, string | null>;
  };
}
```

This is a shortened interface; the actual one has additional provenance fields. The important data structure is a **timestamped feature state with provenance**, not a raw AeroDataBox response or actual departure label.

## Block 2: Why a feature can be missing while a snapshot is valid

Read `selectFeatureValue(feature, cutoffUtc)`:

```ts
if (!feature.informationAvailableAt)
  return { ...base, value: null, missing: true,
           missingReason: "no_available_timestamp" };
if (feature.informationAvailableAt.getTime() > cutoffUtc.getTime())
  return { ...base, value: null, missing: true,
           missingReason: "available_after_cutoff" };
return { ...base, value: feature.value,
         missing: false, missingReason: null };
```

Trimmed source. This is a crucial machine-learning principle: a weather/webhook source that arrived *later* cannot become a feature in a historical prediction. We preserve `null` and a missingness reason. **Optional features missing does not force the entire PRE to disappear** if the required flight/source evidence is valid.

`buildPreSnapshot` checks membership at cutoff, source availability, selected T and exact horizon. It maps each feature through the function above and assembles the missingness flags. It returns either `{status:"snapshot", snapshot}` or `{status:"blocked", reason}`. A blocked candidate is **not yet a database write**.

## Block 3: exact clock math and the three-minute gate

Open `phase4Gate5ScopedPreWriter_v39.ts`:

```ts
const MAX_PRE_EARLY_MS = 180000;
const PRE_COMMIT_MARGIN_MS = 2000;
export function classifyP4G5PreCutoffAgainstDbClockV39(cutoff, clock) {
  if (clock > cutoff) return "LATE_NO_BACKFILL";
  if (cutoff - clock > MAX_PRE_EARLY_MS) return "NOT_YET_DUE";
  return "DUE";
}
```

This is explanatory pseudocode matching the function's decision logic; actual source converts Dates to milliseconds and rejects malformed inputs.

- If C90=4:45, then 4:10 is **not yet due**, even if the 4:00 original is already available.
- At 4:42, it enters the three-minute commit window and is **DUE**.
- At 4:47, it is **late**. The writer must **not** manufacture a 4:45 record now.

**Why limit writes to three minutes early?** It aligns the saved state closely with the intended prediction instant and prevents using an extremely early source as though the prediction was evaluated at the exact later cutoff. Availability still must be <= cutoff.

## Block 4: real PostgreSQL clock beats a caller's claim

The writer begins `SERIALIZABLE READ WRITE` and asks:

```sql
SELECT clock_timestamp() AS db_now_utc;
```

It also verifies the caller's asserted observation time is recent enough and is not *after* DB time. An arbitrary local CLI timestamp cannot convince the writer to backfill an old cutoff. The owner calls the PRE writer repeatedly while it is waiting for physical slots, but each call uses the fresh DB clock.

## Block 5: one horizon only, and exact owner/source lineage

The method `persistP4G5ReviewedPreForCohortV39` first validates permit and scope, then calls `stageP4G5ScopedPreV39` with:

```ts
{
  horizon: scope.horizon,
  expectedOwnerGithubRunId: scope.expectedOwnerGithubRunId,
  reviewedRunAuthorizationSha256:
    permit.reviewedRunAuthorizationSha256
}
```

The stage must supply source/member provenance from the **exact GitHub owner and exact horizon**; other-horizon rows do not satisfy a missing current source.

The code loops over the staged candidates:

```ts
for (const { snapshot: unreviewed } of horizonRows) {
  const decision = classifyP4G5PreCutoffAgainstDbClockV39(
    unreviewed.predictionCutoffUtc, initialClock
  );
  if (decision === "NOT_YET_DUE") { notYetDue++; continue; }
  if (decision === "LATE_NO_BACKFILL") { lateNoBackfill++; continue; }
  // Re-read database clock and persist only if still DUE.
}
```

**Important debugging lesson:** `lateNoBackfill` counts *staged candidates now past cutoff*, even if the same PRE was already written on time earlier. It is **not by itself a count of missing PRE**. The independent audit compares each passed cutoff with persisted records.

## Block 6: insert once, check the conflict deeply

The builder's insert:

```sql
INSERT INTO clean.flight_snapshots (...)
VALUES (...)
ON CONFLICT (flight_instance_id, horizon, prediction_cutoff_utc)
DO NOTHING;
```

`ON CONFLICT DO NOTHING` alone can hide a dangerous case: an existing row might contain a *different source hash, features or selected T*. The higher-level writer therefore performs a **readback** when the insert count is 0. It compares exact cutoff, selected T, version, population query, response hash, builder version, features, frame/config hashes and full provenance JSON.

If any differ, it throws `P4_G5_PRE_EXISTING_SNAPSHOT_PROVENANCE_CONFLICT`. This is **idempotency**: repeat the *same* operation safely, but don't silently replace historic evidence.

## Block 7: ensure the commit itself is before cutoff

A subtle race: the code could begin an INSERT at 4:44:59 but not commit until after 4:45. The writer checks the database clock **again before COMMIT**, with a 2-second margin:

```ts
if (insertedCutoffs.some(cutoff =>
  commitClock.getTime() + PRE_COMMIT_MARGIN_MS > cutoff.getTime()))
  throw Error("P4_G5_PRE_COMMIT_TOO_LATE_ROLLBACK");
```

On exception, the transaction **ROLLBACKS**. This is more rigorous than assuming a pre-cutoff HTTP request or an earlier statement timestamp makes data available at cutoff.

## Block 8: what each returned counter means

```text
newlyPersistedRows                actual new snapshots inserted this invocation
previousVerifiedIdempotentRows    previously existing identical snapshots verified this invocation
notYetDueCandidates               candidate flights with cutoffs still in future
lateCutoffCandidatesNotBackfilled  candidate cutoff times already passed
originalReceiptsBoundAtPreWrite    source original prefix verified at this read
```

Repeated log lines every ~16 seconds may print `newPRE:0` and `priorSameEvidencePRE:1`. This is not one new paid provider GET or another newly inserted PRE. The owner separately accumulates the **newly inserted** count.

## One full trace (illustrative)

```text
Flight A selected T = 06:15
C90 = 04:45
04:30 provider source persisted and bound
04:39 writer sees candidate but NOT_YET_DUE
04:42 writer verifies source_available<=C90 and enters DUE
04:42 writer INSERTs exactly one snapshot
04:42 writer reads DB clock before COMMIT and commits safely
04:43 writer sees same candidate, verifies it already exists unchanged
04:46 lateNoBackfill counter includes Flight A
Independent audit still finds Flight A has valid on-time PRE
```

## Exercises

1. Why does code compare information-availability time **and** commit clock?
2. What does an idempotent repeated PRE attempt do if a row already exists?
3. Why can `lateNoBackfill=7` coexist with `missed=0` in the independent audit?
4. What happens to all writes in the transaction if the final clock guard fails?
5. Why can a missing optional webhook feature become `null` without falsifying the entire flight snapshot?
