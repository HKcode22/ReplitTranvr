# Phase 4 Gate 5 — atomic prospective original-source custody (engineering only)

**2026-11-03 (Pacific). Status:** isolated source-producer DB-boundary implementation, not an activated GitHub paid owner or scientific Gate5 completion. **Production V0077 has already been installed exactly once and privately verified; never rerun the installer.**

## Previously proven vs. still missing
- Nov2 source-only WSSS three-horizon FIDS GET: 9/9 physical requests, 18 API units; no retained live per-flight historical PRE/POST can be reconstructed; DO NOT replay as a new science cohort.
- PR #358 merged one-horizon DB-clock and nonretrospective PRE writer.
- PR #359 merged exact V0076/V0077 original source/physical owner 3-slot gating for the writer.
- **Missing link:** existing `fetchFidsPopulation` normalized original + population atomically but did not insert V0077 source↔physical reservation binding in that same commit. A half-committed source receipt could not be regarded as complete future science evidence.

## This offline PR
1. Adds an **optional** `beforeCommit` hook to the original `persistFidsObservation` raw-first transaction. Default production callers are unchanged. The optional hook executes *after* original source and population rows are inserted, *before COMMIT*. A hook failure or incomplete normalization rolls the entire source transaction back. The hook never sends HTTP or starts another database transaction.
2. Adds `phase4Gate5AtomicBoundSourceV39.ts`, a **DB-only**, deliberately non-live low-level adapter suitable for a future independently authorized GitHub source producer. It checks strict airport/local+UTC window/request fields and verbatim *decoded response body* custody (never claims original HTTP wire bytes). It joins an immutable **pre-HTTP committed V0076 physical attempt**, exact manifest, GitHub run/horizon, source query digest and authorization SHA, checks original source/DB cutoff/expiry, inserts a unique V0077 binding, and reads back one exact original/hash and every normalized member before the same original-source COMMIT.
3. Caps the adapter's technical original TTL at **24 hours** from genuine persisted available time (or a shorter approved window). This guard is **not** a rights grant. Source-use/retention permission, selected native T, true physical operating population, actual-only target and lawful continuing metadata retention need independent evidence. An arbitrary SHA or client boolean does not certify them.
4. A new GitHub-only disposable PostgreSQL 16 workflow installs synthetic B0062/V0076/V0077, simulates a precommitted paid-attempt receipt, uses the real FIDS normalizer with a synthetic response to persist the original, normalized operating observation, and V0077 original binding, tests a wrong reservation (all writes rollback), and rejects replay of a previously used irreversible source attempt. It uses zero provider credentials and never touches production.
5. Unit tests assert refusal on wrong source/hash/decoded content, mismatched operating data, expired source, late committed attempt, inactive owner, missing binding/readback, and no live release pin.

## Intentionally NOT activated
`P4_G5_ATOMIC_FIDS_PRODUCER_RELEASE_SHA_V39` remains **NULL**. Neither this module nor test workflow provides a live paid HTTP sender, GitHub clock/scheduler authorization, a new service cohort manifest or a production role/GRANT. Existing V0077 restricted runtime role has no binding table rights; do not enable via implicit broad grants. A separately reviewed least-privilege producer transaction, actual licensed source and GitHub job release is required before any prospective paid cohort can start. Preflight costs still belong to independent provider account-budget plus durable V0076 reservation owner. A successful source COMMIT is not an actual PRE snapshot, and PR #359's PRE writer remains disconnected.

## Still binding
Plan f.8 §§5–7, 10, 13, 16–17 and hash-locked implementation log §§1.9/2.22 remain byte-for-byte unchanged. Required remaining science: reviewed source-use rights and provider-native selected T, persisted on-time three-horizon PRE by distinct owner, operating physical denominator, subscription-bound webhook in/out/unresolved, POST and AIRBORNE status, per-stratum source age/missingness and selection sensitivity, independent source-hash/budget/expiry reconciliations. Missing source and target classes are **NULL/unknown** (never zero). Scientific Gate5 HOLD, Phase5 FREEZE NO-GO, Phase6 NO-GO.

**Next:** independently attested GitHub prospective source owner integration and safe privilege review, then actual on-time source→PRE and downstream outcome cohort; no more source-only pilot and no repetitive manual timed Replit work.
