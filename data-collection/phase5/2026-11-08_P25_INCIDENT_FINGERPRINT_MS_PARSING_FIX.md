# 2026-11-08 — P25 dry-run incident fingerprint false HOLD: PostgreSQL milliseconds preserved

## Actual owner execution of merged PR #493 (13:05:51 UTC)

Owner invoked immutable source-pinned Replit Shell launcher `b6b3c25f41fa18bc322c69bd5942591f6104693f`. It passed exact Replit local HEAD/source/secret prerequisites, read **current provider native strict subscription LIST** and single production `BEGIN READ ONLY` transaction.

Actual measured response: `mode=DRY_RUN`, `status=HOLD`, blockers **only** `INCIDENT31_HISTORIC_FINGERPRINT_MISMATCH` and `INCIDENT32_HISTORIC_FINGERPRINT_MISMATCH`. Provider account **0 current active and 0 current active billable**; exact incident IDs [31,32], original probe19 `failed/DELIVERY_GAP`, historical 231 billed /229 received /gap2, P25 budget `OPEN` cap500 and sole global OPEN budget, 58 refs 58 tombstoned, 0 live, all other guard fields accepted. `dbMutations=0`, `providerMutations=0`, `rawObjectMutations=0`, `noAutomaticApply=true`; old synthetic once marker unmodified. **No admin closeout performed.**

## Mechanism identified from reviewed source and reproduced

The SQL runner `scripts/v39_p25_incidents31_32_budget_exact_admin_disposition_v39.ts` used:

```ts
const toTime=(v:unknown)=>new Date(String(v??"")).getTime();
```

PostgreSQL dates are received by `node-postgres` as JavaScript `Date` objects; `Date.toString()` **drops fractional seconds**. Thus the owner-reported historical incidents `2026-10-13T05:02:49.928Z` and `2026-10-13T05:04:21.617Z` incorrectly became `...49.000Z` and `...21.000Z` when converted to `String` first. Standalone JS evaluation reproduced precise **928 ms and 617 ms loss**, explaining the **pair** of exact fingerprint HOLDs without requiring historic records to change. An incidental effect was `observedAtUtc` rendered at `13:05:51.000Z` rather than preserving any actual fractional milliseconds.

## Narrow implementation and unchanged guards

The fix moves exact PostgreSQL timestamp conversion to pure `p25ExactPgTimestampMsV39`, which consumes a real `Date` using `.getTime()` without stringifying; accepts only strictly canonical `YYYY-MM-DDTHH:mm:ss.SSSZ` strings as a defensive fallback and otherwise returns NaN. The existing exact incident milliseconds, IDs, types, provider deletion/cleanup flags, probe/budget foreign-scope checks, exact original 231/229/2 gap, zero active current provider, 58 tombstones, zero active/settling/cleanup/source scope and paired atomic admin-only contract remain **unchanged**. Tests directly reproduce both original false HOLDs and show exact millisecond preservation, and reject a 1-ms tamper, timezone-free/wrong-format and invalid dates.

The Replit owner shell launcher is repinned to reviewed new pure-helper and runner Git blobs. It remains **DRY RUN ONLY** and never executes `--apply`. Separate administrative `--apply` is NOT authorized by this bug fix, and requires explicit owner approval plus fresh live provider inventory after independent review. If a fingerprint HOLD persists after this code fix, do not weaken any guard: inspect narrowly the actual JSONB field types without printing secrets or full incident payloads.

## Phase5 scope

Historical P25 remained scientifically `failed/DELIVERY_GAP` and cannot be upgraded by administrative cleanup. Repeated Phase2G paid pilots, installed V0079–V0083 migrations, deleted/expired raw original reconstruction and paid Phase6 launch remain disallowed. In parallel, work on honest source rights/retention, f.8 31-day signed future calendar and budget rows, independent GitHub source→three PRE cutoffs→POST/STOP, and final scientific FREEZE. AeroDataBox email replies are not a gate to nonpaid engineering.
