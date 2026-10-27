import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const incidentSource=readFileSync("scripts/v39_gate05e_wsss_one_prospective_fids_rawfirst_20261027.mjs","utf8");
const independentT6Source=readFileSync("scripts/v39_gate05f_wsss_independent_t6_rawfirst_once_20261027.mjs","utf8");
const forensicSource=readFileSync("scripts/v39_gate05e_paid_receipt_db_readonly_forensics_20261027.mjs","utf8");
const cohortSource=readFileSync("scripts/v39_gate05e_cohort_aggregate_readonly_20261027.mjs","utf8");
const rawShapeSource=readFileSync("scripts/v39_gate05e_raw_schema_flags_readonly_20261027.mjs","utf8");
const independentShapeSource=readFileSync("scripts/v39_gate05_independent_t6_shape_readonly_20261027.mjs","utf8");
function sqlFromSource(source:string,start:string,end:string):string{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 if(a<0||b<0)throw Error("GATE05E_SQL_SOURCE_DRIFT");
 const sql=runInNewContext(source.slice(a+start.length,b),{}, {timeout:1000});
 if(typeof sql!=="string"||!/^(SELECT|WITH)\s/i.test(sql))throw Error("SQL_NOT_SELECT");
 return sql;
}
let pool:Pool;
beforeAll(async()=>{
 if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
    process.env.AERODATABOX_API_KEY||process.env.V39_DATABASE_RUNTIME_URL)
   throw Error("G05E_REQUIRE_NO_PROVIDER_DISPOSABLE_PG");
 const u=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"");
 if(u.hostname!=="127.0.0.1"||u.pathname!=="/p2g_stage1_fixture")
   throw Error("G05E_DB_TARGET_NOT_FIXTURE");
 pool=new Pool({connectionString:u.toString()});
 await pool.query([
 "CREATE SCHEMA IF NOT EXISTS clean;",
 "CREATE TABLE clean.fids_query_response(",
 "population_query_id uuid PRIMARY KEY,source_airport_icao text,",
 "service_window_start_utc timestamptz,service_window_end_utc timestamptz,",
 "fids_retrieval_utc timestamptz,raw_persisted_at_utc timestamptz,",
 "available_at timestamptz,raw_expired_at_utc timestamptz,",
 "response_hash text,raw_payload jsonb,fids_protocol_version text);",
 "CREATE TABLE clean.flight_population(",
 "id bigserial PRIMARY KEY,population_query_id uuid,",
 "population_role text,codeshare_resolution_status text,",
 "scope_classification text, canonical_flight_instance_id text,",
 "dep_airport_icao text, provider_record_key text, call_sign text,",
 "analytic_identity_id text, flight_number text,",
 "dep_scheduled_utc timestamptz,available_at timestamptz,",
 "provider_content_expired_at_utc timestamptz);"
 ].join(" "));
 const id="282a663e-18ef-4af0-9181-c95cde9430e6";
 await pool.query([
 "INSERT INTO clean.fids_query_response",
 "(population_query_id,source_airport_icao,service_window_start_utc,",
 "service_window_end_utc,fids_retrieval_utc,raw_persisted_at_utc,",
 "available_at,response_hash,raw_payload,fids_protocol_version)",
 "VALUES ($1,'WSSS','2026-10-28T11:26:00Z','2026-10-28T11:36:00Z',",
 "'2026-10-27T11:18:35Z','2026-10-27T11:18:38Z',",
 "'2026-10-27T11:18:38Z',$2,'{}'::jsonb,",
 "'gate05e.first-prospective-rawfirst@1')"
 ].join(" "),[id,"a".repeat(64)]);
 await pool.query([
 "INSERT INTO clean.flight_population",
 "(population_query_id,population_role,codeshare_resolution_status,",
 "dep_scheduled_utc,available_at)",
 "VALUES($1,'requested_airport_primary','confirmed_operating_leg',",
 "'2026-10-28T11:30:00Z','2026-10-27T11:18:38Z')"
 ].join(" "),[id]);
});
afterAll(async()=>{
 if(!pool)return;
 await pool.query("DROP TABLE IF EXISTS clean.flight_population");
 await pool.query("DROP TABLE IF EXISTS clean.fids_query_response");
 await pool.end();
});
describe.skipIf(process.env.P2G_DISPOSABLE_POSTGRES!=="YES")("Gate05e original paid source SQL and zero-provider recovery",()=>{
 it("parses repaired exact paid-readback SQL against actual PostgreSQL 16",async()=>{
   const sql=sqlFromSource(incidentSource,
     "const readback=await pool.query(",
     ",[observed.populationQueryId]);");
   expect(sql).not.toMatch(/,\s*FROM\s+clean\./i);
   const q=await pool.query(sql,["282a663e-18ef-4af0-9181-c95cde9430e6"]);
   expect(q.rows).toHaveLength(1);
   expect(q.rows[0].raw_present).toBe(true);
   expect(q.rows[0].rows).toBe(1);
   expect(q.rows[0].before_t24).toBe(1);
 });
 it("executes Gate05f independent T-6h paid operator postpersist SQL against ACTUAL PG16",async()=>{
  const sql=sqlFromSource(independentT6Source,
    "const readback=await pool.query(",
    ",[observed.populationQueryId]);");
  expect(sql).not.toMatch(/,\s*FROM\s+clean\./i);
  const z=(await pool.query(sql,["282a663e-18ef-4af0-9181-c95cde9430e6"])).rows[0];
  expect(z).toBeDefined();
  expect(z.raw_present).toBe(true);
  expect(z.rows).toBe(1);
  expect(z.before_t6).toBe(1);
  expect(z.within10).toBe(0);
 });
 it("executes NEW original-source aggregate identity and availability SELECTs on real PostgreSQL",async()=>{
   const summary=sqlFromSource(cohortSource,"const COHORT_SUMMARY_SELECT=",";\nconst GROUPED_SELECT=");
   const grouped=sqlFromSource(cohortSource,"const GROUPED_SELECT=",";\nconst PARENT_SELECT=");
   const parent=sqlFromSource(cohortSource,"const PARENT_SELECT=",";\nlet client=");
   for(const sql of [summary,grouped,parent]){
     expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE)\b/i);
     expect(sql).not.toMatch(/SELECT\s+[^;]*raw_payload\s+AS\s+raw_payload/i);
   }
   const c=await pool.connect();
   try{
     await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
     expect((await c.query("SHOW transaction_read_only")).rows[0].transaction_read_only).toBe("on");
     const id="282a663e-18ef-4af0-9181-c95cde9430e6";
     const [a,b,q]=[await c.query(summary,[id]),await c.query(grouped,[id]),await c.query(parent,[id])];
     expect(a.rows).toHaveLength(1);
     expect(a.rows[0].rows).toBe(1);
     expect(a.rows[0].available_before_candidate_t24).toBe(1);
     expect(a.rows[0].lead_10_to_20m).toBe(1);
     expect(a.rows[0].confirmed_canonical_rows).toBe(0);
     expect(b.rows).toHaveLength(1);
     expect(b.rows[0].identity_status).toBe("confirmed_operating_leg");
     expect(b.rows[0].response_rows).toBe(1);
     expect(q.rows[0].raw_present).toBe(true);
   } finally {await c.query("ROLLBACK");c.release();}
 });
 it("compiles and executes anonymous original FIDS JSON shape census in READ ONLY PostgreSQL",async()=>{
   const parent=sqlFromSource(rawShapeSource,"const PARENT_SQL=",";\nconst SHAPE_SQL=");
   const shape=sqlFromSource(rawShapeSource,"const SHAPE_SQL=",";\nlet client=");
   expect(parent).toMatch(/^SELECT\s/);
   expect(shape).toMatch(/^WITH\s/);
   for(const q of [parent,shape]){
     expect(q).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\s/i);
   }
   // The parent SELECT only returns raw presence; CTE may inspect full
   // provider JSON internally, but the shape query only projects counters.
   expect(parent).toContain("(raw_payload IS NOT NULL) AS raw_present");
   expect(shape).toMatch(/SELECT count\(\*\)::int AS raw_departure_objects/);
   expect(shape).not.toMatch(/SELECT\s+raw_payload\s+FROM\s+flights/i);
   const id="282a663e-18ef-4af0-9181-c95cde9430e6";
   // Synthetic fixture only; no connection to user's operational database.
   const fixture={departures:[
     {number:"SQ 123",codeshareStatus:"IsOperator",
      departure:{scheduledTime:{utc:"2026-10-28 11:30Z"}},
      arrival:{scheduledTime:{utc:"2026-10-28 14:00Z"}}},
     {number:"SQ124",codeshareStatus:"IsCodeshared",
      departure:{scheduledTime:{utc:"2026-10-28 11:30Z"}},
      arrival:{airport:{icao:"WADD"},scheduledTime:{utc:"2026-10-28 14:00Z"}}}
   ]};
   await pool.query("UPDATE clean.fids_query_response SET raw_payload=$2::jsonb WHERE population_query_id=$1",
     [id,JSON.stringify(fixture)]);
   const c=await pool.connect();
   try{
     await c.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
     expect((await c.query("SHOW transaction_read_only")).rows[0].transaction_read_only).toBe("on");
     const p=(await c.query(parent,[id])).rows[0];
     const z=(await c.query(shape,[id,"a".repeat(64)])).rows[0];
     expect(p.raw_departures).toBe(2);
     expect(z.raw_departure_objects).toBe(2);
     expect(z.strict_number_parseable).toBe(1);
     expect(z.spaced_number_pattern).toBe(1);
     expect(z.operator_role).toBe(1);
     expect(z.marketing_role).toBe(1);
     expect(z.explicit_departure_icao).toBe(0);
     expect(z.explicit_arrival_icao).toBe(1);
     expect(z.departure_schedule_utc).toBe(2);
     expect(z.arrival_schedule_utc).toBe(2);
     expect(z.runway_utc_present).toBe(0);
   }finally{await c.query("ROLLBACK");c.release();}
 });

 it("checks independent T6 provider native field shapes on actual PG16 without leaking raw",async()=>{
   const parent=sqlFromSource(independentShapeSource,
     "const PARENT_SQL=",";\nconst SHAPE_SQL=");
   const shape=sqlFromSource(independentShapeSource,
     "const SHAPE_SQL=",";\nconst MEMBERS_SQL=");
   const members=sqlFromSource(independentShapeSource,
     "const MEMBERS_SQL=",";\n\nlet db=");
   for(const sql of [parent,shape,members]){
     expect(sql).toMatch(/^(WITH|SELECT)\\s/);
     expect(sql).not.toMatch(/\\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE)\\s/i);
   }
   expect(shape).toContain("provisional_operator_context_candidates");
   const id="282a663e-18ef-4af0-9181-c95cde9430e6";
   const fixture={departures:[
     {number:"SQ 123",codeshareStatus:"IsOperator",
      departure:{scheduledTime:{utc:"2026-10-28 11:30Z"}},
      arrival:{airport:{icao:"WADD"},scheduledTime:{utc:"2026-10-28 14:00Z"}}},
     {number:"SQ124",codeshareStatus:"IsCodeshared",
      departure:{scheduledTime:{utc:"2026-10-28 11:31Z"}},
      arrival:{airport:{icao:"WADD"},scheduledTime:{utc:"2026-10-28 14:01Z"}}}
   ]};
   await pool.query("UPDATE clean.fids_query_response SET raw_payload=$2::jsonb WHERE population_query_id=$1",
     [id,JSON.stringify(fixture)]);
   const client=await pool.connect();
   try{
     await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
     expect((await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only).toBe("on");
     const a=(await client.query(parent,[id])).rows[0];
     const b=(await client.query(shape,[id,"a".repeat(64)])).rows[0];
     const c=(await client.query(members,[id])).rows[0];
     expect(a.raw_departures).toBe(2);
     expect(b.response_objects).toBe(2);
     expect(b.accepted_number_syntax).toBe(2);
     expect(b.spaced_number_syntax).toBe(1);
     expect(b.operator_role_objects).toBe(1);
     expect(b.marketing_role_objects).toBe(1);
     expect(b.provisional_operator_context_candidates).toBe(1);
     expect(c.normalized_rows).toBe(1);
     expect(c.candidate_before_t6).toBe(1);
   }finally{await client.query("ROLLBACK");client.release();}
 });
 it("confirms strictly READ ONLY recovery query syntax and real returned source counts",async()=>{
   const sql=sqlFromSource(forensicSource,"const query=",";\nconst utc=");
   expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE)\b/i);
   const client=await pool.connect();
   try{
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect((await client.query("SHOW transaction_read_only")).rows[0].transaction_read_only).toBe("on");
    const q=await client.query(sql,["gate05e.first-prospective-rawfirst@1",
      "2026-10-27T11:00:00Z","2026-10-27T12:00:00Z"]);
    expect(q.rows).toHaveLength(1);
    expect(q.rows[0].has_raw).toBe(true);
    expect(q.rows[0].normalized_rows).toBe(1);
    expect(q.rows[0].before_t24).toBe(1);
    expect(sql).not.toContain("SELECT q.raw_payload");
   }finally{await client.query("ROLLBACK");client.release();}
 });
});