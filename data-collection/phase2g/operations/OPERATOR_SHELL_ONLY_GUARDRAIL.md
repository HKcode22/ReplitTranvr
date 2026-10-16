# Replit Shell-Only Operator Guardrail

Status: ACTIVE  
Scope: ReplitTranvr / V3.9 aviation experiment

## Binding operating rule

For this project, ChatGPT must **not use or communicate with Replit Agent**
for repository inspection, execution, debugging, database work, Git work,
provider work, cleanup, finalization, or experiment operation.

Reason: interactions with Replit Agent/platform repeatedly caused automatic
local checkpoint commits that moved local `main` and interfered with
hash-bound scientific guards.

## Required workflow

When Replit-local information or execution is required:

1. ChatGPT writes an explicit guarded shell/terminal block.
2. The human operator pastes that block into the Replit shell.
3. The human returns the complete output to ChatGPT.
4. ChatGPT analyzes that output before authorizing the next operation.

Do not replace this workflow with Replit Agent calls.

## Replit-local mutation rule

Never perform automatically through Replit Agent:

- `git add`, `git commit`, `git push`
- merge, reset, checkout/switch, rebase, cherry-pick
- repository/file edits
- database mutations
- provider/API mutations
- subscription creation/deletion
- cleanup/finalizers
- paid experiment execution
- experiment reruns

All such operations must instead be expressed as explicit shell commands
for the human operator unless the human explicitly changes this rule.

## GitHub access

GitHub may still be inspected directly for repository source, commits,
issues, workflows, and evidence.

Repository/source mutations should remain explicit and auditable.

## Scientific rule

This operator workflow guardrail changes no scientific protocol,
acceptance criterion, experiment result, or authorization.

In particular, it does not authorize a rerun merely because a previous
attempt failed.

## Duration

Remain active until the human operator explicitly revokes or replaces it.
