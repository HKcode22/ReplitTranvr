# Phase 4 Gate 5 — PRE writer exact V0077 source-owner guard (offline PR)

**Date:** November 3, 2026. **Status:** engineering change submitted for review; NOT a production source owner, live PRE materialization, provider permit, source-rights approval, scientific PASS or Phase5/6 release.

## Observed gap following merged PR #358

PR #358 correctly prevents retrospective PRE timestamps using the database clock and a single-horizon transaction. However, the existing staging query scoped source by airport + service window only. That allowed PRE candidates from an unrelated FIDS query in the same service window even when a caller supplied the intended manifest SHA and a permit-shaped object. No V0077 original-to-attempt ownership join was enforced in that PRE writer path.

## Targeted correction

- Require an exact GitHub run ID on the per-horizon write scope before opening a transaction; missing/malformed identity must refuse without any SQL.
- For the writer's source staging only, independently query V0076's expected query slots and V0077's bound, unexpired original responses in the **same SERIALIZABLE transaction**. Accept exactly three planned slots and three retained valid original receipts; incomplete, expired, mixed, or inaccessible source refuses all writes rather than fabricating an empty flight denominator.
- Source SELECT must join the exact V0077 original binding, V0076 owner/allowed query/physical attempt and source record with matching response hash, one frozen manifest, one horizon, the actual GitHub run and its reviewed authorization SHA. Reject off-window, marketing-direction or expired provider Content.
- Keep unbound staging available only as a provisional *in-memory* research preview. No production workflow or provider key is added. Existing V0077 production schema, default ACL, authorizations and original historical logs remain untouched.
- Include failure/zero-write and exact-scope regression tests, then evaluate the full GitHub CI before merge.

## Strict limitations and next dependency

This is **necessary source lineage**, not sufficient scientific evidence. The source pipeline still does **not** independently establish first provider-native selected `departure.scheduledTime.utc` T, a lawful project-specific Content-use/retention right, or the physical operating population/POST truth. The staging code currently uses a generic earliest FIDS schedule and cannot be promoted to a certified native T by a SHA or boolean alone. The existing writer remains unreachable by any live GitHub workflow. Production V0077 is private to the runtime role, so no future owner should run this writer until a separately reviewed minimal privilege boundary and real retained original/normalized operating-leg pipeline exist.

Preserve Plan f.8 §§5–7/10/13/16–17 and hash-locked Implementation Log §§1.9/2.22. Preserve November 2 WSSS 9/9 / 18-unit source-only operational evidence, **do not repeat it**, and do not backfill historical PRE after its cutoff. The next software integration is a reviewed prospective provider source producer that physically commits V0076 attempt, stores/normalizes a lawful original, records V0077 binding, and dispatches *one* time-appropriate writer without reusing a source-only pilot. Then independently measure PRE/webhook/POST, AIRBORNE, strata and bias.

**Status control:** V0077 installed in production once and verified by owner. Do not reinstall. Scientific Gate 5 remains HOLD; no Phase5 freeze or Phase6 processing is authorized.
