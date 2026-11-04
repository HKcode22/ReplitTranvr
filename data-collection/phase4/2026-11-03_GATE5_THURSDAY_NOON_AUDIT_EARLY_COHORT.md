# Gate5 urgent Thursday NOON audit — new WSSS prospective cohort

**2026-11-03 19:32 PST owner correction.** Previous Friday November 6 activation was rejected as unnecessarily late. User requires independent audit **Thursday Nov 5, 2026, at 12:00 PM Pacific (20:00Z)**. Wednesday Nov 4 must include real T−24h observations. All previous Nov5 02:00Z T−24h missingness remains evidence; do not backfill or rewrite it. The Nov7 plan is superseded without deleting its original frozen source manifest/history. No vendor-runway perfection loops or repeating the source-only Nov2 paid pilot.

## Newly reviewed pre-collection sample

New and distinct cohort **WSSS_G5A_20261105_1400Z**, manifest \`GATE5_G5A_WSSS_20261105_1400Z_FROZEN_SOURCE_GRID.json\`. Service WSSS departures **Thu Nov5 14:00–15:00 UTC**, **Thu Nov5 6:00–7:00 AM Pacific**, **Thu Nov5 22:00–23:00 Singapore time**. The manifest's planned freeze is **Wed Nov4 09:00Z, Wed Nov4 01:00 AM Pacific**; reviewed code must be merged *before* that freeze, and all prospective collection must follow it. Original G5A preregistered task remains first genuinely observed provider-reported scheduled departure (not gate/runway actual), on-time T−24h/T−6h/T−90m PRE, and separately observed ≥15-minute provider-reported schedule revision by W=T+2h, otherwise UNKNOWN/CENSORED. Do not claim a label or valid PRE before a real source exists.

| Step | GitHub backups UTC | Local PST | First source collection UTC / PST; strict prearm deadline |
| --- | --- | --- | --- |
| **T−24h** | Wed Nov4 09:47,10:17,10:47,11:17Z | Wed 1:47,2:17,2:47,3:17am | **Wed 13:30Z / Wed 5:30am**, deadline Wed 12:30Z |
| **T−6h** | Thu Nov5 03:47,04:17,04:47,05:17Z | Wed 7:47,8:17,8:47,9:17pm | **Thu 07:30Z / Wed 11:30pm**, deadline Thu 06:30Z |
| **T−90m** | Thu Nov5 08:17,08:47,09:17,09:47Z | Thu 12:17,12:47,1:17,1:47am | **Thu 12:00Z / Thu 4:00am**, deadline Thu 11:00Z |
| **POST** | Thu Nov5 14:10,14:22,14:37,14:52Z | Thu 6:10,6:22,6:37,6:52am | **Thu 15:40,16:10,16:40Z / 7:40,8:10,8:40am** |
| **POST aggregate** | In owner after final fixed watermark | Thu 9:01am | Thu Nov5 17:01Z |
| **Final read-only audit** | **Thu Nov5 20:00Z** | **Thu Nov5 NOON** | Independently counts only true recorded data; provider requests zero |

POST source query is a fixed WSSS 13:00–17:00 UTC window (21:00–01:00 Singapore across local midnight), including prospective retimes. Query frame stays frozen. GitHub schedule is best effort and may arrive late, so no claim is made until actual run/job plus original paid source and PostgreSQL readback are verified.

### Safety, cost, science

- Exactly up to 3 source original slots at each of 3 horizons × one 2-unit physical FIDS request = **18 source units**. Three later 2-unit POST slots = **6 units**. **Hard 24-unit cohort cap**, account balance check, V0076 irreversible reservation before GET, V0077 atomic exact original/member binding, and database-clock prospective PRE only. All existing source writer, reader, POST ledger privileges are already configured; **do not rerun grants or migrations**.
- Four GitHub-only backups per horizon and POST, with a manual GitHub fallback confined to true eligible prearm time. No Replit timed owner, Cloudflare, Replit AI Agent, repeated provider emails, broad retry or retroactive PRE.
- Actual early source/qualified flight count, source retention age, on-time PRE, POST coverage, webhook inside/outside/unresolved, missingness/selection bias and provider billing must be **independently measured**. Source failures are unknowns, never observed negatives. Noon is the target **audit trigger**, not a claim that GitHub will run at precisely noon.
- A green PR or GitHub cron alone is *not* an observed source, full science PASS or Phase5/Phase6 authorization. Report genuine INSUFFICIENT/HOLD if critical measurements missing. Preserve original Plan f.8 and implementation log; amended G5A scientific outcome remains distinct from original wheels-off MAE.

**Implementation trace:** this document and new manifest + code/cron/regression PR, referenced from Phase4 README. Actual log and final verdict belong in [issue #293](https://github.com/HKcode22/ReplitTranvr/issues/293).

### GitHub audit schedule reliability (Nov3 after owner correction)

A single 12:00 PST GitHub cron is a single point of failure, especially after the documented missed T−24h schedule. Register **11:47 AM, 11:53 AM, 12:00 PM (primary), and 12:07 PM PST** independent no-provider, read-only audit opportunities, all after the frozen T+2h window and POST aggregate completion, and all constrained to the exact Nov5 UTC date. GitHub best-effort triggering cannot guarantee wall-clock delivery. The existing concurrency group serializes reads; each independent checkpoint is time-stamped and may post an updated count to issue #293. Multiple actual audit receipts are safer than treating a missing noon run as evidence. The designated noon trigger is preserved. No provider credits, source rights change, DB writes or additional collected cohort.
