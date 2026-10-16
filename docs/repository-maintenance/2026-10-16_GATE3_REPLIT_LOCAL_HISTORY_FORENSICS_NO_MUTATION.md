# Gate 3 / Replit local P25 git-history reconciliation — Oct 16, 2026 PDT

**READ-ONLY INVESTIGATION / NO MUTATION.** This report is a scientific/engineering continuity record, **not** authorization to fetch, merge, reset, delete, deploy, migrate SQL, call the provider or publish.

## Source identities independently observed

| Place | SHA | Evidence |
|---|---|---|
| GitHub main | `ebdfbbf19d7d52121f0c9b3317ac1da2ad290524` | GitHub `refs/heads/main`, also Replit Shell `git ls-remote --heads origin main` |
| GitHub Gate3 integration | `35dbf30ae923673c001845ce803a5214d86e8064` | [draft PR #54](https://github.com/HKcode22/ReplitTranvr/pull/54), 4/4 no-provider CI green (see below) |
| Published Replit receiver | `f5b1347b7b9aebd6830302394ea2cc5775aedbf4` | Hosted public GET reports `HOLD_PUBLISHED_SOURCE_DIFFERS_FROM_TESTED_RELEASE` and `autoscale` |
| User's Replit local workspace | `bb44fc1d122868e20664b2c149406f99bb10cb86` | Operator Shell `git rev-parse HEAD` and `git log -1`; working tree CLEAN |
| Parent of local workspace HEAD | `65e1c8718a23b4e447aaceb2fcb58a38c2101b64` | Operator Shell `git log -1 --format=%P` |
| Local checked-out branch | `release/p25-reviewed-publish-20261012` | Operator Shell `git branch --show-current` |

Local P25 HEAD metadata: 2026-10-14T15:48:47Z, “Add phase 2g verification and summary artifacts”. The two local commit SHAs `bb44fc1d...` and `65e1c871...` currently do **not** resolve through the connected GitHub repo's commit endpoint. The named local release branch also has **no counterpart** in the current `git ls-remote --heads origin` output. This does **not** mean local source/evidence is lost; locally retained commits may never have been pushed.

**Critical subtlety:** `git branch -vv` reports `release/p25-reviewed-publish-20261012` tracking `origin/main` with “ahead 2”, but that is a comparison against the *locally cached remote-tracking ref*. Running `git ls-remote` does **not** update that cached ref. The “ahead 2” figure cannot be used as an ahead/behind count against modern GitHub main `ebdfbbf...`. A separate active worktree and several local historical backup branches were listed; do not prune them.

## Next exact operator commands (strictly read-only, no credentials)

```bash
cd ~/workspace || exit 1
echo "=== LOCAL OBJECTS / STATUS ==="
git status --porcelain=v1
git rev-parse HEAD
git rev-parse --verify refs/remotes/origin/main
git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads/release/p25-reviewed-publish-20261012
git rev-parse --is-shallow-repository
echo "=== LOCAL P25 COMMIT ANCESTRY ==="
git log -4 --format='%H %P %cI %s' HEAD
git cat-file -t bb44fc1d122868e20664b2c149406f99bb10cb86
git cat-file -t 65e1c8718a23b4e447aaceb2fcb58a38c2101b64
echo "=== LAST TWO LOCAL COMMITS (FILE SUMMARY ONLY) ==="
git show --format='%H %P %s' --stat --no-renames HEAD
git show --format='%H %P %s' --stat --no-renames HEAD^
echo "=== RELATIVE TO CACHED origin/main ONLY ==="
git rev-list --left-right --count HEAD...refs/remotes/origin/main
git merge-base HEAD refs/remotes/origin/main || true
```

This can disclose local file names, so redact confidential names if needed. Do not print remote URLs or tokens. No `git fetch/pull`, `git reset`, `git checkout/switch`, `git push`, Replit AI Agent, `git worktree prune` or publication as part of investigation.

## Proposed eventual reconciliation — future review only

1. Read back each unpublished P25 commit's *parents and changed file statistics* and determine whether local source/evidence is unique relative to available archive refs.
2. Before any future fetch/sync/ref replacement, obtain operator authorization for a recoverable preservation plan (e.g. protected backup branch plus validated out-of-workspace Git bundle). Never erase the locally unique `bb44fc1d` or `65e1c871` commit objects.
3. With backup verified, review GitHub `main` and PR54 against freshly fetched refs **on a separate scratch worktree**, without altering the active P25 branch or other checked-out worktrees. Decide explicit ancestry/cherry-pick/reconciliation based on actual Git graph, never branch-name equality.
4. Independently finish Phase3 scientific Plan/Log prospective method reconciliation and release review. Old draft PR36 cannot be naively merged after source migration.
5. Only with separate owner signoff, plan the appropriate Replit source update and published runtime parity. GitHub merge alone is **not** a Replit publish.
6. Keep `migrations/staged/V0065__phase3_gate3_prepaid_canary_owner_v39.sql` outside startup-scanned `migrations/current/`. Explicit reviewed production SQL release and source-host/data-custody verification precede provider/billing authorization.
7. Then separately review current provider balance/subscription/credit floor and exact bounded human paid AUTH. Gate3 seal remains `GATE3_PROVIDER_EXPOSURE_RELEASED_V39=false`.

## Tested engineering state versus live HOLD

Original science custody: 460/460 frozen records; additional PR36 science 47/47; PR37 qualified pilot records 11/11; no historical strict Gate2 PASS. P25 remains **231 billed / 229 received saved-credit claims, FAILED/DELIVERY_GAP**, with unknown missingness mechanism.

Original untouched Gate3 migration SQL blob `e32c45a37f79539f752a23ed948c6521e07dfdd9` is staged, **not** discovered by production boot. CI tests that exact staged file directly by `psql` against disposable `localhost:5432/v39_ci`, after production-equivalent boot tests; **never copies it into `migrations/current/`**.

On candidate `35dbf30ae923673c001845ce803a5214d86e8064`, all four no-provider GitHub checks passed: [offline/real staged PG #38981600721](https://github.com/HKcode22/ReplitTranvr/actions/runs/38981600721), [PG receiver #38981600707](https://github.com/HKcode22/ReplitTranvr/actions/runs/38981600707), [focused #38981600700](https://github.com/HKcode22/ReplitTranvr/actions/runs/38981600700) and [read-only public GET #38981600701](https://github.com/HKcode22/ReplitTranvr/actions/runs/38981600701). The fourth workflow passed by correctly reporting a **published parity HOLD**, not live GO.

**Outcome:** Gate3 offline integration verified on quoted SHA, current Replit local ancestry still unreconciled, published receiver old, production migration not authorized, paid live Gate3 NO-GO. Next starting point: the exact operator read-only Shell commands above.
