import {describe,it,expect,vi} from "vitest";
import {assessGate4SpendV39} from "../server/lib/disruption/gate4SendAwareDecision_v39";
import {executeGate4SafetyActionV39} from "../server/lib/disruption/gate4WatchdogAction_v39";

const input={
  cap:100,softStopMargin:10,unsettledBurstReserve:10,
  openingBalance:500,currentBalance:410,
  receivedItemUnits:90,deliveryFailures:0
};
const witness=(opts?:{batchId?:string;status?:string;failure?:boolean})=>{
 const incident=vi.fn(async (_:string)=>{if(opts?.failure)throw Error("DB_DOWN")});
 const stop=vi.fn(async (_:string)=>({
   batchId:opts?.batchId??"D1",status:opts?.status??"CLOSED"
 }));
 const proceed=vi.fn(async()=>undefined);
 return {incident,stop,proceed, deps:{
   expectedBatchId:"D1",writeIncident:incident,stopOwned:stop,proceed
 }};
};
describe("Gate4 real watchdog safety-action execution — injected offline failures",()=>{
 it("soft STOP calls the owned stop exactly once; cannot certify terminal state",async()=>{
   const d=assessGate4SpendV39(input);
   const x=witness();
   const r=await executeGate4SafetyActionV39(d,x.deps);
   expect(r).toMatchObject({
     status:"STOP_ATTEMPT_RETURNED",action:"STOP",
     independentTerminalStopVerified:false,
     providerRequestsByHelper:0
   });
   expect(x.stop).toHaveBeenCalledExactlyOnceWith("gate4_SOFT_STOP_THRESHOLD");
   expect(x.proceed).not.toHaveBeenCalled();
   expect(x.incident).not.toHaveBeenCalled();
 });
 it("HOLD_STOP still tries owned stop when incident write fails",async()=>{
   const d=assessGate4SpendV39({...input,currentBalance:null});
   const x=witness({failure:true});
   const r=await executeGate4SafetyActionV39(d,x.deps);
   expect(r).toMatchObject({
     status:"STOP_ATTEMPT_RETURNED",action:"HOLD_STOP",
     incidentRecorded:false,independentTerminalStopVerified:false
   });
   expect(x.incident).toHaveBeenCalledOnce();
   expect(x.stop).toHaveBeenCalledOnce();
   expect(x.proceed).not.toHaveBeenCalled();
 });
 it("no false STOP when provider deletion throws",async()=>{
   const x=witness();
   x.stop.mockRejectedValueOnce(Error("DELETE_FAILED"));
   const r=await executeGate4SafetyActionV39(
     assessGate4SpendV39(input),x.deps);
   expect(r.status).toBe("STOP_UNCONFIRMED");
   expect(x.proceed).not.toHaveBeenCalled();
 });
 it("no false STOP when DB result is wrong batch or not closed",async()=>{
   for(const opts of [{batchId:"OTHER"},{status:"ACTIVE"}]){
     const x=witness(opts);
     const r=await executeGate4SafetyActionV39(
       assessGate4SpendV39(input),x.deps);
     expect(r.status).toBe("STOP_UNCONFIRMED");
     expect(x.proceed).not.toHaveBeenCalled();
   }
 });
 it("CONTINUE is delegated and never invents a terminal receipt",async()=>{
   const x=witness();
   const r=await executeGate4SafetyActionV39(
     assessGate4SpendV39({...input,currentBalance:411,receivedItemUnits:89}),
     x.deps);
   expect(r.status).toBe("CONTINUED");
   expect(r.independentTerminalStopVerified).toBe(false);
   expect(x.proceed).toHaveBeenCalledOnce();
   expect(x.stop).not.toHaveBeenCalled();
 });
 it("refuses malformed batch without calling any mutations",async()=>{
   const x=witness();
   await expect(executeGate4SafetyActionV39(
     assessGate4SpendV39(input),
     {...x.deps,expectedBatchId:"unsafe/batch"}
   )).rejects.toThrow("GATE4_ACTION_UNSAFE_BATCH_ID");
   expect(x.stop).not.toHaveBeenCalled();
 });
});
