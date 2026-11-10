# Phase 5 — existing T24 witness → signed T−6h/T−90m GitHub PRE worker

**Date:** November 9, 2026. **Release state:** engineering integration proposed in PR review; scientific Phase5 FREEZE **HOLD**, paid Phase6 GO **NO**.

## Why this closes one genuine remaining connection

Existing Stage14 `phase5V0079SingleBoundFlightPreWriter_v39.ts` already accepts T−6h and T−90m PREs **only** after a persisted V0081 Stage17 independent T−24h witness is joined back to the original T−24h snapshot and reconciled with an **externally reviewed** immutable Stage17 post-COMMIT readback receipt. Stage24 `phase5T24WitnessedLaterHorizonGuard_v39.ts` enforces this. PR #525/#526 already connected source-bound T−24h PRE to separate witness and provided a signed GitHub T−24h caller. But **no GitHub entrypoint** for the real later PREs existed.

This integration adds one exact signed main-only GitHub worker for **one** future T−6h **or** T−90m PRE, reusing the old restricted PRE group, single-flight writer and clock waiter. No schema/role installation, FIDS GET, Alert CREATE, POST claim, source replay or historical pilot is needed.

## Files

- [Signed prospective later PRE owner](../../scripts/v39_phase5_one_signed_witnessed_later_pre_github_owner_v39.ts)
- [GitHub workflow, manual/main live path plus offline/no-provider PR safety](../../.github/workflows/phase5-one-signed-witnessed-later-pre-main-manual.yml)
- [Exact independent receipt, packet, selected T, role, and no-Go regression suite](../../tests/phase5_one_signed_witnessed_later_pre_github_owner_v39.test.ts)
- Existing tested libraries **unchanged**: [Stage14 source-bound PRE](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts), [Stage24 witness validation](../../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39.ts), [Stage28 role adapter](../../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts), [T24 PostgreSQL clock wait](../../scripts/v39_phase5_one_signed_native_t24_pre_witness_github_owner_v39.ts).

## Signed release and source-to-PRE sequence

1. Separate source/Contents rights, scientific FREEZE, Phase6 GO, current main SHA, and reviewed one-flight packet byte SHA must be independently provisioned. This code does **not** mint approvals from flags or source hashes. The actual source original must already exist, bound to the same flight, and remain unexpired.
2. Exactly one immutable packet from `data-collection/phase5/frozen/*.json` specifies the later source/query, first provider-native scheduled `T`, native operating-leg stratum, exact frame/config/source/horizon/airport/identity, and a separately approved original Stage17 T24 receipt hash. The independent `V39_P5_LATER_PRE_T24_RECEIPT_SHA256` must equal the receipt digest; its flight ID, frozen T/version, frame/config and T24 cutoff must match the one-flight permit.
3. Use only the already commissioned `phase5_p30_pre_login_20261107` / `P5_V39_PRE_DATABASE_URL`. No ordinary app, SOURCE, PREPARE or witness-only role can substitute. Source API secrets are deliberately **absent** from the GitHub workflow.
4. Reuse the already tested DB-clock waiter: start no more than 90m before the reviewed later cutoff, execute within the **180-second pre-cutoff window**, and refuse the last 2s before cutoff or any missed observation. The **Stage14 serializable writer itself** rechecks the exact current V0079 bound original/flight identity, source freshness/expiry, PostgreSQL clock and duplicate flight/horizon; reads persisted V0081 + joined immutable T24 PRE + external Stage17 receipt; commits one PRE; performs independent post-COMMIT readback strictly before its own cutoff. Unknown COMMIT **HOLD, no retry/backfill**.
5. No new paid provider request, write to the V0081 witness ledger, or scientific determination happens as a side effect of CI or workflow merge.

This is an **integration**, not a finished 31-day unattended dispatcher. The reviewed native-only packet requirement is intentionally conservative; no conditional schedule-service key may silently be upgraded to a native operated flight. A different target or conditional first-cycle protocol needs independent scientific adoption and a correspondingly reviewed authorizer. A digest is integrity, **not** a digital signature nor proof of lawful retention or actual aircraft departure.

## Exact GitHub evidence / handoff

At authoring, changes are on `phase5/reuse-stage24-later-pre-github-owner-20261109` **before PR CI/merge**. Check latest PR, actual exact-head tests and **postmerge** main safety workflow before claiming success. Do not reuse a prior session's GitHub main SHA as current.

The next engineering integration after this is genuinely **scheduled** dynamic flight-level source→T24/witness→T6/T90 PRE under one independent signed protocol, then POST/receiver, Alert STOP and denominator/missingness/Day1 abort. A manually reviewed per-flight packet is not a viable month-long unattended producer by itself. Also remaining: independently adopted first-cycle target and source-use/expiry, actual signed rolling-start future 31-day calendar/treatment seed and seven physical UTC REST budgets, one independent Phase5 FREEZE decision and separate paid Phase6 GO. Never rerun Nov6 Phase4 pilot or reinstall V0079–V0083.

**No Replit Shell command is required for this code-review integration.**
