# Phase 6 — AUTH and owner waiver ready; stage install and enable remain (2026-11-22)

**Disposition:** `HOLD / NO GO` until the Monday stage is installed and the enable transition
runs. `phase6PaidGo=false`.

**Written:** 2026-11-22T02:45Z.
**Live main at writing:** `f4c616885fb6aacf0e4819516dfb7c303bb259c5`.

## What changed in this continuation

1. **Created `AUTH-20261122-P6SOURCE`** (private, `~/.travnr-phase6-source-auth-20261122/auth.json`,
   mode 0600) binding the five committed release-evidence hashes. Verified locally against the
   working-tree ledger with `verifyP6SourceEnableAuthBytes` → `verified: true`.
2. **Added one `approvals` entry** to
   `data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json` with
   `artifactSha256 = 8b1e3782d95db532195e626c41c603b00f58467505f368193930617b3c7fd297`.
   Canonical JSON preserved.
3. **Recorded explicit owner risk acceptance** adopting the agent-authored reviews as the
   Gate 1 / Gate 8 basis (see `2026-11-22_owner_risk_acceptance_and_agent_review_adoption.md`).
4. **Corrected the expiry pins** from the literal `<final-main-sha>` (accidentally written) to
   the current main `f4c61688…` via `gh variable set`. They will be re-pinned after the final merge.
5. **Cleaned the malformed `<` artifact directory** and the temporary debug files.

## What is still open

- **Stage install:** the production DB is still on the Nov19 inert stage
  (`code_sha 781140c`, manifest `b2a691cb`). The Monday stage (`8adfc61a`/`cef58dcc` stage
  input) has never been installed. Gate 5 is therefore not actually complete in the DB.
- **Gate 1 inspect/apply** cannot pass until the installed stage matches the reviewed input.
- **Gate 6** policy bytes + 31 static values not installed/read back.
- **Gate 3** positive due-time deletion + backup/PITR not evidenced.
- **Gate 2** production commissioning + actual gate-out label path open.
- **Enable transition** not run; no paid call made.

## Required Replit/GitHub commands (owner-run)

Stage install (GitHub Actions, NO PROVIDER, NO PAID). Requires the restricted-writer secrets to
already be present in the repository:

```bash
gh secret set V39_P5_APPROVED_CODE_SHA --body "795ace55984b44a3d0bffa886d33a5ec11d31927"
gh secret set V39_P5_MANIFEST_SHA256 --body "a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e"
gh secret set P6_INERT_STAGE_INPUT_SHA256 --body "8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc"
# load the stage JSON into the secret from the committed file after pulling:
gh secret set P6_INERT_STAGE_INPUT_JSON < data-collection/phase5/planning/phase6-source-day-stub.json
```

Then trigger the workflow on the `795ace55` commit (the stage code). After it succeeds, run Gate 1
inspect/apply and the enable transition using the local macOS commands (those need the private
stage/policy files which live on this machine, not in Replit).

## Non-effects of this continuation

`providerCalls=0`, `databaseWrites=0` (no DB connection made for mutation), `commits=1` (this
checkpoint + ledger + waiver), `merges=0`, `scientificCalendarChanges=0`, `phase6PaidGo=false`.