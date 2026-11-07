# 09 — The separate POST collector and what T+2h really means

## First fix a major possible misunderstanding

The current November 6 **G5A** experiment measures **provider-reported scheduled-departure revisions** after predeparture snapshots. Its outcome code explicitly reports:

```text
outcomeKind: PROVIDER_REPORTED_SCHEDULE_REVISION_NOT_ACTUAL_DEPARTURE
actualWheelsOffClaim: false
```

It does **not** mean we measured an aircraft leaving the ground. ADS-B position, actual runway/wheels-off, and airport departure schedule are different evidence types. The current G5A POST script imports AeroDataBox `fetchFidsAirport` and FIDS transformation code; it does not silently import ADSB.lol or promise airborne coverage. If the broader project later integrates ADS-B, that is another verified source/feature path.

## Block 1 — separate POST workflow

Open `.github/workflows/phase4-gate5-g5a-nov06-1400z-wsss-real-post.yml`. This is a **different workflow** from the T24/T6/T90 PRE owner. It has:

- An offline test job for `push`/`pull_request` (no paid secrets).
- A `post-source` job for a reviewed manual `workflow_dispatch` or specific UTC cron backups.
- A hard actual-GitHub-job-start deadline. A cron appearing in YAML does not mean a real timely POST owner exists.
- Protected paid environment, exact secrets, disabled general collector and Phase6 switches.

The four POST backup crons correspond to **6:40, 6:52, 7:07, 7:22 AM PST**, but this is *prearming*. The real paid source times are later.

## Block 2 — where the important times are defined

Open `scripts/v39_phase4_gate5_g5a_nov06_1400z_prospective_post_schedule_observation.ts`:

```ts
const PROOF_DEADLINE = "2026-11-06T15:25:00.000Z";
const POSTS = [
  "2026-11-06T15:40:00.000Z",
  "2026-11-06T16:10:00.000Z",
  "2026-11-06T16:40:00.000Z"
] as const;
const FINAL = "2026-11-06T17:01:00.000Z";
```

These are the same actual UTC constants formatted for readability. UTC 15:25 = PST **7:25 AM**: the real POST runner must be proven started by then. GETs are **7:40, 8:10, 8:40 AM**; the aggregate is emitted after approximately **9:01 AM PST**. Starting the job at 6:00 AM is *not* a 6:00 AM provider GET.

## Block 3 — verify actual GitHub job, not just a trigger

`assertG5APostRunnerContextV39` checks the repo/ref/SHA, event, secrets, exact POST workflow/job name, no reruns, disabled Phase6 switch and a broad time window. `independentlyVerifyGithubRun` calls GitHub REST to check that the run/job truly exists and began **before** `PROOF_DEADLINE`.

```ts
if (start > ms(PROOF_DEADLINE) ||
    current > ms(PROOF_DEADLINE) ||
    current - start > 90 * 60000)
  hold("GH_POST_NOT_ACTUALLY_PREARMED");
```

This is a reduced excerpt from a longer condition. If a scheduled GitHub backup starts too late, code records **UNOBSERVED** rather than backdating the POST observation.

## Block 4 — confirm earlier information is actually available

Before spending on outcomes, POST evaluates `G5A_PRIOR_T24_PROVENANCE_SQL_V39`. This checks **bound original count and saved on-time T24 PRE**, not that every original remains in its temporary raw-use window *today*. It also counts identities with **all three** saved PRE horizons linked to **the same frozen T**.

```sql
SELECT s.flight_instance_id
FROM clean.flight_snapshots s
WHERE s.frame_hash=$1
  AND s.prediction_state='PRE_DEPARTURE'
  AND s.horizon IN ('T-24h','T-6h','T-90m')
  AND s.fids_response_hash IS NOT NULL
  AND s.created_at<=s.prediction_cutoff_utc
GROUP BY s.flight_instance_id
HAVING count(DISTINCT s.horizon)=3
   AND count(DISTINCT s.selected_t_milestone_utc)=1
```

Selected clauses from `G5A_POST_COMPLETE_THREE_HORIZON_PRE_SQL_V39` (the actual query additionally filters canonical G5A ID shape and non-null selected T). **Why both counts?** A flight that has T24 and T6 but not T90 isn't the same complete three-horizon example. A flight with three snapshots whose selected T changed is also not admissible for the single frozen prediction experiment.

The code requires *at least one* common linked flight before paid POST, not necessarily 12. Partial population means **missingness**, not a magical full PASS.

## Block 5 — reserve one POST slot before provider GET

`reserveG5APostSlotDbV39` generates a deterministic UUID for the manifest+slot and begins a PostgreSQL `SERIALIZABLE READ WRITE` transaction. It takes an advisory lock, checks reserved project units +2 does not exceed 24, verifies no slot replay or foreign POST ledger ID, increments budget and inserts one `adb_rest_attempt_ledger` row.

```ts
const id = postReservationUuidV39(manifestSha, slot);
// ... locked budget and prior-slot checks ...
const changed = await db.query(
  "UPDATE clean.phase4_g5_fids_cohort_budget_v39 " +
  "SET reserved_units=reserved_units+2 " +
  "WHERE manifest_sha256=$1 AND reserved_units+2<=project_unit_ceiling " +
  "RETURNING reserved_units", [manifestSha]
);
```

A lock and deterministic slot ID are there because **two GitHub runs** could otherwise race and spend twice. If a paid attempt has an uncertain result, it must be labeled unknown and not repeated automatically.

## Block 6 — the three source GETs, but this time as *outcomes*

The script loops over `POSTS`:

```ts
for (const [i, planned] of POSTS.entries()) {
  await waitUntil(ms(planned));
  if (Date.now() > ms(planned) + 10 * 60000) {
    unknown++;
    continue;
  }
  // quota -> reserve -> AeroDataBox GET -> normalized POST + ledger binding
}
```

It reads live quota, reserves only if enough units, and passes `restCategory:"outcome"` plus a source reservation ID. The FIDS request still covers the selected WSSS departure cohort. The normalized POST record carries `G5A-POST-20261103-v1` so later SQL can distinguish it from PRE observations.

The clock margin **10 minutes** is a physical source-slot admission bound. It's not permission to use a late POST record after an individual flight's **W=T+2h** watermark.

## Block 7 — compare each PRE feature with a later schedule

`G5A_POST_AGGREGATE_AUDIT_SQL_V39` takes, for each PRE row:

1. Its **as-of baseline**: the frozen `fids_departure_schedule_asof` feature already saved in `clean.flight_snapshots.features_json`.
2. Its candidate POST: a **later qualifying FIDS population observation** with matching analytic identity and approved POST reservation.
3. Its per-flight admissibility rule: `post.available_at > pre.prediction_cutoff_utc` and `post.available_at <= pre.selected_t_milestone_utc + INTERVAL '2 hours'`.
4. The newest qualifying POST if multiple exist, using `ORDER BY p.available_at DESC, p.id DESC LIMIT 1`.
5. The absolute number of minutes between **scheduled departure timestamp as known at PRE** and **scheduled departure timestamp seen in POST**.

A conceptual core:

```sql
abs(extract(epoch from
  (post.dep_scheduled_utc - baseline.dep_scheduled_utc)) / 60) >= 15
```

`extract(epoch ...)` converts a time difference to seconds; divide by 60 to get minutes; `abs` means movement in either direction counts (earlier or later schedule). This is **schedule revision of at least 15 minutes**, not a 15-minute delay relative to actual takeoff.

### Worked example (invented)

Flight A frozen T=6:15. PRE stored an as-of scheduled departure of 6:15 at C90=4:45. A qualifying POST at 8:10 reports scheduled departure 6:35. The observed schedule revision is +20 minutes → `revision_ge15`.

But suppose POST instead first shows the flight at 8:30. Flight A's W=8:15, so that observation is **too late** for the defined T+2h label. Its outcome must be **UNKNOWN**, not "no revision".

If the schedule changed *earlier* from 6:15 to 5:50, its absolute revision is 25 minutes; it also meets the **revision** threshold, although it is not a positive late-departure claim. This matters when interpreting target semantics.

## Block 8 — why unknown is not negative

The aggregate separates:

- `observedRevisionGE15Minutes` — at least 15-minute *observed schedule revision*.
- `observedRevisionLT15Minutes` — observed qualified schedule revision below 15 minutes.
- `unknownNoQualifiedPOSTOrPREBaseline` — not enough admissible source evidence to classify.

A flight with no POST observation is **not "on time"** and must not enter a clean negative class. Even a flight with a low observed revision isn't an actual-wheel-off punctuality proof.

## Block 9 — POST aggregate still isn't Gate5 PASS

The source script prints `G5A_POST_FROZEN_WATERMARK_AGGREGATE_OBSERVED_NOT_GATE5_VERDICT`. It records slots, paid reservations, receipts, normalized rows, missing slots, watermark label counts and `strictGate5Passed:false`. The independent auditor later checks these from a separate role. **A schedule-revision experiment can be operationally successful without proving the original broader runway/airborne research target.**

## Real Nov 6 incident: the PostgreSQL connection died while waiting

The original POST GitHub owner [run #42227608751](https://github.com/HKcode22/ReplitTranvr/actions/runs/42227608751) began at approximately 05:42 PST and crashed at 05:43 PST with PostgreSQL `57P01` and an unhandled Node `pg.Client` `'error'` event. This was **before** 07:40 PST, so its POST loop had not reserved any paid source slot. The core issue was *infrastructure availability during a long wait*, not invalid mathematics in the 12 predeparture snapshots.

Read [the exact incident and scientific risk checklist](../2026-11-06_G5A_POST_57P01_FAILURE_AND_PRE_OUTCOME_RECOVERY.md). In [PR #410](https://github.com/HKcode22/ReplitTranvr/pull/410), the narrowly scoped fix added a PostgreSQL async error listener and **read-only clock heartbeat/reconnect while waiting**, without retrying an ambiguous source reservation or paid GET. The review ran 18 offline tests, including a test that emits a synthetic `57P01` event. Only the POST script and its offline test workflow changed, *after all PRE owners finished and before actual POST source observations*.

**What engineering lesson does this teach?** `await sleep()` doesn't preserve the health of a network socket. Long-lived database connections need an explicit lifecycle, monitored error events, and a clear line between **safe read-only retries** and **dangerous paid or transactional replays**. A green test is still not a guarantee of zero outages. When designing the next cohort, test controlled backend loss during every safe/unsafe state, not only the happy path.

## Practice

1. T=6:15 and POST 8:30. Is POST within W=T+2h?
2. A source's scheduled departure moved from 6:15 to 6:30. Does the label say actual takeoff delayed 15 minutes?
3. Why do POST reservations need their own deterministic IDs and ledger?
4. Explain the difference between **POST prearm 6:00 AM** and **first POST source 7:40 AM**.
5. Explain why a missing POST should remain UNKNOWN.
