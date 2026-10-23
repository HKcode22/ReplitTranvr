import {describe,it,expect,vi} from "vitest";
import {
 planExactP25Expired58V39,executeExactP25DeletionV39,
 P25ExactDeletionHOLDV39
} from "../server/lib/disruption/p25ExactExpired58Plan_v39";

const bucket="replit-objstore-5aa4d2c4-synthetic-bucket";
const start=Date.parse("2026-10-13T05:02:12.501Z");
const expiry=start+168*60*60*1000;
function rows(){
 return Array.from({length:58},(_,i)=>{
   const id="00000000-0000-4000-8000-"+String(i+1).padStart(12,"0");
   return {
     blob_ref_id:id,
     object_name:"v39/provider/raw_provider_content/00/"+id+".blob",
     contract_version:"provider-blob-contract-v39@1.0.0",
     storage_kind:"replit_app_storage",content_class:"raw_provider_content",
     content_sha256:"a".repeat(64),
     content_bytes:i===0?308832:0,
     persisted_at_utc:new Date(start).toISOString(),
     expires_at_utc:new Date(expiry).toISOString(),
     retention_hours:168,deletion_verified_at_utc:null
   };
 });
}
const now=new Date("2026-10-22T08:00:00.000Z");
describe("YSSY P25 exact 58-only expired retention—pure and injected no-IO",()=>{
 it("binds all 58 exact refs and full manifest, no provider requests",()=>{
   const p=planExactP25Expired58V39(rows(),now,bucket);
   expect(p.count).toBe(58);
   expect(p.totalBytes).toBe(308832);
   expect(p.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
   expect(p.refs).toHaveLength(58);
   expect(p.refs[0].contentClass).toBe("raw_provider_content");
   expect(JSON.stringify({manifest:p.manifestSha256,bytes:p.totalBytes}))
     .not.toContain("00000000-");
 });
 it("rejects arbitrary extra rows, duplicates, byte changes and markers",()=>{
   const a=rows();
   for(const wrong of [
     a.slice(1),
     [...a,a[0]],
     a.map((r,i)=>i===1?{...r,blob_ref_id:a[0].blob_ref_id}:r),
     a.map((r,i)=>i===0?{...r,content_bytes:7}:r),
     a.map((r,i)=>i===0?{...r,deletion_verified_at_utc:now.toISOString()}:r)
   ])expect(()=>planExactP25Expired58V39(wrong,now,bucket)).toThrow();
 });
 it("refuses unexpired timestamps, invalid source class and wrong bucket",()=>{
   expect(()=>planExactP25Expired58V39(rows(),new Date(expiry-1),bucket))
     .toThrow("P25_EXACT_RETENTION_NOT_EXPIRED");
   const a=rows();a[0].content_class="live_fids_cache";
   expect(()=>planExactP25Expired58V39(a,now,bucket)).toThrow();
   expect(()=>planExactP25Expired58V39(rows(),now,"default")).toThrow();
 });
 it("manifest changes if any original SHA or bucket changes",()=>{
   const p=planExactP25Expired58V39(rows(),now,bucket);
   const changed=rows();changed[0].content_sha256="b".repeat(64);
   expect(planExactP25Expired58V39(changed,now,bucket).manifestSha256)
     .not.toBe(p.manifestSha256);
   expect(planExactP25Expired58V39(rows(),now,bucket+"-changed").manifestSha256)
     .not.toBe(p.manifestSha256);
 });
 it("happy path verifies physical absence BEFORE any corresponding DB marker",async()=>{
   const plan=planExactP25Expired58V39(rows(),now,bucket);
   const order:string[]=[];
   const x=await executeExactP25DeletionV39(plan,{
     deleteAndVerifyPhysical:async ref=>{order.push("delete:"+ref.blobRefId);},
     tombstoneExact:async ref=>{order.push("tombstone:"+ref.blobRefId);}
   });
   expect(x).toEqual({physicalConfirmed:58,tombstonesConfirmed:58});
   expect(order).toHaveLength(116);
   expect(order[0]).toMatch(/^delete:/);
   expect(order[1]).toMatch(/^tombstone:/);
 });
 it("DELETE failure halts without writing tombstone or visiting next item",async()=>{
   const plan=planExactP25Expired58V39(rows(),now,bucket);
   const del=vi.fn(async()=>{throw Error("lost storage response")});
   const tomb=vi.fn(async()=>undefined);
   const err=await executeExactP25DeletionV39(plan,{
     deleteAndVerifyPhysical:del,tombstoneExact:tomb
   }).catch(e=>e);
   expect(err).toBeInstanceOf(P25ExactDeletionHOLDV39);
   expect(err).toMatchObject({index:1,physicalConfirmed:0,tombstonesConfirmed:0});
   expect(del).toHaveBeenCalledTimes(1);
   expect(tomb).not.toHaveBeenCalled();
 });
 it("uncertain SQL tombstone stops after one physical deletion",async()=>{
   const plan=planExactP25Expired58V39(rows(),now,bucket);
   const del=vi.fn(async()=>undefined);
   const tomb=vi.fn(async()=>{throw Error("PG COMMIT uncertainty")});
   const err=await executeExactP25DeletionV39(plan,{
     deleteAndVerifyPhysical:del,tombstoneExact:tomb
   }).catch(e=>e);
   expect(err).toMatchObject({index:1,physicalConfirmed:1,tombstonesConfirmed:0});
   expect(del).toHaveBeenCalledTimes(1);
   expect(tomb).toHaveBeenCalledTimes(1);
 });
});
