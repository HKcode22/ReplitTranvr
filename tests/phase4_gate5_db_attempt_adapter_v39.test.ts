import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {prepareP4G5PhysicalOwnerV39}
 from "../server/lib/disruption/phase4Gate5PhysicalOwnerDispatchGuard_v39";
import {
 P4_G5_PAID_MANIFEST_RELEASE_PIN_V39,
 requireP4G5PaidManifestPromotionV39,
 reserveP4G5PhysicalAttemptDbOnlyV39
} from "../server/lib/disruption/phase4Gate5DbCommittedAttemptAdapter_v39";

const fixture=()=>{
 const bytes=readFileSync("data-collection/phase4/GATE5_NEXT_COHORT_PREARM_SYNTHETIC_HOLD.json","utf8");
 const m=JSON.parse(bytes),first=Date.parse(m.grid.serviceWindowStartUtc)-
  1440*60000-m.grid.acquisitionGuardMinutes*60000;
 const owner=prepareP4G5PhysicalOwnerV39({
  cohortId:m.cohortId,grid:m.grid,
  frozenManifestBytes:bytes,
  reviewedManifestSha256:createHash("sha256").update(bytes).digest("hex"),
  horizon:"T-24h",
  actualOwnerProcessStartedAtUtc:new Date(first-65*60000).toISOString()
 });
 return owner;
};
function deps(owner=fixture(),opts:{failSql?:boolean;late?:boolean;staleQuota?:boolean}={}){
 const calls:{sql:string;args?:readonly unknown[]}[]=[];
 const target=owner.entries[0].plannedPhysicalStartUtc;
 const stamp=Date.parse(target);
 let readings=0,ended=false;
 const pg={
  async query(sql:string,args?:readonly unknown[]){
   calls.push({sql,args});
   if(opts.failSql&&sql.startsWith("SELECT clean.reserve_"))
    throw Error("simulated-race-or-DB-denial");
   if(sql.startsWith("SELECT clean.reserve_"))
    return {rows:[{committed_at_utc:new Date(stamp)}],rowCount:1};
   return {rows:[],rowCount:0};
  },
  async end(){ended=true;}
 };
 const env={
  openScopedClient:async()=>pg,
  accountEvidence:async()=>({
   observedAtUtc:new Date(stamp+(opts.staleQuota?-60000:0)).toISOString(),
   apiUnitsRemaining:59974,requestsRemaining:20000
  }),
  nowUtc:()=>{
   readings++;
   return new Date(readings===1?stamp:
    opts.late?Date.parse(owner.entries[0].hardLatestPhysicalStartUtc)+1000:stamp+2000)
    .toISOString();
  }
 };
 return {calls,pg,env,getEnded:()=>ended};
}
const s=(owner=fixture())=>({
 owner,queryIndex:0,physicalAttemptNumber:1,
 githubRunId:"41278048278",
 currentProjectAvailableUnits:54,
 otherProjectUnitsAlreadyReserved:0,
 thisOwnerPriorPhysicalUnits:0
});
describe("Phase4 Gate5 DB-only physical reservation adapter, no HTTP path",()=>{
 it("is hard pinned to no paid release even when a valid synthetic owner exists",()=>{
  expect(P4_G5_PAID_MANIFEST_RELEASE_PIN_V39).toBeNull();
  expect(()=>requireP4G5PaidManifestPromotionV39(fixture()))
   .toThrow("P4_G5_PAID_SOURCE_RELEASE_NOT_REVIEWED");
 });
 it("uses SERIALIZABLE, irrevocable SELECT reserve, COMMIT, then a second cutoff assessment",async()=>{
  const o=fixture(),d=deps(o);
  const r=await reserveP4G5PhysicalAttemptDbOnlyV39(s(o),d.env);
  expect(d.calls[0].sql).toContain("SERIALIZABLE READ WRITE");
  expect(d.calls.filter(x=>x.sql.startsWith("SELECT clean.reserve_"))).toHaveLength(1);
  expect(d.calls.map(x=>x.sql).slice(-2)).toEqual([
   expect.stringContaining("SELECT clean.reserve_"),"COMMIT"
  ]);
  expect(d.getEnded()).toBe(true);
  const payload=d.calls.find(x=>x.sql.startsWith("SELECT clean.reserve_"))?.args;
  expect(payload?.[0]).toBe(o.manifestSha256);
  expect(payload?.[1]).toBe(o.ownerDigest);
  expect(payload?.[2]).toBe("41278048278");
  expect(payload?.[3]).toBe(o.entries[0].queryDigest);
  expect(payload?.[4]).toBe(1);
  expect(r.dbReservationWrites).toBe(1);
  expect(r.authorizedProviderDispatch).toBe(false);
  expect(r.billedProviderCallMade).toBe(false);
  expect(r.strictGate5Passed).toBe(false);
  expect(d.calls.some(x=>x.sql==="ROLLBACK")).toBe(false);
 });
 it("refuses stale account quota without opening DB or spending an attempt",async()=>{
  const d=deps(fixture(),{staleQuota:true});
  await expect(reserveP4G5PhysicalAttemptDbOnlyV39(s(),d.env))
   .rejects.toThrow("P4_G5_DB_ADAPTER_STALE_OR_DEPLETED_FREE_QUOTA");
  expect(d.calls).toHaveLength(0);
 });
 it("rolls back an unsuccessful SQL reservation, no COMMIT",async()=>{
  const d=deps(fixture(),{failSql:true});
  await expect(reserveP4G5PhysicalAttemptDbOnlyV39(s(),d.env))
   .rejects.toThrow("simulated-race-or-DB-denial");
  expect(d.calls.at(-1)?.sql).toBe("ROLLBACK");
  expect(d.calls.some(x=>x.sql==="COMMIT")).toBe(false);
  expect(d.getEnded()).toBe(true);
 });
 it("after COMMIT, late physical cutoff is rejected WITHOUT refund or rollback",async()=>{
  const d=deps(fixture(),{late:true});
  await expect(reserveP4G5PhysicalAttemptDbOnlyV39(s(),d.env))
   .rejects.toThrow("P4_G5_DB_ADAPTER_POSTCOMMIT_CUTOFF_HOLD_NONREFUNDABLE");
  expect(d.calls.at(-1)?.sql).toBe("COMMIT");
  expect(d.calls.some(x=>x.sql==="ROLLBACK")).toBe(false);
  expect(d.getEnded()).toBe(true);
 });
 it("rejects forged runner ID before database/GET",async()=>{
  const d=deps(fixture());
  await expect(reserveP4G5PhysicalAttemptDbOnlyV39({
   ...s(),githubRunId:"fake-run"
  },d.env)).rejects.toThrow("P4_G5_DB_ADAPTER_OWNER_OR_RUN_ID_HOLD");
  expect(d.calls).toHaveLength(0);
 });
 it("never imports provider FIDS sender or network fetch, and no GitHub paid workflow calls it",()=>{
  const source=readFileSync("server/lib/disruption/phase4Gate5DbCommittedAttemptAdapter_v39.ts","utf8");
  expect(source).not.toContain("fetch(");
  expect(source).not.toContain("fetchFidsAirport");
  expect(source).not.toContain("AERODATABOX_API_KEY");
  expect(source).not.toContain("new pg.Client");
  expect(source).toContain("P4_G5_PAID_MANIFEST_RELEASE_PIN_V39:string|null=null");
  expect(source).toContain("COMMIT");
  expect(source).toContain("ROLLBACK");
 });
});
