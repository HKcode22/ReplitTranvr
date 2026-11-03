# Gate 5 — Actual V0078 production installation and next GitHub-only source owner readiness

**Owner evidence:** November 3, 2026 Pacific. **Scientific Gate 5 remains HOLD.**

## Production schema blocker removed — actual receipt, not CI-only

The owner executed the reviewed one-time V0078 installer from `3b7168e3c353d6664a28badf86eb00c3f365a60e` using the exact source blobs:
- `scripts/v39_phase4_gate5_v0078_one_time_exact_sql_installer.ts`: `8a744b3df05ab68d2840fccc53f87b680ec2a713`
- `migrations/staged/V0078__phase4_gate5_fids_reobservation_uniqueness_v39.sql`: `24d305fc4be6f426e762f5665c5ce37b55b666b7`

The actual success receipt is `V0078_PRODUCTION_LEGACY_KEY_REPLACEMENT_INSTALLED_ONCE`, with postcommit independent two-role read-only verification, `privateV0077Unchanged=true`, `nonFidsLegacyUniquenessPreserved=true`, `newFidsOriginalObservationUniquenessKeepsQueryIdentity=true`, `noRuntimeGrantOrSourceContentAlterations=true`, `providerCalls=0`, and `databaseContentWrites=0`. This closes the **schema installation** portion of [issue #362](https://github.com/HKcode22/ReplitTranvr/issues/362); no reason to rerun V0077/V0078 or Nov2 FIDS 9/9 source-only pilot. The verified code and tests are in [PR #364](https://github.com/HKcode22/ReplitTranvr/pull/364), [#365](https://github.com/HKcode22/ReplitTranvr/pull/365), [#366](https://github.com/HKcode22/ReplitTranvr/pull/366).

## Next technical bottleneck, checked on GitHub without cost

The existing `phase4Gate5AtomicBoundSourceV39.ts`, V0076 source owner state machine and per-horizon PRE writer are **DB-only** and their live release pins are NULL; GitHub is not yet authorized to issue paid FIDS GETs. Independent Audit Actions already use `GATE05_AUTOMATION_DATABASE_URL`, but that read-only credential is **not automatically a write permit** for the future source owner. A distinct narrowly permissioned source writer credential `P4_G5_SOURCE_OWNER_DATABASE_URL` may be needed; do not grant raw Content access to generic public/runtime roles or copy Replit's privileged URL into GitHub without role review.

The new GitHub-only workflow `Phase4 Gate5 Future Owner Credentials Readiness (No Provider)` has:
1. A secretless PR/merge regression test for all credential and role-gate statuses.
2. A `push main` (and optional manual dispatch) owner-readiness check using the already-scoped `phase2g-paid` environment, but **zero AeroDataBox network calls**. If environment protection requires approval, GitHub will show pending; no invisible background operation.
3. Inside two separately initiated PostgreSQL `REPEATABLE READ READ ONLY` transactions, verify current candidate GitHub source-owner and independent-audit credentials point to one database, are different non-superuser roles, lack CREATE/admin/DELETE, and have required limited original-query metadata visibility and insert capability for prospective source/PRE tables. Query only PostgreSQL catalog metadata: no flight rows, no account IDs, credentials or URLs printed.
4. Only anonymous yes/no flags and named refusal statuses. A missing dedicated DB owner secret, missing independent V0077 reader access, missing API key or unsafe role is a **HOLD** with explicit next work. Even all green is a **technical candidate**, never legal/provider/scientific release.

**No automatic grants or paid source owner activation.** The trusted source writer's exact table privileges, transactional scope and immutable future cohort remain to be separately reviewed. No fallback to Replit time scheduling; owned GitHub prearm/push starts must be real, not retroactively inferred.

## Remaining immutable acceptance items, by independent evidence class

- **A — Scientific milestone & legal rights:** Original f.8 §6.0 requires the first independently verified provider-native selected `T` and valid actual-only wheels-off/gate-out target. The official [RapidAPI OpenAPI v1.15.4.0](https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json) describes `departure.scheduledTime` only as scheduled departure, `departure.revisedTime` and `departure.runwayTime` as **actual or estimated**, and `quality` as Basic/Live/Approximate (not a per-value observed-actual flag). These cannot be silently promoted to verified runway actual or gate/runway-specific scheduled T. See #200. Official [AeroDataBox September 2026 terms update](https://aerodatabox.com/2026-09-terms-update) sets general effective date November 7 for existing subscribers and default 7-day caching with plan exceptions. This does not prove account-specific Content/derived rights (#300), even with 24h technical expiry.
- **B/C — Real prospective source and PRE:** Before the original T−24h, freeze the exact independently reviewed airport/timezone, first schedule path and version, physical operating flight denominator, three original query slots per horizon, full bounded API budget and future GitHub owner/manifest SHA. Each physical attempt commits V0076 reservation before paid GET, retains lawfully permissible original in one transaction with normalized source and V0077 binding, then commits cutoff-timely one-horizon PRE. No delayed job can backfill.
- **D — Real webhook and POST:** Use exact matching production subscription/receiver identity, count in/out/unresolved and deliveries/credits, actual-only postflight values vs estimated/proxy/unknown/censored classes. No event-dependent population selection.
- **E/F — AIRBORNE, coverage, missingness, bias and independent verdict:** Per tier/airport/UTC/route/operating flight and three horizons, measure source denominator, expected vs persisted PRE, true webhook outcomes, AIRBORNE states, label applicability, gaps and external provider billing. Record missingness bounded as measured, not papered over. Independent audit must reconcile all three short-lived source receipts before expiry and final postflight outcomes.

**Deadline:** owner target less than 3 days, but no retrospective T−24h or source-rights waiver; failing a prerequisite is an auditable HOLD. The prospective service slot requires a real source owner prearm before first T−24h dispatch. Source and POST scientific truth cannot be inferred solely from synthetically green PG16 tests. Phase5 freeze/Phase6 GO not authorized.

**Binding source preserved:** `data-collection/plans/V3.9_DataCollectPlan_f.8.md` blob `3ef1b8730e3148b936fcf02b46d0a091e69f7480` and hash-locked `data-collection/implementation/V3.9_IMPLEMENTATION_LOG.md` blob `0a5e4bedfa7c743feaf05ec2dc66f22084f39236` unchanged.
