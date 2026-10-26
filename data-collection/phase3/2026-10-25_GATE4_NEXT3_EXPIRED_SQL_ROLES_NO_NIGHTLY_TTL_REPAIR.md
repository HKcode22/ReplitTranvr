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

## LIVE OWNER REPLIT COMPLETION — VERIFIED RESTORATION (SUPERSEDES THE EARLIER "NOT YET EXECUTED" CHECKLIST ABOVE)

**The operator independently executed the reviewed source in Replit, pinned at main** `e3a99b98a183e304d971de41488bccb1d8429e2b` using a temporary detached worktree and completed all three steps successfully. The stdout reported:

- **Step 1, READ-ONLY PREFLIGHT:** `GATE4_NEXT3_NONEXPIRING_SQL_PREFLIGHT_PASS`; prior expiry `2026-10-26T04:00:00.000Z`, planned expiry `infinity`; exactly 2 roles; 4 scoped RLS policies; original synthetic rows=1; paid-owned V0072 bindings=0; sealed signer/writer verified; `providerCalls=0`, `databaseWrites=0`, `storageWrites=0`.
- **Step 2, ACTUAL ALTER + AES CUSTODY:** `GATE4_NEXT3_TWO_RESTRICTED_SQL_PASSWORDS_NONEXPIRING_PASS`; `expiresUtc=infinity`; `databaseRoleAlterations=2`, `storageWrites=2`; existing passwords, RLS, DB data, source, private signer all unchanged; encrypted V3 custody verified; `providerCalls=0`, `paidAuthorized=false`.
- **Step 3, INDEPENDENT READ-ONLY VERIFICATION:** `GATE4_NEXT3_RESTRICTED_SQL_PASSWORDS_NONEXPIRING_VERIFIED`; role catalog passed, **actual owner-writer login passed**, V3 AES custody independently opened, original and owned row counts 1/0; `providerCalls=0`, `databaseWrites=0`. Operator terminal ended `GATE4_NEXT3_ROLE_REPAIR_AND_CUSTODY_CHECK_COMPLETE`.
- SQL driver warned that `sslmode=require`/similar currently aliases `verify-full` but may use weaker libpq semantics in a future major version; warning did not prevent successful verification. Do not change connection strings or log URLs as part of this closeout.

**Disposition:** the specific 9PM SQL-login expiration and sealed-metadata drift are **RESOLVED**; no more nightly TTL extension or rerun of `--extend-once`. The two scoped existing role passwords are now long-lived; rotate/revoke on scope retirement. This is a deliberately limited availability-vs-lifetime decision, NOT a blanket security exemption. The verification explicitly authenticated the owner-writer role; receiver role metadata/policies were verified, but **a separate new receiver-credential login was not demonstrated** by this three-stage stdout. The real published Replit webhook receiver's current health/identity remains a separate upcoming no-provider check.

**Critical distinction:** `NEXT3` paid CREATE was **not attempted by this repair**; no new independent STOP or 6+6 job was armed, and there is still no observed genuinely delivered provider original for this scope. Its previous protected start/stop window is CLOSED, and source/runners require new current-reviewed pins before any separately authorized trial. Do not infer account balance or zero active subscriptions from the expiry repair. Gate4 remains `LIVE_SCIENCE_HOLD`, with Oct26 target / Oct28 contingency. Follow V3.9-f.8 and the linked implementation log, and preserve historical NEXT1/NEXT2/NEXT3 spend/outcome records.


## OWNER NO-PROVIDER PUBLISHED-HOST + GITHUB SAFETY READINESS OBSERVATION — AFTER RESTORATION

The owner next executed a standalone **read-only public GET + GitHub environment variable inspection** from Replit Shell. The output recorded \`status=GATE4_NEXT3_NO_PROVIDER_READINESS_OBSERVATION\` and:

| Evidence field | Owner-observed value | Meaning |
| --- | --- | --- |
| Published hosted \`/__v39/workspace-runtime\` HTTP | \`200\` | Public health available |
| \`receiverHeadMatches\` | \`true\` | Published receiver remains **\`5878b90eed04b2edfe2b226735ff0f02d9be25f3\`**; this is deliberately different from GitHub main |
| \`publishedDeployment\` | \`true\` | Serving on the expected published Replit instance |
| \`prepaidRouteRegistered\` | \`true\` | Previous prepaid route remains mounted |
| \`gate4IngressRegistered\` | \`true\` | Gate4 callback ingress route registered |
| \`genuineCallbackProven\` | \`false\` | **Still no demonstrated authentic provider-delivered Gate4 original** |
| \`safetyVariablesReadable\` | \`true\` | Github \`gate4-safety\` environment variables readable |
| \`runnerMatchesMain\` | \`false\` | Current approved STOP runner SHA **stale** relative to \`main\` |
| \`approvedWindowCurrentlyActive\` | \`false\` | Old approved start/stop interval expired |
| \`providerCalls\` / \`databaseWrites\` | \`0\` / \`0\` | This was not a trial |

The observed GitHub \`main\` at that instant was \`5e7b446d0ce10ade3017904b8a0e46abb1186748\`. Subsequent documentation writes may advance \`main\` again; **read and freeze its fresh reviewed SHA only AFTER documentation is finished**, then set \`GATE4_SAFETY_APPROVED_RUNNER_SHA\` through reviewed, owner-authorized environment configuration for a new STOP run. Do not equate \`main\` and the separately frozen receiver SHA.

**Immediate disposition:** repaired SQL/Custody **PASS**; hosted health/route **PASS**; exact published source **PASS**; authentic paid-original **NOT PROVEN**; protected runner pin **NEEDS UPDATE**; new start/stop approval **ABSENT**; STOP and 6+6 **NOT ARMED**; fresh provider balance/inventory **NOT READ BY THIS OBSERVATION**; new paid CREATE **NOT AUTHORIZED**. This is not an argument for synthetic callback tests or another 2-hour rehearsal.

**Lean next sequence:** (1) finalize code/docs and freeze one fresh reviewed main SHA; (2) confirm private NEXT3 one-shot intent/positive objects and zero V0072 owner binding READ ONLY, plus separately verified actual receiver SQL access where practical; (3) request an exact new owner-approved WSSS one-CREATE trial window and conservative 5-credit soft stop / 1900 protected floor with explicit acknowledgement of possible provider SEND overshoot; (4) refresh protected main runner + window/source/scope/signer pins and dispatch one independently verified STOP + 6+6 GET health workflow, in the intended active window; (5) perform only one GO-gated provider CREATE after fresh strict baseline/zero active (no automatic retries), then true V0071 original/V0072 ownership, exact STOP and three settled balance reads. If no genuine callback, record \`DELIVERY_GAP\` and stop—not a synthetic PASS.

**Deadline:** target Monday 2026-10-26 23:59 PDT, contingency Wednesday 2026-10-28 23:59 PDT (no implicit charge authorization). Keep Gate0.5 T/actual-label method as its separate science task, not a reason to repeat micro-tests.
