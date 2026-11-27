# Phase5B owner recovery report — November27

**Reporting and test reliability improved. Usable PRE/Packet B production has not yet improved.** Latest actual owner inventory remains134 timely bindings, zero linked PRE and zero global Phase7 fragments/bundles/links. Do not infer scientific success from green CI, source receipt or a dispatch ACK.

**59 permanent failure families:15 narrowly CLOSED,44 NOT_CLOSED.** The original13 closures are preserved. Two newly verified causes,F058 andF059, now meet their narrowly defined acceptance; none of the original44 outstanding families was closed or reopened by that decision. All six scientific P0 families and all ten complete component objectives remain outstanding.

## Evidence of difference

| Measure | Earlier evidence | Latest evidence | What it establishes |
|---|---|---|---|
| Timely original bindings |100 at09:07Z |134 at13:58Z |More acquisitions observed; causal effect of repairs is unproved |
| Source-linked PRE |0 |0 |No demonstrated improvement in usable PRE production |
| Global Packet B fragments/bundles/links |0/0/0 |0/0/0 |No durable derived storage observed |
| Same60 GitHub job logs |60 incorrectly unavailable |30 timely-original receipts/30 no-content receipts classified |Demonstrated reporting correction; no billing or PRE proof |
| Exact candidate validation |Local failures found and corrected |4616 full-suite tests passed,259 skipped; hosted PG16 passed |Tested software acceptance, not scientific collection |

[Latest owner storage inventory](2026-11-27_owner_storage_inventory.json) · [same-run visibility comparison](2026-11-27_log_visibility_comparison.json) · [exact hosted CI](2026-11-27_exact_ci_a115.json) · [all59 families, priorities and workflow evidence](2026-11-27_RECOVERY_PROGRESS.md).

## Scientific bottleneck established by actual readback

[Owner Day4 census at13:58:28Z](2026-11-27_owner_day4_native_shape.json):18 live T24 originals with1053 member observations across the reported HUB/MID_A cells. Every observation fails canonical match, confirmed-core scope and confirmed operating-leg status. All other reported shape checks pass; zero observations pass complete native shape. Counts overlap and these are not1053 distinct flights.

This updates existing F005/F027. It does not prove which original provider field is absent, establish all-flight identity, or certify cutoff/timing. Optional weather/ADSB/features are not the reported blocker. Preserve native safeguards and use the already designed, prospectively commissioned conditional tier. Do not retroactively relabel signed Day4 or reconstruct PRE/expired content.

Owner storage at13:58:30Z:134 timely bindings,82 live originals,52 expired metadata-only,8307 historical observations, zero linked/cutoff-safe PRE; global P7 fragments/bundles/links0, policy1. Day2 historical loss remains; Day3 has64 bindings,Day4 has18. Historical observations are not retained training rows.

## Completed engineering corrections

- F058/I129/T123: privately opt into gh escape-bearing log capture; fixed classifier remains sole output boundary. Actual same60 before/after comparison and exact hosted regression pass. Genuine denied logs remain unknown; raw logs and terminal controls are not published. CLOSED for reporting only.
- F059/I131/T125: callback test now requires reviewed-input equivalence as well as ancestry. Actual changed source must return exit2/HOLD. Production wrapper is unchanged, all460 original source/artifact blobs restored and verified. CLOSED for test expectation only.
- I130/T124: reproducible canonical closure/P0/evidence report rejects duplicates/count contradictions and never promotes SOURCE/CI/ACK to scientific success. F034 remains open for its broader execution-proof objective.
- F040/I132/T126: bounded read-only Day4 drain wait then one immutable #980 helper invocation. Nine shell scenarios plus exact hosted CI pass. Changed release state, unknown reads or expired window stop; a helper hold is never retried automatically. Actual cutover remains pending.
- Existing other-agent I124/T118 native census is reused. Duplicate local exploration was discarded. I125–I128 conditional admission/POST work remains intact; no competing branch or duplicate queue.

## Current release and next owner operation

Production collector main remains2b9cb404. #980 stays frozen atc4408c62 with26 required paths green. #981 remains the stacked recovery draft; exact code a11538e8 passed CI46013072497, jobs140553203789 and140553204102. The closure-documentation successor is recorded separately; a prior green run never certifies changed executable code.

Start or continue the supplied **CI → natural Day4 drain → one exact #980 cutover** command. It gates on successful exact a11538e8 CI and hash-pinned wait blobf763975a326ca2cfbf524bbe795a7e0a424a093d, waits until15:30Z/07:30Pacific and no admitted SOURCE children, then delegates to original reviewed helper1bbec6f1 once. That helper still checks exactCI, fresh STOP/tasks, all-main/relay quiet and full130minute DB-clock margin. No cancellation, sampling change, paid replay or automatic second attempt. Bounded wait expires Nov27 22:00Z/14:00Pacific.

This operation targets #980 collector/runtime bindings only. It does not merge #981, install conditional policy, or prove PRE. After actual cutover readback, inspect protected future conditional custody and complete exact prospective commissioning; then obtain independent positive PRE/Packet B and distinct POST/physical-label evidence. Do not repeat the completed Day4 census without new cause.

## Verification and safeguards

Full local and exact hosted suite:4616 passed,259 skipped,0failed. Hosted original Node group46 passed, tsx54 passed, new report/log/wait group5 passed, restricted realPG16 group4 passed. Local full recovery group31 passed; archived Linux checks46/46 passed using Bash5/GNUdate. Native macOS Bash3/BSDdate limitations were addressed with compatible tools, not altered archived scripts or skipped assertions. Automated read-only code review found no blockers; this is not independent human scientific review.

The historical implementation log is hash-frozen and byte-identical; updates are in [a separate dated addendum](../../implementation/2026-11-27_PHASE5B_RECOVERY_LOG_ADDENDUM.md). The initial append was caught by preservation tests and corrected before production. Superseded not-running PR validations46011572487/46012056185 were canceled after identity/job checks; latest exact CI was preserved. No running SOURCE/retention was canceled.

Packet A source custody/expiry, approved genuinely derived Packet B, all16 feature dispositions and purpose-bound reference lane remain distinct. Canonical E physical gate-out is not schedule revision. f.8/C+D, same-flight grouping, frozen20/5/6 split, original dates/cutoffs, rights, budget/STOP and retention are unchanged. Owner routine existing-branch integration/commit/push authorization is recorded; no repeated Git permission prompts. Replit AI Agent was not used. No production DB, provider, secret/policy or deployment mutation was performed by this repair session.
