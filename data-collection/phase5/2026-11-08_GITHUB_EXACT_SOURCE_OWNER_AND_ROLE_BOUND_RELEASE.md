# Phase 5 — GitHub-only paid FIDS SOURCE login and exact one-query release

**Authored November 7 Pacific / November 8 UTC 2026.** This is one substantive Phase5 integration step, deliberately **not** another arbitrary "Stage 32". GitHub is the execution source of truth; the owner-operated Replit Shell commissions only an inert login/secret, never drives timing. Original plan f.8, Amendment B/C, the locked implementation log and the four true Phase5 exit conditions remain authoritative.

## 1. What genuinely exists already

- **Production:** source tables V0079/V0080/V0081 were installed inert by Stage23; four independent NOLOGIN groups installed by Stage27; PREPARE/PRE/T24-WITNESS dedicated GitHub login credentials and GitHub secrets created by Stage30; Stage31 live GitHub→PostgreSQL *read-only sessions* independently verified in [Actions #42438676554](https://github.com/HKcode22/ReplitTranvr/actions/runs/42438676554), with **zero paid or flight rows**.
- **Code already in repo:** `scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts`, `phase5GitHubOneQueryReleaseAdmission_v39.ts`, `phase5V0080GitHubPrearm_v39.ts`, `phase5ScopedFidsSourceBridge_v39.ts`, `phase5V0079ScopedDbPorts_v39.ts`, `fidsCensus_v3.ts`. They implement the immutable template, actual run-ID prearm, one prospectively timed physical reservation, bounded one paid FIDS GET, and atomic original + normalized population binding.
- **Critical gap fixed in this PR:** the staged TypeScript source runner previously instantiated a bare `new Pool(...)` and sent it directly to V0080/V0079. Now every SQL connection from this runner goes through `makeP5Stage28DedicatedRolePool` with **exact `phase5_p5_source_login_20261108` → SET ROLE `phase5_fids_source_prod_20261107`**. It rejects app/non-source/group-crossing identities, and it destroys each checked-out PG client when the operation finishes.

## 2. Why one extra source LOGIN is actually needed

The source **NOLOGIN group exists**, but has no runtime member. The three Stage30 GitHub credentials belong to PREPARE, PRE, and independent T24 WITNESS, **not SOURCE**. Giving the PRE or witness credentials source permissions would defeat privilege separation. A dedicated *SOURCE LOGIN* with **one SET-only membership** is required before any real physical FIDS GET.

The new `scripts/v39_phase5_source_worker_credential_owner_once.mjs` creates exactly one source LOGIN under the existing approved owner DB connection and writes exactly one encrypted GH Actions secret `V39_P5_SOURCE_DATABASE_URL`. It runs **only on owner explicit opt-in**. It refuses if the source login or secret already exists, requires PG16 neondb primary and separate admin/runtime logins, and verifies SOURCE can INSERT the original binding but cannot insert PRE or witness rows. It attempts GH secret write before DB COMMIT so failed/missing GH secret produces ROLLBACK; an ambiguous COMMIT is quarantined rather than blindly retried. It logs neither credentials nor URLs, and does **zero source HTTP GET/Alert/flight rows**.

No owner Shell needs to be rerun for Stage23, Stage26/27, Stage30, or Stage31. This **one new source-only commissioner** is a new credential boundary, not a repetitive duplicate.

## 3. Source workflow — manual, main-only, one physical GET

`.github/workflows/phase5-one-reviewed-prospective-fids-get-main-manual.yml` has **workflow_dispatch only**, never `schedule`, `push`, or `pull_request`. Required text input:
`ONE_PAID_FIDS_GET_MAX_2_API_UNITS_NO_PHASE6`.

One committed exact scoped `data-collection/phase5/frozen/<reviewed>.json` defines airport/interval/query SHA. The source release admission compares actual `GITHUB_SHA`, `GITHUB_RUN_ID`, first run attempt, SHA-256 of exact JSON bytes, manifest, query, native rights and release record, and the real PG16 dedicated SOURCE URL. **Separate reviewed GitHub Secrets** must provide all live booleans/hashes and paid AeroDataBox key; the workflow never hardcodes approval to `1`.

Only when all conditions PASS does it:
1. Bind actual GitHub run-ID to the exact frozen PREPARED query in V0080, commit and read it back;
2. Wait until the **actual DB clock** reaches approved physical GET dispatch, refuse late cutoff or excess waiting;
3. Atomically reserve **one physical attempt at 2 API units** in V0079 before HTTP;
4. Make **at most one GET** to the pinned FIDS endpoint, then save original decoded body digest and FIDS members atomically through V0077/79; report bounded source outcome, not PRE/Phase6 GO.

Repeated `workflow_dispatch` for same query is never a retry after an ambiguous bill: V0080/V0079 query/physical attempt and GitHub run bindings independently refuse duplicate or wrong IDs. **No provider request happens until real source legal rights and independent review can be demonstrated.** A generic user authorization to spend does not constitute an applicable retention/ML Contents license.

## 4. Source-rights, target and PRE blockers still genuine

This workflow cannot—and must not—assert `sourceRightsCertified=true` from boolean flags alone. The account-specific current Terms/Contents purpose/retention and 24h originals + normalized per-flight ML use/backup expiry remain [issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300); the September 60k API-unit quota is a separate billing matter, **not** usage/retention permission. A reviewed legally permitted cohort must be prospective (no retroactive T24).

The `adb_phase6_authorization.enabled` requirement inside the **separate** `phase5EarlyAdaptiveDrawOwner_v39.ts` / Stage9 PREPARED writer is currently linked to the eventual full Phase6 FREEZE. This has a **true sequencing conflict for any live pre-FREEZE Phase5 paid pilot**: one cannot require the final Phase6 authority in order to gather scientific evidence used to decide that authority. It needs a distinct **bounded Phase5 evidence pilot authorization**, or an independently reviewed principled release rule that separates pilot admissions from the final 31-batch-day start. Do not turn on Phase6 to work around it.

The real 31-batch-day early four-airport draw and authenticated source GET grid, T24/T6/T90 PRE persistence, independent T24 witness, actual-only outcome vs preregistered provider-reported schedule-change proxy, POST/receiver and final budgets/calendar **remain to be integrated/reviewed**. A successful FIDS GET proves only one source original, **not a fully observed three-horizon flight record**.

## 5. Test/release sequence; exact claims

Dedicated CI on **disposable PG16** tests one non-superuser SOURCE LOGIN, SET-only/no-inherit/no-admin group membership, no direct un-set original writer rights, adapter correct effective role, secret-write failure rollback with mocked GitHub, and replay refusal. Another pure test ensures the manual workflow never runs on PR/push/schedule, every release switch is read from protected secrets, and the real source runner uses the role-bound pool for every V0080/V0079 call. All V3.9 offline tests must pass **exact reviewed head** before merge.

**After merge** it is valid to perform one owner-operated source-only **inert credential commissioning** from exactly pinned source. It does not authorize creating a live release file or making a paid API call until the rights/target/pilot predicates and full budget are genuine. A commissioned SOURCE credential must not be mistaken for completed Phase5 science. No Replit timed jobs; no Cloudflare/Replit AI Agent.

## 6. Code-reading example

`makeP5Stage28DedicatedRolePool(rawPool, {group:"source", reviewedDedicatedLogin:"phase5_p5_source_login_20261108", ...})` wraps a PostgreSQL `Pool` (a connection manager). The wrapper obtains an actual connection, checks `session_user` (the authenticated LOGIN), verifies `SET ROLE` is permitted **only** for SOURCE and never inherited, and executes `SET ROLE phase5_fids_source_prod_20261107`. The SQL `current_user` then becomes the restricted SOURCE group, while `session_user` remains the login. After each operation, the connection is destroyed so one job cannot accidentally borrow another job's elevated role state. `await` means wait for the database result; the `try/finally` block ensures the raw pool is closed on both success and failure. The FIDS HTTP call is **not** part of this wrapper: it occurs only after separate V0080 and V0079 one-shot database confirmations.

**Scientific status:** live SOURCE identity not yet commissioned; live paid FIDS GET **ZERO** this change; genuine prospective three-horizon PRE not yet certified; Phase5 final FREEZE **HOLD**; Phase6 paid launch **NO-GO**.
