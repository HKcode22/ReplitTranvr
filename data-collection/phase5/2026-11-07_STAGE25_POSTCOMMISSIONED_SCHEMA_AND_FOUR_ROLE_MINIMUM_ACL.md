# Stage 25 — Production schema is installed; next prove scoped source, PRE and witness roles

**2026-11-07 UTC. Reconciled against actual owner Replit Shell result.** Stage23 production owner installed **V0079 + V0080 + V0081** and returned `P5_EMPTY_V0079_80_81_SCHEMA_DURABLE_INERT`, eight durable tables/one index/nine functions, `publicTableAndHelperPrivileges=0`, `productionSchemaChanged=true`, `producerSourceRoleGrants=0`, `flightRowsWritten=0`, `providerFidsGets=0`, `providerAlertCreates=0`. This owner result is stored verbatim in [issue #416](https://github.com/HKcode22/ReplitTranvr/issues/416). **Do not repeat Stage23**. Earlier Stage16b and Stage18 findings that 0/8 were present were correct for **before commissioning**, not the present status.

PR [#455](https://github.com/HKcode22/ReplitTranvr/pull/455) **merged to main `63395fa5bcdf69f6a2d4a8c1f1f619439d5a7ffb`** after six exact-head successful tests. It added a new reviewed T24 witness requirement for staged T6/T90 PRE writes, preserving the original T anchor and source hash, and rejecting late/missing witness. A supplied receipt SHA-256 is **not independent authentication**. None of these changes proves actual new flight records or paid collection.

## Four separate actors rather than one powerful database user

| Role | Narrow positive rights | Important negative rights |
| --- | --- | --- |
| **Independent plan/publisher** | SELECT frozen calendar/airport draws; INSERT only prepared V0079 cycle/day/UTC-charge budgets and allowed queries | Cannot write FIDS original, physical reservation or PRE |
| **GitHub-only physical source collector** | SELECT frozen approved query, budgets, physical attempt/original/source; INSERT decoded FIDS original, normalized population and immutable original binding; EXECUTE only V0080 PREARM and V0079 one-attempt reservation SECURITY DEFINER entrypoints | Cannot INSERT physical reservation or prearm table directly, UPDATE approved query, INSERT a flight PRE or T24 witness |
| **Per-flight PRE-only writer** | SELECT exact source/operating-leg/witness and snapshots; INSERT new `flight_snapshots` using its sequence | Cannot UPDATE/DELETE prior PRE, INSERT source/reservation or INSERT witness |
| **Independent Stage17 witness-only writer** | SELECT already committed T24 PRE and source/binding; INSERT/SELECT the single V0081 immutable witness row | Cannot INSERT any PRE, edit or delete a witness, or write source/query budgets |

The [Stage25 isolated real PostgreSQL16 SQL role-matrix test](../../tests/sql/phase5_stage25_least_privilege_four_roles_disposable_pg16_v39.sql) creates **four NOLOGIN CI roles** and asserts permitted and forbidden operations with PostgreSQL's native `has_table_privilege`, `has_function_privilege` and `has_sequence_privilege`, plus an ACL inspection of any unintended PUBLIC grant. The [dedicated workflow](../../.github/workflows/phase5-stage25-least-privilege-roles-disposable-pg16.yml) applies the exact B0062→V0079→V0080→V0081 schema **only in disposable PG16**, then tests the role matrix. No provider secrets, production database credentials, paid GET, Alert credits, app publish, or production role GRANTs.

### Why we do not grant these roles automatically

An installed table schema is durable infrastructure; granting the source collector the ability to call a `SECURITY DEFINER` paid-reservation function is a separate **runtime authorization boundary**. A valid call can irrevocably reserve REST credits. No app runtime role should receive those grants. Later production setup needs exact **approved role identities and securely supplied secrets**, independently reviewed rights and a signed source-budget release; it must not manufacture passwords or broadly GRANT a role only to make a synthetic CI pass. A scientific production source owner should use only GitHub Actions with frozen run identity, not a timed Replit runner.

Before real source/PRE: native provider-selected first T/physical operating-leg criteria, normalized Contents ML/retention rights (issue #300), actual provider range/charge units and 31 batch-day/5 crossover calendar, released receiver SHA, signed reviewed Stage17 witness receipts and independent missingness denominators must be grounded in real evidence. The owner already provided grandfathered AeroDataBox Ultra account/quota evidence in GitHub; do not re-request it or search email as a default.

## Study notes: database authorization

`GRANT SELECT ON table TO role` grants read, while `GRANT INSERT` permits **new rows**. `UPDATE` is distinct and stays denied on immutable flight records. `SECURITY DEFINER` executes stored procedure SQL using the function owner's permissions, so the source role needs permission to **EXECUTE the exact function**, not broad direct write access to cycle/day/UTC charge ledgers; the function itself is responsible for refusal guards, irrevocable reservation and budget updates. `NOLOGIN` CI roles cannot connect with a username/password and cannot be accidentally used as production identities. A PostgreSQL sequence may need a separate `USAGE` grant to populate an auto-incrementing PRE snapshot ID.

**Status: empty production schema INSTALLED; actual dedicated role grants NOT INSTALLED; complete source→T24→T6→T90→POST NOT LIVE; Phase5 scientific FREEZE HOLD / Phase6 paid GO NO.** This is a finite scoped engineering step, not another historical database inventory.
