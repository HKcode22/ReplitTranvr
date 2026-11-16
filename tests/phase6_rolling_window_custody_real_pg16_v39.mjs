/** Actual disposable PG16; the exact B0062 authorization DDL is reused.
 * No production DB, secrets, GitHub dispatch or provider requests. */
import pg from "pg";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {claimP6RollingWindowOnce} from "../server/lib/disruption/phase6RollingWindowClaimBridge_v39.mjs";
import assert from "node:assert/strict";
const URL="postgresql://postgres:postgres@127.0.0.1:5432/neondb?sslmode=disable";
if(process.env.GITHUB_ACTIONS!=="true"||process.env.P6_WINDOW_DISPOSABLE_PG16!=="1"||
 process.env.P6_WINDOW_TEST_URL!==URL||process.env.DATABASE_URL||process.env.V39_DATABASE_RUNTIME_URL||
 process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.V39_PHASE6_OWNER_APPROVED!=="0"||
 process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.GITHUB_TOKEN)
 throw Error("HOLD_P6_WINDOW_NOT_LOCAL_DISPOSABLE_NO_PROVIDER");
const clients=await Promise.all(Array.from({length:4},async()=>{
 const c=new pg.Client({connectionString:URL,connectionTimeoutMillis:5000,query_timeout:15000});await c.connect();return c;
}));
const [owner,other,restricted,readbackAnother]=clients;
const h=x=>x.repeat(64),code="d".repeat(40),manifest=h("a"),calendar=h("b"),config=h("c");
const migration=readFileSync("migrations/staged/V0102__phase6_rolling_window_custody_owner_inert_v39.sql","utf8");
const base=readFileSync("migrations/baseline/B0062__v39_schema_baseline_20261001.sql","utf8");
const ddl=/CREATE TABLE clean\.adb_phase6_authorization \([\s\S]*?\n\);/.exec(base)?.[0];
assert(ddl,"missing exact B0062 authorization table");
const query="SELECT * FROM clean.phase6_claim_rolling_window_v39($1,$2,$3,$4,$5,$6,$7,$8,$9)";
const close="SELECT clean.phase6_close_rolling_window_v39($1,$2,$3,$4,$5,$6) AS ok";
const table="clean.phase6_rolling_window_custody_v39";
try {
 const meta=(await owner.query("SELECT current_database() db,current_setting('server_version_num')::int n,inet_server_addr()::text addr")).rows[0];
 assert.equal(meta.db,"neondb");assert.equal(Math.floor(meta.n/10000),16);
 assert(["127.0.0.1/32","127.0.0.1","::1/128","::1"].includes(meta.addr)||/^172\./.test(meta.addr),"not local CI service");
 await owner.query("CREATE ROLE neondb_owner NOLOGIN CREATEROLE; CREATE ROLE p6_window_restricted_ci NOLOGIN; CREATE SCHEMA clean AUTHORIZATION neondb_owner; GRANT USAGE ON SCHEMA clean TO p6_window_restricted_ci");
 await owner.query("SET ROLE neondb_owner");await other.query("SET ROLE neondb_owner");
 await owner.query(ddl+" ALTER TABLE clean.adb_phase6_authorization ADD CONSTRAINT adb_phase6_authorization_pkey PRIMARY KEY(singleton_key)");
 await owner.query(migration);
 // Real non-superuser test logins only in disposable CI. The migration
 // itself installed no member or live policy binding. No production URL.
 await owner.query("RESET ROLE");
 await owner.query("CREATE ROLE phase6_rolling_claim_ci_test LOGIN INHERIT PASSWORD 'ci-only-window'; CREATE ROLE phase6_rolling_claim_ci_wrong LOGIN INHERIT PASSWORD 'ci-only-wrong'; GRANT phase6_rolling_window_claimant_v39 TO phase6_rolling_claim_ci_test,phase6_rolling_claim_ci_wrong WITH ADMIN FALSE, INHERIT TRUE, SET FALSE");
 await owner.query("ALTER ROLE neondb_owner NOCREATEROLE; SET ROLE neondb_owner");
 const login="phase6_rolling_claim_ci_test",wrongLogin="phase6_rolling_claim_ci_wrong";
 async function loginClient(name,password){
  const u=new URL(URL);u.username=name;u.password=password;
  const x=new pg.Client({connectionString:u.href,connectionTimeoutMillis:5000,query_timeout:15000});
  await x.connect();clients.push(x);return x;
 }
 const [claim1,claim2,read1,read2,wrong]=await Promise.all([
  loginClient(login,"ci-only-window"),loginClient(login,"ci-only-window"),
  loginClient(login,"ci-only-window"),loginClient(login,"ci-only-window"),
  loginClient(wrongLogin,"ci-only-wrong")]);
 const boundQuery=query.replace("phase6_claim_rolling_window_v39","phase6_claim_bound_rolling_window_v39");
 const readBound="SELECT * FROM clean.phase6_read_bound_rolling_window_v39($1,$2)";
 const clock=Math.floor(new Date((await owner.query("SELECT clock_timestamp() n")).rows[0].n).getTime()/1000)*1000;
 const from=new Date(clock-3*3600000),until=new Date(clock+45*86400000);
 const iso=n=>new Date(n).toISOString(),hash=b=>createHash("sha256").update(b).digest("hex");
 const plans=new Map(),dayPins=[];
 const trust={reviewedCodeSha:code,manifestSha256:manifest,calendarSha256:calendar,releaseSha256:h("e"),rightsSha256:h("f")};
 for(let i=1;i<=31;i++){
  const start=clock+i*86400000,templates=[];
  for(const [horizon,off] of [["T-24h",86400000],["T-6h",21600000],["T-90m",5400000]])for(let slot=0;slot<4;slot++)
   templates.push({queryKey:"d"+i+"."+horizon+"."+slot,runDayIndex:i,horizon,serviceWindowStartUtc:iso(start),
    serviceWindowEndUtc:iso(start+14400000),earliestPlannedCutoffUtc:iso(start-off),scheduledRequestUtc:iso(start-off-900000)});
  const bytes=Buffer.from(JSON.stringify({schema:"v39.phase6.reviewed-future-day-source-plan.v1",runDayIndex:i,
   expectedServiceStartUtc:iso(start),templates}));
  plans.set("data-collection/phase5/planning/phase6-source-day-"+String(i).padStart(2,"0")+".json",bytes);
  dayPins.push({runDayIndex:i,sha256:hash(bytes)});
 }
 const policyBytes=Buffer.from(JSON.stringify({schema:"v39.phase6.delegated-daily-source-review-policy.v1",delegatedDailyPacketProductionApproved:true,
  approvedCodeSha:code,manifestSha256:manifest,calendarSha256:calendar,releaseSha256:trust.releaseSha256,rightsSha256:trust.rightsSha256,
  dayPlanSha256s:dayPins,validFromUtc:from.toISOString(),validUntilUtc:until.toISOString()}));
 const policy=hash(policyBytes),args=root=>["AUTH-CI",manifest,calendar,config,code,policy,from,until,root];
 const input=root=>({separateOwnerWindowCustodyReviewApproved:true,authorizationId:"AUTH-CI",rootRunId:root,configSha256:config,
  trust,policyBytes,expectedPolicySha256:policy,readPlan:p=>plans.get(p)});

 await owner.query(`INSERT INTO clean.adb_phase6_authorization
 (authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,schema_version,phase6_start_date,
 alert_cap_per_parent_day,unsettled_burst_margin_credits,protected_alert_floor,predecessor_evidence_ids)
 VALUES('AUTH-CI',$1,$2,$3,$4,'CI',current_date,1900,0,1000,'["synthetic"]')`,[manifest,calendar,config,code]);
 await assert.rejects(owner.query(query,args(1001)),/EXISTING_AUTHORIZATION_HOLD/);
 await owner.query("UPDATE clean.adb_phase6_authorization SET enabled=true");
 await assert.rejects(claim1.query(boundQuery,args(1001)),/EXACT_OWNER_POLICY_BINDING_REQUIRED/);
 await owner.query(`INSERT INTO clean.phase6_rolling_policy_binding_v39
 (manifest_sha256,authorization_id,calendar_sha256,config_sha256,code_sha,policy_sha256,policy_from_utc,policy_until_utc,expected_session_login,independent_review_sha256)
 VALUES($1,'AUTH-CI',$2,$3,$4,$5,$6,$7,$8,$9)`,[manifest,calendar,config,code,policy,from,until,login,h("9")]);
 await assert.rejects(wrong.query(boundQuery,args(1001)),/EXACT_OWNER_POLICY_BINDING_REQUIRED/);
 await assert.rejects(claim1.query(boundQuery,["AUTH-CI",manifest,calendar,config,code,h("0"),from,until,1001]),/EXACT_OWNER_POLICY_BINDING_REQUIRED/);
 await assert.rejects(claim1.query(readBound,[1001,manifest]),/RESTRICTED_READONLY_SESSION_HOLD/);
 for(const q of [()=>claim1.query(query,args(1001)),()=>claim1.query("SELECT * FROM "+table),
  ()=>claim1.query("SELECT * FROM clean.phase6_rolling_policy_binding_v39"),
  ()=>claim1.query("UPDATE clean.adb_phase6_authorization SET enabled=false"),
  ()=>claim1.query("DELETE FROM "+table),()=>claim1.query(close,[manifest,1,1001,1001,h("1"),h("2")])])
  await assert.rejects(q(),/permission denied/);
 await assert.rejects(owner.query(query,[...args(1001).slice(0,4),"0".repeat(40),...args(1001).slice(5)]),/EXISTING_AUTHORIZATION_HOLD/);
 await assert.rejects(owner.query(query,["AUTH-CI",manifest,calendar,config,code,policy,new Date(clock+10000),until,1001]),/OUTSIDE_POLICY/);
 await assert.rejects(owner.query(query,["AUTH-CI",manifest,calendar,config,code,policy,new Date(clock-110*60000),until,1001]),/TOO_LATE_NO_BACKFILL/);
 await restricted.query("SET ROLE p6_window_restricted_ci");
 for(const q of [()=>restricted.query(query,args(1001)),()=>restricted.query("SELECT * FROM "+table),
  ()=>restricted.query(close,[manifest,1,1001,1001,h("1"),h("2")])])await assert.rejects(q(),/permission denied/);
 console.log("V0102_OWNER_ONLY_STOP_AND_CLOCK_GATES_PASS");
 // Simulate the immutable previous-window record from earlier valid
 // ownership. Only the disposable owner can insert this historical fixture;
 // never use this procedure to invent prior live collection evidence.
 await owner.query(`INSERT INTO ${table}(manifest_sha256,authorization_id,calendar_sha256,config_sha256,
 release_code_sha,policy_sha256,policy_from_utc,policy_until_utc,window_index,window_start_utc,window_end_utc,root_run_id,claimed_at_utc)
 VALUES($1,'AUTH-CI',$2,$3,$4,$5,$6,$7,0,$6::timestamptz,$6::timestamptz+interval '2 hours',999,$6::timestamptz+interval '1 minute')`,
 [manifest,calendar,config,code,policy,from,until]);
 await assert.rejects(owner.query(query,args(1001)),/PRIOR_ROOT_UNRESOLVED_NO_REPLAY/);
 await assert.rejects(owner.query(close,[manifest,0,998,999,h("1"),h("2")]),/NO_EXACT_OPEN_ROOT/);
 // STOP must still allow known-root reconciliation (not new collection).
 await owner.query("UPDATE clean.adb_phase6_authorization SET enabled=false,revoked_at_utc=clock_timestamp()");
 assert.equal((await owner.query(close,[manifest,0,999,999,h("1"),h("2")])).rows[0].ok,true);
 await assert.rejects(owner.query(close,[manifest,0,999,999,h("1"),h("2")]),/NO_EXACT_OPEN_ROOT/);
 await assert.rejects(owner.query(query,args(1001)),/EXISTING_AUTHORIZATION_HOLD/);
 await owner.query("UPDATE clean.adb_phase6_authorization SET enabled=true,revoked_at_utc=NULL");
 await assert.rejects(owner.query(query,["AUTH-CI",manifest,calendar,config,code,h("f"),from,until,1001]),/IMMUTABLE_STUDY_SCOPE_DRIFT/);
 // A simulated lost COMMIT acknowledgment must not query a second
 // writer or re-enter the claim. The following actual race separately
 // exercises real PostgreSQL transactions and four distinct backends.
 const noReplayCalls=[],neverRead={query:async()=>assert.fail("readback must not mint dispatch after unknown COMMIT")};
 const fakeClaim={query:async(s)=>{
  noReplayCalls.push(s);
  if(s.startsWith("BEGIN"))return {};
  if(s.startsWith("SELECT current_database"))return {rowCount:1,rows:[{db:"neondb",actor:"neondb_owner",session_actor:"neondb_owner",
   version:160016,replica:false,ro:"off",isolation:"read committed",pid:999,db_clock:new Date(clock)}]};
  if(s.startsWith("SELECT window_index"))return {rowCount:1,rows:[{window_index:1,window_start_utc:new Date(from.getTime()+7200000),
   window_end_utc:new Date(from.getTime()+14400000),claimed_at_utc:new Date(clock+1),claimed_at_exact:iso(clock+1).replace(".001Z",".001000Z")}]};
  if(s==="COMMIT")throw Error("synthetic lost acknowledgment");
  assert.fail("unexpected retry or rollback");
 }};
 await assert.rejects(claimP6RollingWindowOnce(input(1001),{claimClient:fakeClaim,readbackClient:neverRead}),/COMMIT_UNKNOWN_NO_REPLAY/);
 assert.equal(noReplayCalls.length,4);
 await assert.rejects(claimP6RollingWindowOnce({...input(1001),expectedPolicySha256:h("0")},{claimClient:neverRead,readbackClient:fakeClaim}),/MISSING_EXACT_REVIEWED_POLICY/);
 const narrowInput=root=>({...input(root),expectedClaimantSessionLogin:login,separateRestrictedWindowCustodyReviewApproved:true});
 const concurrent=await Promise.allSettled([
  claimP6RollingWindowOnce(narrowInput(1001),{claimClient:claim1,readbackClient:read1}),
  claimP6RollingWindowOnce(narrowInput(1002),{claimClient:claim2,readbackClient:read2})
 ]);
 assert.equal(concurrent.filter(x=>x.status==="fulfilled").length,1);
 assert.equal(concurrent.filter(x=>x.status==="rejected"&&/PRIOR_ROOT_UNRESOLVED_NO_REPLAY/.test(x.reason.message)).length,1);
 const accepted=concurrent[0].status==="fulfilled"?1001:1002;
 const winner=concurrent.find(x=>x.status==="fulfilled").value;assert.equal(winner.windowIndex,1);
 assert.equal(new Date(winner.windowStartUtc).getTime(),from.getTime()+2*3600000);
 assert.equal(new Date(winner.windowEndUtc).getTime(),from.getTime()+4*3600000);
 assert.equal(winner.rootRunId,accepted);assert.equal(winner.actualDbClock,true);assert.equal(winner.independentConnection,true);
 assert.equal(winner.restrictedFunctionOnly,true);
 await wrong.query("BEGIN READ ONLY");
 assert.equal((await wrong.query(readBound,[accepted,manifest])).rowCount,0);
 await wrong.query("ROLLBACK");
 await read1.query("BEGIN READ ONLY");
 assert.equal((await read1.query(readBound,[accepted,h("0")])).rowCount,0);
 await read1.query("ROLLBACK");
 console.log("V0102_ACTUAL_SCOPED_LOGIN_POLICY_PIN_FUNCTION_ONLY_NO_CLOSE_CROSS_LOGIN_READ_DENIED=PASS");
 assert.equal(winner.operationalCustodyWrites,1);assert.equal(winner.permitDispatch,false);assert.equal(winner.phase6PaidGo,false);
 assert.equal(winner.policyCommitment,hash(JSON.stringify({policySha256:policy,...trust})));
 console.log("V0102_EXACT_POLICY_REAL_COMMIT_DISTINCT_CONNECTION_READBACK_AND_UNKNOWN_COMMIT_NO_REPLAY=PASS");
 assert.equal((await owner.query("SELECT count(*)::int n FROM "+table+" WHERE closed_at_utc IS NULL")).rows[0].n,1);
 await assert.rejects(other.query(query,args(accepted)),/PRIOR_ROOT_UNRESOLVED_NO_REPLAY/);
 assert.equal((await owner.query(close,[manifest,1,accepted,accepted,h("3"),h("4")])).rows[0].ok,true);
 await assert.rejects(other.query(query,args(1003)),/WINDOW_ALREADY_OWNED_OR_OVERLAP/);
 assert.equal((await owner.query("SELECT count(*)::int n FROM "+table)).rows[0].n,2);
 await owner.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
 await assert.rejects(owner.query(query,args(1003)),/OWNER_READ_COMMITTED_REQUIRED/);await owner.query("ROLLBACK");
 await assert.rejects(owner.query(migration),/ALREADY_INSTALLED/);await owner.query("ROLLBACK");
 console.log("V0102_EXPIRED_UNRESOLVED_HOLD_EXACT_CLOSURE_NEXT_WINDOW_CONCURRENT_SINGLE_WINNER_DUPLICATE_REFUSAL=PASS");
 console.log("P6_V0102_ACTUAL_DISPOSABLE_PG16_PASS_NO_PRODUCTION_NO_PROVIDER_NO_DISPATCH_NO_PAID_GO");
}finally{await Promise.allSettled(clients.map(c=>c.end()));}
