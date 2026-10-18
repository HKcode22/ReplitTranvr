/**
 * One exact WSSS04 2026-10-17 21:52 PDT blocked Stage A cleanup.
 * The WSSS04 owner has been deliberately terminated; the durable PREPARED
 * owner remains while the UNLOGGED source is absent. The operator must have
 * stopped, its exact auth/window must have expired and two clean provider
 * inventories/balances must agree before writing a LOGGED failed receipt.
 * NEVER creates/deletes/pauses/changes provider subscriptions; no paid retry.
 * There is no user-visible first-session PREPARED_NO_CREATE receipt, so this
 * script does not claim one or assert that absence of a bound ID alone proves
 * no historical provider operations. Provider account evidence is required.
 */
import "dotenv/config";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {v39Pool} from "../server/lib/disruption/db_v39";
import {sha256HexString} from "../server/lib/disruption/authRecord_v39";
import {reviewGate3CurrentProviderAccountV39,
  verifyGate3PublishedPrepaidHostV39}
  from "../server/lib/disruption/gate3OwnedPreExposure_v39";
import {commitGate3CanaryFailureV39}
  from "../server/lib/disruption/gate3CanaryFailureCommit_v39";
import {GATE3_PRIOR_OWNER_ADMISSION_SQL_V39}
  from "../server/lib/disruption/gate3PrepaidCanaryPreparation_v39";

const OLD_UUID="2eac3fed-2648-44e6-b9b7-79e45ff3b149";
const OLD_AUTH="data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS04.json";
const OLD_SHA="61c5516ad60fe85865f7ed67acc0a779f118042bdeb0077f75bf8957d19fa485";
const OLD_WINDOW="WSSS/departures/2026-10-18T05:00:00Z+600s";
const CONFIRM="ABORT_UNPAID_PREPARED_WSSS04_AFTER_STOP_NO_PROVIDER_MUTATIONS";
const HEAD=/^[a-f0-9]{40}$/;

// The shared admission query uses LIMIT 1 (sufficient to block NEW sources).
// Recovery must detect *another* unsettled owner before terminalizing the
// original; LIMIT 1 would conceal a second row. Read at most two.
export const GATE3_WSSS04_ABORT_UNSETTLED_SQL_V39 =
  GATE3_PRIOR_OWNER_ADMISSION_SQL_V39.replace(/\bLIMIT 1\s*$/, "LIMIT 2");
if (GATE3_WSSS04_ABORT_UNSETTLED_SQL_V39===GATE3_PRIOR_OWNER_ADMISSION_SQL_V39)
  throw Error("GATE3_WSSS04_ABORT_ADMISSION_QUERY_SHAPE_CHANGED_HOLD");

export type OldGate3OwnerRow=Readonly<{
  session_id:string;icao:string;authorization_evidence_sha256:string;
  canary_credit_ceiling:number;fixed_exposure_seconds:number;
  state:string;failure_reason:string|null;
  created_at_utc:Date|string;
  runtime_session_id:string|null;owner_kind:string|null;
  runtime_state:string|null;provider_subscription_id:string|null;
  callback_requests_seen:number|null;callback_success_2xx:number|null;
  callback_failures:number|null;
}>;

/** Pure guard: only lost UNLOGGED source and exact LOGGED PREPARED owner,
 * after full elapsed create clock, stopped operator and two clean inventories. */
export function reviewGate3UnpaidWsss04AbortV39(
 row:OldGate3OwnerRow|undefined,unsettled:Array<{session_id:string;state:string}>,
 now:Date,
):void{
  if(!row||row.session_id!==OLD_UUID||row.icao!=="WSSS"||
     row.authorization_evidence_sha256!==OLD_SHA||
     Number(row.canary_credit_ceiling)!==50||
     Number(row.fixed_exposure_seconds)!==600||
     row.state!=="PREPARED"||row.failure_reason!==null)
    throw Error("GATE3_WSSS04_ABORT_ORIGINAL_OWNER_NOT_EXACT_PREPARED");
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
    throw Error("GATE3_WSSS04_ABORT_CLOCK_INVALID");
  // Constrain to the exact observed WSSS04 21:52–21:57 PDT preparation.
  const created=new Date(row.created_at_utc).getTime();
  if(!Number.isFinite(created)||
     created<Date.parse("2026-10-18T04:52:00Z")||
     created>Date.parse("2026-10-18T04:57:00Z")||
     now.getTime()<Date.parse("2026-10-18T05:00:15Z"))
    throw Error("GATE3_WSSS04_ABORT_HISTORICAL_TIME_NOT_EXACT");
  if(unsettled.length!==1||
     unsettled[0]?.session_id!==OLD_UUID||
     unsettled[0]?.state!=="PREPARED")
    throw Error("GATE3_WSSS04_ABORT_OTHER_UNSETTLED_EXPOSURE");
  if(row.provider_subscription_id!==null)
    throw Error("GATE3_WSSS04_ABORT_PROVIDER_ID_WAS_BOUND_HOLD");
  // This exact recovery is exclusively for the observed lost source row.
  if(row.runtime_session_id!==null||row.owner_kind!==null||
     row.runtime_state!==null||row.callback_requests_seen!==null||
     row.callback_success_2xx!==null||row.callback_failures!==null)
    throw Error("GATE3_WSSS04_ABORT_SOURCE_NOT_EXACTLY_MISSING_HOLD");
}
async function readOwnerAndUnsettled():Promise<{
 row:OldGate3OwnerRow|undefined;
 unsettled:Array<{session_id:string;state:string}>;
}>{
  const c=await v39Pool.connect();
  let began=false,discard=false;
  try{
    await c.query("BEGIN TRANSACTION READ ONLY");
    began=true;
    const [o,u]=await Promise.all([
      c.query(`SELECT o.session_id::text AS session_id,
          o.icao,o.authorization_evidence_sha256,
          o.canary_credit_ceiling,o.fixed_exposure_seconds,
          o.state,o.failure_reason,o.created_at_utc,
          s.session_id::text AS runtime_session_id,
          s.owner_kind,s.state AS runtime_state,
          s.provider_subscription_id,
          s.callback_requests_seen,s.callback_success_2xx,s.callback_failures
       FROM clean.phase3_gate3_canary_owner_v39 o
       LEFT JOIN clean.prepaid_probe_session_runtime s
         ON s.session_id=o.session_id
       WHERE o.session_id=$1::uuid`,[OLD_UUID]),
      c.query(GATE3_WSSS04_ABORT_UNSETTLED_SQL_V39)
    ]);
    return {row:o.rows[0] as OldGate3OwnerRow|undefined,
      unsettled:u.rows.map(z=>({session_id:String(z.session_id),state:String(z.state)}))};
  }finally{
    if(began){try{await c.query("ROLLBACK")}catch{discard=true}}
    c.release(discard);
  }
}
function assertWsss04OperatorStopped():void{
  let output:string;
  try{output=execFileSync("ps",["-eo","args="],{encoding:"utf8"});}
  catch{throw Error("GATE3_WSSS04_ABORT_PROCESS_LIST_UNAVAILABLE_HOLD")}
  const live=output.split("\n").some(line=>
    line.includes("node")&&
    line.includes("scripts/v39_gate3_one_wsss_operator_v39.ts")&&
    line.includes("--auth-id AUTH-20261018-G3WSSS04"));
  if(live)throw Error("GATE3_WSSS04_ABORT_ORIGINAL_OPERATOR_STILL_RUNNING_HOLD");
}
function git(...args:string[]):string{
  return execFileSync("git",args,{encoding:"utf8"}).trim();
}
async function run():Promise<void>{
  if(process.argv.length!==5||
     process.argv[2]!=="--confirm"||
     process.argv[3]!==CONFIRM||
     !process.argv[4].startsWith("--head=")||
     !HEAD.test(process.argv[4].slice(7)))
    throw Error("GATE3_WSSS04_ABORT_EXACT_CLI_CONFIRMATION_REQUIRED");
  const head=process.argv[4].slice(7);
  if(process.env.V39_DATABASE_TARGET_CONFIRM!=="production"||
     !process.env.V39_DATABASE_RUNTIME_URL||
     !process.env.AERODATABOX_API_KEY)
    throw Error("GATE3_WSSS04_ABORT_PRODUCTION_ENVIRONMENT_REQUIRED");
  if(git("status","--porcelain").length||
     git("rev-parse","HEAD^{tree}")!==git("rev-parse",head+"^{tree}"))
    throw Error("GATE3_WSSS04_ABORT_UNREVIEWED_SOURCE_TREE_HOLD");
  const raw=readFileSync(OLD_AUTH,"utf8");
  const parsed=JSON.parse(raw);
  if(sha256HexString(raw)!==OLD_SHA||
     parsed.authorizationId!=="AUTH-20261018-G3WSSS04"||
     parsed.airportFilterWindow!==OLD_WINDOW)
    throw Error("GATE3_WSSS04_ABORT_ORIGINAL_AUTH_MISMATCH");
  assertWsss04OperatorStopped();
  await verifyGate3PublishedPrepaidHostV39(head);
  // Provider zero-active and stable balance are checked twice independently.
  const before=await reviewGate3CurrentProviderAccountV39(50);
  const first=await readOwnerAndUnsettled();
  reviewGate3UnpaidWsss04AbortV39(first.row,first.unsettled,new Date());
  await new Promise(resolve=>setTimeout(resolve,1500));
  const after=await reviewGate3CurrentProviderAccountV39(50);
  if(before!==after)throw Error("GATE3_WSSS04_ABORT_PROVIDER_BALANCE_CHANGED_HOLD");
  const second=await readOwnerAndUnsettled();
  reviewGate3UnpaidWsss04AbortV39(second.row,second.unsettled,new Date());

  // The first WSSS04 PREPARED receipt was not visible to the operator.
  // This is scoped post-window account reconciliation, NOT proof that a
  // provider CREATE never happened historically.
  const evidence=createHash("sha256").update(JSON.stringify({
    schema:"v39.gate3.wsss04.expired-unpaid-owner-recovery.v1",
    session_id:OLD_UUID,auth_sha256:OLD_SHA,
    original_console_status:"NOT_OBSERVED",
    watchdog_numeric_selectors_provided:false,
    no_armed_lease_receipt_observed:true,
    operator_was_stopped:true,
    runtime_source_missing:true,
    inspected_owner_state:"PREPARED",
    two_strict_clean_provider_inventories:true,
    unchanged_provider_balance:true,
    terminal_failure_code:"OPERATOR_ABORTED",
  })).digest("hex");
  assertWsss04OperatorStopped();
  const receipt=await commitGate3CanaryFailureV39(v39Pool,{
    sessionId:OLD_UUID,icao:"WSSS",
    authorizationEvidenceSha256:OLD_SHA,
    failureCode:"OPERATOR_ABORTED",safeEvidenceSha256:evidence,
  });
  if(receipt.committed!==true||receipt.failureCode!=="OPERATOR_ABORTED")
    throw Error("GATE3_WSSS04_ABORT_TERMINAL_RECEIPT_NOT_COMMITTED");
  const check=await v39Pool.query(
    `SELECT state,failure_reason,evidence_sha256
       FROM clean.phase3_gate3_canary_owner_v39
      WHERE session_id=$1::uuid`,[OLD_UUID]);
  if(check.rows.length!==1||check.rows[0].state!=="FAILED"||
     check.rows[0].failure_reason!=="OPERATOR_ABORTED"||
     check.rows[0].evidence_sha256!==evidence)
    throw Error("GATE3_WSSS04_ABORT_DURABLE_READBACK_HOLD");
  console.log(JSON.stringify({
    schema:"v39.gate3.wsss04.prepaid-zero-create-abort.v1",
    status:"WSSS04_PREPARED_TERMINAL_ABORT_CONFIRMED",
    session_id:OLD_UUID,
    durable_failure:"OPERATOR_ABORTED",
    evidence_sha256:evidence,
    provider_create_by_this_script:0,provider_delete_by_this_script:0,
    account_reads_only:true,authorizes_another_run:false,
  }));
}
if(import.meta.url===`file://${process.argv[1]}`){
  run().catch(e=>{
    const msg=String(e?.message??"UNEXPECTED");
    console.error(JSON.stringify({status:"HOLD",
      reason:/^GATE3_[A-Z0-9_]+$/.test(msg)?msg:
        "GATE3_WSSS04_ABORT_UNEXPECTED_ERROR",
      provider_created_by_this_script:false,
      another_paid_run_authorized:false,
    }));
    process.exitCode=2;
  }).finally(()=>v39Pool.end().catch(()=>undefined));
}
