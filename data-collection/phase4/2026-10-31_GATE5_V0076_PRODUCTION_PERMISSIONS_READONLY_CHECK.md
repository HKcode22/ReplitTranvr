# Gate5 — protected production V0076 metadata-only privileges preflight

**October31/November1 2026**. Binding Plan f.8 §§5–7,16–17. Complement merged PR #307 (staged PostgreSQL physical FIDS ledger) and PR #308 (Node SERIALIZABLE postcommit guard). This task answers whether the existing GitHub protected runtime connection can technically install the staged V0076 without requiring a manual Replit shell.

## What it actually does
- GitHub on-main-push \`phase4-gate5-v0076-production-permissions-readonly.yml\` executes one bounded \`SELECT\` from \`scripts/v39_phase4_gate5_v0076_prod_permissions_readonly_actions.ts\` against the existing production runtime DB URL, using an explicit PostgreSQL **REPEATABLE READ READ ONLY** transaction and forced rollback. Output is aggregate booleans only (schema exists, USAGE/CREATE privilege, all five V0076 SQL objects present/absent/partial). It prints no role name, user, URL, credential, source bytes or flight identities.
- The workflow uses no AeroDataBox credential and no paid FIDS/Alert/subscription, no CREATE/ALTER/GRANT, and will not install V0076. All source semantics and rights remain independently uncertified, paid activation disabled.
- Positive schema CREATE permission means technical readiness **only**, not authorization to bypass licensing, produce actual-only runway outcomes or install without reviewed exact role and release.
- A missing/partial existing schema must be diagnosed and no blind reinstallation attempted. If the existing protected runtime DB lacks the CREATE permission, a separate approved narrowly privileged installer or one verified Replit command may be needed; do not request manual shell before seeing the real result.

## Still required to finish scientific Gate5
Actual future frozen cohort and 3 physically running GitHub prearms, real V0076 controlled installation and role-grants after review, AeroDataBox first selected scheduled T and per-record actual-only wheels-off (#200), subscription rights/raw/backup retention (#300), original paid FIDS full-grid source and certified persisted PRE/capture/labels + independent fresh-cohort audit (#293). Phase5 FREEZE and Phase6 GO still **HOLD**. The user's paid authorization and historic Team Ultra account details are already recorded; do not ask again.

No production source/metadata writes occur in this read-only check; Phase4 documentation only, no modification to hash-locked Implementation Log.
