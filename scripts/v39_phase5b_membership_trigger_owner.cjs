// Exact B0062 trigger hardening: no direct SOURCE membership mutation rights.
// Run only under authenticated neondb_owner. No provider, sequence advance,
// flight row or synthetic production insert. Actual trigger execution tested
// in disposable V0078 + V0079 restricted-login integration CI.
"use strict";
const {createRequire}=require("node:module"),{join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
const role="phase5_fids_source_prod_20261107";
const expected=`BEGIN
  IF NEW.source_type = 'fids' THEN
    INSERT INTO clean.population_research_membership
      (population_member_id,batch_id,source_airport_icao,source_airport_tier,
       window_start_utc,window_end_utc,cutoff_utc,query_direction,population_role,
       source_type,observed_via_webhook,created_at_utc)
    VALUES
      (NEW.population_member_id,NEW.batch_id,NEW.source_airport_icao,NEW.source_airport_tier,
       NEW.window_start_utc,NEW.window_end_utc,NEW.cutoff_utc,NEW.query_direction,NEW.population_role,
       'fids',NEW.observed_via_webhook,NEW.created_at)
    ON CONFLICT (population_member_id) DO NOTHING;
  END IF;
  RETURN NEW;
END`;
const norm=s=>String(s).trim().replace(/\s+/g," ");
const hold=s=>{throw Error(s)};
const emit=(status,o={})=>console.log(JSON.stringify({status,...o,providerCalls:0,paidReservations:0,flightDataWrites:0,workflowDispatches:0}));
let stage="CONNECT";
async function main(){
 const mode=process.argv[2];if(!["VERIFY_ONLY","APPLY_EXACT_EXISTING_MEMBERSHIP_TRIGGER_HARDENING"].includes(mode)||!process.env.DATABASE_URL)hold("EXACT_OWNER_MODE_REQUIRED");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();await c.query("BEGIN");await c.query("SET LOCAL lock_timeout='3s'");await c.query("SET LOCAL statement_timeout='15s'");
  stage="OWNER_IDENTITY";
  const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('server_version_num')::int ver")).rows[0];
  if(!id.db||!id.owner||!id.login||!id.primary||id.ver<160000||id.ver>=170000)hold("WRONG_OWNER_CONTEXT");
  const inspect=async()=>{
   const q=await c.query(`SELECT p.prosrc,p.prosecdef,p.proconfig,p.proowner=r.oid owner,p.prorettype='trigger'::regtype returns_trigger,l.lanname,
    (SELECT count(*)::int FROM pg_trigger t WHERE t.tgfoid=p.oid AND NOT t.tgisinternal) attached,
    EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgfoid=p.oid AND NOT t.tgisinternal AND t.tgrelid='clean.flight_population'::regclass AND t.tgname='trg_flight_population_research_membership' AND t.tgtype=5 AND t.tgenabled IN ('O','A')) exact_trigger,
    EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee<>0 AND a.grantee<>p.proowner AND a.privilege_type='EXECUTE') unexpected_execute,
    has_function_privilege($1,p.oid,'EXECUTE') source_execute,
    has_table_privilege($1,'clean.population_research_membership','INSERT') source_insert,
    has_any_column_privilege($1,'clean.population_research_membership','INSERT') source_column_insert,
    has_table_privilege($1,'clean.population_research_membership','UPDATE') source_update,
    has_table_privilege($1,'clean.population_research_membership','DELETE') source_delete
    FROM pg_proc p JOIN pg_roles r ON r.rolname=current_user JOIN pg_language l ON l.oid=p.prolang
    WHERE p.oid='clean.ensure_population_research_membership()'::regprocedure`,[role]);
   if(q.rowCount!==1)hold("EXACT_TRIGGER_FUNCTION_MISSING");
   const f=q.rows[0];
   if(norm(f.prosrc)!==norm(expected)||!f.owner||!f.returns_trigger||f.lanname!=="plpgsql"||f.attached!==1||!f.exact_trigger||f.unexpected_execute||f.source_insert||f.source_column_insert||f.source_update||f.source_delete)hold("UNEXPECTED_TRIGGER_BODY_OR_PRIVILEGES");
   return f;
  };
  stage="EXACT_TRIGGER_METADATA";
  const before=await inspect(), hardened=f=>f.prosecdef&&Array.isArray(f.proconfig)&&f.proconfig.length===1&&f.proconfig[0]==="search_path=pg_catalog, pg_temp"&&!f.source_execute;
  emit("P6_SOURCE_MEMBERSHIP_TRIGGER_BASELINE",{securityDefiner:before.prosecdef,sourceCanExecuteDirectly:before.source_execute,sourceDirectMembershipInsert:false,exactBodyAndSingleTrigger:true,alreadyHardened:hardened(before)});
  if(!hardened(before)){
   if(mode!=="APPLY_EXACT_EXISTING_MEMBERSHIP_TRIGGER_HARDENING")hold("MEMBERSHIP_TRIGGER_NOT_HARDENED");
   if(before.prosecdef||before.proconfig!==null)hold("UNREVIEWED_EXISTING_TRIGGER_SECURITY_CONTEXT");
   stage="ALTER_EXACT_TRIGGER_FUNCTION";
   await c.query("ALTER FUNCTION clean.ensure_population_research_membership() SECURITY DEFINER");
   await c.query("ALTER FUNCTION clean.ensure_population_research_membership() SET search_path TO pg_catalog, pg_temp");
   await c.query("REVOKE EXECUTE ON FUNCTION clean.ensure_population_research_membership() FROM PUBLIC");
  }
  stage="EXACT_TRIGGER_READBACK";
  if(!hardened(await inspect()))hold("EXACT_TRIGGER_HARDENING_READBACK_FAILED");
  stage="COMMIT";await c.query(mode==="VERIFY_ONLY"?"ROLLBACK":"COMMIT");
  emit("P6_SOURCE_MEMBERSHIP_TRIGGER_HARDENED",{changed:!hardened(before),sourceDirectMembershipInsert:false,sourceDirectTriggerExecute:false,exactBodyUnchanged:true,actualProductionTriggerExecutionProven:false});
 }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}finally{await c.end().catch(()=>{});}
}
main().catch(e=>{emit("P6_SOURCE_MEMBERSHIP_TRIGGER_HOLD",{stage,reason:/^[A-Z_]+$/.test(e?.message??"")?e.message:"DB_ERROR_REDACTED",sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??"")?e.code:null});process.exitCode=2;});
