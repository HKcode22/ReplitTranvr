# Phase 4 Gate 5 — V0076 restricted-role exact ACL repair and post-repair independent verification

Date: November 1, 2026 (Pacific). Status: **operator-reported successful exact four-table repair; GitHub independent post-repair audit pending**. Binding scientific plan: `data-collection/plans/V3.9_DataCollectPlan_f.8.md`; the implementation log is hash-locked and unchanged.

## Provenance and root cause

V0076 metadata was installed by the reviewed one-use privileged Replit transaction at source main `a108532822f87235ef4135c8d5b925806dde5171`, exact staged SQL blob `c74b3d9d2cc635e8fa604f81f6c91595ea558f2f`. Privileged admin and restricted runtime connections saw the same physical original science table fingerprints. Installer output confirmed four new metadata tables, one reservation function, zero source/provider/paid-owner changes.

Independent protected GitHub [run #41285344368](https://github.com/HKcode22/ReplitTranvr/actions/runs/41285344368) confirmed four LOGGED tables, secure fixed-search-path SECURITY DEFINER reservation function with no PUBLIC/runtime EXECUTE, and immutable attempt trigger, but **FAILED CLOSED** due to effective runtime table privileges. Follow-up protected ACL provenance [run #41286002585](https://github.com/HKcode22/ReplitTranvr/actions/runs/41286002585) confirmed the worker had **direct explicit SELECT, INSERT, UPDATE, DELETE** rights on every new V0076 table, not PUBLIC or inherited group/predefined role. This does not mean the installer SQL had a direct GRANT (it did not); a pre-existing default ACL may have been applied at table creation. Root cause of the historical default granting rule itself is not fully proved.

## Operator exact four-table repair receipt (2026-11-01)

User executed the bounded one-off `GATE5_V0076_EXACT_ROLE_REVOKE` Replit shell after GitHub root cause check. The command:
1. Pinned the unmodified staged V0076 SQL Git blob to `c74b3d9d2cc635e8fa604f81f6c91595ea558f2f`; fetched actual main `f363464ba984abbcf6bc95c03866f31f2202b185`.
2. Independently compared admin/runtime physical original-object IDs and required privileged CREATE versus restricted non-CREATE.
3. Required exactly four LOGGED V0076 tables, expected direct ACLs, no PUBLIC ACL. Under an admin `SERIALIZABLE READ WRITE` transaction, advisory lock `(76,39)`, 12-second statement deadline and 2-second lock deadline, it executed `REVOKE ALL PRIVILEGES` **only on the four new V0076 tables, only from the actual restricted worker role**.
4. Checked direct ACL removal before COMMIT and effective worker rights through a separate worker connection after COMMIT.
5. Printed the following sanitized receipt, user supplied:

```json
{"status":"V0076_FOUR_TABLE_RUNTIME_ACL_REVOKED_VERIFIED","tables":4,"restrictedRoleAccessibleTables":0,"historicalFlightTablesModified":false,"providerCalls":0,"flightDataWrites":0,"paidOwnerActivated":false,"strictGate5Passed":false}
```

This is **not** authorization for a provider call and does **not** independently certify that a separate GitHub-runner runtime secret sees the same post-repair database state.

## Independent validation after repair

Main-push-only workflow `.github/workflows/phase4-gate5-v0076-postinstall-readonly.yml`, protected `V39_DATABASE_RUNTIME_URL`, `REPEATABLE READ READ ONLY`, `ROLLBACK` and **zero provider secrets** rechecks four LOGGED tables, worker no SELECT/INSERT/UPDATE/DELETE/TRUNCATE, no schema CREATE, secure reservation function, no PUBLIC or runtime EXECUTE and enabled immutability trigger. Explicitly do **not** rerun the previous failed GitHub attempt: its guarded `GITHUB_RUN_ATTEMPT=1` would fail closed. Instead new reviewed code/doc main-push triggers an independent attempt-1 run. **Read actual post-merge job logs before marking isolated.**

No runtime GRANT or owner activation has been made. Future tightly scoped function-only runtime permission review requires further evidence and will be separate. Provider-native first selected T, actual-only wheels-off and operating-leg proof (#200), account-specific content/backup retention rights (#300) and real prospective T−24h/T−6h/T−90m durable source/PRE/outcomes (#293) remain unresolved. **Gate5 HOLD, Phase5 FREEZE HOLD, Phase6 NO-GO**.
