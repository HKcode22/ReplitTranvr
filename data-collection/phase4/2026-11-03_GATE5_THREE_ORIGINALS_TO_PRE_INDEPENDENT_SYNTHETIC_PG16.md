# Gate5 — Three original source receipts → genuine PRE transaction → independent readback

**Date:** November 3, 2026 Pacific. **Implementation status:** synthetic, disposable PG16 only; neither a paid/live flight cohort nor a verified scientific Gate5 PASS.

This work tests the next engineering seam after PR #360's atomic original+normalized+V0077 custody and PR #359's V0077-bound horizon-scoped PRE staging:

1. Inside isolated PostgreSQL 16 apply only the existing B0062 baseline, staged V0076 and V0077.
2. Seed ONE synthetic immutable V0076 GitHub owner for T−24h with three distinct planned/irreversible physical attempts, each independently committed **only in disposable test data**. No actual GitHub dispatch or provider request is represented.
3. Generate three synthetic FIDS query replies for one explicitly operating flight, through the **real** `fetchFidsPopulation` normalizer and the new atomic V0077 binding adapter. Verify every original/normalization/binding transaction is acknowledged.
4. Before the synthetic flight's individual cutoff C, call the existing DB-clock guarded PRE writer with **fixture-only** verified-native-schedule/rights fields, and require one actual committed `clean.flight_snapshots` PRE for horizon T−24h, from three distinct retained original query slots. Reject missing or late source. No historical backfill.
5. With a separate `REPEATABLE READ READ ONLY` PostgreSQL client, run the existing independent V0077 original/PRE audit and require exactly three original receipts, one cutoff-eligible PRE and zero missing candidates.
6. The workflow operates solely on disposable local DB with synthetic FIDS, 0 provider credentials/calls, no production DB, no role grants, no Content retention outside the test, and produces a **scientificGate5Passed=false** receipt.

**Critical truth boundary:** Synthetic `verifiedExternalSourceAndRightsReview:true` is just an isolated fixture that exercises the existing PRE writer; it is NOT real AeroDataBox native selected T, lawful Content caching, physically validated operating identity, actual-only runway outcome or an approved live admission. The actual producer has NULL live release pin and is not wired to GitHub Actions paid collection. This rehearsal is a code integration, not prospective measured evidence or Phase5/6 authority.

Original f.8 and hash-locked Implementation Log remain unchanged. Remaining work: independently verify rights/native T, exact reviewed owner release and least-privilege DB producer, then genuine GitHub-only T−24/T−6/T−90 prospective source and PRE, real receiver in/out/unresolved, POST/AIRBORNE/stratified selection and missingness, and source/rights/billing independent audit. Preserve Nov2 WSSS 9/9 source-only GETs/18 units as completed operational evidence without replay.

**No Replit shell command; V0077 installed in production, do not rerun.** Science HOLD; Phase5 freeze/Phase6 GO not authorized.
