#!/usr/bin/env bash
# PHASE5 V2 Replit source preparation ONLY. No publish, provider, DB, paid run.
# Requires the exact observed Nov8 stale local checkout and a reviewed main.
# Verifies main before any local change, protects history and every untracked
# file with a private local backup, then attempts a Git *fast forward only*.
set -Eeuo pipefail
set +x
umask 077
hold() { printf 'HOLD_PHASE5_REPLIT_V2_SAFE_FF: %s\n' "$1" >&2; exit 2; }
command -v gh >/dev/null || hold GH_MISSING
command -v git >/dev/null || hold GIT_MISSING
command -v tar >/dev/null || hold TAR_MISSING
command -v mktemp >/dev/null || hold MKTEMP_MISSING
cd "$HOME/workspace" || hold WORKSPACE_NOT_FOUND
[[ "$(git rev-parse --show-toplevel 2>/dev/null)" == "$PWD" ]] || hold NOT_REPOSITORY_ROOT
gh auth status --hostname github.com >/dev/null 2>&1 || hold GITHUB_AUTH_MISSING
REPO='HKcode22/ReplitTranvr'
ORIGINAL_HEAD='7e34c6fdbec2e1fb488497e1bf47582755015206'
REVIEWED_MINIMUM_MAIN='2b58e3d09c307f8a3ae0d9ec256216842baf8437'
REVIEWED_EXECUTABLE_PIN='6c187d58e2b1339aace71079e27767523d8ca3ce'
BUILD='scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh'
BUILD_BLOB='259bfd635666e9253021d364e3d68a452355cacc'
BUILD_LINE='build = ["bash", "scripts/v39_phase5_callback_release_v2_reviewed_build_v39.sh"]'
[[ "$(git rev-parse HEAD)" == "$ORIGINAL_HEAD" ]] || hold LOCAL_CHECKOUT_NOT_THE_OBSERVED_ONE
[[ "$(git branch --show-current)" == 'phase5/reviewed-callback-20261107' ]] || hold LOCAL_BRANCH_CHANGED
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || hold TRACKED_OR_INDEX_DIRTY
[[ ! -f .git/MERGE_HEAD && ! -f .git/CHERRY_PICK_HEAD && ! -f .git/REBASE_HEAD ]] || hold INCOMPLETE_GIT_OPERATION
REMOTE="$(git remote get-url origin 2>/dev/null)" || hold GIT_ORIGIN_UNAVAILABLE
case "$REMOTE" in
  https://github.com/HKcode22/ReplitTranvr|https://github.com/HKcode22/ReplitTranvr.git|git@github.com:HKcode22/ReplitTranvr|git@github.com:HKcode22/ReplitTranvr.git)
    ;;
  *) hold ORIGIN_NOT_EXACT_OWNER_REPO ;;
esac
LIVE="$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" || hold MAIN_UNAVAILABLE
[[ "$LIVE" =~ ^[a-f0-9]{40}$ ]] || hold INVALID_MAIN_SHA
DESC="$(gh api "repos/$REPO/compare/$REVIEWED_MINIMUM_MAIN...$LIVE" --jq '.status')" || hold MAIN_ANCESTRY_UNPROVEN
[[ "$DESC" == 'ahead' || "$DESC" == 'identical' ]] || hold MAIN_IS_NOT_REVIEWED_DESCENDANT
DESC2="$(gh api "repos/$REPO/compare/$ORIGINAL_HEAD...$LIVE" --jq '.status')" || hold LOCAL_BRANCH_ANCESTRY_UNPROVEN
[[ "$DESC2" == 'ahead' ]] || hold MAIN_NOT_STRICT_FAST_FORWARD_OF_LOCAL
CI="$(gh api "repos/$REPO/commits/$LIVE/check-runs?per_page=100" --jq '[.check_runs[] | select(.name=="offline-safety" and .status=="completed" and .conclusion=="success")] | length')" || hold CURRENT_MAIN_CI_UNAVAILABLE
[[ "$CI" -ge 1 ]] || hold CURRENT_MAIN_SAFETY_NOT_GREEN
# gh is used as the credential helper without printing/exporting a token.
git -c credential.helper='!gh auth git-credential' fetch --no-tags origin refs/heads/main >/dev/null 2>&1 || hold SECURE_GIT_FETCH_FAILED
[[ "$(git rev-parse FETCH_HEAD)" == "$LIVE" ]] || hold FETCHED_COMMIT_NOT_GITHUB_MAIN
git merge-base --is-ancestor "$ORIGINAL_HEAD" FETCH_HEAD || hold FETCHED_HISTORY_NOT_FAST_FORWARD
git merge-base --is-ancestor "$REVIEWED_EXECUTABLE_PIN" FETCH_HEAD || hold REVIEWED_V2_SOURCE_MISSING
# Disallow later unreviewed application code, config, dependencies or build changes.
git diff --quiet "$REVIEWED_EXECUTABLE_PIN" FETCH_HEAD -- \
 client server shared package.json package-lock.json scripts/build.ts \
 vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts \
 components.json drizzle.config.ts || hold MAIN_CHANGED_PROTECTED_APPLICATION_SINCE_V2_REVIEW
[[ "$(git show "FETCH_HEAD:$BUILD" | git hash-object --stdin)" == "$BUILD_BLOB" ]] || hold V2_BUILDER_CHANGED
[[ "$(git show FETCH_HEAD:.replit | grep -Fxc "$BUILD_LINE")" -eq 1 ]] || hold V2_CONFIG_NOT_EXACT
# No unreviewed config changes relative to reviewed V2 source: only build line.
git show "$REVIEWED_EXECUTABLE_PIN:.replit" | awk \
 -v old='build = ["bash", "scripts/v39_phase5_reviewed_source_build_v39.sh"]' \
 -v new="$BUILD_LINE" \
 '$0==old {print new; edits++; next} {print} END{if(edits!=1) exit 2}' \
 | cmp -s - <(git show FETCH_HEAD:.replit) || hold UNREVIEWED_V2_DEPLOY_CONFIG
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || hold TRACKED_CHANGED_DURING_PREFLIGHT
# Backup all local-only data BEFORE modifying the checkout. Never rm/clean/reset.
BACKUP_PARENT="$HOME/.replittranvr_phase5_private_backups"
mkdir -p -m 700 "$BACKUP_PARENT" || hold BACKUP_PARENT_UNAVAILABLE
chmod 700 "$BACKUP_PARENT" || hold BACKUP_PERMISSION_ERROR
BACKUP="$(mktemp -d "$BACKUP_PARENT/receiver_v2_XXXXXXXX")" || hold BACKUP_DIR_FAILED
git bundle create "$BACKUP/original_local_git.bundle" HEAD >/dev/null 2>&1 || hold GIT_HISTORY_BACKUP_FAILED
git bundle verify "$BACKUP/original_local_git.bundle" >/dev/null 2>&1 || hold GIT_HISTORY_BACKUP_UNVERIFIED
git show HEAD:.replit > "$BACKUP/original_published_build_config.replit" || hold CONFIG_BACKUP_FAILED
git ls-files --others --exclude-standard -z > "$BACKUP/untracked_paths.nul" || hold UNTRACKED_ENUM_FAILED
if [[ -s "$BACKUP/untracked_paths.nul" ]]; then
  tar --null -cf "$BACKUP/untracked_files.tar" -T "$BACKUP/untracked_paths.nul" >/dev/null 2>&1 || hold UNTRACKED_BACKUP_FAILED
fi
# Existing working branch remains named and may safely fast-forward to reviewed main.
# Git itself aborts rather than overwriting a colliding untracked file.
echo 'PHASE5_REPLIT_V2_BACKUP_VERIFIED; BEGIN_GIT_FAST_FORWARD_ONLY_NO_PUBLISH'
git merge --ff-only FETCH_HEAD >/dev/null || hold FAST_FORWARD_REFUSED_UNTRACKED_OR_OTHER_CONFLICT
[[ "$(git rev-parse HEAD)" == "$LIVE" ]] || hold FAST_FORWARD_DID_NOT_MATCH_APPROVED_MAIN
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || hold TRACKED_CHANGED_AFTER_FAST_FORWARD
[[ "$(git hash-object "$BUILD")" == "$BUILD_BLOB" ]] || hold LOCAL_V2_BUILD_BYTES_MISMATCH
env ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 \
 bash "$BUILD" --verify-only || hold V2_CALLBACK_BUILD_SOURCE_EQUIVALENCE_FAILED
printf 'PHASE5_REPLIT_V2_REVIEWED_SOURCE_PREPARED_NOT_PUBLISHED; protected_backup=%s; exact_main=%s; provider_calls=0; db_writes=0; paid_approval_not_exercised\n' "$BACKUP" "$LIVE"
