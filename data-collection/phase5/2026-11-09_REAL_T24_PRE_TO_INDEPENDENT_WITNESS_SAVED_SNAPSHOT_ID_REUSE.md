# Phase5 — reuse genuine saved T24 PRE and independent V0081 durable witness without an extra copy

**November 9, 2026.** This closes an actual second-transaction handoff missing between two **already installed and independently tested** pieces of Phase5. It does not make new flight observations, install roles, spend AeroDataBox credits, or authorize Phase6.

## What we discovered (and WHY it matters)

The existing [Stage14 source-bound per-flight PRE writer](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) already:
1. Validates the exact V0079 `ACTIVE` source request, V0079 paid-attempt reservation, original response custody, genuine primary member, source cutoff and frozen selected T.
2. Makes a single `SERIALIZABLE` **PRE** database commit using the least-privilege PRE-only role before the flight's own T24 cutoff. It forbids any retroactive PRE or duplicate.
3. Performs a **second DB SELECT after COMMIT** to verify that the exact snapshot exists and that the newly observed database clock is still before cutoff.

The [Stage17 T24 separate-transaction witness](../../server/lib/disruption/phase5T24IndependentPostCommitWitness_v39.ts) already:
1. Uses a different PostgreSQL witness-only role to **SELECT the actual committed T24 PRE**, so it is impossible to mistake uncommitted in-memory state for proven persistence;
2. Inserts the V0081 immutable witness in its own transaction, commits, and reads it back after COMMIT before the same cutoff;
3. Exists because the real production PG16 native `track_commit_timestamp` is OFF; historical `created_at` is not sufficient to prove durable PRE commit.

**Previously missing:** Stage14's post-COMMIT SELECT already returned its saved `flight_snapshots.id` but discarded it from the function result. Stage17 required `expectedSnapshotId`, forcing a separate caller to look up and manually copy the identity (risking cross-flight/horizon mismatches or racing another row). **The source and witness functions were already engineered and tested. The only missing part is the exact ID handoff and two-role orchestration.**

## What this patch changes

- Stage14 now selects `id::text AS id` from its existing post-commit SELECT, validates a real positive snapshot ID and returns it as `committedSnapshotId`, along with existing source/clock evidence. No new SQL write, role or trigger.
- New [tiny orchestrator](../../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39.ts) `persistP5ReviewedT24PreAndIndependentWitness` takes the independently reviewed *T24 native-operating-leg* Stage14 permit and matching Stage17 witness-only review. Before touching DB, reject mismatched identities, source query/body, frame/config, selected T, source cutoff, frozen selected-T version or same PRE/witness pool.
- Calls the **existing Stage14 writer** to durably commit and read back one exact PRE, then passes **that returned actual snapshot ID**, not a caller-created ID, into the **existing Stage17 witness** on the separate restricted witness-only connection. Both existing PostgreSQL triggers and second-transaction readback remain authoritative.
- If the **second** witness operation fails after PRE was saved, fail closed with `PRE_COMMITTED_WITNESS_HOLD_AUDIT_NO_REPLAY`. This is a real two-transaction system: a partial outcome is not a license to rerun and create duplicate PRE or witness rows. Operator must use read-only DB post-commit evidence for recovery. On success output **one exact PRE and durable witness**, with both clocks and same `committedSnapshotId` but no false physical-operating-leg/license certification.
- Deliberately **does not combine** Phase4 G5A conditional scheduled-service (a separately allowed PRE stratum) into a *native physical T24 witness*. That would improperly upgrade a conditional service to certified physical flight evidence. A separately reviewed conditional-witness protocol would require its own source/role evidence.

## Verification

The existing [Stage14 real PG16 integration](../../tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts) now exercises the *actual combined Stage14→Stage17 chain*, using B0062, staged V0079/V0080/V0081, actual source-bound synthetic FIDS original, frozen UTC cutoff, two real PostgreSQL16 transactions and installed Stage27 NOLOGIN groups with separate Stage28 dedicated scoped logins. It asserts real snapshot `id` equals the witness snapshot `id`. Replays, unauthorized role, late cutoff and changed frozen T remain refused. Stage14-only test still verifies its original path when witness job isn't enabled.

The new [pure negative tests](../../tests/phase5_t24_pre_independent_witness_chain_v39.test.ts) guard wrong native selected T, conditional service falsely certified, changed source/rights/frame/anchor or shared role **before any SQL**. Existing Stage14, Stage17 and Stage29 PG16 Actions now include these modules/guards in path triggers. These are **disposable PG16 synthetic receipts**, never production/preexisting pilot replay or live source calls.

## Remaining binding Phase5 work: not a reason to redo Phase2–4

1. Real independently adopted first-cycle schedule-revision / approved target and its provider Content use, rights/expiry/derived-work boundaries; no waiting on an inbox to continue independent engineering.
2. Actual prospective **31 parent-day** calendar/treatment seed and seven physical UTC REST category budgets, with four anchors and five retained comparisons; 21 ordinary adaptive airport sets remain **unknown until each future early draw**.
3. Real authenticated GitHub unattended source GET owner using saved reviewed PREPARED queries, then scheduled flight-level PRE when the **flight's own** T24/T6/T90 cutoff is actually due, with the separately reviewed original/native T/conditional identity scope.
4. Integrate this real T24 pre/witness chain into GitHub runtime under the already commissioned distinct PRE and witness roles; later T6/T90 use saved T24 witness and signed cross-review. Add approved independent POST/receiver/STOP and source missingness/flight-denominator QA. **Do not replay Phase4 Nov6 paid 9 PRE FIDS originals/36 PRE/3 POST evidence**.
5. One independent Phase5 scientific FREEZE and separate Phase6 paid GO before actual first cohort; Day1 real results are post-GO evidence, not prerequisites to approve the experiment.

**SCIENCE FREEZE HOLD. PHASE6 PAID GO NO.** This PR is library integration and real disposable PG16 validation, **not** a production GitHub T24 worker yet. Reuse V0079–V0083 installed migrations and all Stage30/31 verified role credentials; do not reinstall. The last production inventory remains 2026-11-09T13:42Z: 16 scoped new Phase5/6 tables empty then, 7 NOLOGIN roles, Phase6 disabled. This does NOT erase historical Phase2–4 flight data. Check live GitHub main/PR/checks for newer status.

## Future Chat handoff

Read this document, [Phase5 README](README.md), [new-chat assistant handoff](2026-11-09_ASSISTANT_NEW_CHAT_HANDOFF_PHASE5_FULL_SOURCE_TRUTH.md), [real source PREPARED owner checkpoint](2026-11-09_GITHUB_ONE_SIGNED_DAY_SOURCE_PREPARE_REUSES_STAGE30_ROLE.md), and [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). Do not add a new numbered Stage task or repeat sources already verified; next code connection is the actual GitHub source-original→flight PRE/witness→POST producer with independently signed selected-T and source-use.
