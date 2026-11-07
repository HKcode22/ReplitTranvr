# 08 — Walk through the big real source owner in blocks (not 714 random lines)

**Open exactly this file:** `scripts/v39_phase4_gate5_g5a_nov06_1400z_real_wsss_horizon_owner.ts`, reviewed at SHA `cbf6bf889c95333ddc6b62ec80b98443c094e1cd`. We will not comment every line; instead we will reconstruct the executable call path as if debugging an actual run.

## Overall function call graph

```text
main()
 ├─ assertG5AOwnerRunContextV39
 ├─ parseFrozenManifest / read protocol and rights-scope document
 ├─ proveRealGithubOwnerJob
 ├─ prepareP4Gate5PhysicalOwnerV39
 ├─ connect PostgreSQL / health probe and safe reconnect for IDLE failures
 ├─ prove prior T24 source/PRE for successor horizons
 ├─ check existing owner; stage PREPARED and activate ACTIVE if new
 ├─ tryPre() -> stageP4G5ScopedPreV39 -> buildPreSnapshot -> persistPreSnapshot
 ├─ for each of 3 slots:
 │    ├─ wait(planned) with health probes and tryPre polling
 │    ├─ validate physical deadline, quota and DB health
 │    ├─ reserve one durable attempt (V0076)
 │    ├─ fetchFidsPopulation -> fetchFidsAirport
 │    ├─ persistP4G5BoundFidsDbOnlyV39 -> atomic raw/member/V0077 binding
 │    ├─ tryPre again
 │    └─ after first source, check as-of eligible operating identities
 └─ wait(last cutoff) -> tryPre -> closeout log
```

## Block A: imports — do not jump yet

The top of the file imports `pg` (PostgreSQL), `fs`/`crypto`, `fetchFidsPopulation`, `fetchFidsAirport`, the frozen-grid and owner guards, DB staging and activation, the source binder, and PRE writer. Imports mean *this file uses those helpers*, not that all imported code executes immediately. Your best tracing strategy is to put the cursor on a **call inside main**, not every import at the top.

## Block B: select the horizon and reject illegitimate environments

`main()` begins by running `git rev-parse HEAD`, reads `P4_G5_G5A_HORIZON` and calls `assertG5AOwnerRunContextV39`. Only a reviewed scheduled/manual GitHub Actions run on the pinned main SHA can pass. This blocks local accidental paid execution.

The `H` map contains horizon-specific jobs and backup cron strings. The `H` map is configuration for **admission**, not a list of flight identities.

## Block C: parse the frozen manifest and plan query slots

`parseFrozenManifest` checks cohort ID, airport, full timestamps, max source queries, budget and canonical JSON bytes, then calls `draftP4Gate5ThreeHorizonGridV39`. `prepareP4G5PhysicalOwnerV39` binds the selected horizon's three query slots to digests and hard latest times.

```ts
const owner = prepareP4G5PhysicalOwnerV39({
  cohortId: String(manifest.cohortId),
  frozenManifestBytes: bytes,
  reviewedManifestSha256: manifestSha,
  grid: manifest.grid,
  horizon: h,
  actualOwnerProcessStartedAtUtc: proof.actualJobStartedAtUtc
});
```

Condensed excerpt, preserving the flow. The **frozen manifest** describes *which experiment*; `owner.entries` describes three precise physical source observations for this horizon.

## Block D: prove independent GitHub evidence and rights-document binding

`proveRealGithubOwnerJob` fetches the current run/job from GitHub and verifies correct job-start clock before prearm deadline. Later the script hashes a reviewed source-scope directive and protocol file. That binding is **not an independent provider legal-rights certificate**, and code still records Gate 5 science incomplete.

The reviewer sees SHA fingerprints; they do not replace verification that the underlying provider has actually granted all rights.

## Block E: hold open a DB session, but don't retry paid side effects

The owner creates a `pg.Client`. It has a health probe and a bounded reconnect path for **idle PostgreSQL session loss** such as Neon compute scale-to-zero. A query like `SELECT clock_timestamp()` may safely be retried because it's read-only.

The code explicitly does **not** treat an ambiguous *paid GET*, *INSERT* or *reservation* as an idempotent clock probe. This explains comments such as "Never retry an uncertain paid GET." A helpful rule: retries are safe only when you can prove the action didn't already have a side effect, or when your protocol has a proven idempotency mechanism.

## Block F: successor horizons require earlier real evidence

For T6/T90, `G5A_PRIOR_T24_PROVENANCE_SQL_V39` counts exact original bindings and on-time T24 PRE. If either is zero, later paid collection can't recreate a complete prospective three-horizon cohort, so it refuses to spend. This is an **early stop**, not a success claim.

Next the script checks whether the exact owner already exists. A duplicate scheduled GitHub run must stop without creating fresh paid requests. A special cancelled-T24 zero-spend delegate exists for historical recovery; it is not a universal retry.

Then it calls `stageP4G5PreparedOwnerDbOnlyV39` and `activateP4G5PreparedOwnerDbOnlyV39`. The log `G5A_GITHUB_OWNER_PREARMED_V0076_ACTIVE` means only "this runner now owns the source timetable".

## Block G: keep trying PRE as the real per-flight clocks arrive

The owner defines the inner function `tryPre`. It queries the PostgreSQL clock, calls `persistP4G5ReviewedPreForCohortV39`, then prints `newPRE`, `priorSameEvidencePRE`, `notYetDue`, `lateNoBackfill` and `actualBoundPrefix`.

```ts
const tryPre = async () => {
  if (successful === 0 || Date.now() - lastPre < 16000) return;
  lastPre = Date.now();
  const preClock = await db.query("SELECT clock_timestamp() AS db_now_utc");
  const out = await persistP4G5ReviewedPreForCohortV39(
    dbw, { horizon: h, observedAtUtc: preClock.rows[0].db_now_utc.toISOString(),
           /* exact cohort/owner scope */ }, permit
  );
  preCreated += out.newlyPersistedRows;
};
```

This is an explanatory **shortened** version; the actual call includes airport, full service range, manifest and run ID. Notice: `successful===0` prevents PRE attempts before the first genuine original. The 16-second poll interval means the code can catch the three-minute window near each flight's C.

`wait(until)` calls `readOnlyHealthProbe` and `tryPre` in a loop while it awaits the next physical source slot. It is **not** repeatedly calling the paid source API every 16 seconds.

## Block H: the important three-entry loop

```ts
for (const [sourceOrdinal, entry] of owner.entries.entries()) {
  await wait(ms(entry.plannedPhysicalStartUtc));
  await readOnlyHealthProbe();
  if (Date.now() > ms(entry.hardLatestPhysicalStartUtc)) {
    unknown++;
    continue;
  }
  // ...quota, durable attempt reservation, one provider GET...
  await tryPre();
}
```

Shortened excerpt. `.entries()` gives the loop index and entry object. There are **three entries**, so three opportunity windows. Within each, the code also checks live provider quota, makes an irreversible V0076 reservation, configures one allowed AeroDataBox GET, and persists source/member/binding in one transaction.

**Key guard from the real code:**

```ts
if (sourceOrdinal > 0 && !firstSourceHasQualifiedOperatingIdentity)
  hold("FIRST_ORIGINAL_NO_QUALIFIED_OPERATING_IDENTITY_NO_MORE_PAID");
```

Why? If the first original has no usable operating-flight identities as of the cutoff, spending two more requests may be scientifically useless. This early stop prevents a known-bad census from burning the rest of the budget.

The code also checks `reserveCalls` in the API budget owner callback, ensuring a provider retry doesn't become an unrecorded second paid request.

## Block I: interpret the source success log

```text
G5A_ORIGINAL_AND_OPERATING_POPULATION_V0077_COMMITTED
  horizon: T-90m
  queryIndex: 2
  normalizedRows: 48
  sourceQualifiedIdentityKeys: 12
  originalBound: true
  providerPaidAttempts: 1
```

This means **one particular source GET** yielded and persisted a bound original and 48 normalized rows and recognized 12 eligible keys. It does **not** mean 12 PRE were saved by that specific GET or that POST/actual departure is finished.

## Block J: closeout is after the last planned cutoff

After the loop, the script waits until `last entry.cutoffUtc + 1500ms`, makes the final `tryPre` call and prints:

```text
G5A_PROSPECTIVE_HORIZON_SOURCE_PRE_OBSERVATION_CLOSED
sourceSlotsPlanned, paidAttemptsReserved, exactOriginalBoundResponses,
sourceUnknownSlots, newCutoffSafePRE, verifiedExistingPRE
```

**Subtlety:** source-owner code's exit guard refuses an all-zero source or PRE horizon; it does **not by itself require** all three originals and all 12 PRE. Thus **green GitHub** is a useful operational signal but full completeness needs independent read-only DB reconciliation.

## Where to set four mental breakpoints

1. After `G5A_GITHUB_OWNER_PREARMED_V0076_ACTIVE`: the runner exists; no source proved yet.
2. After first `G5A_ORIGINAL_AND_OPERATING_POPULATION_V0077_COMMITTED`: one source bound, PRE may not yet be due.
3. When `newPRE` becomes positive: at least one flight/cutoff was committed (check independently).
4. At horizon closeout: compare real bound originals and frozen-flight PRE denominators, not only GH conclusion.

## Exercise

Pick `T-90m`. Describe the order **environment → real GitHub job proof → grid → ACTIVE owner → first paid GET → atomic binding → PRE polling → third paid GET → final cutoff → closeout**. At which stages can money be spent? Which stages can create PRE? Which are read-only?
