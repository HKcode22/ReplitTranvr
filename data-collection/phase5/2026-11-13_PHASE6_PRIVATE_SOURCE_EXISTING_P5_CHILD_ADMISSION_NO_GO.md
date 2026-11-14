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


---

## November 14 UTC — actual GH private SOURCE → ORIGINAL paid child same-run (PR review; still NO paid GO)

**What changed beyond the prior pure admission helper:** `scripts/v39_phase6_private_source_one_original_child_github_v39.mjs` now wires the **real reviewed** V0096 restricted PG16 private signed index + all-registry reader and V0095 externally Ed25519-reviewed `SOURCE_QUERY_PACKET` restricted reader to the merged #653 existing double admission and exact original `v39_phase5_one_signed_day_source_child_github_owner_v39.ts` executable. This is an actual same-job runtime wiring, **not** a new FIDS GET worker: the prior Phase5 child still owns V0079/V0080/V0082 atomic two-unit physical GET reservation, response originals, hard STOP/failed unknown-commit nonreplay, single real GitHub run ID and provider contract checks.

The current `.github/workflows/phase5-one-signed-day-source-child-dispatch.yml` now supports an **optional** `private_transport=true` branch with a new independent SOURCE private-transport approval secret, current approved main SHA, real owner rights/freeze/Day1 GO, exact SOURCE route digest, signed private source day registry, signed reviewed SOURCE query packet, separate restricted `phase6_private_reader_login_...` PG16 SSL login and private review signature/wire secrets. All old `workflow_dispatch` callers **default to the old job**. A PR has no paid provider credentials; explicit private branch additionally requires repository variable `P6_PRIVATE_SOURCE_ORIGINAL_CHILD_ENABLED=true`, absent by default, and exact `private_confirm` string. The new branch never runs from a schedule, PR, user-selected command or GitHub rerun. **No production application/owner DB login is reused.**

The in-memory private index and one-query SHA are checked against each other and the GH signed release before materializing exactly two `0600`, ignored files for the original child. The reader connection is closed before the existing paid worker starts; its provider stdout/stderr are **not** emitted to public Actions logs. Per-job try/finally cleans both temporary files even if child refuses; ambiguous child failure is a non-retry HOLD. The GH job itself does not perform a separate provider GET, SQL write or dispatch.

**Scope limitation:** this opens a future signed **single Day1 SOURCE** invocation after actual commissioning; it does *not* select/freeze future operating flight identities, authorize actual paid use, commission V0094/V0095/V0096 on existing `neondb`, validate a true 31-day legally retained ML source, implement signed future day-by-day automatic index rollover, or connect T24/T6/T90/POST. The existing scheduled source parent still references one fixed untracked registry file, and will not autonomously select a private indexed day without a further targeted change. No 31-day autonomous GO is implied.

The same existing offline SOURCE CI now tests this real GitHub-child interface under **synthetic** injected readers/admission, wrong role/host/SSL, wrong day/route/query, absent independent GO, unknown-commit refusal, read-then-close ordering and no provider/sensitive logs. CI test injection cannot be used by the production CLI entrypoint, which calls the exact original bridge and worker. **No test makes a paid API call or changes live database.** Keep original Phase5 FREEZE HOLD and Phase6 paid NO-GO until the authentic prerequisites are independently signed and a separate release occurs.

**User's finite exit requirement:** treat this as completion of one *actual* missing SOURCE child input edge, not another invented Phase5 stage. Next meaningful outputs are existing `neondb` owner V0094/V0095/V0096 once-only readback, authorized Ed25519 signed prospective Day1/source original, actual approved retention and target, unmodified Stage14/POST real child binding, source controller daily private rotation and final independent freeze. Do not reinstall old phases, ask for DATABASE_URL again, or require user to paste daily commands.
