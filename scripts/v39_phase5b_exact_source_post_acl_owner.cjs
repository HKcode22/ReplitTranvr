// Phase5B exact owner permission repair. Only source population serial USAGE
// and POST metadata SELECT; no table-wide PRE access, no provider, data rows,
// reservations, replay, membership persistence or dispatch.
"use strict";
const {createRequire}=require("node:module"),{join}=require("node:path");
const {Client}=createRequire(join(process.cwd(),"package.json"))("pg");
const role="phase5_fids_source_prod_20261107",login="phase5_p5_source_login_20261108",owner="neondb_owner";
const cols=["created_at","fids_response_hash","flight_instance_id","frame_hash","horizon","id","population_member_id","population_query_id","prediction_cutoff_utc","prediction_state","selected_t_milestone_utc"];
const post=["SELECT q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc,count(DISTINCT s.id)::int AS n FROM clean.phase5_fids_allowed_query_v39 q JOIN clean.phase5_fids_original_binding_v39 b ON b.query_digest=q.query_digest AND b.manifest_sha256=q.manifest_sha256 JOIN clean.flight_snapshots s ON s.population_query_id=b.population_query_id::text AND s.fids_response_hash=b.response_hash WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.query_digest=ANY($3::text[]) AND s.frame_hash=$4 AND s.prediction_state='PRE_DEPARTURE' AND s.horizon=q.horizon AND s.created_at<=s.prediction_cutoff_utc AND s.created_at<=$5::timestamptz AND b.source_expires_at_utc>$5::timestamptz GROUP BY q.query_digest,q.horizon,q.airport_icao,q.service_window_start_utc,q.service_window_end_utc LIMIT 385","SELECT s.id::text AS snapshot_id,s.horizon,q.query_digest, s.created_at,s.prediction_cutoff_utc, s.selected_t_milestone_utc,s.fids_response_hash, r.available_at AS original_available_at, b.source_expires_at_utc,b.response_hash AS binding_response_hash FROM clean.flight_snapshots s JOIN clean.phase5_fids_original_binding_v39 b ON b.population_query_id::text=s.population_query_id JOIN clean.phase5_fids_allowed_query_v39 q ON q.query_digest=b.query_digest AND q.manifest_sha256=b.manifest_sha256 JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash JOIN clean.flight_population fp ON fp.population_query_id=b.population_query_id AND fp.population_member_id=s.population_member_id AND fp.canonical_flight_instance_id=s.flight_instance_id WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.airport_icao=$3 AND s.flight_instance_id=$4 AND s.frame_hash=$5 AND s.prediction_state='PRE_DEPARTURE' AND fp.source_airport_icao=q.airport_icao AND fp.population_role='requested_airport_primary' AND fp.source_type='fids' AND fp.codeshare_resolution_status='confirmed_operating_leg' AND fp.available_at<=s.prediction_cutoff_utc AND fp.provider_content_expired_at_utc IS NULL AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL AND b.source_expires_at_utc>transaction_timestamp() AND s.fids_response_hash=b.response_hash AND q.horizon=s.horizon AND s.horizon IN ('T-24h','T-6h','T-90m')","SELECT s.flight_instance_id,s.id::text AS snapshot_id,s.horizon,q.query_digest, s.created_at,s.prediction_cutoff_utc, s.selected_t_milestone_utc,s.fids_response_hash, r.available_at AS original_available_at, b.source_expires_at_utc,b.response_hash AS binding_response_hash FROM clean.flight_snapshots s JOIN clean.phase5_fids_original_binding_v39 b ON b.population_query_id::text=s.population_query_id JOIN clean.phase5_fids_allowed_query_v39 q ON q.query_digest=b.query_digest AND q.manifest_sha256=b.manifest_sha256 JOIN clean.fids_query_response r ON r.population_query_id=b.population_query_id AND r.response_hash=b.response_hash JOIN clean.flight_population fp ON fp.population_query_id=b.population_query_id AND fp.population_member_id=s.population_member_id AND fp.canonical_flight_instance_id=s.flight_instance_id WHERE q.manifest_sha256=$1 AND q.run_day_index=$2 AND q.airport_icao=$3 AND s.flight_instance_id=ANY($4::text[]) AND s.frame_hash=$5 AND s.prediction_state='PRE_DEPARTURE' AND fp.source_airport_icao=q.airport_icao AND fp.population_role='requested_airport_primary' AND fp.source_type='fids' AND fp.codeshare_resolution_status='confirmed_operating_leg' AND fp.available_at<=s.prediction_cutoff_utc AND fp.provider_content_expired_at_utc IS NULL AND r.raw_expired_at_utc IS NULL AND r.raw_payload IS NOT NULL AND b.source_expires_at_utc>transaction_timestamp() AND s.fids_response_hash=b.response_hash AND q.horizon=s.horizon AND s.horizon IN ('T-24h','T-6h','T-90m') ORDER BY s.flight_instance_id,s.horizon,s.id LIMIT $6"];
const source=[{"label":"RAW_RESPONSE_INSERT","sql":"INSERT INTO clean.fids_query_response\n       (population_query_id, source_airport_icao, query_direction, service_window_start_utc,\n        service_window_end_utc, from_local, to_local, airport_iana_timezone, fids_retrieval_utc,\n        raw_persisted_at_utc, available_at, response_hash, raw_payload, provider_api_version,\n        fids_protocol_version, openapi_sha256)\n       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),GREATEST($10,now()),$11,$12,$13,$14,$15)\n       RETURNING available_at","n":15},{"label":"POPULATION_LEGACY_CONFLICT_INSERT","sql":"INSERT INTO clean.flight_population\n         (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,\n          flight_number, carrier_iata, carrier_icao, call_sign, dep_airport_icao, dep_airport_iata,\n          arr_airport_icao, arr_airport_iata, dep_scheduled_utc, arr_scheduled_utc, source_type,\n          provider_record_key, raw_payload_sha256, population_query_id, query_direction,\n          population_role, from_local, to_local, airport_iana_timezone, scope_classification,\n          codeshare_resolution_status, fids_retrieval_utc, available_at, response_hash,\n          canonical_flight_instance_id, analytic_identity_id, provider_api_version,\n          fids_protocol_version, openapi_sha256)\n         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,(SELECT GREATEST($28::timestamptz, q.available_at) FROM clean.fids_query_response q WHERE q.population_query_id=$19::uuid),$29,$30,$31,$32,$33,$34) ON CONFLICT ON CONSTRAINT flight_population_key DO NOTHING","n":34},{"label":"POPULATION_FALLBACK_INSERT","sql":"INSERT INTO clean.flight_population\n         (batch_id, source_airport_icao, window_start_utc, window_end_utc, cutoff_utc,\n          flight_number, carrier_iata, carrier_icao, call_sign, dep_airport_icao, dep_airport_iata,\n          arr_airport_icao, arr_airport_iata, dep_scheduled_utc, arr_scheduled_utc, source_type,\n          provider_record_key, raw_payload_sha256, population_query_id, query_direction,\n          population_role, from_local, to_local, airport_iana_timezone, scope_classification,\n          codeshare_resolution_status, fids_retrieval_utc, available_at, response_hash,\n          canonical_flight_instance_id, analytic_identity_id, provider_api_version,\n          fids_protocol_version, openapi_sha256)\n         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,(SELECT GREATEST($28::timestamptz, q.available_at) FROM clean.fids_query_response q WHERE q.population_query_id=$19::uuid),$29,$30,$31,$32,$33,$34) ON CONFLICT (population_query_id, analytic_identity_id, population_role) DO NOTHING","n":34},{"label":"ORIGINAL_BINDING_INSERT","sql":"INSERT INTO clean.phase5_fids_original_binding_v39(population_query_id,reservation_sha256,query_digest,manifest_sha256,response_hash,decoded_original_body_sha256,rights_review_sha256,normalized_members_count,source_expires_at_utc) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING bound_at_utc","n":9}];
const h="0".repeat(64),args=[[h,1,[h],h,new Date().toISOString()],[h,1,"XXXX","fixture-not-a-flight",h],[h,1,"XXXX",["fixture-not-a-flight"],h,7]];
const emit=(status,x={})=>console.log(JSON.stringify({status,...x,providerCalls:0,paidReservations:0,flightDataWrites:0,workflowDispatches:0}));
const safe=e=>typeof e?.code==="string"&&/^[0-9A-Z]{5}$/.test(e.code)?e.code:null;
const stop=x=>{throw Error(x)};
const mode=process.argv[2];
let stage="START";
async function access(c){
 const q=(await c.query("SELECT has_schema_privilege($1,'clean','USAGE') schema_usage,has_table_privilege($1,'clean.flight_snapshots','SELECT') pre_table_select,has_table_privilege($1,'clean.flight_snapshots','INSERT') pre_insert,has_table_privilege($1,'clean.flight_snapshots','UPDATE') pre_update,has_table_privilege($1,'clean.flight_snapshots','DELETE') pre_delete,has_table_privilege($1,'clean.phase5_fids_physical_attempt_v39','INSERT') direct_paid_insert,has_table_privilege($1,'clean.phase5_fids_allowed_query_v39','INSERT') prepare_insert",[role])).rows[0];
 const rows=(await c.query("SELECT x AS col,has_column_privilege($1,'clean.flight_snapshots',x,'SELECT') AS readable FROM unnest($2::text[]) x ORDER BY 1",[role,cols])).rows;
 if(!q.schema_usage||q.pre_table_select||q.pre_insert||q.pre_update||q.pre_delete||q.direct_paid_insert||q.prepare_insert||rows.length!==cols.length)stop("UNEXPECTED_SOURCE_MATRIX");
 const existing=(await c.query("SELECT t AS relation,has_table_privilege($1,t,'SELECT') sel,has_table_privilege($1,t,'INSERT') ins FROM unnest(ARRAY['clean.fids_query_response','clean.flight_population','clean.phase5_fids_original_binding_v39']) t",[role])).rows;
 if(existing.length!==3||existing.some(x=>!x.sel||!x.ins))stop("EXISTING_SOURCE_CUSTODY_GRANTS_MISSING");
 return {readable:rows.filter(x=>x.readable).map(x=>x.col),existing};
}
async function membership(c){
 const q=(await c.query("SELECT t.rolname target,m.rolname member,g.rolname grantor,a.admin_option,a.set_option,a.inherit_option FROM pg_auth_members a JOIN pg_roles t ON t.oid=a.roleid JOIN pg_roles m ON m.oid=a.member JOIN pg_roles g ON g.oid=a.grantor WHERE t.rolname=$1 AND m.rolname=ANY($2::text[]) ORDER BY member,grantor",[role,[owner,login]])).rows;
 return q;
}
async function main(){
 if(!["APPLY_EXACT_SOURCE_POST_REPAIR","VERIFY_ONLY"].includes(mode)||!process.env.DATABASE_URL)stop("EXACT_OWNER_MODE_REQUIRED");
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
 try{
  stage="CONNECT";await c.connect();
  stage="OWNER_TRANSACTION";await c.query("BEGIN");
  await c.query("SET LOCAL statement_timeout='15s'");await c.query("SET LOCAL lock_timeout='3s'");
  const id=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('server_version_num')::int ver,pg_has_role(current_user,$1,'SET') can_set",[role])).rows[0];
  if(!id.db||!id.owner||!id.login||!id.primary||id.ver<160000||id.ver>=170000)stop("WRONG_OWNER_CONTEXT");
  stage="BASELINE_METADATA";
  const before=await access(c),members=await membership(c);
  const actual=members.filter(x=>x.member===login);
  if(actual.length!==1||!actual[0].set_option||actual[0].admin_option||actual[0].inherit_option)stop("SOURCE_LOGIN_MEMBERSHIP_DRIFT");
  emit("P6_SOURCE_OWNER_ROLE_ENTRY_BASELINE",{ownerCanSetRole:id.can_set,ownerAdminMembership:members.some(x=>x.member===owner&&x.admin_option),dedicatedLoginSetMembership:true,existingPostReadableColumns:before.readable.length,existingSourceCustodyGrants:before.existing});
  stage="SEQUENCE_METADATA";
  const sq=(await c.query(`SELECT c.is_identity,c.column_default LIKE 'nextval(%' AS serial_default,
   pg_get_serial_sequence('clean.flight_population','id') AS seq
   FROM information_schema.columns c WHERE c.table_schema='clean' AND c.table_name='flight_population' AND c.column_name='id'`)).rows;
  if(sq.length!==1||!sq[0].seq)stop("SOURCE_POPULATION_SEQUENCE_NOT_BOUND");
  const seq=sq[0],sn=(await c.query("SELECT n.nspname schema,c.relname name,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=$1::regclass",[seq.seq])).rows[0];
  if(sn?.schema!=="clean"||sn.relkind!=="S"||!/^flight_population_[a-z0-9_]+_seq$/.test(sn.name))stop("UNEXPECTED_SEQUENCE_IDENTITY");
  const seqName="clean."+sn.name;
  const seqPriv=async()=> (await c.query("SELECT has_sequence_privilege($1,$2,'USAGE') u,has_sequence_privilege($1,$2,'UPDATE') upd",[role,seqName])).rows[0];
  const initialSeq=await seqPriv();
  const serial=seq.is_identity==="NO"&&seq.serial_default===true;
  emit("P6_SOURCE_SEQUENCE_BASELINE",{serialDefault:serial,identity:seq.is_identity==="YES",usage:initialSeq.u,update:initialSeq.upd,needsGrant:serial&&!initialSeq.u&&!initialSeq.upd});
  stage="OWNER_EXACT_SQL_PARSE";
  for(const t of source)await c.query("EXPLAIN (COSTS OFF) "+t.sql,Array(t.n).fill(null));
  for(let i=0;i<post.length;i++)await c.query("EXPLAIN (COSTS OFF) "+post[i],args[i]);
  const missing=cols.filter(x=>!before.readable.includes(x));
  const needsSeq=serial&&!initialSeq.u&&!initialSeq.upd;
  if(mode==="APPLY_EXACT_SOURCE_POST_REPAIR"){
   stage="GRANT_POST_METADATA";if(missing.length)await c.query("GRANT SELECT ("+missing.join(",")+") ON clean.flight_snapshots TO "+role);
   stage="GRANT_SOURCE_SERIAL";if(needsSeq)await c.query("GRANT USAGE ON SEQUENCE "+seqName+" TO "+role);
  }
  stage="GRANT_READBACK";
  const after=await access(c),afterSeq=await seqPriv();
  if(after.readable.length!==cols.length||serial&&!afterSeq.u&&!afterSeq.upd)stop("EXACT_GRANTS_NOT_PRESENT");
  // The original stage26 intentionally installs owner admin-only membership.
  // If SET is false, temporarily authorize SET inside a savepoint. This is
  // rolled back even on success before committing the narrowly scoped ACLs.
  // No role membership changes persist; exact original membership compared.
  stage="TEMP_ROLE_ENTRY";await c.query("SAVEPOINT scoped_role_probe");
  try{
   if(!id.can_set){
    if(!members.some(x=>x.member===owner&&x.admin_option))stop("OWNER_HAS_NO_ADMIN_FOR_TEMP_SET");
    await c.query("GRANT "+role+" TO "+owner+" WITH SET TRUE, INHERIT FALSE");
   }
   await c.query("SET LOCAL ROLE "+role);
   const who=(await c.query("SELECT current_user=$1 correct,session_user=$2 owner",[role,owner])).rows[0];
   if(!who.correct||!who.owner)stop("SCOPED_ROLE_NOT_ENTERED");
   emit("P6_SOURCE_RESTRICTED_ROLE_ENTERED",{actualDedicatedLoginProven:false,temporaryOwnerSet:!id.can_set});
   for(const t of source){stage=t.label;await c.query("EXPLAIN (COSTS OFF) "+t.sql,Array(t.n).fill(null));emit("P6_EXACT_ROLE_SQL_PASS",{stage});}
   for(let i=0;i<post.length;i++){stage="POST_EXPLAIN_"+(i+1);await c.query("EXPLAIN (COSTS OFF) "+post[i],args[i]);emit("P6_EXACT_ROLE_SQL_PASS",{stage});}
  }finally{await c.query("ROLLBACK TO SAVEPOINT scoped_role_probe");await c.query("RELEASE SAVEPOINT scoped_role_probe");}
  stage="MEMBERSHIP_RESTORATION";
  if(JSON.stringify(await membership(c))!==JSON.stringify(members))stop("TEMP_ROLE_MEMBERSHIP_NOT_RESTORED");
  const restored=(await c.query("SELECT current_user=$1 owner,pg_has_role(current_user,$2,'SET') can_set",[owner,role])).rows[0];
  if(!restored.owner||restored.can_set!==id.can_set)stop("TEMP_ROLE_ENTRY_NOT_RESTORED");
  stage="COMMIT";
  if(mode==="VERIFY_ONLY")await c.query("ROLLBACK");else await c.query("COMMIT");
  emit(mode==="VERIFY_ONLY"?"P6_SOURCE_POST_EXACT_ROLE_VERIFY_PASS":"P6_SOURCE_POST_EXACT_GRANTS_COMMITTED",{addedPostColumns:mode==="VERIFY_ONLY"?[]:missing,sourceSerialUsageAdded:mode!=="VERIFY_ONLY"&&needsSeq,exactSqlChecks:7,ownerMembershipUnchanged:true,tableWidePreSelect:false,preWrites:false,actualDedicatedLoginProven:false});
 }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}
 finally{await c.end().catch(()=>{});}
}
main().catch(e=>{emit("P6_SOURCE_POST_EXACT_REPAIR_HOLD",{stage,reason:/^[A-Z_]+$/.test(e?.message??"")?e.message:"DB_ERROR_REDACTED",sqlstate:safe(e)});process.exitCode=2;});
