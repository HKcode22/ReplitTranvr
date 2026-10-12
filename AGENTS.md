# ReplitTranvr — standing operator/tool boundary

**Effective 2026-10-12; indefinite until the project owner explicitly changes this rule.**

## REPLIT AI AGENT IS DISABLED FOR OUR WORKFLOW

The owner reports that Replit AI Agent's monthly free quota is exhausted (Replit UI reports reset on **2026-11-05**) and does **not** want any paid Agent usage. **Do not call, message, inspect with, or request edits through the Replit AI Agent**. This includes `ask_question`, `update_app_using_prompt`, Replit Agent chat, automated Agent source sync, and any similar Agent-assisted feature. The rule **continues after** the quota reset unless the owner explicitly revokes it.

**The previous Replit Agent requests on 2026-10-12 failed immediately with monthly Starter/free-quota exceeded; no sync, code change, source attestation or publication was verified from those requests.** Never infer success from a returned `phase=updating`, empty answer, or Replit auto-checkpoint.

**Replit operations go through owner-operated Shell/UI:** If workspace inspection, source sync, tests, configuration, signed callback test or publication is needed, give the owner the smallest reproducible, clearly scoped Replit Shell commands and/or precise manual Publish UI instructions. The owner executes and pastes actual output; distinguish a proposed command from a command proven executed. Never assume free AI Agent credits or suggest upgrading as a prerequisite. Do not use Replit app connector tools without renewed explicit authorization; prefer a secret-free GitHub Actions public HTTPS GET or another owner-approved read-only probe where useful.

**Never reset a Replit worktree or change its branch without identifying/preserving existing commits, including the local `1ed8af1...` seen on 2026-10-12.** Preserve running long tests and detached worktrees. Follow the repo's more restrictive `replit.md` Git-mutation approval restrictions; shell commands should have clear stop/verify points, and user execution provides the operator-controlled step. Do not start paid AeroDataBox provider calls, mutate the live database, or initiate a paid workflow without separate and exact authorization, source/publication matching and a passing final preflight.

## Phase 2G continuity and scope

- After every substantive project work session, commit an accurate dated Markdown checkpoint or update the current one in GitHub, including source SHA, what actually changed, verified tests, unknowns, paid/DB effects, and next operator action.
- Keep the standing no-Replit-Agent decision in the checkpoint and across future sessions; don't relitigate quota limitations.
- Review `SEPmd/phase2g/CHECKPOINT_PROTOCOL.md` when available and the current Phase 2G report in `SEPmd/phase2g/reports/`. Treat historical failures/unknown billed credits truthfully; future tolerance proposals never retroactively rewrite frozen science.
- Do not rewrite Plan f.8 or implementation history wholesale. Apply narrowly justified methodology/process amendments separately from a frozen paid release.
- If an action cannot be performed directly without Replit Agent, provide owner-operated Shell/UI instructions instead of making claims that an Agent has done it.

**Owner override:** Only an explicit later user instruction can lift or narrow this ban. A calendar reset, a different account, or the ability to call an API is **not** permission.
