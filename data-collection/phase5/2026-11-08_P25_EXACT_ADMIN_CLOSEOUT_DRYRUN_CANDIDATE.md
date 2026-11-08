# 2026-11-08 — P25 exact paired administrative closeout candidate (default DRY RUN)

## Owner-measured facts (do not rewrite)
Production `neondb`, 2026-11-08T12:41:19.505Z, reported:
- Open incidents exactly **#31** `stage1_supervisor_recovery/provider_subscription_isolation_lost` and **#32** `prepaid_probe_failed`; #31 links to probe19/budget `P2G-S1-20261013-03`; #32 links to probe19, has no budget/session fields. Both unresolved from 2026-10-13.
- Probe19/YSSY, 7,203.639-second P25: **failed**, `DELIVERY_GAP`, exact original runtime session `b0077437-edc1-459a-9d63-8c6e6e50c4f2`, historical 231 externally billed / 229 received / **two-credit gap**. No later administrative action can change the scientific result or explain missing billed units.
- 58 original references, 58 SHA refs, 308,832 reference bytes, **58 verified deletion tombstone metadata**, 0 untombstoned, after latest expiry Oct 20 05:02:12.501Z. Current stored-object-byte readback was **not** performed by this census.
- 0 historical runtime sessions/deliveries/items/cleanup-journal rows; 0 active/settling probes. Exactly one globally OPEN budget, which is the historical P25 budget. Current provider subscription status is **not proved by the zero probe count**.
- PR #490 signed synthetic receiver once marker exists. Prior invocation aborted at incident validation *before POST*. Preserve it; no replay.

[Actual 2026-11-08 P25 31/32 readback](2026-11-08_P25_INCIDENT31_32_REAL_READBACK_AND_SCOPE.md). [Historical P25 independent forensic](https://github.com/HKcode22/ReplitTranvr/issues/28#issuecomment-6156198896).

## What this new code does

`server/lib/disruption/phase2gP25PairedAdministrativeCloseout_v39.ts`: pure exact-data predicate that permits **administrative** closure only if current provider strict subscription LIST verifies 0 active, the only open budget is exact `P2G-S1-20261013-03` (cap 500, one probe), both precisely timestamped incident31/32 fingerprints match, 58/58 original refs have tombstones after expiry with correct content contract, no other active probes/UNLOGGED runtime/journal, and original 231/229/2 failed probe is unchanged. Any unknown, foreign incident or subscription fails closed. The test suite exercises wrong timestamps/IDs, changed science, wrong budget, live data, provider active and expired-but-untombstoned refs.

`scripts/v39_p25_incidents31_32_budget_exact_admin_disposition_v39.ts`:
- **Default `--dry-run`** calls the existing `listSubscriptionsStrict` (one provider subscription-LIST GET; no Alert CREATE/DELETE or REST flight search), opens a production `BEGIN TRANSACTION READ ONLY`, re-reads every exact historical field and prints bounded status/blocker codes, then `ROLLBACK`.
- A separately gated `--apply` exists in reviewed code but is **NOT authorized for execution by this handoff**. It requires an explicit narrow operator confirmation environment token, fresh strict provider LIST, an exclusive transaction advisory lock, all current values rechecked under row locks, and atomically administratively resolves only #31 and #32 and closes only this exact P25 budget, without touching the probe, reconciliation, raw originals, provider subscriptions or Phase5/6 release. It records an immutable-purpose resolution annotation including a deterministic receipt hash. It does not make the historical two-credit gap disappear.
- `scripts/phase5_p25_exact_admin_dryrun_blob_owner.sh` is the separate **dry-run-only** immutable one-line Replit handoff. It accepts only the measured local Replit HEAD and exact old reviewed DB/provider reader hashes, stages two exact Git blobs into exclusive temporary files in the workspace while testing (no tracked Git changes), runs the reviewed TypeScript code **only with `--dry-run`**, and cleans its own temporary files on exit. It cannot call `--apply`.

**Do not perform a production administrative mutation just because a report says ELIGIBLE.** First inspect the exact owner output, confirm current provider zero, verify no source rights/retention issue, review scope and obtain the specific admin-action authorization. Leave historic science failed/DELIVERY_GAP; this is not a callback ingress PASS nor paid Phase6 GO.

## Project critical path remains Phase5 engineering

This exact archived P25 tidy-up is separate from f.8 signed 31 batch-day calendar, provider REST+Alert credit budgets, early immutable selected draw, real GitHub-only source→T−24/T−6/T−90 PRE/witness→POST/STOP and missingness report, and a signed independent scientific FREEZE. V0079–V0083 are installed; the published receiver V2 source was independently witnessed but signed nonempty webhook→durable original→2xx/cleanup is not certified. Do not wait for email replies or rerun old cohorts, migrations or paid retries. Scientific Phase5 FREEZE HOLD; separate paid Phase6 GO NO.
