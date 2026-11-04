# G5A November 4 — T−24h source persistence incident and successor-spend stop

**Recorded on November 4, 2026 after the first paid source slots.** This is an emergency **post-assignment-freeze operational safety amendment**, NOT a change of the frozen provider request grid or a scientific PASS. It must be disclosed to the independent auditor. No paid GET or production DB mutation is performed by the PR.

## Genuine measurements and unknowns

Owner's read-only production transaction at **14:46:44.522Z** verified the exact `WSSS_G5A_20261105_1400Z` cohort: 3/3 V0076 irreversible T−24h physical attempt reservations (13:30, 14:00, 14:30Z), 6 of 24 project REST units reserved, 0 V0077 original bindings, 0 cohort-normalized flight rows and 0 T−24h PRE snapshots. This is not equivalent to three verified successful HTTP requests or six actually billed provider units; billing and transport outcome are **UNKNOWN**. User's GitHub live log showed `G5A_SOURCE_NOT_PERSISTED_AFTER_RESERVED_PAID_ATTEMPT` for indices 1 and 2, with a generic redacted exception. Query 0 had no binding but its exact failure class is not established. The current GitHub source runner uses the original immutable owner identity under an audited recovery handoff. **Do not retry/erase** any of its recorded attempts. See issue #293.

## Purpose of this operational patch

The first horizon is a structural prerequisite for **this complete-three-horizon Gate 5 cohort**. A full failure of all three T−24h source slots cannot be treated as a merely small missingness percentage. Before staging a new paid T−6h/T−90m owner or POST reservation, run one limited read-only catalog/observation count of (a) V0077-bound T−24h originals and (b) genuine cutoff-safe T−24h PRE for this exact frozen manifest. If either count is zero, emit a specific **NO PROVIDER/NO NEW PAID RESERVATION** skip. A missing table, permission failure, invalid data or database disconnection fails closed. The prior V0076 receipts are immutable and kept for audit. This change does not alter existing T24 collector, provider query times, database roles or credits.

The source catch previously turned non-P4_G5 errors into uninformative `P4_G5_G5A_UNKNOWN_NO_CONTENT_LOGGED_HOLD`. For later unrelated prospectively authorized cohorts, add a narrow safe error classifier for known FIDS error codes and SQLSTATE only (five characters), without printing provider payload, SQL statement, raw exception message, token, flight identity or connection string. This *improves attribution*, but is not proof that the original problem was fixed.

## Scientific and operational consequence

The current Thu Nov5 noon independent audit should report **insufficient full three-horizon evidence**, preserving all 3 irreversible T24 reservations. It is not scientifically valid to replay T−24h after its hard cutoff. A new future frozen cohort requires a separately reviewed source-persistence correction, then prospective T−24h/T−6h/T−90m/POST with independent audit. Historical Nov7 UTC replacement remains a candidate, not automatically reactivated here. No Cloudflare, Replit timer, Replit AI Agent, raw-content log, ledger reset, provider email delay, or automatic payment action. This is a narrowly scoped budget-preservation and diagnostic change.
