// Owner metadata only. No private wire/body access, writes or provider calls.
"use strict";
const {createRequire}=require("node:module"),{join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
const base="9c9cddb1aaeb04934d94af2937ee158e6d991f6c";
async function main(){
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  await c.connect();await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='10s'");
  const identity=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro")).rows[0];
  if(!identity.db||!identity.owner||!identity.login||!identity.primary||!identity.ro)throw Error("WRONG_OWNER_CONTEXT");
  const index=(await c.query("SELECT run_day_index,reviewed_code_sha,count(*)::int revisions,max(revision)::int latest_revision,count(DISTINCT manifest_sha256)::int manifests,count(DISTINCT calendar_sha256)::int calendars,count(DISTINCT release_sha256)::int releases FROM phase6_private.signed_run_day_index_revision_v39 GROUP BY run_day_index,reviewed_code_sha ORDER BY run_day_index,reviewed_code_sha")).rows;
  const packets=(await c.query("SELECT run_day_index,reviewed_code_sha,kind,count(*)::int packets FROM phase6_private.frozen_native_packet_v39 GROUP BY run_day_index,reviewed_code_sha,kind ORDER BY run_day_index,kind,reviewed_code_sha")).rows;
  const valid=x=>Number.isInteger(x.run_day_index)&&x.run_day_index>=1&&x.run_day_index<=31&&/^[a-f0-9]{40}$/.test(x.reviewed_code_sha);
  if(!index.every(valid)||!packets.every(valid))throw Error("UNREVIEWED_PRODUCER_METADATA");
  console.log(JSON.stringify({status:"P6_EXISTING_ARTIFACT_PRODUCER_CENSUS_NO_WRITE",index,packets,allExistingIndexCodeMatchesBaseline:index.every(x=>x.reviewed_code_sha===base),allExistingPacketCodeMatchesBaseline:packets.every(x=>x.reviewed_code_sha===base),historicalSignaturesNotRewritten:true,providerCalls:0,productionWrites:0,workflowDispatches:0}));
 }finally{await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
main().catch(e=>{console.log(JSON.stringify({status:"P6_EXISTING_ARTIFACT_PRODUCER_CENSUS_HOLD",sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??"")?e.code:null,providerCalls:0,productionWrites:0}));process.exitCode=2;});
