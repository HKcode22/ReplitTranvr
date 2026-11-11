/**
 * Phase5 C+D owner-only ALL USER SCHEMAS metadata inventory.
 *
 * This complements, never replaces, the existing scoped Phase5 catalog,
 * Stage16b V0079 and final prelaunch read-only inventory scripts.
 * Lists ONLY catalog table/column/index/role/trigger metadata. It does not
 * query a source flight, provider body, population row, budget spend, key,
 * API, FIDS, or Alert. Never print DATABASE_URL or SQL error message.
 *
 * Fail-closed: neondb PostgreSQL16 primary; REPEATABLE READ READ ONLY;
 * bounded schemas/tables/columns/candidates/roles; no DDL/SQL writes.
 * Role names/index definitions are account schema metadata: keep stdout
 * private in the owner's Replit session; do not upload to public Actions.
 */
import "dotenv/config";
import pg from "pg";
const {Client}=pg;
const MAX_TABLES=500,MAX_COLUMNS=10000,MAX_INDEXES=1500,MAX_ROLES=160;
const TASK_WORD=/(?:^|_)(?:task|tasks|queue|queues|lease|leases|claim|claims|worker|workers|work_item|work_items|dispatch|job|jobs|handoff|pending)(?:_|$)/;
const OWNER_WORD=/(?:owner|worker|claimed_by|consumer|leased_by)/;
const LEASE_WORD=/(?:lease|fence|generation|claim|expires_at)/;
const STATUS_WORD=/(?:^|_)(?:status|state)(?:_|$)/;
const FLIGHT_WORD=/(?:flight_instance_id|flight_id|flight_key|flight_identity|horizon)/;
const hold=()=>{throw Error("HOLD_P5_CD_ALL_SCHEMA_METADATA_NO_WRITES");};
const cleanName=s=>typeof s==="string"&&/^[A-Za-z_][A-Za-z0-9_]{0,125}$/.test(s);
function regularName(name){
 return cleanName(name)&&!name.startsWith("pg_")&&name!=="information_schema";
}
/** Pure, intentionally not a proof that the table is a reusable queue. */
export function classifyP5CDTaskCatalogCandidate(schema,table,columns){
 if(!regularName(schema)||!cleanName(table)||
    !Array.isArray(columns)||columns.length>350||
    columns.some(c=>!cleanName(c)))hold();
 const isNamed=TASK_WORD.test(table);
 const hasOwner=columns.some(c=>OWNER_WORD.test(c));
 const hasLease=columns.some(c=>LEASE_WORD.test(c));
 const hasStatus=columns.some(c=>STATUS_WORD.test(c));
 const hasFlight=columns.some(c=>FLIGHT_WORD.test(c));
 const signals=[
  ...(isNamed?["task_named_table"]:[]),
  ...(hasOwner?["owner_field"]:[]),
  ...(hasLease?["lease_or_fence_field"]:[]),
  ...(hasStatus?["state_field"]:[]),
  ...(hasFlight?["flight_or_horizon_field"]:[])
 ];
 return{
  schema,table,signals,
  candidate:isNamed||(hasOwner&&hasLease&&hasStatus&&hasFlight),
  actuallyConfirmedReusableQueue:false
 };
}
const scopeSql=`
SELECT n.nspname AS schema_name,c.relname AS table_name,
       c.oid AS relation_oid
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p')
  AND n.nspname NOT IN ('information_schema','pg_catalog')
  AND n.nspname !~ '^pg_'
ORDER BY n.nspname,c.relname
LIMIT 501
`;
const colsSql=`
SELECT n.nspname AS schema_name,c.relname AS table_name,
       a.attname AS column_name
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
WHERE c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped
  AND n.nspname NOT IN ('information_schema','pg_catalog')
  AND n.nspname !~ '^pg_'
ORDER BY n.nspname,c.relname,a.attnum
LIMIT 10001
`;
const indexSql=`
SELECT n.nspname AS schema_name,c.relname AS table_name,
       ic.relname AS index_name,ix.indisunique AS is_unique,
       pg_catalog.pg_get_indexdef(ix.indexrelid) AS index_definition
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_index ix ON ix.indrelid=c.oid
JOIN pg_catalog.pg_class ic ON ic.oid=ix.indexrelid
WHERE c.oid=ANY($1::oid[])
ORDER BY n.nspname,c.relname,ic.relname
LIMIT 1501
`;
const rolesSql=`
SELECT r.rolname AS role_name,r.rolcanlogin AS can_login,
       r.rolsuper AS is_superuser,
       pg_catalog.has_table_privilege(r.oid,'clean.flight_snapshots','INSERT')
         AS can_insert_snapshots,
       pg_catalog.has_table_privilege(r.oid,'clean.flight_snapshots','UPDATE')
         AS can_update_snapshots,
       pg_catalog.has_table_privilege(r.oid,'clean.flight_snapshots','DELETE')
         AS can_delete_snapshots,
       pg_catalog.has_table_privilege(r.oid,'clean.flight_snapshots','TRIGGER')
         AS can_manage_snapshot_triggers
FROM pg_catalog.pg_roles r
WHERE pg_catalog.has_table_privilege(r.oid,'clean.flight_snapshots','INSERT')
   OR pg_catalog.has_table_privilege(r.oid,'clean.flight_snapshots','TRIGGER')
ORDER BY r.rolname
LIMIT 161
`;
const triggersSql=`
SELECT t.tgname AS trigger_name,t.tgenabled AS trigger_enabled,
       fnn.nspname AS function_schema,fn.proname AS function_name
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
JOIN pg_catalog.pg_proc fn ON fn.oid=t.tgfoid
JOIN pg_catalog.pg_namespace fnn ON fnn.oid=fn.pronamespace
WHERE n.nspname='clean' AND c.relname='flight_snapshots'
  AND NOT t.tgisinternal
ORDER BY t.tgname
LIMIT 81
`;
export async function inspectP5CDAllSchemasCatalogReadOnly(client){
 if(!client||typeof client.query!=="function")hold();
 let open=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  open=true;
  await client.query("SET LOCAL statement_timeout='12000ms'");
  await client.query("SET LOCAL lock_timeout='1000ms'");
  const top=(await client.query(
   "SELECT current_database() AS db,current_setting('server_version_num')::integer AS ver,"+
   "current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS at"
  )).rows[0];
  if(!top||top.db!=="neondb"||top.ver<160000||
     top.ro!=="on"||top.replica!==false||!top.at)hold();
  const tables=(await client.query(scopeSql)).rows;
  const cols=(await client.query(colsSql)).rows;
  if(tables.length>MAX_TABLES||cols.length>MAX_COLUMNS)hold();
  const keys=new Set();
  const byKey=new Map();
  for(const t of tables){
   if(!regularName(t.schema_name)||!cleanName(t.table_name)||
      !Number.isSafeInteger(Number(t.relation_oid)))hold();
   const key=t.schema_name+"."+t.table_name;
   if(keys.has(key))hold();
   keys.add(key);byKey.set(key,{...t,columns:[]});
  }
  for(const c of cols){
   if(!regularName(c.schema_name)||!cleanName(c.table_name)||
      !cleanName(c.column_name))hold();
   const row=byKey.get(c.schema_name+"."+c.table_name);
   if(!row)hold();
   row.columns.push(c.column_name);
  }
  const all=[...byKey.values()];
  const probable=all.map(t=>({
   ...classifyP5CDTaskCatalogCandidate(t.schema_name,t.table_name,t.columns),
   relation_oid:t.relation_oid,columns:t.columns
  })).filter(x=>x.candidate);
  if(probable.length>90)hold();
  const snapshot=byKey.get("clean.flight_snapshots");
  const inspected=[...probable];
  if(snapshot&&!inspected.some(x=>x.schema==="clean"&&x.table==="flight_snapshots"))
   inspected.push({
    schema:"clean",table:"flight_snapshots",relation_oid:snapshot.relation_oid,
    columns:snapshot.columns,signals:["canonical_snapshot_target"],
    candidate:false,actuallyConfirmedReusableQueue:false
   });
  const indexRows=(await client.query(indexSql,[
   inspected.map(v=>v.relation_oid)
  ])).rows;
  if(indexRows.length>MAX_INDEXES)hold();
  for(const x of indexRows){
   if(!regularName(x.schema_name)||!cleanName(x.table_name)||
      !cleanName(x.index_name)||typeof x.is_unique!=="boolean"||
      typeof x.index_definition!=="string"||
      x.index_definition.length>4000||
      !inspected.some(v=>v.schema===x.schema_name&&v.table===x.table_name))
    hold();
  }
  const roles=snapshot?(await client.query(rolesSql)).rows:[];
  const triggers=snapshot?(await client.query(triggersSql)).rows:[];
  if(roles.length>MAX_ROLES||triggers.length>80)hold();
  if(roles.some(x=>!cleanName(x.role_name)||
      [x.can_login,x.is_superuser,x.can_insert_snapshots,
       x.can_update_snapshots,x.can_delete_snapshots,
       x.can_manage_snapshot_triggers].some(v=>typeof v!=="boolean")))
   hold();
  if(triggers.some(x=>!cleanName(x.trigger_name)||
    !cleanName(x.function_schema)||!cleanName(x.function_name)||
    !["O","D","R","A"].includes(x.trigger_enabled)))hold();
  await client.query("ROLLBACK");open=false;
  return{
   schema:"v39.phase5.cd-all-user-schemas-metadata-only-readonly.v1",
   observedAtUtc:new Date(top.at).toISOString(),
   postgresMajorVersion:Math.floor(top.ver/10000),
   scope:"ALL_NON_SYSTEM_PG_CLASS_RELATIONS_ACCESSIBLE_VIA_PG_CATALOG",
   tableCountWithinBound:tables.length,
   userSchemas:[...new Set(tables.map(x=>x.schema_name))].sort(),
   allUserSchemaTableNames:tables.map(x=>x.schema_name+"."+x.table_name),
   queueCandidates:inspected.map(v=>({
    schema:v.schema,table:v.table,signals:v.signals,
    columns:v.columns,
    uniqueIndexes:indexRows.filter(i=>i.schema_name===v.schema&&
      i.table_name===v.table&&i.is_unique).map(i=>({
       name:i.index_name,definition:i.index_definition
      })),
    actuallyConfirmedReusableQueue:false
   })),
   snapshotWriterAndTriggerRolePrivileges:roles,
   snapshotNonInternalTriggers:triggers,
   priorScopedReleaseMetadataNotQueueByName:true,
   narrowedCatalogMayHaveMissedOtherSchemas:true,
   actualQueueReusableCertified:false,
   productionSchemaMigrationAuthorized:false,
   providerCalls:0,databaseWrites:0,phase5FreezePassed:false,
   phase6PaidGo:false
  };
 }catch{
  if(open)await client.query("ROLLBACK").catch(()=>{});
  hold();
 }
}
async function main(){
 const url=process.env.DATABASE_URL;
 if(typeof url!=="string"||!url.startsWith("postgres")||
    url.length<30||url.length>1200||process.env.GITHUB_ACTIONS==="true")
  hold();
 const c=new Client({
  connectionString:url,connectionTimeoutMillis:8000,
  application_name:"phase5_cd_all_schemas_private_catalog_read_only"
 });
 try{
  await c.connect();
  const report=await inspectP5CDAllSchemasCatalogReadOnly(c);
  console.log(JSON.stringify(report,null,2));
  console.log("P5_CD_ALL_SCHEMAS_CATALOG_READONLY_NO_PROVIDER_NO_DB_WRITES");
 }catch{
  console.error("HOLD_P5_CD_ALL_SCHEMAS_CATALOG_METADATA_UNAVAILABLE_NO_WRITE");
  process.exitCode=2;
 }finally{await c.end().catch(()=>{});}
}
if(process.argv[1]?.endsWith("v39_phase5_cd_all_schemas_privilege_readonly_once.mjs"))
 await main();
