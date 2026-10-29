/**
 * Post-COMMIT, GitHub-only dispatch of the existing independently protected
 * retry6 STOP worker for the exact newly commissioned scope.
 * No provider calls, no DB mutations and NEVER an Alert CREATE authorization.
 * A dispatch event is not proof the protected STOP is actually ARMED.
 */
import pg from "pg";
import {spawnSync} from "node:child_process";
const REPO="HKcode22/ReplitTranvr";
const STOP="phase3-gate05-science-exact-owned-stop-retry5.yml";
const SHA=/^[0-9a-f]{40}$/;
const HASH=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RECEIVER="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const confirm="WATCH_GATE05_SCIENCE_500_STOP_NO_CREATE";
let stage="VERIFY",dispatchAttempted=false,watchRunFound=false;
const hold=c=>{throw Error("GATE05_NEW_STOP_"+c);};
function cli(args){
  const p=spawnSync("gh",args,{
    timeout:20000,encoding:"utf8",
    maxBuffer:1024*1024,stdio:["ignore","pipe","pipe"]
  });
  if(p.error||p.status!==0)hold("GITHUB_COMMAND");
  return p.stdout;
}
function ghJson(args){
  try{return JSON.parse(cli(args));}catch{return hold("GITHUB_RESPONSE_SHAPE");}
}
function value(k,regex){
  const s=String(process.env[k]??"");
  if(!regex.test(s))hold("INPUT_"+k);
  return s;
}
const input={
  scope:value("GATE05_STOP_SCOPE",UUID),
  runner:value("GATE05_STOP_RUNNER",SHA),
  receiver:value("GATE05_STOP_RECEIVER",SHA),
  auth:value("GATE05_STOP_AUTH",HASH),
  ticket:value("GATE05_STOP_TICKET",HASH),
  start:value("GATE05_STOP_START",/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/),
  stop:value("GATE05_STOP_END",/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/),
  credits:Number(value("GATE05_STOP_CREDITS",/^[1-9][0-9]{2,7}$/))
};
let db;
try{
  if(input.receiver!==RECEIVER||
    process.env.GITHUB_ACTIONS!=="true"||
    process.env.GITHUB_EVENT_NAME!=="workflow_dispatch"||
    process.env.GITHUB_RUN_ATTEMPT!=="1"||
    process.env.GITHUB_REF!=="refs/heads/main"||
    input.runner!==process.env.GITHUB_SHA)
    hold("REVIEWED_MAIN_ONLY");
  const start=Date.parse(input.start),end=Date.parse(input.stop);
  if(!Number.isFinite(start)||!Number.isFinite(end)||
    end-start!==60*60000||
    new Date(start).toISOString()!==input.start||
    new Date(end).toISOString()!==input.stop)
    hold("FROZEN_WINDOW_INVALID");
  // Minimum time for runner queue + independent protected review. Not a
  // guarantee of ARMED; paid owner must inspect actual independent proof.
  if(start-Date.now()<25*60000||start-Date.now()>90*60000)
    hold("STOP_TOO_LATE_OR_NOT_PROSPECTIVE");
  if(!Number.isSafeInteger(input.credits)||input.credits<500)
    hold("NONVIABLE_BUDGET");
  const url=String(process.env.DATABASE_URL??"");
  if(!/^postgres(ql)?:\/\//.test(url))hold("DATABASE_CREDENTIAL_ABSENT");
  stage="VERIFY_IMMUTABLE_COMMITTED_OWNER_READONLY";
  db=new pg.Client({connectionString:url,
    options:"-c default_transaction_read_only=on",
    connectionTimeoutMillis:8000,query_timeout:9000,
    application_name:"gate05_immutable_stop_handoff_readonly"});
  await db.connect();
  await db.query("BEGIN TRANSACTION READ ONLY");
  const rows=(await db.query(
    "SELECT state,airport_icao,source_commit,authorization_sha256,"+
    "reviewed_stop_ticket_sha256,start_at_utc,stop_at_utc,"+
    "alert_credit_ceiling,early_stop_credits,rest_api_units_ceiling,"+
    "provider_subscription_id FROM clean.phase3_gate05_science_owner_v39 "+
    "WHERE session_id=$1::uuid",[input.scope])).rows;
  await db.query("ROLLBACK");
  const o=rows[0];
  if(rows.length!==1||o.state!=="PREPARED"||
    o.airport_icao!=="WSSS"||o.source_commit!==input.receiver||
    o.authorization_sha256!==input.auth||
    o.reviewed_stop_ticket_sha256!==input.ticket||
    new Date(o.start_at_utc).toISOString()!==input.start||
    new Date(o.stop_at_utc).toISOString()!==input.stop||
    o.alert_credit_ceiling!==500||o.early_stop_credits!==350||
    o.rest_api_units_ceiling!==12||o.provider_subscription_id!==null)
    hold("POSTCOMMIT_NEW_SCOPE_NOT_EXACT");
  stage="GITHUB_MAIN_AND_EXISTING_STOP";
  const main=ghJson(["api","repos/"+REPO+"/git/ref/heads/main"]);
  if(main?.object?.sha!==input.runner)hold("MAIN_MOVED_NO_DISPATCH");
  const info=ghJson(["api","repos/"+REPO+"/actions/workflows/"+STOP]);
  if(info?.state!=="active")hold("STOP_WORKFLOW_NOT_ACTIVE");
  const current=ghJson(["run","list","--repo",REPO,"--workflow",STOP,
    "--limit","100","--json","displayTitle,headSha,event,status"]);
  if(!Array.isArray(current))hold("STOP_INVENTORY_UNAVAILABLE");
  const expectedTitle="Gate05 Science STOP "+input.scope;
  if(current.some(x=>x.displayTitle===expectedTitle&&
       x.headSha===input.runner&&x.event==="workflow_dispatch"))
    hold("PREVIOUS_IDENTICAL_STOP_DISPATCH_NO_RETRY");
  stage="DISPATCH_EXACT_INDEPENDENT_PROTECTED_STOP";
  dispatchAttempted=true;
  cli(["workflow","run",STOP,"--repo",REPO,"--ref","main",
    "-f","confirmation="+confirm,
    "-f","runner_sha="+input.runner,
    "-f","receiver_sha="+input.receiver,
    "-f","scope_id="+input.scope,
    "-f","authorization_sha256="+input.auth,
    "-f","stop_ticket_sha256="+input.ticket,
    "-f","start_utc="+input.start,
    "-f","stop_utc="+input.stop,
    "-f","starting_credits="+input.credits]);
  stage="RUN_EVENT_ACCEPTED_NOT_ARMED";
  const after=ghJson(["run","list","--repo",REPO,
    "--workflow",STOP,"--limit","100",
    "--json","displayTitle,headSha,event,status"]);
  watchRunFound=Array.isArray(after)&&after.some(x=>
    x.displayTitle===expectedTitle&&x.headSha===input.runner&&
    x.event==="workflow_dispatch");
  console.log(JSON.stringify({
    schema:"v39.gate05.next-science-scope-independent-stop-dispatch.v1",
    status:watchRunFound?
      "PROTECTED_INDEPENDENT_STOP_DISPATCHED_NOT_ARMED":
      "STOP_DISPATCH_ACCEPTED_RUN_NOT_YET_LISTED_NOT_ARMED",
    scopeId:input.scope,runnerSha:input.runner,
    startUtc:input.start,stopUtc:input.stop,
    independentStopRunVisible:watchRunFound,
    independentStopArmed:false,
    requiresProtectedSafetyReview:true,
    paidCreateAuthorized:false,paidControllerStarted:false,
    providerRequests:0,databaseWrites:0,sciencePassed:false
  }));
}catch{
  console.log(JSON.stringify({
    schema:"v39.gate05.next-science-scope-independent-stop-dispatch.v1",
    status:"STOP_DISPATCH_HOLD_NO_PAID_CREATE",stage,
    scopeId:input.scope,dispatchAttempted,
    doNotRetryAfterDispatchUncertainty:dispatchAttempted,
    independentStopArmed:false,paidControllerStarted:false,
    providerRequests:0,databaseWrites:0,sciencePassed:false
  }));
  process.exitCode=2;
}finally{
  if(db)await db.end().catch(()=>{});
}