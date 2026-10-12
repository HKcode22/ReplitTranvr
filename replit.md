# Project instructions

## Git and read-only safety

- Do not run or initiate a Git operation that stages changes, creates or alters commits, changes branches, or modifies local or remote refs unless the current user request explicitly authorizes that exact operation. This includes `git add`, `git commit`, `git push`, `git merge`, `git reset`, `git checkout`, `git switch`, `git rebase`, `git cherry-pick`, `git fetch`, `git pull`, branch or tag creation/deletion, and equivalent commands, APIs, callbacks, or UI actions.
- Authorization for one Git operation does not authorize another. A request to implement, fix, test, deploy, or complete a task does not itself authorize any Git mutation. Do not stage or commit work automatically.
- Read-only Git inspection is allowed only when it does not change the index, worktree, history, branches, or refs (for example, `git status`, `git diff`, `git log`, and `git show`).
- For read-only requests such as inspection, diagnosis, or reporting, do not create, edit, or delete files; run scripts or commands that mutate state; mutate a database; make provider or other external changes; run cleanup, finalizers, or experiment reruns; or perform Git mutations. Use read-only operations only. If answering requires a mutation, stop and ask first.
- Keep every change within the user's requested scope. Preserve scientific code, experiment evidence, artifacts, branches, and runtime behavior; do not make unrelated changes or perform cleanup, finalization, experiment reruns, provider actions, or database mutations unless the current request explicitly authorizes that exact action.
- These rules govern actions initiated by the Agent, including platform tools that would commit, merge, or alter Git refs. Replit may create platform-managed automatic checkpoints independently; this instruction cannot disable or change those checkpoints. Report such checkpoints separately from Agent-issued Git commands, and do not attempt to remove or rewrite them unless explicitly authorized.


## Permanent owner preference — Replit AI Agent prohibited (2026-10-12)

**Until the project owner explicitly says otherwise, never contact or use Replit AI Agent.** The owner reports its free monthly quota is exhausted, with reset on November 5, 2026; the ban persists after that date. The 2026-10-12 Agent queries and source-sync attempt returned free-quota-limit errors and performed **no verified work**. Never claim the workspace was synchronized because an Agent call returned `updating` or a checkpoint notification.

For all Replit-specific inspections, source sync, tests, republishing and cleanup, prepare minimal, reviewed **human-executed Replit Shell commands** or straightforward manual UI steps; the owner executes and pastes the result. Do not use `ask_question`, `update_app_using_prompt`, Replit chat/Agent or any Replit connector tool unless owner expressly lifts the ban. No chargeable AI plan upgrade is required. Use GitHub Actions for independent secret-free tests where appropriate. Preserve the local Replit worktree/branch/commit and running rehearsals; no hard reset, payment, provider action, production DB mutation or paid GO without appropriate explicit authorization. See [AGENTS.md](AGENTS.md) for the full standing rule.
