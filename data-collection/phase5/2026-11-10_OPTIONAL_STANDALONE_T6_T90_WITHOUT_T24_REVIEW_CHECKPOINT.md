# Phase5 optional prospective T−6h/T−90m without a witnessed T−24h — engineering checkpoint

**Authored:** November 10, 2026 (PST). Branch `phase5/optin-standalone-later-pre-asof-20261110`, based on merged main `546e7e2f06ba34d7dd3d1891d2df8b8f62f8f21a`. Exact PR CI/merge status must be checked independently; no claim that this code has passed production PostgreSQL or adopted a scientific amendment.

## Why this was needed

The frozen future POST evaluator can accept >=1 genuine PRE horizon; the existing Stage14 later PRE writer and GitHub owner require the independently witnessed T−24h PRE for every subsequent T−6h/T−90m. Consequently, the system could discard a legitimate prospective later-only source if T24 was missed. The user explicitly asked to avoid overly rigid rules that unnecessarily invalidate useful observations. This implements a **separate opt-in evidence tier** rather than removing the T24 rule.

## Proposed implementation (default disabled, no paid operations)

- New pure `phase5StandaloneLaterPreWithoutT24Decision_v39.ts` differentiates (i) original T24, (ii) genuine witnessed-T24 later PRE and (iii) independently reviewed **standalone later as-of** without T24. No fallback can be claimed solely by an unchecked packet boolean; a different 64-char protocol approval digest must be supplied independently, matching the reviewed source response/native-T semantics and the explicit missing-T24 class. Wrong or conflicting witness protocol refuses.
- Existing `phase5V0079SingleBoundFlightPreWriter_v39.ts` remains unchanged for all old callers without the explicit additional approved protocol argument. The opt-in later-only branch reuses the same SERIALIZABLE transaction, prepared source query, live original, qualified flight member, native departure T, source availability, per-horizon cutoff, atomic PRE insert, post-COMMIT DB proof and nonreplay protections. It checks there is **NO T24 snapshot and NO T24 witness** for the flight; it refuses if a partial/uncertain older witness exists and verifies the source member's provider-native time matches frozen T before writing. It never creates a fake T24.
- Existing one-flight T6/T90 manual GitHub owner now supports a **distinct reviewed packet schema v2** only when separate GitHub Actions `V39_P5_STANDALONE_LATER_PRE_INDEPENDENT_APPROVED=1` and `V39_P5_STANDALONE_LATER_PRE_AMENDMENT_SHA256` exactly match the reviewed packet and its independent SHA. Original witnessed schema v1 still requires the real T24 receipt and is unchanged. Worker audit flags whether the T24 witness exists and reports honest missingness; it does not report a witnessed T24 for standalone.
- The manual workflow remains default OFF until all existing Phase5 FREEZE, lawful source rights, Phase6 GO, code SHA, packet SHA and PRE-only DB role secret gates are satisfied. This change does NOT generate signed future packets, configure release secrets, enable scheduled dispatch, or waive rights/budgets. Tests are offline admission/logic; add disposable PG16 no-T24 integration and independent protocol review before production approval.

## Key semantic distinction

A standalone T−6h PRE with valid provider original from before its own cutoff may be considered prospectively valid **as a separately labeled later-only tier**. It cannot retrospectively assert a T24 snapshot, an earlier prediction, a native operating leg, physical wheels-off, or full three-horizon coverage. A missing T24 must appear as missing in denominator reporting and in model evaluation comparisons. The independently approved primary target, experimental protocol, provider Contents/retention terms and separate rights/budget/STOP review are STILL REQUIRED.

## Validation / review checklist

- Exact-head TypeScript, Vitest and full V3.9 checks all PASS; dedicated test verifies default denial, signed v2 approval, changed source/semantics/identity denial, and T24 conflict.
- Add/verify **disposable PostgreSQL 16** transaction tests for actual no-T24 T6, absent vs partial witness, duplicate horizon, late source, selected-T mismatch, and unknown COMMIT quarantine **before final release**.
- No claims about production login commissioning: V0083 REVIEW/RESERVE roles and GitHub Actions secrets were missing at the last owner diagnostic, and PR #547 merely introduced their commissioner.
- This proposal does not silently adopt Amendment E or change original A/B/C/D1/D2. Independent science owner signs the standalone evidence tier before enabling it.

**Status:** code for review only; Phase5 FREEZE HOLD / Phase6 paid GO NO. No AeroDataBox credits, SQL production writes, changes to secret values, or live GH child dispatch from this PR.
