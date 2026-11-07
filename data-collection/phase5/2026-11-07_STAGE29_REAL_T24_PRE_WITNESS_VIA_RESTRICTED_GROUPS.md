# Stage 29 — Real PostgreSQL16 integration: source original → PRE → independently committed witness through separate login sessions

**2026-11-07 UTC.** Stage29 advances the actual Phase5 execution path, not just standalone access-control code. The owner has already verified **live** Stage23 production V0079/V0080/V0081 (eight empty tables) and **live** Stage27 four distinct `NOLOGIN` group roles. Stage28 PR #459 added a correct `SET ROLE` pool adapter, merged at `bbf6650d063354f037a4c753a37a0efa3d5e8a6d`, with no production worker login created.

## What Stage29 changes

The existing [Stage14/Stage17 real-PG16 integration test](../../tests/phase5_stage14_bound_flight_pre_real_pg_v39.test.ts) already exercises a genuine **synthetic** first flight: a real PostgreSQL `clean.fids_query_response` with decoded original bytes, an allowed V0079 query, a physical attempt/reservation, exactly one primary operating-leg population row, and exact per-flight selected native T and deadline. It calls:

```ts
persistP5V0079SingleBoundFlightPre(writer, permit);
persistP5T24SeparateTransactionWitness(witnessWriter, witnessPermit);
```

Before Stage29, this fixture assigned direct table privileges to a test user, so it did **not prove** Stage28's new **separate LOGIN → SET ONLY → NOLOGIN group → real writer** handoff worked.

The new optional `V39_P5_STAGE29_RESTRICTED_GROUPS_REAL_PG16=1` path uses **exactly the four Stage27 NOLOGIN role group identities**. In a disposable GitHub PG16 only, it creates two distinct temporary `LOGIN NOINHERIT` workers: a PRE-only worker with `SET TRUE, INHERIT FALSE, ADMIN FALSE` membership in `phase5_fids_pre_writer_prod_20261107`, and a separate T24 witness worker with the same narrowly scoped grant to `phase5_fids_t24_witness_prod_20261107`. The source/original **test fixture** is inserted by disposable PostgreSQL admin, explicitly **NOT** a real paid source call or accepted source-use license.

Each writer receives a [Stage28 dedicated PG client adapter](../../server/lib/disruption/phase5Stage28DedicatedRolePool_v39.ts), which independently audits the session login, all four group membership paths, switches to exact effective role, checks permissions and destroys checked-out connections when released. The **real** Stage14 writer then validates stored query, original response/body digest, first T, source membership, per-flight cutoff, and commits a T24 PRE; it reads back using the DB clock. The **real** Stage17 writer uses a different login, sees the **already committed** T24 in a separate transaction, inserts a V0081 witness (trigger-enforced immutable source/cutoff), COMMITs, then reads back the witness before the original T24 cutoff.

The original test's refusal paths remain active: duplicate PRE cannot overwrite, wrong DB actor cannot write, missing independent permit cannot pretend authorization, late source cannot backfill, witness replay/change is refused. The existing original direct-permission CI-mode remains available unchanged. Stage29 uses a separate workflow and env flag, so older tests continue covering their original setup.

## Real data versus fixture

The [dedicated Stage29 GH Actions workflow](../../.github/workflows/phase5-stage29-t24-pre-witness-bound-pg16.yml) starts fresh disposable PostgreSQL16 with **no AeroDataBox secret**, applies baseline B0062 and V0079→V0080→V0081, creates Stage27 groups using the reviewed commissioner **only in CI**, then runs the real Stage14 and Stage17 modules with temporary test-only SET-role logins. The code does not create any production login, GitHub secret, webhook, FIDS HTTP request or flight PRE. It cannot certify a legal Contents retention purpose or an actual operating flight's native departure T, because test fixtures are constructed locally. The test checks actual commit/readback/role boundaries, not scientific source validity.

The **next live milestone is a distinct, separately reviewed production GitHub-only worker login/credential/role-membership setup**, with no reuse of the Replit runtime DB identity. Before enabling a paid source GET, the project still needs the source-use/ML/backup retention right (#300), independently verified provider-native first T and physical operating-leg evidence, signed actual 31 batch-day experimental calendar and budgets, and a release-scoped GitHub workflow. Source test counters and account entitlement are not equivalent to permissions.

## Study exercise: why does the TypeScript use `Pick<Pool,"connect">`?

```ts
let writer: Pick<Pool, "connect">;
writer = makeP5Stage28DedicatedRolePool(loginPool, permit);
```

This is TypeScript structural typing. The Stage14 writer only needs the `connect()` capability; it does *not* need the entire PostgreSQL `Pool` implementation. We can supply a wrapper that returns an independently verified `SET ROLE` connection. `PoolClient.query("BEGIN ...")` runs **inside PostgreSQL**, not in the TypeScript interpreter; after `COMMIT`, the module asks the real DB for a fresh readback. The adapter must not reuse a connection with `SET ROLE` active, so `release()` destroys it.

This is a real integration test: we are connecting genuine application code to a genuine disposable PostgreSQL server rather than inventing status strings. But it is still not the live prospective 31-batch-day experiment.

## Project status after Stage29 engineering

- **DONE in production:** Stage23 empty schema and Stage27 four NOLOGIN groups.
- **DONE in source + tested:** Stage24 witnessed T6/T90 requirement, Stage25 role matrix, Stage28 role session adapter.
- **Stage29:** actual T24 PRE → Stage17 separate committed witness *rehearsal* through Stage28 sessions; merge pending exact-head CI.
- **NOT yet done in production:** dedicated worker LOGIN/secret, source worker GitHub Action, legitimate paid FIDS source original, actual per-flight T24/T6/T90, POST/Alert/AIRBORNE, independently authenticated first T, confirmed ML Contents retention, and independently accepted final f.8/Amendment C frozen calendar.

**Phase5 final scientific FREEZE HOLD; Phase6 paid GO NO**. No need to repeat RapidAPI account/quotas/emails or Stage23/Stage27 DB installers. The historical implementation log remains an unchanged historical record. If scientific evidence justifies changes, use prospective dated f.8 amendments.
