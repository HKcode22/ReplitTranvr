# Phase 5 final-core independent review handoff — NO GO until reviewer decides

This is a reviewer handoff, **not an approval** and not a request to redesign Phase 5.

## Exact inputs

- Production code baseline: `70580b3749544dfcbeff39da181b2aa42b1b4476`
- Evidence PR #877 exact head: `fde8cc5ec593978a91531d0cab38bb970386c9da`
- Closeout/reviewer PR #878 exact head at handoff creation: `76cbeddc04e3428d8308e75aacd1f4bf18a14ab7`
- Evidence ledger: **27 evidence records / 0 approvals**
- Mechanical reviewer input: `review-tools/2026-11-18_FINAL_CORE_MECHANICAL_BINDINGS_READY_NO_GO.json`
- Closure matrix: `review-tools/2026-11-19_FINAL_CORE_REVIEWER_CLOSURE_MATRIX_NO_GO.json`
- Final validator: `review-tools/p5_prepare_adopt_exact_final_core_inputs.cjs`

Do not reopen historical provider-account/subscription investigation, redesign f.8, regenerate the seed/calendar, rerun paid pilots, or create new engineering gates. Evaluate the exact evidence that already exists.

## What is already mechanical

Use the exact `draftReview` object in the mechanical input as the starting object. Do **not** manually retype its hashes or predecessor IDs.

It already binds:
- all 27 ordered predecessor evidence IDs;
- exact calendar, frame, provider-range and timing hashes;
- fresh provider account/budget evidence;
- scientific-scope review evidence;
- combined published callback + current GitHub STOP evidence;
- operational-scope review evidence.

The current GitHub STOP evidence comes from successful run 44474020044 and asserts, without printing secret plaintext, the four STOP values and all 21 collection-mode variables unset. The combined STOP artifact explicitly does not itself approve global release.

## Four substantive reviewer decisions

The reviewer must independently decide these rather than copying a recommendation:

1. **`finalPredecessorsApproved`** — whether the exact 27-record evidence set is accepted as the complete final release evidence set.
2. **`independentScientificFreezeApproved`** — whether to freeze the preserved f.8/A/B/C/D1/D2/E design. The review must preserve the T−6 conditional actual gate-out-delay primary, T−90 update, T−24 comparator, same-milestone actual-only label requirement, explicit missing/NOT_ESTIMABLE handling, and no proxy/target switch.
3. **`independentSourceUseApproved`** — whether genuine applicable source-use evidence is sufficient for the intended prospective use. If true, `sourceRightsEvidenceSha256` must be a genuine exact evidence digest already present in the approved evidence set. Owner assertion or engineering code is not a substitute.
4. **`independentOperationalReleaseApproved`** — whether the evidence is sufficient to permit the already-built **inert commissioning** sequence. This is not paid GO. Actual B0062/V0093 staging/readbacks remain downstream and the separate Phase 6 paid gates remain off.

If any judgment is not supportable, leave/return HOLD with the specific evidence deficiency rather than inventing a positive value.

## Five evidence-backed flags the reviewer still authenticates

The closure matrix documents evidence supporting these as `true`, but the reviewer must explicitly adopt them in the final file:
- `currentAccountAndBudgetApproved`
- `legacyPublishedAutoCollectVerifiedOff`
- `githubPaidDispatchFlagsVerifiedOff`
- `activeBillableSubscriptionsVerifiedZero`
- `separatePaidDispatchStillRequired`

`legacyAlertStartApproved` stays `false`; `phase6PaidGo` stays `false`.

## Reviewer-supplied fields

Supply genuine values for:
- `reviewedBy`
- `reviewedAtUtc`
- `cleanupOwner`
- `authorizationId` matching `AUTH-YYYYMMDD-[A-Z0-9]+`
- `startNotBeforeUtc`
- `expiresAtUtc`
- `accountEvidenceValidUntilUtc`

The current validator requires the review to occur before `2026-11-19T23:10:00.000Z` for this exact calendar. Do not backdate. If that prospective cutoff is missed, move the calendar prospectively under the existing design rather than fabricating a review time.

## Required output bytes

The accepted private filename is:

`reviewed-final-core-scope-decisions.json`

**Byte format matters:** the existing validator requires exactly `JSON.stringify(object)` bytes — minified canonical JSON, UTF-8, **no indentation and no trailing newline**.

A reviewer may work from the pretty mechanical workpaper, but the owner should materialize the accepted object canonically before running commissioning. Example after the reviewer has produced a reviewed object in `reviewed.json`:

```bash
node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync("reviewed.json","utf8")); fs.writeFileSync("reviewed-final-core-scope-decisions.json",JSON.stringify(x),{mode:0o600});'
```

Do not use this command to turn the unapproved draft into an approval; it only canonicalizes bytes after a genuine review.

## What happens after a valid review

The existing one-shot owner wrapper `review-tools/p5_owner_final_resume_once.sh` enters the no-replay state machine. It does not create decisions. The already-tested sequence is:

reviewed core → prepare exact AUTH → evidence-only AUTH ledger approval → adopt core → policy-binding review → exact policy bytes → private exact-byte review → static review → manifest/static install → B0062 calendar → independent readback → V0093 cost → independent readback → freeze workpaper.

After that, one genuine final Phase 5 FREEZE decision and a **separate** Phase 6 paid GO remain. The existing source-enable and paid workflow gates already implement that separation.

No provider call, production DB write, secret mutation, scheduler activation, FREEZE, or paid GO is performed by this handoff.
