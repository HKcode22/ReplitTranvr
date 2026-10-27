import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {Script,createContext} from "node:vm";

const source=readFileSync(
 "scripts/v39_gate05c_wsss_fids_leg_schema_two_paid_gets_20261027.mjs","utf8"
);
const a=source.indexOf("function validTime(");
const b=source.indexOf("const now=Date.now();",a);
if(a<0||b<0)throw Error("GATE05C_REVIEWED_SOURCE_FUNCTION_BOUNDARY_MISSING");
const tested = new Script(source.slice(a,b)+
 "\n;({validTime,survey})").runInContext(createContext({}),{timeout:1000}) as {
 validTime:(t:unknown)=>boolean;
 survey:(t:unknown,withLeg:boolean)=>Record<string,any>;
};

const flight=(departureOrMovement:"departure"|"movement",when:string)=>({
 number:"SECRET-SQ222",status:"Departed",codeshareStatus:"IsOperator",
 lastUpdatedUtc:"2026-10-27T07:28:00Z",
 [departureOrMovement]:{
  quality:["Live"],scheduledTime:{utc:when},
  revisedTime:{utc:"2026-10-27 07:16Z"},
  runwayTime:{utc:"2026-10-27T07:20:00Z"}
 },
 arrival:{airport:{icao:"WADD"}}
});

describe("Gate05c new paid runner pure survey — no network or file IO",()=>{
 it("counts both actual FIDS withLeg shapes and UTC styles without exposing originals",()=>{
  const off=tested.survey({departures:[flight("movement","2026-10-27 07:12Z")]},false);
  const on=tested.survey({departures:[flight("departure","2026-10-27T07:12Z")]},true);
  for(const v of [off,on]){
   expect(v.departureObjects).toBe(1);
   expect(v.scheduledUtcNonempty).toBe(1);
   expect(v.scheduledUtcPresent).toBe(1);
   expect(v.revisedUtcPresent).toBe(1);
   expect(v.runwayUtcPresent).toBe(1);
   expect(v.lastUpdatedTimeUtcValid).toBe(1);
   expect(v.provisionalDistinctOperatingLegKeys).toBe(1);
   expect(v.expectedResponseBranchObserved).toBe(true);
   expect(v.runwayTimestampActualityProven).toBe(false);
   expect(v.scheduledWheelsOffReferenceProven).toBe(false);
   expect(v.predictionCutoffTProven).toBe(false);
   expect(v.canonicalOperatingLegIdentityProven).toBe(false);
   const out=JSON.stringify(v);
   expect(out).not.toContain("SECRET");
   expect(out).not.toContain("2026-10-27");
   expect(out).not.toContain("WADD");
  }
  expect(off.sourceMovementObjects).toBe(1);
  expect(on.sourceDepartureObjects).toBe(1);
  expect(off.timestampUtcShapes.scheduled.spaceUtc).toBe(1);
  expect(on.timestampUtcShapes.scheduled.tUtc).toBe(1);
 });
 it("separates genuine missing UTC from nonempty invalid UTC and unexpected branches",()=>{
  const r=tested.survey({departures:[
   {number:"M123",codeshareStatus:"IsCodeshared",departure:{
    scheduledTime:{utc:"2026-02-30 07:12Z"},
    runwayTime:{utc:"2026-10-27T07:12+03:00"},
    quality:["Live"]}},
   {movement:{scheduledTime:{local:"2026-10-27 15:12"}}},
   null
  ]},false);
  expect(r.departureObjects).toBe(3);
  expect(r.malformedObjects).toBe(1);
  expect(r.sourceDepartureObjects).toBe(1);
  expect(r.sourceMovementObjects).toBe(1);
  expect(r.scheduledUtcNonempty).toBe(1);
  expect(r.scheduledUtcPresent).toBe(0);
  expect(r.timestampUtcShapes.scheduled.nonemptyInvalid).toBe(1);
  expect(r.timestampUtcShapes.scheduled.missing).toBe(2);
  expect(r.timestampUtcShapes.runway.nonemptyInvalid).toBe(1);
  expect(r.marketingCodeshare).toBe(1);
  expect(r.lastUpdatedTimeUtcValid).toBe(0);
 });
 it("does not silently coerce invalid dates or non-UTC timestamps",()=>{
  expect(tested.validTime({utc:"2026-02-30 07:12Z"})).toBe(false);
  expect(tested.validTime({utc:"2026-10-27 07:12+03:00"})).toBe(false);
  expect(tested.validTime({utc:"2026-10-27 07:12Z"})).toBe(true);
  expect(tested.validTime({utc:"2026-10-27T07:12:00Z"})).toBe(true);
 });
 it("keeps old authorization isolated, exact one-use intent, two GET max, no retries",()=>{
  expect(source).toContain("gate05c-leg-schema-20261027");
  expect(source).toContain('flag:"wx"');
  expect(source).toContain("if(paidAttempts>=2)");
  expect(source).toContain("for(const withLeg of [false,true])");
  expect(source).toContain('withLocation:"false"');
  expect(source).toContain("withLeg:String(withLeg)");
  expect(source).toContain("expectedMaximumApiUnits:4");
  expect(source).toContain("apiUnitsSpent:spent");
  expect(source).toContain("hardProviderCostCap:false");
  expect(source).not.toContain("gate05b-one-paid-20261027");
  expect(source).not.toContain("withLocation:String(withLocation)");
  expect(source).not.toContain("AUTHORIZE_ONE_NEW_WSSS_GATE05B");
 });
});
