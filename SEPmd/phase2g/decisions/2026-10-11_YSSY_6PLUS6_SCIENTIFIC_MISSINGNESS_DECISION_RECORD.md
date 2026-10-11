# PERMANENT DECISION RECORD — YSSY 6+6, scientifically honest partial observations, and zero-cost recovery

Recorded Oct 11 2026 UTC / Oct 10 PDT. **Status: user-approved RESEARCH DIRECTION; NOT an approved live paid-science amendment, and NOT permission to revise historical censored/failed runs.**

Continuity: [P01–P20 ledger](../reports/2026-10-10_P01_P20_SUNDAY_YSSY_RELEASE_LEDGER_AND_ZERO_CREDIT_COMMANDS.md), [F.8 frozen original plan](../../V3.9_DataCollectPlan_f.8.md), [implementation log](../../V3.9_IMPLEMENTATION_LOG.md), [30s-versus-3min science report](../reports/2026-10-10_P17_30SEC_VS_3MIN_NOT_AUTOMATIC_REJECTION_SENSITIVITY.md), [Replit-only backup pivot](../reports/2026-10-10_P09_P15_P20_REPLIT_ONLY_POSTGRES_BACKUP_PIVOT_NO_CLOUDFLARE.md), [amendment draft](../amendments/DRAFT_2026-10-10_YSSY_POST_P2G24_BOUNDED_TECHNICAL_RECOVERY_PROPOSAL.md), [issue #28](https://github.com/HKcode22/ReplitTranvr/issues/28), [draft PR #27](https://github.com/HKcode22/ReplitTranvr/pull/27).

## What the operator and assistant agreed

We will NOT demand absolute perfection or categorically throw away validated flight observations because of a transient Replit GET health failure. We WILL reduce preventable failures, audit what genuinely arrived, quantify uncertainty and possible missing-not-at-random selection, bound scientific conclusions and report limitations instead of claiming an unearned complete sample. A 30-second outage could hide an unusually delayed flight just as a 3-minute outage could. Thus **30s cannot be declared automatically safe and 180s automatically scientifically unacceptable**. Health-time coverage of 117/120 minutes means 97.5% of time, NOT 97.5% of item coverage or unbiased flight delays. The past WSSS example of two failed ~15s GET checks and subsequent recovery is NOT evidence of exactly zero missing flight items; some separate WSSS run failed credits despite green health.

## User-defined per-incident six plus six

- SIX primary health checks + SIX conditional emergency checks, nominally 15 seconds cadence. The expression 15 * (6+6) = 180 seconds is the *proposed envelope*, not twelve billable AeroDataBox POST delivery retries. Twelve polls span eleven nominal gaps (165 seconds) from first poll to last; actual scheduler and prior-good/first-bad timestamps decide exposure. Use an actual monotonic HARD 180-second ceiling, potentially stopping earlier.
- A **genuinely independently confirmed recovered episode** may receive a NEW 6+6 allowance at a later unrelated outage. A single transient green GET cannot erase an episode in a flapping service if original source completeness remains unknown. Periods of GET health and source item recovery are separate concepts.
- Cumulative uncertain/billable exposure, incident count, independent provider-source freshness, queue/backlog/retention, whole-run credit ceiling and credit floor NEVER RESET. Invalid deployed build, owner, credentials, physical-flight identity, original source integrity, budget or cleanup cause immediate hard stop. A prospective scientific and safety review must freeze concrete limits, not choose them after observing outcomes.
- The actual paid Stage-1 supervisor still defaults to THREE consecutive failed GETs. Its new 6+6 candidate supplies evidence:undefined and is refused for paid use without a GENUINE external signed original provider sender/attempt/credit witness. No environment flag or database-only observer can impersonate this.
- Keep original AeroDataBox maxDeliveryRetries:0. Health checks are not paid provider delivery attempts.

## Scientific-use taxonomy: enable useful partial research WITHOUT manufacturing source evidence

A. **OPERATIONALLY RECOVERED**: published GET/health recovers. Unknown number of original provider sends may have been missed. No claim of sample completeness.

B. **VALID OBSERVED-SUBSET DESCRIPTIVE / EXPLORATORY**: if the actual *received* original-source-derived records have validated stored-byte/canonical blob SHA readback, precise provenance/caveats, correct recorded UTC window and all eight bin labels, deduplicated confirmed physical-flight-v2 identities, valid runway-delay outcome semantics, and no ambiguous codeshare/duplicate items, the verified observed subset can support explicitly limited descriptive statistics. This category can be meaningful even when the total number of upstream sender attempts is UNKNOWN, PROVIDED it is explicitly a description of **received flights only**; it is not representative of ALL eligible flights, not a complete F.8 run, not a valid externally attributed missing count, and not a causal/predictive population inference. Invalid received records must be quarantined. Having no eligible observed rows gives no useful dataset. Do not quietly impute missing items.

C. **PROSPECTIVE BOUNDED-CENSORED SENSITIVITY CANDIDATE**: requires authenticated per-attempt provider sender/source/flight-item evidence, actual missing item identities and eight source bins, independent real original source custody, justified outcome support, and fixed **pre-observation** caps on missing items/percentage, per-bin concentration, inference sensitivity and scientific endpoint. Small count percentage alone does not establish negligible selection bias; a 30s high-delay loss can affect mean more than 180s with proven zero missing. Test alternative MNAR scenarios rather than assuming missing-at-random.

D. **ORIGINAL F.8 COMPLETE-SOURCE CANDIDATE**: only after original immutable source/identity/credit/UTC/owner/storage/delivery and all predefined F.8 gates pass. None of A/B/C automatically implies D.

The sample 2%/2-items caps in synthetic tests are ILLUSTRATIVE, not scientifically authorized actual limits. No industry-wide cutoff exists. Separately distinguish **source completeness**, **scientific representativeness** and **operational health**.

## Historical credits and core infrastructure limitations

- Historical P2G22 external 260 billable FLIGHT-ITEM credits vs internal 259 remains unresolved. It is NOT independently established as exactly ONE missing physical-flight observation: a billed attempt, duplicate charge, failed ACK or flight-item may have different identities. Synthetic 260/259-as-one-missing tests are COUNTERFACTUAL ONLY.
- The raw scientific object currently stored by the ordinary V3.9 receiver is the *canonical parsed JSON representation*, not yet verified literal original HTTP body, even though both may be semantically equal. Do not relabel saved historical objects as authenticated byte-for-byte on-wire provider source.
- Direct GitHub-owner PostgreSQL SELECTs can independently examine COMMITTED records but do NOT receive new HTTPS POSTs pinned to an unavailable Replit callback. Replit temporary .replit.dev addresses cannot auto-reroute a provider subscription pinned to primary origin. 6+6 health monitoring alone cannot prevent unheard sends.
- Operator explicitly declines Cloudflare due to usage and billing concerns, and prefers existing Replit apps and read-only PostgreSQL forensics; teammate delegates engineering decisions. Operator approves safe isolated zero-provider-credit, zero-extra-charge two-hour **SYNTHETIC** rehearsal, NOT any new paid launch, unapproved provider subscription, unverified republish, production data contamination or main merge.

## New Oct 11 real read-only Replit evidence — P02 retention first

At 2026-10-11T05:20:47Z, primary ~/workspace was clean at local branch phase2g-p2g24-manual-receiver-repair-20261009, HEAD d5db303d25694f355289587e97cb4972a975b87e. GitHub remote lookup did not find this SHA/branch, so treat as current **LOCAL checkout**, not the GitHub investigation branch. Never hard-reset, switch, merge or overwrite it for this test.

All three runtime environment variable *names* needed for DB/bucket/webhook key were CONFIGURED (no secrets disclosed). Postgres postmaster start 2026-10-11T05:20:34.452Z, pg_is_in_recovery=false. This is a new lifecycle epoch but NOT proof of why it restarted or exactly which UNLOGGED rows changed. Durable Oct9 YSSY probe18: failed, duration_censored=true, reconciliation_status=UNRESOLVED. Exact SQL count of 30 provider_content_blob_ref entries, no deletion_verified markers. Earliest expiry 2026-10-16T04:02:22.780Z; latest 2026-10-16T04:52:22.024Z. THIS COUNTS DB REFERENCES ONLY; actual object download/SHA/byte length not yet verified. User's SQL was READ ONLY and no paid provider calls.

**Next** P02: urgently run download-only SHA audit of exact 30 real objects from current original production Replit workspace, if a reviewed read-only audit file is present; do not access secrets manually, change the checkout or paste object names or provider payload. Full failure/censor labels must stay intact. Then implement/tests for the separate B observed-subset descriptive label; retain existing C bounded scientific sensitivity module and F.8 strict D. Continue P09 first-hop, P14 authentic billed attempt reconciliation, P18 published physical-v2 parity and P20 hosted zero-credit rehearsal before new paid work.

**Sunday October 11 20:00 PDT YSSY: paid NO-GO on current proved release gates.** Improving usefulness of honest, validated partial datasets is not permission to claim external source completeness or spend credits without an authorized and safe receiver.

## Future conversation instructions

FETCH THIS DOCUMENT plus P01–P20 ledger, issue #28 and latest actual verified CI head to recover shared user/assistant decisions. Do not quietly revert to a categorical 180-second science rejection, quietly label a 260/259 accounting difference a known physical flight lost, or quietly enable 6+6 in the paid supervisor. Preserve this record in the existing isolated draft PR branch; no merge to main without release review.


## Verified implementation checkpoint — P17 received-subset analysis

- `experiments/phase2g_rehearsal/observed_subset_descriptive_scope_v39.ts` adds a PURE, conditional eight-UTC-bin, properly quarantined confirmed-physical-flight-v2 **received-only runway departure-delay mean**. It accepts negative delays (early departures), handles genuine zero-traffic bins, enforces byte/SHA and measured metric/clock/DB epoch evidence flags, excludes quarantined flight identities, and does NOT infer unseen upstream sender counts.
- A 30-second, 60-second, 120-second, 180-second and 300-second health-uncertainty test gives the **same conditional descriptive scope** for identical verified received rows. This is a model of scientific usefulness of *received records*, NOT an authorization to keep a PAID owner running beyond the 180s operational 6+6 cap.
- If real original source-identifier/physical-v2/UTC/metric/byte-readback/dedup/DB-epoch evidence is missing, the candidate becomes `INVALID_OBSERVED_DATA`. A zero received confirmed-flight yield becomes `NO_OBSERVED_CONFIRMED_YIELD`. Never create sample items for empty bins.
- The new model reports `independentProviderMissingItems:null` **unconditionally**, even if a caller forges apparent upstream counters; provider wire authenticity and F.8/source/paid authorization are always false. For full or quantitatively censored source inference use the separate source-bound `yssy_bounded_loss_scientific_adjudication_v39.ts` and gap sensitivity evaluator.
- **GitHub Actions [#38115130386](https://github.com/HKcode22/ReplitTranvr/actions/runs/38115130386) at exact code SHA `f13f8e5bbbaaa2eb96dff6d7a18339308f7ddeef`: BOTH jobs SUCCESS, 628/628 offline tests in 60 suites, 76/76 real disposable V3.9 PostgreSQL16, true unclean restart confirms LOGGED=1 and UNLOGGED=0.** No real provider calls, live scientific DB mutation, cloud account creation or paid 6+6 activation.


## P02 original stored-content checkpoint (new operator evidence)

Original primary Replit auditor returned `PASS_ALL_30_SHA256_AND_BYTES`, `verified:30`, `mismatched:0`, `inaccessible:0`, `failures:[]`, and zero reported DB/App Storage/provider mutations. Source [sanitized audit record](../reports/2026-10-11_P02_REAL_YSSY_ORIGINAL_30_BLOBS_SHA256_READBACK_OPERATOR_EVIDENCE.md). This closes the historical **stored-object-integrity** subgate, not completeness of upstream source or validation of every physical-v2 scientific item. Historical P2G24 remains failed/censored, externally billed credit attribution and provider literal original wire remain unproven. Keep our accepted research direction of honest received-subset analysis with no false airport-wide completeness.
