import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {analyzeGate5Offline,type Gate5Input} from "../server/lib/disruption/phase4Gate5OfflineFunnel_v39";
const T="2026-10-29T12:00:00.000Z";
const base:Gate5Input={airport:"WSSS",tier:"HUB",region:"AS",
 windowStartUtc:"2026-10-29T11:00:00.000Z",windowEndUtc:"2026-10-29T15:00:00.000Z",
 fids:[],webhooks:[],snapshots:[],airborne:[]};
const f=(id:string,availableAtUtc:string,other:Record<string,unknown>={})=>({
 flightId:id,queryId:id+":"+availableAtUtc,airport:"WSSS",
 role:"requested_airport_primary" as const,scope:"confirmed_core" as const,
 codeshare:"confirmed_operating_leg" as const,
 firstSelectedTUtc:T,movementScheduledUtc:T,availableAtUtc,
 departureCountry:"SG",arrivalCountry:"AU",...other
});
const w=(id:string)=>({flightId:id,airport:"WSSS",receivedAtUtc:"2026-10-29T13:00:00.000Z"});
const s=(id:string,queryId:string)=>({flightId:id,populationQueryId:queryId,
 horizon:"T-6h" as const,cutoffUtc:"2026-10-29T06:00:00.000Z",
 requiredComplete:false,optionalMissing:true,
 targetApplicable:false,targetObserved:false,targetSourceVerified:false});
const run=(x:Partial<Gate5Input>)=>analyzeGate5Offline({...base,...x});
describe("Gate5 as-of standalone mathematics, never paid/live",()=>{
 it("requires FIDS observed by horizon cutoff; webhook cannot establish membership",()=>{
   const r=run({fids:[f("a","2026-10-29T11:00:00.000Z")],webhooks:[w("a"),w("b")]});
   expect(r.horizons.map(h=>h.population)).toEqual([0,0,0]);
   expect(r.horizons[1].capturedOutsidePopulation).toBe(1);
   expect(r.horizons[1].capturedWithPrimaryButNotCutoffEligible).toBe(1);
   expect(r.horizons[1].rates.capture.value).toBeNull();
   expect(r.strictPassed).toBe(false);
 });
 it("creates independent expectation despite zero webhook and missing features",()=>{
   const a=f("a","2026-10-29T04:00:00.000Z");
   const r=run({fids:[a],snapshots:[s("a",a.queryId)]});
   expect(r.horizons.map(h=>h.population)).toEqual([0,1,1]);
   expect(r.horizons[1].expectedSnapshots).toBe(1);
   expect(r.horizons[1].createdSnapshots).toBe(1);
   expect(r.horizons[1].webhookCaptured).toBe(0);
   expect(r.horizons[1].rates.capture.value).toBe(0);
   expect(r.horizons[1].rates.optionalMissing.value).toBe(1);
 });
 it("disallows late revised FIDS response as earlier snapshot lineage",()=>{
   const a=f("a","2026-10-29T04:00:00.000Z");
   const b=f("a","2026-10-29T09:00:00.000Z");
   const r=run({fids:[a,b],snapshots:[s("a",b.queryId)]});
   expect(r.horizons[1].population).toBe(1);
   expect(r.horizons[1].createdSnapshots).toBe(0);
   expect(r.violations).toContain("T-6h:SNAPSHOT_NOT_IN_ASOF_POPULATION");
 });
 it("excludes context and codeshare ambiguity, retains outside captures",()=>{
   const a=f("a","2026-10-29T04:00:00.000Z");
   const b=f("b","2026-10-29T04:00:00.000Z",{role:"opposite_movement_context"});
   const c=f("c","2026-10-29T04:00:00.000Z",{codeshare:"ambiguous_unknown"});
   const r=run({fids:[a,b,c],webhooks:[w("a"),w("b"),w("d")]});
   expect(r.contextExcluded).toBe(1);expect(r.ambiguousExcluded).toBe(1);
   expect(r.horizons[1].webhookCaptured).toBe(1);
   expect(r.horizons[1].capturedOutsidePopulation).toBe(2);
   expect(r.horizons[1].countryMix.international).toBe(1);
 });
 it("null first schedule T blocks eligibility, no retroactive substitution",()=>{
   const r=run({fids:[f("a","2026-10-29T04:00:00.000Z",{firstSelectedTUtc:null})],
     webhooks:[w("a")]});
   expect(r.horizons[1].noVerifiedT).toBe(1);
   expect(r.horizons[1].population).toBe(0);
   expect(r.horizons[1].capturedOutsidePopulation).toBe(0);
   expect(r.horizons[1].capturedWithPrimaryButNotCutoffEligible).toBe(1);
 });
 it("quarantines unverified label instead of declaring it observed",()=>{
   const a=f("a","2026-10-29T04:00:00.000Z");
   const r=run({fids:[a],snapshots:[{...s("a",a.queryId),
     targetApplicable:true,targetObserved:true}]});
   expect(r.horizons[1].targetApplicable).toBe(1);
   expect(r.horizons[1].targetObserved).toBe(0);
   expect(r.violations).toContain("T-6h:TARGET_WITHOUT_VERIFIED_SOURCE");
 });
 it("requires nested flight-level airborne funnel, not point counts",()=>{
   const a={flightId:"a",eligible:true,observed:true,usable:true,
     complete:false,snapshotEligible:false,labeled:false};
   const r=run({airborne:[a],fids:[f("a","2026-10-29T04:00:00.000Z")]});
   expect(r.airborne.eligible).toBe(1);
   expect(r.airborne.usable).toBe(1);expect(r.airborne.complete).toBe(0);
   expect(()=>run({airborne:[{...a,labeled:true}]})).toThrow("GATE5_AIRBORNE_NON_NESTED");
 });
 it("reports zero denom NULL and refuses duplicates",()=>{
   expect(run({}).horizons[0].rates.capture.value).toBeNull();
   const a=f("a","2026-10-29T04:00:00.000Z");
   expect(()=>run({fids:[a,a]})).toThrow("GATE5_FIDS_DUPLICATE");
   expect(()=>run({snapshots:[s("a","q"),s("a","q")]})).toThrow("GATE5_SNAPSHOT_DUPLICATE");
 });
 it("live owner no longer fabricates zero captured-outside count",()=>{
   const code=readFileSync("scripts/v39_gate5_owner_v39.ts","utf8");
   expect(code).not.toContain("0::int AS captured_outside_population");
   expect(code).toContain("BLOCKED_LIVE_INDEPENDENT_POPULATION_AND_OUTSIDE_JOIN_NOT_IMPLEMENTED");
 });
});
