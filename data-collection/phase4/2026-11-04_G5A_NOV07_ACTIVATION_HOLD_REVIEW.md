# Gate5 — Nov7 WSSS GitHub-only live-activation candidate, NOT authorized to merge

**Date Nov4 2026. This branch is unmerged, so its three future paid schedules are not active.** This PR builds on merged inert Nov7 candidate #393. It adds **three** matching GitHub workflow files: source owner (12 UTC scheduled backups), POST (four), and independent READ ONLY audit (four), plus a static no-provider test that requires exact workflow identities, source/POST/audit module paths and cron alignment. The old Nov5 workflow and historical 3 V0076 reservations remain untouched.

### Frozen distinct future cohort

WSSS departures `2026-11-07T02:00:00Z`–`03:00Z` = Fri Nov6 18:00–19:00 PST, based on previously frozen `GATE5_G5A_WSSS_20261107_FROZEN_SOURCE_GRID.json`. This has its own immutable SHA, unique owner/query digests, unique POST reservation UUID namespace and review intent; **never retroactively reuse** old Nov5 T24 or its paid attempts.

- T24 GH prearms Thu Nov5 **13:47,14:17,14:47,15:17 PST** (21:47/22:17/22:47/23:17Z), first real provider slot Thu **17:30 PST** (Nov6 01:30Z).
- T6 GH prearms Fri Nov6 07:47/08:17/08:47/09:17 PST, first source Fri **11:30 PST** (19:30Z).
- T90 GH prearms Fri Nov6 12:17/12:47/13:17/13:47 PST, first source Fri **16:00 PST** (Nov7 00:00Z).
- POST GH prearms Fri Nov6 18:10/18:22/18:37/18:52 PST, one bounded source attempt per 19:40/20:10/20:40 PST slot (Nov7 03:40/04:10/04:40Z).
- No-provider independent audit Fri Nov6 **21:12/21:18/21:24/21:30 PST** (Nov7 05:12/05:18/05:24/05:30Z).
- Source 9×2 = max 18 FIDS units and POST 3×2 = max 6: **24 units in this distinct cohort**, in addition to six reserved on prior failed cohort; actual provider billing must be measured independently. No paid retries within a slot.

### Auditor role correction required before activation

The latest protected GitHub read-only run #41950001280 confirms the source writer has membership, POST ledger SELECT/INSERT and reservation-function EXECUTE; that part is no longer a blocker. But the old independent `GATE05_AUTOMATION_DATABASE_URL` role can CREATE schemas/databases. That is excessive privilege for the final independent reviewer. The new Nov7 audit script/workflow **rejects the old secret entirely** and requires a separately reviewed, non-admin reader `p4_g5_g5a_nov07_readonly_20261105` through protected secret `P4_G5_G5A_NOV07_AUDIT_DATABASE_URL` (setup and manual-only no-provider verification in PR #398). This activation PR must remain UNMERGED until the owner installs the new reader and GitHub independent-readonly role audit proves no schema/DB creation and zero table mutation grants.

## MUST remain HOLD / unmerged unless

1. **Source writer completed:** the owner installed the narrow membership grant, and authenticated protected GitHub runs #41947550977 and #41950001280 verify both trigger permissions, ID sequences, POST ledger and immutable reserve function. Independently scope the new Nov7 **non-DDL auditor reader** as described above before this PR can merge. No inference of genuine provider HTTP success from role catalogs.
2. All exact-head CI tests, including future cron/date/intent alignment and no-provider source/POST/audit offline checks, complete successfully. A new source error cannot be hidden by a generic green scientific conclusion.
3. The owner explicitly retains bounded paid review authority, lawful provider data-use/retention limitations and no backfill/missingness standards. Provider original success and actual billing remain unverified for this future cohort.
4. No other live same-cohort owner or conflicting new 24-unit budget is active; original Nov5 cohort T24 is scientifically missing, and its future T6/T90/POST must continue to skip paid spending.
5. Activation must precede the future **scheduled first T24 prearm Thu Nov5 13:47 PST** to avoid another missed GitHub window. The hard verified T24 owner prearm deadline is **Nov6 00:30Z = Thu Nov5 16:30 PST**. Never falsify GitHub job start or backfill.

This is a **review-stage proposal**, not a successful paid booking, collection or scientific PASS. Retain Thu Nov5 noon PST original-cohort independent audit as an honest INSUFFICIENT/HOLD. No Cloudflare, Replit AI Agent or timed Replit source collection.