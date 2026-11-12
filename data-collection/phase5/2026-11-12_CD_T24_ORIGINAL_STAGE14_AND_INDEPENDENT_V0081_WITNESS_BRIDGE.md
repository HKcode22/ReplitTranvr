# Phase 5 — reuse ORIGINAL Stage14 PRE plus distinct Stage17/V0081 witness with C+D lease (T−24h bridge)

**November 12, 2026.** This is an actual code integration increment, **not a new PRE writer**, not a GitHub live T−24h workflow activation, not a provider API call, not another Neon migration, and not independent Phase5 scientific signoff.

## Live state

Owner has **already installed V0087–V0091** on team private `neondb`. Latest V0091 owner Replit output `V0091_SOURCE_BOUND_PREPARE_ONLY_FUNCTION_COMMISSIONED_INERT` attested 0 queue rows, no PRE snapshots or paid calls, PREPARE group function-only access. Do not rerun V0087–V0091. Canonical GH source registration PR #581 merged (and duplicate #582 was closed); prospective T6/T90 PRE controller remains STOP-default. The separate GitHub early-start DB-clock lookahead PR #583 is also not automatically enabled.

## Why T−24h cannot be skipped

For an actual witnessed later T6/T90 protocol, the existing Stage24 evidence must contain a **separately committed V0081 witness** to a genuine prospectively persisted T24 PRE before the **same native T−24h cutoff**. An as-of prior T24 is not the same as inventing a T24 retrospective label after it was missed. The already implemented `persistP5ReviewedT24PreAndIndependentWitness` connects original Stage14 PRE, a distinct Stage17 witness transaction, and an unsigned Stage24 receipt proposal. However, it previously called Stage14 **without forwarding the new real V0087/V0088 queue-fence options**. That would cause the installed V0088 enrolled-flight PRE trigger to reject this path (or leave source and queue states disconnected).

## Actual correction

- `server/lib/disruption/phase5T24PreIndependentWitnessChain_v39.ts` now optionally accepts the **exact existing Stage14 writer options type** as its final argument and passes those options to `persistP5V0079SingleBoundFlightPre` BEFORE opening the independent witness-only pool. The real `realV0088QueueFenceGh` option is checked by original Stage14's own full signed-main/STOP/rights/Phase5 canary gate and the V0088 same-transaction PostgreSQL admission, not reimplemented by Stage17. The old unqueued T24 caller remains backward-compatible (options omitted).
- The chain still commits original PRE first, then uses existing witness-only role to independently observe that committed PRE and commit/read back V0081 receipt before cutoff. If witness fails after PRE commit, throws HOLD **without replay**; a queued future wrapper must quarantine V0087 UNKNOWN and never auto-acknowledge an incomplete T24 witness.
- Chain return now records `registeredV0087TaskFenceUsed` and `stage14PostCommitDbClockAtUtc`, allowing a future Stage30 queue-only ACK wrapper to cross-check both durable commits. This metadata is NOT legal/license or scientific freeze evidence.
- `tests/phase5_t24_pre_independent_witness_chain_v39.test.ts` tests that an unapproved real GH queue fence is **actually forwarded** to the original Stage14 and rejected **before either PRE or witness DB connection**. The Stage29 disposable PG16 real T24/Stage17 workflow now runs this regression in addition to the existing original/role-bound T24 test.

## Still to implement before any live T24 queued pilot

1. Extend the **already canonical V0091 signed GH source registration path** to admit reviewed *T24 source packet* with the independently bound T24 `witnessReview` parameters, without a second registrar. V0091 SQL already supports `T-24h`.
2. Extend frozen roster admission with an explicit T24-with-witness mode, while leaving the existing T6/T90 consumer to refuse unwitnessed T24.
3. Build one STOP-default GH T24 worker that claims the V0087 T24 task (3m original DB cutoff), marks WRITE_STARTED_UNKNOWN, invokes **this existing queued Stage14→Stage17 chain** using two distinct existing Stage30 PRE and WITNESS logins, and independently reads back both commits *before* requesting V0087 ACK. Unknown COMMIT/witness => quarantine and no retry. The source of truth for timestamps is PG16, not GH cron.
4. An independent reviewer must accept the SHA-based **unsigned** Stage24 receipt candidate; the program must not fabricate a signed witness. Only then can a genuine later T6/T90 packet anchor to it.

The full intended 31-day study still needs a real source packet, rights/retention review, budget/day envelope, POST/airborne and one Amendment E actual departure-delay-minute target and trained evaluation. Existing free ADSB.lol wheels-off proxy remains separate from actual gate-out. **Phase5 scientific FREEZE HOLD; Phase6 paid GO NO.** Bounded missingness is acceptable; fabricated PRE and non-authorized replay are not.
