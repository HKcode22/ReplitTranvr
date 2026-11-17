'use strict';
// Owner-local, counts only. The catalog describes the intended source bridge,
// not proven provenance, legal entitlement, or permission to retain values.
const hold=x=>{throw Error('HOLD_P5_PRE_FIELD_INVENTORY_'+x);};
const catalog=Object.freeze({
 origin_icao:'ADB_IDENTIFIER_CONTEXT',destination_icao:'ADB_IDENTIFIER_CONTEXT',
 operating_carrier:'ADB_LITERAL',scheduled_arrival_utc:'ADB_LITERAL',
 provider_revised_departure_utc:'ADB_LITERAL',reported_pre_departure_status:'ADB_LITERAL',
 origin_metar_visibility_m:'NOAA_CONTEXT',origin_metar_wind_kt:'NOAA_CONTEXT',
 origin_taf_flight_category:'NOAA_CONTEXT',destination_taf_flight_category:'NOAA_CONTEXT',
 prior_aircraft_adsb_not_ground_reported:'ADSB_CONTEXT',prior_aircraft_adsb_position_age_seconds:'ADSB_CONTEXT',
 prior_aircraft_turnaround_minutes:'HISTORY_CONTEXT',prior_route_departure_delay_median_minutes:'HISTORY_CONTEXT',
 prior_airport_departure_delay_median_minutes:'HISTORY_CONTEXT',airport_congestion_1h:'HISTORY_CONTEXT',
 // Historical G5A staging blob f0dbd65ce306a3cd10a6d2317ad1148f078b0a8c.
 fids_departure_schedule_asof:'ADB_LITERAL',
 webhook_optional:'P4_OPTIONAL_WEBHOOK',weather_optional:'P4_OPTIONAL_WEATHER',
 g5a_population_scope_evidence:'P4_SCOPE_EVIDENCE',
 g5a_operating_identity_evidence:'P4_IDENTITY_EVIDENCE'
});
const horizons=Object.freeze(['T-24h','T-6h','T-90m','OTHER']);
const identitySql=`SELECT current_database() db,current_user actor,session_user login,
 current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,
 pg_is_in_recovery() replica,transaction_timestamp() observed`;
const snapshotSql=`SELECT CASE WHEN horizon::text IN ('T-24h','T-6h','T-90m') THEN horizon::text ELSE 'OTHER' END horizon,
 count(*)::int snapshots,
 count(*) FILTER(WHERE jsonb_typeof(features_json) IS DISTINCT FROM 'array')::int non_array_features,
 count(*) FILTER(WHERE selected_t_milestone_utc IS NOT NULL)::int selected_t_present,
 count(*) FILTER(WHERE selected_t_version IS NOT NULL)::int selected_t_version_present,
 count(*) FILTER(WHERE population_query_id IS NOT NULL)::int query_id_present,
 count(*) FILTER(WHERE fids_response_hash IS NOT NULL)::int response_hash_present,
 count(*) FILTER(WHERE schedule_version IS NOT NULL)::int schedule_version_present,
 count(*) FILTER(WHERE flight_instance_id IS NOT NULL)::int flight_id_present,
 count(*) FILTER(WHERE provenance_json IS NOT NULL)::int provenance_present,
 count(*) FILTER(WHERE missingness_flags IS NOT NULL)::int missingness_present
 FROM clean.flight_snapshots WHERE prediction_state='PRE_DEPARTURE' GROUP BY 1`;
const fieldSql=`WITH snapshots AS (
 SELECT row_number() OVER () sid,
  CASE WHEN horizon::text IN ('T-24h','T-6h','T-90m') THEN horizon::text ELSE 'OTHER' END horizon,features_json
 FROM clean.flight_snapshots WHERE prediction_state='PRE_DEPARTURE'
), entries AS (
 SELECT s.sid,s.horizon,x.entry,
  (jsonb_typeof(x.entry)='object' AND jsonb_typeof(x.entry->'name')='string'
   AND length(x.entry->>'name')>0 AND x.entry ? 'value') AS valid
 FROM snapshots s CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(s.features_json)='array' THEN s.features_json ELSE '[]'::jsonb END) x(entry)
), classified AS (
 SELECT sid,horizon,CASE WHEN valid IS NOT TRUE THEN '__MALFORMED__'
  WHEN entry->>'name'=ANY($1::text[]) THEN entry->>'name' ELSE '__UNKNOWN__' END field,
  (entry->'value' IS NOT NULL AND entry->'value'<>'null'::jsonb) nonnull
 FROM entries
) SELECT horizon,field,count(*)::int entries,count(DISTINCT sid)::int snapshots,
 count(*) FILTER(WHERE nonnull)::int nonnull_entries,
 count(DISTINCT sid) FILTER(WHERE nonnull)::int nonnull_snapshots
 FROM classified GROUP BY horizon,field`;
// Count unknown provenance keys without returning any key or value. Expected
// keys are taken from the existing PRE builder, not a retention whitelist.
const provenanceSql=`SELECT CASE WHEN horizon::text IN ('T-24h','T-6h','T-90m') THEN horizon::text ELSE 'OTHER' END horizon,
 count(*) FILTER(WHERE jsonb_typeof(provenance_json) IS DISTINCT FROM 'object')::int non_object_provenance,
 count(*) FILTER(WHERE jsonb_typeof(provenance_json)='object' AND EXISTS(
 SELECT 1 FROM jsonb_object_keys(CASE WHEN jsonb_typeof(provenance_json)='object' THEN provenance_json ELSE '{}'::jsonb END) k(key)
 WHERE NOT(k.key=ANY($1::text[]))))::int unexpected_provenance_key_snapshots
 FROM clean.flight_snapshots WHERE prediction_state='PRE_DEPARTURE' GROUP BY 1`;
const provenanceKeys=Object.freeze(['builderVersion','populationQueryId','fidsResponseHash','scheduleVersion','frameHash','configHash','missingnessFlags']);
const snapshotKeys=['snapshots','non_array_features','selected_t_present','selected_t_version_present','query_id_present','response_hash_present','schedule_version_present','flight_id_present','provenance_present','missingness_present'];
const fieldKeys=['entries','snapshots','nonnull_entries','nonnull_snapshots'];
const provKeys=['non_object_provenance','unexpected_provenance_key_snapshots'];
const num=x=>Number.isSafeInteger(x)&&x>=0;
const fields=Object.freeze([...Object.keys(catalog),'__MALFORMED__','__UNKNOWN__']);
function shape(r,ids,counts){
 if(!r||Object.keys(r).sort().join('|')!==[...ids,...counts].sort().join('|')||counts.some(k=>!num(r[k])))hold('INVALID_AGGREGATE_SHAPE');
}
function assemble(srows,frows,prows){
 if(![srows,frows,prows].every(Array.isArray))hold('INVALID_ROW_SET');
 const sm=new Map(),fm=new Map(),pm=new Map();
 for(const r of srows){shape(r,['horizon'],snapshotKeys);
  if(!horizons.includes(r.horizon)||sm.has(r.horizon)||r.snapshots===0||snapshotKeys.slice(1).some(k=>r[k]>r.snapshots))hold('SNAPSHOT_COUNT_SCOPE');
  sm.set(r.horizon,r);}
 for(const r of frows){shape(r,['horizon','field'],fieldKeys);
  const id=r.horizon+'/'+r.field,s=sm.get(r.horizon);
  if(!s||!fields.includes(r.field)||fm.has(id)||r.entries===0||r.snapshots===0||r.snapshots>r.entries||r.snapshots>s.snapshots-s.non_array_features||r.nonnull_entries>r.entries||r.nonnull_snapshots>r.snapshots||r.nonnull_snapshots>r.nonnull_entries||(r.nonnull_entries===0)!==(r.nonnull_snapshots===0))hold('FIELD_COUNT_SCOPE');
  fm.set(id,r);}
 for(const r of prows){shape(r,['horizon'],provKeys);const s=sm.get(r.horizon);
  if(!s||pm.has(r.horizon)||provKeys.some(k=>r[k]>s.snapshots)||r.non_object_provenance+r.unexpected_provenance_key_snapshots>s.snapshots)hold('PROVENANCE_COUNT_SCOPE');pm.set(r.horizon,r);}
 if(pm.size!==sm.size)hold('MISSING_PROVENANCE_GROUP');
 const zero=ks=>Object.fromEntries(ks.map(k=>[k,0]));
 const result=horizons.map(h=>{const s=sm.get(h)??zero(snapshotKeys),p=pm.get(h)??zero(provKeys);
  return {horizon:h,...Object.fromEntries(snapshotKeys.map(k=>[k,s[k]])),...Object.fromEntries(provKeys.map(k=>[k,p[k]])),
   fields:fields.map(field=>{const v=fm.get(h+'/'+field)??zero(fieldKeys);return {field,expectedSourceClass:catalog[field]??'REVIEW_REQUIRED',...Object.fromEntries(fieldKeys.map(k=>[k,v[k]]))};})};});
 const findings=[];
 if(result.some(h=>h.non_array_features||h.non_object_provenance||h.unexpected_provenance_key_snapshots||h.horizon==='OTHER'&&h.snapshots))findings.push('SNAPSHOT_OR_PROVENANCE_SHAPE_REVIEW');
 if(result.some(h=>h.fields.some(f=>f.expectedSourceClass==='REVIEW_REQUIRED'&&f.entries)))findings.push('UNKNOWN_OR_MALFORMED_FEATURE_REVIEW');
 if(result.some(h=>h.fields.some(f=>f.expectedSourceClass!=='REVIEW_REQUIRED'&&f.entries>f.snapshots)))findings.push('DUPLICATE_KNOWN_FIELD_REVIEW');
 if(result.some(h=>h.selected_t_present||h.fields.some(f=>f.expectedSourceClass==='ADB_LITERAL'&&f.nonnull_entries)))findings.push('ADB_DESCRIPTIVE_CONTENT_REVIEW');
 if(result.some(h=>h.flight_id_present||h.query_id_present||h.response_hash_present||h.fields.some(f=>f.expectedSourceClass==='ADB_IDENTIFIER_CONTEXT'&&f.nonnull_entries)))findings.push('LINKAGE_SCOPE_REVIEW');
 if(result.some(h=>h.fields.some(f=>['NOAA_CONTEXT','ADSB_CONTEXT','HISTORY_CONTEXT'].includes(f.expectedSourceClass)&&f.nonnull_entries)))findings.push('OTHER_SOURCE_RIGHTS_REVIEW');
 if(result.some(h=>h.fields.some(f=>['P4_SCOPE_EVIDENCE','P4_IDENTITY_EVIDENCE'].includes(f.expectedSourceClass)&&f.nonnull_entries)))findings.push('HISTORICAL_G5A_EVIDENCE_REVIEW');
 if(result.some(h=>h.fields.some(f=>['P4_OPTIONAL_WEBHOOK','P4_OPTIONAL_WEATHER'].includes(f.expectedSourceClass)&&f.nonnull_entries)))findings.push('HISTORICAL_OPTIONAL_NON_NULL_REVIEW');
 return {totalSnapshots:result.reduce((a,h)=>a+h.snapshots,0),horizons:result,findings};
}
async function review(c){
 let began=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');began=true;
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const rows=(await c.query(identitySql)).rows,a=rows?.[0];
  if(rows?.length!==1||a.db!=='neondb'||a.actor!=='neondb_owner'||a.actor!==a.login||a.ver<160000||a.ver>=170000||a.ro!=='on'||a.replica!==false||!Number.isFinite(Date.parse(a.observed)))hold('NOT_EXISTING_PG16_PRIMARY_OWNER_READONLY');
  const s=(await c.query(snapshotSql)).rows,f=(await c.query(fieldSql,[Object.keys(catalog)])).rows,p=(await c.query(provenanceSql,[provenanceKeys])).rows;
  const counts=assemble(s,f,p);
  await c.query('ROLLBACK');began=false;
  return {status:'PRE_FIELD_INVENTORY_REVIEW_ONLY_NO_GO',observedAtUtc:new Date(a.observed).toISOString(),...counts,
   exactSnapshotAggregateCounts:true,fieldValuesExported:false,unexpectedNamesExported:false,sourceProvenanceVerified:false,
   derivedWorkCertified:false,accountRightsVerified:false,backupOrPitrVerified:false,providerCalls:0,databaseWrites:0,phase5ScientificFreeze:false,phase6PaidGo:false};
 }finally{if(began)await c.query('ROLLBACK').catch(()=>{});}
}
// Compact stdout only; preserve full review and its count semantics.
function compactReport(report){
 return {...report,zeroEntryFieldGroupsOmitted:true,horizons:report.horizons.map(h=>({
  ...h,fields:h.fields.filter(f=>f.entries!==0)
 }))};
}
async function main(){
 const e=process.env;
 if(e.GITHUB_ACTIONS==='true'||!e.DATABASE_URL||e.NODE_TLS_REJECT_UNAUTHORIZED==='0'||e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET)hold('OWNER_LOCAL_SCOPE');
 let u;try{u=new URL(e.DATABASE_URL);if(!['postgres:','postgresql:'].includes(u.protocol)||decodeURIComponent(u.username)!=='neondb_owner'||!u.password||!u.hostname.endsWith('.neon.tech')||u.pathname!=='/neondb'||u.hash||!['require','verify-full'].includes(u.searchParams.get('sslmode'))||[...u.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k)))hold('EXISTING_TLS_OWNER_REQUIRED');u.searchParams.set('sslmode','verify-full');}catch{hold('EXISTING_TLS_OWNER_REQUIRED');}
 const {Client}=require(require.resolve('pg',{paths:[process.cwd()]}));
 const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000,options:'-c default_transaction_read_only=on',application_name:'p5_pre_field_inventory'});
 try{await c.connect();console.log(JSON.stringify(compactReport(await review(c))));}finally{await c.end().catch(()=>{});}
}
module.exports={catalog,horizons,identitySql,snapshotSql,fieldSql,provenanceSql,provenanceKeys,assemble,review,compactReport};
if(require.main===module)main().catch(e=>{const m=String(e?.message??'');console.error(/^HOLD_P5_PRE_FIELD_INVENTORY_[A-Z_]+$/.test(m)?m:'HOLD_P5_PRE_FIELD_INVENTORY_REDACTED');process.exitCode=2;});
