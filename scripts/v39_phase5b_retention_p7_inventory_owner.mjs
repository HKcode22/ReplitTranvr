/** Read-only owner metadata census. No provider calls, source values, packet
 * bytes, credentials, identifiers, signing, or mutation. Reuse exact existing
 * Phase6 binding metadata and Phase7 storage tables. */
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
export function project(rows,fragments,bundles,observedAtUtc){
 const fail=()=>{throw Error("HOLD_P5B_RETENTION_COUNT_CONTRADICTION")};
 const n=v=>Number.isSafeInteger(v)&&v>=0;
 const hs=["T-24h","T-6h","T-90m"],splits=["train","validation","test"];
 if(!Array.isArray(rows)||rows.length>93||!Array.isArray(fragments)||fragments.length>9||!bundles||!Number.isFinite(Date.parse(observedAtUtc)))fail();
 const seen=new Set(),fields=["bindings","timely_bindings","live_payloads","expired_metadata_only","other_custody","historical_members","linked_pre_rows","cutoff_safe_pre_rows"];
 const cells=rows.map(x=>{
  const k=x.run_day_index+"|"+x.horizon;
  if(!Number.isInteger(x.run_day_index)||x.run_day_index<1||x.run_day_index>31||!hs.includes(x.horizon)||seen.has(k)||!fields.every(f=>n(x[f]))||x.bindings<1||x.timely_bindings>x.bindings||x.live_payloads+x.expired_metadata_only+x.other_custody!==x.bindings||x.cutoff_safe_pre_rows>x.linked_pre_rows)fail();
  seen.add(k);return Object.fromEntries(["run_day_index","horizon",...fields].map(f=>[f,x[f]]));
 });
 const totals=Object.fromEntries(fields.map(f=>[f,cells.reduce((s,x)=>s+x[f],0)]));
 const days=Array.from({length:31},(_,i)=>{const d=i+1,rs=cells.filter(x=>x.run_day_index===d);return {day:d,status:rs.length?"BINDING_METADATA_OBSERVED":"NO_BINDING_METADATA_OBSERVED",...Object.fromEntries(fields.map(f=>[f,rs.reduce((s,x)=>s+x[f],0)]))}});
 const seenF=new Set();
 const fragmentCounts=fragments.map(x=>{
  const k=x.split+"|"+x.horizon;
  if(!splits.includes(x.split)||!hs.includes(x.horizon)||seenF.has(k)||!n(x.rows)||!n(x.unexpired)||x.unexpired>x.rows)fail();
  seenF.add(k);return {split:x.split,horizon:x.horizon,rows:x.rows,unexpired:x.unexpired};
 });
 if(!["rows","unexpired","links","policies"].every(k=>n(bundles[k]))||bundles.unexpired>bundles.rows)fail();
 return {status:"P5B_RETENTION_AND_P7_STORAGE_METADATA_READONLY",observedAtUtc,totals,days,cells,
  phase7Storage:{scope:"GLOBAL_PRIVATE_STORAGE_NOT_EXACT_STUDY_OR_DAY_ATTRIBUTION",fragmentCounts,bundles:{rows:bundles.rows,unexpired:bundles.unexpired,links:bundles.links,policies:bundles.policies}},
  historicalMembersNotRetainedContent:true,cutoffSafeCreatedAtNotIndependentCommit:true,storagePresenceNotTrainingEligibility:true,providerCalls:0,databaseWrites:0};
}
export async function readInventory(c){
 let begun=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");begun=true;
  await c.query("SET LOCAL statement_timeout='25000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!id?.db||!id.owner||!id.login||!id.primary||!id.ro)throw Error("OWNER_CONTEXT");
  const auth=(await c.query("SELECT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL")).rows;
  if(auth.length!==1||!/^[a-f0-9]{64}$/.test(auth[0].manifest_sha256??""))throw Error("MANIFEST");
  const rows=(await c.query(`
   WITH bound AS MATERIALIZED (
    SELECT q.run_day_index,q.horizon,q.prediction_cutoff_utc,b.population_query_id,b.response_hash,b.bound_at_utc,b.source_expires_at_utc,b.normalized_members_count,
     CASE WHEN r.raw_expired_at_utc IS NOT NULL AND r.response_hash IS NULL AND r.raw_payload IS NULL THEN 'expired'
      WHEN r.raw_expired_at_utc IS NULL AND r.response_hash=b.response_hash AND r.raw_payload IS NOT NULL AND b.source_expires_at_utc>transaction_timestamp() THEN 'live'
      ELSE 'other' END custody
    FROM clean.phase5_fids_allowed_query_v39 q
    JOIN clean.phase5_fids_original_binding_v39 b USING(manifest_sha256,query_digest)
    LEFT JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id
    WHERE q.manifest_sha256=$1
   ), counts AS (
    SELECT run_day_index,horizon,count(*)::int bindings,count(*) FILTER(WHERE bound_at_utc<=prediction_cutoff_utc)::int timely_bindings,
     count(*) FILTER(WHERE custody='live')::int live_payloads,count(*) FILTER(WHERE custody='expired')::int expired_metadata_only,
     count(*) FILTER(WHERE custody='other')::int other_custody,coalesce(sum(normalized_members_count),0)::int historical_members
    FROM bound GROUP BY 1,2
   ), pre AS (
    SELECT b.run_day_index,b.horizon,count(DISTINCT s.id)::int linked_pre_rows,
      count(DISTINCT s.id) FILTER(WHERE s.created_at<=s.prediction_cutoff_utc)::int cutoff_safe_pre_rows
    FROM bound b JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id::text AND s.fids_response_hash=b.response_hash AND s.horizon=b.horizon AND s.prediction_state='PRE_DEPARTURE'
    GROUP BY 1,2
   )
   SELECT counts.*,coalesce(pre.linked_pre_rows,0)::int linked_pre_rows,coalesce(pre.cutoff_safe_pre_rows,0)::int cutoff_safe_pre_rows FROM counts LEFT JOIN pre USING(run_day_index,horizon) ORDER BY 1,2
  `,[auth[0].manifest_sha256])).rows;
  const fragments=(await c.query("SELECT split,horizon,count(*)::int rows,count(*) FILTER(WHERE research_expiry_utc>transaction_timestamp())::int unexpired FROM phase7_private.pre_fragment_v39 GROUP BY 1,2 ORDER BY 1,2")).rows;
  const bundles=(await c.query("SELECT count(*)::int rows,count(*) FILTER(WHERE research_expiry_utc>transaction_timestamp())::int unexpired,(SELECT count(*)::int FROM phase7_private.pre_source_link_v39) links,(SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) policies FROM phase7_private.derived_release_bundle_v39")).rows[0];
  const result=project(rows,fragments,bundles,new Date(id.at).toISOString());
  await c.query("ROLLBACK");begun=false;
  return result;
 }finally{if(begun)await c.query("ROLLBACK");}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let c;
 try{
  if(process.argv.length!==2||!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")throw Error("OWNER_CONTEXT");
  const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
  c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
  await c.connect();const result=await readInventory(c);await c.end();c=null;console.log(JSON.stringify(result));
 }catch(e){console.error(JSON.stringify({status:"P5B_RETENTION_AND_P7_STORAGE_METADATA_HOLD",sqlstate:/^[0-9A-Z]{5}$/.test(e?.code??"")?e.code:null,providerCalls:0,databaseWrites:0}));process.exitCode=2;}
 finally{if(c)await c.end().catch(()=>{});}
}
