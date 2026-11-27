# Phase5B recovery report — Nov27 post-#980 deployment

**Engineering reliability and evidence visibility improved; scientific output remains unproven.** The guarded #980 release is now on production main. The latest owner source/storage census (13:58Z, before cutover) showed 134 timely bindings, zero linked/cutoff-safe PRE and zero global Packet B fragments/bundles/links. The later protected Day5 read-only custody check also found zero prepared queries and no conditional policy installation. We have no positive PRE, Packet B, POST or physical-label evidence.

**59 permanent failure families:16 narrowly CLOSED,43 NOT_CLOSED.** F040 now closes only for the exact guarded #980 cutover; F058/F059 remain narrow reporting/test corrections. The other 43 open families were not closed or reopened. All six scientific P0 families and all ten complete component objectives remain outstanding. These are registered causes and gaps, not 43 newly active incidents.

## Evidence of difference

| Measure | Earlier evidence | Latest evidence | What it establishes |
|---|---|---|---|
| Timely original bindings |100 at09:07Z |134 at13:58Z |Acquisition count rose; these snapshots do not establish which repair caused it |
| Source-linked/cutoff-safe PRE |0 |0 at13:58Z; Day5 custody prepared count0 at20:46Z |No demonstrated improvement in usable PRE |
| Global Packet B fragments/bundles/links |0/0/0 at13:58Z |No later positive receipt observed |No durable derived output demonstrated |
| Same60 GitHub job logs |60 incorrectly unavailable |30 timely-original and30 no-content receipts classified |Visibility repair demonstrated; no billing/PRE proof |
| Guarded release |#980 frozen c4408c62 |Main24df876f; exact merge and both expiry jobs passed run46061597861 |Release and retention workflow ran; not a science outcome |
| Day5 conditional custody |No protected readback |Run46065789071 passed; conditional fields ABSENT, metadata disabled |Confirms missing commissioning rather than a failed policy install |
| Exact candidate validation |4,616 full-suite tests passed,259 skipped |Exact #981 head f7990b1 CI46015420628 passed both jobs |Software acceptance; no production PRE or causal accuracy proof |

[Owner storage inventory](2026-11-27_owner_storage_inventory.json) · [Day4 shape census](2026-11-27_owner_day4_native_shape.json) · [same-run log comparison](2026-11-27_log_visibility_comparison.json) · [exact hosted CI](2026-11-27_exact_ci_a115.json) · [post-cutover workflow snapshot](2026-11-27_post_cutover_workflow_evidence.json) · [all59 families and priorities](2026-11-27_RECOVERY_PROGRESS.md) · [post-cutover checkpoint](../checkpoints/2026-11-27_PHASE5B_POST980_DEPLOYMENT_AND_CUSTODY_READBACK.md) · [post-cutover register/report test](2026-11-27_POST980_FOCUSED_TESTS.txt).

## Scientific status

The Day4 native census at13:58:28Z found18 live T24 originals with1,053 member observations across the reported HUB/MID_A cells. Every observation failed canonical match, confirmed-core scope and confirmed-operating-leg checks; other reported shape checks passed. Counts overlap and are not1,053 distinct flights. This updates F005/F027, but does not identify which provider field is missing or certify all-flight identity/timing.

At13:58:30Z storage readback found134 timely bindings,82 live originals,52 expired metadata-only,8,307 historical member observations,0 linked/cutoff-safe PRE and0 global P7 fragments/bundles/links. Day2 loss remains historical and cannot be reconstructed. Do not relabel signed Day4, relax native admission, change the 16-field Packet B policy, or substitute scheduled time for actual gate-out.

At20:46:08Z protected read-only custody verified the existing base policy digests,31 reviewed plan pins, canonical native predecessor, native policy, remaining interval and public actors for the next unsigned Day5. It returned `conditionalPolicyFieldState=ABSENT`, `conditionalMetadataEnabled=false`, no installed conditional policy, no conditional precommit, and zero provider calls/database writes/GitHub writes/signatures. Day5 first request is Nov29 15:45Z; prep opens03:45Z. This is an identified commissioning gap under F027, not a new family. The first attempted diagnostic omitted required `run_day_index=5` and stopped at the pre-DB admission guard; corrected run46065789071 succeeded. Do not count that invocation error as a system failure.

## Completed engineering work

- F040/I132/T126: bounded drain wait plus one immutable #980 helper invocation passed its exact fresh guards; owner merged #980, updated reviewed pins and confirmed primary FIDS/Phase7 expiry jobs. F040 is closed narrowly for this cutover only; future overlaps still use the same guard.
- F058/I129/T123: private GitHub log capture now permits terminal escapes while the fixed classifier remains the only output boundary. Same60 comparison changed from60 unknown to30 timely-original/30 no-content. Closed for visibility only.
- F059/I131/T125: callback regression now checks reviewed executable input equivalence as well as ancestry. Production wrapper correctly holds changed inputs; historical460 blobs remain byte-identical. Closed for the obsolete test expectation only.
- I130/T124: canonical P0-first report refuses ID/count/closure contradictions and never treats CI/SOURCE/ACK as PRE or causal science.
- I124/T118 native census reused; no duplicate census. I125–I128 conditional T24 censoring/native POST separation remain exact-#981 changes. Do not infer deployment from their CI.

## Next work

1. Obtain/use the already governed independent review decision for Day5 conditional scope; create the exact commitment metadata from that decision and validate it in the protected preview. This readback supplies the hidden digest binding needed for review without disclosing policy bytes.
2. Only after that exact preview and the separately approved existing commissioning path: install/enable the future-only conditional reader under its review and read it back. Never enable paid source/POST or rewrite signed Days1–4 to make the preview pass.
3. Run the existing nonpaid conditional issuer/queue/Stage14 path for a future unsigned day and independently read committed PRE/Packet B. Treat a green job without that durable readback as incomplete.
4. Keep collecting F/I/T/C evidence in the register and dated checkpoint; maintain the fixed draw, rights, budget/STOP, original expiry, same-flight grouping and20/5/6 split.

No Replit AI Agent, owner database shell, provider, secret export, policy installation or paid replay was used in this session. The only production mutation was the owner-authorized, exact guarded #980 merge/pin/retention cutover shown in the pasted output.
