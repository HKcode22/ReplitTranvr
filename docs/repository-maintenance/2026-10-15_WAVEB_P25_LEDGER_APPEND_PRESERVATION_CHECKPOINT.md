# 2026-10-15 — Preserve original P25 signed AUTH ledger append across Gate3 / Wave B

**Main before this no-provider test:** `effb9be801545d25842b09d8fb30a86f6dc4b848`. [PR43](https://github.com/HKcode22/ReplitTranvr/pull/43) merged, [main offline #38819717036](https://github.com/HKcode22/ReplitTranvr/actions/runs/38819717036) SUCCESS. [PR36](https://github.com/HKcode22/ReplitTranvr/pull/36) remains unmerged and not deployed at exact inspected head `318e2c3b8223bfc417757dbe571883aecdbca589`.

## Confirmed by direct GitHub file-content comparison

- Current main `SEPmd/V3.9_RUN_REPORTS_AND_EVIDENCE.md` Git blob `d859a2794d423ec21542afe304d22344b7fccc14`, **3423 lines**.
- PR36 standalone copy Git blob `c7ac06cb0617486d7061b69fa5bc012502bdae91`, **3392 lines**. Exactly its main counterpart's first 3392 lines; **missing the final 31 lines beginning `### AUTH-20261013-P2G25 — approved Phase 2G Stage-1 authorization`.**
- Current main original signed AUTH JSON remains Git blob `de9db3bef4efbdfc15e8019f4fc539cfa4887f79`; original Gate2 runtime JSON remains `946e2e48c66d97fe1ef6e8964ad41cf07d200595`.
- PR36 also has different prospective Plan and Implementation Log source blobs. The branch missing ledger appendix and frozen originals does **not** prove a normal GitHub three-way merge would delete main's existing records; never deploy PR36's standalone source before reconciliation.

## New permanent regression

[`tests/repo_waveb_p25_ledger_append_guard_v39.test.ts`](../../tests/repo_waveb_p25_ledger_append_guard_v39.test.ts) verifies exactly one P25 authorization ledger section remains, retains the original signed authorization ID and exact scope, P25 runtime provenance, approvals/cost limits and the explicit **no paid run from this ledger edit** and **no automatic retry** conditions. It allows future legitimate ledger additions instead of requiring the whole ledger SHA stay frozen forever. Original ledger and signed data files are **unchanged**.

**Before any Wave B physical move or PR36 integration:** ensure this test and the 155-path read-only collision simulator pass, then review Plan/Implementation/ledger merge semantics and dynamic source path consumers. This does not authorize a paid run or change the original P25 231 billed vs 229 received delivery-gap result. No Replit AI Agent, SQL/object store, provider or deployment change.
