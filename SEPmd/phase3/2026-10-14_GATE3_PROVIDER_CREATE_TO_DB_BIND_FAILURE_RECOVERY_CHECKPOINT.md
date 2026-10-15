# 2026-10-14 PDT — Phase 3 Gate 3: provider CREATE → SQL BIND failure recovery

**Repository:** HKcode22/ReplitTranvr · [draft PR36](https://github.com/HKcode22/ReplitTranvr/pull/36) on `phase2g-pragmatic-science-and-checkpoints-20261012`. **Production:** user's local Replit clean release `release/p25-reviewed-publish-20261012` SHA `bb44fc1d122868e20664b2c149406f99bb10cb86`, unchanged. PR37 qualified Phase2 report unmerged; original five-anchor strict Gate2 still NOT_PASSED. The planned future four HUBs WSSS/OMAA/SKBO/YSSY remain unchanged. Phase3 Gate3 paid canary NOT PASSED. No provider calls or live mutations this session.

## What we found by inspecting the REAL code

The shared `server/lib/disruption/prepaidProbeWindow_v39.ts` had:

```ts
const sub = await createSubscription("FlightByAirportIcao", icao, ...);
await bindPrepaidProbeSubscriptionV39(session.sessionId, sub.id);
windowStart = new Date();
```

If the subscription CREATE succeeded with a real billable provider ID but the database BIND then threw (SQL timeout / session lost / UNLOGGED restart), the function escaped with an exception **before** reaching owned provider DELETE or terminal reconciliation. That could strand a billable provider subscription with no linked SQL owner until an external recovery/watchdog noticed it. This is a tangible post-CREATE P0 exposure gap, not a hypothetical YSSY-specific cause. It does NOT prove it caused the old YSSY 231 vs229 discrepancy; many causes remain plausible and the historical recorded mismatch stays unchanged.

## Code change — narrow path, no new infrastructure

- New **provider-free, injected** helper `server/lib/disruption/prepaidSubscriptionBindingRecovery_v39.ts`, commit `a8d28aac2d3543ca466780bf76413391ab11cb63`. Input requires a specific UUID session and exact owned subscription ID. Successful SQL bind returns `BOUND`; on bind failure helper **never issues another provider CREATE**, attempts one strict verified deletion of the exact owned ID, and returns either `BIND_FAILED_DELETED` or `BIND_FAILED_DELETE_UNRESOLVED`. Any failed/ambiguous DELETE remains explicitly unresolved. Neither result claims a settled paid run or exact credit reconciliation.
- Real owner integration in **existing** `server/lib/disruption/prepaidProbeWindow_v39.ts`, commit `6a06adbd8b42cbafacd787e096fb7456cc4a6755`: replace bare SQL binding with the compensating helper; on any bind failure set session to failed best effort, preserve incoming original provider contents for audit, set `externalCredits=null`, `reconciliationStatus="UNRESOLVED"`, `settlementReads=0`, and return `subscriptionDeleted=true` ONLY when strict verified deletion succeeds. The second status is `subscription_bind_failed_delete_unresolved_emergency_stop`; if strict deletion succeeded, status still explicitly requires settlement. **No fake MATCH even with a verified deletion.** The account-wide balance and already-issued SENDs remain unquantified on this failure path, so a new run should remain on HOLD until independently reconciled.
- New actual negative tests `tests/phase3_gate3_prepaid_bind_recovery_v39.test.ts`, commit `49e715fa15d1f8737ac1ddef543aaec4e4de707a`: successful binding does not delete; SQL failure deletes only owned provider ID and never recreates; false/exception from deletion preserves unresolved STOP; malformed exact source scope refuses before either side effect; static real-runner integration asserts compensation sits after CREATE and before watchdog, with explicit unresolved+no premature cleanup.
- This helper covers specifically a **known exact-ID CREATE→BIND failure**. If CREATE itself returns an ambiguous response with unknown ID, the **separate existing LIST-based ambiguous create recovery and independent provider watchdog** remain needed; neither this helper nor GitHub CI is a formal provider recovery test. The entire run still has other crash/error windows which must be tested/prioritized by genuine P0 likelihood rather than declaring impossible 0-loss.

## CI and readiness status

- Prior Phase3 prearmed shared runner exact source+test SHA `dcd4923784cb75c944d90c3ee4a456e0fc66e740` verified 4/4 no-provider GitHub workflows PASS, full offline #38663180390 (1,241 passed/19 skipped), focused #38663180383, real disposable PostgreSQL #38663180516, receiver read-only #38663180448.
- **New executable recovery SHA `49e715fa15d1f8737ac1ddef543aaec4e4de707a` GitHub workflows triggered**, state initially IN_PROGRESS: full #38663796076, focused #38663796063, real PG #38663796038, receiver identity #38663796079. Recheck all four independently and inspect failure logs before claiming green. Full suite must cover historical owner TypeScript and crash-safe source path, not merely this helper.
- **Paid Gate3 remains HOLD**. The existing draft prearmed Gate3 path deliberately throws `GATE3_PREARMED_PROVIDER_EXPOSURE_PENDING_OWNER_AND_HOST_PARITY` **before provider subscription CREATE**. This change improves the **shared real runner** used in Phase2 and later Gate3; no new billable owner has been enabled.
- No Cloudflare/router redesign, no early Phase7 ML, no YSSY rerun, no actual provider API GET/POST/DELETE, no paid credits, no Replit publish/reset, no production SQL DDL/DML, no provider original-data cleanup, no main merge.

## Exact next work

1. Verify latest new source SHA `49e715fa15d1f8737ac1ddef543aaec4e4de707a` CI, correct any failing TypeScript/negative tests and update this checkpoint.
2. Continue the remaining real Gate3 *paid execution owner*, which must independently verify hash-locked exact operator AUTH, real hosted Replit receiver/source hash and Postgres/object-store binding, current provider balance/subscription isolation and HEAD/credit ceiling **before** creating an exact prearmed session provider subscription. It must also ensure cleanup on unexpected exceptions and ambiguous provider responses beyond this one repaired window.
3. Short real hosted zero-provider callback/PG source proof (separate reviewed staging/publish permission); then **separate new bounded operator AUTH** for small positive billed canary, require exact deletion, three stable balance reads, exact external/internal equality, raw source readback and durable terminal evidence. No automated bypass of original legacy canary guard.
4. Upon real Gate3 PASS, complete Phase3 Gate0.5 genuine T/actual labels and Gate4 controller, Phase4 Gate5 independent FIDS denominator, Phase5 scoped four-anchor FREEZE, Phase6 31 paid parent batch days, later Phase7 protected ML. Phase3 target Oct20/contingency Oct22 remains a conditional goal.

**Documentation:** Use [START_HERE](START_HERE.md) as user entrypoint, [full Phase2–7 guide](2026-10-14_TECHNICAL_GUIDE_PHASES2_TO7_AND_CURRENT_GATE3.md), [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38) and this exact new checkpoint. Each substantive session should append latest tested SHA, blockers and start point.
