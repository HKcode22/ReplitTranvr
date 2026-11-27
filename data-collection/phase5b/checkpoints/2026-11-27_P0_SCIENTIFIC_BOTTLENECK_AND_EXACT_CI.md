# Nov27 P0 scientific bottleneck and exact #981 CI

## Owner-supplied audit and current production evidence

The owner-supplied Nov27 audit is consistent with the latest protected evidence already in this repository: SOURCE acquisition is producing some originals, but usable scientific output remains zero in the last independently reconciled inventory. At13:58Z the study inventory reported134 timely bindings,82 live originals,52 expired-metadata-only originals,8,307 historical member observations,0 linked/cutoff-safe PRE and0 global Packet B fragments/bundles/links. Day4 shape inspection reported18 originals/1,053 member observations; all1,053 failed native canonical identity, core scope and confirmed operating-leg checks. Those categories overlap; they are not distinct flight failures. Day5 protected read-only custody run `46065789071` later reported conditional fields ABSENT, metadata disabled, no policy install/precommit, and zero prepared queries. No evidence authorizes rewriting signed prior days or relaxing native gates.

## Highest-risk diagnosis

The immediate scientific bottleneck is eligibility and prospective commissioning between Packet A and Packet B, not retention deletion itself. Retention followed approved expiry rules. Existing native observations do not meet identity/core/operating-leg requirements, and the independent conditional path has no reviewed Day5 commitment metadata or installed policy. The required next proof remains a future-only, independently reviewed and protected commissioning preview, followed by actual cutoff-safe PRE, durable authorized Packet B, and valid separate POST/outcome evidence. A CI pass, SOURCE receipt, scheduled job, or retention success cannot substitute for those data.

## Concrete engineering change under review

PR #981 head `039a17b819f9bdde8b7881fdb9bf6c84bb613d59` includes the conditional T24 review-page correction that censors an individual member whose fresh eligibility changed rather than failing the entire page; structural custody, policy, signature and permit errors still abort. It also includes the prospective policy candidate/commitment preview path and native/conditional POST isolation. The exact code has not reached production. Targeted checks on this checkout passed: candidate/predecessor tests11/11; recovery-register/report tests10/10. No production PRE or Packet B is claimed.

## Exact CI result and release hold

PR #981 is a draft based on `main`; PR #980 remains the deployed code at `24df876fc612c0e4fdfb6f69585ed90bcc56f9b8`. Exact #981 matrix run `46067504964` ran eight callback build test files/30 cases successfully, then `scripts/v39_phase5_callback_release_v5_reviewed_build_v39.sh --verify-only` refused with `PHASE5_CALLBACK_REVIEWED_SOURCE_BUILD_HOLD`. This is the exact-source release guard: the callback-only build is pinned to `c3c3050e12c4e327f9c82c35c95f856f3c1cbd20`, and #981 changes guarded executable source after that pin. It correctly prevents claiming source-equivalent build or publishing an unreviewed callback binary. Do not change the pin, weaken the wrapper, or mark this verified until the new exact executable source/build has required independent review and deployment evidence.

`offline-safety` run `46067505444` subsequently passed in full: aggregate preflight, production build, full test suite, lint, registry/traceability/contradiction checks, boot-migration no-op/reconciliation, and disposable PG16 checks. The other non-source-build matrix jobs passed or were explicitly skipped by their no-provider/protected gates. The one red check is a source-build hold, not a production incident or scientific failure-family recurrence.

The host emitted existing nonblocking lint/deprecation annotations (unused symbols in unrelated client pages and Node20 action deprecation); the `offline-safety` conclusion remained success. This PR did not change those unrelated files.

## Required owner-side evidence

No independent scientific review decision or exact commitment metadata is present in this checkout or in the protected Day5 receipt. A generic owner GO is insufficient under the existing schema. The owner must obtain that decision from the already governed independent review process. Only then can the current protected workflow accept `run_day_index=5`, `confirm=VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER`, and that exact decision's SHA-256/base64 metadata for a no-provider preview. That preview does not install policy or sign. Separately reviewed installation/readback and the existing future-only PRE/Packet B path are still required. Until those real artifacts exist, do not fabricate approval or issue policy-install commands.

A fresh Replit read-only inventory can update counts. It cannot commission conditional policy and is not a substitute for the protected review. Reuse the audited owner script only after verifying its immutable Git blob in Replit, as already recorded in `owner/2026-11-27_day4_shape_and_storage_readonly.sh`; do not rerun the inventory merely to duplicate the13:58Z result.

## Rule cross-check

This action follows Packet A custody/expiry and approved Packet B distinction; the original16 feature dispositions and purpose-bound reference lane; f.8, signed calendar, draw, cutoff, rights, budget/STOP and20/5/6 split; canonical Amendment E actual physical gate-out; and C+D V0087 durable lease rules. Evidence does not justify changing those scientific requirements as optional. The source-build pin is a valid release guard; any later presentation change must preserve its hard production stop and never imply a verified/published build.

## CI simplification repair (Nov27)

Inspection of `.github/workflows/v39-phase0-offline.yml` found that one job invoked TypeScript, offline tests, the full suite, lint, registry, traceability, scanner, and production build individually, then invoked `npm run v39:preflight`, which reran those same checks (plus repo intake and migration checks). This was unnecessary duplicate orchestration, extended a single CI job, and hid useful diagnostic output because the aggregate runner redirected child output.

The recovery branch removes those duplicate workflow steps and keeps `npm run v39:preflight` as the single runner for that exact check set. It also changes the aggregate's child process output to inherit the Actions log, so a failed prerequisite includes its diagnostics. Fresh B0062 boot/restart/reconciliation checks, staged V0065 application only to disposable PG16, and the separate disposable-PG16 Gate3 behavior check remain intact. No check category or scientific gate is removed, and no production or provider credentials are introduced.

Local verification passed the two workflow/Phase0 regression files (24/24), `npm run v39:typecheck`, and `git diff --check`. Exact post-simplification head `fd9d029f5aa7e21bed3df7d7be7c804700c59422` passed `offline-safety` in run `46070328901` in4m07s, including the visible aggregate child output, Phase0 suite, full suite, typecheck, lint, registry, traceability, contradiction scan, production build and disposable PG16 checks. Comparison head `34f51732a63c082cfbad25a8e7753c2d2ee38684` passed run `46068955639` in8m44s with duplicate executions. Observed reduction is4m37s (about53%) between these two hosted runs; CI duration is an engineering metric, not a science outcome. Other non-source-build matrix checks on `fd9d029f` passed or were explicitly skipped by protected/provider gates. The single failure remains the separate callback source-equivalence hold documented above.

## Final exact-head status at 21:38Z

Report-only PR head `8970f5169ab774f93d6562fafdd3a0ec6b0220c8` completed offline-safety run `46070993652` successfully. Fresh bootstrap, restart no-op, durable migration history, schema reconciliation, staged V0065, aggregate Phase0 preflight, and disposable PG16 Gate3 behavior passed. Current matrix checks passed or were skipped by protected/provider gates except callback reviewed-source run `46070993556`: its eight files/30 cases passed, then the immutable source pin correctly held the build. PR #981 remains draft, unmerged and undeployed. No scientific outcome has improved: the last production inventory still has zero cutoff-safe PRE and zero Packet B. See `reports/2026-11-27_CI_DEDUP_REPAIR.txt` for exact evidence and the measured CI-only turnaround change.
