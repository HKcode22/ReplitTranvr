import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {runGate4OwnedSubscriptionCreatesV39} from
  "../server/lib/disruption/gate4OwnedCreateRecovery_v39";

const make=(config?:{
  insertFailsAt?:number;
  createFailsAt?:number;
  deleteFailsFor?:string;
  markFailsFor?:string;
  incidentFails?:boolean;
})=>{
 const log:string[]=[];
 let n=0;
 const deps={
   create:vi.fn(async (_:string)=>{
     n++;
     if(config?.createFailsAt===n)throw Error("LOST_HTTP_RESPONSE");
     log.push("create:"+n);
     return "synthetic-sub-"+n;
   }),
   persist:vi.fn(async (_:string,id:string)=>{
     log.push("insert:"+id);
     if(config?.insertFailsAt===n)throw Error("DB_INSERT_LOST");
   }),
   deleteOwned:vi.fn(async (id:string)=>{
     log.push("delete:"+id);
     if(id===config?.deleteFailsFor)throw Error("PROVIDER_DELETE_FAILED");
     return true;
   }),
   markEnded:vi.fn(async (id:string)=>{
     log.push("ended:"+id);
     if(id===config?.markFailsFor)throw Error("PG_MARK_FAILED");
   }),
   incident:vi.fn(async(code:string,count:number,unknown:number)=>{
     log.push("incident:"+code+":"+count+":"+unknown);
     if(config?.incidentFails)throw Error("INCIDENT_DB_DOWN");
   })
 };
 return {deps,log};
};
describe("Gate4 owned CREATE boundary — no provider, injected faults",()=>{
 it("normal success preserves every returned subscription reference",async()=>{
   const x=make();
   const r=await runGate4OwnedSubscriptionCreatesV39(["WSSS","YSSY"],x.deps);
   expect(r.map(z=>z.subscriptionId)).toEqual(["synthetic-sub-1","synthetic-sub-2"]);
   expect(x.log).toEqual([
     "create:1","insert:synthetic-sub-1",
     "create:2","insert:synthetic-sub-2"
   ]);
   expect(x.deps.incident).not.toHaveBeenCalled();
 });
 it("DB fails immediately after paid CREATE: returned ID is deleted",async()=>{
   const x=make({insertFailsAt:1});
   await expect(runGate4OwnedSubscriptionCreatesV39(["WSSS"],x.deps))
     .rejects.toThrow("GATE4_CREATE_COMPENSATION_REQUIRES_SETTLEMENT_HOLD");
   expect(x.log).toEqual([
     "create:1","insert:synthetic-sub-1",
     "delete:synthetic-sub-1","ended:synthetic-sub-1",
     "incident:CREATE_DB_INSERT_UNCONFIRMED:1:0"
   ]);
 });
 it("rolls back all known created IDs in reverse if second insert fails",async()=>{
   const x=make({insertFailsAt:2});
   await expect(runGate4OwnedSubscriptionCreatesV39(["WSSS","YSSY"],x.deps))
     .rejects.toThrow("GATE4_CREATE_COMPENSATION_REQUIRES_SETTLEMENT_HOLD");
   expect(x.deps.deleteOwned).toHaveBeenCalledTimes(2);
   expect(x.log.indexOf("delete:synthetic-sub-2")).toBeLessThan(
     x.log.indexOf("delete:synthetic-sub-1"));
 });
 it("one DELETE failure must not suppress remaining DELETEs",async()=>{
   const x=make({insertFailsAt:2,deleteFailsFor:"synthetic-sub-2"});
   await expect(runGate4OwnedSubscriptionCreatesV39(["WSSS","YSSY"],x.deps))
     .rejects.toThrow("GATE4_CREATE_CUSTODY_UNCONFIRMED_HOLD");
   expect(x.deps.deleteOwned).toHaveBeenCalledTimes(2);
   expect(x.deps.incident).toHaveBeenCalledWith(
     "CREATE_DB_INSERT_UNCONFIRMED",2,1
   );
 });
 it("mark-ended failure is an unresolved custody condition",async()=>{
   const x=make({insertFailsAt:1,markFailsFor:"synthetic-sub-1"});
   await expect(runGate4OwnedSubscriptionCreatesV39(["WSSS"],x.deps))
     .rejects.toThrow("GATE4_CREATE_CUSTODY_UNCONFIRMED_HOLD");
 });
 it("ambiguous CREATE response cannot be reported as zero exposure",async()=>{
   const x=make({createFailsAt:2});
   await expect(runGate4OwnedSubscriptionCreatesV39(["WSSS","YSSY"],x.deps))
     .rejects.toThrow("GATE4_CREATE_CUSTODY_UNCONFIRMED_HOLD");
   expect(x.deps.deleteOwned).toHaveBeenCalledTimes(1);
   expect(x.deps.incident).toHaveBeenCalledWith(
     "CREATE_RESULT_AMBIGUOUS",1,1
   );
 });
 it("incident storage failing is unresolved even after compensating DELETE",async()=>{
   const x=make({insertFailsAt:1,incidentFails:true});
   await expect(runGate4OwnedSubscriptionCreatesV39(["WSSS"],x.deps))
     .rejects.toThrow("GATE4_CREATE_CUSTODY_UNCONFIRMED_HOLD");
   expect(x.deps.deleteOwned).toHaveBeenCalledOnce();
 });
 it("actual controller uses this helper; provider ID tracked before INSERT",()=>{
   const s=readFileSync(new URL(
     "../server/lib/disruption/adbCollectionController_v39.ts",import.meta.url
   ),"utf8");
   const h=readFileSync(new URL(
     "../server/lib/disruption/gate4OwnedCreateRecovery_v39.ts",import.meta.url
   ),"utf8");
   expect(s).toContain("runGate4OwnedSubscriptionCreatesV39(decision.selections");
   expect(h.indexOf("created.push({selection,subscriptionId:id})"))
     .toBeLessThan(h.indexOf("await deps.persist(selection,id)"));
 });
});
