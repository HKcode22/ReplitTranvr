# 2026-10-15 — CI regression caught and corrected in isolated archive guard test

**Review-only branch:** `repo-reorganization-gate3-review-20261015`, draft [PR39](https://github.com/HKcode22/ReplitTranvr/pull/39). **Failed exact prior head:** `706a8227bb8daac7640bf1edf74d36c33ed19266`; [full V3.9 offline CI run #38807682903](https://github.com/HKcode22/ReplitTranvr/actions/runs/38807682903) **FAILED**, while its three other no-provider checks succeeded: focused #38807683231, public identity #38807683103, disposable PG #38807683018.

## Verified reason (GitHub CI logs, not speculation)

- Of 1,132 test cases, 1,112 passed, 19 skipped, **one newly edited test failed** in `tests/repo_cleanup_moved_blobs_v39.test.ts`.
- The changed test accidentally malformed the `GATE0_INPUT_CHECKLIST.md` tuple: it omitted the original path, leaving the new path as the first element and SHA as second. The same old-root path also mistakenly remained in the `preserved` list. Consequently the test asserted that the *new file* must be absent and failed. The existing content itself did not change.
- This was **a cleanup test implementation error**, **not** evidence of source corruption, Git blob identity loss, failed original application tests, or changed provider science. The separate newly added casefold guard passed and logged exactly one known legacy Phase2G filename collision.

## Correction

- Repair the move tuple to exactly 3 fields: `["GATE0_INPUT_CHECKLIST.md", "docs/history/phase1/GATE0_INPUT_CHECKLIST.md", "560bb06eb155e5d24a5b19c0e176afa422c4deba"]`.
- Remove old `GATE0_INPUT_CHECKLIST.md` from the `preserved` list because it has **intentionally moved**; preserve its SHA in the `moved` list and Git history.
- Recheck the source patch mechanically before GitHub commit: **11 complete tuples** of old/new/blob, Gate0 tuple present exactly once, old root absent from active protected path list. No other existing file contents or runtime code touched.
- Re-run full four GitHub no-provider checks at the **new** exact SHA. Until completed, CI remains unverified, **do not merge**.

Nothing here authorized changes to Replit, published source, object store, provider subscription, live DB, original YSSY P25 231/229 source gap, AUTH or scientific ledgers.
