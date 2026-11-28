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

/** P0-A / P0-G: Read-only deadline-aware scientific yield & live-original
 * opportunity reconciliation by study day × horizon × airport stratum.
 * Aggregate count/clock/enum metadata only: zero raw flight payloads,
 * identifiers, credentials, or mutations. */
export function projectScientificYieldReconciliation(cells,storage,observedAtUtc){
 const fail=why=>{throw Error("HOLD_P5B_SCIENTIFIC_YIELD_"+why);};
 const n=v=>Number.isSafeInteger(v)&&v>=0;
 const hs=["T-24h","T-6h","T-90m"],slots=["HUB","MID_A","MID_B","REGIONAL"],splits=["train","validation","test"];
 if(!Array.isArray(cells)||cells.length>372||!storage||!Number.isFinite(Date.parse(observedAtUtc)))fail("SCOPE");
 const fields=[
  "signed_queries","prearmed_queries","reservations","bindings","timely_bindings",
  "live_originals","expired_originals","other_custody_originals",
  "live_approaching_expiry_1h","live_approaching_expiry_2h",
  "live_open_opportunity","live_past_cutoff_unrecoverable",
  "live_with_conditional_marker","live_without_conditional_marker",
  "historical_members","distinct_native_eligible_flights","distinct_conditional_eligible_flights","ineligible_members",
  "linked_pre_rows","cutoff_safe_pre_rows","native_pre_rows","conditional_pre_rows","t24_witness_rows",
  "p7_fragments","p7_live_links","p7_fragments_surviving_raw_expiry","matched_t6_t90_pairs"
 ];
 const seen=new Set();
 const normalized=cells.map(x=>{
  const k=x.run_day_index+"|"+x.horizon+"|"+x.slot_id;
  if(!Number.isInteger(x.run_day_index)||x.run_day_index<1||x.run_day_index>31||!hs.includes(x.horizon)||!slots.includes(x.slot_id)||
     !/^[A-Z]{4}$/.test(x.airport_icao??"")||seen.has(k)||!fields.every(f=>n(x[f]))||
     x.signed_queries<1||x.prearmed_queries>x.signed_queries||x.reservations>x.signed_queries||
     x.bindings>x.reservations||x.timely_bindings>x.bindings||
     x.live_originals+x.expired_originals+x.other_custody_originals!==x.bindings||
     x.live_approaching_expiry_1h>x.live_approaching_expiry_2h||x.live_approaching_expiry_2h>x.live_originals||
     x.live_open_opportunity+x.live_past_cutoff_unrecoverable!==x.live_originals||
     x.live_with_conditional_marker+x.live_without_conditional_marker!==x.live_originals||
     x.cutoff_safe_pre_rows>x.linked_pre_rows||
     x.native_pre_rows+x.conditional_pre_rows>x.linked_pre_rows||
     x.p7_fragments_surviving_raw_expiry>x.p7_fragments)
   fail("COUNT_CONTRADICTION");
  seen.add(k);
  const split=x.run_day_index<=20?"train":x.run_day_index<=25?"validation":"test";
  return Object.fromEntries([["run_day_index",x.run_day_index],["split",split],["horizon",x.horizon],["slot_id",x.slot_id],["airport_icao",x.airport_icao],...fields.map(f=>[f,x[f]])]);
 });
 const totals=Object.fromEntries(fields.map(f=>[f,normalized.reduce((s,x)=>s+x[f],0)]));
 const byHorizon=hs.map(h=>{
  const rs=normalized.filter(x=>x.horizon===h);
  return {horizon:h,...Object.fromEntries(fields.map(f=>[f,rs.reduce((s,x)=>s+x[f],0)]))};
 });
 const byStratum=slots.map(slot=>{
  const rs=normalized.filter(x=>x.slot_id===slot);
  return {slot_id:slot,...Object.fromEntries(fields.map(f=>[f,rs.reduce((s,x)=>s+x[f],0)]))};
 });
 const bySplit=splits.map(sp=>{
  const rs=normalized.filter(x=>x.split===sp);
  return {split:sp,...Object.fromEntries(fields.map(f=>[f,rs.reduce((s,x)=>s+x[f],0)]))};
 });
 if(!["p7_total_fragments","p7_unexpired_fragments","p7_total_bundles","p7_unexpired_bundles","p7_live_links","p7_policies","post_outcome_reservations"].every(k=>n(storage[k]))||
    storage.p7_unexpired_fragments>storage.p7_total_fragments||storage.p7_unexpired_bundles>storage.p7_total_bundles)
  fail("STORAGE_CONTRADICTION");
 const pendingApproachingExpiry=normalized.filter(x=>x.live_approaching_expiry_2h>0&&x.live_open_opportunity>0&&x.cutoff_safe_pre_rows===0);
 const alerts={
  zeroScientificYield:totals.timely_bindings>0&&totals.cutoff_safe_pre_rows===0,
  approachingExpiryWithPendingEligible:pendingApproachingExpiry.reduce((s,x)=>s+Math.min(x.live_approaching_expiry_2h,x.live_open_opportunity),0),
  approachingExpiry1hTotal:totals.live_approaching_expiry_1h,
  unrecoverableExpiredOriginalsWithoutPre:normalized.filter(x=>x.expired_originals>0&&x.p7_fragments_surviving_raw_expiry===0).reduce((s,x)=>s+x.expired_originals,0),
  liveOriginalsAuditSummary:{
   totalLive:totals.live_originals,
   openLawfulOpportunity:totals.live_open_opportunity,
   cutoffElapsedUnrecoverable:totals.live_past_cutoff_unrecoverable,
   withConditionalMarker:totals.live_with_conditional_marker,
   withoutConditionalMarker:totals.live_without_conditional_marker,
   approachingExpiry1h:totals.live_approaching_expiry_1h,
   approachingExpiry2h:totals.live_approaching_expiry_2h
  },
  escalationStatus:(totals.timely_bindings>0&&totals.cutoff_safe_pre_rows===0)
   ?"CRITICAL_ZERO_SCIENTIFIC_YIELD"
   :(pendingApproachingExpiry.length>0?"URGENT_APPROACHING_EXPIRY_PENDING_ELIGIBLE":"NOMINAL_OR_PARTIAL_YIELD_VERIFY_COVERAGE")
 };
 return {
  status:"P5B_SCIENTIFIC_YIELD_AND_DEADLINE_RECONCILIATION_READONLY",
  observedAtUtc,totals,byHorizon,byStratum,bySplit,cells:normalized,
  globalPhase7AndPostStorage:storage,alerts,
  trainingEligibilityCertified:false,physicalGateOutCertified:false,providerCalls:0,databaseWrites:0
 };
}

export async function readScientificYieldReconciliation(c){
 let begun=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");begun=true;
  await c.query("SET LOCAL statement_timeout='25000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!id?.db||!id.owner||!id.login||!id.primary||!id.ro)throw Error("OWNER_CONTEXT");
  const auth=(await c.query("SELECT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL")).rows;
  if(auth.length!==1||!/^[a-f0-9]{64}$/.test(auth[0].manifest_sha256??""))throw Error("MANIFEST");
  const m=auth[0].manifest_sha256;
  const cells=(await c.query(`
   WITH qbase AS MATERIALIZED (
    SELECT q.query_digest,q.run_day_index,q.horizon,q.slot_id,q.airport_icao,q.prediction_cutoff_utc,q.service_window_end_utc,
     pr.query_digest IS NOT NULL AS prearmed,
     a.reservation_sha256 IS NOT NULL AS reserved,
     b.population_query_id,b.response_hash,b.bound_at_utc,b.source_expires_at_utc,b.normalized_members_count,
     CASE WHEN b.population_query_id IS NULL THEN 'unbound'
      WHEN r.raw_expired_at_utc IS NOT NULL AND r.response_hash IS NULL AND r.raw_payload IS NULL THEN 'expired'
      WHEN r.raw_expired_at_utc IS NULL AND r.response_hash=b.response_hash AND r.raw_payload IS NOT NULL AND b.source_expires_at_utc>transaction_timestamp() THEN 'live'
      ELSE 'other' END AS custody,
     coalesce(r.raw_payload#>>'{fidsRequestContract,phase5ConditionalService,protocolSha256}' ~ '^[a-f0-9]{64}$',false) AS has_conditional_marker
    FROM clean.phase5_fids_allowed_query_v39 q
    LEFT JOIN clean.phase5_fids_github_prearm_v39 pr ON pr.manifest_sha256=q.manifest_sha256 AND pr.query_digest=q.query_digest
    LEFT JOIN clean.phase5_fids_physical_attempt_v39 a ON a.manifest_sha256=q.manifest_sha256 AND a.query_digest=q.query_digest
    LEFT JOIN clean.phase5_fids_original_binding_v39 b ON b.manifest_sha256=q.manifest_sha256 AND b.query_digest=q.query_digest AND b.reservation_sha256=a.reservation_sha256
    LEFT JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id
    WHERE q.manifest_sha256=$1
   ), live_elig AS (
    SELECT q.run_day_index,q.horizon,q.slot_id,q.airport_icao,
     count(DISTINCT p.analytic_identity_id) FILTER(WHERE p.scope_classification='confirmed_core' AND p.codeshare_resolution_status='confirmed_operating_leg' AND p.canonical_flight_instance_id=p.analytic_identity_id AND p.provider_content_expired_at_utc IS NULL)::int AS distinct_native_eligible_flights,
     count(DISTINCT p.analytic_identity_id) FILTER(WHERE p.scope_classification='unknown' AND p.codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id' AND p.canonical_flight_instance_id=p.analytic_identity_id AND p.analytic_identity_id ~ '^leg:g5a:[a-f0-9]{64}$' AND p.provider_content_expired_at_utc IS NULL)::int AS distinct_conditional_eligible_flights,
     count(p.id) FILTER(WHERE NOT ((p.scope_classification='confirmed_core' AND p.codeshare_resolution_status='confirmed_operating_leg') OR (p.scope_classification='unknown' AND p.codeshare_resolution_status='g5a_conditional_operator_composite_no_native_id' AND p.analytic_identity_id ~ '^leg:g5a:[a-f0-9]{64}$')))::int AS ineligible_members
    FROM qbase q JOIN clean.flight_population p ON p.population_query_id=q.population_query_id
    WHERE q.custody='live'
    GROUP BY 1,2,3,4
   ), pre_agg AS (
    SELECT q.run_day_index,q.horizon,q.slot_id,q.airport_icao,
     count(DISTINCT s.id)::int AS linked_pre_rows,
     count(DISTINCT s.id) FILTER(WHERE s.created_at<=s.prediction_cutoff_utc)::int AS cutoff_safe_pre_rows,
     count(DISTINCT s.id) FILTER(WHERE s.flight_instance_id !~ '^leg:g5a:')::int AS native_pre_rows,
     count(DISTINCT s.id) FILTER(WHERE s.flight_instance_id ~ '^leg:g5a:[a-f0-9]{64}$')::int AS conditional_pre_rows,
     count(DISTINCT w.snapshot_id)::int AS t24_witness_rows,
     count(DISTINCT f.row_id)::int AS p7_fragments,
     count(DISTINCT l.snapshot_id) FILTER(WHERE l.expires_at_utc>transaction_timestamp())::int AS p7_live_links,
     count(DISTINCT f.row_id) FILTER(WHERE q.custody='expired' AND f.research_expiry_utc>transaction_timestamp())::int AS p7_fragments_surviving_raw_expiry
    FROM qbase q
    JOIN clean.flight_snapshots s ON s.population_query_id=q.population_query_id::text AND s.fids_response_hash=q.response_hash AND s.horizon=q.horizon AND s.prediction_state='PRE_DEPARTURE'
    LEFT JOIN clean.phase5_t24_postcommit_witness_v39 w ON w.snapshot_id=s.id
    LEFT JOIN phase7_private.pre_source_link_v39 l ON l.snapshot_id=s.id
    LEFT JOIN phase7_private.pre_fragment_v39 f ON f.row_id=l.row_id
    WHERE q.population_query_id IS NOT NULL
    GROUP BY 1,2,3,4
   ), paired AS (
    SELECT q.run_day_index,q.slot_id,q.airport_icao,count(DISTINCT s6.flight_instance_id)::int AS matched_t6_t90_pairs
    FROM qbase q
    JOIN clean.flight_snapshots s6 ON s6.population_query_id=q.population_query_id::text AND s6.fids_response_hash=q.response_hash AND s6.horizon='T-6h' AND s6.prediction_state='PRE_DEPARTURE'
    JOIN clean.flight_snapshots s90 ON s90.flight_instance_id=s6.flight_instance_id AND s90.horizon='T-90m' AND s90.prediction_state='PRE_DEPARTURE'
    WHERE q.horizon='T-6h' AND q.population_query_id IS NOT NULL
    GROUP BY 1,2,3
   )
   SELECT q.run_day_index,q.horizon,q.slot_id,q.airport_icao,
    count(*)::int AS signed_queries,
    count(*) FILTER(WHERE q.prearmed)::int AS prearmed_queries,
    count(*) FILTER(WHERE q.reserved)::int AS reservations,
    count(*) FILTER(WHERE q.population_query_id IS NOT NULL)::int AS bindings,
    count(*) FILTER(WHERE q.population_query_id IS NOT NULL AND q.bound_at_utc<=q.prediction_cutoff_utc)::int AS timely_bindings,
    count(*) FILTER(WHERE q.custody='live')::int AS live_originals,
    count(*) FILTER(WHERE q.custody='expired')::int AS expired_originals,
    count(*) FILTER(WHERE q.custody='other')::int AS other_custody_originals,
    count(*) FILTER(WHERE q.custody='live' AND q.source_expires_at_utc<=transaction_timestamp()+interval '1 hour')::int AS live_approaching_expiry_1h,
    count(*) FILTER(WHERE q.custody='live' AND q.source_expires_at_utc<=transaction_timestamp()+interval '2 hours')::int AS live_approaching_expiry_2h,
    count(*) FILTER(WHERE q.custody='live' AND q.service_window_end_utc - (CASE q.horizon WHEN 'T-24h' THEN interval '24 hours' WHEN 'T-6h' THEN interval '6 hours' ELSE interval '90 minutes' END) > transaction_timestamp())::int AS live_open_opportunity,
    count(*) FILTER(WHERE q.custody='live' AND q.service_window_end_utc - (CASE q.horizon WHEN 'T-24h' THEN interval '24 hours' WHEN 'T-6h' THEN interval '6 hours' ELSE interval '90 minutes' END) <= transaction_timestamp())::int AS live_past_cutoff_unrecoverable,
    count(*) FILTER(WHERE q.custody='live' AND q.has_conditional_marker)::int AS live_with_conditional_marker,
    count(*) FILTER(WHERE q.custody='live' AND NOT q.has_conditional_marker)::int AS live_without_conditional_marker,
    coalesce(sum(q.normalized_members_count) FILTER(WHERE q.population_query_id IS NOT NULL),0)::int AS historical_members,
    coalesce(le.distinct_native_eligible_flights,0)::int AS distinct_native_eligible_flights,
    coalesce(le.distinct_conditional_eligible_flights,0)::int AS distinct_conditional_eligible_flights,
    coalesce(le.ineligible_members,0)::int AS ineligible_members,
    coalesce(pa.linked_pre_rows,0)::int AS linked_pre_rows,
    coalesce(pa.cutoff_safe_pre_rows,0)::int AS cutoff_safe_pre_rows,
    coalesce(pa.native_pre_rows,0)::int AS native_pre_rows,
    coalesce(pa.conditional_pre_rows,0)::int AS conditional_pre_rows,
    coalesce(pa.t24_witness_rows,0)::int AS t24_witness_rows,
    coalesce(pa.p7_fragments,0)::int AS p7_fragments,
    coalesce(pa.p7_live_links,0)::int AS p7_live_links,
    coalesce(pa.p7_fragments_surviving_raw_expiry,0)::int AS p7_fragments_surviving_raw_expiry,
    CASE WHEN q.horizon='T-6h' THEN coalesce(pr.matched_t6_t90_pairs,0)::int ELSE 0 END AS matched_t6_t90_pairs
   FROM qbase q
   LEFT JOIN live_elig le ON le.run_day_index=q.run_day_index AND le.horizon=q.horizon AND le.slot_id=q.slot_id AND le.airport_icao=q.airport_icao
   LEFT JOIN pre_agg pa ON pa.run_day_index=q.run_day_index AND pa.horizon=q.horizon AND pa.slot_id=q.slot_id AND pa.airport_icao=q.airport_icao
   LEFT JOIN paired pr ON pr.run_day_index=q.run_day_index AND pr.slot_id=q.slot_id AND pr.airport_icao=q.airport_icao
   GROUP BY q.run_day_index,q.horizon,q.slot_id,q.airport_icao,
    le.distinct_native_eligible_flights,le.distinct_conditional_eligible_flights,le.ineligible_members,
    pa.linked_pre_rows,pa.cutoff_safe_pre_rows,pa.native_pre_rows,pa.conditional_pre_rows,pa.t24_witness_rows,
    pa.p7_fragments,pa.p7_live_links,pa.p7_fragments_surviving_raw_expiry,pr.matched_t6_t90_pairs
   ORDER BY q.run_day_index,q.horizon,q.slot_id
  `,[m])).rows;
  const storage=(await c.query(`
   SELECT
    (SELECT count(*)::int FROM phase7_private.pre_fragment_v39) AS p7_total_fragments,
    (SELECT count(*)::int FROM phase7_private.pre_fragment_v39 WHERE research_expiry_utc>transaction_timestamp()) AS p7_unexpired_fragments,
    (SELECT count(*)::int FROM phase7_private.derived_release_bundle_v39) AS p7_total_bundles,
    (SELECT count(*)::int FROM phase7_private.derived_release_bundle_v39 WHERE research_expiry_utc>transaction_timestamp()) AS p7_unexpired_bundles,
    (SELECT count(*)::int FROM phase7_private.pre_source_link_v39 WHERE expires_at_utc>transaction_timestamp()) AS p7_live_links,
    (SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) AS p7_policies,
    (SELECT count(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1 AND rest_category='OUTCOME_REST_UNIT_BUDGET') AS post_outcome_reservations
  `,[m])).rows[0];
  const result=projectScientificYieldReconciliation(cells,storage,new Date(id.at).toISOString());
  begun=false;await c.query("ROLLBACK");
  return result;
 }finally{if(begun)await c.query("ROLLBACK");}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let c;
 try{
  const arg=process.argv[2],match=typeof arg==="string"?/^--native-shape-day=([1-9]|[12][0-9]|3[01])$/.exec(arg):null;
  const yieldMode=arg==="--scientific-yield";
  if((process.argv.length!==2&&!(process.argv.length===3&&(match||yieldMode)))||!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")throw Error("OWNER_CONTEXT");
  const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
  c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
  await c.connect();const result=yieldMode?await readScientificYieldReconciliation(c):match?await readNativeShapeInventory(c,Number(match[1])):await readInventory(c);await c.end();c=null;console.log(JSON.stringify(result));
 }catch(e){console.error(JSON.stringify({status:"P5B_RETENTION_AND_P7_STORAGE_METADATA_HOLD",sqlstate:/^[0-9A-Z]{5}$/.test(e?.code??"")?e.code:null,providerCalls:0,databaseWrites:0}));process.exitCode=2;}
 finally{if(c)await c.end().catch(()=>{});}
}
