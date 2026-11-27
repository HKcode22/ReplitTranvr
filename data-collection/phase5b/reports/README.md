# Recovery reports — November 27, 2026

**45 of 58 failure families remain NOT_CLOSED. The available evidence does not demonstrate improved scientific collection or predictive accuracy.** The 13 CLOSED entries are narrowly evidenced corrections; they do not close all ten components or any P0 scientific family.

Start with [the full progress report](2026-11-27_RECOVERY_PROGRESS.md): all 45 open IDs, six P0 priorities, required next evidence, preserved closures and linked workflow sample. Its closure source is the [exact snapshot](2026-11-27_closure_snapshot.json) read from #981 the integrated #981 candidate; the original register remains canonical. Existing remote work through fb346f15 was fast-forwarded without overwriting another agent. F058 is the newly confirmed CLI reporting cause, I129/T123 its correction; I130/T124 supplies this report. The increase from44 to45 open IDs is explicit new-cause registration, not reopening a closed failure.

## What is happening

At 05:40 Pacific, the latest 100 repository workflows contained 35 current-main SOURCE children: 20 running, two queued, seven successful and six failed. This is a workflow sample, not the full experiment denominator. Production main remains `2b9cb404`. #980 remains a separate frozen draft candidate at `c4408c62`; #981 is staged follow-on work, not deployed fixes. Active work and independent retention are preserved.

Last actual owner inventory at 01:07 Pacific: 100 timely bindings, 52 expired Day2 originals / 4,902 historical observations, 48 live Day3 originals / 2,000 observations, zero source-linked PRE, and zero global Phase7 fragments/bundles/links. These are dated counts, not a fresh database read. Newer SOURCE job logs report saved originals followed by zero eligible native candidates; other jobs report no content. Neither green CI nor a successful parent dispatch proves a useful retained training row.

## Concrete defect found and repaired locally

The existing GitHub audit classified **all 64 inspected terminal child logs as unavailable**. Reproducing one actual successful run showed `gh api` refusing terminal escape sequences before returning any log bytes. Capturing the same log with `--allow-escape-sequences` returned 78,990 bytes and 13 fixed diagnostic markers. The patch adds that option only to the privately captured job-log GET; the existing classifier still emits only allowlisted diagnostics, never raw logs or terminal controls. Genuine permission/log failures remain unknown, not successful collection.

[Before repair evidence](2026-11-27_source_receipt_audit.json) and [after repair evidence](2026-11-27_source_receipt_audit_after_cli_fix.json) retain the explicit false billing/PRE verification flags. This is a visibility correction, not evidence that collection improved. After the fix, the bounded audit classified 64 selected terminal runs: 32 reported timely originals and 32 reported HTTP no-content, with zero unavailable-log classifications. Four older terminal runs were omitted by the existing 64-run bound; 18 were still active at metadata read. The [same-run comparison](2026-11-27_log_visibility_comparison.json) avoids treating the moving sample as a collection experiment. The real-process regression first failed with `PAID_STEP_LOG_UNAVAILABLE_OR_NO_DIAGNOSTIC`, then passed for both readable escape-bearing logs and genuine log denial.

The independent native-shape census built during the initial local exploration was discarded during integration because another agent had already implemented the stronger I124/T118 census. Reuse `v39_phase5b_retention_p7_inventory_owner.mjs --native-shape-day=4`; exact immutable script blob ee80cdf0a299ecf9203a93f66a40a0f4bbe628dc passed real PG16 CI46002504853. [Single owner command](../owner/2026-11-27_day4_shape_and_storage_readonly.sh) obtains Day4 rejection counts and fresh storage inventory in read-only transactions. Await actual owner results before diagnosing which production identity field failed. No duplicate census or producer was published.

## Priorities and rules

1. Preserve running SOURCE children. Deploy exact reviewed #980 only through the existing owner helper after its fresh STOP/task/quiet/full-130-minute checks pass. Do not repeatedly request the helper while the known active hold remains.
2. Read actual protected prospective conditional policy custody after that deployment, reuse the existing signed design and prior accepted technical review, and commission only the exact reviewed future scope. Do not repeat completed Gate1/5/6 work or infer protected policies are missing from absence of local directories.
3. Prove positive cutoff-safe PRE and its independent durable Packet B readback. Then prove distinct POST and genuine same-leg physical outcome evidence. F005/F027/F029 remain open until those observations exist.
4. Preserve F010/F026 historical losses; improve prospective prevention without replay, fabricated PRE or a changed study calendar. Day1 is Nov23 Pacific. Prelaunch failures remain regression history, not paid-study losses.
5. Optional weather, ADS-B and missing feature values do not determine base snapshot existence (f.8 §5 and canonical E). No blanket rule weakening is needed. Existing source rights, original cutoff, signed scope, spend/STOP, retention, identity and chronological split remain essential.

Packet A is operational source custody under its source-specific expiry. Packet B requires genuinely derived, approved, non-reconstructable research release; neither copied raw fields nor expired binding metadata establish it. The 16 features and purpose-bound reference identifier lane remain distinct. Conditional schedule revision is not actual physical gate-out. Nov22 freeze and accepted owner-delegated review remain adopted; no new scientific approval gate is introduced here.

## Verification and publication limits

[Verification record](2026-11-27_VERIFICATION.txt) and [focused tests](2026-11-27_FOCUSED_TESTS.txt) distinguish local verification from exact CI. The actual CLI correction recovered classifications without claiming positive PRE. Existing I124 PG16 is reused, not recreated. Existing source worker and retention execution remains intact; #980 is not modified or merged by this reporting repair.

Owner explicitly authorized integration, commit and push to existing #981 and standing routine repository recovery operations. No further approval is needed for those operations; replit.md and AGENTS.md record the instruction. Production merge still uses the exact reviewed helper's actual guards. No Replit AI Agent, provider/paid call, production DB write, secret installation, replay, scientific redesign, expiry extension or deployment mutation is part of this patch.
