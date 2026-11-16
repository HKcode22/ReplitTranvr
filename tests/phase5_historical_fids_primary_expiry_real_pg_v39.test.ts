/** Real B0062 FIDS parent/child tombstones on a disposable PG16 only.
 * Never run with production identity or application credentials. */
import {describe,it,expect} from "vitest";
import {Pool} from "pg";
import {randomUUID} from "node:crypto";
import {reviewOrExpireP5HistoricalFidsPrimary,P5_HISTORICAL_FIDS_EXPIRY_APPROVAL} from "../server/lib/disruption/retentionExpiry_v39";
const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const suite=process.env.V39_P5_HISTORICAL_FIDS_DISPOSABLE_PG16==="1"?describe:describe.skip;
suite("exact historical FIDS remediation using installed B0062 triggers",()=>{
 it("reviews the exact old cohort, rejects changed scope, clears only due content and preserves its research membership",async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||process.env.DATABASE_URL!==URL||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0"||process.env.ADB_AUTO_COLLECT!=="0"||
     process.env.AERODATABOX_API_KEY||process.env.RAPIDAPI_KEY||process.env.AERODATABOX_WEBHOOK_SECRET)
    throw Error("DISPOSABLE_PG16_ONLY");
  const db=new Pool({connectionString:URL,max:3});
  try{
   const ids=[randomUUID(),randomUUID(),randomUUID()],members:string[]=[];
   const start="2001-01-03T00:00:00.000Z",end="2001-01-03T04:00:00.000Z";
   const ancient="2001-01-01T00:00:00.000Z",fresh="2001-01-02T12:00:00.000Z",hash="a".repeat(64),contract="b".repeat(64);
   for(const [i,pid] of ids.entries()){
    const at=i===2?fresh:ancient;
    await db.query("INSERT INTO clean.fids_query_response(population_query_id,source_airport_icao,query_direction,service_window_start_utc,service_window_end_utc,from_local,to_local,airport_iana_timezone,fids_retrieval_utc,raw_persisted_at_utc,available_at,response_hash,raw_payload,provider_api_version,fids_protocol_version,openapi_sha256) VALUES($1,'WSSS','Departure',$2,$3,'2001-01-03T08:00','2001-01-03T12:00','Asia/Singapore',$4,$4,$4,$5,$6::jsonb,'ci','ci',$7)",[pid,start,end,at,hash,JSON.stringify({synthetic:true,n:i}),contract]);
    for(let j=0;j<(i===0?2:1);j++){
     const id="leg:historical-ci:"+i+":"+j,member=randomUUID();
     await db.query("INSERT INTO clean.flight_population(source_airport_icao,window_start_utc,window_end_utc,cutoff_utc,source_type,population_query_id,analytic_identity_id,canonical_flight_instance_id,population_role,scope_classification,available_at,response_hash,flight_number,query_direction,from_local,to_local,airport_iana_timezone,codeshare_resolution_status,fids_retrieval_utc,provider_api_version,fids_protocol_version,openapi_sha256,population_member_id,dep_scheduled_utc,provider_record_key) VALUES('WSSS',$1,$2,$3,'fids',$4,$5,$5,'requested_airport_primary','confirmed_core',$3,$6,'CI123','Departure','2001-01-03T08:00','2001-01-03T12:00','Asia/Singapore','confirmed_operating_leg',$3,'ci','ci',$7,$8,$1,$5)",[start,end,at,pid,id,hash,contract,member]);
     if(i!==2)members.push(member);
    }
   }
   const scope={observedAtUtc:"2001-01-03T00:00:00.000Z",expectedOriginals:2,expectedPopulation:3,expectedPre:0,expectedT24:0};
   const counts=async()=> (await db.query("SELECT count(*) FILTER (WHERE raw_payload IS NOT NULL)::int AS live,count(*) FILTER (WHERE raw_expired_at_utc IS NOT NULL)::int AS expired FROM clean.fids_query_response WHERE population_query_id=ANY($1::uuid[])",[ids])).rows[0];
   const preview=await reviewOrExpireP5HistoricalFidsPrimary(db,scope,{mode:"review"});
   expect(preview).toMatchObject({status:"EXACT_HISTORICAL_FIDS_SCOPE_REVIEW_ONLY_NO_GO",originals:2,population:3,databaseWrites:0,phase6PaidGo:false});
   expect(await counts()).toEqual({live:3,expired:0});
   await expect(reviewOrExpireP5HistoricalFidsPrimary(db,{...scope,expectedPopulation:2},{mode:"review"})).rejects.toThrow("POPULATION_OR_MEMBERSHIP_DRIFT");
   await expect(reviewOrExpireP5HistoricalFidsPrimary(db,scope,{mode:"apply",approval:"generic-spend-permission",expectedScopeSha256:preview.scopeSha256})).rejects.toThrow("EXPLICIT_REMEDIATION_REVIEW_REQUIRED");
   await expect(reviewOrExpireP5HistoricalFidsPrimary(db,scope,{mode:"apply",approval:P5_HISTORICAL_FIDS_EXPIRY_APPROVAL,expectedScopeSha256:"f".repeat(64)})).rejects.toThrow("REVIEW_SCOPE_HASH_DRIFT");
   expect(await counts()).toEqual({live:3,expired:0});
   // No new provider or source record is added between review and apply.
   expect((await reviewOrExpireP5HistoricalFidsPrimary(db,scope,{mode:"review"})).scopeSha256).toBe(preview.scopeSha256);
   const result=await reviewOrExpireP5HistoricalFidsPrimary(db,scope,{mode:"apply",approval:P5_HISTORICAL_FIDS_EXPIRY_APPROVAL,expectedScopeSha256:preview.scopeSha256});
   expect(result).toMatchObject({status:"HISTORICAL_FIDS_PRIMARY_CLEAR_COMMITTED_FRESH_READBACK_NO_GO",originalsCleared:2,populationCleared:3,preservedProjectMembership:3,tombstones:5,freshConnectionReadback:true,phase6PaidGo:false,backupOrPitrVerified:false,accountRightsVerified:false});
   expect(await counts()).toEqual({live:1,expired:2});
   const c=(await db.query("SELECT count(*)::int AS n FROM clean.flight_population WHERE population_member_id=ANY($1::uuid[]) AND provider_content_expired_at_utc IS NOT NULL AND population_query_id IS NULL AND analytic_identity_id IS NULL AND flight_number IS NULL AND dep_scheduled_utc IS NULL AND provider_record_key IS NULL",[members])).rows[0];
   expect(c.n).toBe(3);
   const m=(await db.query("SELECT count(*)::int AS n FROM clean.population_research_membership WHERE population_member_id=ANY($1::uuid[])",[members])).rows[0];
   expect(m.n).toBe(3);
   expect((await db.query("SELECT count(*)::int AS n FROM clean.flight_population WHERE population_query_id=$1 AND flight_number='CI123' AND provider_content_expired_at_utc IS NULL",[ids[2]])).rows[0].n).toBe(1);
   await expect(reviewOrExpireP5HistoricalFidsPrimary(db,scope,{mode:"apply",approval:P5_HISTORICAL_FIDS_EXPIRY_APPROVAL,expectedScopeSha256:preview.scopeSha256})).rejects.toThrow("SOURCE_COUNT_OR_IDENTITY_DRIFT");
   expect(await counts()).toEqual({live:1,expired:2});
  }finally{await db.end();}
 },120000);
});
