# Phase 2G Incident 25 — zero-credit prepaid item SQL placeholder defect

> Observed: 2026-09-23T07:06:38.500Z
> Incident ID: 25
> Cause: `raw-persistence`
> Mode: `prepaid_probe`
> Provider calls: 0
> Provider subscription creation: false
> Alert credits spent: 0
> Scientific paid run started: false

## Trigger

During the Wednesday same-app Development callback contingency, the fresh zero-credit end-to-end synthetic callback reached the exact current `*.replit.dev` runtime on Git HEAD `9490f06ff5d9e8d40c83730faae41a5a7338d107`.

The runtime health contract had already passed with:

- prepaid route registered;
- retention 168 hours;
- provider mutation false;
- `runtime_owner_mode=replit-managed-project`;
- managed Replit workflow true;
- published deployment false.

The correct-secret synthetic callback then returned HTTP 500.

## Exact production error

The incident ledger recorded:

`column "session_id" is of type uuid but expression is of type integer`

for synthetic runtime session:

`6035a60a-ee15-45a1-8742-486a10f51265`

## Root cause

The prepaid item persistence loop in `server/lib/disruption/prepaidProbeRuntime_v39.ts` constructed PostgreSQL tuple placeholders as literal integers:

`(1,2,3,...)`

rather than parameter references:

`($1,$2,$3,...)`

The first `clean.prepaid_probe_item_runtime` column is `session_id UUID`, so PostgreSQL correctly rejected the literal integer expression.

The provider-content blob upload occurs before the database transaction. On transaction failure the code rolls back database metadata and executes the early-delete cleanup path for the just-uploaded opaque blob. The diagnostic inventory showed no new persisted prepaid blob metadata row associated with the failed synthetic callback.

## Correction

The tuple builder is corrected to emit PostgreSQL parameter placeholders for every item column. A regression test was added so the integer-literal tuple construction cannot silently return.

The callback verifier is prospectively allowed to tolerate only the two exact known zero-credit synthetic incidents 24 and 25 while proving the corrected route. Any additional/open incident remains fail-closed.

After a fresh zero-credit callback PASS, incidents 24 and 25 may be resolved together only through the guarded exact-ID resolver. Their resolution must record zero provider mutation/credits and must not alter historical scientific evidence.

## Scientific interpretation

Incident 25 is infrastructure/test evidence only. It does not change OMAA, WSSS, MMUN, or any historical paid probe result. It was detected before the Wednesday paid WSSS launch, so no Stage-1 provider exposure occurred under this defect.
