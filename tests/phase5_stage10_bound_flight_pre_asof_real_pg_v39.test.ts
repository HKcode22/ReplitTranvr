/**
 * Authentic B0062+staged V0079 SQL parse/least-privilege test.
 * Disposable GitHub CI only; no source originals, provider requests or PRE.
 */
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {Pool} from "pg";
import {
 P5_STAGE10_BOUND_SOURCE_SQL,P5_STAGE10_BOUND_MEMBERS_SQL,
 readP5OneBoundSourceFlightPreCandidates
} from "../server/lib/disruption/phase5V0079BoundFlightPreAsOfReadback_v39";

const URL="postgresql://postgres:postgres@localhost:5432/neondb?sslmode=disable";
const READER="phase5_fids_pre_reader_ciuser01";
const readerUrl="postgresql://"+READER+":ci-only@localhost:5432/neondb?sslmode=disable";
const run=process.env.V39_P5_STAGE10_PG16==="1"?describe:describe.skip;
const hex=(c:string)=>c.repeat(64);
run("Stage10 authentic V0079 SQL / read-only role on disposable postgres16",()=>{
 let admin:Pool,restricted:Pool;
 beforeAll(async()=>{
  if(process.env.GITHUB_ACTIONS!=="true"||
     process.env.V39_P5_STAGE10_PG16!=="1"||
     process.env.DATABASE_URL!==URL||
     process.env.AERODATABOX_API_KEY||
     process.env.V39_PHASE6_PROCESS_ARMED!=="0")
    throw Error("REFUSED_NON_DISPOSABLE_STAGE10_PG16");
  admin=new Pool({connectionString:URL,max:2});
  await admin.query(
   "CREATE ROLE "+READER+" LOGIN PASSWORD 'ci-only'"+
   " NOSUPERUSER NOCREATEDB NOCREATEROLE");
  await admin.query("GRANT USAGE ON SCHEMA clean TO "+READER);
  await admin.query(
   "GRANT SELECT ON clean.phase5_fids_allowed_query_v39,"+
   "clean.phase5_fids_physical_attempt_v39,"+
   "clean.phase5_fids_original_binding_v39,"+
   "clean.fids_query_response,clean.flight_population,"+
   "clean.flight_snapshots TO "+READER);
  restricted=new Pool({connectionString:readerUrl,max:2});
 });
 afterAll(async()=>{
  if(restricted)await restricted.end();
  if(admin)await admin.end();
 });
 it("compiles exact joins and lateral frozen-T24 anchor on real staged schema",async()=>{
  const a=await restricted.query(
   "EXPLAIN "+P5_STAGE10_BOUND_SOURCE_SQL,[hex("a"),hex("b")]);
  expect(a.rows.length).toBeGreaterThan(0);
  const b=await restricted.query(
   "EXPLAIN "+P5_STAGE10_BOUND_MEMBERS_SQL,[
     "123e4567-e89b-42d3-a456-426614174000",hex("d")]);
  expect(b.rows.length).toBeGreaterThan(0);
 });
 it("the scoped reader has no mutation grants and no source cannot masquerade as zero flights",async()=>{
  const actual=(await restricted.query(
    "SELECT current_user AS role,"+
    "has_table_privilege(current_user,"+
    "'clean.flight_snapshots','INSERT') AS can_pre_write,"+
    "has_table_privilege(current_user,"+
    "'clean.phase5_fids_original_binding_v39','INSERT') AS can_bind,"+
    "has_table_privilege(current_user,"+
    "'clean.phase5_fids_allowed_query_v39','UPDATE') AS can_update"
  )).rows[0];
  expect(actual).toEqual({
    role:READER,can_pre_write:false,can_bind:false,can_update:false
  });
  await expect(readP5OneBoundSourceFlightPreCandidates(restricted,{
   expectedManifestSha256:hex("a"),expectedQueryDigestSha256:hex("b"),
   expectedRightsReviewSha256:hex("c"),expectedFrameSha256:hex("d"),
   expectedReaderRole:READER,runDayIndex:1,
   slot:"HUB",horizon:"T-24h",airportIcao:"WSSS",
   maxPopulationStalenessSeconds:3600
  })).rejects.toThrow("NO_SINGLE_AUTHENTIC_BOUND_SOURCE");
  const n=(await restricted.query(
   "SELECT COUNT(*)::int AS n FROM clean.flight_snapshots")).rows[0].n;
  expect(n).toBe(0);
 });
});
