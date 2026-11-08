# 2026-11-08 — V0083 single-line Replit owner handoff and verified account continuity

## The immediate operational defect
The user twice pasted only the middle of a 167-line owner Bash heredoc into Replit Shell, causing `bash: syntax error near unexpected token '(';` JavaScript `!x` history expansion, and an interactive `>` prompt. These are **shell transport/paste failures**, not evidence that PostgreSQL installed V0083. Run `Ctrl+C` if still at the `>` continuation prompt.

**Resolution:** `scripts/phase5_v0083_replit_single_line_owner_once.sh` is an immutable Git-blob-fetchable script, delivered with a **single Shell command** from a fixed Git blob ID (insert exact reviewed blob after PR merge). No 167-line manual paste. Its own Bash `pipefail`/error traps and owner's existing guarded V0083 installer provide refusal, ambiguity quarantine and second PostgreSQL readback. Only execute after CI passes at the exact new main commit.

This wrapper is not a new database migration and does not run a provider GET or Alert call. It checks:
- live `main` is a descendant of reviewed PR #476 SHA `49989d0e87c85fe9c92bae0dcda09be2cebf728e`, and current main has both `offline-safety` and `atomic-other-rest-ddl-and-role-acl` SUCCESS;
- pinned installer blob `35b6cbeee37b31e86a56ad42c3752be411f97646` and staged V0083 SQL blob `a5e1e9df39ec9b436f0576245f375985a69a3b71` remain unchanged; raw script/SQL fetched by immutable Git blob ID and hash-checked;
- `neondb` PostgreSQL16 writable primary has V0082 installed and V0083 absent; original installer checks full V0079–V0082 prerequisites, all five existing NOLOGIN roles, no source/budget rows, NOLOGIN-only new grants and one transaction;
- after successful commit, a second connection verifies the two empty new V0083 tables, two NOLOGIN roles and isolated `INSERT`/`EXECUTE` permissions;
- **NO** provider call, Alert SEND, Phase6 authorization or paid activation.

If any `HOLD` or `REFUSED`, do not blindly repeat an ambiguous operation. Provide sanitized Shell stdout. The only valid owner terminal marker is `V0083_OWNER_VERIFIED_INSTALLED_NO_PROVIDER_CALL; DO_NOT_RUN_AGAIN`.

## Known AeroDataBox facts — do not repeat discovery

`data-collection/evidence/early-gates/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json` records grandfathered RapidAPI Team Ultra ($32 historical renewal), Sept 2026 60,000 API units and initial 2,900 Alert credits. Existing account issue #300 comment [Nov 7 owner live free readback](https://github.com/HKcode22/ReplitTranvr/issues/300#issuecomment-6705065125) reports **59,968 / 60,000 REST units remaining, 1,830 Alert credits, zero active subscriptions** on 2026-11-07 09:00Z, not a guessed current balance. Account-specific current normalized per-flight Contents/ML-use/backup retention and current HTTP cache evidence are *separate unresolved legal predicates*, not an unreported subscription identity. Existing support inquiries sent; do not email repeatedly.

V0079–V0082 are already reported installed by the owner, with SOURCE/PREPARE/PRE/T24 witness credentials commissioned and independently live GitHub verified. Do not reinstall any previous migration or worker.

## What remains after V0083
1. Scientifically and legally admissible first-cycle provider observable outcome and per-content-class retention policy (proposed Amendment D not yet adopted).
2. Real executable 31 batch-day 4-airport calendar and measured 7 REST-category, separate Alert budgets; select airports in time for T−24h.
3. End-to-end GitHub real source original → on-time T24/T6/T90 PRE and independent witness → POST, legitimate identity/receiver safety; reuse Nov6 pilot where it proves narrow schedule-revision technical behavior.
4. **One** independent Phase5 FREEZE verdict with dated evidence and separate Phase6 paid GO. Engineering can proceed without repeating known provider/account research.