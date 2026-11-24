# 2026-11-24 01:31 PST — Day1 signed publication closed; paid resume boundary

Production main 9c9cddb1aaeb04934d94af2937ee158e6d991f6c; relay c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed. No main changes for documentation.

## Closed, do not replay
- PR965 merged, full current-main CI run 45361171504 passed; repository 31-value successor 45361485190 passed.
- V0109/V0110 atomic owner commit and readback 09:17:57Z; binder/exception and three scoped reads true, no forbidden writes, Day2 4 draws and 384-unit parent preserved.
- New-main retention 45363782780 jobs 138340177359 and 138340176648 succeeded; actual primary/private due-at-readback cleared and P7 independent due-only readback, no due rows. Relay 45364058705 deferred because recent primary sweep, not drift.
- Initial Day1 protected job 138340452609 refused Stage9 because three old direct INSERT permissions existed on cycle/day/UTC charge budget ledgers. Owner repair at 09:26:44Z revoked exactly those three grants; 09:26:47Z census forbidden=[], required qi/pi/binder/exception=true, d1=4,d2=4,d2budget=1, no physical/REST/STOP. No regrant or replay.
- Actual protected run 45365270869 job 138345251907 at 09:30:38Z returned SOURCE_DAY_SIGNED_PUBLISHED_AND_READ_BACK_NO_PAID_GO, preparedLedgerInserts=256, verifiedPreparedQueryCount=128, verifiedQueryCount=128, insertedQueryCount=128 (leading 1 masked by Actions), insertedRegistryCount=7, insertedDailyReviewRow=0 (reused signed review), expiredShardCount=0, queryCountTooLateForNormalParentLeadAtRead=0, providerCalls=0, githubDispatches=0. Exact 128-scope guard in runtime plus matching 256 prepared ledger inserts corroborate masked count. No re-publication, no redraw. Day1 T24 remains missing.

## Only remaining operational work
- Restore independent nonpaid source schedule (paused for migration); Day2 normal prep opens Nov24 07:45 PST, cutoff 19:25 PST, first SOURCE 19:45 PST. Day1 T6 09:45–13:30 and T90 14:15–18:00.
- Current-main protected POST actor preflight while both paid controls remain OFF (existing workflow, four exact steps); current Day1 successful protected nonpaid preparation proves its own effective policy and storage, not all paid actor gates. Reuse existing free account check, signed cycle cap 36740, daily 1900, alert floor 1000.
- Historic direct 45339488814 exact two nonpaid ACKs were already reconciled by owner per 22:25 checkpoint; 45340234922 returned pre-POST HOLD, no dispatch, complete negative history later confirmed. Preserve old epoch ledger, do not rerun historic helpers pinned to c8. New main requires a separately recorded forward controller activation after settled histories, current effective runtime proofs, owner paid resumption and explicit no-replay safeguards. Old G13 one-use marker and original cutoff not to be reset or replayed.
- Original daily policy standaloneNoT24ProtocolConfigured=false per 45339392661. SOURCE publication does not imply Day1 individual PRE eligibility or scientific label. No backfill, do not weaken cutoff/standalone rules; report missing PRE if protocol not already authorized. Actual paid SOURCE, PRE and POST receipts still outstanding.

No paid provider calls or production writes by this documentation update.
