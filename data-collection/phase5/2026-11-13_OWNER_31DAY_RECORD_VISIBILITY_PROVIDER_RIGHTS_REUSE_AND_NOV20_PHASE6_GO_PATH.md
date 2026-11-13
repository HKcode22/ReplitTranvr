# Phase5→6 November 13 operator visibility + 31-day record rights review: NO paid GO

**Owner's goals clarified:** Finish/freeze Phase5 and conditionally start Phase6 no later than **Friday 2026-11-20 America/Los_Angeles**, ideally earlier if genuine safety/rights/science evidence permits; do NOT invent a GO or preselect ordinary future airports. Preserve running output, values and 31-day processing history **to the maximum legally permitted extent**. Provide a detailed human-readable operational narrative; do not confuse user visibility with provider Content rights. User explicitly approved necessary paid experiment testing, but a *new paid pilot requires its own reviewed scope, credit cap, source license, storage, owner gate and STOP*; authorization does not turn a HOLD into GO.

## Source of truth — rights work ALREADY completed (never ask subscription identity again)

- Sep 10 saved [original account evidence](../evidence/early-gates/V3.9_GATE0_ACCOUNT_EVIDENCE_20260910.json): Replit AeroDataBox API key is the owner's historical **RapidAPI legacy Team Ultra**, owner-attested $32 renewal, provider free balance verified **60,000 API units** (not license). Nov 7 free balance again confirmed 60,000-unit plan; separate 50,000-unit project ceiling, 1,830 Alert credits, no active subscriptions as of that dated reading. Do not call previous measured balances current.
- Existing [issue #300](https://github.com/HKcode22/ReplitTranvr/issues/300) and [Oct 31 rights analysis](../phase4/2026-10-31_GATE5_PROVIDER_RETENTION_NOV7_RIGHTS_REVIEW.md), actual code `phase4Gate5RetentionTermsAdmissibility_v39.ts`, `retentionMatrix_v39.ts`, `retentionExpiry_v39.ts`, `retentionDeployment_v39.ts`, `providerBlobExpiry_v39.ts` and tests already address provider terms and technical deletion. **Do not rewrite them simply to allow a requested 31 days.**
- Original Sep11 [retention-deployment evidence](../evidence/original-artifacts/other/retention-deployment-evidence-20260911.json) records current **technical** caps: raw provider content **168h** and live FIDS cache **24h**, with seven-day Neon/Replit PITR backup/recovery and UNKNOWN replicas/object/log surfaces. The evidence verdict is **BLOCKED** because a plaintext-recoverable PITR can outlast the original's stated expiry. Evidence is historical: verify current backup settings and actual recovery from UI/authorized account, do not equate historical snapshot to current fact.
- Older code explicitly treats normalized per-flight source as possibly provider **Contents**; a SQL row with copied AeroDataBox values is NOT automatically a genuine non-reconstructable **Derived Work**. Nor is a research-wide warehouse automatically a special user/business audit record.

## Exact currently published provider rule (source-checked November 13, 2026)

Official [AeroDataBox 2026-09 Terms announcement](https://aerodatabox.com/2026-09-terms-update): existing-subscriber 60-day transition ended Nov 7 subject to stated exceptions; default raw caching cap seven days; **RapidAPI Mega**, not existing Ultra by mere name, has extended caching while subscribed. [Current Terms](https://aerodatabox.com/terms) Article **5.5**: minimize Content retention, use it for the current permitted project, delete once purpose completes and no later than the greatest applicable express cap (7 days, authenticated per-response `Cache-Control: max-age`, plan-specific retention, mandatory legal retention or narrowly qualifying §5.8 categories). Article **5.6**: qualifying Derived Works can have different restrictions, but must satisfy the Terms' *non-trivial and non-reconstructable* definition. **These public rules and our historical account snapshot alone cannot prove a 31-day permission on grandfathered Ultra**. User has a working API key, which authenticates provider calls/credit balance, not necessarily the separate RapidAPI subscription's legal plan variation. Prior support messages exist and are **not** a reason to idle engineering or send repeated emails.

## What a "31-day record of everything" can honestly mean

| Data layer | Owner can inspect it | Can we keep 31 days now? |
| --- | --- | --- |
| Every job step, clock, non-sensitive request intent, endpoint category, HTTP *status*, attempt ID, selection decision, budget reservation, signed receipt digest, SHA/hash, retries, STOP, event outcome counts and completeness/NULL reason | Yes, with enhanced metadata-only operator log and current DB stage-view, not public raw data | **Candidate yes** as project-owned operational metadata **only where none of the retained fields or combinations reconstruct provider Contents**; review exact fields/row classes, access and backups before formal authorization |
| Original AeroDataBox FIDS response and raw webhook body | Private Replit/Neon reader only while its authentic, current permitted cache is live | **NOT demonstrated** for full 31 days on current Ultra. Today's code hardens live FIDS to 24h, other raw to 168h; plan-specific longer rights require actual documented evidence **and backup/PITR coverage** before changing TTL |
| SQL `flight_population` rows that copy flight-level source times/status/route data; source-specific PRE/POST/physical values | Private owner browse can show lawfully live nonexpired records when a rights-qualified viewer is later approved | **NOT automatically** 31-day Derived Work or exempt log; treatment/label joins require precise column-level classification |
| Truly computed non-reconstructable statistics, trained model parameters or sufficiently aggregated cross-observation outputs, as independently qualified | Can retain/analyze if derived-work definition and other rights/ML purpose conditions met; do not claim individual flight reconstructions | **Conditionally possible** without extending original raw retention; study scientifically may continue with safe aggregates/labels and honestly missing per-flight historical features, but do not silently destroy required training features |
| Flight identifier/reference metadata explicitly permitted under Article 5.8 | Readable private owner with project-only provenance | Only where scope/purpose/category actually fits; not a reconstruction-ready substitute for a provider dataset |
| Provider Contents in SQL backups, PITR, replicas, log captures or workflow artifacts | May remain recoverable after deleting primary; not visible simply from `pg_database_size` | Must have independent configured recoverability horizon, deletion/expiration and licensed window; do not disable PITR without safety review or call an SQL row deletion full erasure |

**Goal:** support user’s requested full 31-day record where **genuine plan/Cache-Control/custom terms** permit. Otherwise provide 31-day lawful detailed operational provenance plus owner-private recent payload browser; do not falsely advertise 31-day retention of disallowed Contents. Avoid changing the preexisting `V39_FIDS_RETENTION_HOURS` cap without separate evidence and an explicit migration/backup policy.

## First code implementation: human-readable owner read-only data-flow viewer

New `scripts/v39_phase6_owner_31day_dataflow_readonly.mjs`:
- Reuses existing `DATABASE_URL` from the Replit project and PG16 `neondb`. No Neon plugin, new project or connection string. `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` and `ROLLBACK`, `default_transaction_read_only=on`, 7.5-second per-SQL timeout.
- Emits **`RUN_START`**, then **`STAGE_START`** / **`STAGE_RESULT`** for each *actual accessible* FIDS original, population, PRE, queue, subscription, POST, webhook, airborne, consent/budget and private registry table, followed by **`RUN_SUMMARY`**. Run with `--human` to print one explanatory line per stage rather than structured JSON; omit it for machine-readable JSON. Each stage includes a plain-English explanation and counts per observed UTC day.
- Reads **only table presence, grants, schema columns, per-day count and existing technical expiry column names**. Also reports capped **real C+D PRE queue state counts** (`READY`, `CLAIMED`, `WRITE_STARTED_UNKNOWN`, `VERIFIED_ON_TIME`, `MISSED`, `QUARANTINED`) and the number of **expired provider blobs without verified primary deletion**. These are warning metrics, not proof of source-license violations or PITR/replica deletion. Never SELECTs raw payload/flight IDs, log credentials, dump private SOURCE bytes, print the URL or call the provider; no table insert/UPDATE/DELETE, no migration, no paid GO. A 31-day lookback is **not** proof that the 31 batch-day future study is signed or commenced.
- Bounded newest 1,201 eligible rows per table. Counts below cap are exact *for eligible lookback*; counts at cap explicitly mean **AT LEAST**, not precise 31-day totals. Missing table and missing SELECT permission are **UNKNOWN/ABSENT**, never silently zero. SQL errors emit only SQLSTATE and continue via per-table SAVEPOINT.
- This is a **private owner inspection tool**, not a full private provider payload viewer and **not integrated into current paid Actions**. It is the first visibility layer, not the final request. After schema and real rights, add a role-protected ephemeral paginated viewer for **lawfully unexpired** content with no public log output, and a persistent project-owned event log with proper retention/QA.

### What this viewer output means

```text
RUN_START: connected to existing neondb, real DB clock, READ ONLY
STAGE_START: SOURCE ORIGINALS — inspect source receipts
STAGE_RESULT: SOURCE ORIGINALS — sample rows by actual UTC day, count of recent originals
STAGE_START: PRE SNAPSHOTS — inspect recorded flight snapshots
STAGE_RESULT: PRE SNAPSHOTS — present/absent/access denied, sampled days and counts
...
STAGE_RESULT: POST / OUTCOMES — observed rows only, not claims of physical wheels-off
STAGE_RESULT: PROVIDER BLOB EXPIRY — metadata columns exist; cannot certify backup purge
RUN_SUMMARY: all inspected stages, source/APP content unexposed, no provider/SQL mutation
```

The above is **format illustration only**, not a claim of current real source rows. The command will report genuine current rows when the owner executes it. Follow-up stage 2 improves GitHub SOURCE/Stage14/POST workflow steps with human explanations for *reserve, GET attempted, HTTP accepted, original stored+SHA readback, member selected, PRE committed before cutoff, webhook received, POST, missing/censored, budget, STOP and incident*, using only counters/digests. The actual provider body and subject-level data remain accessible only through a separately permitted private live view, never in public Actions logs.

## Read-only Replit Shell commands (once new code is merged)

**1. Most useful: detailed source→PRE→POST database picture (no API key or provider charge):**

```bash
cd ~/workspace
node scripts/v39_phase6_owner_31day_dataflow_readonly.mjs --human
```

If that file is not in the current Replit workspace, **do not re-checkout arbitrary local main, install old migrations or assume the GitHub code is missing**. Fetch the reviewed script from exact GitHub main for local owner use only after PR merge (or use the historical `node data-collection/phase5/audits/phase5-phase6-column-observability-readonly.mjs` already present in GitHub). The correct working database URL is the existing Replit `DATABASE_URL`, never echoed. The script prints redacted stage/metadata output (safe to paste for engineering, still avoid sharing private account data).

**2. Only if a fresh account balance is needed just before paid cost review:** existing vetted `scripts/v39_phase4_account_quota_readonly_once.ts` calls precisely the documented free `GET /subscriptions/balance`, not a paid FIDS GET. Historical outputs are already recorded; repeating balance before an actual budget go/no-go is meaningful, but the result does not prove 31-day caching rights.

**3. True rights:** check the user’s **actual RapidAPI subscription Plan Terms / grandfathered terms** and existing authenticated FIDS HTTP response `Cache-Control` if available in private receipts. No unreviewed paid flight GET is needed *just to look at plan rights*. Do not print keys, full response bytes or signed agreement containing personal information into public GitHub; a redacted relevant clause, date and SHA of the actual reviewed plan can be documented.

## Working critical path to the November 20 target (not a guarantee)

- **Nov 13–14:** merge review/tested V0094 owner empty-schema prep and observability; confirm actual Replit metadata viewer; avoid redundant source/retention audits; map which storage tiers can support 31-day visibility.
- **Nov 14–16:** independent V0094 one-use installation review/readback if ready, restricted source reviewer/publisher credentials, real OWNER-private recorder and case-specific rights evidence; finish genuine 31 parent-day signed calendar and seven actual UTC budget categories and independent B0062/V0093 readback using existing accounts.
- **Nov 16–18:** private signed SOURCE registry→later-PRE shard integration, actual clock queue/Stage14/POST and webhook durability test, read-only daily live and nonpaid fault-injection; measured throughput/STOP/censor rather than perfect 3/3 records.
- **Nov 18–20:** independently assess all gates, decide **Phase5 scientific FREEZE PASS/HOLD**, then **separately** authorized small, bounded prospective paid Phase6 first-day operation if genuine license/plan/calendar/source/budget/receiver and physical-label conditions PASS. Phase6’s **31 parent-days begin with actual GO**, not in the Phase5 code-review period.

**No blind paid test now:** the user has approved legitimate future paid testing; the provider retention/backup/signer and bound Day1 release have not been certified. Finish all nonpaid technical work possible, report concrete HOLDs rather than wait for support correspondence.

## Continuity / source map

- [Overall code+gate scorecard](2026-11-13_PHASE6_FULL_READINESS_INVENTORY_V0094_OWNER_SCHEMA_ONCE_NO_GO.md) from #635, [Nov12 full Phase6 dataflow](2026-11-12_PHASE5_TO_PHASE6_END_TO_END_DATAFLOW_CODE_AND_RELEASE_GAPS_AUDIT.md) and [first-cycle target register](../plans/AMENDMENT_LINEAGE_REGISTER_A_B_C_D1_D2_E_20261109.md).
- [Old rights #300](https://github.com/HKcode22/ReplitTranvr/issues/300), [P0 packet #553](https://github.com/HKcode22/ReplitTranvr/issues/553), [Phase5 freeze #413](https://github.com/HKcode22/ReplitTranvr/issues/413), [real workflow #416](https://github.com/HKcode22/ReplitTranvr/issues/416), [receiver durability #28](https://github.com/HKcode22/ReplitTranvr/issues/28), [physical label #200](https://github.com/HKcode22/ReplitTranvr/issues/200).
- Current tested viewer PR and exact reviewed main must be independently recorded upon merge. Do not call this checkpoint proof of actual retained RAW records or legal entitlement.

**Phase5 scientific FREEZE HOLD / Phase6 paid GO NO. User-approved paid scope is recorded for a separately reviewed future action.**
