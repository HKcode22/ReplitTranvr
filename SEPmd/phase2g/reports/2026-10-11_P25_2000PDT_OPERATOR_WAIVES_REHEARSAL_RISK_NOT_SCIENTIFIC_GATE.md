# P25 20:00 PDT — operator elects to skip 120-minute PRE-LAUNCH rehearsal (NOT a passing test)

**Prospective direction:** At approximately 19:02 America/Los_Angeles on Sunday 2026-10-11, the operator specifically instructed: **"we dont need no rehearsal lets just get the real thing done make sure we are ready and prepared and everything looks ok"**. This waives the *request to execute an additional two-hour synthetic prelaunch rehearsal before tonight's target*. It does NOT assert that P20 was completed, waive exact source/billing reconciliation, turn a synthetic callback into 120 minutes of provider uptime, or grant a paid subscription AuthRecord. This note is NOT a change to frozen protocol F.8.

## Evidence already verified
- Replit published SHA `9c8ab21e98e86bcee52de2b1bbf0f9c6c20b3e30` is the exact **tree-equal** no-content-change child of reviewed GitHub release `89c3b170e56c89dc79df61dfaddbe94116280923`, preserved on GitHub branch `phase2g-p25-reviewed-published-20261011` by direct guarded push.
- Public callback-only GET showed `prepaid_source_custody_ready=true`, correct published owner mode, route present.
- V0064 full read-only schema/constraint/trigger/retention structure `PASS_PUBLIC_SOURCE_AND_V0064_STRUCTURE_ONLY`, prior source refs 30/30.
- Actual signed external synthetic POST one flight: wrong secret 404, accepted 200, latency `1302.748ms` under 8s budget, 1 source ref/item/delivery, exact teardown, zero provider credits. Receipt SHA `ecc7ed79f706fcb59d288b158898cdfb65e27901f0ef8477a374176cad0d356d`.
- Independent operator DB postflight `PASS_SYNTHETIC_CLEANUP_HISTORICAL_ORIGINALS_PRESERVED`: test runtime 0 sessions, deliveries, items, one tombstoned synthetic ref, one LOGGED VERIFIED intent; historical 30/30 retained refs; incident30 remains unresolved, probe18 failed/censored. This was a read-only SQL result and does not repeat old-object byte verification. Prior separate independent App Storage readback confirmed 30/30 historical SHA+length in dedicated callback bucket.
- Last current provider audit (2026-10-12T00:33:13Z): 2,287 credits, 0 active billable subscriptions, 60,000 REST units; MUST recheck before new paid action.
- One new bounded 120min P25 **preparation** approved in operator conversation: prospective cap `<=500` credits (`450` reservation + `50` unsettled buffer), protected floor `>=1000`, no automatic retry.

## Risk knowingly retained by skipping P20
- True **120-minute hosted sender-emulator wall-clock continuity + fault variants R0–R11 NOT RUN**. P20 stays `SKIPPED_BY_OPERATOR_WITH_RESIDUAL_RISK`, **never** `PASS`.
- Warm, one-off 1.303-second hosted signed ACK does not measure cold-start/peak P99 10s deadline.
- Published Autoscale callback may still suffer outages; no genuinely independent provider-authenticated original-first-hop front door or signed sender attempt ledger. This was the original gap class of 260 external vs259 local credited flight-item attempts.
- 168-hour historical objects verified now, but full 168-hour autonomous retention/expiry cycle NOT time-observed. Canonical parsed JSON source storage is not literally identical to HTTP wire bytes (unless separate evidence proves otherwise).
- Actual paid watchdog's 6+6 time envelope uses `evidence:undefined` absent independent signed sender proof: healthcare GET recovery cannot establish missed original flight count. Final mismatch or uncertainty MUST censor/fail scientific run.

## Still nonwaivable for a responsibly operated paid attempt
1. Exact reviewed execution Git HEAD = published SHA `9c8ab21e...`, protected source tree hash frozen and post-publish GET/callback secret/DB live binding match. Published SHA branch exists on GitHub; do not use `main` 89c3... as an executable exact SHA.
2. Incident30 `resolved=false` blocks current paid preflight and owner. Any separately authorized **administrative containment** must keep historical `runtimeCleanupVerified=false`, no cleanup-journal, old probe failed/censored UNRESOLVED and 30 raw objects intact; do not invent verified cleanup.
3. New explicit prospective P25 project-lead scientific approval file (`PROJECT_LEAD_APPROVED_ONE_RECOVERY`) and exact hash-bound additive `artifacts/phase2g-early-pilot-yssy-p25-recovery-freeze-20261011.json`; both still absent/not approved. Any run begun without them is outside the frozen Stage-1 selection contract.
4. Gate-2 preprobe+smoke+source-protected runtime bundle with newly unused probe budget day, dated freshness, frozen 03:00–05:00 UTC time class, 120 minutes, same identity-v2 semantics, and hash-locked new AuthRecord + signed ledger approval. No title change/handwave substitutes for these.
5. Fresh independent provider inventory (zero active billable) and enough balance for reserved 500 plus protected 1000, exact owner/watchdog cleanup/settlement, 0 direct provider retries, no automatic reruns; require CLI `PASS_READY_FOR_PAID_STAGE1` at launch time.
6. At end of any actual attempt, exact authoritative external vs internal settled credit reconciliation; continuous/prospectively frozen 8*15-minute buckets, physical-flight-v2, verified original-source references and no uncensored/failed segment called scientifically complete. Missing upstream attempts must never be imputed as flights. A paid attempt, even if run, may remain **unscoreable**.

**Current verdict:** `OPERATOR_SKIP_PRELAUNCH_REHEARSAL_ACKNOWLEDGED`; `P20_COMPLETION=false`; `FINAL_F8_SCIENCE_PASS=false`; `PAID_AUTHORIZATION_ISSUED=false`; `PAID_SUBSCRIPTION_CREATED=false`; `READY_FOR_PAID_STAGE1=false`. Releasing the payment hold requires independently satisfied items 1–6, not merely this risk memo.
