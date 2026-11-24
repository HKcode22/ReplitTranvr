"use strict";
// Exact Stage9 permission repair; no policy, provider, schedule or migration mutations.
// Owner-only, transactionally revoke ONLY forbidden direct grants to the existing
// PREPARE NOLOGIN group. Never revoke from PUBLIC or another role, never CASCADE.
const {Client}=require("pg");
const {execFileSync}=require("node:child_process");
const R="HKcode22/ReplitTranvr",RELAY="HKcode22/TravnrClockRelay";
const MAIN="9c9cddb1aaeb04934d94af2937ee158e6d991f6c";
const M="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e";
const ROLE="phase5_fids_prepare_prod_20261107";
const forbidden=[
 ["phase5_fids_allowed_query_v39",["UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_exact_query_partition_v39",["UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_seven_rest_release_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_cycle_rest_category_cap_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_utc_rest_category_budget_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_cycle_budget_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_day_budget_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_utc_charge_budget_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_physical_attempt_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["phase5_fids_original_binding_v39",["INSERT","UPDATE","DELETE","TRUNCATE"]],
 ["fids_query_response",["SELECT","INSERT","UPDATE","DELETE"]],
 ["flight_population",["SELECT","INSERT","UPDATE","DELETE"]]
].flatMap(([t,ps])=>ps.map(p=>({t:"clean."+t,p})));
const need=(ok,msg)=>{if(!ok)throw Error("HOLD_P6_STAGE9_ACL_"+msg)};
const gh=(args)=>execFileSync("gh",args,{encoding:"utf8",timeout:30000,stdio:["ignore","pipe","pipe"]}).trim();
async function run(){
 const mode=process.argv[2];need(process.argv.length===3&&["VERIFY_ONLY","REPAIR_EXACT_DIRECT_FORBIDDEN_GRANTS_NO_PROVIDER"].includes(mode),"MODE");
 const apply=mode!=="VERIFY_ONLY";
 need(gh(["api","user","--jq",".login"])==="HKcode22","OWNER");
 need(gh(["api","repos/"+R+"/git/ref/heads/main","--jq",".object.sha"])===MAIN,"MAIN");
 need(gh(["variable","get","TRAVNR_RELAY_ROLLING_ENABLED","-R",RELAY])==="0","ROLLING_NOT_PAUSED");
 need(gh(["variable","get","P6_NONPAID_SOURCE_SCHEDULE_ENABLED","-R",R])==="false","SOURCE_SCHEDULE_NOT_PAUSED");
 need(!!process.env.DATABASE_URL,"MISSING_OWNER_DATABASE_URL");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 await c.connect();let tx=false;
 try{
 await c.query(apply?"BEGIN ISOLATION LEVEL SERIALIZABLE":"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
 await c.query("SET LOCAL statement_timeout='15000ms'; SET LOCAL lock_timeout='3000ms'");
 const a=(await c.query("SELECT current_user actor,session_user login,current_database() db,pg_is_in_recovery() replica,current_setting('server_version_num')::int ver,clock_timestamp() now,(SELECT enabled AND revoked_at_utc IS NULL FROM clean.adb_phase6_authorization WHERE singleton_key=true AND manifest_sha256=$1) auth,(SELECT count(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) source,(SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) rest,(SELECT count(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) stops,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) d1,(SELECT count(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) d2,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=2 AND daily_api_ceiling=384) d2budget,(SELECT count(*)::int FROM clean.phase5_fids_allowed_query_v39 WHERE manifest_sha256=$1 AND run_day_index=1) d1queries,(SELECT count(*)::int FROM clean.phase5_fids_day_budget_v39 WHERE manifest_sha256=$1 AND run_day_index=1) d1budget,(SELECT count(*)::int FROM phase6_private.signed_run_day_epoch_claim_v39 WHERE run_day_index=1) claims,(SELECT count(*)::int FROM phase6_private.signed_run_day_index_revision_v39 WHERE run_day_index=1) indexes", [M])).rows[0];
 const roles=(await c.query("SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=$1",[ROLE])).rows;
 need(a.db==="neondb"&&a.actor==="neondb_owner"&&a.login===a.actor&&a.replica===false&&a.ver>=160000&&a.ver<170000&&roles.length===1&&Object.values(roles[0]).every(x=>x===false),"OWNER_OR_ROLE_IDENTITY");
 const probe=async()=> {
 const p=await c.query("SELECT t,p,has_table_privilege($1,t,p) AS allowed FROM unnest($2::text[],$3::text[]) AS x(t,p)",[ROLE,forbidden.map(x=>x.t),forbidden.map(x=>x.p)]);
 return p.rows.filter(x=>x.allowed!==false);
 };
 const necessary=async()=> (await c.query("SELECT has_table_privilege($1,'clean.phase5_fids_allowed_query_v39','INSERT') qi,has_table_privilege($1,'clean.phase5_fids_exact_query_partition_v39','INSERT') pi,has_function_privilege($1,'clean.bind_phase5_prospective_parent_source_budget_v39(text,integer,text,integer)','EXECUTE') binder,to_regprocedure('clean.p6_day1_later_source_exception_v39(clean.phase5_fids_allowed_query_v39,timestamptz)') IS NOT NULL exception",[ROLE])).rows[0];
 const bad=await probe(), required=await necessary();
 const sources=[];
 for(const x of bad){
 const rows=(await c.query("SELECT CASE WHEN acl.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END AS grantee,pg_get_userbyid(acl.grantor) AS grantor,acl.is_grantable FROM pg_class cls CROSS JOIN LATERAL aclexplode(COALESCE(cls.relacl,acldefault('r',cls.relowner))) acl WHERE cls.oid=$1::regclass AND acl.privilege_type=$2 AND (CASE WHEN acl.grantee=0 THEN true ELSE pg_has_role($3,acl.grantee,'USAGE') END)",[x.t,x.p,ROLE])).rows;
 sources.push({table:x.t,privilege:x.p,sources:rows});
 }
 console.log(JSON.stringify({status:"P6_STAGE9_EXACT_OWNER_ACL_CENSUS",...a,required,forbidden:sources,providerCalls:0}));
 if(!apply){await c.query("ROLLBACK");tx=false;return;}
 need(a.auth===true&&a.source===0&&a.rest===0&&a.stops===0&&a.d1===4&&a.d2===4&&a.d2budget===1&&a.d1queries===0&&a.d1budget===0&&a.claims===0&&a.indexes===0,"HISTORY_CHANGED");
 need(Date.parse(a.now)<Date.parse("2026-11-24T17:25:00Z"),"DEADLINE");
 const draws=(await c.query("SELECT slot_id,selected_icao FROM clean.adb_sampling_draw WHERE run_day_index=1 ORDER BY slot_id")).rows;
 const expected={HUB:"OMAA",MID_A:"OMSJ",MID_B:"SPJC",REGIONAL:"KDEC"};
 need(draws.length===4&&new Set(draws.map(x=>x.slot_id)).size===4&&draws.every(x=>expected[x.slot_id]===x.selected_icao),"FIXED_DRAW");
 need(Object.values(required).every(x=>x===true),"REQUIRED_ACCESS_MISSING");
 need(sources.every(x=>x.sources.length===1&&x.sources[0].grantee===ROLE&&x.sources[0].grantor===a.actor&&x.sources[0].is_grantable===false),"NOT_EXCLUSIVELY_DIRECT_OWNER_GRANTS_NO_CHANGE");
 for(const x of bad)await c.query("REVOKE "+x.p+" ON TABLE "+x.t+" FROM "+ROLE+" RESTRICT");
 need((await probe()).length===0&&Object.values(await necessary()).every(x=>x===true),"POST_REPAIR_ACL");
 await c.query("COMMIT");tx=false;
 console.log(JSON.stringify({status:"P6_STAGE9_EXACT_DIRECT_ACL_REPAIR_COMMIT_NO_PROVIDER",revoked:bad.map(x=>({table:x.t,privilege:x.p})),drawsPreserved:4,day2BudgetPreserved:true,providerCalls:0,phase6PaidGo:false}));
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});await c.end();}
}
run().catch(e=>{console.error(/^HOLD_P6_STAGE9_ACL_/.test(e.message)?e.message:"HOLD_P6_STAGE9_ACL_SQL_"+(e.code||"UNKNOWN"));process.exitCode=1;});
