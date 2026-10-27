# Gate 0.5 — immediate scientific source admission and paid decision

**Prepared Tuesday 27 October 2026 (America/Los_Angeles).** This is an actionable continuation of [live pre-scale Gate05/YSSY sprint](2026-10-26_PRE_SCALE_GATE05_YSSY_48H_SPRINT.md), [f.8 §§5.2, 6, 7](../plans/V3.9_DataCollectPlan_f.8.md), [frozen Implementation Log §1.5.6](../implementation/V3.9_IMPLEMENTATION_LOG.md), and [issue #173](https://github.com/HKcode22/ReplitTranvr/issues/173). Wednesday Oct28 8 PM is **not** a start appointment.

## What has actually passed, no duplicate paid work

- Gate05c owner-run October27 08:13Z had 2 physically billed WSSS FIDS GETs, charged 4 API units/0 Alert credits. Each GET returned 33 response rows (not independently distinct physical legs), 33 parseable scheduled UTC and 33 revised UTC, **0 populated runway timestamps**. 16 operator and 17 marketing responses per variant. Contract branch withLeg false/true worked. Do not reuse the old spent once-intent or charge again for the same query.
- Merged #183/#184 fixed false FAA milestone aliases, per-flight exact T−24h/T−6h/T−90m and feature/population `available_at<=C`, marketing identity distinction and nullable exact runway-delay adjudication (actual minus scheduled wheels-off, signed minutes). #187 prepared **a future-only** acquisition grid; this is not a payment, deployment or proof that future flight observation has occurred.
- Separate YSSY 231 externally billed versus 229 retained item claims remains a qualified **0.866% billed item-credit** discrepancy, **not** evidence of two missing HTTP requests or individual flights. Scientific tolerance applies to measured missingness; it cannot relabel an estimated event as actual.

## Scientific source comparison after official public documentation review

| Feature | AeroDataBox FIDS as currently measured | Cirium Flight Status / Sky API candidate |
|---|---|---|
| Scheduled departure | `scheduledTime` available, specific gate/runway meaning not source-certified | Vendor identifies `scheduledGateDeparture` and separately documents `scheduledRunwayDeparture` |
| Actual wheels-off | `runwayTime` may be actual **OR** estimated, measured 0/33 on each WSSS query | `actualRunwayDeparture` separately named from `estimatedRunwayDeparture`; check each real record and coverage |
| Exact runway-delay estimate | **Not source-identifiable** from current WSSS sample | `actualRunwayDeparture - scheduledRunwayDeparture` is a promising *candidate* with correct units/milestones if both independently reviewed, present and matched |
| Before-T predictor | No actual historical versions in paid aggregate receipts | Current lookup can be future schedule, but does NOT itself prove first-observed T or earlier state; Cirium **Flight Status Feed** offers a changed-record stream under **Contract** plan |
| Identity/missingness | Operator/marketing flags, retime flight identity not fully linked | Cirium has `flightId` and flight status events, but cross-provider identity and schedule revisions require independent review |
| Account/pilot access | Existing owner's AeroDataBox credential, last observed API balance 59,988 and 1,981 Alert credits; requires fresh read before any new charge | **No connected Cirium account or trial verified. No pricing/plan/terms/credential binding established. Cannot incur Cirium costs or claim trial is enabled.** |

**Official documentation (read October 27):** [Cirium flight status semantics](https://developer.cirium.com/apis/data/Cirium-flight-status), [current FlightStats status API](https://developer.cirium.com/apis/flightstats-apis/flight-status), [Cirium Sky status feed](https://developer.cirium.com/apis/cirium-sky-api/flight-status-feed), [Cirium Developer Studio](https://developer.flightstats.com/), [FAA ASPM runway variables](https://www.aspm.faa.gov/aspmhelp/index/ASPM__Individual_Flights__Definitions_of_Variables.html). Cirium states its status records are normally created roughly **three days pre-departure**, but content and missingness vary. The *complete status-change feed* is **Contract-plan only** per official documentation. The current lookup status API is listed as around 3 days before departure through ~7 days after. The older FlightStats response example is not a guarantee of current WSSS fields or trial product entitlement.

**New pure source-admission owner:** `server/lib/disruption/gate05CiriumRunwaySourceAdmission_v39.ts`. Input is a user-authorized, in-memory Cirium `flightStatuses` array (caller passes the array) only. Outputs non-sensitive counts for independently named scheduled/estimated/actual runway fields, correctly formatted UTC, optional missingness, and provisional provider IDs. Always marks `independentSourceSemanticReviewRequired=true`, `crossProviderOperatingLegJoinProven=false`, `actualPrimaryLabelApproved=false`, `sourceLicensingChecked=false`. The source is **not** a credentialed API client; testing it against fixtures is not a paid live probe or evidence that WSSS exposes any actual runway field.

## Immediate narrow paid experiment — minimum true prerequisites

1. **Obtain usable outcome-source access or select a verified existing alternative.** First preference: existing account/trial with current Cirium Flight Status lookup covering WSSS departures, including actual/scheduled runway times, provider flight ID and retention terms. The account setup itself requires user's service enrollment/credential, not only ChatGPT approval. Verify the **current** product schema and its price from that account. Trial access does not authorize or imply Contract-only status-change feed rights.
2. **No retroactive full T−24h.** Freeze a future service interval with preflight observation before C=T−24h, and a conservative separately documented pre-cutoff acquisition guard, refresh and staleness, using the #187 grid only after validating source-native T semantics. Preserve actual durable `available_at`; do not substitute a retrospective timestamp. If using Cirium source as label provider, a **later** lookup after real departure may verify actual runway outcome; it must not be used as an early predictor.
3. **Protect scope and cost.** Before new payment freeze airport, 20-minute or other appropriate service cohort, exact local/UTC period, owner source SHA, max physical GETs, API-unit cost and balance, legal retention TTL, independent STOP where Alerts/subscriptions run, one-use atomic intent and provider-supplied authentication. Respect existing 6+6 receiver monitoring and measured-gap Tier-B tolerance; don't alter the original T or label by ±3 minutes. No broad recurring paid run and no unverified REST unit cost extrapolated across providers.
4. **Run first narrow candidate**: one provider-supported source-label coverage lookup or, if a real run is viable, a prospectively scheduled versioned FIDS capture. Aggregate number of eligible operating legs, source-supplied scheduled runway, actual runway, estimated only, missingness, linkage confidence, observed-as-of and strict actual billing. Require *source-validated* runway times (not field-name inference alone) for final label; do not claim full Gate0.5 PASS from a single small pilot. Never fabricate labels for optional missing records.
5. Only thereafter assess **full Gate0.5** adequate sample, independently owned protected STOP, 100 events/50 unique etc as specified in the binding Implementation Log, and reopen live paid Phase4/6 authority if the complete criteria are satisfied; progress on Phase4 OFFLINE engineering does not wait.

## Readiness decision

`GATE05_SOFTWARE_AND_OFFLINE_TESTS=READY`.
`GATE05_REAL_PROSPECTIVE_GRID=PREPARED_NOT_ACTIVATED`.
`GATE05_INDEPENDENT_ACTUAL_AND_SCHEDULED_RUNWAY_SOURCE=SOURCE_CONTRACT_CANDIDATE_NOT_LICENSED_OR_SAMPLED`.
`GATE05_LIVE_PAID_ONE_SHOT=NO_EXECUTABLE_SCOPE_YET`.
`GATE05_FULL_SCIENTIFIC=NOT_PROVEN`.
`PHASE4_OFFLINE=GO_NOW`; `PHASE4_LARGE_PAID=NO_GO`.

**No credit charged, no existing Replit app touched, no Cloudflare, no Replit AI Agent, no paid experiment started by this PR.** Main GitHub source of truth; if a session is lost, resume at this report, issue #173, and original sprint. Never claim background work will happen unless a supported automation was explicitly created.
