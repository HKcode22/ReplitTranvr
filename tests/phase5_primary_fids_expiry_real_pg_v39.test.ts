/** Actual disposable PG16 B0062/V0079/V0103 functions. No production. */
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {Pool, type PoolClient} from "pg";
import {createHash,randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {sha256} from "../server/lib/disruption/retentionExpiry_v39";
import {runP5PrimaryExpiry,admitP5PrimaryExpiryGithub,P5_PRIMARY_APPLY} from "../scripts/v39_phase5_primary_fids_expiry_github_v39.mjs";
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const SQL="migrations/staged/V0103__phase5_bounded_primary_fids_expiry_inert_v39.sql";
const F="clean.phase5_primary_fids_expiry_";
const suite=process.env.V39_P5_PRIMARY_FIDS_DISPOSABLE_PG16==="1"?describe:describe.skip;
const h=(s:string)=>createHash("sha256").update(s).digest("hex");
const planHash="abdb28da60e38a1c9c031bc4f931d3b8b09dd87be4ed0d686e18efe1991b4fd9";
it("pins the exact existing canonical Buffer plan hash and revokes all four PUBLIC functions",()=>{
 expect(sha256(readFileSync("data-collection/plans/V3.9_DataCollectPlan_f.8.md"))).toBe(planHash);
 const sql=readFileSync(SQL,"utf8");
 expect(sql).toContain(planHash);
 for(const [name,args] of [["status",""],["sweep","integer"],["receipt","text"],["stop","text"]]){
  expect(sql).toContain("REVOKE ALL ON FUNCTION "+F+name+"_v39("+args+") FROM PUBLIC;");
 }
});
suite("bounded primary expiry actual PG16",()=>{
 let db:Pool;
 let serial=0;
 const writer="ci_p5_primary_expiry_writer",reader="ci_p5_primary_expiry_reader";
 const status=async()=> (await db.query("SELECT "+F+"status_v39() AS r")).rows[0].r;
 const sweep=async(limit:number)=> (await db.query("SELECT "+F+"sweep_v39($1) AS r",[limit])).rows[0].r;
 const receipt=async(runId:string)=> (await db.query("SELECT "+F+"receipt_v39($1) AS r",[runId])).rows[0].r;
 async function asRole<T>(role:string,fn:(c:PoolClient)=>Promise<T>):Promise<T>{
  const c=await db.connect();
  try{await c.query("SET ROLE "+role);return await fn(c);}
  finally{await c.query("RESET ROLE").catch(()=>{});c.release();}
 }
 async function make(ageHours:number,bound=false){
  const n=++serial,pid=randomUUID(),member=randomUUID(),manifest=h("manifest "+pid);
  const query=h("query "+pid),reservation=h("reservation "+pid),rights=h("rights "+pid),contract=h("contract "+pid);
  const now=new Date((await db.query("SELECT clock_timestamp() at")).rows[0].at).getTime();
  const iso=(ms:number)=>new Date(ms).toISOString();
  const at=iso(now-ageHours*3600_000),start=iso(now+30*3600_000),end=iso(now+34*3600_000);
  const localFrom=start.slice(0,16),localTo=end.slice(0,16);
  const body=Buffer.from(JSON.stringify({departures:[{number:"CI"+n}]})),bodySha=h(body.toString("utf8"));
  const raw={originalDecodedEntityBodyPreserved:true,originalHttpWireBytesPreserved:false,
   originalDecodedEntityBodyEvidence:{representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",bodySha256:bodySha,bodyBase64:body.toString("base64"),bodyLengthBytes:body.length},synthetic:true};
  const rawHash=h("raw "+pid);
  if(bound){
   const req=iso(now+60000),latest=iso(now+120000),cutoff=iso(now+6*3600_000);
   await db.query("INSERT INTO clean.phase5_fids_cycle_budget_v39(manifest_sha256,cycle_api_ceiling,other_category_reserved_units,protected_api_floor_units) VALUES($1,50000,10,100)",[manifest]);
   await db.query("INSERT INTO clean.phase5_fids_day_budget_v39(manifest_sha256,run_day_index,budget_day_utc,calendar_hash,config_hash,frame_hash,early_draw_sha256,daily_api_ceiling,daily_other_reserved_units) VALUES($1,1,$2::date,$3,$4,$5,$6,1900,5)",[manifest,start.slice(0,10),h("calendar"),h("config"),h("frame"),h("draw")]);
   await db.query("INSERT INTO clean.phase5_fids_utc_charge_budget_v39(manifest_sha256,charge_day_utc,daily_api_ceiling,daily_other_reserved_units) VALUES($1,$2::date,1900,0)",[manifest,req.slice(0,10)]);
   await db.query("INSERT INTO clean.phase5_fids_allowed_query_v39(query_digest,manifest_sha256,run_day_index,query_key,slot_id,horizon,airport_icao,early_draw_sha256,reviewed_release_sha256,rights_review_sha256,provider_contract_sha256,github_run_id,service_window_start_utc,service_window_end_utc,from_local,to_local,airport_iana_timezone,provider_api_version,fids_protocol_version,planned_dispatch_utc,planned_charge_utc_date,hard_latest_dispatch_utc,prediction_cutoff_utc,api_units_per_attempt,max_physical_attempts,state) VALUES($1,$2,1,$3,'HUB','T-24h','WSSS',$4,$5,$6,$7,'42360764143',$8,$9,$10,$11,'Asia/Singapore','ci','ci',$12,$13::date,$14,$15,2,1,'ACTIVE')",[query,manifest,"ci_primary_sweep_"+n,h("draw"),h("release"),rights,contract,start,end,localFrom,localTo,req,req.slice(0,10),latest,cutoff]);
   await db.query("INSERT INTO clean.phase5_fids_physical_attempt_v39(reservation_sha256,query_digest,manifest_sha256,github_run_id,observed_selected_at_utc,charged_utc_date,committed_at_utc) VALUES($1,$2,$3,'42360764143',$4,$5::date,$4)",[reservation,query,manifest,iso(now-ageHours*3600_000-1000),req.slice(0,10)]);
  }
  await db.query("INSERT INTO clean.fids_query_response(population_query_id,source_airport_icao,query_direction,service_window_start_utc,service_window_end_utc,from_local,to_local,airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,available_at,response_hash,raw_payload,provider_api_version,fids_protocol_version,openapi_sha256) VALUES($1,'WSSS','Departure',$2,$3,$4,$5,'Asia/Singapore',$6,$6,$6,$7,$8::jsonb,'ci','ci',$9)",[pid,start,end,localFrom,localTo,at,rawHash,JSON.stringify(raw),contract]);
  const identity="leg:ci:primary:"+n;
  await db.query("INSERT INTO clean.flight_population(source_airport_icao,window_start_utc,window_end_utc,cutoff_utc,source_type,population_query_id,analytic_identity_id,canonical_flight_instance_id,population_role,scope_classification,available_at,response_hash,flight_number,query_direction,from_local,to_local,airport_iana_timezone,codeshare_resolution_status,fids_retrieval_utc,provider_api_version,fids_protocol_version,openapi_sha256,population_member_id,dep_scheduled_utc,provider_record_key) VALUES('WSSS',$1,$2,$3,'fids',$4,$5,$5,'requested_airport_primary','confirmed_core',$3,$6,$7,'Departure',$8,$9,'Asia/Singapore','confirmed_operating_leg',$3,'ci','ci',$10,$11,$1,$5)",[start,end,at,pid,identity,rawHash,"CI"+n,localFrom,localTo,contract,member]);
  if(bound)await db.query("INSERT INTO clean.phase5_fids_original_binding_v39(population_query_id,reservation_sha256,query_digest,manifest_sha256,response_hash,decoded_original_body_sha256,rights_review_sha256,normalized_members_count,source_expires_at_utc) VALUES($1,$2,$3,$4,$5,$6,$7,1,clock_timestamp()+interval '3 seconds')",[pid,reservation,query,manifest,rawHash,bodySha,rights]);
  return {pid,member};
 }
 async function cleared(pid:string){return (await db.query("SELECT raw_payload IS NULL AND response_hash IS NULL AND raw_expired_at_utc IS NOT NULL AS done FROM clean.fids_query_response WHERE population_query_id=$1",[pid])).rows[0].done as boolean;}
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==URL||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.ADB_AUTO_COLLECT!=="0"||process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.AERODATABOX_WEBHOOK_SECRET)throw Error("DISPOSABLE_ONLY");
  db=new Pool({connectionString:URL,max:4});
  const v=(await db.query("SELECT current_database() db,current_setting('server_version_num')::int v")).rows[0];
  expect(v.db).toBe("neondb");expect(v.v).toBeGreaterThanOrEqual(160000);expect(v.v).toBeLessThan(170000);
 });
 afterAll(async()=>{await db?.end()});
 it("inert installation has no public execution, scoped actor grants cannot read raw content or broad tables",async()=>{
  await db.query("CREATE ROLE "+writer+" LOGIN NOINHERIT PASSWORD 'ci-primary-test-only'; CREATE ROLE "+reader+" LOGIN NOINHERIT PASSWORD 'ci-primary-test-only'");
  for(const role of [writer,reader]){
   await db.query("GRANT USAGE ON SCHEMA clean TO "+role);
   const a=(await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS s,has_function_privilege($1,$3,'EXECUTE') AS w,has_function_privilege($1,$4,'EXECUTE') AS r,has_function_privilege($1,$5,'EXECUTE') AS stop",[role,F+"status_v39()",F+"sweep_v39(integer)",F+"receipt_v39(text)",F+"stop_v39(text)"])).rows[0];
   expect(a).toEqual({s:false,w:false,r:false,stop:false});
  }
  await db.query("GRANT SELECT(expires_at_utc,deletion_verified_at_utc,content_class,storage_kind,retention_hours) ON clean.provider_content_blob_ref TO "+reader);
  // Disposable role grants only. Production migration grants nobody.
  await db.query("GRANT EXECUTE ON FUNCTION "+F+"sweep_v39(integer),"+F+"stop_v39(text) TO "+writer);
  await db.query("GRANT EXECUTE ON FUNCTION "+F+"status_v39(),"+F+"receipt_v39(text) TO "+reader);
  await asRole(reader,async c=>{
   expect((await c.query("SELECT "+F+"status_v39() r")).rows[0].r.liveOriginals).toBe(0);
   await expect(c.query("SELECT "+F+"sweep_v39(1)")).rejects.toMatchObject({code:"42501"});
  });
  await asRole(writer,async c=>{
   await expect(c.query("SELECT raw_payload FROM clean.fids_query_response")).rejects.toMatchObject({code:"42501"});
   await expect(c.query("UPDATE clean.fids_query_response SET raw_payload=NULL")).rejects.toMatchObject({code:"42501"});
  });
 });
 it("caps each batch, honors hard expiry, processes locked backlog later, and independent receipt confirms actual cleared rows",async()=>{
  const old=await make(30),old2=await make(29),fresh=await make(2);
  expect(await status()).toMatchObject({liveOriginals:3,eligibleOriginals:2,hardDueOriginals:2,unboundLiveOriginals:3});
  const locked=await db.connect();
  try{
   await locked.query("BEGIN");
   await locked.query("SELECT population_query_id FROM clean.fids_query_response WHERE population_query_id=$1 FOR UPDATE",[old.pid]);
   const first=await asRole(writer,async c=>(await c.query("SELECT "+F+"sweep_v39(1) r")).rows[0].r);
   expect(first).toMatchObject({originalsCleared:1,populationCleared:1,tombstones:2,remainingEligibleAtCutoff:1,remainingHardDueAtCutoff:1,providerCalls:0,phase6PaidGo:false});
   expect(await cleared(old2.pid)).toBe(true);expect(await cleared(old.pid)).toBe(false);
   expect(await asRole(reader,async c=>(await c.query("SELECT "+F+"receipt_v39($1) r",[first.runId])).rows[0].r)).toMatchObject({originalsCleared:1,populationCleared:1,tombstones:2,nonemptyPrimaryReceiptVerified:true,databaseWrites:0});
  }finally{await locked.query("ROLLBACK");locked.release();}
  const second=await sweep(1);
  expect(second).toMatchObject({originalsCleared:1,remainingEligibleAtCutoff:0});
  expect(await cleared(old.pid)).toBe(true);expect(await cleared(fresh.pid)).toBe(false);
  expect(await receipt(second.runId)).toMatchObject({tombstones:2,nonemptyPrimaryReceiptVerified:true});
  const empty=await sweep(4);expect(empty.originalsCleared).toBe(0);
  expect(await receipt(empty.runId)).toMatchObject({tombstones:0,nonemptyPrimaryReceiptVerified:false});
  await expect(sweep(33)).rejects.toThrow("SCOPE_INVALID");
 });
 it("clears a genuine V0079-bound original only after its shorter signed source-access deadline",async()=>{
  const original=await make(1,true);
  expect(await cleared(original.pid)).toBe(false);
  expect((await status()).eligibleOriginals).toBe(0);
  // A real 3-second DB-clock expiry boundary, not a simulated/future cutoff.
  await db.query("SELECT pg_sleep(3.2)");
  expect(await status()).toMatchObject({eligibleOriginals:1,hardDueOriginals:0});
  const r=await sweep(4);
  expect(r).toMatchObject({originalsCleared:1,populationCleared:1,tombstones:2,remainingHardDueAtCutoff:0});
  expect(await cleared(original.pid)).toBe(true);
  expect(await receipt(r.runId)).toMatchObject({originalsCleared:1,populationCleared:1,nonemptyPrimaryReceiptVerified:true});
 },30000);
 it("rolls back all mutations on failed child cascade and respects existing deletion STOP",async()=>{
  const old=await make(26);
  await db.query("ALTER TABLE clean.fids_query_response DISABLE TRIGGER trg_fids_response_expire_population");
  try{await expect(sweep(1)).rejects.toThrow("CHILD_NOT_CLEARED");}
  finally{await db.query("ALTER TABLE clean.fids_query_response ENABLE TRIGGER trg_fids_response_expire_population");}
  expect(await cleared(old.pid)).toBe(false);
  expect((await db.query("SELECT count(*)::int n FROM clean.retention_tombstone WHERE record_id=$1",["fids_query_response:"+old.pid+":raw_payload"])).rows[0].n).toBe(0);
  const runId="P5-PRIMARY-FIDS-SWEEP-"+randomUUID();
  await asRole(writer,async c=>{
   expect((await c.query("SELECT "+F+"stop_v39($1) r",[runId])).rows[0].r).toBe(true);
   expect((await c.query("SELECT "+F+"stop_v39($1) r",[runId])).rows[0].r).toBe(true);
  });
  const incidents=(await db.query("SELECT id FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved")).rows;
  expect(incidents).toHaveLength(1);
  await expect(sweep(1)).rejects.toThrow("DELETION_STOP");
  expect(await cleared(old.pid)).toBe(false);
  // Resolve only the synthetic disposable record, never a live incident.
  await db.query("UPDATE clean.adb_incident_stop SET resolved=true WHERE id=$1",[incidents[0].id]);
  expect((await sweep(1)).originalsCleared).toBe(1);
 });

 it("runs the actual scoped GitHub database core on distinct disposable logins and reconciles a lost COMMIT ACK without replay",async()=>{
  const old=await make(28);
  const w=new Pool({connectionString:"postgresql://"+writer+":ci-primary-test-only@localhost:5432/neondb?sslmode=disable",max:1});
  const r=new Pool({connectionString:"postgresql://"+reader+":ci-primary-test-only@localhost:5432/neondb?sslmode=disable",max:1});
  const opt=(role:string)=>({test:true,role,owner:"postgres",writerRole:writer,readerRole:reader});
  const options={writer:w,reader:r,verifyOptions:{writer:opt(writer),reader:opt(reader)},limit:1,maxBatches:1};
  try{
   const ro=await runP5PrimaryExpiry({...options,apply:false});
   expect(ro).toMatchObject({status:"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES",databaseWrites:0,before:{eligibleOriginals:1},distinctDbActorsVerified:true});
   expect(await cleared(old.pid)).toBe(false);
   let lost=0;
   const simulated={
    connect:async()=>{
     const c=await w.connect();
     return {query:async(...args:any[])=>{
       const result=await (c.query as any)(...args);
       if(args[0]==="COMMIT"){lost++;throw Error("CI_LOST_COMMIT_ACK_AFTER_ACTUAL_COMMIT");}
       return result;
      },release:(e?:Error)=>c.release(e)};
    },
    query:(...args:any[])=>(w.query as any)(...args)
   };
   const actual=await runP5PrimaryExpiry({...options,writer:simulated,apply:true});
   expect(lost).toBe(1);
   expect(actual).toMatchObject({status:"PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED",receipts:[{originalsCleared:1,populationCleared:1,tombstones:2,commitAck:false,independentReadback:true}]});
   expect(await cleared(old.pid)).toBe(true);
   expect((await status()).deletionStopUnresolved).toBe(false);
   const repeat=await runP5PrimaryExpiry({...options,apply:true});
   expect(repeat.receipts).toEqual([]);
   await db.query("GRANT SELECT(raw_payload) ON clean.fids_query_response TO "+writer);
   try{await expect(runP5PrimaryExpiry({...options,apply:true})).rejects.toThrow("UNRELATED_TABLE_OR_COLUMN_GRANT");}
   finally{await db.query("REVOKE SELECT(raw_payload) ON clean.fids_query_response FROM "+writer);}
  }finally{await Promise.all([w.end(),r.end()]);}
 });
});
it("production admission remains disabled unless separate exact-main approval and distinct scoped URLs",()=>{
 const base={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:"HKcode22/ReplitTranvr",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_RUN_ID:"1234",GITHUB_SHA:"a".repeat(40),P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:"a".repeat(40),P5_PRIMARY_FIDS_EXPIRY_MODE:"APPLY_DUE_ONLY",ADB_AUTO_COLLECT:"0",V39_PHASE6_PROCESS_ARMED:"0",V39_PHASE6_OWNER_APPROVED:"0"};
 expect(()=>admitP5PrimaryExpiryGithub(base)).toThrow("SEPARATE_APPLY_APPROVAL_REQUIRED");
 expect(()=>admitP5PrimaryExpiryGithub({...base,P5_PRIMARY_FIDS_EXPIRY_APPROVAL:P5_PRIMARY_APPLY,P5_PRIMARY_FIDS_EXPIRY_ENABLED:"true"})).toThrow("SCOPED_TLS_CONNECTION_REQUIRED");
 expect(()=>admitP5PrimaryExpiryGithub({...base,DATABASE_URL:"owner-secret"})).toThrow("EXACT_NONPAID_MAIN_SCOPE_REQUIRED");
});
