import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {assertGate4TransactionalAdmissionV39,type Gate4AdmissionClientV39}
  from "../server/lib/disruption/gate4TransactionalAdmission_v39";
type Row=Record<string,unknown>;
function mockPg(input:{
  locked?:boolean;
  active?:boolean;
  predecessor?:Row|null;
}={}){
 const calls:string[]=[];
 const prev=input.predecessor===undefined?null:input.predecessor;
 const db:Gate4AdmissionClientV39={
   query:vi.fn(async(sql:string,values?:number[])=>{
     calls.push(sql);
     if(sql.includes("pg_try_advisory_xact_lock"))
       return {rowCount:1,rows:[{locked:input.locked!==false}]};
     if(sql.includes("WHERE status='ACTIVE'"))
       return {rowCount:input.active?1:0,rows:input.active?[{live:1}]:[]};
     if(sql.includes("ORDER BY batch_seq DESC LIMIT 1"))
       return {rowCount:prev?1:0,rows:prev?[prev]:[]};
     throw Error("UNEXPECTED_SQL");
   })
 };
 return {db,calls};
}
describe("Gate4 no-provider transactional second-start admission",()=>{
 it("allows empty history with scoped postgres lock",async()=>{
   const {db,calls}=mockPg();
   await expect(assertGate4TransactionalAdmissionV39(db)).resolves.toBeUndefined();
   expect(calls).toHaveLength(3);
   expect(calls[0]).toContain("pg_try_advisory_xact_lock");
 });
 it("refuses contention before checking any owner or creating data",async()=>{
   const {db,calls}=mockPg({locked:false});
   await expect(assertGate4TransactionalAdmissionV39(db))
     .rejects.toThrow("REFUSED_GATE4_ADMISSION_LOCK_BUSY");
   expect(calls).toHaveLength(1);
 });
 it("refuses active batch even if latest appeared settled",async()=>{
   const {db,calls}=mockPg({active:true});
   await expect(assertGate4TransactionalAdmissionV39(db))
     .rejects.toThrow("REFUSED_GATE4_ACTIVE_BATCH_TRANSACTION");
   expect(calls).toHaveLength(2);
 });
 it("requires closed MATCH acknowledged and numeric nonnegative spend",async()=>{
   const valid={status:"CLOSED",reconciliation_status:"MATCH",
     reconcile_acked:true,credits_consumed_actual:"4"};
   const one=mockPg({predecessor:valid});
   await expect(assertGate4TransactionalAdmissionV39(one.db))
     .resolves.toBeUndefined();
   for(const change of [
     {status:"ACTIVE"},{reconciliation_status:"UNSETTLED"},
     {reconcile_acked:false},{credits_consumed_actual:null},
     {credits_consumed_actual:"NaN"},{credits_consumed_actual:""},
     {credits_consumed_actual:" 4 "}
   ]){
     const bad=mockPg({predecessor:{...valid,...change}});
     await expect(assertGate4TransactionalAdmissionV39(bad.db)).rejects.toThrow();
     expect(bad.calls[0]).toContain("pg_try_advisory_xact_lock");
   }
 });
 it("real startBatch holds lock between BEGIN and INSERT/COMMIT",()=>{
   const s=readFileSync(new URL(
     "../server/lib/disruption/adbCollectionController_v39.ts",
     import.meta.url),"utf8");
   const segment=s.slice(s.indexOf("export async function startBatch"),
     s.indexOf("export async function stopBatch"));
   const begin=segment.indexOf('await client.query("BEGIN")');
   const guard=segment.indexOf("await assertGate4TransactionalAdmissionV39(client)");
   const insert=segment.indexOf("INSERT INTO clean.adb_collection_batches");
   const commit=segment.indexOf('await client.query("COMMIT")');
   expect(begin).toBeGreaterThanOrEqual(0);
   expect(guard).toBeGreaterThan(begin);
   expect(insert).toBeGreaterThan(guard);
   expect(commit).toBeGreaterThan(insert);
 });
});
