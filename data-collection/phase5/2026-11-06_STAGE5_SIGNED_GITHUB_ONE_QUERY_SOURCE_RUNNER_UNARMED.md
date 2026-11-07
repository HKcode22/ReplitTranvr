# Phase5 Stage5 — signed GitHub-only FIDS source runner, UNARMED

**Status:** code only, no paid source workflow, no installed production V0079 or dedicated role, no actual source GET and no PRE/POST. All release gates remain HOLD until owner and independent auditor sign them.

After [Stage3 staged V0079 SQL #420](https://github.com/HKcode22/ReplitTranvr/pull/420) and [Stage4 PG-backed FIDS source ports #421](https://github.com/HKcode22/ReplitTranvr/pull/421), a one-query runner is now possible *in principle*, but only under a reviewed GitHub Actions main-branch release. We deliberately do **not** add a timed or manually-dispatchable paid job in this PR.

## New code

- [Pure release admission](../../server/lib/disruption/phase5GitHubOneQueryReleaseAdmission_v39.ts) refuses any non-GitHub context, PR/fork, non-main commit, rerun, malformed GitHub run ID, mismatch to the approved 40-char source SHA, absent signed query JSON fingerprint, incomplete 31-day manifest/query/rights/release SHA chain, non-1 attempt or non-approved REST pricing, missing protected source DB URL, and reused ordinary app/PostgreSQL role.
- [Staged one-query GitHub CLI](../../scripts/v39_phase5_one_query_github_fids_source_owner_v39.ts) accepts a single GitHub-committed `data-collection/phase5/frozen/*.json` signed query envelope only. It uses the exact reserved GitHub run ID, verified V0079 source query and restricted database pool; runs the existing Stage2 one-GET source bridge with real Stage4 database ports; and emits **only safe aggregate admission/binding status**, never raw provider Content or credentials. Unknown/late source results in nonzero exit, cannot be silently called PRE. Query replay must fail on irreversible V0079 attempt state.
- [Offline tests](../../tests/phase5_github_source_one_query_release_admission_v39.test.ts) verify fail closed for local Replit Shell, fork/PR, wrong/replayed GitHub run, changed JSON/code SHA, absent rights, unapproved price, and reused app DB identity. [CI](../../.github/workflows/phase5-github-fids-source-release-guard-offline.yml) has no API key or DB URL and **never invokes the CLI**.

## What is required before invoking this CLI

1. **A fully frozen and independently reviewed science release** (selection frame, day/slot/horizon, actual local provider endpoint semantics and current unit price, lawful retention & analytic purpose, PRE source availability and missingness denominator, POST/outcome/ALERT scope); exact Plan f.8 original scientific Gate5 still HOLD and Phase5 final FREEZE has not passed.
2. **GitHub-only actual prearm:** the run ID is allocated when GitHub launches an actual owner job. A separate approved prearm must then bind this *actual* `GITHUB_RUN_ID` into the exact V0079 allowed-query row and signed source envelope **before** physical paid GET, with a bounded clock window; do not invent future job IDs or accept unknown CREATE outcomes. No such prearm/dispatcher exists in this PR.
3. **Restricted live V0079 installation and ACL**, source-only `V39_P5_SOURCE_DATABASE_URL` identity separate from ordinary DB, independently verified grants/defaults and STOP/cost-cap/reconciliation, and a genuinely signed freeze/query JSON under `data-collection/phase5/frozen`. None have been installed or approved here.
4. **Provider-specific account rights and billing:** user has given bounded paid authorization; this is not equivalent to confirmation that the grandfathered marketplace plan licenses retention/ML training or that current remaining quota equals September history. As of Nov7 updated provider Terms, record-level Content and derived work need precise rights checks. The code's `*_APPROVED=1` flags must be independently backed by a real review, not simply set for convenience.
5. **Real PRE builder** still required: the CLI creates no `clean.flight_snapshots` or other scientific PRE; an on-time source original is a necessary but insufficient step. Per-flight actual selected T/operating identity, previous provider actual-only time leakage, POST/AIRBORNE/ALERT reconciliation and independent QA are not established by this query.

## Final disposition

Stage5 is a **reproducible, fail-closed code path ready for further code review**, not proof of collection. At no point may the new runnable code be wired to a paid schedule or manual `workflow_dispatch` without signed source rights and freeze. No Replit Shell commands are needed from the owner today for this offline PR. The historical Phase2G YSSY delivery gap (#28) and original strict Phase4 Gate5 scientific HOLD (#293) remain separate.
