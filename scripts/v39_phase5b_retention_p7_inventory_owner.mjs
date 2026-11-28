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
const NEAR_EXPIRY_TASK_STATES=["READY","CLAIMED","WRITE_STARTED_UNKNOWN","VERIFIED_ON_TIME","MISSED","QUARANTINED"];
const NEAR_EXPIRY_SLOTS=["HUB","MID_A","MID_B","REGIONAL"];
const NEAR_EXPIRY_HORIZONS=["T-24h","T-6h","T-90m"];
const MAX_NEAR_EXPIRY_CANDIDATES=512;
function safeCount(v){const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:null;}
function safeIso(v){const s=v instanceof Date?v.toISOString():v;return typeof s==="string"&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s?s:null;}
/**
 * Reconcile the exact V0107 global primary-FIDS next-hour denominator to the
 * currently authorized study manifest, without emitting population/query or
 * flight identifiers. The native cutoff/lead count is a necessary-condition
 * pre-screen only: signed staleness, retained cross-original identity, rights,
 * external review, conditional commissioning and a Stage14 permit remain
 * separate checks.
 */
export function projectNearExpiryRows(rows,observedAtUtc,globalNextHourCount){
 const observed=safeIso(observedAtUtc),global=safeCount(globalNextHourCount);
 if(!observed||global===null||global>MAX_NEAR_EXPIRY_CANDIDATES||!Array.isArray(rows)||rows.length!==global||rows.length>MAX_NEAR_EXPIRY_CANDIDATES)
  throw Error("HOLD_P5B_NEAR_EXPIRY_COUNT_OR_CLOCK");
 const at=Date.parse(observed),seen=new Set();
 const candidates=rows.map((x,i)=>{
  const ordinal=safeCount(x.candidate_ordinal),globalRowCount=safeCount(x.global_count),
   scope=x.study_scope_status,day=x.run_day_index===null?null:safeCount(x.run_day_index),
   slot=x.slot_id??null,horizon=x.horizon??null,
   deadline=safeIso(x.access_deadline_utc),sourceAt=safeIso(x.source_available_at_utc),
   persisted=safeIso(x.raw_persisted_at_utc),
   expected=x.expected_members===null?null:safeCount(x.expected_members),
   observedMembers=safeCount(x.observed_members),native=safeCount(x.native_shape_pass_members),
   timeScreen=safeCount(x.cutoff_lead_prescreen_members),
   taskCount=safeCount(x.task_count),pre=safeCount(x.source_linked_pre_rows),
   cutoffSafe=safeCount(x.cutoff_safe_pre_rows),dayPackets=safeCount(x.day_private_packet_rows),
   dayT24Packets=safeCount(x.day_t24_pre_packet_rows),
   queryState=x.query_state??null;
  if(ordinal===null||ordinal!==i+1||seen.has(ordinal)||globalRowCount!==global||
   !["UNBOUND","OTHER_MANIFEST","ACTIVE_MANIFEST_QUERY_UNMATCHED","ACTIVE_STUDY_SCOPE"].includes(scope)||
   !deadline||Date.parse(deadline)<=at||Date.parse(deadline)>at+3600_000||
   !sourceAt||!persisted||Date.parse(persisted)>Date.parse(sourceAt)||Date.parse(sourceAt)>at||
   observedMembers===null||native===null||timeScreen===null||taskCount===null||pre===null||cutoffSafe===null||
   dayPackets===null||dayT24Packets===null||native>observedMembers||timeScreen>native||
   cutoffSafe>pre||dayT24Packets>dayPackets)
   throw Error("HOLD_P5B_NEAR_EXPIRY_ROW_SHAPE");
  seen.add(ordinal);
  if(scope==="ACTIVE_STUDY_SCOPE"){
   if(day===null||day<1||day>31||!NEAR_EXPIRY_SLOTS.includes(slot)||!NEAR_EXPIRY_HORIZONS.includes(horizon)||
    expected===null||queryState!=="ACTIVE"&&queryState!=="PREPARED"&&queryState!=="STOPPED")
    throw Error("HOLD_P5B_NEAR_EXPIRY_SIGNED_SCOPE");
  }else if(day!==null||slot!==null||horizon!==null||expected!==null||queryState!==null||
    observedMembers!==0||native!==0||timeScreen!==0||taskCount!==0||pre!==0||cutoffSafe!==0||dayPackets!==0||dayT24Packets!==0){
   throw Error("HOLD_P5B_NEAR_EXPIRY_UNSCOPED_LEAK");
  }
  const taskStates=Object.fromEntries(NEAR_EXPIRY_TASK_STATES.map(k=>{
   const n=safeCount(x[`task_${k.toLowerCase()}`]);
   if(n===null||n>taskCount)throw Error("HOLD_P5B_NEAR_EXPIRY_TASK_STATE");
   return [k,n];
  }));
  if(Object.values(taskStates).reduce((a,b)=>a+b,0)>taskCount)
   throw Error("HOLD_P5B_NEAR_EXPIRY_TASK_TOTAL");
  let reconciliation;
  if(scope!=="ACTIVE_STUDY_SCOPE")reconciliation="NOT_IN_ACTIVE_STUDY_SCOPE";
  else if(expected!==observedMembers)reconciliation="MEMBER_BINDING_COUNT_MISMATCH_HOLD";
  else if(timeScreen>0)reconciliation="NATIVE_CUTOFF_LEAD_PRESCREEN_REQUIRES_FULL_REVIEW";
  else reconciliation="NO_NATIVE_CUTOFF_LEAD_PRESCREEN_MEMBER";
  return {
   candidateOrdinal:ordinal,studyScope:scope,runDayIndex:day,airportStratum:slot,horizon,
   sourceAvailableAtUtc:sourceAt,rawPersistedAtUtc:persisted,accessDeadlineUtc:deadline,
   queryState,expectedMembers:expected,observedMembers,
   memberBindingCountMatches:expected===null?null:expected===observedMembers,
   nativeShapePassMembers:native,cutoffLeadPreScreenMembers:timeScreen,
   existingV0087Tasks:{total:taskCount,byState:taskStates},
   sourceLinkedPreRows:pre,cutoffSafeSourceLinkedPreRows:cutoffSafe,
   privatePacketsForStudyDay:{rows:dayPackets,t24PrePackets:dayT24Packets,sourceLinkedToThisOriginal:false},
   reconciliation
  };
 });
 return {
  status:"P5B_NEAR_EXPIRY_STUDY_RECONCILIATION_READONLY",
  observedAtUtc:observed,globalEligibleNextHour:global,
  candidates,studyScopedCandidates:candidates.filter(x=>x.studyScope==="ACTIVE_STUDY_SCOPE").length,
  nativeCutoffLeadPreScreenMembers:candidates.reduce((n,x)=>n+x.cutoffLeadPreScreenMembers,0),
  finalScientificEligibilityCertified:false,stage14PermitIssued:false,
  conditionalPolicyStateRead:false,packetBSourceLinkageForCandidates:false,
  preScreenIsNotAWriteAuthorization:true,providerCalls:0,databaseWrites:0
 };
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
  const nearExpiry=(await c.query(`
   WITH p5b_near_expiry_clock AS MATERIALIZED (
    SELECT transaction_timestamp() AS observed_at
   ), p5b_near_expiry_global AS MATERIALIZED (
    SELECT r.population_query_id,r.available_at AS source_available_at_utc,
     r.raw_persisted_at_utc,
     least(r.raw_persisted_at_utc+interval '24 hours',
       coalesce(b.source_expires_at_utc,r.raw_persisted_at_utc+interval '24 hours')) AS access_deadline_utc,
     CASE WHEN b.population_query_id IS NULL THEN 'UNBOUND'
       WHEN b.manifest_sha256<>$1 THEN 'OTHER_MANIFEST'
       WHEN q.query_digest IS NULL THEN 'ACTIVE_MANIFEST_QUERY_UNMATCHED'
       ELSE 'ACTIVE_STUDY_SCOPE' END AS study_scope_status,
     q.run_day_index,q.slot_id,q.horizon,q.airport_icao,q.query_digest,q.state AS query_state,
     q.service_window_start_utc,q.service_window_end_utc,
     b.manifest_sha256,b.response_hash,b.source_expires_at_utc,b.normalized_members_count,
     clk.observed_at
    FROM clean.fids_query_response r
    LEFT JOIN clean.phase5_fids_original_binding_v39 b USING(population_query_id)
    LEFT JOIN clean.phase5_fids_allowed_query_v39 q
     ON q.query_digest=b.query_digest AND q.manifest_sha256=$1 AND b.manifest_sha256=$1
    CROSS JOIN p5b_near_expiry_clock clk
    WHERE r.raw_payload IS NOT NULL AND r.raw_expired_at_utc IS NULL
     AND least(r.raw_persisted_at_utc+interval '24 hours',
       coalesce(b.source_expires_at_utc,r.raw_persisted_at_utc+interval '24 hours'))>clk.observed_at
     AND least(r.raw_persisted_at_utc+interval '24 hours',
       coalesce(b.source_expires_at_utc,r.raw_persisted_at_utc+interval '24 hours'))<=clk.observed_at+interval '1 hour'
   ), p5b_near_expiry_ordered AS MATERIALIZED (
    SELECT row_number() OVER(ORDER BY access_deadline_utc,population_query_id)::int candidate_ordinal,
     count(*) OVER()::int global_count,*
    FROM p5b_near_expiry_global
   ), p5b_near_expiry_members AS MATERIALIZED (
    SELECT g.population_query_id,p.id,p.analytic_identity_id,
     count(p.id) OVER(PARTITION BY g.population_query_id,p.analytic_identity_id) AS identity_count,
     CASE g.horizon WHEN 'T-24h' THEN interval '24 hours'
       WHEN 'T-6h' THEN interval '6 hours' WHEN 'T-90m' THEN interval '90 minutes' END AS horizon_offset,
     p.dep_scheduled_utc,p.available_at AS member_available_at,
     (p.id IS NOT NULL AND p.analytic_identity_id ~ '^[A-Za-z0-9_.:|-]{5,200}$'
      AND (p.analytic_identity_id NOT LIKE 'leg:p5v1:%' OR p.analytic_identity_id ~ '^leg:p5v1:[a-f0-9]{64}$')
      AND count(p.id) OVER(PARTITION BY g.population_query_id,p.analytic_identity_id)=1
      AND p.canonical_flight_instance_id=p.analytic_identity_id
      AND p.source_airport_icao=g.airport_icao AND p.dep_airport_icao=g.airport_icao
      AND p.population_role='requested_airport_primary' AND p.scope_classification='confirmed_core'
      AND p.codeshare_resolution_status='confirmed_operating_leg' AND p.source_type='fids'
      AND p.response_hash=g.response_hash AND p.provider_content_expired_at_utc IS NULL
      AND p.query_direction='Departure' AND length(p.population_member_id::text)>0
      AND p.dep_scheduled_utc IS NOT NULL) AS native_shape_pass,
     (p.id IS NOT NULL AND p.analytic_identity_id ~ '^[A-Za-z0-9_.:|-]{5,200}$'
      AND (p.analytic_identity_id NOT LIKE 'leg:p5v1:%' OR p.analytic_identity_id ~ '^leg:p5v1:[a-f0-9]{64}$')
      AND count(p.id) OVER(PARTITION BY g.population_query_id,p.analytic_identity_id)=1
      AND p.canonical_flight_instance_id=p.analytic_identity_id
      AND p.source_airport_icao=g.airport_icao AND p.dep_airport_icao=g.airport_icao
      AND p.population_role='requested_airport_primary' AND p.scope_classification='confirmed_core'
      AND p.codeshare_resolution_status='confirmed_operating_leg' AND p.source_type='fids'
      AND p.response_hash=g.response_hash AND p.provider_content_expired_at_utc IS NULL
      AND p.query_direction='Departure' AND length(p.population_member_id::text)>0
      AND p.dep_scheduled_utc>=g.service_window_start_utc AND p.dep_scheduled_utc<g.service_window_end_utc
      AND p.available_at>=g.source_available_at_utc AND p.available_at<=g.observed_at
      AND p.available_at<=p.dep_scheduled_utc-(CASE g.horizon WHEN 'T-24h' THEN interval '24 hours'
       WHEN 'T-6h' THEN interval '6 hours' WHEN 'T-90m' THEN interval '90 minutes' END)
      AND g.source_available_at_utc<=p.dep_scheduled_utc-(CASE g.horizon WHEN 'T-24h' THEN interval '24 hours'
       WHEN 'T-6h' THEN interval '6 hours' WHEN 'T-90m' THEN interval '90 minutes' END)
      AND g.source_expires_at_utc>p.dep_scheduled_utc-(CASE g.horizon WHEN 'T-24h' THEN interval '24 hours'
       WHEN 'T-6h' THEN interval '6 hours' WHEN 'T-90m' THEN interval '90 minutes' END)
      AND g.observed_at<p.dep_scheduled_utc-(CASE g.horizon WHEN 'T-24h' THEN interval '24 hours'
       WHEN 'T-6h' THEN interval '6 hours' WHEN 'T-90m' THEN interval '90 minutes' END)-interval '15 minutes')
      AS cutoff_lead_prescreen_pass
    FROM p5b_near_expiry_ordered g
    LEFT JOIN clean.flight_population p ON p.population_query_id=g.population_query_id
     AND g.study_scope_status='ACTIVE_STUDY_SCOPE'
    WHERE g.candidate_ordinal<=513
   ), p5b_near_expiry_member_summary AS (
    SELECT population_query_id,count(id)::int observed_members,
     count(id) FILTER(WHERE native_shape_pass)::int native_shape_pass_members,
     count(id) FILTER(WHERE cutoff_lead_prescreen_pass)::int cutoff_lead_prescreen_members
    FROM p5b_near_expiry_members GROUP BY population_query_id
   )
   SELECT g.candidate_ordinal,g.global_count,g.study_scope_status,g.run_day_index,g.slot_id,g.horizon,
    g.query_state,g.source_available_at_utc,g.raw_persisted_at_utc,g.access_deadline_utc,
    CASE WHEN g.study_scope_status='ACTIVE_STUDY_SCOPE' THEN g.normalized_members_count END expected_members,
    CASE WHEN g.study_scope_status='ACTIVE_STUDY_SCOPE' THEN coalesce(m.observed_members,0) ELSE 0 END observed_members,
    CASE WHEN g.study_scope_status='ACTIVE_STUDY_SCOPE' THEN coalesce(m.native_shape_pass_members,0) ELSE 0 END native_shape_pass_members,
    CASE WHEN g.study_scope_status='ACTIVE_STUDY_SCOPE' THEN coalesce(m.cutoff_lead_prescreen_members,0) ELSE 0 END cutoff_lead_prescreen_members,
    coalesce(t.task_count,0)::int task_count,coalesce(t.task_ready,0)::int task_ready,
    coalesce(t.task_claimed,0)::int task_claimed,
    coalesce(t.task_write_started_unknown,0)::int task_write_started_unknown,
    coalesce(t.task_verified_on_time,0)::int task_verified_on_time,
    coalesce(t.task_missed,0)::int task_missed,coalesce(t.task_quarantined,0)::int task_quarantined,
    coalesce(s.source_linked_pre_rows,0)::int source_linked_pre_rows,
    coalesce(s.cutoff_safe_pre_rows,0)::int cutoff_safe_pre_rows,
    coalesce(p.day_private_packet_rows,0)::int day_private_packet_rows,
    coalesce(p.day_t24_pre_packet_rows,0)::int day_t24_pre_packet_rows
   FROM (SELECT * FROM p5b_near_expiry_ordered WHERE candidate_ordinal<=513) g
   LEFT JOIN p5b_near_expiry_member_summary m USING(population_query_id)
   LEFT JOIN LATERAL (
    SELECT count(*)::int task_count,count(*) FILTER(WHERE state='READY')::int task_ready,
     count(*) FILTER(WHERE state='CLAIMED')::int task_claimed,
     count(*) FILTER(WHERE state='WRITE_STARTED_UNKNOWN')::int task_write_started_unknown,
     count(*) FILTER(WHERE state='VERIFIED_ON_TIME')::int task_verified_on_time,
     count(*) FILTER(WHERE state='MISSED')::int task_missed,
     count(*) FILTER(WHERE state='QUARANTINED')::int task_quarantined
    FROM clean.phase5_cd_pre_task_v39 qtask
    WHERE qtask.manifest_sha256=$1 AND qtask.source_population_query_id=g.population_query_id::text
     AND qtask.source_response_sha256=g.response_hash AND qtask.horizon=g.horizon
   ) t ON true
   LEFT JOIN LATERAL (
    SELECT count(*)::int source_linked_pre_rows,
     count(*) FILTER(WHERE snap.created_at<=snap.prediction_cutoff_utc)::int cutoff_safe_pre_rows
    FROM clean.flight_snapshots snap
    WHERE snap.population_query_id=g.population_query_id::text AND snap.fids_response_hash=g.response_hash
     AND snap.horizon=g.horizon AND snap.prediction_state='PRE_DEPARTURE'
   ) s ON true
   LEFT JOIN LATERAL (
    SELECT count(*)::int day_private_packet_rows,
     count(*) FILTER(WHERE packet.kind='T24_PRE_PACKET')::int day_t24_pre_packet_rows
    FROM phase6_private.frozen_native_packet_v39 packet
    WHERE packet.manifest_sha256=$1 AND packet.run_day_index=g.run_day_index
   ) p ON true
   ORDER BY g.candidate_ordinal`,[auth[0].manifest_sha256])).rows;
  const nearExpiryGlobal=nearExpiry.length?safeCount(nearExpiry[0].global_count):0;
  const nearExpiryObserved=nearExpiry.filter(x=>x.candidate_ordinal!==null);
  const nearExpiryReport=projectNearExpiryRows(nearExpiryObserved,new Date(id.at).toISOString(),nearExpiryGlobal);
  const fragments=(await c.query("SELECT split,horizon,count(*)::int rows,count(*) FILTER(WHERE research_expiry_utc>transaction_timestamp())::int unexpired FROM phase7_private.pre_fragment_v39 GROUP BY 1,2 ORDER BY 1,2")).rows;
  const bundles=(await c.query("SELECT count(*)::int rows,count(*) FILTER(WHERE research_expiry_utc>transaction_timestamp())::int unexpired,(SELECT count(*)::int FROM phase7_private.pre_source_link_v39) links,(SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) policies FROM phase7_private.derived_release_bundle_v39")).rows[0];
  const result=project(rows,fragments,bundles,new Date(id.at).toISOString());
  begun=false;await c.query("ROLLBACK");
  return {...result,nearExpiry:nearExpiryReport};
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
