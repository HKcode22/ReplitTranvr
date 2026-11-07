import {createHash,randomUUID} from "node:crypto";
import {Pool} from "pg";
import {beforeAll,afterAll,describe,expect,it} from "vitest";
const URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const suite=process.env.V39_P5_V0079_PG16==="1"?describe:describe.skip;
const H=(c:string)=>c.repeat(64);
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const m=H("a"),q=H("b"),cal=H("c"),cfg=H("d"),frm=H("e");
const draw=H("f"),rights=H("2"),prov=H("3"),runId="12345678910";
const expected=hash([m,q,runId,"1"].join("|"));
const bytes=Buffer.from('{"departures":[],"arrivals":[]}'),sha=hash(bytes.toString());
const response=H("4");let db:Pool,service:Date;
const reserve=(digest=expected,right=rights)=>db.query(
 `SELECT clean.reserve_phase5_fids_physical_get_v39($1,$2,$3,$4,$5,$6)`,
 [m,q,runId,draw,right,digest]);
async function source(icao="WSSS",corrupt=false){
 const id=randomUUID();
 const raw={originalDecodedEntityBodyPreserved:true,originalHttpWireBytesPreserved:false,
  originalDecodedEntityBodyEvidence:{
   representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
   bodySha256:sha,bodyLengthBytes:bytes.length,
   bodyBase64:(corrupt?Buffer.from("wrong"):bytes).toString("base64")},
  departures:[],arrivals:[]};
 await db.query(
  `INSERT INTO clean.fids_query_response(
   population_query_id,source_airport_icao,query_direction,
   service_window_start_utc,service_window_end_utc,from_local,to_local,
   airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,
   available_at,response_hash,raw_payload,provider_api_version,
   fids_protocol_version,openapi_sha256)
   VALUES($1,$2,'Departure',$3,$4,'2026-11-09T22:00','2026-11-10T02:00',
   'Asia/Singapore',clock_timestamp(),clock_timestamp(),clock_timestamp(),
   $5,$6::jsonb,'CI-PROVIDER','CI-PROTOCOL',$7)`,
  [id,icao,service.toISOString(),
   new Date(service.getTime()+4*3600000).toISOString(),response,
   JSON.stringify(raw),prov]);
 return id;
}
const bind=(id:string,h=response,hours=1)=>db.query(
 `INSERT INTO clean.phase5_fids_original_binding_v39(
  population_query_id,reservation_sha256,query_digest,manifest_sha256,
  response_hash,decoded_original_body_sha256,rights_review_sha256,
  normalized_members_count,source_expires_at_utc)
  VALUES($1,$2,$3,$4,$5,$6,$7,0,
    clock_timestamp()+($8::int*INTERVAL '1 hour'))`,
 [id,expected,q,m,h,sha,rights,hours]);
suite("Phase5 V0079 real disposable PostgreSQL16; no live provider",()=>{
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.DATABASE_URL!==URL||process.env.V39_P5_V0079_PG16!=="1")
    throw Error("REFUSED_P5_NONDISPOSABLE_DB");
  db=new Pool({connectionString:URL,max:4});
  const now=new Date((await db.query("SELECT clock_timestamp() t")).rows[0].t);
  service=new Date(now.getTime()+29*3600000);
  await db.query(
   `INSERT INTO clean.adb_phase6_calendar_day(
    run_day_index,budget_day_id,calendar_hash,config_hash,date_utc,
    utc_slot,time_class,window_shape,evaluation_partition,draw_type,
    slot_regions,anchor_icao,pair_airport_set,frozen_draw_seed,
    scheduled_start_utc,active_duration_minutes,frame_hash)
    VALUES(1,'P6D01',$1,$2,$3::date,'CI','CI','4h','CI','NEW_TEMPLATE',
    $4::jsonb,'WSSS',NULL,'ci-stage3',$5,240,$6)`,
   [cal,cfg,service.toISOString().slice(0,10),
    JSON.stringify({HUB:"ASIA",MID_A:"MIDDLE_EAST",
      MID_B:"SOUTH_AMERICA",REGIONAL:"NORTH_AMERICA"}),
    service.toISOString(),frm]);
  for(const [slot,icao,region] of [
    ["HUB","WSSS","ASIA"],["MID_A","OMAA","MIDDLE_EAST"],
    ["MID_B","SKBO","SOUTH_AMERICA"],["REGIONAL","KGPT","NORTH_AMERICA"]
   ]){
   await db.query(
    `INSERT INTO clean.adb_sampling_draw(
      run_day_index,slot_id,target_region,draw_type,selected_icao,
      frozen_draw_seed,adaptive_state_hash,probability_vector,
      airport_layer_design_probability,selected_at_utc)
      VALUES(1,$1,$2,'NEW_TEMPLATE',$3,'ci-stage3',$4,$5::jsonb,$6,$7)`,
    [slot,region,icao,slot==="REGIONAL"?H("5"):null,
     slot==="REGIONAL"?JSON.stringify([{icao:"KGPT",probability:1,drawScore:1}]):null,
     slot==="REGIONAL"?1:null,
     new Date(now.getTime()-7200000).toISOString()]);
  }
  await db.query(
   `INSERT INTO clean.phase5_fids_cycle_budget_v39(
     manifest_sha256,cycle_api_ceiling,other_category_reserved_units,
     protected_api_floor_units) VALUES($1,10,4,2)`,[m]);
  await db.query(
   `INSERT INTO clean.phase5_fids_day_budget_v39(
    manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,
    frame_hash,early_draw_sha256,daily_api_ceiling,daily_other_reserved_units)
    VALUES($1,1,$2,$3,$4,$5,$6,8,4)`,
   [m,service.toISOString().slice(0,10),cal,cfg,frm,draw]);
  await db.query(
   `INSERT INTO clean.phase5_fids_allowed_query_v39(
    query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,
    airport_icao,early_draw_sha256,reviewed_release_sha256,
    rights_review_sha256,provider_contract_sha256,github_run_id,
    service_window_start_utc,service_window_end_utc,
    from_local,to_local,airport_iana_timezone,provider_api_version,
    fids_protocol_version,planned_dispatch_utc,hard_latest_dispatch_utc,
    prediction_cutoff_utc,state)
    VALUES($1,$2,1,'CI-P5-SOURCE-T24','HUB','T-24h','WSSS',$3,$4,$5,$6,$7,
    $8,$9,'2026-11-09T22:00','2026-11-10T02:00','Asia/Singapore',
    'CI-PROVIDER','CI-PROTOCOL',$10,$11,$12,'ACTIVE')`,
   [q,m,draw,H("1"),rights,prov,runId,
    service.toISOString(),new Date(service.getTime()+4*3600000).toISOString(),
    new Date(now.getTime()-5000).toISOString(),
    new Date(now.getTime()+60000).toISOString(),
    new Date(now.getTime()+900000).toISOString()]);
 });
 afterAll(async()=>{if(db)await db.end();});
 it("rejects bad digests and rights without spending project units",async()=>{
  await expect(reserve(H("9"))).rejects.toThrow("P5_GET_RESERVATION_DIGEST_MISMATCH");
  await expect(reserve(expected,H("8"))).rejects.toThrow("P5_DAILY_RELEASE_OR_CALENDAR_HASH_MISMATCH");
  expect((await db.query("SELECT physically_reserved_units n FROM clean.phase5_fids_cycle_budget_v39"))
   .rows[0].n).toBe(0);
 });
 it("reserves one physical GET, never duplicates or refunds it",async()=>{
  await reserve();
  const row=(await db.query(
   `SELECT c.physically_reserved_units,d.daily_source_reserved_units
    FROM clean.phase5_fids_cycle_budget_v39 c
    JOIN clean.phase5_fids_day_budget_v39 d USING(manifest_sha256)`)).rows[0];
  expect(row).toMatchObject({physically_reserved_units:2,daily_source_reserved_units:2});
  await expect(reserve()).rejects.toThrow("P5_PHYSICAL_QUERY_NOT_ACTIVE_OR_ALREADY_RESERVED");
  await expect(db.query("DELETE FROM clean.phase5_fids_physical_attempt_v39"))
   .rejects.toThrow("P5_IRREVERSIBLE_PHYSICAL_RESERVATION");
 });
 it("proves exact original airport, decoded SHA and conservative retention",async()=>{
  await expect(bind(await source("YSSY"))).rejects.toThrow("P5_ORIGINAL_SOURCE_FRAME_CLOCK_RIGHTS_HOLD");
  await expect(bind(await source("WSSS",true))).rejects.toThrow("P5_ORIGINAL_DECODED_BODY_HASH_HOLD");
  const good=await source();
  await expect(bind(good,H("9"))).rejects.toThrow("P5_ORIGINAL_SOURCE_FRAME_CLOCK_RIGHTS_HOLD");
  await expect(bind(good,response,30)).rejects.toThrow("P5_ORIGINAL_SOURCE_FRAME_CLOCK_RIGHTS_HOLD");
  await bind(good);
  await expect(db.query(
   "UPDATE clean.phase5_fids_original_binding_v39 SET response_hash=$1",[H("9")]))
   .rejects.toThrow("P5_ORIGINAL_BINDING_CANNOT_BE_REWRITTEN");
  const perms=(await db.query(
   `SELECT has_table_privilege('public','clean.phase5_fids_physical_attempt_v39','INSERT') pub_insert,
    has_function_privilege('public',
     'clean.reserve_phase5_fids_physical_get_v39(text,text,text,text,text,text)',
     'EXECUTE') pub_execute`)).rows[0];
  expect(perms).toMatchObject({pub_insert:false,pub_execute:false});
 });
});
