# Nov27 post-#980 deployment and prospective custody readback

## Evidence window and result

Owner ran the exact previously prepared `P5B_ONE_GUARDED_CUTOVER` command after Day4's natural SOURCE drain. The pasted output verifies the precondition CI run `46013072497` on frozen #980 head `c4408c621a84a2549355d935cca7333c5527d3c2`, latest required 26 workflow paths green. Existing guarded helper `f763975a326ca2cfbf524bbe795a7e0a424a093d` waited and invoked the original #980 helper once. The helper verified the current full-retention baseline (`46061088860`) and completed the coordinated cutover:

- #980 merged Nov27 20:08:21Z as `24df876fc612c0e4fdfb6f69585ed90bcc56f9b8`.
- Owner updated `P6_PHASE5B_RUNTIME_EXECUTABLE_SHA`, primary FIDS expiry and P7 expiry approvals to that exact main; updated the relay's approved target pin; verified the relay executable stayed `2d96b22345908aa4334335aa899aec71b2fec2cb`.
- Current-main full retention run `46061597861` completed successfully; both primary-FIDS and Phase7 expiry jobs passed (job IDs `140716925616`, `140716925394`). The supplied output gives no counts, so this checkpoint makes no deletion/count claim from that run.
- Main-side ordinary current-day preparation/enrollment and T24 workflows after deployment completed as no-due/no-task-success receipts. The T24 run `46065030200` reports no due current private T24 packets and skips queue/witness work. These are successful bounded no-provider checks, not PRE.

The production release therefore advanced and retention's exact workflow gates ran. The measured storage/science baseline is still the actual read-only owner census at13:58:30Z:134 timely bindings,82 live/52 expired-metadata-only originals,8,307 historical observations,0 linked/cutoff-safe PRE, and0 global Phase7 fragments/bundles/links. No newer positive science receipt is present in this evidence window.

## Protected Day5 conditional policy custody

The first invocation of the protected read-only workflow omitted required `run_day_index=5`; it stopped at `HOLD_P6_NONPAID_SOURCE_DAY_GITHUB_NO_EXACT_MANUAL_OR_SCHEDULE_APPROVAL` before policy/DB admission. This was an invocation error by the assistant, not a repository/runtime defect or a production incident. It is not counted as an F/T recurrence. Corrected exact owner workflow run `46065789071` completed successfully on main with `run_day_index=5` and confirmation `VERIFY_FUTURE_CONDITIONAL_POLICY_CUSTODY_NO_PROVIDER`.

The successful protected receipt at20:46:08Z reports:

- prospective Day5 genesis absent and prepared query count0; first request Nov29 15:45Z and preparation opens Nov29 03:45Z;
- existing three base policy digests and31 reviewed plan pins validate; the canonical native predecessor bytes and native policy are present and their interval covers the remaining study;
- separate conditional field state `ABSENT`, metadata read disabled, no actual conditional install and no conditional precommit;
- public actors verified; signer keys/publisher endpoint/write capability were not supplied;
- provider calls0, DB writes0, GitHub writes0, signatures0, paid GO false.

This is positive evidence that the read-only guard and its evidence reporting work, and direct evidence that conditional commissioning is not installed. It does not authorize a new policy, produce a review decision, or prove a conditional PRE. Existing F027/C001 remain open; do not fabricate metadata, enable the conditional reader, rewrite signed Days1–4, or relax native identity/physical milestones. Next: use the already governed independent prospective review decision to prepare exact reviewed commitment metadata, then run the protected preview, and follow the separately approved existing install/readback procedure only after exact preview acceptance.

## Crosswalk and engineering assessment

- **F040/I132/T126:** the narrowly scoped exact #980 cutover hold is now closed. The nine shell guards passed exact CI, and the real guarded wait/helper completed without canceling an admitted SOURCE/relay run. Future overlap still requires the same guard; this is not a general reliability guarantee.
- **F058/I129/T123 and F059/I131/T125:** prior narrow closures remain unchanged.
- **F005/F010/F026/F027/F029/F042:** all six scientific P0 families remain NOT_CLOSED. The Day4 shape result updates F005/F027; the latest policy custody result confirms the expected missing conditional installation. Day1/2 history is not repaired.
- **F034:** still open. An ACK, successful workflow or completed wake does not by itself prove worker execution.
- Packet A original custody/expiry, approved derived Packet B, the16-field mapping and separate purpose-bound reference lane, Amendment E distinct physical gate-out, C+D bounded leases, fixed draw, same-flight grouping and20/5/6 split remain unchanged. No new queue, paid replay, route change, DB migration or schema is introduced here.

## PR/CI state

PR #980 is merged. PR #981 remains a draft stacked recovery PR at `f7990b1b0c2f9ea8221dfdc7f1f2bd791de11c62`; exact run `46015420628` passed both restricted-PG16 and fixed-metadata/full-offline jobs. Production main is `24df876fc612c0e4fdfb6f69585ed90bcc56f9b8`. CI and deployment show engineering readiness of the released code and guard execution; they do not show that scientific repair is effective.

No Replit AI Agent was used. No provider call, conditional install, policy/secret export, or paid replay was part of the protected custody check. The owner-run deployment command did perform the explicitly guarded Git merge and production pin/retention coordination.
