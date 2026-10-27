import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {Pool} from "pg";
import {materializePreSnapshotsForCutoff} from "../server/lib/disruption/preSnapshotBuilder_v3";

let pool:Pool;
const config={
  milestone:"departure.scheduledTime.utc",version:"fixture-only-reviewed@1",
  artifactHash:"a".repeat(64),semanticsEvidenceSha256:"b".repeat(64),
  verifiedProviderNativeSchedule:true as const,
};

beforeAll(async()=>{
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES" ||
     process.env.AERODATABOX_API_KEY || process.env.V39_DATABASE_RUNTIME_URL)
    throw Error("GATE05_NOT_DISPOSABLE_PG_NO_PROVIDER");
  const u=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"");
  if(u.hostname!=="127.0.0.1"||u.pathname!=="/p2g_stage1_fixture")
    throw Error("GATE05_INVALID_FIXTURE_TARGET");
  pool=new Pool({connectionString:u.toString(),max:2});
  const db=(await pool.query("SELECT current_database() AS n")).rows[0].n;
  if(db!=="p2g_stage1_fixture")throw Error("GATE05_PG_IDENTITY_REFUSED");
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS clean;
    CREATE TABLE clean.flight_population(
      id bigserial PRIMARY KEY,
      analytic_identity_id text NOT NULL,
      source_type text NOT NULL,
      population_role text NOT NULL,
      scope_classification text NOT NULL,
      codeshare_resolution_status text NOT NULL,
      provider_content_expired_at_utc timestamptz,
      dep_scheduled_utc timestamptz,
      available_at timestamptz,
      population_query_id text,
      response_hash text
    );
    CREATE TABLE clean.flight_snapshots(
      flight_instance_id text NOT NULL,
      prediction_state text NOT NULL,
      horizon text NOT NULL,
      prediction_cutoff_utc timestamptz NOT NULL,
      selected_t_milestone_utc timestamptz,
      selected_t_version text,
      population_query_id text,
      fids_response_hash text,
      schedule_version text,
      frame_hash text,
      config_hash text,
      features_json jsonb,
      missingness_flags jsonb,
      builder_version text,
      provenance_json jsonb,
      UNIQUE(flight_instance_id,horizon,prediction_cutoff_utc)
    );
  `);
},30_000);
afterAll(async()=>{
  if(!pool)return;
  await pool.query("DROP TABLE IF EXISTS clean.flight_snapshots; DROP TABLE IF EXISTS clean.flight_population").catch(()=>{});
  await pool.end();
});
async function put(id:string,T:string,at:string,q:string){
  await pool.query(`INSERT INTO clean.flight_population
    (analytic_identity_id,source_type,population_role,scope_classification,
     codeshare_resolution_status,dep_scheduled_utc,available_at,population_query_id,response_hash)
    VALUES($1,'fids','requested_airport_primary','confirmed_core','confirmed_operating_leg',$2,$3,$4,$5)`,
    [id,T,at,q,"a".repeat(64)]);
}
describe("Gate05 actual disposable PostgreSQL 16 flight-wise T and as-of",()=>{
 it("uses first observed T, latest source before each individual cutoff, no future backfill",async()=>{
   await put("A","2026-09-09T12:00:00Z","2026-09-08T11:40:00Z","A-first");
   await put("A","2026-09-09T12:00:00Z","2026-09-08T11:59:00Z","A-latest-before");
   await put("A","2026-09-09T14:00:00Z","2026-09-08T12:02:00Z","A-after-retime");
   await put("B","2026-09-09T13:08:00Z","2026-09-08T13:07:00Z","B-first");
   await put("C","2026-09-09T12:30:00Z","2026-09-08T12:31:00Z","C-too-late");
   const o=await materializePreSnapshotsForCutoff(pool,{
      cutoffUtc:new Date("2026-09-08T14:00:00Z"),batchId:null,
      frameHash:null,configHash:null,selectedTMilestoneConfig:config,
      horizons:["T-24h"]
   });
   expect(o.populationRows).toBe(3);
   expect(o.inserted).toBe(2);
   expect(o.blocked.population_unobserved_at_cutoff).toBe(1);
   const q=await pool.query(`SELECT flight_instance_id, horizon,
      prediction_cutoff_utc, selected_t_milestone_utc, population_query_id
      FROM clean.flight_snapshots ORDER BY flight_instance_id`);
   expect(q.rows.map(x=>({
     id:x.flight_instance_id,h:x.horizon,
     cutoff:x.prediction_cutoff_utc.toISOString(),
     T:x.selected_t_milestone_utc.toISOString(),query:x.population_query_id
   }))).toEqual([
     {id:"A",h:"T-24h",cutoff:"2026-09-08T12:00:00.000Z",
      T:"2026-09-09T12:00:00.000Z",query:"A-latest-before"},
     {id:"B",h:"T-24h",cutoff:"2026-09-08T13:08:00.000Z",
      T:"2026-09-09T13:08:00.000Z",query:"B-first"}
   ]);
 });
});
