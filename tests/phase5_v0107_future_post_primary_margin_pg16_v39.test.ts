/** Real PostgreSQL16 V0107 review-only classification and sweep regression.
 * Fixtures are synthetic; production DB, AeroDataBox, SOURCE and GO are absent. */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {createHash,randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const enabled=process.env.P5_V0107_DISPOSABLE_PG16==="1";
const suite=enabled?describe:describe.skip;
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const F="clean.phase5_primary_fids_expiry_";
const sql="migrations/staged/V0107__phase5_verified_future_post_primary_expiry_margin_v39.sql";
const purpose="FUTURE_POST_SOURCE_OBSERVATION_NOT_AN_ACTUAL_PHYSICAL_LABEL";
suite("V0107 actual PG16 selective 23-hour future POST physical expiry (disposable only)",()=>{
 let db:Pool,serial=0;
 const now=async()=>new Date((await db.query("SELECT clock_timestamp() AS at")).rows[0].at).getTime();
 const iso=(n:number)=>new Date(n).toISOString();
 const status=async()=> (await db.query("SELECT "+F+"status_v39() AS r")).rows[0].r;
 const sweep=async(n:number)=> (await db.query("SELECT "+F+"sweep_v39($1) AS r",[n])).rows[0].r;
 const isLive=async(pid:string)=>(await db.query("SELECT raw_payload IS NOT NULL AS live FROM clean.fids_query_response WHERE population_query_id=$1",[pid])).rows[0].live as boolean;
 async function reservation(ageHours:number,units=2,late=false){
  const n=++serial,at=iso((await now())-ageHours*3600_000);
  const id=hash("V0107 reservation "+n),manifest=hash("V0107 manifest "+n);
  const request=hash("V0107 request "+n),budget=hash("V0107 budget "+n);
  const rights=hash("V0107 rights "+n),price=hash("V0107 price "+n);
  await db.query("INSERT INTO clean.phase5_fids_cycle_budget_v39(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,protected_api_floor_units) VALUES($1,50000,10,100)",[manifest]);
  await db.query("INSERT INTO clean.phase5_fids_seven_rest_release_v39(manifest_sha256,reviewed_source_request_grid_sha256,reviewed_provider_range_sha256,verified_provider_max_range_minutes,reviewed_category_budget_sha256) VALUES($1,$2,$3,240,$4)",[manifest,hash("grid "+n),hash("range "+n),budget]);
  await db.query("INSERT INTO clean.phase5_other_rest_reviewed_call_v39(request_sha256,manifest_sha256,rest_category,source_query_digest,planned_charge_day_utc,earliest_dispatch_utc,hard_latest_dispatch_utc,github_run_id,rights_review_sha256,provider_price_sha256,reviewed_request_context_sha256,reviewed_category_budget_sha256,api_units_per_get) VALUES($1,$2,'OUTCOME_REST_UNIT_BUDGET',NULL,$3::date,$4,$4,'12345678910',$5,$6,$7,$8,$9)",[request,manifest,at.slice(0,10),at,rights,price,hash("context "+n),budget,units]);
  await db.query("INSERT INTO clean.phase5_other_rest_physical_reservation_v39(reservation_sha256,request_sha256,manifest_sha256,rest_category,charged_utc_date,approved_api_units,previous_reserved_units,github_run_id,rights_review_sha256,provider_price_sha256,reserved_at_utc) VALUES($1,$2,$3,'OUTCOME_REST_UNIT_BUDGET',$4::date,$5,0,'12345678910',$6,$7,$8)",[id,request,manifest,at.slice(0,10),units,rights,price,iso(Date.parse(at)+(late?60000:-60000))]);
  return {id,at};
 }
 async function original(ageHours:number,options:{ref?:string;purpose?:string;inner?:string;direction?:string;marked?:boolean}={}){
  const n=++serial,pid=randomUUID(),at=iso((await now())-ageHours*3600_000);
  const start=iso(Date.parse(at)+3*3600_000),end=iso(Date.parse(at)+5*3600_000);
  const raw:any={synthetic:true,originalDecodedEntityBodyPreserved:options.marked??true,
   phase5PostPurpose:options.purpose??purpose,phase5PostReservationSha256:options.ref??hash("unknown ref "+n),
   fidsRequestContract:{phase5PostReservationSha256:options.inner??options.ref??hash("unknown ref "+n)}};
  await db.query("INSERT INTO clean.fids_query_response(population_query_id,source_airport_icao,query_direction,service_window_start_utc,service_window_end_utc,from_local,to_local,airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,available_at,response_hash,raw_payload,provider_api_version,fids_protocol_version,openapi_sha256) VALUES($1,'WSSS',$2,$3,$4,$5,$6,'Asia/Singapore',$7,$7,$7,$8,$9::jsonb,'ci','ci',$10)",[pid,options.direction??"Departure",start,end,start.slice(0,16),end.slice(0,16),at,hash("raw "+n),JSON.stringify(raw),hash("contract "+n)]);
  return pid;
 }
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==URL||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.ADB_AUTO_COLLECT!=="0"||process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.AERODATABOX_WEBHOOK_SECRET)throw Error("REFUSED_V0107_NONDISPOSABLE");
  db=new Pool({connectionString:URL,max:4});
  const v=(await db.query("SELECT current_database() AS db,current_setting('server_version_num')::integer AS ver,pg_is_in_recovery() AS replica,clock_timestamp() AS at")).rows[0];
  expect(v.db).toBe("neondb");expect(v.ver).toBeGreaterThanOrEqual(160000);expect(v.ver).toBeLessThan(170000);expect(v.replica).toBe(false);
  expect(await status()).toMatchObject({liveOriginals:0,eligibleOriginals:0,hardDueOriginals:0});
  // The exact staged SQL performs an atomic stopped/no-live-original preflight.
  await db.query(readFileSync(sql,"utf8"));
  expect(await status()).toMatchObject({liveOriginals:0,eligibleOriginals:0,hardDueOriginals:0});
 });
 afterAll(async()=>{await db?.end()});
 it("does not grant PUBLIC access or permit blind reinstall of V0107",async()=>{
  await db.query("CREATE ROLE ci_v0107_unprivileged NOLOGIN");
  const rows=(await db.query("SELECT has_function_privilege('ci_v0107_unprivileged',$1,'EXECUTE') AS status,has_function_privilege('ci_v0107_unprivileged',$2,'EXECUTE') AS sweep",[F+"status_v39()",F+"sweep_v39(integer)"])).rows[0];
  expect(rows).toEqual({status:false,sweep:false});
  await expect(db.query(readFileSync(sql,"utf8"))).rejects.toThrow(/P5_V0107_REQUIRES_EMPTY_STOPPED_EXACT_V0103_OWNER_NO_REPLAY/);
 });
 it("advances only exact V0083 unbound two-unit POST from 24h to 23h; excludes ambiguous and unreviewed sources",async()=>{
  const good=await reservation(23.5);
  const accepted=await original(23.5,{ref:good.id});
  const wrongCost=await reservation(23.5,3);
  const wrongTime=await reservation(23.5,2,true);
  const wrongPurpose=await reservation(23.5);
  const wrongInner=await reservation(23.5);
  const wrongDirection=await reservation(23.5);
  const duplicate=await reservation(23.5);
  const unmarked=await reservation(23.5);
  const held=[
   await original(23.5,{ref:wrongCost.id}),
   await original(23.5,{ref:wrongTime.id}),
   await original(23.5,{ref:wrongPurpose.id,purpose:"OTHER"}),
   await original(23.5,{ref:wrongInner.id,inner:hash("different")}),
   await original(23.5,{ref:wrongDirection.id,direction:"Arrival"}),
   await original(23.5,{ref:duplicate.id}),
   await original(23.5,{ref:duplicate.id}),
   await original(23.5,{ref:hash("not-reserved")}),
   await original(23.5,{ref:unmarked.id,marked:false})
  ];
  expect(await status()).toMatchObject({liveOriginals:10,eligibleOriginals:1,hardDueOriginals:0,unboundLiveOriginals:10});
  expect(await isLive(accepted)).toBe(true);
  const r=await sweep(1);
  expect(r).toMatchObject({originalsCleared:1,populationCleared:0,tombstones:1,remainingEligibleAtCutoff:0,remainingHardDueAtCutoff:0,providerCalls:0,phase6PaidGo:false});
  expect(await isLive(accepted)).toBe(false);
  for(const id of held)expect(await isLive(id)).toBe(true);
  const rec=(await db.query("SELECT "+F+"receipt_v39($1) AS r",[r.runId])).rows[0].r;
  expect(rec).toMatchObject({originalsCleared:1,tombstones:1,nonemptyPrimaryReceiptVerified:true,databaseWrites:0});
  expect(await status()).toMatchObject({liveOriginals:9,eligibleOriginals:0,hardDueOriginals:0});
 });
 /** The genuine V0083 source hook requires every normalized row to carry
  * the same reservation digest. Test both accepted and wrong-batch variants
  * with actual B0062 population/membership triggers and tombstones. */
 it("physically clears exact matching normalized POST members, but never accelerates a wrong-batch member",async()=>{
  async function member(pid:string,reservationSha256:string,match:boolean){
   const q=(await db.query("SELECT source_airport_icao,service_window_start_utc,service_window_end_utc,fids_retrieval_utc,from_local,to_local,response_hash,openapi_sha256 FROM clean.fids_query_response WHERE population_query_id=$1",[pid])).rows[0];
   const id="leg:ci:v0107:"+randomUUID(),memberId=randomUUID();
   await db.query("INSERT INTO clean.flight_population(source_airport_icao,window_start_utc,window_end_utc,cutoff_utc,source_type,population_query_id,analytic_identity_id,canonical_flight_instance_id,population_role,scope_classification,available_at,response_hash,flight_number,query_direction,from_local,to_local,airport_iana_timezone,codeshare_resolution_status,fids_retrieval_utc,provider_api_version,fids_protocol_version,openapi_sha256,population_member_id,dep_scheduled_utc,provider_record_key,batch_id) VALUES('WSSS',$1,$2,$3,'fids',$4,$5,$5,'requested_airport_primary','confirmed_core',$3,$6,'CI-V0107','Departure',$7,$8,'Asia/Singapore','confirmed_operating_leg',$3,'ci','ci',$9,$10,$1,$5,$11)",[q.service_window_start_utc,q.service_window_end_utc,q.fids_retrieval_utc,pid,id,q.response_hash,q.from_local,q.to_local,q.openapi_sha256,memberId,match?reservationSha256:hash("different batch "+memberId)]);
   return memberId;
  }
  const good=await reservation(23.5),bad=await reservation(23.5);
  const accepted=await original(23.5,{ref:good.id}),excluded=await original(23.5,{ref:bad.id});
  const kept=await member(accepted,good.id,true),unmatched=await member(excluded,bad.id,false);
  expect(await status()).toMatchObject({eligibleOriginals:1,hardDueOriginals:0});
  const r=await sweep(1);
  expect(r).toMatchObject({originalsCleared:1,populationCleared:1,tombstones:2,remainingEligibleAtCutoff:0,remainingHardDueAtCutoff:0,providerCalls:0,phase6PaidGo:false});
  expect(await isLive(accepted)).toBe(false);
  expect(await isLive(excluded)).toBe(true);
  const cell=(await db.query("SELECT population_query_id IS NULL AS unlinked,flight_number IS NULL AS content_cleared,provider_content_expired_at_utc IS NOT NULL AS expired FROM clean.flight_population WHERE population_member_id=$1",[kept])).rows[0];
  expect(cell).toEqual({unlinked:true,content_cleared:true,expired:true});
  expect((await db.query("SELECT count(*)::integer AS n FROM clean.population_research_membership WHERE population_member_id=$1",[kept])).rows[0].n).toBe(1);
  expect((await db.query("SELECT batch_id FROM clean.flight_population WHERE population_member_id=$1",[unmatched])).rows[0].batch_id).not.toBe(bad.id);
  expect((await db.query("SELECT "+F+"receipt_v39($1) AS r",[r.runId])).rows[0].r).toMatchObject({originalsCleared:1,populationCleared:1,tombstones:2,nonemptyPrimaryReceiptVerified:true});
 });
 it("keeps hard 24h expiry independent of the 23h selective early margin",async()=>{
  const old=await original(24.5,{ref:hash("unknown V0083")});
  const before=await status();
  expect(before).toMatchObject({eligibleOriginals:1,hardDueOriginals:1});
  const result=await sweep(1);
  expect(result).toMatchObject({originalsCleared:1,remainingHardDueAtCutoff:0,providerCalls:0});
  expect(await isLive(old)).toBe(false);
  expect((await status()).hardDueOriginals).toBe(0);
 });
});