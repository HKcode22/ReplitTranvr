/**
 * Final Phase4 read-only existence check for optional sources.
 * No raw Content, identifiers, aircraft locations or records are exported.
 * Counts are capped at 5001; unknown privilege is never a zero.
 * Purpose: distinguish G5A missing join from no persisted optional-source data.
 */
import pg from "pg";
const tables=[
  ["AIRBORNE_RAW_EVENTS","raw_airborne_events"],
  ["AIRBORNE_CLEAN_POINTS","clean_airborne_points"],
  ["AIRBORNE_ELIGIBILITY","airborne_eligibility_evidence"],
  ["AIRBORNE_SNAPSHOTS","flight_airborne_snapshots"],
  ["WEBHOOK_ENVELOPES","raw_delivery"],
  ["WEBHOOK_IDENTITY_RESOLUTION","webhook_identity_resolution"],
  ["ALERT_SUBSCRIPTION_RECORDS","adb_collection_subs"],
  ["RECEIVER_INGEST_EVENTS","adb_ingest_events"],
  ["FLIGHT_SEMANTIC_EVENTS","flight_events"],
  ["ACTUAL_TARGET_OUTCOME_ROWS","flight_outcomes"],
  ["FIDS_POPULATION_MEMBERS","flight_population"]
];
const report=(key,val)=>console.log(key+" "+JSON.stringify(val));
if(!process.env.DATABASE_URL){report("G5A_OPTIONAL_SOURCE_HOLD",{reason:"MISSING_DATABASE_URL"});process.exit(2)}
const db=new pg.Client({
 connectionString:process.env.DATABASE_URL,
 options:"-c default_transaction_read_only=on",
 connectionTimeoutMillis:10000,query_timeout:12000,
 application_name:"phase4_g5a_optional_sources_presence_readonly"
});
db.on("error",()=>{});
let inTx=false;
try{
 await db.connect();
 await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 inTx=true;
 await db.query("SET LOCAL statement_timeout='9000ms'");
 const t=(await db.query("SELECT current_setting('transaction_read_only') AS ro,clock_timestamp() AS at")).rows[0];
 if(t.ro!=="on")throw Error("READONLY_HOLD");
 report("G5A_GLOBAL_OPTIONAL_SOURCE_EVIDENCE",{asOfUtc:t.at.toISOString(),readonly:true,cappedAt:5001,providerCalls:0,databaseWrites:0});
 for(const [name,table] of tables){
  await db.query("SAVEPOINT source_metric");
  try{
   const fq="clean."+table;
   const p=(await db.query("SELECT to_regclass($1) IS NOT NULL AS exists,CASE WHEN to_regclass($1) IS NULL THEN false ELSE has_table_privilege(current_user,$1,'SELECT') END AS can_read",[fq])).rows[0];
   if(!p.exists||!p.can_read){
    report("SOURCE",{name,status:"UNKNOWN_TABLE_OR_GRANT",notZero:true});
   }else{
    // Strictly local allowlisted identifiers, and at most 5001 inspected rows.
    if(!/^[a-z_]+$/.test(table))throw Error("UNSAFE_IDENTIFIER");
    const q="SELECT count(*)::integer AS n FROM (SELECT 1 FROM clean."+table+" LIMIT 5001) x";
    const n=Number((await db.query(q)).rows[0]?.n);
    if(!Number.isInteger(n)||n<0||n>5001)throw Error("INVALID_AGGREGATE");
    report("SOURCE",{name,status:"MEASURED",sampledRows:n,
      countKind:n===5001?"AT_LEAST_5001":"EXACT_TOTAL_UNDER_5001"});
   }
   await db.query("RELEASE SAVEPOINT source_metric");
  }catch(e){
   await db.query("ROLLBACK TO SAVEPOINT source_metric").catch(()=>{});
   await db.query("RELEASE SAVEPOINT source_metric").catch(()=>{});
   report("SOURCE",{name,status:"UNKNOWN_QUERY_ERROR",
     sqlstate:typeof e?.code==="string"&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:"UNKNOWN"});
  }
 }
 await db.query("ROLLBACK");inTx=false;
 report("LIMITS",{allTimeDbPresenceOnly:true,zeroDoesNotProveExternalSourceLackedFlights:true,
  anyRowsNotProofFromAdsbLol:true,anyRowsNotProofOfG5aMatch:true,
  adsbResearchScriptsPersistedNoRawLocations:true,readOnly:true,
  noProviderCalls:true,noDatabaseWrites:true,actualOnlyNotCertified:true});
}catch(e){
 report("G5A_OPTIONAL_SOURCE_HOLD",{reason:"CONNECTION_OR_TRANSACTION",sqlstate:typeof e?.code==="string"&&/^[A-Z0-9]{5}$/.test(e.code)?e.code:"UNKNOWN"});
 process.exitCode=2;
}finally{
 if(inTx)await db.query("ROLLBACK").catch(()=>{});
 await db.end().catch(()=>{});
}
