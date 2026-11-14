# Phase 6 — private SOURCE → original Phase5 signed child admission checkpoint
**Date:** Nov 13, 2026 PST (Nov 14 UTC). **STOP default.** No real provider calls, database writes, migration installation, GH child dispatch, or paid GO.

## Existing components reused
- Merged #640: authenticated PostgreSQL16 restricted V0095 private one-query reader and external Ed25519 review.
- Merged #650: V0096 index + full restricted SOURCE/LATER_PRE/POST registry SHA-verified in-memory day/shard selector and PostgreSQL clock.
- Merged #651: V0096 exact-Git-blob nonpaid **one-time schema installer code only**, not production execution.
- Merged #652: one private SOURCE_QUERY_PACKET exact binding to the signed SOURCE_DAY_REGISTRY and same-job two-private-file stage/cleanup.
- Earlier main: `server/lib/disruption/phase5SignedDaySourceChildRelease_v39.ts` original main-only signed one-FIDS-GET gate; `scripts/v39_phase5_one_signed_day_source_child_github_owner_v39.ts`; existing V0079/V0080/V0082 physical-REST budget/source reservation semantics.

## New code
`scripts/v39_phase6_private_source_existing_child_admission_v39.ts` invokes existing private SOURCE query binder **and** original Phase5 `admitP5SignedDaySourceChild` against the exact decrypted bytes **before** any ephemeral files are made. It matches the routing-intent SHA, SOURCE query digest, day, original signed registry SHA, source packet SHA, existing GitHub MAIN-only workflow-dispatch identity, approved code SHA, all original provider contract, manifest, rights and release conditions, per-query 1 GET / 2 unit maximum. A failure rejects and redacts contents.

Only after both checks pass does it invoke #652's already-tested same-job `try/finally` adapter to stage a signed SOURCE registry and SOURCE query in the existing ignored `frozen/` paths (0600 with exclusive create), passing the two paths and redacted receipt to a **separately admitted existing Phase5 child callback**. The callback must re-run original Phase5 signed child validation and payment/REST reservation checks inside the actual GitHub Actions job. The new bridge cannot send HTTP to AeroDataBox, write SQL or dispatch another GitHub workflow; it does not create or authorize paid source data by itself.

`tests/phase6_private_source_existing_child_admission_v39.test.ts` exercises synthetically valid original Phase5 release plus refusal on missing freeze/rights/budget, wrong code SHA/retry, switched registry/digest/day, altered release SHA, and cleanup/redacted failure. New no-provider CI workflow reruns both new integration tests and original `phase5_signed_day_source_child_release_v39.test.ts`.

## Need next (do not claim complete)
1. After exact-head CI, merge this integration. Wire the real authenticated restricted PG16 V0096 index and V0095 packet reads into a **single** existing SOURCE GitHub child process; do not rely on public frozen files or a manual per-flight Replit Shell. Keep existing child re-validation inside that process.
2. One-time owner commission **existing** `neondb` V0094 then V0095 then V0096 in reviewed order, independent readback, separately scoped no-login group membership and new restricted reader/publisher GH credentials; no replay of earlier migrations/roles.
3. Genuine externally reviewed prospective B0062 31-day calendar, original FIDS SOURCE; lawful permitted purpose and retention (raw/normalized/backups), independent science freeze and provider budget review. Existing 31-day GH observer cannot create authentic source packets itself.
4. Corresponding private PRE T24/T6/T90 and V0083 POST child inputs, durability/webhook STOP/replay, unknown-commit quarantine, schedule overlap/backpressure, physical actual-only label audits and observable missingness. Never equate 36 PRE snapshots with 36 unique operating flights.
5. Distinct Phase5 scientific **FREEZE** and paid Phase6 Day1 GO; November 20 is a conditional target, not an unconditional deadline or a vendor email dependency.

## Real database last known
Owner READ ONLY `neondb` PG16 at **2026-11-14T01:53Z**: V0094 absent, 17 original FIDS, ≥1,201 normalized rows sampled, 36 PRE snapshots; prospective B0062 calendar, physical source attempts, original bindings and PRE queue zero; 838 blob-reference metadata entries, 65 expired without verified deletion marker, 30 older than 31 days. Reference metadata alone does not prove the provider payloads still exist or that 31-day Contents retention is lawful.

**Phase5 FREEZE HOLD. Phase6 paid NO-GO. No new Replit shell needed for this code-only work.**
