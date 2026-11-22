# Phase 6 — Gate 8 only: exact final-main protected rebind and paid activation handoff

**Evidence observation:** 2026-11-22 UTC. **Scope:** fixed Gate 8; Gates 1–7 CLOSED. No new gates, no scientific calendar changes, no SOURCE re-enable, no cron recommission, no claim of paid GO.

## Actual verified prerequisites (not to replay)

- GitHub production `main` exact `dfa7221990e21deacb45fdbacbaadc64a73bc907`, merged/verified #964 with V0108 Gate 3 migration.
- SOURCE authorization already enabled by owner at ~06:11 UTC and independently read back. Its historical code SHA is correctly immutable `795ace55984b44a3d0bffa886d33a5ec11d31927`. Do **not** rerun source enable; do **not** edit the immutable singleton.
- Gate 3 V0108 actual owner installation/readbacks PASS at 10:24Z, private profile `V0108_RECOVERY_METADATA_ONLY`; existing approved primary/P7 expiry and relay target main SHA repins PASS.
- Owner-triggered no-provider exact-main retention run [45012576758](https://github.com/HKcode22/ReplitTranvr/actions/runs/45012576758), job 137177924649, attempt 1, success; primary and private expiry verify-only receipts read 0 due/deletion STOP, provider calls/writes 0. See [bounded G3 closeout](https://github.com/HKcode22/ReplitTranvr/issues/413#issuecomment-7077829527).
- Existing external cron pair 8890475/8890476, original credentials and renewal commissioned through Dec 30, MUST NOT recreate or reset.
- Frozen 31-day budget 6,144 source query opportunities, 36,740 reserved REST units, peak 1,280/day, daily 1,900 cap and protected floor 1,000. First Day1 source query **2026-11-23T23:45:00Z**, existing prearm **22:15Z** and wake **21:50Z**. These are planning times, not execution receipts.
- Prior owner exact protected 31-value policy rebind PASS for earlier target main `fe3fef5dbddc3577d585f778385677979031cd64`, final static digest `7e07047d7173cbcf84e966ab869d66477efef36df38c83c58325396f31b83728`; POST actors passed on that prior code SHA. Gate3 successor migration did **not** modify SOURCE/PRE/POST static secrets, so their exact-main code references may remain stale relative to new main. This is the current narrow G8 release-binding dependency, not a new engineering gate.

## Gate 8 executable continuation (prepared, NOT executed)

Prepared **no-provider**, evidence-bound one-use owner script [`p6_gate8_exact_final_main_static_pin_rebind_no_paid_go.sh`](p6_gate8_exact_final_main_static_pin_rebind_no_paid_go.sh), Git blob `88f9fc6c0f1537e2ecfb22dda709990aacc9b441`.

- Derives from the actual earlier owner-successful reviewed helper Git blob `a73297a35e31694466598f262912b351c1218a8f`; changes only prior and successor main pins, exact merged PR #964 identity, prior 31-value expected SHA, correct SOURCE-state-neutral receipt, and the POST step verification (uses exact GitHub job/step success because the GitHub log scrubber redacts numeric zeros).
- Must authenticate the **existing** owner private signed authorization file with SHA256 `3ae55fabcc03ac4112c7b7d07c63e2454dc3242fe3f1cafd67026722346e482c`; retrieve the exact already-reviewed prior private 31-string static bundle and POST policy from owner-private folders. No regeneration from guesses. Uses the original protected full-policy validator, exact 31-day plans/manifest/budget/cost/rights and byte-exact signing identities, validates new embedded main SHA `dfa722...` before any secret writes, rejects unknown credentials or shadowed scopes.
- Intentionally holds `V39_PHASE6_PROCESS_ARMED=0` and `V39_PHASE6_OWNER_APPROVED=0`, updating only existing approved code/policy SHA bindings in their existing target repo or `phase6-protected-runtime` environment; leaves provider/API keys, immutable SOURCE authorization, role logins, cron and GitHub public code unchanged. On uncertain partial secret writes, global paid flags stay OFF. No provider call, no live flight datum.
- Triggers the **existing** exact-main disarmed POST reviewer/publisher/storage preflight; checks all four exact job steps are completed SUCCESS on first-attempt reviewed main. Does not redo Phase 7 schema installs, SOURCE enable or a paid dry-run.

**After actual owner rebind success, and only then:** recover existing Gate8 paid activation state from live owner/secret/variable metadata and existing fresh account/STOP status; confirm original 31-day bounded signed study window and update the already-documented `rollingPaidPolicyUntilPresent`/relay policy duration only for the approved time scope. Record separate owner paid GO and enable approved paid flags only after all exact code, integrity, rights, budget, quota, private expiry and STOP controls pass. Any unverified scope remains a STOP; **never** fabricate a successful provider receipt. First verified SOURCE receipt is post-GO evidence, not a prerequisite that must be invented.

**Current status:** Gate 8 OPEN, paid GO false. No repository production-main commit, DB mutation, GitHub secret edit, provider call or dispatch resulted from preparing this evidence-branch script.
