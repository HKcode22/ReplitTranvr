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
  begun=false;await c.query("ROLLBACK");
  return result;
 }finally{if(begun)await c.query("ROLLBACK");}
}
/** I124/T118: count-only current native shape diagnostics. Mirrors the
 * field checks in phase5ActualSourceNativeFlightCandidateAudit_v39.ts,
 * not its retained cross-original identity, timing, independent review,
 * permit or commit checks. Counts can overlap; no identity/payload output. */
export async function readNativeShapeRows(c,manifest,day){
 if(!/^[a-f0-9]{64}$/.test(manifest??"")||!Number.isSafeInteger(day)||day<1||day>31)throw Error("NATIVE_SHAPE_SCOPE");
 const rows=(await c.query(`
  WITH live AS MATERIALIZED (
   SELECT q.query_digest,q.slot_id,q.horizon,q.airport_icao,b.population_query_id,b.response_hash,b.normalized_members_count
   FROM clean.phase5_fids_allowed_query_v39 q
   JOIN clean.phase5_fids_original_binding_v39 b USING(manifest_sha256,query_digest)
   JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash
   WHERE q.manifest_sha256=$1 AND q.run_day_index=$2
    AND b.bound_at_utc<=transaction_timestamp()
    AND b.source_expires_at_utc>statement_timestamp()
    AND r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL
    AND r.source_airport_icao=q.airport_icao AND r.query_direction='Departure'
  ), members AS (
   SELECT l.query_digest,l.slot_id,l.horizon,l.normalized_members_count,p.id IS NOT NULL AS present,
    coalesce(p.analytic_identity_id ~ '^[a-zA-Z0-9_.:|-]{5,200}$' AND (p.analytic_identity_id NOT LIKE 'leg:p5v1:%' OR p.analytic_identity_id ~ '^leg:p5v1:[a-f0-9]{64}$'),false) AS identity_shape,
    count(p.id) OVER(PARTITION BY l.query_digest,p.analytic_identity_id)=1 AS unique_identity,
    coalesce(p.canonical_flight_instance_id=p.analytic_identity_id,false) AS canonical_match,
    coalesce(p.source_airport_icao=l.airport_icao,false) AS source_airport,
    coalesce(p.dep_airport_icao=l.airport_icao,false) AS departure_airport,
    coalesce(p.population_role='requested_airport_primary',false) AS primary_role,
    coalesce(p.scope_classification='confirmed_core',false) AS core_scope,
    coalesce(p.codeshare_resolution_status='confirmed_operating_leg',false) AS operating_leg,
    coalesce(p.source_type='fids',false) AS fids_source,
    coalesce(p.response_hash=l.response_hash,false) AS response_match,
    p.provider_content_expired_at_utc IS NULL AS unexpired_member,
    coalesce(p.query_direction='Departure',false) AS departure_direction,
    coalesce(length(p.population_member_id::text)>0,false) AS member_id,
    p.dep_scheduled_utc IS NOT NULL AS scheduled_time
   FROM live l LEFT JOIN clean.flight_population p ON p.population_query_id=l.population_query_id
  ), originals AS (
   SELECT query_digest,slot_id,horizon,normalized_members_count,
    count(*) FILTER(WHERE present)::int observed,
    count(*) FILTER(WHERE present AND NOT identity_shape)::int invalid_identity_shape,
    count(*) FILTER(WHERE present AND NOT unique_identity)::int duplicate_identity,
    count(*) FILTER(WHERE present AND NOT canonical_match)::int canonical_mismatch,
    count(*) FILTER(WHERE present AND NOT source_airport)::int source_airport_mismatch,
    count(*) FILTER(WHERE present AND NOT departure_airport)::int departure_airport_mismatch,
    count(*) FILTER(WHERE present AND NOT primary_role)::int nonprimary_role,
    count(*) FILTER(WHERE present AND NOT core_scope)::int noncore_scope,
    count(*) FILTER(WHERE present AND NOT operating_leg)::int unconfirmed_operating_leg,
    count(*) FILTER(WHERE present AND NOT fids_source)::int nonfids_source,
    count(*) FILTER(WHERE present AND NOT response_match)::int response_mismatch,
    count(*) FILTER(WHERE present AND NOT unexpired_member)::int expired_member_marker,
    count(*) FILTER(WHERE present AND NOT departure_direction)::int wrong_direction,
    count(*) FILTER(WHERE present AND NOT member_id)::int missing_member_id,
    count(*) FILTER(WHERE present AND NOT scheduled_time)::int missing_scheduled_time,
    count(*) FILTER(WHERE present AND identity_shape AND unique_identity AND canonical_match AND source_airport AND departure_airport AND primary_role AND core_scope AND operating_leg AND fids_source AND response_match AND unexpired_member AND departure_direction AND member_id AND scheduled_time)::int all_shape_fields_pass
   FROM members GROUP BY query_digest,slot_id,horizon,normalized_members_count
  )
  SELECT slot_id,horizon,count(*)::int live_originals,sum(normalized_members_count)::int expected_members,sum(observed)::int observed_members,
   count(*) FILTER(WHERE observed<>normalized_members_count)::int member_count_mismatch_originals,
   sum(invalid_identity_shape)::int invalid_identity_shape,sum(duplicate_identity)::int duplicate_identity,
   sum(canonical_mismatch)::int canonical_mismatch,sum(source_airport_mismatch)::int source_airport_mismatch,
   sum(departure_airport_mismatch)::int departure_airport_mismatch,sum(nonprimary_role)::int nonprimary_role,
   sum(noncore_scope)::int noncore_scope,sum(unconfirmed_operating_leg)::int unconfirmed_operating_leg,
   sum(nonfids_source)::int nonfids_source,sum(response_mismatch)::int response_mismatch,
   sum(expired_member_marker)::int expired_member_marker,sum(wrong_direction)::int wrong_direction,
   sum(missing_member_id)::int missing_member_id,sum(missing_scheduled_time)::int missing_scheduled_time,
   sum(all_shape_fields_pass)::int all_shape_fields_pass
  FROM originals GROUP BY slot_id,horizon ORDER BY slot_id,horizon
 `,[manifest,day])).rows;
 const fields=["invalid_identity_shape","duplicate_identity","canonical_mismatch","source_airport_mismatch","departure_airport_mismatch","nonprimary_role","noncore_scope","unconfirmed_operating_leg","nonfids_source","response_mismatch","expired_member_marker","wrong_direction","missing_member_id","missing_scheduled_time","all_shape_fields_pass"];
 const n=v=>Number.isSafeInteger(v)&&v>=0;
 const seen=new Set();
 if(!Array.isArray(rows)||rows.length>12)throw Error("NATIVE_SHAPE_COUNT");
 for(const x of rows){
  const k=x.slot_id+"|"+x.horizon;
  if(seen.has(k)||!["HUB","MID_A","MID_B","REGIONAL"].includes(x.slot_id)||!["T-24h","T-6h","T-90m"].includes(x.horizon)||
    !["live_originals","expected_members","observed_members","member_count_mismatch_originals",...fields].every(f=>n(x[f]))||
    x.live_originals<1||x.member_count_mismatch_originals>x.live_originals||fields.some(f=>x[f]>x.observed_members)||
    (x.expected_members!==x.observed_members&&x.member_count_mismatch_originals===0))throw Error("NATIVE_SHAPE_COUNT");
  seen.add(k);
 }
 if(rows.reduce((s,x)=>s+x.live_originals,0)>384)throw Error("NATIVE_SHAPE_SCOPE");
 return rows.map(x=>Object.fromEntries(["slot_id","horizon","live_originals","expected_members","observed_members","member_count_mismatch_originals",...fields].map(f=>[f,x[f]])));
}
export async function readNativeShapeInventory(c,day){
 let begun=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");begun=true;
  await c.query("SET LOCAL statement_timeout='25000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!id?.db||!id.owner||!id.login||!id.primary||!id.ro)throw Error("OWNER_CONTEXT");
  const auth=(await c.query("SELECT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL")).rows;
  if(auth.length!==1)throw Error("MANIFEST");
  const cells=await readNativeShapeRows(c,auth[0].manifest_sha256,day);
  begun=false;await c.query("ROLLBACK");
  return {status:"P5B_LIVE_NATIVE_SHAPE_COUNTS_READONLY",day,observedAtUtc:new Date(id.at).toISOString(),cells,
   countsOverlap:true,scope:"CURRENT_EXACT_LIVE_BOUND_ORIGINALS_ONLY",historicalCauseCertified:false,
   crossOriginalIdentityScreenPerformed:false,timingOrIndependentReviewCertified:false,actualPreCommitVerified:false,providerCalls:0,databaseWrites:0};
 }finally{if(begun)await c.query("ROLLBACK");}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let c;
 try{
  const arg=process.argv[2],match=typeof arg==="string"?/^--native-shape-day=([1-9]|[12][0-9]|3[01])$/.exec(arg):null;
  if((process.argv.length!==2&&!(process.argv.length===3&&match))||!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")throw Error("OWNER_CONTEXT");
  const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
  c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
  await c.connect();const result=match?await readNativeShapeInventory(c,Number(match[1])):await readInventory(c);await c.end();c=null;console.log(JSON.stringify(result));
 }catch(e){console.error(JSON.stringify({status:"P5B_RETENTION_AND_P7_STORAGE_METADATA_HOLD",sqlstate:/^[0-9A-Z]{5}$/.test(e?.code??"")?e.code:null,providerCalls:0,databaseWrites:0}));process.exitCode=2;}
 finally{if(c)await c.end().catch(()=>{});}
}
