import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {Script,createContext} from "node:vm";
const source=readFileSync(
  "scripts/v39_gate05b_wsss_two_fids_gets_once_20261027.mjs","utf8"
);
const start=source.indexOf("function validTime(");
const end=source.indexOf("const now=Date.now();",start);
if(start<0||end<0)throw Error("OFFLINE_TEST_REVIEWED_RUNNER_FUNCTIONS_NOT_FOUND");
type Review={
 validTime:(x:unknown)=>boolean,
 survey:(x:unknown,withLocation:boolean)=>Record<string,unknown>
};
const sandbox=createContext({});
const {validTime,survey}=new Script(
 source.slice(start,end)+"\n;({validTime,survey})"
).runInContext(sandbox,{timeout:1000}) as Review;

describe("Actual one-use Gate05b parser, evaluated offline with no provider IO",()=>{
 it("accepts both published space UTC and RFC3339 T, rejects malformed dates",()=>{
   expect(validTime({utc:"2026-10-27 07:12Z"})).toBe(true);
   expect(validTime({utc:"2026-10-27T07:12:00Z"})).toBe(true);
   expect(validTime({utc:"2026-10-27 07:12:00.123+00:00"})).toBe(true);
   expect(validTime({utc:"2026-02-30 07:12Z"})).toBe(false);
   expect(validTime({utc:"2026-10-27 07:12+03:00"})).toBe(false);
   expect(validTime({utc:"unparseable"})).toBe(false);
 });
 it("counts nested values with real-space UTC shape but never claims actual runway outcome",()=>{
   const record={number:"SQ123",codeshareStatus:"IsOperator",
     departure:{quality:["Live"],scheduledTime:{utc:"2026-10-27 07:12Z"},
       revisedTime:{utc:"2026-10-27 07:14Z"},
       runwayTime:{utc:"2026-10-27 07:20Z"}},
     arrival:{airport:{icao:"WADD"}}
   };
   const a=survey({departures:[record]},false);
   expect(a.departureObjects).toBeUndefined();
   expect(a.sourceDepartureObjects).toBe(1);
   expect(a.scheduledUtcPresent).toBe(1);
   expect(a.scheduledUtcNonempty).toBe(1);
   expect(a.revisedUtcPresent).toBe(1);
   expect(a.runwayUtcPresent).toBe(1);
   expect(a.anyLiveQuality).toBe(1);
   expect(a.provisionalDistinctOperatingLegKeys).toBe(1);
   expect(a.runwayTimestampActualityProven).toBe(false);
   expect(a.scheduledWheelsOffReferenceProven).toBe(false);
 });
 it("handles movement-only FIDS source and marketing codeshare as distinct",()=>{
   const data={departures:[
     {number:"SQ125",codeshareStatus:"IsOperator",movement:{
       airport:{icao:"WADD"},quality:["Live"],
       scheduledTime:{utc:"2026-10-27 07:22Z"},
       runwayTime:{utc:"2026-10-27 07:26Z"}}},
     {number:"MH125",codeshareStatus:"IsCodeshared",movement:{
       airport:{icao:"WADD"},quality:["Live"],
       scheduledTime:{utc:"2026-10-27 07:22Z"}}}
   ]};
   const r=survey(data,true);
   expect(r.sourceMovementObjects).toBe(2);
   expect(r.scheduledUtcPresent).toBe(2);
   expect(r.runwayUtcPresent).toBe(1);
   expect(r.anyLiveQuality).toBe(2);
   expect(r.operatorCodeshare).toBe(1);
   expect(r.marketingCodeshare).toBe(1);
   expect(r.provisionalDistinctOperatingLegKeys).toBe(1);
 });
 it("separates field present vs invalid UTC; reports only anonymized counts",()=>{
   const data={departures:[{number:"SENSITIVE-ORIGINAL",codeshareStatus:"IsOperator",
     departure:{quality:["Live"],scheduledTime:{utc:"not valid"},
       runwayTime:{utc:"2026-10-27 07:22+02:00"}},
     arrival:{airport:{icao:"WADD"}}}]};
   const r=survey(data,false);
   expect(r.scheduledUtcNonempty).toBe(1);
   expect(r.scheduledUtcPresent).toBe(0);
   expect(r.runwayUtcNonempty).toBe(1);
   expect(r.runwayUtcPresent).toBe(0);
   expect(JSON.stringify(r)).not.toContain("SENSITIVE-ORIGINAL");
   expect(JSON.stringify(r)).not.toContain("2026-10-27");
 });
});
