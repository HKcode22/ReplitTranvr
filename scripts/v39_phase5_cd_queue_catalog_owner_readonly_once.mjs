/**
 * Phase5 C+D teammate-owned Neon PostgreSQL schema inventory (READ ONLY).
 * Runs from REAL Replit Shell DATABASE_URL only, never the other Neon plugin.
 *
 * No SELECT on source/provider flight rows, no GET, migration or SQL writes.
 * Observe metadata: presence of possible existing task/lease table and
 * unique indexes for Stage14 flight+horizon/cutoff. Avoid creating a
 * duplicate table before this read-only catalog audit is independently read.
 * Does not infer the live DB actually contains scientific flight evidence.
 */
import "dotenv/config";
import pg from "pg";
const {Client}=pg;
const stop=()=>{throw Error("HOLD_P5_CD_SCHEMA_CATALOG_NO_WRITE");};
const TABLE=/^(?:phase5_[a-z0-9_]{3,100}|flight_snapshots|fids_query_response|flight_population)$/;
const idxName=/^[a-zA-Z0-9_]{1,125}$/;
const cellName=/^[a-zA-Z0-9_]{1,125}$/;
export function describeP5CDCatalogOnly(tables,cols,indexes){
 if(!Array.isArray(tables)||!Array.isArray(cols)||!Array.isArray(indexes)||
    tables.length>160||cols.length>2500||indexes.length>2500)
   stop();
 const tableMap=new Map();
 for(const t of tables){
  if(typeof t.table_name!=="string"||!TABLE.test(t.table_name)||
     tableMap.has(t.table_name))stop();
  tableMap.set(t.table_name,{name:t.table_name,
   columns:[],indexes:[]});
 }
 for(const c of cols){
  const table=tableMap.get(c.table_name);
  if(!table||!cellName.test(c.column_name??""))stop();
  table.columns.push(c.column_name);
 }
 for(const i of indexes){
  const table=tableMap.get(i.table_name);
  if(!table||!idxName.test(i.index_name??"")||
     typeof i.is_unique!=="boolean"||
     typeof i.index_definition!=="string"||
     i.index_definition.length>1800)stop();
  table.indexes.push({
   name:i.index_name,unique:i.is_unique,
   definition:i.index_definition
  });
 }
 const snapshot=tableMap.get("flight_snapshots")??null;
 const likelyQueue=[...tableMap.values()].filter(t=>
  /(?:task|queue|lease|claim|work_item)/.test(t.name));
 const candidates=likelyQueue.map(t=>({
  table:t.name,columns:t.columns,
  uniqueIndexNames:t.indexes.filter(x=>x.unique).map(x=>x.name),
  actuallyConfirmedReusableQueue:false
 }));
 const snapshotUnique=snapshot?.indexes.filter(x=>x.unique)??[];
 return{
  schema:"v39.phase5.cd-real-metadata-catalog-readonly.v1",
  purpose:"NEED_PRODUCTION_TABLE_REUSE_AND_IDENTITY_REVIEW",
  source:"RESTRICTED_PG_CATALOG_NOT_PROVIDER_FLIGHT_CONTENTS",
  tablesInspected:tableMap.size,
  possibleExistingOperationalTaskTables:candidates,
  snapshotColumnNames:snapshot?.columns??[],
  snapshotUniqueIndexDefinitions:snapshotUnique,
  changedNativeTTwoCutoffConflictDefinitelyExcludedHere:false,
  queueTableReuseApprovedHere:false,
  providerRequests:0,databaseWrites:0,phase5FreezePassed:false,
  phase6PaidGo:false
 };
}
export async function mainP5CDCatalogReadOnly(){
 const url=process.env.DATABASE_URL;
 if(typeof url!=="string"||!url.startsWith("postgres")||
    url.length<30||url.length>1200)stop();
 const client=new Client({connectionString:url,
  connectionTimeoutMillis:8000,
  application_name:"p5_cd_readonly_catalog_no_provider"});
 await client.connect();
 let tx=false;
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  tx=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  const evidence=await client.query(
   "SELECT current_database() AS db,"+
   "current_setting('server_version_num')::integer AS version,"+
   "current_setting('transaction_read_only') AS read_only,"+
   "clock_timestamp() AS observed_at_utc");
  const e=evidence.rows[0];
  if(e?.db!=="neondb"||e.version<160000||e.read_only!=="on")
   stop();
  const t=await client.query(
   "SELECT table_name FROM information_schema.tables "+
   "WHERE table_schema='clean' AND table_type='BASE TABLE' "+
   "AND (table_name LIKE 'phase5_%' OR table_name IN "+
   "('flight_snapshots','fids_query_response','flight_population')) "+
   "ORDER BY table_name LIMIT 161");
  if(t.rows.length>160)stop();
  const c=await client.query(
   "SELECT table_name,column_name FROM information_schema.columns "+
   "WHERE table_schema='clean' AND (table_name LIKE 'phase5_%' "+
   "OR table_name IN ('flight_snapshots','fids_query_response','flight_population')) "+
   "ORDER BY table_name,ordinal_position LIMIT 2501");
  if(c.rows.length>2500)stop();
  const i=await client.query(
   "SELECT t.relname AS table_name,x.relname AS index_name,"+
   "p.indisunique AS is_unique,"+
   "pg_get_indexdef(p.indexrelid) AS index_definition "+
   "FROM pg_catalog.pg_class t "+
   "JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace "+
   "JOIN pg_catalog.pg_index p ON p.indrelid=t.oid "+
   "JOIN pg_catalog.pg_class x ON x.oid=p.indexrelid "+
   "WHERE n.nspname='clean' AND (t.relname LIKE 'phase5_%' "+
   "OR t.relname IN ('flight_snapshots','fids_query_response','flight_population')) "+
   "ORDER BY t.relname,x.relname LIMIT 2501");
  if(i.rows.length>2500)stop();
  const report=describeP5CDCatalogOnly(t.rows,c.rows,i.rows);
  await client.query("ROLLBACK");tx=false;
  console.log(JSON.stringify({...report,
   realMetadataObservedUtc:e.observed_at_utc instanceof Date?
    e.observed_at_utc.toISOString():String(e.observed_at_utc),
   postgresMajorVersion:Math.floor(e.version/10000)},null,2));
  console.log("P5_CD_SCHEMA_ONLY_READONLY_NO_PROVIDER_NO_DB_WRITES");
 }finally{
  if(tx)await client.query("ROLLBACK").catch(()=>{});
  await client.end().catch(()=>{});
 }
}
if(process.argv[1]?.endsWith("v39_phase5_cd_queue_catalog_owner_readonly_once.mjs")){
 void mainP5CDCatalogReadOnly().catch(()=>{
  console.error("HOLD_P5_CD_SCHEMA_CATALOG_NO_WRITE_NO_RETRY");
  process.exitCode=2;
 });
}
