/**
 * Real disposable PG16 B0062+V0079+V0082+V0083 only.
 * All reviewed requests, prices, account rights and GH runs are synthetic.
 * Zero provider HTTP; a reservation consumes a conservative credit envelope,
 * NOT a received provider response or scientific Phase5/Phase6 GO.
 */
import {Pool} from "pg";
import {createHash} from "node:crypto";
import {afterAll,beforeAll,describe,it,expect} from "vitest";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const enabled=process.env.V39_P5_V0083_NONFIDS_REAL_PG16==="1";
const suite=enabled?describe:describe.skip;
const SHA=(c:string)=>c.repeat(64);
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
const manifest=SHA("a"),cal=SHA("b"),conf=SHA("c"),rights=SHA("d");
const provider=SHA("e"),price=SHA("f"),categoryReview=SHA("1");
const run="12345678910",group="phase5_other_rest_ci_group";
const login="phase5_other_rest_ci_login";
const guestURL="postgresql://"+login+":ci-only@localhost:5432/neondb?sslmode=disable";
const specs=[
 ["FIDS_RETRY_UNIT_BUDGET",2,"2"],
 ["VALIDATION_UNIT_BUDGET",4,"4"],
 ["OUTCOME_REST_UNIT_BUDGET",3,"3"],
 ["HISTORY_BOOTSTRAP_UNIT_BUDGET",5,"5"],
 ["DIAGNOSTIC_UNIT_BUDGET",1,"6"],
] as const;
const categories=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS",
 ...specs.map(x=>x[0])];
const requestDigest=(cat:string,code:string)=>sha("V0083-CI-"+cat+"-"+code);
const retrySource=sha("V0083-CI-FIDS-PROSPECTIVE-SOURCE-ORIGINAL");
const token=(req:string,units:number)=>sha(
 manifest+"|"+req+"|"+run+"|"+units+"|"+rights+"|"+price
);
suite("V0083 5 actual REST budget categories (real disposable PG16)",()=>{
 let admin:Pool,worker:Pool,dayUtc:string,dispatch:string,latest:string;
 const planned=new Map<string,number>(specs.map(([cat,n])=>[cat,n]));
 const reqs=new Map<string,string>();
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||!enabled||
     process.env.DATABASE_URL!==URL||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
     process.env.V39_PHASE6_OWNER_APPROVED!=="0")
   throw Error("REFUSED_NOT_DISPOSABLE_V0083_NONFIDS_CI");
  admin=new Pool({connectionString:URL,max:3});
  const now=Date.parse((await admin.query(
   "SELECT clock_timestamp() at")).rows[0].at);
  dayUtc=new Date(now).toISOString().slice(0,10);
  dispatch=new Date(now-2*60000).toISOString();
  latest=new Date(now+15*60000).toISOString();
  if(latest.slice(0,10)!==dayUtc)
   throw Error("REFUSED_CI_UTC_MIDNIGHT_WINDOW_NEEDS_FRESH_DATE");
  await admin.query(
   "INSERT INTO clean.adb_phase6_authorization "+
   "(authorization_id,manifest_sha256,calendar_hash,config_hash,code_sha,"+
   "schema_version,phase6_start_date,alert_cap_per_parent_day,"+
   "unsettled_burst_margin_credits,protected_alert_floor,enabled,"+
   "predecessor_evidence_ids) VALUES "+
   "('CI-V0083',$1,$2,$3,$4,'v39',$5::date,1900,10,1000,true,"+
   "'[\"synthetic-v0083-no-provider\"]'::jsonb)",
   [manifest,cal,conf,"f".repeat(40),dayUtc]
  );
  await admin.query(
   "INSERT INTO clean.phase5_fids_cycle_budget_v39 "+
   "(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,"+
   "protected_api_floor_units) VALUES ($1,50000,15,100)",[manifest]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_utc_charge_budget_v39 "+
   "(manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units)"+
   " VALUES ($1,$2::date,1900,15)",[manifest,dayUtc]);
  await admin.query(
   "INSERT INTO clean.phase5_fids_seven_rest_release_v39 "+
   "(manifest_sha256,reviewed_source_request_grid_sha256,"+
   "reviewed_provider_range_sha256,verified_provider_max_range_minutes,"+
   "reviewed_category_budget_sha256) VALUES ($1,$2,$3,240,$4)",
   [manifest,SHA("7"),SHA("8"),categoryReview]
  );
  for(const cat of categories){
   const units=cat==="FIDS_BASE_UNITS"?2:planned.get(cat)??0;
   await admin.query(
    "INSERT INTO clean.phase5_fids_cycle_rest_category_cap_v39 "+
    "(manifest_sha256,category,ceiling_units) VALUES ($1,$2,$3)",
    [manifest,cat,units]
   );
   await admin.query(
    "INSERT INTO clean.phase5_fids_utc_rest_category_budget_v39 "+
    "(manifest_sha256,charge_day_utc,category,planned_units) "+
    "VALUES ($1,$2::date,$3,$4)",[manifest,dayUtc,cat,units]
   );
  }
  // A retry must refer to an exact original FIDS query. This CI source
  // query has NO physical attempt, proving a caller cannot bill a generic
  // retry as if a genuine failed source attempt had occurred.
  await admin.query(
   "INSERT INTO clean.phase5_fids_day_budget_v39 "+
   "(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,"+
   "config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,"+
   "daily_other_reserved_units) "+
   "VALUES ($1,1,$2::date,$3,$4,$5,$6,1900,15)",
   [manifest,dayUtc,cal,conf,SHA("9"),SHA("3")]
  );
  const serviceStart=new Date(now+2*3600000).toISOString();
  const serviceEnd=new Date(now+3*3600000).toISOString();
  const cutoff=new Date(now+3600000).toISOString();
  await admin.query(
   "INSERT INTO clean.phase5_fids_allowed_query_v39 "+
   "(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,"+
   "airport_icao,early_draw_sha256,reviewed_release_sha256,"+
   "rights_review_sha256,provider_contract_sha256,github_run_id,"+
   "service_window_start_utc,service_window_end_utc,from_local,to_local,"+
   "airport_iana_timezone,provider_api_version,fids_protocol_version,"+
   "planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,"+
   "prediction_cutoff_utc,state) "+
   "VALUES ($1,$2,1,'V0083_CI_RETRY_SOURCE','HUB','T-90m','WSSS',"+
   "$3,$4,$5,$6,$7,$8,$9,'2026-11-08T08:00',"+
   "'2026-11-08T09:00','Asia/Singapore','1.15.4','v39',$10,"+
   "$11::date,$12,$13,'ACTIVE')",
   [retrySource,manifest,SHA("3"),SHA("4"),rights,provider,run,
    serviceStart,serviceEnd,dispatch,dayUtc,latest,cutoff]
  );
  await admin.query(
   "INSERT INTO clean.phase5_fids_exact_query_partition_v39 "+
   "(query_digest,manifest_sha256,segment_index,partition_index,"+
   "window_shape,rest_category,reviewed_provider_range_sha256) "+
   "VALUES ($1,$2,1,1,'4h','FIDS_BASE_UNITS',$3)",
   [retrySource,manifest,SHA("8")]
  );
  for(const [cat,units,code] of specs){
   const req=requestDigest(cat,code);reqs.set(cat,req);
   await admin.query(
    "INSERT INTO clean.phase5_other_rest_reviewed_call_v39 "+
    "(request_sha256,manifest_sha256,rest_category,source_query_digest,"+
    "planned_charge_day_utc,earliest_dispatch_utc,hard_latest_dispatch_utc,github_run_id,"+
    "rights_review_sha256,provider_price_sha256,"+
    "reviewed_request_context_sha256,reviewed_category_budget_sha256,"+
    "api_units_per_get) "+
    "VALUES ($1,$2,$3,$4,$5::date,$6::timestamptz,$7::timestamptz,"+
    "$8,$9,$10,$11,$12,$13)",
    [req,manifest,cat,cat==="FIDS_RETRY_UNIT_BUDGET"?retrySource:null,
     dayUtc,dispatch,latest,run,
     rights,price,SHA(code),categoryReview,units]
   );
  }
  const duplicateValidation=requestDigest("VALIDATION_UNIT_BUDGET","x");
  reqs.set("OVERFUNDED_VALIDATION",duplicateValidation);
  await admin.query(
   "INSERT INTO clean.phase5_other_rest_reviewed_call_v39 "+
   "(request_sha256,manifest_sha256,rest_category,planned_charge_day_utc,"+
   "earliest_dispatch_utc,hard_latest_dispatch_utc,github_run_id,"+
   "rights_review_sha256,provider_price_sha256,"+
   "reviewed_request_context_sha256,reviewed_category_budget_sha256,"+
   "api_units_per_get) "+
   "VALUES ($1,$2,'VALIDATION_UNIT_BUDGET',$3::date,$4,$5,$6,$7,$8,$9,$10,4)",
   [duplicateValidation,manifest,dayUtc,dispatch,latest,run,rights,
    price,SHA("0"),categoryReview]
  );
  await admin.query("CREATE ROLE "+group+" NOLOGIN NOSUPERUSER NOINHERIT");
  await admin.query("CREATE ROLE "+login+" LOGIN PASSWORD 'ci-only' "+
    "NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT");
  await admin.query("GRANT "+group+" TO "+login+
    " WITH SET TRUE,INHERIT FALSE,ADMIN FALSE");
  // LOGIN can resolve function/table names for an explicit negative test,
  // but has neither EXECUTE nor table rights until SET-only NOLOGIN role.
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+login);
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+group);
  await admin.query(
   "GRANT EXECUTE ON FUNCTION clean.reserve_phase5_other_rest_once_v39"+
   "(text,text,text,text,text,text) TO "+group);
  worker=new Pool({connectionString:guestURL,max:1});
 });
 afterAll(async()=>{
  if(worker)await worker.end();
  if(admin)await admin.end();
 });
 async function read(){
  const attempts=(await admin.query(
   "SELECT COUNT(*)::int n FROM clean.phase5_other_rest_physical_reservation_v39"
  )).rows[0].n;
  const rows=(await admin.query(
   "SELECT category,physically_reserved_units n,planned_units p "+
   "FROM clean.phase5_fids_utc_rest_category_budget_v39 ORDER BY category"
  )).rows;
  const cycle=(await admin.query(
   "SELECT physically_reserved_units n,other_category_reserved_units other "+
   "FROM clean.phase5_fids_cycle_budget_v39"
  )).rows[0];
  return {attempts,rows,cycle};
 }
 async function reserve(cat:string,units:number){
  const q=reqs.get(cat)!;
  return worker.query(
   "SELECT clean.reserve_phase5_other_rest_once_v39($1,$2,$3,$4,$5,$6) result",
   [manifest,q,run,rights,price,token(q,units)]
  );
 }
 it("default LOGIN cannot call SECURITY DEFINER, no table raw access",async()=>{
  const q=reqs.get("VALIDATION_UNIT_BUDGET")!;
  await expect(reserve("VALIDATION_UNIT_BUDGET",4))
   .rejects.toThrow(/permission denied|reserve_phase5_other_rest_once/);
  const acl=(await worker.query(
   "SELECT has_function_privilege(current_user,"+
   "'clean.reserve_phase5_other_rest_once_v39(text,text,text,text,text,text)',"+
   "'EXECUTE') x,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_fids_utc_rest_category_budget_v39','UPDATE') y"
  )).rows[0];
  expect(acl.x).toBe(false);expect(acl.y).toBe(false);
  expect(q).toHaveLength(64);
  await worker.query("SET ROLE "+group);
  const role=(await worker.query(
   "SELECT current_user current_role,session_user login"
  )).rows[0];
  expect(role.current_role).toBe(group);expect(role.login).toBe(login);
  expect((await read()).attempts).toBe(0);
 });
 it("rejects changed price, rights, signed reservation or synthetic unknown GET",async()=>{
  const q=reqs.get("VALIDATION_UNIT_BUDGET")!;
  await expect(worker.query(
   "SELECT clean.reserve_phase5_other_rest_once_v39($1,$2,$3,$4,$5,$6)",
   [manifest,q,run,rights,SHA("0"),token(q,4)]
  )).rejects.toThrow("REVIEWED_GITHUB_RIGHTS_OR_PRICE_MISMATCH");
  await expect(worker.query(
   "SELECT clean.reserve_phase5_other_rest_once_v39($1,$2,$3,$4,$5,$6)",
   [manifest,q,run,SHA("0"),price,token(q,4)]
  )).rejects.toThrow("REVIEWED_GITHUB_RIGHTS_OR_PRICE_MISMATCH");
  await expect(reserve("VALIDATION_UNIT_BUDGET",2))
   .rejects.toThrow("RESERVATION_DIGEST_NOT_REVIEWED");
  await expect(worker.query(
   "SELECT clean.reserve_phase5_other_rest_once_v39($1,$2,$3,$4,$5,$6)",
   [manifest,SHA("0"),run,rights,price,SHA("0")]
  )).rejects.toThrow("REVIEWED_OTHER_REST_GET_MISSING");
  expect((await read()).attempts).toBe(0);
 });
 it("refuses FIDS retry without a real first committed source GET attempt",async()=>{
  await expect(reserve("FIDS_RETRY_UNIT_BUDGET",2))
   .rejects.toThrow(
    "FIDS_RETRY_WITHOUT_UNRESOLVED_ORIGINAL_SOURCE_ATTEMPT");
  expect((await read()).attempts).toBe(0);
 });
 it("rolls back actual reservation if category UPDATE fails after INSERT",async()=>{
  await admin.query(`CREATE FUNCTION clean.ci_v0083_fail_after_charge() RETURNS trigger
   LANGUAGE plpgsql AS $$
   BEGIN IF NEW.category='VALIDATION_UNIT_BUDGET'
     THEN RAISE EXCEPTION 'CI_EXPECTED_V0083_POST_RESERVATION_ROLLBACK';
   END IF; RETURN NEW; END $$`);
  await admin.query(`CREATE TRIGGER ci_v0083_injected_after_update
   AFTER UPDATE ON clean.phase5_fids_utc_rest_category_budget_v39
   FOR EACH ROW EXECUTE FUNCTION clean.ci_v0083_fail_after_charge()`);
  try{
   await expect(reserve("VALIDATION_UNIT_BUDGET",4)).rejects.toThrow(
    "CI_EXPECTED_V0083_POST_RESERVATION_ROLLBACK");
   const s=await read();
   expect(s.attempts).toBe(0);
   expect(s.rows.every((r:any)=>r.n===0)).toBe(true);
  }finally{
   await admin.query(
    "DROP TRIGGER ci_v0083_injected_after_update ON "+
    "clean.phase5_fids_utc_rest_category_budget_v39");
   await admin.query("DROP FUNCTION clean.ci_v0083_fail_after_charge()");
  }
 });
 it("atomically reserves the four non-retry REST categories independently",async()=>{
  for(const [cat,cost] of specs.filter(([c])=>
    c!=="FIDS_RETRY_UNIT_BUDGET")){
   const x=await reserve(cat,cost);
   expect(x.rowCount).toBe(1);
   expect(x.rows[0].result).toBeInstanceOf(Date);
  }
  const s=await read();
  expect(s.attempts).toBe(4);
  expect(s.cycle).toEqual({n:0,other:15});
  expect(s.rows.filter((r:any)=>sourceCats.has(r.category))
   .every((r:any)=>r.n===0)).toBe(true);
  expect(s.rows.filter((r:any)=>
   !sourceCats.has(r.category)&&r.category!=="FIDS_RETRY_UNIT_BUDGET")
   .every((r:any)=>r.n===r.p)).toBe(true);
  expect(s.rows.find((r:any)=>
    r.category==="FIDS_RETRY_UNIT_BUDGET").n).toBe(0);
 });
 it("rejects replay and cannot spend a second VALIDATION GET beyond frozen category",async()=>{
  await expect(reserve("VALIDATION_UNIT_BUDGET",4))
   .rejects.toThrow("DUPLICATE_PHYSICAL_GET_NEVER_RETRY");
  await expect(reserve("OVERFUNDED_VALIDATION",4))
   .rejects.toThrow("OTHER_CATEGORY_CAP_EXHAUSTED");
  const s=await read();expect(s.attempts).toBe(4);
  const privilege=(await worker.query(
   "SELECT has_table_privilege(current_user,"+
   "'clean.phase5_fids_utc_rest_category_budget_v39','UPDATE') u,"+
   "has_table_privilege(current_user,"+
   "'clean.phase5_other_rest_physical_reservation_v39','INSERT') i"
  )).rows[0];expect(privilege).toEqual({u:false,i:false});
 });
 it("rejects post-hoc OTHER-category UPDATE, preserves FIDS source +2 branch",async()=>{
  await expect(admin.query(
   "UPDATE clean.phase5_fids_utc_rest_category_budget_v39 "+
   "SET physically_reserved_units=0 "+
   "WHERE category='VALIDATION_UNIT_BUDGET'"
  )).rejects.toThrow("SAME_TRANSACTION_ONE_SHOT_PROOF");
  await expect(admin.query(
   "UPDATE clean.phase5_fids_utc_rest_category_budget_v39 "+
   "SET planned_units=3 WHERE category='FIDS_BASE_UNITS'"
  )).rejects.toThrow("IMMUTABLE");
  // Exact +2 BASE branch remains permitted inside the SOURCE physical
  // reservation transaction; this synthetically tests only its category
  // immutability branch, rolling back before recording any real GET.
  const client=await admin.connect();
  try{
   await client.query("BEGIN");
   await client.query(
    "UPDATE clean.phase5_fids_utc_rest_category_budget_v39 "+
    "SET physically_reserved_units=physically_reserved_units+2 "+
    "WHERE category='FIDS_BASE_UNITS'"
   );
   const n=(await client.query(
    "SELECT physically_reserved_units n FROM "+
    "clean.phase5_fids_utc_rest_category_budget_v39 "+
    "WHERE category='FIDS_BASE_UNITS'"
   )).rows[0].n;
   expect(n).toBe(2);
  }finally{
   await client.query("ROLLBACK");client.release();
  }
  expect((await read()).attempts).toBe(4);
 });
});
const sourceCats=new Set(["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS"]);
