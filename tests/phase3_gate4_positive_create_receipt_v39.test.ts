import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
import {reviewGate4PositiveCreateResponseBytesV39} from
 "../server/lib/disruption/aerodataboxLimiter_v3";

const icao="WSSS";
const good={
 subscription:{
  id:"syntheticPositiveID77",isActive:true,billingType:"CreditBased",
  subject:{type:"FlightByAirportIcao",id:icao}
 }
};
const bytes=(obj:unknown)=>Buffer.from(JSON.stringify(obj),"utf8");
describe("Gate4 positive CREATE exact raw response custody, NO PROVIDER",()=>{
 it("hashes actual wire bytes, not a reserialized subscription",()=>{
   const wire=bytes(good);
   const x=reviewGate4PositiveCreateResponseBytesV39(wire,icao);
   expect(x.subscription.id).toBe(good.subscription.id);
   expect(x.rawCreateResponseSha256).toBe(
     createHash("sha256").update(wire).digest("hex")
   );
 });
 it("different raw formatting has distinct receipt digest",()=>{
   const a=bytes(good);
   const b=Buffer.from(JSON.stringify(good,null,1),"utf8");
   expect(reviewGate4PositiveCreateResponseBytesV39(a,icao)
     .rawCreateResponseSha256).not.toBe(
     reviewGate4PositiveCreateResponseBytesV39(b,icao)
       .rawCreateResponseSha256);
 });
 it("wrong subject or foreign ID cannot become owned custody",()=>{
   for(const candidate of [
     {subscription:{...good.subscription,subject:{
      type:"FlightByAirportIcao",id:"KLAX"}}},
     {subscription:{...good.subscription,id:"!"}},
     {subscription:{...good.subscription,isActive:false}},
     {subscription:{...good.subscription,billingType:"LifetimeBased"}},
     {subscription:{...good.subscription,subject:{
      type:"FlightByNumber",id:"WSSS"}}}
   ]){
     expect(()=>reviewGate4PositiveCreateResponseBytesV39(
       bytes(candidate),icao)).toThrow();
   }
 });
 it("malformed/empty/huge payloads are unknown, never presumed no CREATE",()=>{
   for(const bad of [Buffer.from("oops"),Buffer.alloc(0),
     Buffer.alloc(65537,65)]){
     expect(()=>reviewGate4PositiveCreateResponseBytesV39(bad,icao))
       .toThrow();
   }
 });
 it("missing provider owner fields never become a valid receipt",()=>{
   expect(()=>reviewGate4PositiveCreateResponseBytesV39(
     bytes({subscription:{id:"claimedID99"}}),icao)).toThrow();
 });
});
