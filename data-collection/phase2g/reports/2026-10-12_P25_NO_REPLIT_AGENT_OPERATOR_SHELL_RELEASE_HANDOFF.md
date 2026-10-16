# P25 YSSY October 12 — permanent no-Replit-Agent rule and operator-only Shell release handoff

Status as of 2026-10-12 05:37 PDT: **P25 reviewed release on GitHub main; NOT yet attested published; NO new paid run initiated.** Target 20:00–22:00 PDT 2026-10-12 / 03:00–05:00 UTC 2026-10-13 / 14:00–16:00 AEDT 2026-10-13.

## Binding owner decision
- The owner expressly required: **do not talk to/use Replit AI Agent unless they explicitly later say otherwise**. Replit Starter/free Agent quota is exhausted, UI says reset 2026-11-05; limit persists after reset. Prior Oct12 Agent read-only question, "prepare source synchronization" and follow-up returned quota error ("You've reached your monthly free quota limit") after one second each. **Zero verified changes performed.** An earlier API result `phase=updating` is not proof Replit worked.
- Permanent rule on main: root `AGENTS.md` at commit `72b4a7a5a85b7ef6b73628f2431f9da879a0de6f`, and `replit.md` extended at commit `f3d24db07530b875733c6312a73a81d8c2d90d5f`. For Replit, **owner executes Shell commands or clicks manual UI**, supplies real stdout; don't call Replit Agent or Replit connectors, use GitHub for documentation / independent CI.
- No need to upgrade or pay Replit AI. Do not combine this rule with AeroDataBox financial AUTH; separate permissions and budgets.

## Actual verified source/release and approvals
- PR #35 merged (operator approved finance ledger) at GitHub main merge commit `a1a05d4b9c0e64690ff877b4c23387152b265274`. Release branch AUTH record commit `bb3fd3d7670dbb87f38c7921105daed6ab1ab2a4`; all four PR35 head CI workflows PASS (offline `38248757141`, focused `38248757095`, real disposable PG `38248757445`, public receiver read-only `38248757207`).
- Main now has **two docs-only owner-policy commits**, latest `f3d24db07530b875733c6312a73a81d8c2d90d5f` prior to adding this checkpoint, so final source publication should use a newly re-fetched expected GitHub main tip and unmodified protected code. None of these docs commits change the protected server/workflow code or frozen runtime/Auth JSON.
- P25 proposed financial AuthRecord `AUTH-20261013-P2G25` approved **for ledger** with SHA256 `4a27a43d26fa2e257ea5ddf92afb2d05efe7213c07c0ec3def41ac4da8ab10e0`, runtime SHA256 `101c9ab8ade5978194fc22c4e2f64660ee74dbe5d0b8efcfab87b798e4df333f`, 500 Alert credit max (450+50), protected floor 1000; **not paid execution authorization**. Separate one-shot RUN_PAID_STAGE1_ONCE consent after actual fresh paid preflight remains required.
- Old budget `P2G-S1-20261009-23` operator-confirmed admin quarantine `OPEN→MISMATCH`, previous probe18 failed/UNRESOLVED, actual spent UNKNOWN, 30 original refs retained. No historic science promotion or invented charge reconciliation.

## Reality check: Replit was NEVER source-synchronized by Agent
- Last operator Shell showed local workspace clean `main`, HEAD `1ed8af1bcd02a65503d6e2872604e68e87ec5275`; many detached/prunable worktrees, including active two-hour P20 rehearsal in `/tmp/yssy-p20-local.5GpMah` pinned `f4c9b244...`. Do not delete or prune worktrees.
- Independent secret-free GitHub Actions public GET run `38247697861` showed **currently published** `git_head=9c8ab21e98e86bcee52de2b1bbf0f9c6c20b3e30`, status PASS, Autoscale, prepaid route registered, 168h retention config. This was old binary relative to PR35 and **NOT P25 source-attested**.
- The GitHub 120-minute zero-provider synthetic run `38247064249` began after P25 main release; P25 6+6 and termination tests PASS, full 120-minute local-spool synthetic segment not yet final-PASS at last checked. This is an independent GitHub runner, unaffected by Replit app restart, but NOT deployed ingress or provider-send proof.

## Next operator handoff — do not spend hours on optional diagnostics
1. Owner runs a **guarded Replit Shell source-backup/sync** script with exact current remote main commit pin fetched freshly. It records current local commit, requires clean tree, saves it under an archive branch, fetches current GitHub `origin/main`, and either fast-forwards local main only if that is possible or creates a fresh review/publish branch from `origin/main`, leaving the diverged old main and all running worktrees intact. NEVER `reset --hard` or `worktree prune`.
2. Owner pastes branch/HEAD/status output. Compare to current GitHub main and frozen protected tree hash. A new ordinary source-aligned Replit branch is **not yet a published app**.
3. Owner performs one manual Replit **Republish** via existing Deployment UI **after** exact source-parity and unchanged secrets/settings are confirmed; only then verify public `/__v39/workspace-runtime` GET. It may produce a legitimate Replit-generated child commit; if so, preserve it as authentic Git history and bring it to GitHub main under correct protected-tree/hash checks. No fake git head.
4. Fresh signed wrong-secret and valid nonempty public synthetic callback POST with immutable 168h source byte/hash readback and exact cleanup, real GitHub/Replit DB/secret/cleanup binding and fresh provider current balance/active subscription inventory.
5. At the intended window require `PASS_READY_FOR_PAID_STAGE1`, true frozen AuthRecord, current protected floor/cap and separate one-shot owner paid-start approval. Any hard fail means HOLD with dated checkpoint, not an unauthorized retry.
6. Do not re-open historical probe18 old spending: unknown is quarantined. Do not wait for optional full local test to substitute for current authentic hosted preflight. Avoid calling Replit AI in any future project session.

## Next exact starting point
Read `AGENTS.md`, `replit.md` and this checkpoint; verify latest GitHub `main` SHA; have owner run a shell guard/backup/sync command and paste exact output. Do not use Replit Agent even to read status.
