# Phase 5 — exact original T24 witness → unsigned Stage24 later PRE handoff

**November 9 2026 — code-only engineering review checkpoint.** Scientific FREEZE HOLD, Phase6 paid GO NO. No new database role, migration, paid source, historical pilot or live PRE.

## What was still missing after merged #530

The existing T24 → independent Stage17 witness GitHub worker already committed a genuine T24 PRE and then a second independent V0081 witness in two distinct transactions. Its result contained the original snapshot ID, Stage17 witness DB observed time and post-witness-COMMIT readback time. The existing later T6/T90 worker (merged [#530](https://github.com/HKcode22/ReplitTranvr/pull/530)) requires a precise independently reviewed **Stage24 T24 receipt** with those times and the originally frozen native T, response SHA, query digest, frame and config. Before this change, no code directly derived that Stage24 receipt from the same two commits; manually reconstructing fields could mismatch the immutable T24 witness.

## New connected code

- [Existing T24→Stage17 two-commit chain](../../server/lib/disruption/phase5T24PreIndependentWitnessChain_v39.ts) now invokes `draftP5UnsignedStage24ReceiptFromCommittedChain()` **only after** successful actual Stage14 POST-COMMIT snapshot readback and distinct Stage17 witnessed readback. It verifies exact snapshot ID, source population link, native first T, original T24 cutoff, distinct witness clock strict inequalities, witness status, and full evidence scope.
- The helper builds a typed `P5Stage24ReviewedT24Receipt` candidate with the original bound FIDS **hash**, source query digest, immutable snapshot ID and selected-T version, UTC observed/readback timestamps, original frame/config, and canonical `digestP5Stage24ReviewedReceipt()`. It does **not** repeat or export a raw provider response body.
- [Existing signed native T24 GitHub owner](../../scripts/v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39.ts) now returns `unsignedStage24ReceiptCandidate` after its two distinct commits, enabling later independent review and exact packet binding for the existing signed T6/T90 owner. **A SHA is not a digital signature or scientific approval.** The candidate explicitly sets `reviewedByIndependentAuthority=false` and `mayLaunchLaterPreAutomatically=false`.
- [Existing chain tests](../../tests/phase5_t24_pre_independent_witness_chain_v39.test.ts) check positive canonical receipt, matching original/source hashes, missing/altered witness ID and flight, wrong T24 cutoff, reversed times, late observed/readback and unverified PRE readback.
- [Existing native T24 GitHub workflow](../../.github/workflows/phase5-one-signed-native-t24-pre-witness-main-manual.yml) now includes the new chain tests in its credential-free PR admission job.

## Important remaining boundary

This **removes manual recomputation**, but does not yet eliminate **independent receipt review** or make the complete 31-day owner unattended. To use it for a future T6/T90 PRE, a scientifically authorized release process must verify/sign this generated candidate, store its exact receipt under permitted retention, and supply the independently reviewed receipt hash with a separately signed flight permit to the existing later worker. No missing or late T24 PRE/witness can be backfilled by this algorithm. The code cannot certify native operating identity or provider Contents rights merely by deriving a hash.

Next substantive integration: authorized dynamic source-bound flight eligibility, automatic due-clock owner for all three PREs without per-flight human timing, then POST/receiver/STOP and missingness; separately complete actual future 31-day calendar/physical UTC budget, lawful target/Contents contract, independent Phase5 FREEZE and Phase6 GO.

**At authoring this is review code. Check exact PR head, all executable CI and postmerge main before marking complete.**
