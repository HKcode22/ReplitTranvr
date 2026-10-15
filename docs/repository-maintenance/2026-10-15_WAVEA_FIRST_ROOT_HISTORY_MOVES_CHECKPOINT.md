# 2026-10-15 — Wave A first real root cleanup (9 exact-blob history moves)

**Status:** DRAFT PR #39 only; branch `repo-reorganization-gate3-review-20261015`. Previous exact source head `f1d434a14dfc2c03887434ad7a7a336d4cd9d048` passed **all four zero-provider CI**: V3.9 [#38790077913](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790077913), focused [#38790077918](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790077918), PG [#38790077902](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790077902), published GET [#38790077981](https://github.com/HKcode22/ReplitTranvr/actions/runs/38790077981), all completed SUCCESS. **The NEW path-moving commit needs its own CI check**; do not inherit previous green.

## Actual work
- GitHub CI `git grep` identified root references: `gptP0analyze` appears in **five operational/test files**, all checked source lines explicitly reference `gptP0analyze4` as a historical rationale; keep **4 at root** pending updates. Six other Phase0 review files are candidates for safe metadata organization.
- `confused.md`, `analyze_csv.py`, and `REPLIT_DIAGNOSTIC_2026-08-02.md` have **zero literal references in operational/test files** in the CI scan, although other historical docs mention names. Each is a *non-binding* historic file. No claim that a literal scan can prove the absence of dynamic readers.
- **Nine** original root files have been relocated under `docs/history/` in this branch using Git tree entries pointing to their **unchanged exact original blob SHAs**; original paths removed **from working tree** only (history and October15 archive retained). [Machine move/byte receipt](manifests/2026-10-15_WAVEA_ROOT_HISTORY_MOVES.csv).
- Leave `zipFile.zip` (34.2MB), `T3.ipynb` (ML feature engineering audit), current Plan PDF, `gptP0analyze4.md`, `AGENTS.md` and all `SEPmd`/`artifacts` untouched pending deeper review. Binary ZIP/PDF not inspected; don't confuse zero source references with permission to discard unique contents.
- Corrected conceptual migration map for ACTIVE `SEPmd/PHASE2G/OPERATOR_SHELL_ONLY_GUARDRAIL.md`: future `data-collection/phase2g/operations/`, distinct from two historical uppercase docs.
- This commit also adds archive indexes, a current history landing page and an exact-blob old→new receipt. Source file contents are not rewritten.

## Safety boundaries
- Neither `main` nor draft PR36, Replit Agent, published runtime, provider account, active subscriptions, live DB, object store, incident31, original P25 / Gate2 evidence or any paid authorization were changed.
- Do not interpret historic P25 231 billed vs229 received discrepancy as exact PASS. Gate3 paid remains sealed/unapproved.
- Source comment references to `gptP0analyze4` still resolve to an unchanged root file. Documentations whose links point to old Git paths may need follow-up correction; preserve old branch/tag history for recovery.
- This is a **safe candidate cleanup for review**, not permission to merge any PR or to delete old history permanently.

## Next session
1. Verify new HEAD and new exact CI runs. If they fail, investigate/revert the isolated move batch, not default main.
2. Repair or index historical document links referring to moved roots after checking source provenance.
3. Evaluate remaining PDF/notebook/ZIP and active filename `gptP0analyze4` separately; do not delete opaque assets blindly.
4. Only then consider the 155-path SEPmd atomic migration; all protocol, AUTH and evidence bindings remain HOLD.
