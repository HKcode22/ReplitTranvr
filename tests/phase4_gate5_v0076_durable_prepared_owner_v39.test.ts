import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {
 assertP4G5PreparedOwnerInputV39,stageP4G5PreparedOwnerDbOnlyV39,
 requireP4G5PreparedLivePromotionV39,
 P4_G5_PREPARED_OWNER_LIVE_RELEASE_SHA_V39
} from "../server/lib/disruption/phase4Gate5DurablePreparedOwner_v39";
const path="data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json";
function fixture(){
 const bytes=readFileSync(path,"utf8");
 const x=JSON.parse(bytes);
 const hash=createHash("sha256").update(bytes).digest("hex");
 const lag=1440;
 const physical=Date.parse(x.grid.serviceWindowStartUtc)-
  (lag+x.grid.acquisitionGuardMinutes)*60000;
 const owner=prepareP4G5PhysicalOwnerV39({
  cohortId:x.cohortId,frozenManifestBytes:bytes,
  reviewedManifestSha256:hash,grid:x.grid,horizon:"T-24h",
  actualOwnerProcessStartedAtUtc:new Date(physical-
   (x.grid.githubPrearmLeadMinutes+5)*60000).toISOString()
 });
 return {owner,githubRunId:"90000000",reviewedRunAuthorizationSha256:"a".repeat(64)};
}
function fakeDb(overrides?:{
 foreign?:boolean;budgetReserved?:number;ownerNew?:boolean;
 queryMismatch?:boolean
}){
 const calls:Array<{sql:string;values?:readonly unknown[]}>= [];
 const c={
  calls,
  async query(sql:string,values?:readonly unknown[]){
   calls.push({sql,values});
   if(sql.includes("WHERE manifest_sha256<>$1"))
    return {rows:[{n:overrides?.foreign?1:0}]};
   if(sql.includes("SELECT reserved_units"))
    return {rows:[{reserved_units:overrides?.budgetReserved??0}]};
   if(sql.includes("AND github_run_id=$2")&&sql.includes("owner_digest<>$3"))
    return {rows:[{n:0}]};
   if(sql.includes("RETURNING owner_digest"))
    return {rows:overrides?.ownerNew===false?[]:[{owner_digest:"ok"}]};
   if(sql.includes("SELECT count(*)::int AS n FROM clean.phase4_g5_fids_physical_owner_v39"))
    return {rows:[{n:1}]};
   if(sql.includes("SELECT count(*)::int AS n FROM clean.phase4_g5_fids_allowed_query_v39"))
    return {rows:[{n:sql.includes("WHERE owner_digest=$1")?3:
      overrides?.queryMismatch?0:1}]};
   return {rows:[]};
  }
 };
 return c;
}
describe("Gate5 V0076 exact future horizon PREPARED owner database staging",()=>{
 it("validates frozen query digests, full grid, 6h bound and 2-unit attempts",()=>{
  const x=fixture();
  const v=assertP4G5PreparedOwnerInputV39(x);
  expect(v.owner.entries).toHaveLength(3);
  expect(v.owner.horizon).toBe("T-24h");
  expect(()=>assertP4G5PreparedOwnerInputV39({
   ...x,githubRunId:"invalid"})).toThrow("P4_G5_PREPARED_OWNER_SCOPE_OR_COST_HOLD");
  expect(()=>assertP4G5PreparedOwnerInputV39({
   ...x,owner:{...x.owner,maxAttemptsPerQuery:4}}))
   .toThrow("P4_G5_PREPARED_OWNER_SCOPE_OR_COST_HOLD");
  expect(()=>assertP4G5PreparedOwnerInputV39({
   ...x,owner:{...x.owner,entries:[x.owner.entries[0],x.owner.entries[0],x.owner.entries[2]]}}))
   .toThrow("P4_G5_PREPARED_OWNER_QUERY_BINDING_HOLD");
  expect(()=>assertP4G5PreparedOwnerInputV39({
   ...x,owner:{...x.owner,ownerActuallyObservedAtUtc:x.owner.entries[0].plannedPhysicalStartUtc}}))
   .toThrow("P4_G5_PREPARED_OWNER_LATE_OR_LONG_GITHUB_RUN_HOLD");
  expect(()=>assertP4G5PreparedOwnerInputV39({
   ...x,owner:{...x.owner,entries:x.owner.entries.map((e,i)=>i===0?
    {...e,hardLatestPhysicalStartUtc:e.cutoffUtc}:e)}}))
   .toThrow("P4_G5_PREPARED_OWNER_CUTOFF_OR_ORDER_HOLD");
 });
 it("live production release pin is UNASSIGNED; a valid random SHA cannot promote",()=>{
  expect(P4_G5_PREPARED_OWNER_LIVE_RELEASE_SHA_V39).toBe(null);
  expect(()=>requireP4G5PreparedLivePromotionV39(fixture().owner.manifestSha256))
   .toThrow("P4_G5_PREPARED_OWNER_LIVE_RELEASE_AND_RIGHTS_HOLD");
 });
 it("creates only PREPARED budget/owner/query metadata, ordered one transaction",async()=>{
  const db=fakeDb();
  const x=await stageP4G5PreparedOwnerDbOnlyV39(db,fixture());
  expect(x.status).toBe("OWNER_AND_QUERY_GRID_PERSISTED_PREPARED_ONLY_NO_PROVIDER");
  expect(x.plannedQueryCount).toBe(3);
  expect(x.ownerRowsNewlyInserted).toBe(1);
  expect(x.activeOwnersCreated).toBe(0);
  expect(x.providerCalls).toBe(0);
  expect(x.authorizedProviderDispatch).toBe(false);
  const sql=db.calls.map(c=>c.sql).join("\n");
  expect(db.calls[0].sql).toContain("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  expect(sql).toContain("pg_advisory_xact_lock(76,40)");
  expect(sql).toContain("'PREPARED'");
  expect(sql).toContain("ON CONFLICT DO NOTHING");
  expect(sql).not.toContain("'ACTIVE'");
  expect(sql).not.toContain("fetch(");
  expect(db.calls.at(-1)?.sql).toBe("COMMIT");
 });
 it("replaying the identical owner/query digest is idempotent, not active",async()=>{
  const db=fakeDb({ownerNew:false});
  const x=await stageP4G5PreparedOwnerDbOnlyV39(db,fixture());
  expect(x.ownerRowsNewlyInserted).toBe(0);
  expect(x.paidAttemptsCreated).toBe(0);
 });
 it("foreign cohort, paid activity, query mutation and preflight refusal all fail closed",async()=>{
  for(const o of [
   {foreign:true},{budgetReserved:2},{queryMismatch:true}
  ]){
   const db=fakeDb(o);
   await expect(stageP4G5PreparedOwnerDbOnlyV39(db,fixture())).rejects.toThrow(/P4_G5_PREPARED_OWNER_/);
   expect(db.calls.at(-1)?.sql).toBe("ROLLBACK");
   expect(db.calls.some(c=>c.sql==="COMMIT")).toBe(false);
  }
  const db=fakeDb();
  await expect(stageP4G5PreparedOwnerDbOnlyV39(db,{
   ...fixture(),githubRunId:"bad"})).rejects.toThrow("P4_G5_PREPARED_OWNER_SCOPE_OR_COST_HOLD");
  expect(db.calls).toHaveLength(0);
 });
 it("disposable integration workflow uses PG16 without protected production credentials",()=>{
  const w=readFileSync(".github/workflows/phase4-gate5-v0076-prepared-owners-disposable-pg16.yml","utf8");
  const script=readFileSync("scripts/v39_phase4_gate5_v0076_prepared_owners_disposable_pg16_actions.ts","utf8");
  expect(w).toContain("image: postgres:16");
  expect(w).toContain("gate5_disposable");
  expect(w).toContain("SYNTHETIC_PG16_ZERO_PROVIDER");
  expect(w).not.toContain("secrets.");
  expect(w).not.toContain("workflow_dispatch:");
  expect(w).not.toContain("schedule:");
  expect(script).toContain("requireP4G5PreparedLivePromotionV39");
  expect(script).not.toContain("https://aerodatabox.p.rapidapi.com");
 });
});
