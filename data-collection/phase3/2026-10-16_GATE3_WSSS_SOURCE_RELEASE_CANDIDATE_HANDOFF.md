# Phase 3 Gate 3 — one WSSS release candidate / Replit handoff (2026-10-16 PDT)

**Current status: REVIEW CANDIDATE ONLY. NOT DEPLOYED. NO PAID CREATE. NOT GATE3 PASS.** This dated note supplements, but does not erase, prior Phase 2 evidence or the PR59 continuity record.

## Actual verified staging

1. User ran an exact read-only Replit Shell inspection. Local original clean branch `release/gate3-reviewed-main-20261016` pointed to local-only `d53d4298588673b23a7ed988ef5efc269ff87fb3`. GitHub cannot retrieve that commit; do NOT delete/force-push it.
2. Published runtime /__v39/workspace-runtime GET returned PASS with published git_head `5ddf44ffb9a1667271e56304ee865b95400c63d6`, `published_deployment=true`, `prepaid_route_registered=true`, `prepaid_source_custody_ready=true`, and `retention_hours=168`. This proves healthy OLD published source, NOT the NEW release.
3. User safely fetched exact reviewed PR59 merged GitHub `main=f749e5be9ad626e4ec96a81ca02d8bfa29bf0cd8`; preserved old local-only HEAD as `backup/replit-gate3-before-pr59-20261016`, and switched a **clean** new staging branch `release/gate3-pr59-staging-20261016` to exact SHA. All three release booleans FALSE there.
4. PR59 main had four confirmed CI workflow successes before this separate release candidate. No production migration replay, provider CREATE/DELETE, live SQL write or Replit republish occurred during staging.

## This separate source-release PR (not paid authorization)

Proposed only on branch `release/gate3-source-and-watchdog-20261017`, originating from exact PR59 merged main. The three **source-only** release switches are changed from FALSE to TRUE together:

- `GATE3_PROVIDER_EXPOSURE_RELEASED_V39` (shared provider runner; Gate3 path still requires exact prearmed single source and fresh callback immediately before CREATE)
- `GATE3_INDEPENDENT_WATCHDOG_RELEASED_V39` (one WSSS operator still requires immutable AUTH/ledger approval, clean provider account, published SHA parity, fresh authenticated GitHub lease, UTC admission)
- `GATE3_WATCHDOG_LIVE_RELEASED_V39` (GitHub Actions sidecar: manual trigger only, pinned main, existing protected `phase2g-paid` environment, no CREATE ability; exact-owned DELETE possible only after full identity and AUTH proof)

The two former tests asserting the immutable FALSE switches are updated so an invalid production target or missing GitHub Actions context must fail **before I/O**. Source comments on the workflow and owner are updated to avoid falsely saying it is still hardcoded FALSE. This candidate requires green exact-head CI before any merge and a deliberate release/publish decision.

**NOT PRESENT OR APPROVED YET:** future exact UTC start, one-run WSSS Gate3 AUTH JSON, its independent SHA256 approval ledger line, protected GitHub environment secret-name/readiness review, exact published receiver release SHA, live balance/subscription inventory and prepared UUID. The release branch alone cannot authorize a paid run. No CI passing proves real callback durability.

## Safe next steps, single-flight and no overengineering

1. Verify all focused/full CI checks on this PR **exact final SHA**. Correct only a reproducible failure. Merge a reviewed source release only after that. Stay on the user's source-only staging branch until final release SHA exists.
2. Obtain user's exact desired run UTC window; freeze **one** immutable `Phase 3 / Gate 3` AUTH artifact for **WSSS/departures/<start-utc>+600s**, maxAlertCredits=50 **soft stop** and zero paid REST budget, legitimate evidence predecessor(s) already in ledger, startNotBefore at least 8 minutes before planned start, expires after final recovery and settlement. Pin the exact AUTH file SHA256 in the checked-in evidence ledger and check final Git HEAD. This step must not create any provider subscription.
3. User syncs **reviewed final SHA** into a new clean local Replit release branch **without overwriting saved local commit**, publishes that exact version using regular Replit published deployment tools / shell (NOT Replit AI Agent), and reruns strict public receiver identity parity. Never republish an unreviewed local-only tree.
4. Strict provider read-only balance >=1500 credits, protected balance floor >=1000 after soft50, 0 active CreditBased subscriptions, and API units available. Verify `phase2g-paid` environment/secret names, production V0065 already exists (DO NOT RE-APPLY).
5. At 3–8 minutes before the exact authorized UTC start: run one WSSS operator. After PREPARED UUID, manually dispatch manual independent GitHub Actions job at exact reviewed `main`, supply AUTH file/id/sha, session UUID and UTC, wait for verified ARMED heartbeat and GH RUN_ID COMMENT_ID, enter IDs to owner; CREATE never before exact UTC, never retry if ambiguous; stop at soft 50 or 600 seconds, earlier if risky or watchdog loss.
6. Independently confirm exact owned sub DELETE / provider absence, 3 stable credits reads, real signed original callback SQL+Replit Blob SHA readback, and classify strict operational acceptance and separately scientifically useful but incomplete observation accurately. Any uncertainty is HOLD/recovery, not automatic repeat/false PASS.

Safety/budget: provider does not promise a hard server-side 50-credit cap for airport-wide Alert notification sends; possible overrun acknowledged, **not** authorization for unlimited usage. No Cloudflare, no new workflow or AI Agent, no repeated Phase2 audits. User has asked for fast, proportionate work.
