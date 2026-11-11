# Phase 5 — V0087 **installed**; V0088 real-queue Stage14 integration and Phase 6 readiness

**Owner evidence:** Replit Shell returned `INERT_REAL_QUEUE_SCHEMA_INSTALLED_NO_WORKERS`, after exact pinned migration blob `3fd1999df74392622c5f4a1e30c71bc4dca7bd80`, on team-managed **neondb PostgreSQL 16**. Table **`clean.phase5_cd_pre_task_v39` exists, contains 0 rows, and prior population-member trigger remains unchanged**. `travnr_runtime` has no queue INSERT/UPDATE/claim EXECUTE; `providerRequests=0`, `paidProviderCalls=0`. This is a real owner installation, not a mock or CI-only installation. **DO NOT RE-RUN V0087 INSTALLER.**

## Development direction, no repetition

Owner clarified reuse means *reuse existing source collectors, V0079 original bindings, Phase 4/5 weather/POST, P5 budgets, existing real Stage14 PRE writer, prior C+D CI prototypes and free ADSB.lol.* What does not exist should be created, not rediscovered indefinitely. PR #571 did that for the missing queue, merged `70a3a6300305d2b12f3a9b055e187fc6ffa5ab75`.

**Next code: V0088**, staged independently after the live V0087 schema. This is not another per-flight queue. It adds one-transaction PRE admission from the **actual clean.phase5_cd_pre_task_v39**, keeping original historical PRE writers. Its staged SQL includes a receipt keyed by task+transaction+backend and DB login; the function locks actual V0087 row using `FOR UPDATE NOWAIT`, checks **flight, horizon, initial native T/cutoff, source population UUID and response SHA, rights review hash, manifest, packet, owner, generation, unexpired lease and DB clock**. The scoped PRE trigger checks the receipt and preserves the existing population-member trigger; an unenrolled flight still uses the old route, while **every horizon** of an enrolled C+D flight is protected. A separate scoped UPDATE/DELETE trigger prohibits retroactively modifying those enrolled snapshots.

The code adds **one CI-only new option** `realV0088QueueFenceCi` on the *existing* Stage14 writer, calling that exact DB admission twice in the SAME SERIALIZABLE transaction (before source read and immediately before COMMIT). It refuses invocation outside `GITHUB_ACTIONS=true`, exact disposable local neondb, no provider, no Phase6 process arm. It does not give runtime a new live queue or grant any actual role EXECUTE.

**Test contract:** [new disposable PostgreSQL16 workflow](../../.github/workflows/phase5-v0088-real-queue-stage14-disposable-pg16.yml) applies the original B0062 boot schema, real STAGED V0079, exact already-merged V0087 and STAGED V0088. It reuses the 32-flight synthetic Stage14 source fixture and proves the original one-flight Stage14 PRE SQL succeeds with an authentic queue row/lease, recorded same-transaction receipt, post-COMMIT readback and V0087 ACK; forged owner, unregistered horizon and no-receipt INSERT fail. Legacy unregistered writes stay compatible; enrolled snapshots cannot UPDATE/DELETE.

**Review rule:** until exact new CI runs report success, mark these as source code and intended tests, NOT verified results. Security definer code currently is owned by the disposable CI `postgres` creator. **Never install V0088 into live Neon as currently written**, even though V0087 is live. A separate real-world installer must include a dedicated NOLOGIN function owner, evaluated grants, safeguards against inherited runtime access, role/login mapping, legacy writers and a verified rollback. Source license/physical ground truth and hashes remain independently reviewed, not proven by SHA fields.

## Phase 5 finish-line scorecard — target Nov 13 / outside planning target Nov 20, not an unconditional promise

| Workstream | Verified now | Remaining before Phase5 ready / Phase6 GO |
| --- | --- | --- |
| Durable C+D queue | V0087 installed live, empty, old trigger intact; 12/12 prior PG CI tests | Restricted production role/grants and end-to-end source packets |
| Same-tx Stage14 queue fence | Earlier V0084–86 mock PG proven; V0088 **staged real V0087** now under CI | Exact-head V0088 CI; dedicated NOLOGIN function owner; production install; immutable registered flights |
| GitHub automated owner | Prior GH-only source, PRE, POST and STOP designs/isolated code | Short rolling controller/lease watchdog, GH secret scope, missingness/unknown COMMIT readback, no human overnight |
| Amendment E prediction | ONE canonical E; T−6h continuous actual departure-delay minutes candidate, paired T−90m, T−24h comparator, separate airborne arrival ETA; offline as-of selector | Connect genuine as-of observations and missingness to Stage14 (still **features:[]**); prove origin/destination/route/weather/history fields and timestamp rights; final target label definition |
| Free airborne | Prior ADSB.lol code and research; no need pay another provider | Rights/capacity and coverage; wheels-off proxy explicitly NOT an actual gate-out label |
| Cost + scientific validity | AeroDataBox quota 60K observed 2026-11-11 13:34Z, project 50K ceiling; 0 credits used for all queue changes | Release period budget check, reviewed source retention/caching, target/label/coverage/missingness, independent Phase5 freeze |
| Phase6 activation | Not begun | Explicit separate owner/independent GO, monitored first prospective pilot, reconciled true PRE/POST and calibrated evaluation |

The owner asked to *finish by the end of this or next week depending on progress* (calendar targets **Friday November 13** and **Friday November 20, 2026**). These are engineering scheduling goals; do not claim guaranteed completion, ignore verification, or set fake approved paid collection dates. A small justified rights/credential/recovery HOLD is acceptable, but avoid perfection loops and repeated discovery.

### Why we do not need another Replit read-only catalog

The owner already provided sufficient live evidence that the V0087 table was created, empty, and the runtime had no claim privilege. The correct next operations are C+D Stage14 linkage, role commissioning, controller, and real E features—not rediscovering the missing table. V0084–V0086 are disposable CI test schemas, not production migrations. V0088 is an incremental extension to the *installed* V0087 queue, and its execution is **not yet authorized**.

**State:** Phase5 scientific FREEZE HOLD; Phase6 paid GO NO. No new paid provider/Alert/airborne service, no Replit AI Agent, no live DB mutation by this V0088 branch. Official PG16 refs: [SECURITY DEFINER function safety](https://www.postgresql.org/docs/16/sql-createfunction.html), [row trigger behavior](https://www.postgresql.org/docs/16/trigger-definition.html), [row locking](https://www.postgresql.org/docs/16/explicit-locking.html).
