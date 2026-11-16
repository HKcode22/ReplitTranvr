# November 16 — connect the already existing disabled B0062 authority to C+D

This resolves a concrete last-mile dependency, NOT a new collection architecture. Early draw and Stage9 require the existing singleton authorization enabled; B0062 and V0093 intentionally stage it disabled. Old start owner requires schema marker 0047 and live legacy safety heartbeat, whereas the existing current B0062 stage writes v39. Do not change that marker or invoke legacy paid start to unblock SOURCE. No provider, production SQL, secret change, new migration, new reviewer role or new workflow is invoked by this PR.

## Exact transition (owner-local, one use)

New `scripts/v39_phase6_enable_source_owner_v39.ts` uses the existing `verifyAuthFile` exact hash-locked AUTH ledger approval, same existing owner `DATABASE_URL`, canonical stage bytes, cost envelope hash, and independent V0093 readback. It does not grant paid dispatch itself. The original AUTH record scope is Phase 6 (separate authorization), exact ID, all seven category maximums, exact staged Alert maximum, existing evidence IDs, bounded start/expiry and independent cleanup owner; scope string C_D_GITHUB_SOURCE_PRE_POST_EXISTING_CALENDAR_NO_LEGACY_ALERT_START. An added `releaseActivation` object inside the same reviewed AUTH bytes binds:
- schema v39.phase6.exact-source-activation-review.v1; SHA256 of exact canonical stage content excluding only final codeSha40 (to avoid committing a self-referential ledger/code hash), and exact cost envelope digest. Exact final main separately pinned at stage and owner execution.
- Explicit independent scientific freeze, source-use, operational release, current account and budget approval; verified legacy published auto-collection off, GitHub paid-dispatch flags off, no active billable subscriptions, separate paid dispatch still required, legacy Alert start not approved.
- Exact independently reviewed freeze, rights, provider account/budget, published/GitHub STOP, operational release evidence digests; account observation time and reviewer-specified validity time. These are attested review inputs, not code proof of license, source truth or current account controls. Do not fabricate them.

At runtime verify clean exact checkout against remote main, actual ledger-reviewed AUTH bytes, scope, stage and cost hash. Reuse existing provider-mutation advisory lock; lock exact staged tables against concurrent writes, use separate fresh READ ONLY connection for exact staged values (including all Alert safety parameters), no unresolved incident, open probe budget, live local subscription, prior Phase6 batch or previous transition marker. Both external review and account validity and original prospective T24 cutoff must still be valid on DB clock. Atomically update only the matching disabled singleton and insert one receipt into existing project-owned adb_collection_meta; do not update dates or budget. Unknown commit = hold, never replay. After success print acknowledged receipt, independently compare exact enabled row and marker in fresh read-only transaction. Still no workflow switch change or provider call. Global row enable is a distinct release transition, not permission to set paid flags or run legacy Alert starter; all existing protected source/rights/review/admission checks continue to apply. Historic records must remain intact. The DB one-use marker forbids replay even if subsequently disabled.

Only after actual independent review, calendar/cost staging and exact owner setup, the syntax is:
```bash
env -u AERODATABOX_API_KEY -u AERODATABOX_WEBHOOK_SECRET -u RAPIDAPI_KEY \
 ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
 V39_P5_APPROVED_CODE_SHA="$(git rev-parse HEAD)" \
 npx --no-install tsx scripts/v39_phase6_enable_source_owner_v39.ts \
 --enable-exact-existing-source-auth /private/unsigned-stage-input.json \
 <reviewed-stage-sha256> <reviewed-cost-envelope-sha256> \
 /private/approved-auth.json <exact-ledger-approved-auth-sha256>
```

No actual approved Phase6 AUTH artifact is issued by this engineering PR; no hash approval tokens added to evidence ledger. Existing owner must not run this command with synthetic fixture values, arbitrary booleans or candidate docs. Current scope retains A/B/C/D1/D2/E, original first seed and joint-budget review; unresolved lawful linked training corpus and actual gate-out evidence are substantive. Existing C+D routing and all already commissioned migrations/roles reused. Disposable real PostgreSQL test exercises missing evidence, wrong cap/hash, active incident refusal, exact enable, independent readback and one-use marker after subsequent disable. No requirement to collect the 31 days before Phase6 starts. Separate paid SOURCE, PRE, POST and legacy Alert operational readiness remains to be assessed. Phase5 FREEZE HOLD, paid GO NO.
