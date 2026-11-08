# 2026-11-08 — Historical P25 incidents #31/#32: exact safety scope, expiry and Phase5 separation

## Real November 8, 12:20:26 UTC Replit readback

Owner executed the merged immutable Git blob `e2c1a93dd9a4ccbdd3a04e42b52345fb09b6a056` with `BEGIN READ ONLY`, `dbWrites=0`, `providerCalls=0`, `syntheticPostExecutedByThisDiagnostic=false`. The runtime production `neondb` source reported exactly **two unresolved incident rows**:

| ID | At (UTC) | Cause / kind / reason | Historical flags |
|---|---|---|---|
| **31** | 2026-10-13T05:02:49.928Z | `reconciliation` / `stage1_supervisor_recovery` / `provider_subscription_isolation_lost` | `providerDeleteVerified=true`, `runtimeCleanupVerified=false` |
| **32** | 2026-10-13T05:04:21.617Z | `reconciliation` / `prepaid_probe_failed` / NULL reason | deletion / cleanup flags NULL |

The owner additionally observed `activeOrSettlingProbeCount=0`, `originalOnceMarkerPreserved=true`. **Do not infer actual current provider subscription inactivity** from zero DB active probes or an Oct13 historical delete flag. #31 and #32 remain OPEN; their complete incident-detail JSON wasn't printed and cannot be guessed from kind alone.

A prior no-provider synthetic webhook one-shot from merged PR #490 failed at `REFUSED:OPEN_INCIDENTS:2:UNRELATED_OR_MULTIPLE_OPEN_INCIDENTS`. The existing `assessIncident30ZeroProviderSmokeV39` exception explicitly handles **one distinct historical #30**, not #31/#32. It rejected **before** wrong-secret HTTP POST, signed POST, new disposable session and blob creation. Its local attempt marker remains immutable. Do not rerun, erase marker, or blanket resolve these incidents.

## Independently documented October 13 P25 history and facts

[Original P25 postrun forensic issue comment](https://github.com/HKcode22/ReplitTranvr/issues/28#issuecomment-6138899804) records YSSY probe19, exact session `b0077437-edc1-459a-9d63-8c6e6e50c4f2`, batch `P2G-S1-20261013-03`, exposure 7,203.639 seconds, **231 external billed credits / 229 internally saved = two-credit DELIVERY_GAP**. Original strict probe result **failed**, not MATCH. The watchdog isolation alert followed scheduled end and is compatible with—but does NOT prove—an owner-delete / watchdog-timing race. It does NOT explain the earlier missing credits.

The [October 13 stored-body forensic](https://github.com/HKcode22/ReplitTranvr/issues/28#issuecomment-6156198896) independently verified **58/58** original object bytes and hashes at that time, 308,832 bytes, with 229 claimed flight items and 0 internal item-cost disagreements; provider bill remained 231. After session expiry, original blob references had a latest scheduled TTL `2026-10-20T05:02:12.501Z`; the October 13 cleanup DRY_RUN had 58 live original refs, zero transient runtime rows and no cleanup journal. That older snapshot is **not proof of actual Nov8 tombstones** or current provider inactive state.

Already-reviewed [incident31 expiry-closeout script](../../scripts/v39_p25_yssy_incident31_expiry_closeout_v39.ts) and pure [strict eligibility guard](../../server/lib/disruption/phase2gIncident31ExpiryCloseout_v39.ts) require exact probe19/incident31/reconciliation fingerprints, **all 58 expected original references verifiably tombstoned**, zero active/settling probes, zero open budget days, zero transient runtime scope, actual current provider inventory zero active billable, and explicit approved closure. Its `--apply` would **change the production incident status**; it is neither used nor authorized here. It does not automatically settle #32. Expiry time by itself is insufficient.

## New narrowed, zero-provider and read-only diagnostic

`scripts/phase5_p25_incident31_32_historical_scope_readonly_owner.sh` uses existing Replit runtime DB and one `BEGIN TRANSACTION READ ONLY` / `ROLLBACK` connection to produce:
- Exact incident31/32 identifiers, bounded reason and historical delete/cleanup claims; whether original JSON explicitly links to P25 probe19, budget and session, with unknown links labeled as unknown.
- Probe19 identity/status/reconciliation/recorded cost-gap fingerprint and budget-day state; active or settling probes; existing cleanup journal/transient rows.
- Metadata-only counts of all 58 original refs, tombstones, *expired-but-untombstoned references* and last expiry (does not download raw content).
- Whether PR #490's one-shot marker still exists and explicit `newSignedSyntheticPostAuthorized=false`, `phase6PaidGo=false`.

No provider LIST/GET or email wait, no object read or TTL changes, no SQL writes or incident resolution, no signed POST, no provider mutations, no Git checkout or Replit deploy. This readback alone **never admits a synthetic retry** and cannot certify lawful use of expired Content. A future scientific/engineering decision should explicitly separate a genuine unresolved safety issue from test-only negative admission; do not allow historic provisional exceptions to leak into actual paid creation.

## Keep Phase5 engineering moving

This historical Phase2G lane must not turn into another source-only pilot or block unrelated Phase5 code review. Already installed V0079–V0083 and published V2 source identity stay complete. Real Phase5 work remains: valid source-rights/retention purpose, honest target and anchors, frozen 31-day f.8 calendar + seven REST and Alert budgets, unattended GitHub early draw→real FIDS SOURCE→T24/T6/T90 PRE witness→POST/STOP/daily QA, and one independent scientific FREEZE. **Scientific Phase5 FREEZE HOLD, distinct Phase6 paid launch NO-GO.** Don't await AeroDataBox email replies or repeat account identity questions.
