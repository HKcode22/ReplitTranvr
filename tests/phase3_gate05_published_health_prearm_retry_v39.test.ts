import {describe,it,expect,vi} from "vitest";
import {readGate05PublishedReceiverHealthV39 as read} from
  "../server/lib/disruption/gate05PublishedReceiverHealth_v39";

const sha="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const url="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const good={status:"PASS",git_head:sha,published_deployment:true,
  prepaid_route_registered:true,provider_mutation:false};
const response=(body:unknown,status=200)=>
  new Response(JSON.stringify(body),{status});
const mock=(items:Array<Response|Error>, seen:string[]=[])=>{
  let n=0;
  return vi.fn(async (_url:unknown, init?:RequestInit)=>{
    if(init?.method)seen.push(init.method);
    const item=items[n++];
    if(!item)throw Error("extra attempt");
    if(item instanceof Error)throw item;
    return item;
  }) as unknown as typeof fetch;
};

describe("Gate05 published receiver PRE-CREATE resilience, not billable data",()=>{
 it("survives two cold-start timeouts, then authenticates exact source",async()=>{
   const f=mock([Error("timeout"),Error("timeout"),response(good)]);
   const waits:number[]=[];
   const result=await read({url,expectedReceiver:sha,fetchImpl:f,
     sleepImpl:async ms=>{waits.push(ms);}});
   expect(result.git_head).toBe(sha);
   expect(f).toHaveBeenCalledTimes(3);
   expect(waits).toEqual([1500,3000]);
   expect(f.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
 });
 it("recovers from two transient 5xx, never mutates provider",async()=>{
   const verbs:string[]=[];
   const f=mock([response({error:"cold"},503),response({error:"gateway"},502),
     response(good)],verbs);
   await read({url,expectedReceiver:sha,fetchImpl:f,sleepImpl:async()=>{}});
   expect(verbs).toEqual(["GET","GET","GET"]);
   expect(f).toHaveBeenCalledTimes(3);
 });
 it("rejects HTTP 401 without repeating authentication failures",async()=>{
   const f=mock([response({error:"no"},401),response(good)]);
   await expect(read({url,expectedReceiver:sha,fetchImpl:f,
     sleepImpl:async()=>{}})).rejects.toThrow("HTTP_NONRETRYABLE_401");
   expect(f).toHaveBeenCalledTimes(1);
 });
 it("rejects 200 wrong source without pretending retries can fix identity",async()=>{
   const f=mock([response({...good,git_head:"f".repeat(40)}),response(good)]);
   await expect(read({url,expectedReceiver:sha,fetchImpl:f,
     sleepImpl:async()=>{}})).rejects.toThrow("SOURCE_OR_ADMISSION_UNVERIFIED");
   expect(f).toHaveBeenCalledTimes(1);
 });
 it("fails after exactly three free transport attempts",async()=>{
   const f=mock([Error("timeout"),Error("reset"),Error("timeout")]);
   await expect(read({url,expectedReceiver:sha,fetchImpl:f,
     sleepImpl:async()=>{}})).rejects.toThrow("TRANSPORT_RETRIES_EXHAUSTED");
   expect(f).toHaveBeenCalledTimes(3);
 });
 it("never accepts missing prepaid route or a positive provider mutation",async()=>{
   for(const bad of [{...good,prepaid_route_registered:false},
                     {...good,provider_mutation:true}]){
      const f=mock([response(bad)]);
      await expect(read({url,expectedReceiver:sha,fetchImpl:f,
        sleepImpl:async()=>{}})).rejects.toThrow("SOURCE_OR_ADMISSION_UNVERIFIED");
   }
 });
 it("enforces a bounded 20-second physical timeout and exact endpoint",async()=>{
   const f=mock([response(good)]);
   await expect(read({url,expectedReceiver:sha,timeoutMs:21000,fetchImpl:f}))
     .rejects.toThrow("RETRY_CONFIGURATION_INVALID");
   await expect(read({url:url.replace("replit.app","elsewhere.com"),
     expectedReceiver:sha,fetchImpl:f})).rejects.toThrow("URL_INVALID");
   expect(f).not.toHaveBeenCalled();
 });
});
