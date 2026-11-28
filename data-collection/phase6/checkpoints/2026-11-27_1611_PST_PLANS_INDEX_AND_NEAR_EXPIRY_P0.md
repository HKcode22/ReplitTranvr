# Nov 27 16:11 PST — plan navigation repair and near-expiry F026 readback

## Source and scope

Reviewed production `main` `24df876fc612c0e4fdfb6f69585ed90bcc56f9b8`, recovery PR #981 exact head `e03ce20a9d827a7824ad23e176cd224560907f8d`, root `AGENTS.md`, `data-collection/phase5b/RUNBOOK.md`, current recovery report, permanent F/I/C/T register, priority crosswalk, adopted Nov22 freeze, Packet A/B parity audit, C+D ADR/V0087 notes and owner-supplied Nov27 audit. No protocol or science clause was changed.

## Plan-area repair

The `data-collection/plans/README.md` heading contained literal `\n` text and its links covered only historical f.8 and the proposal history. Canonical source documents for Packet A/B and C+D exist under `data-collection/phase5` and recovery evidence under `phase5b`/`phase6`, but the plans index did not expose them. Repaired README formatting, added direct navigation for f.8, A/B/C/D1/D2, adopted E versus preserved-not-adopted proposal, Packet A/B, C+D/V0087 and active recovery evidence. Added non-normative [Phase 5B/6 recovery map](../../plans/PHASE5B_PHASE6_RECOVERY_MAP_2026-11-27.md). No existing files were deleted, moved or copied. Relative-link validation: README 29 links/0 missing; map 17 links/0 missing. `git diff --check` passed.

## Current near-expiry evidence — urgent F026 follow-up, not a new family

Production retention run [46085925256](https://github.com/HKcode22/ReplitTranvr/actions/runs/46085925256), executed against exact production `main` at Nov27 16:05 PST, passed both bounded due-only retention jobs. Its primary FIDS readback reported `liveOriginals=96`, `eligibleNextHour=4`, `eligibleOriginals=0`, `hardDueOriginals=0`, `unboundLiveOriginals=0`, `objectDeletions=0`, `providerCalls=0`, `databaseWrites=0`; pre/post counts were unchanged. The independent Phase 7 readback reported zero live/due links, zero due bundles/fragments, and zero deletions. The four is a global count only; the receipt does not return identifiers, study-day/horizon attribution, member eligibility or processing state. It does not prove the four can be preserved as Packet B.

The existing bounded preparation/PRE readbacks at approximately 16:09 PST were also checked: [46086290077](https://github.com/HKcode22/ReplitTranvr/actions/runs/46086290077) returned `eligibleDayCount=0`, `missingDrawDayCount=0`, `tooLateDayCount=0`, `NO_ELIGIBLE_UNPUBLISHED_FUTURE_DAY_NO_WRITE`; existing T24/PRE enrollment workers returned their respective no-due statuses. These are not positive scientific output. They also do not join the four near-expiry originals to the signed study/eligibility funnel.

## Required owner action and safe limits

A fresh per-original, read-only production reconciliation is required now through the existing Replit PostgreSQL owner path to establish for each of the four: signed day/horizon/scope and cutoff, source expiry, member identity/eligibility, existing task/lease, cutoff-safe PRE and Packet B linkage. Keep output de-identified and metadata-only. The previously tested I120/T114 owner helper provides day/horizon counts and Day4 native-shape diagnostics but cannot enumerate or attribute the four global near-expiry records; do not claim otherwise. If no already-authorized path can complete before expiry, report that loss. Do not disable/extend retention, replay, backdate, reconstruct expired content, write to production DB, or treat raw custody as durable research preservation.

## Release and science state

#981 remains open/draft, unmerged and undeployed; its last inspected exact-head matrix passed offline-safety and other applicable non-source checks, while callback reviewed-source verification correctly holds after 8 test files/30 cases because guarded executable source differs from immutable review pin `c3c3050e12c4e327f9c82c35c95f856f3c1cbd20` (run `46071585326`). The tested code is not production. The last reconciled study inventory remains at zero cutoff-safe PRE and zero Packet B; the near-expiry readback did not change this. F005/F010/F026/F027/F029/F042 remain P0 and not closed. F026's four-item near-expiry count is recorded under the existing family, not a new incident ID.

This is additive documentation and navigation work; no provider calls, policy installations, production DB writes, retention changes, source changes, deployment, merge or new science were performed.
