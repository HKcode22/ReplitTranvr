import {afterEach,describe,it,expect,vi} from "vitest";
import {
  createSubscription,getBalance,resolveExperimentalRetries,
} from "../server/lib/disruption/aerodataboxLimiter_v3";

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
function reply(status:number,json:unknown){
  return {
    status,ok:status>=200&&status<300,
    headers:{get:()=>null},
    text:async()=>JSON.stringify(json)
  } as unknown as Response;
}
describe("Gate3 AeroDataBox HTTP one-CREATE limit / READ-only 429 retries",()=>{
 it("429 subscription CREATE does not issue a second HTTP POST under generic 3x rate-limit retry",async()=>{
   vi.stubEnv("AERODATABOX_API_KEY","not-a-real-provider-key");
   const fetchMock=vi.fn(async()=>reply(429,{error:"rate limited"}));
   vi.stubGlobal("fetch",fetchMock);
   const outcome=await createSubscription("FlightByAirportIcao","WSSS",{
     url:"https://example.invalid/prepaid/test",maxDeliveryRetries:0
   });
   expect(outcome).toBeNull();
   expect(fetchMock).toHaveBeenCalledTimes(1);
   const [url,init]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
   expect(url).toContain("/subscriptions/webhook/FlightByAirportIcao/WSSS");
   expect(init.method).toBe("POST");
   expect(JSON.parse(String(init.body)).maxDeliveryRetries).toBe(0);
 });
 it("non-mutating account GET may retry a temporary 429",async()=>{
   vi.stubEnv("AERODATABOX_API_KEY","not-a-real-provider-key");
   let n=0;
   const f=vi.fn(async()=>{
     n++;
     return n===1?reply(429,{error:"rate limited"}):
       reply(200,{creditsRemaining:2056});
   });
   vi.stubGlobal("fetch",f);
   await getBalance();
   expect(f).toHaveBeenCalledTimes(2);
   for(const args of f.mock.calls){
     const request=args as unknown as [string,RequestInit];
     expect(request[0]).toContain("/subscriptions/balance");
     expect(request[1]?.method).toBeUndefined();
   }
 },15000);
 it("provider delivery retries are not equivalent to health watchdog retries",()=>{
   expect(resolveExperimentalRetries(undefined)).toBe(0);
   expect(resolveExperimentalRetries(0)).toBe(0);
   expect(()=>resolveExperimentalRetries(3)).toThrow();
   expect(()=>resolveExperimentalRetries(12)).toThrow();
 });
});
