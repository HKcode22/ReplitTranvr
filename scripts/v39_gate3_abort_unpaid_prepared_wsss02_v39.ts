/**
 * One exact 2026-10-17 20:54 PDT WSSS02 Gate3 unpaid Stage A recovery.
 * This NEVER creates, deletes, pauses or changes an AeroDataBox subscription.
 * It only DURABLY records the known original PREPARED_NO_CREATE owner as
 * FAILED / OPERATOR_ABORTED after strict independent account and SQL checks.
 *
 * Why: WSSS02 returned PREPARED_NO_CREATE. Independent watchdog run
 * #39095409271 exited before ARM due to CALLBACK_URL_MISMATCH. Without an
 * authenticated ARMED lease the paid owner cannot CREATE. Stop the operator.
 *
 * Any new paid window requires separately approved exact AUTH, new UUID and
 * review; terminal receipt here is NOT permission to run or spend.
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

const OLD_UUID="7985f9d2-b20f-49fa-b7ae-0ec62348d291";
const OLD_AUTH="data-collection/authorizations/V3.9_PHASE3_GATE3_AUTH_20261018_WSSS02.json";
const OLD_SHA="69fdc332ae3224c9bfd1ebc4b8a0ee6719982245bf9b1202b9b1d3ca3aae9db6";
const OLD_WINDOW="WSSS/departures/2026-10-18T04:00:00Z+600s";
const CONFIRM="ABORT_UNPAID_PREPARED_WSSS02_AFTER_STOP_NO_PROVIDER_MUTATIONS";
const HEAD=/^[a-f0-9]{40}$/;

// The shared admission query uses LIMIT 1 (sufficient to block NEW sources).
// Recovery must detect *another* unsettled owner before terminalizing the
// original; LIMIT 1 would conceal a second row. Read at most two.
export const GATE3_WSSS02_ABORT_UNSETTLED_SQL_V39 =
  GATE3_PRIOR_OWNER_ADMISSION_SQL_V39.replace(/\bLIMIT 1\s*$/, "LIMIT 2");
if (GATE3_WSSS02_ABORT_UNSETTLED_SQL_V39===GATE3_PRIOR_OWNER_ADMISSION_SQL_V39)
  throw Error("GATE3_WSSS02_ABORT_ADMISSION_QUERY_SHAPE_CHANGED_HOLD");

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

/** Pure guard; NULL callback counters are acceptable ONLY when the entire
 * UNLOGGED source row is absent, after a genuine PREPARED_NO_CREATE console
 * receipt and two fresh strict clean provider inventories. */
export function reviewGate3UnpaidWsss02AbortV39(
 row:OldGate3OwnerRow|undefined,unsettled:Array<{session_id:string;state:string}>,
 now:Date,
):void{
  if(!row||row.session_id!==OLD_UUID||row.icao!=="WSSS"||
     row.authorization_evidence_sha256!==OLD_SHA||
     Number(row.canary_credit_ceiling)!==50||
     Number(row.fixed_exposure_seconds)!==600||
     row.state!=="PREPARED"||row.failure_reason!==null)
    throw Error("GATE3_WSSS02_ABORT_ORIGINAL_OWNER_NOT_EXACT_PREPARED");
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
    throw Error("GATE3_WSSS02_ABORT_CLOCK_INVALID");
  // Strictly constrain this one recovery to a PREPARED row created in the
  // confirmed 20:52–20:57 PDT preparation, not future rows.
  const created=new Date(row.created_at_utc).getTime();
  if(!Number.isFinite(created)||
     created<Date.parse("2026-10-18T03:52:00Z")||
     created>Date.parse("2026-10-18T03:57:00Z")||
     now.getTime()<Date.parse("2026-10-18T04:00:15Z"))
    throw Error("GATE3_WSSS02_ABORT_HISTORICAL_TIME_NOT_EXACT");
  if(unsettled.length!==1||
     unsettled[0]?.session_id!==OLD_UUID||
     unsettled[0]?.state!=="PREPARED")
    throw Error("GATE3_WSSS02_ABORT_OTHER_UNSETTLED_EXPOSURE");
  if(row.provider_subscription_id!==null)
    throw Error("GATE3_WSSS02_ABORT_PROVIDER_ID_WAS_BOUND_HOLD");
  if(row.runtime_session_id!==null){
    if(row.runtime_session_id!==OLD_UUID||
       row.owner_kind!=="phase3_credit_canary"||
       row.runtime_state!=="armed"||
       row.callback_requests_seen!==0||
       row.callback_success_2xx!==0||row.callback_failures!==0)
      throw Error("GATE3_WSSS02_ABORT_RUNTIME_WAS_USED_OR_CHANGED_HOLD");
  }else if(row.owner_kind!==null||row.runtime_state!==null||
            row.callback_requests_seen!==null||
            row.callback_success_2xx!==null||row.callback_failures!==null){
    throw Error("GATE3_WSSS02_ABORT_UNLOGGED_MISSING_STATE_INCONSISTENT");
  }
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
      c.query(GATE3_WSSS02_ABORT_UNSETTLED_SQL_V39)
    ]);
    return {row:o.rows[0] as OldGate3OwnerRow|undefined,
      unsettled:u.rows.map(z=>({session_id:String(z.session_id),state:String(z.state)}))};
  }finally{
    if(began){try{await c.query("ROLLBACK")}catch{discard=true}}
    c.release(discard);
  }
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
    throw Error("GATE3_WSSS02_ABORT_EXACT_CLI_CONFIRMATION_REQUIRED");
  const head=process.argv[4].slice(7);
  if(process.env.V39_DATABASE_TARGET_CONFIRM!=="production"||
     !process.env.V39_DATABASE_RUNTIME_URL||
     !process.env.AERODATABOX_API_KEY)
    throw Error("GATE3_WSSS02_ABORT_PRODUCTION_ENVIRONMENT_REQUIRED");
  if(git("status","--porcelain").length||
     git("rev-parse","HEAD^{tree}")!==git("rev-parse",head+"^{tree}"))
    throw Error("GATE3_WSSS02_ABORT_UNREVIEWED_SOURCE_TREE_HOLD");
  const raw=readFileSync(OLD_AUTH,"utf8");
  const parsed=JSON.parse(raw);
  if(sha256HexString(raw)!==OLD_SHA||
     parsed.authorizationId!=="AUTH-20261018-G3WSSS02"||
     parsed.airportFilterWindow!==OLD_WINDOW)
    throw Error("GATE3_WSSS02_ABORT_ORIGINAL_AUTH_MISMATCH");
  await verifyGate3PublishedPrepaidHostV39(head);
  // Provider zero-active and stable balance are checked twice independently.
  const before=await reviewGate3CurrentProviderAccountV39(50);
  const first=await readOwnerAndUnsettled();
  reviewGate3UnpaidWsss02AbortV39(first.row,first.unsettled,new Date());
  await new Promise(resolve=>setTimeout(resolve,1500));
  const after=await reviewGate3CurrentProviderAccountV39(50);
  if(before!==after)throw Error("GATE3_WSSS02_ABORT_PROVIDER_BALANCE_CHANGED_HOLD");
  const second=await readOwnerAndUnsettled();
  reviewGate3UnpaidWsss02AbortV39(second.row,second.unsettled,new Date());

  // Source-only proof: the original console reported PREPARED_NO_CREATE and
  // rejected bad selector BEFORE calling any paid-window function.
  // This metadata digest does not claim cryptographic proof of provider sends.
  const evidence=createHash("sha256").update(JSON.stringify({
    schema:"v39.gate3.wsss02.failed-watchdog-precreate-abort.v1",
    session_id:OLD_UUID,auth_sha256:OLD_SHA,
    original_console_status:"PREPARED_NO_CREATE",
    watchdog_run_id:39095409271,
    watchdog_failure:"GATE3_SIDECAR_CALLBACK_URL_MISMATCH",
    authenticated_watchdog_armed:false,
    runner_stage_b_called:false,
    inspected_owner_state:"PREPARED",
    two_strict_clean_provider_inventories:true,
    unchanged_provider_balance:true,
    terminal_failure_code:"OPERATOR_ABORTED",
  })).digest("hex");
  const receipt=await commitGate3CanaryFailureV39(v39Pool,{
    sessionId:OLD_UUID,icao:"WSSS",
    authorizationEvidenceSha256:OLD_SHA,
    failureCode:"OPERATOR_ABORTED",safeEvidenceSha256:evidence,
  });
  if(receipt.committed!==true||receipt.failureCode!=="OPERATOR_ABORTED")
    throw Error("GATE3_WSSS02_ABORT_TERMINAL_RECEIPT_NOT_COMMITTED");
  const check=await v39Pool.query(
    `SELECT state,failure_reason,evidence_sha256
       FROM clean.phase3_gate3_canary_owner_v39
      WHERE session_id=$1::uuid`,[OLD_UUID]);
  if(check.rows.length!==1||check.rows[0].state!=="FAILED"||
     check.rows[0].failure_reason!=="OPERATOR_ABORTED"||
     check.rows[0].evidence_sha256!==evidence)
    throw Error("GATE3_WSSS02_ABORT_DURABLE_READBACK_HOLD");
  console.log(JSON.stringify({
    schema:"v39.gate3.wsss02.prepaid-zero-create-abort.v1",
    status:"WSSS02_PREPARED_TERMINAL_ABORT_CONFIRMED",
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
        "GATE3_WSSS02_ABORT_UNEXPECTED_ERROR",
      provider_created_by_this_script:false,
      another_paid_run_authorized:false,
    }));
    process.exitCode=2;
  }).finally(()=>v39Pool.end().catch(()=>undefined));
}
