/**
 * Replit Shell operator preparation receipt for the NEXT eligible YSSY time
 * class. READ ONLY: git/artifact/local time only; no provider HTTP, database,
 * Replit publish, AUTH ledger mutation, or paid launch.
 *
 * A recorded receipt is NOT a Stage1 AUTH, immutable deployed-image parity
 * evidence, or permission to bypass consumed P2G22/P2G23 rerun freezes.
 */
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {
  loadYssyOperatingHoursProtocolV39,
  yssyStage1TimeClassStatusV39
} from "../server/lib/disruption/yssyOperatingHours_v39";

export const YSSY_20261012_UTC_START_V39="2026-10-12T03:00:00.000Z";
export const YSSY_20261012_UTC_END_V39="2026-10-12T05:00:00.000Z";
export const YSSY_FROZEN_LOCAL_TIME_SHA256_V39=
  "ad6224fb7fc83de42021c9f75a705892c7130614f4a72276b47fa2c246dd4991";
export const YSSY_FROZEN_LOCAL_TIME_FILE_V39=
  "artifacts/phase2g-yssy-local-operating-hours-protocol-freeze-20261003.json";

const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const git=(...args:string[])=>execFileSync("git",args,{encoding:"utf8"}).trim();

export function makeYssyZeroCreditPreparationReceiptV39(input:{
  sourceHead:string;branch:string;observedAtUtc:Date;
  frozenProtocolSha256:string;
  calendarEligible:boolean;
  utcWeekdayClass:string;localWeekdayClass:string;
  slotEligible:boolean;outsideCurfew:boolean;
}) {
  if(!/^[a-f0-9]{40}$/.test(input.sourceHead)||
     !Number.isFinite(input.observedAtUtc.getTime())||
     input.frozenProtocolSha256!==YSSY_FROZEN_LOCAL_TIME_SHA256_V39||
     !input.calendarEligible||
     input.utcWeekdayClass!=="weekday"||
     input.localWeekdayClass!=="weekday"||
     !input.slotEligible||!input.outsideCurfew)
    throw Error("YSSY_ZERO_CREDIT_PREP_REFUSED:FROZEN_CALENDAR_OR_SOURCE");
  return {
    schema:"v39.phase2g.yssy.20261012.zero-credit-operator-preparation.v1",
    status:"PREPARATION_RECEIPT_NOT_A_PAID_AUTHORIZATION",
    observed_at_utc:input.observedAtUtc.toISOString(),
    source_git_head:input.sourceHead,
    source_branch:input.branch,
    source_is_main:input.branch==="main",
    target_icao:"YSSY",
    metric_contract:"v39-physical-flight-instance-v2",
    stage:"Phase2G/Gate2/Stage1",
    window_start_utc:YSSY_20261012_UTC_START_V39,
    window_end_utc:YSSY_20261012_UTC_END_V39,
    california_window:"Sunday 2026-10-11 20:00-22:00 PDT",
    sydney_window:"Monday 2026-10-12 14:00-16:00 AEDT",
    utc_weekday_class:input.utcWeekdayClass,
    sydney_weekday_class:input.localWeekdayClass,
    frozen_calendar_class_eligible:true,
    frozen_protocol_file:YSSY_FROZEN_LOCAL_TIME_FILE_V39,
    frozen_protocol_sha256:input.frozenProtocolSha256,
    original_f8_and_early_scope_baseline_immutable:true,
    previously_failed_probe_ids:[16,17,18],
    consumed_recovery_authorizations_cannot_be_reused:true,
    max_provider_delivery_retries:0,
    release_candidate_paid_supervisor_policy:"six-plus-six",
    release_candidate_6plus6_max_cumulative_outage_ms:180000,
    effective_paid_6plus6_verified:false,
    published_paid_supervisor_policy:"UNVERIFIED",
    independent_sender_attempt_evidence_verified:false,
    original_source_receipts_and_matched_published_post_test_verified:false,
    current_provider_balance_and_subscription_ownership_verified:false,
    new_prospective_bounded_retry_amendment_authorized:false,
    new_exact_stage1_auth_approved:false,
    published_source_sha_parity_verified:false,
    paid_launch_authorized:false,
    stage1_scientific_match_not_yet_measured:true,
    provider_calls:0,
    provider_mutations:0,
    database_reads:0,
    database_mutations:0,
    alert_credits_spent:0,
    go_no_go:"HOLD_UNTIL_FRESH_AUTH_AND_LIVE_ADMISSION_EVIDENCE"
  } as const;
}

function main(){
  const args=process.argv.slice(2);
  const ix=args.indexOf("--out");
  const out=ix>=0?String(args[ix+1]??"").trim():"";
  if(!out||out.startsWith("-")||args.length!==2)
    throw Error("USAGE:node --import tsx scripts/v39_phase2g_yssy_20261012_zero_credit_prep_v39.ts --out <new-artifact-path>");
  const protocolRaw=readFileSync(YSSY_FROZEN_LOCAL_TIME_FILE_V39);
  const protocolSha=hash(protocolRaw);
  const frozen=loadYssyOperatingHoursProtocolV39({
    expectedSha256:YSSY_FROZEN_LOCAL_TIME_SHA256_V39
  }).protocol;
  const calendar=yssyStage1TimeClassStatusV39(
    new Date(YSSY_20261012_UTC_START_V39),frozen
  );
  const result=makeYssyZeroCreditPreparationReceiptV39({
    sourceHead:git("rev-parse","HEAD"),
    branch:git("branch","--show-current"),
    observedAtUtc:new Date(),
    frozenProtocolSha256:protocolSha,
    calendarEligible:calendar.eligible,
    utcWeekdayClass:calendar.utcWeekdayClass,
    localWeekdayClass:calendar.localWeekdayClass,
    slotEligible:calendar.utcSlotEligible,
    outsideCurfew:calendar.targetWindowOutsideCurfew
  });
  const target=resolve(out);
  const raw=JSON.stringify(result,null,2)+"\n";
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,raw,{encoding:"utf8",flag:"wx"});
  process.stdout.write(JSON.stringify({
    status:result.status,
    path:out,
    receipt_sha256:hash(raw),
    source_head:result.source_git_head,
    calendar_eligible:result.frozen_calendar_class_eligible,
    paid_launch_authorized:false,
    next:"Review exact deploy/source, provider inventory, live callback POST, new prospective retry freeze and human-approved AUTH before a paid run."
  },null,2)+"\n");
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{main();}
  catch(e){console.error(e instanceof Error?e.message:"YSSY_ZERO_CREDIT_PREP_FAILED");process.exitCode=2;}
}
