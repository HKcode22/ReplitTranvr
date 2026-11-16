# 2026-11-15 — actual GitHub bounded handoff and Actions failure reconciliation

## Measured no-provider handoff

Owner dispatched exactly one root on main 6914d49c570c2fa7db7251631a983483ecc206ad. Verified GitHub API/job logs, same chain b6c14c670d21aa93e20ac895c9eccede, same SHA, first attempts, deadline 2026-11-16T00:41:57.253Z. UTC dates below are November 16 (November 15 Pacific).
 
| Hop | Run ID | Observed runner UTC | Parent dispatch-to-observed runner ms | Conclusion |
|---|---|---|---:|---|
| 0 | 43778939899 | 00:12:09.698 | not measured | success, next 43778961446 |
| 1 | 43778961446 | 00:12:29.189 | 18994 | success, next 43778993536 |
| 2 | 43778993536 | 00:13:47.320 | 77501 | success, terminal, no successor |

Terminal job 133012001624 explicitly emitted TERMINAL_HANDOFF_OBSERVED_NO_MORE_DISPATCH, dispatchCount 0, nextRunId null; all three receipts state zero provider calls, DB reads, DB writes, paidPhase6Go false. Root job 133011519993, successor job 133011580456. Exactly two observed automatic handoffs, not a representative P95/P99, not paid child execution proof and not an SLA. GitHub scheduled interarrival #784 findings still apply; 77.501s also indicates need for prospective prearm and measured actual end-to-end work. No blind re-dispatch or owner repeat.

## Actual development failures and current state

Bounded API snapshot of recent 100 repo runs at 00:12:11Z: 88 success, 6 skipped, 4 failure, 2 in progress. Four failures were superseded heads of #786 (ed7cdfc..., enrollment test literal) and #789 (22fe19e..., TypeScript declaration missing). Corrected #786 delivered 8/8 and merged; #789 corrected fa45e575... delivered 9/9 and merged. Earlier recent failure sample (50 returned entries, failure endpoint not a full history audit) includes #779 PRE denominator assertion, #778 early draw fixture, #773 current recovery fixture, #769 disposable POST schema permission, #763 POST observability, #762 signed POST publication, #751 T24 custody, #735 later index, #731 seed budget and #720 later PRE. Their final merged heads have respectively 6/6, 7/7, 12/12, 6/6, 6/6, 7/7, 7/7, 7/7, 6/6 and 8/8 successful PR workflow conclusions as independently rechecked. This does not prove every historical failure resolved. Latest main sample at 00:14:45Z: 74 success, 22 skipped, 4 in progress, 0 failures, newest main 2b968ce59cdef8385e8b8d272525e8354c68f0f3. Old main REST credential failure 42812031733 (Nov10) corrected by independently successful live read-only 42831851454; do not repeat commissioning. Older Phase4 operational failures remain historical evidence, not to be erased or replayed. No red runs deleted; no safeguards weakened. Skipped jobs not considered success.

After terminal, #787 SOURCE/POST 6/6 merged 441ddc73fb2c84d6ac4580b61a464cdfb57af7e8; #788 recurring expiry recovery 6/6 merged 8c46eb0882f632ff00c4e1d709cebfcda9d7dda6; #789 T24 explicit current 9/9 merged 2b968ce59cdef8385e8b8d272525e8354c68f0f3. Compared intervening main files; no overlap. No production paid trigger or DB change. Retention sentinel newly enabled but latest scheduled run 43772157163 predates enable and skipped; first genuine post-enable scheduled run still not observed.

## Current enrollment handoff implementation

Reuse the existing workflow phase6-private-later-enrollment.yml, existing T24/later signed current-day reader, original V0100 PREPARE register, database-clock calendar selection and exact V0091 registration. Separate exact workflow_dispatch input confirmations ENROLL_DUE_CURRENT_SIGNED_LATER_NO_PROVIDER or ENROLL_DUE_CURRENT_SIGNED_T24_NO_PROVIDER, no caller day selector. Both old explicit one/two-day and genuine schedule modes retained. Current dispatch uses existing enable and schedule flags, Phase6 signed/freeze/rights/STOP checks, protected policy bytes and exact signed calendar. No provider, PRE writer, witness or signer credentials in enrollment. No event spoofing or new queue/tables/roles. Tests compare original calendar and dispatch results, mixed mode, STOP, flags, policy drift, and explicit days refusal. This is routing code pending CI, not a commissioned rolling controller. Next integrate actual producer paths and bounded supervisor using measured timing and current live gates; neither forecast latency nor actual provider throughput proven. Preserve original seed and Amendment E, Phase5 FREEZE HOLD, Phase6 paid NO-GO.
