# Phase 5 Stage 24 — Later PRE horizons must inherit a genuinely committed T−24h anchor

**2026-11-07 UTC. Status: staged engineering, independent live evidence/role and GitHub integration incomplete.**
**No new provider calls, source/pre snapshots, paid Alert credits, production DDL, or Phase6 activation.** Stage23 production empty-schema commissioner merged PR #454; owner Shell result must be read before claiming those tables installed.

## Why this work is needed

The existing Stage14 `persistP5V0079SingleBoundFlightPre()` was *deliberately T−24h only*. The previous T−6h/T−90m code path checked a prior T24 snapshot's `created_at`, but PostgreSQL's `now()`/transaction start timestamp cannot prove that the T24 **COMMIT** completed before its cutoff. The actual production PostgreSQL has `track_commit_timestamp=off`, so Stage17 added an independent V0081 witness: a second transaction sees the committed T24 and writes a DB-clock witness, commits, then reads back the witness before cutoff. Merely observing a witness row much later is still insufficient if the independent post-witness-COMMIT readback event was not preserved.

The correct dependency is:

```text
Stage14 genuine T24 PRE COMMIT + postcommit DB-clock readback before T24 cutoff
     ↓
Stage17 separate restricted transaction actually SEES the committed T24 PRE
     ↓
V0081 witness row COMMIT + Stage17 own DB-clock readback before T24 cutoff
     ↓
Independently reviewed, immutable signed Stage17 receipt bound to its exact T24
     ↓
Stage24 later-horizon writer re-reads the real V0081 witness + joined T24 PRE
     ↓
T6 or T90 actual new bound source, identity, staleness & DB cutoff check
     ↓
T6/T90 PRE COMMIT & aftercommit readback before THEIR OWN cutoffs
```

## Exact code changes

- [`phase5T24WitnessedLaterHorizonGuard_v39.ts`](../../server/lib/disruption/phase5T24WitnessedLaterHorizonGuard_v39.ts) adds a *pure* proof checker `verifyP5Stage24WitnessedFrozenT()` and deterministic receipt digest `digestP5Stage24ReviewedReceipt()`. It validates one DB-read witness joined to a T24 snapshot, hashes, selected native `T`, the unchanged selected-T version/frame/config, original source hash/query digest, and ordered second-transaction stamped DB time plus post-witness-COMMIT readback strictly before the *original T24* cutoff. An erroneous new `T` or late receipt is rejected.
- [`phase5V0079SingleBoundFlightPreWriter_v39.ts`](../../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39.ts) conditionally extends the staged PRE writer to T6/T90 only after **both** an actual V0081 DB witness row and a separately reviewed Stage17 postcommit readback receipt are present. A restricted writer role must have `SELECT` on that witness table; it has **no rights** to INSERT/UPDATE the witness. All existing source-original/member/physical-leg/prospective cutoff/duplicate-identity protections continue at each later horizon. T24 behavior stays compatible.
- [Stage24 tests](../../tests/phase5_stage24_t24_witnessed_later_horizon_v39.test.ts) check correct T6/T90 anchored examples, changed first selected T, substituting a T24 source, late Stage17 readback, truncated margin, non-T24 witness, missing witness row and receipt corruption. [Dedicated CI](../../.github/workflows/phase5-stage24-witnessed-t6-t90-offline.yml) does TypeScript and focused nonpaid checks.

## Very important remaining limits

1. **A SHA-256 receipt digest is not a digital signature, nor an independent reviewer.** The exact Stage17 readback data must be durably archived and cryptographically authenticated *outside this function*, with a separately verified reviewed source/manifest binding; a caller cannot merely invent a matching SHA and declare PASS. The code explicitly does not establish this.
2. Stage14 writer still needs a dedicated **restricted** live DB role and reviewed worker invocation. The role needs read-only V0081 witness access for later horizons and INSERT-only `flight_snapshots`; it must not be able to write the T24 witness or any other source table.
3. Fully time-separated T24→T6→T90 execution requires **actual real-time future schedules**, not instant synthetic PG16 unit tests run one after another. These pure tests prove comparisons but do not establish flight-level prospective live execution.
4. The external provider-native T semantics, physically operating-leg scope, permitted normalized source Contents retention, fully signed 31-batch-day/5-crossover calendar, daily source GET and Alert budgets, deployed receiver, POST/AIRBORNE and missingness quality audit remain independent scientific gates.
5. **Stage23 owner Shell pin** is main `2d6ce676ffeaa308ffb0cb14bc490934d2c8fcbb`. To avoid invalidating that reviewed one-shot command, **do not merge Stage24 until owner runs Stage23 or the command is explicitly re-pinned**. This PR branch is nonpaid.

**Scientific disposition:** Later horizon code logically staged, **not** live complete or independently authenticated. Phase5 final FREEZE HOLD / Phase6 paid GO NO. User need not repeat account tier/quotas, emails or Stage16/Stage18 metadata audits.
