/**
 * Phase5 Stage16b: production READ-ONLY PostgreSQL catalog reality check.
 * Distinguishes V0079 tables ABSENT from catalog PRESENT but unavailable
 * through the current Replit role/search path/permissions.
 *
 * NO source flight rows / raw FIDS payloads, provider key, HTTP,
 * grants, migration, DDL, INSERT, UPDATE or DELETE. Never prints secrets,
 * DATABASE_URL, PostgreSQL role names or record-level identifiers.
 */
import pg from "pg";
const {Pool}=pg;
const TABLES=[
 "phase5_fids_cycle_budget_v39",
 "phase5_fids_day_budget_v39",
 "phase5_fids_utc_charge_budget_v39",
 "phase5_fids_allowed_query_v39",
 "phase5_fids_physical_attempt_v39",
 "phase5_fids_original_binding_v39"
];
export const P5_V0079_CATALOG_SQL=[
 "SELECT c.relname AS name,",
 "has_table_privilege(current_user,c.oid,'SELECT') AS may_select,",
 "has_table_privilege(current_user,c.oid,'INSERT') AS may_insert,",
 "has_table_privilege(current_user,c.oid,'UPDATE') AS may_update,",
 "has_table_privilege(current_user,c.oid,'DELETE') AS may_delete,",
 "to_regclass(format('%I.%I',n.nspname,c.relname)) IS NOT NULL",
 " AS resolvable_by_fully_qualified_name",
 "FROM pg_catalog.pg_class c",
 "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace",
 "WHERE n.nspname='clean' AND c.relkind IN ('r','p')",
 " AND c.relname=ANY($1::text[]) ORDER BY c.relname"
].join(" ");
const hold=(name)=>{throw Error("REFUSED_P5_V0079_CATALOG_"+name);};
export async function auditP5V0079CatalogReadonly(pool){
 if(!pool||typeof pool.connect!=="function")hold("NO_DB");
 const c=await pool.connect();let opened=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  opened=true;
  await c.query("SET LOCAL statement_timeout='8000ms'");
  await c.query("SET LOCAL lock_timeout='1000ms'");
  const top=(await c.query(
   "SELECT current_database() AS db,"+
   "current_setting('transaction_read_only') AS ro,"+
   "has_schema_privilege(current_user,'clean','USAGE') AS schema_usage,"+
   "clock_timestamp() AS at")).rows[0];
  if(top?.ro!=="on"||top?.db!=="neondb"||!top.at)
   hold("RESTRICTED_READ_ONLY_DB_NOT_VERIFIED");
  const clock=new Date(top.at);
  if(!Number.isFinite(clock.getTime()))hold("INVALID_DB_CLOCK");
  const rs=await c.query(P5_V0079_CATALOG_SQL,[TABLES]);
  if(!Array.isArray(rs.rows)||rs.rows.length>TABLES.length)
   hold("INCONSISTENT_PG_CATALOG");
  const map=new Map(rs.rows.map(r=>[r.name,r]));
  if(rs.rows.some(r=>!TABLES.includes(r.name)))
   hold("CROSS_SCHEMA_OR_UNEXPECTED_CATALOG");
  const tables=TABLES.map(name=>{
   const row=map.get(name);
   return {
    table:name,
    presentInPgCatalog:Boolean(row),
    resolvesForCurrentRole:row?.resolvable_by_fully_qualified_name===true,
    selectPrivilege:row?.may_select===true,
    insertPrivilege:row?.may_insert===true,
    updatePrivilege:row?.may_update===true,
    deletePrivilege:row?.may_delete===true
   };
  });
  const catalogCount=tables.filter(t=>t.presentInPgCatalog).length;
  const privilegesOK=top.schema_usage===true&&
   tables.every(x=>x.presentInPgCatalog&&x.resolvesForCurrentRole);
  await c.query("COMMIT");opened=false;
  return {
   schema:"v39.phase5.stage16b.v0079-current-role-pg-catalog-readonly.v1",
   status:"PG_CATALOG_INDEPENDENT_TABLE_EXISTENCE_INSPECTED_NOT_RELEASE",
   observedAtUtc:clock.toISOString(),
   expectedDatabaseMatched:true,
   transactionReadOnlyVerified:true,
   currentRoleHasCleanSchemaUsage:top.schema_usage===true,
   v0079CatalogTableCount:catalogCount,
   v0079CatalogAllSixPresent:catalogCount===TABLES.length,
   v0079AllSixResolvableForCurrentRole:privilegesOK,
   tables,
   possibleCause:catalogCount===0?
    "V0079_SIX_TABLES_PHYSICALLY_ABSENT_IN_THIS_DATABASE":
    catalogCount<TABLES.length?
    "V0079_PARTIAL_SCHEMA_OR_ROLLOUT_HOLD":
    !privilegesOK?
    "V0079_CATALOG_PRESENT_BUT_ROLE_USAGE_OR_RESOLUTION_LIMITED":
    "SIX_TABLES_PRESENT_STILL_NO_ACL_OR_SCIENTIFIC_RELEASE",
   productionInstallAuthorized:false,
   sourceUseRightsCertified:false,
   threeHorizonProspectivePRECertified:false,
   observedScientificFlightRecords:0,
   providerCalls:0,providerFidsGets:0,alertCreates:0,
   databaseWrites:0,githubMutations:0,phase5FreezePassed:false,phase6PaidGo:false
  };
 }catch(e){
  if(opened)await c.query("ROLLBACK").catch(()=>{});
  throw e;
 }finally{c.release();}
}
async function run(){
 let pool;
 try{
  if(typeof process.env.DATABASE_URL!=="string"||!process.env.DATABASE_URL)
   hold("DATABASE_URL_MISSING");
  pool=new Pool({
   connectionString:process.env.DATABASE_URL,max:1,
   connectionTimeoutMillis:8000,idleTimeoutMillis:3000
  });
  console.log(JSON.stringify(await auditP5V0079CatalogReadonly(pool),null,2));
 }catch{
  console.log("HOLD_PHASE5_V0079_CATALOG_READONLY_METADATA_UNAVAILABLE");
  process.exitCode=2;
 }finally{
  await pool?.end().catch(()=>{});
 }
}
if(process.env.P5_V0079_CATALOG_ONCE==="1")await run();
