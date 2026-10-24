# Gate 4 — verified policy PASS and sealed second-writer engineering

**Date:** Friday 2026-10-23 Pacific (2026-10-24 UTC). **Scope:** Phase3 Gate4 only. **Release:** SOURCE-SEALED; no paid authorization; no production changes.

## Verified original evidence and false HOLD disposition

The owner executed the independent post-retirement OWNER `BEGIN READ ONLY` SQL verification and received:

- `oldOwnedBindings:1`, `otherOwnedBindings:0`; historical V0071 originals `1`, other originals `0`; first V0071 original is previously proven no-provider **synthetic**, not a real Alert SEND.
- Historical `gate4_owner_writer_20261023` exists but has `rolcanlogin=false`; RLS on V0072 is on; exactly one surviving policy `gate4_safety_select_v39`.
- Additional ACL checker completed identity, roles, privileges but printed `GATE4_POST_RETIREMENT_ACL_HOLD` only at `POLICY` because an ad-hoc JavaScript assertion treated `pg_policies.roles` as Array.
- PostgreSQL-side verification then printed `GATE4_POLICY_DIAGNOSTIC_PASS` with all 8 checks true: table RLS enabled, one policy, exact name, permissive SELECT, one assigned role, expected safety reader, `USING true`, `WITH CHECK null`. `returnedRoleFormat=JS_STRING`, **explains false HOLD**. No provider requests or database writes. No production RLS repair required.
- Tracked in [central issue #38](https://github.com/HKcode22/ReplitTranvr/issues/38#issuecomment-6379379002). Previous PR #116 merged reviewed postretirement pure RLS plan as `0ec6bfe6afadf0a1d982ff14259599fa12aac528` with five PR checks successful.

## New code on isolated review branch

`research/gate4-second-writer-commission-20261023` adds:

1. `scripts/v39_gate4_second_writer_commission_v39.ts`: new operator with `--plan` and future `--apply`, guarded by immutable `GATE4_SECOND_WRITER_PRODUCTION_APPLY_RELEASED_V39=false`. A `--apply` invocation **currently fails before database IO or even config access**. `--plan` requires exact git reviewed SHA and independently specified next scope, AUTH, receiver-source SHA, temporary role. Uses read-only owner SQL with PostgreSQL-side server comparisons for the policy and controlled V0071/V0072 custody counts. No provider client.
2. A future separately reviewed/authorized activation path has source pinned and independent confirm, no broad runtime credential; temporary distinct `NOINHERIT NOBYPASSRLS` role with one connection, 6-hour expiry, private `0600` role-specific URL stored outside git; exact new-scope predicate from previously merged pure reviewed RLS plan; atomic same-transaction metadata recheck, advisory lock, role/grant/policy creation, in-transaction safety/privilege checks and post-commit reconciliation, refuses unknown/different rows; ambiguous outcome retains private file and HOLDs rather than blind retry. **The path is not released**.
3. `tests/phase3_gate4_second_writer_commission_seal_v39.test.ts`: no-key/no-database child-process refusal of `--apply` and offline assertions over restricted grants, full source seal and historical evidence protection.

**Caution:** the new script's future `--apply` DDL is a draft implementation. It must pass targeted tests, full CI, a dedicated **actual disposable PostgreSQL16 behavioral test of policy scope isolation**, and an independent code/SQL security review before anyone proposes flipping the release seal. Any future activation needs a new signed AUTH + role source-specific approval; no approval currently exists. The presence of a dormant DDL code path is not evidence that it has been run.

## Critical remaining work to close scientific Gate4

- **New V0071 receiver scope/secret:** currently published receiver is source `d2265a1ee8ed4428f7aef97aa084c9aeb7e8aaf5`; startup pins historical UUID/AUTH. Evaluate controlled rescope/restart or reviewed alternative while preserving existing prepaid route and private original-byte custody. Current existing `gate4_receiver_20261022` login has SELECT+INSERT V0071 only; no DB RLS there; review database-level scope isolation for the next receiver before applying a new scope. Runtime config edits alone are not a proof of deployed source.
- **Fresh immutable authorization:** distinct UUID, approved AUTH digest, actual hosted receiver compiled SHA, bounded WSSS source/airport, exact UTC start/STOP, soft ~5-credit monitoring with defined overshoot risk and protected floor. Previous 5min paid trial/one-shot consent is SPENT. Do not set arbitrary start time or provider budget on behalf of owner.
- **Independent protected GitHub STOP:** reviewer-armed before one fresh positive AeroDataBox CREATE, exact-id ownership, no old STOP reuse. Current published identity verified earlier; reverify when running, not assume GitHub main equals Replit SHA. No hard provider spending cap.
- **Genuine science:** require actual positive provider-owned subscription ID, fresh real V0071 original wire/sha tied to the new scope/source/AUTH and provider subscription ID, delivery attempt cost/reconciled account if observed, independent STOP/0 billables and 3 stable balance snapshots. One observed SEND may qualify live feasibility only, not long-term reliability. Zero SEND/zero callback remains INCONCLUSIVE. No Phase4 execution yet.

## Exact next session

1. Review new PR and all exact-head checks. On any failed TypeScript/test/CI, fix on branch, not main.
2. Add a disposable PG16 test that actually creates a limited next role/policies in an isolated test DB and verifies old/new row isolation, absence of V0071/UPDATE/DELETE rights, and that safety-reader SELECT survives.
3. Design receiver controlled-scoping and rollout; lock fresh owner-vetted scope/AUTH/source and exact spending exposure before any production DDL/republish or paid subscription.
4. Obtain **explicit production DDL/deploy approval**, separate independent STOP approvals, and later **separate paid CREATE GO**. Do not call legacy `v39_gate4_single_live_create_operator_v39.ts --execute-one` or old writer `--apply`.

**Status:** prior real WSSS Alert CREATE/STOP lifecycle PASS; genuine ordinary paid Alert delivery remains unobserved, Gate4 scientific disposition INCONCLUSIVE. All work in this review branch is repo-only.
