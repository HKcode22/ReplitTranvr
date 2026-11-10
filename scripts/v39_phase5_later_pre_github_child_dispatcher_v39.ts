/**
 * Existing 10-minute GH schedule -> ONE independently signed future
 * T6/T90 flight PRE child. Parent: restricted PG16 READ ONLY + GitHub
 * dispatch only, no provider key, POST account, Alert or DB mutation.
 */
import {readFileSync,lstatSync} from "node:fs";
import {Pool} from "pg";
import {P5_STAGE28_GROUPS,makeP5Stage28DedicatedRolePool}
 from "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
import {P5_STAGE14_BOUND_SOURCE_SQL,P5_STAGE14_PHYSICAL_MEMBER_SQL,
 P5_STAGE24_REVIEWED_WITNESSED_T24_SQL}
 from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import {admitP5LaterPreAutoEnv,reviewP5LaterPreActualReadback,
 planP5LaterPreGithubChild,type P5LaterPreActualReadback,
 type P5LaterGhHistory}
 from "../server/lib/disruption/phase5LaterPreGithubChildDecision_v39";
import type {P5SignedWitnessedLaterPrePacket}
 from "./v39_phase5_one_signed_witnessed_later_pre_github_owner_v39";

const ROOT="https://api.github.com/repos/HKcode22/ReplitTranvr";
const CHILD="phase5-one-signed-witnessed-later-pre-main-manual.yml";
const CONFIRM="ONE_SIGNED_WITNESSED_T6_OR_T90_PRE_NO_PROVIDER";
function hold(reason:string):never{
 throw Error("REFUSED_P5_AUTO_LATER_PRE_"+reason);
}
export async function runP5LaterPreAuto(
 env:NodeJS.ProcessEnv,fetcher:typeof fetch=fetch
){
 const permit=admitP5LaterPreAutoEnv(env);
 const stat=lstatSync(permit.path);
 if(!stat.isFile()||stat.isSymbolicLink()||
    stat.size<100||stat.size>200000)
  hold("UNREVIEWED_FROZEN_PACKET_NOT_REGULAR_FILE");
 const bytes=readFileSync(permit.path);
 let packet:P5SignedWitnessedLaterPrePacket;
 try{packet=JSON.parse(bytes.toString("utf8")) as P5SignedWitnessedLaterPrePacket;}
 catch{return hold("SIGNED_LATER_PRE_PACKET_NOT_JSON");}
 if(!packet?.prePermit||!["T-6h","T-90m"].includes(packet.prePermit.horizon))
  hold("NOT_ONE_SIGNED_FUTURE_LATER_HORIZON");
 const pre=packet.prePermit;
 const raw=new Pool({
  connectionString:permit.url,max:1,connectionTimeoutMillis:8000,
  idleTimeoutMillis:1500,application_name:"p5_later_pre_auto_readonly"
 });
 let observed:P5LaterPreActualReadback;
 try{
  const scope=makeP5Stage28DedicatedRolePool(raw,{
   group:"pre",reviewedDedicatedLogin:"phase5_p30_pre_login_20261107",
   forbiddenApplicationLogin:"phase5_runtime_application_login"
  });
  const c=await scope.connect();
  let begun=false;
  try{
   await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   begun=true;
   await c.query("SET LOCAL statement_timeout='12000ms'");
   await c.query("SET LOCAL lock_timeout='2000ms'");
   const who=await c.query("SELECT current_user AS actor,current_database() AS db,"+
    "current_setting('transaction_read_only') AS ro,"+
    "clock_timestamp() AS at");
   const info=who.rows[0];
   if(who.rowCount!==1||info.actor!==P5_STAGE28_GROUPS.pre||
      info.db!=="neondb"||info.ro!=="on")
    hold("UNVERIFIED_RESTRICTED_PRE_ONLY_DB_SESSION");
   const source=await c.query(P5_STAGE14_BOUND_SOURCE_SQL,
    [pre.manifestSha256,pre.queryDigestSha256]);
   const members=await c.query(P5_STAGE14_PHYSICAL_MEMBER_SQL,
    [pre.expectedSourcePopulationQueryId,pre.flightInstanceId]);
   const same=await c.query(
    "SELECT id FROM clean.flight_snapshots WHERE flight_instance_id=$1"+
    " AND horizon=$2 AND prediction_state='PRE_DEPARTURE' LIMIT 3",
    [pre.flightInstanceId,pre.horizon]);
   const t24=await c.query(
    "SELECT id FROM clean.flight_snapshots WHERE flight_instance_id=$1"+
    " AND horizon='T-24h' LIMIT 3",[pre.flightInstanceId]);
   const witness=await c.query(P5_STAGE24_REVIEWED_WITNESSED_T24_SQL,
    [pre.flightInstanceId]);
   observed={
    observedDbClockUtc:info.at,actor:info.actor,database:info.db,
    readonly:"on",originalRows:source.rows,memberRows:members.rows,
    sameHorizonCount:same.rows.length,t24SnapshotCount:t24.rows.length,
    witnessedT24Rows:witness.rows
   };
   await c.query("ROLLBACK");begun=false;
  }finally{
   if(begun)await c.query("ROLLBACK").catch(()=>{});
   c.release();
  }
 }finally{await raw.end().catch(()=>{});}
 const ready=reviewP5LaterPreActualReadback(
  bytes,packet,permit,observed,env);
 if(!ready.readyForHistory)
  return {...ready,acknowledgedGithubChild:false as const,
   noPaidProviderActionByParent:true as const};
 const now=Date.parse(ready.observedDbClockUtc);
 const start=new Date(now-4*3600_000).toISOString();
 const end=new Date(now+60_000).toISOString();
 const headers={
  Accept:"application/vnd.github+json",
  Authorization:"Bearer "+permit.token,
  "X-GitHub-Api-Version":"2022-11-28"
 };
 const historyUrl=ROOT+"/actions/workflows/"+CHILD+"/runs"+
  "?event=workflow_dispatch&per_page=100&created="+
  encodeURIComponent(start+".."+end);
 const response=await fetcher(historyUrl,{method:"GET",headers});
 if(!response.ok)hold("GITHUB_LATER_PRE_CHILD_RUN_HISTORY_UNAVAILABLE");
 const history=await response.json() as P5LaterGhHistory;
 const planned=planP5LaterPreGithubChild(ready,history);
 if(!planned.shouldDispatch)
  return {...ready,status:planned.status,
   acknowledgedGithubChild:false as const,
   noPaidProviderActionByParent:true as const};
 const sent=await fetcher(ROOT+"/actions/workflows/"+CHILD+"/dispatches",{
  method:"POST",headers:{...headers,"Content-Type":"application/json"},
  body:JSON.stringify({ref:"main",inputs:{
   frozen_later_pre_packet:permit.path,confirm:CONFIRM
  }})
 });
 if(sent.status!==204)
  hold("AMBIGUOUS_CHILD_DISPATCH_NO_BLIND_RETRY");
 return {...ready,status:"ONE_SIGNED_LATER_PRE_GH_CHILD_ACCEPTED_NOT_DB_COMMIT",
  acknowledgedGithubChild:true as const,
  noPaidProviderActionByParent:true as const};
}
if(process.env.P5_LATER_PRE_AUTO_DISPATCH_ENTRYPOINT==="1")
 runP5LaterPreAuto(process.env).then(x=>console.log(JSON.stringify(x)))
 .catch(e=>{
  const msg=e instanceof Error?e.message:"";
  console.error(/^REFUSED_P5_AUTO_LATER_PRE_[A-Z0-9_]+$/.test(msg)?
    msg:"REFUSED_P5_AUTO_LATER_PRE_UNVERIFIED_RUNTIME_HOLD_NO_RETRY");
  process.exitCode=2;
 });
