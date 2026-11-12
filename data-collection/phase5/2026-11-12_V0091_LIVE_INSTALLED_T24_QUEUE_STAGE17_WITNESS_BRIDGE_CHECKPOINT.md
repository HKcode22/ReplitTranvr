# Phase 5 — V0091 LIVE; T−24h queue → existing Stage14 + V0081 witness bridge

**Owner-reported successful private Replit Shell readback:** On November 12, 2026, the owner ran the exact reviewed merged-main V0091 owner command. The output ended with `P5_CD_V0091_OWNER_COMMAND_FINISHED` and showed `V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT` in actual project `neondb` PG16.

| Actual owner report | Value |
|---|---|
| V0091 migration Git blob | `62f1f99883c47cc60ee00c31f21a34bbdb8a5515` |
| Registered source function owner | `phase5_cd_source_registration_owner_v39` (NOLOGIN) |
| Reused PREPARE group | `phase5_fids_prepare_prod_20261107` |
| PREPARE register EXECUTE / direct queue INSERT | true / **false** |
| Existing snapshot+queue | preserved |
| Queue tasks | **0** |
| Task enrollments / flight snapshots | **0 / 0** |
| New GH secrets / provider calls / paid calls | **0 / 0 / 0** |
| Existing worker scheduled | **false** |
| Legal/content independent certification | **false** |
| Phase5 scientific freeze / Phase6 paid GO | **false / false** |

**Do not rerun V0087, V0088, V0089, V0090 or V0091 installation.** Those five production schema and privilege steps are finished. Do not conflate the installer SSL compatibility warning with an installation failure; address future `pg` SSL changes separately without printing the DATABASE_URL.

## The actual missing experiment sequence

The project already has V0079 stored original FIDS source, V0081 independent witness implementation, V0087 task queue, V0088 PRE same-transaction guard, V0089 NOLOGIN guard owner, V0090 PRE role queue permissions, and V0091 PREPARE-only source registration. It also has signed PRE packet generators/roles and GitHub worker infrastructure from earlier Phase5 stages. No duplicated collector, separate PRE writer, additional paid provider, Cloudflare or Replit agent is needed.

T−6h and T−90m PRE require an earlier **genuinely committed T−24h PRE and independently committed V0081 witness**, or a separately reviewed earlier-missing-data protocol. The existing initial C+D GitHub controller does not perform the T−24h witness. Registering only T−6h tasks without an accepted T24 witness would result in rejected flight PRE, not usable training data.

## New incremental engineering on this branch

1. **Existing source-registration pipeline:** The manually reviewed V0091 GitHub PREPARE workflow can now select `T-24h` as its **explicit horizon mode**, provided separate `P5_CD_GH_T24_PREPARE_APPROVED` and `P5_CD_GH_T24_WITNESS_APPROVED` approvals exist. For the usual later horizons it remains unchanged. T24 frozen packet bytes must include the **existing native-T24 source permit and original independent Stage17 witness review**, be source-bound and prospectively eligible in real V0091 SQL. No future T24 source packet or live flight task has yet been enrolled.
2. **Immutable signed roster parser:** Only an explicit T24 witness mode can admit `v39.phase5.github-native-t24-pre-witness-reviewed.v1`; the default later-horizon controller still refuses T24. The parser checks exact packet/roster SHA256 and calls existing `verifyP5T24PreWitnessCrossReview` rather than trusting a self-declared flag.
3. **Original two-transaction chain:** `persistP5ReviewedT24PreAndIndependentWitness` now optionally forwards a **real V0087 queue lease fence** to the original Stage14 PRE writer. It refuses absent/mixed queue fence options if queued mode is selected, retaining prior nonqueue backward compatibility. PRE COMMIT and V0081 witness COMMIT remain separate, with their own readbacks.
4. **Separate GH witness-only identity:** The T24 Stage14 GH permit accepts an existing Stage30 witness credential **only for T24**, when separately approved. The PRE role cannot be substituted for witness and vice versa; existing later-horizon GH controller still rejects witness DB credentials.
5. **Queued T24 one-flight executor:** New `phase5CdGithubQueuedT24Witness_v39.ts` takes only one frozen reviewed source-bound T24 packet, uses the existing V0090 claim/start, original Stage14+V0081, a fresh independently scoped witness readback, then V0087 ACK. If uncertain after start, it reports HOLD, never automatically repeats that PRE or witness. The corresponding manual GitHub workflow is OFF unless owner explicitly enables its repository variable and approvals; no source GET, provider bill, task enrollment or automatic paid action.
6. **Offline regressions:** new tests for exact roster bytes, independent witness cross-identity and cutoff, STOP before SQL, no shared-role witness, old later-only rejection, plus existing Stage24/V0081 tests. The source merge must wait for exact-head CI safety.

## Readiness and honest limitations

- This **does not certify real flight collection**. Owner confirmed 0 V0087 tasks. No actual source-bound T24 queue registration, true prospective PRE + witness result or scientific Phase5 freeze yet.
- The old signed independent source review and legal content/retention rights are still external; a SHA, flag, or reviewed code does not grant an ML Content license.
- A five-minute GitHub cron is not a hard deadline. The new T24 workflow is **manual only** until an independently tested bounded DB-clock scheduler is added, and missed Stage14 three-minute cutoffs are censored rather than backfilled.
- The T24 Stage17 postcommit receipt output remains **unsigned pending separate independent review** before becoming the frozen T6/T90 witness packet. Do not allow a worker to endorse itself.
- The canonical Amendment E candidate remains actual physical departure delay minutes at T−6h, later T−90m update, T−24h comparator, free existing ADSB.lol wheels-off as a distinct physical proxy; independent ground-event label and as-of feature review remain.
- New release gate distinguishes separately approved nonpaid **Phase5 canary** from paid Phase6 GO and never infers one from the other.

**Near-term target:** November 13 technical checkpoint, November 20 Phase5 readiness target if real prospective and legal evidence becomes sufficient. **Current status:** Phase5 scientific FREEZE HOLD / Phase6 paid GO NO. No more schema installations are needed for the already-commissioned V0087–V0091 chain. Next task after CI is one authentic future T24 source + independent witness canary, then signed T6/T90 and POST, while preserving bounded missingness.
