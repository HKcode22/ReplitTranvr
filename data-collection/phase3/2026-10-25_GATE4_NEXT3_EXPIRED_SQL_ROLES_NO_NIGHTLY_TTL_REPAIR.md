# Gate4 NEXT3 — independently confirmed expired SQL logins and no-nightly-TTL repair

**Observed 2026-10-25 21:03:58 PDT = 2026-10-26T04:03:58.822Z.** This checkpoint follows [NEXT3 admission repair](2026-10-25_GATE4_NEXT3_ADMISSION_45MIN_TTL_POSTWINDOW_MERGE_AND_HANDOFF.md), [solo-operator preferences](2026-10-25_GATE4_NEXT3_SOLO_OPERATOR_AUTOMATION_AND_ACCEPTANCE.md), the [V3.9-f.8 Data Collection Plan](../plans/V3.9_DataCollectPlan_f.8.md), [Implementation Log §1.8.3](../implementation/V3.9_IMPLEMENTATION_LOG.md), and [issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38). Gate4 remains **LIVE SCIENCE HOLD**. Nothing below authorizes paid AeroDataBox activity or a new subscription.

## Independent owner production-read result

The Replit Shell, in a transaction explicitly `BEGIN READ ONLY`, connected with the existing owner URL to PostgreSQL's `pg_roles` and reported:

- `status=NEXT3_ROLE_EXPIRY_READONLY_OBSERVED`;
- `observedAtUtc=2026-10-26T04:03:58.822Z`;
- `gate4_owner_writer_2026_next3`: `rolcanlogin=true`, `rolvaliduntil=2026-10-26 04:00:00+00`;
- `gate4_receiver_2026_next3`: `rolcanlogin=true`, `rolvaliduntil=2026-10-26 04:00:00+00`;
- `providerCalls=0`; `databaseWrites=0`.

Both identities exist but their password-validity cutoff had passed ~3m59s before the observation. Password-based new SQL LOGIN is therefore not available without an appropriate scoped change. This is **not AeroDataBox key expiry**, nor proof of a live paid provider POST. The `pg-connection-string` SSL warning is a future-mode compatibility notice, not the root cause; explicitly prefer `sslmode=verify-full` in the next separately reviewed credential/config maintenance, never display connection strings.

## Non-paid code repair and authorization boundaries

[PR #162](https://github.com/HKcode22/ReplitTranvr/pull/162) merged after **5/5 no-provider CI success** (reviewed PR source `ed4109394c0065e626fed6e72db8ac323269f963`; main merge `84ca93845aeb00c4e312ff04ba38659d463beff7`). The narrowly scoped source-only repair:

1. Adds `scripts/v39_gate4_next3_no_expiry_roles_and_custody_v39.ts` with owner-side `--check`, explicitly authorized `--extend-once` and separate `--verify` modes. The write mode can alter **only the two exact restricted NEXT3 role password-validity timestamps** in one transaction to PostgreSQL-supported `VALID UNTIL 'infinity'`, after verifying unchanged role attributes, exactly four source/scope/authorization-bound RLS policies, 1 earlier synthetic original and 0 paid-owned bindings. No password, grant, RLS, extra DB role, schema or data mutation is intended.
2. Preserves immutable prior 9PM V2 encrypted custody, the exact AES-derived keys, writer URL and Ed25519 signer; writes a **new versioned V3 encrypted custody object** and one-time private intent after the role transaction. A partial SQL/custody or unknown one-shot write stays HOLD; never rerun SQL blindly.
3. Extends the private custody validator and the NEXT3 paid operator to understand precisely the `infinity` sentinel **only when the new source/auth/signer-matched V3 object is verified**. Actual paid `--execute-one` still requires explicit separate live GO, fresh source-pinned active UTC scope, actual independent STOP ARMED, in-progress 6+6 monitor, fresh real provider account and inventory, one durable intent, exact owned ID and downstream three-read settlement. It cannot silently revive the old 20:08–20:35 PDT window.
4. Test coverage includes exact role whitelist, no broader SQL privileges, required previous custody, V3 AES-GCM Ed25519 roundtrip, paid admission and no provider I/O. First CI run found **one outdated test-string assertion**; it was repaired without weakening production logic. Final five reviewed-head checks all passed. No Replit deploy, SQL edit, encrypted App Storage write or provider operation occurred from merging GitHub.

**Risk tradeoff:** a password-validity cutoff of `infinity` prevents another artificially imposed 9PM database outage, but the existing narrowly scoped credentials become long-lived. Keep them in server-only secure storage, preserve their limited RLS permissions, avoid publishing the URLs, periodically review them, and explicitly revoke/rotate both NEXT3 credentials once the owned Gate4 scope is retired. Never label this as globally credential-free or provider billing disabled. PostgreSQL's official `ALTER ROLE` documentation describes `VALID UNTIL 'infinity'` as indefinite password validity.

## Next operator action / still unproven

1. Read-only `--check` using the exact reviewed **merged main** script and authenticated existing owner connection; verify source, DB catalog, RLS, v2 custody and 0 owned V0072. Do not reuse the old 9PM extension script, expired paid job IDs, or former SHA pins.
2. To **actually restore SQL login**, the owner must deliberately execute one explicitly authorized `--extend-once` operation in Replit using the merged source SHA. It performs only the exact two role validity changes and V3 AES custody update; afterward run `--verify`. **This step is not yet executed or authorized by a GitHub merge**. If it fails after SQL commit, stop and reconcile exact DB/App Storage state, no blind retry.
3. For the next separately paid-authorized Gate4 attempt, refresh the independent GitHub runner PIN (main has changed), use an appropriately buffered fresh STOP and 6+6 window, strict baseline and zero foreign billable subscriptions, and at most one immutable NEXT3 CREATE. Preserve genuine V0071 original SHA and provider-returned exact V0072 owner ID; verify exact STOP and at least three stable settlement reads; report real SEND/callback gap honestly.
4. Finish/recheck required f.8 §11.3 and Log §1.8.3 offline scaled cap/failure and no-second-start assertions, then make a qualified scientific determination. A single genuine original proves feasibility, not month-long reliability or full hard-cap enforcement. Distinct Gate0.5 actual runway T semantics remain separately NOT_PROVEN before Phase6 science GO.

**Deadline:** Gate4 target **2026-10-26 23:59 PDT**, contingency **2026-10-28 23:59 PDT**; these are contingent operational targets, **not** paid authorizations.
