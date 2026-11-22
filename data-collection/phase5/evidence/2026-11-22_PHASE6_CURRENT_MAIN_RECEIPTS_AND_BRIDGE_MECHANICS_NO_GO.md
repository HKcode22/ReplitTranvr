# Phase 6 — current-main no-provider receipts and executable-bridge mechanics (NO GO)

**2026-11-22 UTC (2026-11-21 local). Reviewed main `c6d9bc8512cb67ce7a8e11b68f9e89008bf861fb`.**
Status: `NO_GO`. No paid provider call, no production database read/write, no SOURCE enable, no
retention deletion, no secret change, no scientific-calendar change. This record adds receipts and
one precise blocker analysis; it does **not** approve any gate, policy, rights position or release.

This file deliberately lives under `data-collection/phase5/evidence/` because
`verifyP6PostStageEvidenceOnlyMainAdvance` admits only evidence paths after the commissioned Monday
stage `781140cde71af3b72376c2db9f0fdb84204a2b7c`. A checkpoint under `data-collection/phase6/`
would make that verifier HOLD for the Gate 1 / Gate 6 owner commands.

## 1. Gate 7 — three-session rolling rehearsal re-proven on current main

A fresh `ROLLING_REHEARSAL` chain was dispatched on `c6d9bc85` with
`REHEARSE_THREE_ROLLING_SESSIONS_NO_PROVIDER_NO_DB`. All three hops completed successfully and hop 2
terminated the chain.

| Hop | Run ID | Parent | Result |
|---|---|---|---|
| 0 | `44967569191` | `0` | success |
| 1 | `44967614680` | `44967569191` | success |
| 2 | `44967666546` | `44967614680` | success, terminal |

Chain `43111ca6323a75a2f05daa7fb6f6a370`, deadline `2026-11-22T01:08:00.000Z`, reviewed main
`c6d9bc8512cb67ce7a8e11b68f9e89008bf861fb`. Terminal hop 2 record:

```
status=TERMINAL_REHEARSAL_NO_MORE_DISPATCH, nextRunId=null,
lanes=8, hypotheticalDue=0 per wave, githubReads=59,
providerCalls=0, databaseReads=0, databaseWrites=0,
collectionDispatches=0, rehearsalDispatches=0, phase6PaidGo=false
```

Both observed waves were `HOLD_ROLLING_WAVE_NO_DISPATCH`. This re-proves the bounded GitHub clock
succession on the current main. It remains **not** proof of a due draw, a collection, provider
rights, or a paid release.

## 2. Gate 3 — read-only retention metadata sentinel on current main

Run `44967471927` (workflow `phase5-private-blob-retention-readonly-sentinel-no-provider.yml`,
`c6d9bc85`) completed successfully:

```
status=NO_OVERDUE_REFERENCES, total_refs=838, verified_refs=838,
unverified_refs=0, expired_unverified=0, expired_over_24h=0,
expired_over_7d=0, due_next_24h=0, unexpected_class_or_ttl=0,
lastVerifiedDeletionUtc=2026-11-14T13:13:52.727Z,
dbTimeUtc=2026-11-22T00:37:16.736Z,
primaryObjectPresenceChecked=false, backupOrPitrRetentionVerified=false,
providerCalls=0, databaseWrites=0, objectDownloads=0, objectDeletions=0
```

This re-confirms the 838-object metadata sentinel and confirms there is **no currently overdue**
reference. It does not perform a positive due-time physical deletion, does not check primary object
presence, and does not verify PITR/backup retention. Those Gate 3 surfaces remain open.

## 3. Gate 1 / Gate 2 — private transport logins on current main

Run `44967474299` (workflow `phase6-private-transport-two-login-readonly-manual.yml`,
`c6d9bc85`) completed successfully with both independent restricted logins:

```
reader:    status=P6_PRIVATE_READER_GITHUB_READONLY_PASS,
           login=phase6_private_reader_login_prod20261115,
           group=phase6_private_frozen_reader_v39,
           readOnly=true, packetRowsRead=0, providerCalls=0, databaseWrites=0
publisher: status=P6_PRIVATE_PUBLISHER_GITHUB_READONLY_PASS,
           login=phase6_private_publisher_login_prod20261115,
           group=phase6_private_frozen_publisher_v39,
           readOnly=true, packetRowsRead=0, providerCalls=0, databaseWrites=0
```

No credential rotation or regeneration was performed. This is login/ACL/read-only evidence only.

## 4. Heartbeat red runs are an honest cadence signal, not a current-main regression

The only recent failures are `Phase6 autonomous GitHub controller heartbeat (NO PROVIDER, NO GO)`:

- `44963299510` at `2026-11-21T23:45:04Z`, head `781140c`
- `44938897768` at `2026-11-21T19:03:53Z`, head `781140c`

Last success was `44921807519` on `29d93c45`. **No heartbeat run exists on `c6d9bc85` yet**, so these
failures are not a regression of current main.

The failing run reports `AUTONOMOUS_GITHUB_CONTROLLERS_NEED_ATTENTION_NO_GO` with nine stale lanes
and exactly one `activeNotifications` incident: the native `PRIMARY_FIDS_EXPIRY` lane. Its most
recent scheduled run is `44949382832` at `2026-11-21T21:01:58Z` on `781140c`, age 163 minutes against
`expectedMaxGapMinutes=60`. The observed 14-interval history has a **median gap of 425.8 minutes and a
maximum of 561 minutes**, with 14/14 intervals exceeding the expected maximum.

That is GitHub Actions cron throttling on this repository, not a code defect and not a missed
15-minute application tick. The heartbeat design is deliberate:

- collection-lane incidents are gated on `P6_HEARTBEAT_COLLECTION_EXPECTED === "true"`;
- the native primary-expiry lane is **not** suppressed when collection is not expected, so a real
  expiry-schedule gap still surfaces;
- the workflow fails only the observation run (`exitCode=2`), never a collector or paid child.

No change was made. Lowering `expectedMaxGapMinutes`, or suppressing the native lane while
collection is disarmed, would weaken a real safety signal and is a separate operational/SLA decision
for the owner, not an agent fix.

### Operational consequence: both expiry pins are stale

Repository variables `P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA` and
`P7_EXPIRY_APPROVED_MAIN_SHA` are both `781140cde71af3b72376c2db9f0fdb84204a2b7c`, while main is
`c6d9bc8512cb67ce7a8e11b68f9e89008bf861fb`. Both scheduled expiry paths therefore stop at
`SCHEDULE_APPROVED_MAIN_DRIFT` and delete nothing. That is a safe stop, not a Gate 3 closure, and it
means a future positive due-time physical deletion cannot occur until the pins move.

The code executed by the expiry workflows did not change between `781140c` and `c6d9bc85`; the diff
is evidence, `review-tools`, one handoff workflow and tests. A repin is therefore operationally safe,
but it is an owner action and was **not** performed. Sequence it after the last main merge, because
the next merge re-stales the pin:

```
gh variable set P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA --body "<current-main-sha>"
gh variable set P7_EXPIRY_APPROVED_MAIN_SHA --body "<current-main-sha>"
```

## 5. PR #937 is conflict-free but must not be merged by an agent

Branch `phase6/pre-native-status-grouped-transform-review`, head
`60d664462140daab7352c17063ad58c50f67e76c`. Merging it into `c6d9bc85` locally produced
`ec902ceba4a94bd9f64c98188a5b47ff53ae3cf2` with **no conflicts** and 17 non-evidence changed paths
versus stage `781140c`. Focused results:

```
tests/phase6_revised_stage_executable_bridge_v39.test.ts
tests/phase7_pre_policy_owner_scope_v39.test.ts
tests/phase7_reviewed_source_transformation_v39.test.ts
tests/phase7_inert_storage_commission_v39.test.ts
=> 4 files passed, 26 passed / 1 skipped

all tests/phase7_* => 17 files passed, 81 passed / 3 skipped
```

`tsc --noEmit` reports only the pre-existing `Cannot find module '@replit/object-storage'` error.

**Why it is not merged.** Any executable change after the commissioned Monday stage requires the
exact reviewed bridge, and PR #937 also changes a scientific route: field 6
`reported_pre_departure_status` moves from `categorical_dictionary` to a non-injective
`categorical_group_dictionary`. The Gate 1 matrix currently lists `categorical_dictionary` as the
candidate route for that field, so the matrix itself must be re-reviewed before any PRE policy bytes
are built. An agent-authored or synthetic `independentOperationalReleaseApproved: true` is not an
independent operational release approval and was not committed.

### Ordering consequence for Gate 1

On current main `checkPhase7NativePrePolicySupport` hard-requires
`f.kind === "categorical_dictionary"` for `reported_pre_departure_status`. A Gate 1 policy that
passes the installed code therefore has to use the transform that the PR #937 finding calls
reconstructive. Running the Gate 1 owner installer now would either fail or commission a
scientifically rejected route. The honest order is:

1. independent review and merge of the non-injective group transform (with the exact bridge),
2. re-review of the field-6 row and the 16-field matrix against the merged code,
3. build the private policy and reference bytes,
4. commit the decision and run `--inspect`, then `--apply-reviewed`.

This is why no Gate 1 command was executed in this session.

### Exact bridge-review mechanics (verified in code, not executed)

`verifyP6MondayRevisedExecutableBridge` accepts only the exact commissioned stage:

```
stageCode 781140cde71af3b72376c2db9f0fdb84204a2b7c
stageSha  a4c30369fcb52eb58da2dd12ec0ea9dabb07fe41b171f44fcb766d0408b3f682
costSha   ebf61e512a40c03e3bd3be679a83f995645b199f0bbb172f82677e9cb7976f0e
calendar  55ea0dd4b50d43af11af65a1e2910928e98a731ffa5efdeda7eee98ac451077b
```

It requires a committed review at
`data-collection/phase5/evidence/2026-11-23_phase6_revised_executable_bridge_review.json` whose
canonical JSON bytes hash to the SHA bound in the committed PRE decision. `changedBlobs` must equal
the exact stage→head non-evidence diff (17 paths for `ec902ceb`), every blob SHA must match at both
the reviewed commit and head, and **all 31 day plans must remain unchanged**. Evidence paths and the
SOURCE ledger are excluded. The review must be generated after the reviewer signs; it cannot be
pre-signed for a future commit.

## 6. What is genuinely left, and who must do it

| Gate | Remaining action | Owner-local input required |
|---|---|---|
| 1 | Independent review of all 16 PRE fields, rights, non-reconstruction and purpose; then build policy + reference bytes, commit decision, run `review-tools/p7_commission_pre_policy_owner_v39.ts --inspect` then `--apply-reviewed` | 16-field decision, reference policy, reviewer identity/time, `DATABASE_URL` |
| 2 | Independent POST policy/settlement commissioning and readback | POST policy bytes, owner DB, reviewer decision |
| 3 | Positive due-time physical deletion and non-PITR surfaces | Owner storage console, no agent access |
| 6 | Six policy bytes + 31 static values via `review-tools/p6_nov20_finalize_recovered_policies_v39.ts` | `~/.travnr-phase6-final-policies-*`, recovered files, approved Gate 8 AUTH |
| 8 | Exact SOURCE AUTH artifact + ledger approval + enable transition | Signed AUTH, owner DB, exact staged code SHA |

No gate is closed by this record. Gate 4 and Gate 5 remain DONE per the owner checkpoint. Gate 7's
rehearsal is re-proven but still depends on the remaining owner evidence. Gate 8's free-account
prearm remains PASS at `2026-11-21T14:59:51.546Z` (59,968/60,000 units, zero subscriptions); the
ledger still holds 29 evidence entries and 0 approvals.

### Gate 8 AUTH — the five release-evidence hashes are the real blocker

`verifyP6SourceEnableAuthBytes` requires `releaseActivation` to carry five SHA-256 fields and
requires each hash to equal the hash of a committed ledger `evidence` entry. Of the 29 current
entries:

| AUTH field | Current candidate | Actual status |
|---|---|---|
| `sourceRightsEvidenceSha256` | `2026-11-19_aerodatabox_bounded_published_terms_source_use_review.md` | positive bounded determination, `independentSourceUseApprovedForBoundedProfile: true` |
| `scientificFreezeEvidenceSha256` | `2026-11-18_finite_scientific_scope_review_NOT_FREEZE.json` | `TECHNICAL_SCIENTIFIC_REVIEW_COMPLETE_OWNER_OR_INDEPENDENT_ADOPTION_REQUIRED` |
| `providerAccountAndBudgetEvidenceSha256` | `2026-11-18_actual_account_compact_budget_reconciled_NOT_APPROVAL.json` | `ACTUAL_ACCOUNT_AND_CANDIDATE_ARITHMETIC_RECONCILED_NOT_SPEND_APPROVAL` |
| `publishedAndGithubStopEvidenceSha256` | `2026-11-19_published_and_github_stop_combined_review_NO_GO.json` | `PUBLISHED_CALLBACK_AND_CURRENT_GITHUB_STOP_COMBINED_REVIEW_READY_NO_GO` |
| `operationalReleaseEvidenceSha256` | the exact Monday bridge review bytes | does not exist yet |

Gate 8 is therefore not blocked by a missing flag. Four of the five hashes have no genuine positive
evidence to bind. An AUTH that bound the existing `NOT_APPROVAL` / `NO_GO` documents would be a
false attestation and was not written. The AUTH file itself may stay outside Git (it is read from
disk), but its SHA-256 must be added to the committed ledger `approvals` array.

### Exact Gate 1 invocation shape (not run)

```
node --experimental-strip-types review-tools/p7_commission_pre_policy_owner_v39.ts \
  --inspect \
  ~/.travnr-phase6-monday-<id> \
  ~/.travnr-<id>/pre-policy.json \
  ~/.travnr-<id>/reference-policy.json \
  data-collection/phase5/evidence/<decision>.json \
  <decisionSha256>
```

Preconditions enforced by the tool: clean tracked checkout with `HEAD == origin/main`; stage
directory and private files under `$HOME/.travnr-*`, mode `0700`/`0600`, single link, owned by the
caller; `new-stage-input.json`, `new-manifest.json`, `new-config.json`, `new-external.json`,
`new-timing.json` in the stage dir; the decision committed under
`data-collection/phase5/evidence/*.json`; `DATABASE_URL` as `neondb_owner` with exactly one
`sslmode`; and `--apply-reviewed` also needs
`P7_PRE_POLICY_OWNER_APPROVAL=APPLY_EXACT_REVIEWED_PRE_POLICY_AND_NARROW_EXECUTE_NO_PROVIDER`
before `2026-11-23T23:10:00Z`. At the time of this record that deadline is roughly 46 hours away.

## 7. Non-effects

`providerCalls=0`, `databaseReads=0`, `databaseWrites=0`, `objectDeletions=0`,
`githubDispatches` limited to the no-provider workflows above, `secretChanges=0`,
`scientificCalendarChanges=0`, `phase6PaidGo=false`, `phase5ScientificFreeze=false`.
