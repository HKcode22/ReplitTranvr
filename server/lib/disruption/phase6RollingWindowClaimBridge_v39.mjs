/** Owner-only staged V0102 reference bridge; never place an owner URL in
 * GitHub. No new login/runtime dispatch here. Future restricted adapter
 * must preserve this independently checked commit/readback boundary.
 */
import {createHash} from "node:crypto";
import {loadP6RollingCalendarHints} from "./phase6RollingCalendarHints_v39.mjs";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const hold=s=>{throw Error("HOLD_P6_WINDOW_CLAIM_BRIDGE_"+s);};
const clock=x=>{
 if(!(x instanceof Date)&&typeof x!=="string")hold("CLOCK");
 const n=new Date(x).getTime();if(!Number.isSafeInteger(n))hold("CLOCK");return n;
};
const stamp=n=>new Date(n).toISOString(),hash=s=>createHash("sha256").update(s).digest("hex");
const ISO_FIELDS=["window_start_utc","window_end_utc","claimed_at_utc"];
function exactScope(input){
 if(!input||input.separateOwnerWindowCustodyReviewApproved!==true||
   typeof input.authorizationId!=="string"||input.authorizationId.length<1||input.authorizationId.length>128||
   !Number.isSafeInteger(input.rootRunId)||input.rootRunId<1||input.rootRunId>=1e15||
   !H.test(input.configSha256??"")||!C.test(input.trust?.reviewedCodeSha??"")||
   !["manifestSha256","calendarSha256","releaseSha256","rightsSha256"].every(k=>H.test(input.trust?.[k]??""))||
   !H.test(input.expectedPolicySha256??"")||!Buffer.isBuffer(input.policyBytes))hold("REVIEWED_SCOPE");
 const trust={reviewedCodeSha:input.trust.reviewedCodeSha,manifestSha256:input.trust.manifestSha256,
  calendarSha256:input.trust.calendarSha256,releaseSha256:input.trust.releaseSha256,rightsSha256:input.trust.rightsSha256};
 // Independently read/hash the exact existing signed 31-day plan policy.
 // No user-supplied replacement epoch, deadline or calendar bytes.
 const calendar=loadP6RollingCalendarHints({policyBytes:input.policyBytes,expectedPolicySha256:input.expectedPolicySha256,
  trust,read:input.readPlan});
 if(calendar.from%1000||calendar.until%1000||calendar.until-calendar.from>1440*3600000)hold("POLICY_WINDOW_GEOMETRY");
 const commitment=hash(JSON.stringify({policySha256:input.expectedPolicySha256,...trust}));
 return {trust,calendar,commitment,rootRunId:input.rootRunId,authorizationId:input.authorizationId,
  configSha256:input.configSha256,policySha256:input.expectedPolicySha256};
}
async function identity(client,readOnly){
 const q=await client.query(`SELECT current_database() db,current_user actor,session_user session_actor,
 current_setting('server_version_num')::int version,pg_is_in_recovery() replica,
 current_setting('transaction_read_only') ro,current_setting('transaction_isolation') isolation,
 pg_backend_pid() pid,clock_timestamp() db_clock`);
 const row=q.rows?.[0];
 if(q.rowCount!==1||row?.db!=="neondb"||row.actor!=="neondb_owner"||
   !Number.isSafeInteger(row.version)||Math.floor(row.version/10000)!==16||row.replica!==false||
   row.ro!==(readOnly?"on":"off")||row.isolation!=="read committed"||
   !Number.isSafeInteger(row.pid)||row.pid<1)hold("EXACT_OWNER_PG16_TRANSACTION");
 return {...row,dbClock:clock(row.db_clock)};
}
function shape(row,a){
 const index=row?.window_index;
 if(!Number.isSafeInteger(index)||index<0||index>719)hold("WINDOW_GEOMETRY");
 const s=a.calendar.from+index*7200000,z=Math.min(a.calendar.until,s+7200000),claim=clock(row.claimed_at_utc);
 if(clock(row.window_start_utc)!==s||clock(row.window_end_utc)!==z||claim<s||claim>z-900000)hold("WINDOW_GEOMETRY");
 return {index,startUtc:stamp(s),endUtc:stamp(z),claimedUtc:stamp(claim),
  // Compare DB-side microsecond text between committed write and readback.
  exactClaimedAt:row.claimed_at_exact};
}
const claimSql=`SELECT window_index,window_start_utc,window_end_utc,claimed_at_utc,
 to_char(claimed_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') claimed_at_exact
 FROM clean.phase6_claim_rolling_window_v39($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
const readSql=`SELECT window_index,window_start_utc,window_end_utc,claimed_at_utc,
 to_char(claimed_at_utc AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') claimed_at_exact,
 authorization_id,manifest_sha256,calendar_sha256,config_sha256,release_code_sha,policy_sha256,
 policy_from_utc,policy_until_utc,root_run_id::text,closed_at_utc
 FROM clean.phase6_rolling_window_custody_v39 WHERE root_run_id=$1 AND manifest_sha256=$2`;
async function rollback(client){try{await client.query("ROLLBACK");}catch{}}
export async function claimP6RollingWindowOnce(input,{claimClient,readbackClient}={}){
 const a=exactScope(input);
 if(!claimClient||!readbackClient||claimClient===readbackClient||
    typeof claimClient.query!=="function"||typeof readbackClient.query!=="function")hold("TWO_DISTINCT_CONNECTIONS_REQUIRED");
 let claimIdentity,committed,attemptedCommit=false,opened=false;
 try{
  await claimClient.query("BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE");opened=true;
  claimIdentity=await identity(claimClient,false);
  const p=a.trust,result=await claimClient.query(claimSql,[a.authorizationId,p.manifestSha256,p.calendarSha256,
   a.configSha256,p.reviewedCodeSha,a.policySha256,stamp(a.calendar.from),stamp(a.calendar.until),a.rootRunId]);
  if(result.rowCount!==1)hold("CLAIM_CARDINALITY");
  committed=shape(result.rows[0],a);
  if(typeof committed.exactClaimedAt!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(committed.exactClaimedAt)||
    clock(committed.claimedUtc)<claimIdentity.dbClock)hold("CLAIM_CLOCK");
  attemptedCommit=true;
  await claimClient.query("COMMIT");opened=false;
 }catch(e){
  // If COMMIT was sent, a lost acknowledgment is NOT a rollback and
  // never permits another claim. Destroy/reconcile that session outside
  // this primitive. Runtime must not issue any worker POST.
  if(attemptedCommit)hold("COMMIT_UNKNOWN_NO_REPLAY");
  if(opened)await rollback(claimClient);
  throw e;
 }
 let seen,readOpen=false;
 try{
  await readbackClient.query("BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");readOpen=true;
  const ident=await identity(readbackClient,true);
  if(ident.pid===claimIdentity.pid||ident.session_actor!==claimIdentity.session_actor)hold("NOT_INDEPENDENT_CONNECTION");
  const q=await readbackClient.query(readSql,[a.rootRunId,a.trust.manifestSha256]);
  if(q.rowCount!==1)hold("READBACK_CARDINALITY");
  const row=q.rows[0];seen=shape(row,a);
  if(JSON.stringify(seen)!==JSON.stringify(committed)||row.closed_at_utc!==null||
    row.root_run_id!==String(a.rootRunId)||row.authorization_id!==a.authorizationId||
    row.manifest_sha256!==a.trust.manifestSha256||row.calendar_sha256!==a.trust.calendarSha256||
    row.config_sha256!==a.configSha256||row.release_code_sha!==a.trust.reviewedCodeSha||row.policy_sha256!==a.policySha256||
    clock(row.policy_from_utc)!==a.calendar.from||clock(row.policy_until_utc)!==a.calendar.until||
    ident.dbClock<clock(seen.claimedUtc)||ident.dbClock>=clock(seen.endUtc))
   hold("COMMITTED_SCOPE_DRIFT");
  await readbackClient.query("COMMIT");readOpen=false;
 }catch{
  if(readOpen)await rollback(readbackClient);
  hold("COMMITTED_CLAIM_READBACK_UNPROVED_NO_REPLAY");
 }
 return {status:"DURABLE_WINDOW_CLAIM_COMMITTED_AND_INDEPENDENTLY_READ_BACK_NOT_DISPATCH_AUTHORITY",
  rootRunId:a.rootRunId,windowIndex:seen.index,windowStartUtc:seen.startUtc,windowEndUtc:seen.endUtc,claimedAtUtc:seen.claimedUtc,
  reviewedMainSha:a.trust.reviewedCodeSha,policyCommitment:a.commitment,actualDbClock:true,independentConnection:true,
  providerCalls:0,flightWrites:0,operationalCustodyWrites:1,dispatchCount:0,permitDispatch:false,phase6PaidGo:false};
}
