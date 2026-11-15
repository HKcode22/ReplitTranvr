/** Real PostgreSQL16 schema + restricted SOURCE-role observation only.
 * All rows are synthetic historical clock fixtures in a disposable DB.
 * No production migration, charge, provider, or independently verified label.
 */
import {describe,it,expect} from "vitest";
import {Pool} from "pg";
import {exerciseNativePostPublication} from "./phase6_native_post_real_publication_fixture_v39";
import {createHash} from "node:crypto";
import {addCanonicalFidsEnvelopeHashV39} from "../server/lib/disruption/fidsEnvelopeCanonical_v39";
import {p5V0083FuturePostReservationSha256,auditP5FuturePostActualPriorPre,auditP5FuturePostActualPriorPreBatch,type P5ReviewedFuturePostOneGet} from "../server/lib/disruption/phase5V0083FuturePostOriginalDb_v39";
import {readP6CommittedPostOutcomeObservability} from "../server/lib/disruption/phase6ActualPostOutcomeObservability_v39";
import {readP6PostSourceQueryHints} from "../server/lib/disruption/phase6NativePostSignedPublication_v39.mjs";
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const SOURCE="phase5_fids_source_prod_20261107",LOGIN="phase5_p5_source_login_20261108";
const h=(s:string)=>s.repeat(64),sha=(s:string|Buffer)=>createHash("sha256").update(s).digest("hex");
const active=process.env.P6_POST_OUTCOME_DISPOSABLE_PG16==="1"?describe:describe.skip;
active("actual V0079 + POST original on disposable PostgreSQL16",()=>{
 it("reads actual retained PRE partition and POST original without writes or paid source; no silent anchor-only matching",async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==URL||process.env.V39_DATABASE_RUNTIME_URL!==URL||
     process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.AERODATABOX_API_KEY||process.env.V39_P5_SOURCE_DATABASE_URL||process.env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL)
   throw Error("HOLD_P6_POST_TEST_DISPOSABLE_ONLY");
  const db=new Pool({connectionString:URL,max:1});
  let login:Pool|undefined;
  try{
   const who=(await db.query("SELECT current_database() AS db,current_user AS role,current_setting('server_version_num')::int AS ver,clock_timestamp() AS t")).rows[0];
   expect(who.db).toBe("neondb");expect(who.role).toBe("postgres");expect(who.ver).toBeGreaterThanOrEqual(160000);expect(who.ver).toBeLessThan(170000);
   const now=new Date(who.t).getTime(),base=Math.floor(now/60000)*60000,iso=(n:number)=>new Date(n).toISOString();
   const from=base-180*60000,to=base-60*60000,t=base-120*60000,cutoff=t-6*3600000,
    source=iso(cutoff-120000),member=iso(cutoff-110000),issued=iso(cutoff-1000);
   const local=(n:number)=>iso(n+8*3600000).slice(0,16);
   // This actual-clock fixture is independent of UTC midnight (the paid
   // dispatch bounds have to remain on one date, even during CI at midnight).
   const midnight=Date.parse(iso(now).slice(0,10)+"T00:00:00.000Z");
   const dispatch=Math.max(midnight,base-60000),latest=Math.min(midnight+86400000-1000,dispatch+180000);
   const retrieved=iso(Math.max(dispatch,now-1000)),available=iso(now);
   const p:P5ReviewedFuturePostOneGet={schema:"v39.phase5.future-post-reviewed-outcome-one-get.v1",
    manifestSha256:h("a"),requestSha256:h("b"),githubRunId:"1234567890",reviewedSourceRightsSha256:h("c"),
    reviewedProviderPriceSha256:h("d"),reviewedCategoryBudgetSha256:h("e"),reviewedRequestContextSha256:h("f"),
    reviewedProviderContractSha256:h("9"),reviewedFrameSha256:h("8"),runDayIndex:1,slot:"HUB",airportIcao:"WSSS",
    flightInstanceId:"leg:ci:post:001",expectedSelectedTNativeUtc:iso(t),plannedSourceFromUtc:iso(from),plannedSourceToUtc:iso(to),
    fromLocal:local(from),toLocal:local(to),airportIanaTimezone:"Asia/Singapore",
    postDispatchEarliestUtc:iso(dispatch),postDispatchHardLatestUtc:iso(latest),expectedApiUnitsPerGet:2,
    independentFuturePostRequestAndRightsReview:true};
   const reservation=p5V0083FuturePostReservationSha256(p),preId="a23e4567-e89b-42d3-a456-426614174010",postId="b23e4567-e89b-42d3-a456-426614174010";
   const mkFlight=(id:string,n:string)=>({id,number:n,codeshareStatus:"IsOperator",departure:{airport:{icao:"WSSS"},
    scheduledTime:{utc:iso(t)},revisedTime:{utc:iso(t+31*60000)},runwayTime:{utc:iso(t+42*60000)},quality:["Live"]},
    arrival:{airport:{icao:"YSSY"}},status:"Departed"});
   function envelope(departures:unknown[],fetchedAtUtc:string,post:boolean){
    const body=Buffer.from(JSON.stringify({departures,arrivals:[]}));
    return addCanonicalFidsEnvelopeHashV39({airport:p.airportIcao,fromLocal:p.fromLocal,toLocal:p.toLocal,ianaTimezone:p.airportIanaTimezone,
     fidsRequestContract:{schema:"v39.fids-request-frame.application-intent.v1",direction:"Departure",airportIcao:p.airportIcao,
      fromLocal:p.fromLocal,toLocal:p.toLocal,openapiSha256:p.reviewedProviderContractSha256,...(post?{phase5PostReservationSha256:reservation}:{})},
     ...(post?{phase5PostReservationSha256:reservation,phase5PostPurpose:"FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL"}:{}),
     payloadRepresentation:"RECONSTRUCTED_RESPONSE_JSON_NOT_VERBATIM_HTTP_BYTES",originalHttpWireBytesPreserved:false,originalDecodedEntityBodyPreserved:true,
     originalDecodedEntityBodyEvidence:{schema:"v39.fids-fetch-decoded-source-body.v1",representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
      bodySha256:sha(body),bodyLengthBytes:body.length,bodyBase64:body.toString("base64")},departures,arrivals:[],fetchedAtUtc});
   }
   const f1=mkFlight("native-ci-001","SQ78"),f2=mkFlight("native-ci-002","SQ79");
   const preRaw=envelope([f1,f2],source,false),postRaw=envelope([f1],retrieved,true),
    preHash=sha(JSON.stringify(preRaw)),postHash=sha(JSON.stringify(postRaw)),query=h("1"),preReservation=h("2"),rights=p.reviewedSourceRightsSha256;
   const q=(s:string,args?:unknown[])=>db.query(s,args);
   await q("INSERT INTO clean.phase5_fids_cycle_budget_v39(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,protected_api_floor_units) VALUES($1,50000,100,100)",[p.manifestSha256]);
   await q("INSERT INTO clean.phase5_fids_day_budget_v39(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,daily_other_reserved_units) VALUES($1,1,$2::date,$3,$4,$5,$6,1900,100)",
    [p.manifestSha256,iso(t).slice(0,10),h("3"),h("4"),p.reviewedFrameSha256,h("5")]);
   await q("INSERT INTO clean.phase5_fids_utc_charge_budget_v39(manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units) VALUES($1,$2::date,1900,100)",[p.manifestSha256,source.slice(0,10)]);
   await q("INSERT INTO clean.phase5_fids_allowed_query_v39(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,airport_icao,early_draw_sha256,reviewed_release_sha256,rights_review_sha256,provider_contract_sha256,github_run_id,service_window_start_utc,service_window_end_utc,from_local,to_local,airport_iana_timezone,provider_api_version,fids_protocol_version,planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,prediction_cutoff_utc,api_units_per_attempt,max_physical_attempts,state) VALUES($1,$2,1,'synthetic_post_ci','HUB','T-6h','WSSS',$3,$4,$5,$6,'1234567890',$7,$8,$9,$10,'Asia/Singapore','ci','ci',$11,$12::date,$13,$14,2,1,'ACTIVE')",
    [query,p.manifestSha256,h("5"),h("6"),rights,p.reviewedProviderContractSha256,p.plannedSourceFromUtc,p.plannedSourceToUtc,p.fromLocal,p.toLocal,
     iso(cutoff-900000),iso(cutoff-900000).slice(0,10),iso(cutoff-180000),iso(cutoff)]);
   // Physical ledger row is a test fixture only. Use the actual staged FK
   // and original-binding trigger, not a hand-created schema substitute.
   const charge=iso(cutoff-900000).slice(0,10);
   if(charge!==source.slice(0,10))await q("INSERT INTO clean.phase5_fids_utc_charge_budget_v39(manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units) VALUES($1,$2::date,1900,100)",[p.manifestSha256,charge]);
   await q("INSERT INTO clean.phase5_fids_physical_attempt_v39(reservation_sha256,query_digest,manifest_sha256,github_run_id,observed_selected_at_utc,charged_utc_date,committed_at_utc) VALUES($1,$2,$3,'1234567890',$4,$5::date,$6)",
    [preReservation,query,p.manifestSha256,iso(cutoff-1800000),charge,iso(cutoff-180000)]);
   for(const [qid,raw,hash,fetch,at] of [[preId,preRaw,preHash,source,source],[postId,postRaw,postHash,retrieved,available]] as const)
    await q("INSERT INTO clean.fids_query_response(population_query_id,source_airport_icao,query_direction,service_window_start_utc,service_window_end_utc,from_local,to_local,airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,available_at,response_hash,raw_payload,provider_api_version,fids_protocol_version,openapi_sha256) VALUES($1,'WSSS','Departure',$2,$3,$4,$5,'Asia/Singapore',$6,$7,$7,$8,$9::jsonb,'ci','ci',$10)",
     [qid,p.plannedSourceFromUtc,p.plannedSourceToUtc,p.fromLocal,p.toLocal,fetch,at,hash,JSON.stringify(raw),p.reviewedProviderContractSha256]);
   for(const [qid,hash,batch,flight,num,key,at,fetch] of [
    [preId,preHash,preReservation,p.flightInstanceId,"SQ78",f1.id,member,source],
    [preId,preHash,preReservation,"leg:ci:post:002","SQ79",f2.id,member,source],
    [postId,postHash,reservation,p.flightInstanceId,"SQ78",f1.id,available,retrieved]] as const)
    await q("INSERT INTO clean.flight_population(batch_id,source_airport_icao,dep_airport_icao,arr_airport_icao,dep_scheduled_utc,window_start_utc,window_end_utc,cutoff_utc,source_type,population_query_id,analytic_identity_id,canonical_flight_instance_id,population_role,scope_classification,available_at,response_hash,flight_number,provider_record_key,query_direction,from_local,to_local,airport_iana_timezone,codeshare_resolution_status,fids_retrieval_utc,provider_api_version,fids_protocol_version,openapi_sha256) VALUES($1,'WSSS','WSSS','YSSY',$2,$3,$4,$5,'fids',$6,$7,$7,'requested_airport_primary','confirmed_core',$8,$9,$10,$11,'Departure',$12,$13,'Asia/Singapore','confirmed_operating_leg',$14,'ci','ci',$15)",
     [batch,iso(t),p.plannedSourceFromUtc,p.plannedSourceToUtc,iso(cutoff),qid,flight,at,hash,num,key,p.fromLocal,p.toLocal,fetch,p.reviewedProviderContractSha256]);
   await q("INSERT INTO clean.phase5_fids_original_binding_v39(population_query_id,reservation_sha256,query_digest,manifest_sha256,response_hash,decoded_original_body_sha256,rights_review_sha256,normalized_members_count,source_expires_at_utc) VALUES($1,$2,$3,$4,$5,$6,$7,2,$8)",
    [preId,preReservation,query,p.manifestSha256,preHash,preRaw.originalDecodedEntityBodyEvidence.bodySha256,rights,iso(now+3*3600000)]);
   for(const fid of [p.flightInstanceId,"leg:ci:post:002"])
    await q("INSERT INTO clean.flight_snapshots(flight_instance_id,prediction_state,horizon,prediction_cutoff_utc,selected_t_milestone_utc,selected_t_version,population_query_id,fids_response_hash,schedule_version,frame_hash,config_hash,features_json,missingness_flags,builder_version,provenance_json,created_at) VALUES($1,'PRE_DEPARTURE','T-6h',$2,$3,'ci-native',$4,$5,NULL,$6,$7,'[]'::jsonb,'{}'::jsonb,'ci','{}'::jsonb,$8)",
     [fid,iso(cutoff),iso(t),preId,preHash,p.reviewedFrameSha256,h("4"),issued]);
   await q("CREATE ROLE "+SOURCE+" NOLOGIN NOINHERIT");
   await q("CREATE ROLE "+LOGIN+" LOGIN NOINHERIT PASSWORD 'ci-post-only'");
   await q("GRANT "+SOURCE+" TO "+LOGIN+" WITH INHERIT FALSE, SET TRUE");
   await q("GRANT USAGE ON SCHEMA clean TO "+SOURCE);
   await q("GRANT SELECT ON clean.flight_snapshots,clean.flight_population,clean.fids_query_response,clean.phase5_fids_original_binding_v39,clean.phase5_fids_allowed_query_v39 TO "+SOURCE);
   login=new Pool({connectionString:"postgresql://"+LOGIN+":ci-post-only@localhost:5432/neondb?sslmode=disable",max:1});
   const restricted={connect:async()=>{const c=await login!.connect();await c.query("SET ROLE "+SOURCE);return c;}};
   const scope={packet:p,populationQueryId:postId,responseSha256:postHash,normalizedMembers:1,reservationSha256:reservation};
   const report=await readP6CommittedPostOutcomeObservability(restricted as any,scope);
   expect(report.byHorizon["T-6h"]).toMatchObject({retainedCutoffSafePre:2,matchedNativePost:1,postAbsent:1,actualGateOutNumericCandidates:0});
   expect(report.uniqueRetainedPreFlights).toBe(2);
   const hint=await readP6PostSourceQueryHints({sourcePool:restricted,trust:{manifestSha256:p.manifestSha256},runDayIndex:1,queryDigests:[query],frameSha256:p.reviewedFrameSha256});
   expect(hint.hintCount).toBe(1);
   expect(hint.privateHints[0].committedPreHintCount).toBe(2);
   // The actual same-flight V0083 admission and the batched native
   // producer must agree against the real SOURCE role and original schema.
   const prior=await auditP5FuturePostActualPriorPre(restricted as any,p,[query]);
   expect(prior.observedValidHorizons).toEqual(["T-6h"]);
   expect(prior.boundSourceRegistryValidHorizonCount).toBe(1);
   const batchScope={manifestSha256:p.manifestSha256,runDayIndex:1,airportIcao:p.airportIcao,
    reviewedFrameSha256:p.reviewedFrameSha256,candidates:[p.flightInstanceId,"leg:ci:post:002","leg:ci:post:missing"].map(flightInstanceId=>({
     flightInstanceId,expectedSelectedTNativeUtc:p.expectedSelectedTNativeUtc,boundSourceQueryDigests:[query]}))};
   const batch=await auditP5FuturePostActualPriorPreBatch(restricted as any,batchScope);
   expect(batch).toMatchObject({candidateCount:3,eligibleCount:2,unavailableCount:1,providerCalls:0,databaseWrites:0});
   expect(batch.privateDecisions[0]).toMatchObject({status:"VALID_ACTUAL_PRE_FOR_POST_REVIEW",pre:prior});
   await expect(auditP5FuturePostActualPriorPre(restricted as any,p,[h("0")])).rejects.toThrow("NO_VALID_PRE_FROM_EXACT_SIGNED_SOURCE_REGISTRY");
   console.log("P6_POST_ACTUAL_SINGLETON_AND_BATCH_SOURCE_ADMISSION_PG16_PASS");
   expect(report.providerCalls).toBe(0);expect(report.databaseWrites).toBe(0);
   console.log("P6_POST_ACTUAL_PARTITION_RESTRICTED_PG16=PASS SYNTHETIC_ONLY PROVIDER_CALLS=0");
   await exerciseNativePostPublication(p,restricted,query);
  }finally{await Promise.allSettled([db.end(),login?.end()]);}
 },60000);
});
