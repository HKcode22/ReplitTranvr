# Phase5 · V0083 target-neutral future-date POST source worker — implementation checkpoint

**Nov 10 2026 UTC / Nov 9 Pacific. PROPOSED PAID-CAPABLE CODE, NOT A RELEASE.** The scientific first-cycle target remains undecided. Original amendments A, B, C, D1 (schedule target), D2 (four-HUB sampling) and proposed E stay preserved. **Phase5 FREEZE HOLD / Phase6 GO NO**. No provider API credits, database writes, new roles, manual dispatches or real post data were consumed to author this PR.

## Why this is the actual missing runtime connection, not another planning document

- Historic `scripts/v39_phase4_gate5_g5a_prospective_post_schedule_observation.ts` is for Nov 5 WSSS only; it hard-codes old FIDS windows and a provider *schedule revision* endpoint, not the undecided first-cycle scientific target. **Never replay that paid script.**
- Phase5 [#537](https://github.com/HKcode22/ReplitTranvr/pull/537) already defined a useful target-neutral future POST eligibility rule: preserve genuine partial T−24h / T−6h / T−90m evidence, count missing horizons, and do not treat conditional service names as confirmed physical legs. However that pure helper did not reserve or persist a real future POST.
- V0083 already exists in PostgreSQL as five-category REST physical UTC-budgeted one-shot reservation **schema**. Its two NOLOGIN groups exist, but **review and reserve dedicated LOGIN membership/required table grants are not demonstrated as commissioned**. There is NO source-use rights/retention authorization and no actual Phase6 GO. This new paid-capable code stays inert until all those external prerequisites are genuinely certified.

## Exact new pieces (including scientific and paid safety boundaries)

1. **Actual one-GET V0083 PostgreSQL adapter** `server/lib/disruption/phase5V0083FuturePostOriginalDb_v39.ts`. It verifies the precisely reviewed future POST frame, native selected T, airport/UTC window and historical site/cost/rights hashes; reads actual SOURCE role PostgreSQL PRE rows joined to their V0079 bound original and canonical requested-airport member; accepts **at least one** authentic same-flight source-PRE as scientifically useful while listing T24/T6/T90 holes. A T24 witness remains required for actual T6/T90 execution in the current production owner; this code does not forge one.
2. A **separate reviewed-call role** writes precisely one V0083 `OUTCOME_REST_UNIT_BUDGET` reviewed call only after verifying actual scientific release and Phase6 auth, and a **separate reserve role** executes the existing `clean.reserve_phase5_other_rest_once_v39` exactly once, in a SERIALIZABLE PG transaction, and requires acknowledged PG COMMIT after the V0083 SECURITY DEFINER reservation before any provider GET; REST roles have no SELECT on reservation tables. The budget is charged by **actual UTC physical date**; it is never reset by the 31-day service index.
3. Existing generic FIDS parser now carries `phase5PostReservationSha256` into its exact reviewed application request frame and normalized source response envelope, and the source transport has **`onePhysicalAttemptOnly`**, which avoids automatic second/third retries that would violate V0083 physical reservation accounting. Existing FIDS callers keep their original retry behavior.
4. The POST original and all normalized population rows must be persisted in **one existing FIDS transaction**, with a before-COMMIT hook verifying the V0083 reservation SHA, same airport/source UTC/date/contract and decoded response body. A distinct post-COMMIT readback verifies that original and member count, but **does not elevate a provider estimated runway time into an independent actual flight label**. This is a FIDS source observation, not model evidence by itself.
5. **Dedicated PostgreSQL role adapter** `phase5V0083RestDedicatedRolePool_v39.ts` checks effective login, PG16 role membership, lack of transitive cross-group privileges, expected narrow REVIEW or RESERVE and no PRE/SOURCE privilege. The worker uses existing restricted SOURCE for preflight (and FIDS source persistence, subject to real SELECT/INSERT grants), never the generic application pool.
6. **GitHub main-only manual workflow** `.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml`, guarded by unchanging code SHA, exact source/rights/price/category manifest hashes, exact frozen JSON bytes, GitHub run ID, real 3 dedicated database logins, Phase5 Freeze and separate Phase6 GO. No schedule and no reusable broad trusted secret. One failed/ambiguous paid call is not automatically repeated. Offline PR job uses empty credentials.

### Commissioning is NOT accomplished by the code

- The two new REST review/reserve LOGINS and role privileges required for actual FIDS custody **must be independently provisioned and audited in the real database**; otherwise fail closed. The proposed usernames are examples in the code and are **not** evidence that credentials exist.
- Source-rights / Contents retention / ML use remain subject to ticket #300 and signed per-source policy. Neither signed SHA nor a user approval overrides provider terms.
- The V0083 reviewed category call, seven REST category budgets and real `clean.adb_phase6_authorization` must exist with live approved numbers. No rows have been preloaded or charged here.
- The generic FIDS source endpoint is still just an endpoint observation, not the full POST/receiver/Alert/STOP and not an actual gate-out or wheels-off label.
- A real paid run is impossible until the exact GitHub conditions, independent scientific first-cycle target, production code signoff, 31 prospective parent dates, physical UTC REST/Alert budgets, source-use terms and Phase6 GO are met.
- Signed manual one-call workflow is a step toward, **not proof of**, a completely unattended 31-day controller. Actual day/clock scheduling, idempotent due-source dispatch, receiver/Alert STOP and daily QA still require integration and real tests.
- Run **full CI**, exact-head PR checks and postmerge main readback before considering this code reusable. Unit tests use offline mocked PostgreSQL clients, not production money.

### Completion estimate honestly scoped

This PR reduces one major missing implementation step but cannot, by itself, establish an end-to-end paid launch or a completion date. The remaining critical path is real V0083 permissions/commissioning, source Contents-use rights, a finite future calendar and bounded physical-UTC REST/Alert budget, one scientific first-cycle outcome decision, and a true unattended GitHub orchestration chain. The 31 actual batch-days are Phase6, not unfinished Phase5.

**No external provider request, SQL mutation, independent rights attestation, model-target adoption, or paid GO has occurred in this engineering change.**
