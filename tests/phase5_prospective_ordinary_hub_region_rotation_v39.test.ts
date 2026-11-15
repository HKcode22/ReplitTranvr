import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {proposeP5OrdinaryHubRegionRotation} from "../server/lib/disruption/phase5ProspectiveOrdinaryHubRegionRotation_v39";
import {buildP5ActualFivePairB0062CalendarOnlyDraft} from "../server/lib/disruption/phase5RealFivePairB0062CalendarOnlyDraft_v39";
import {p5TreatmentCommitmentForSeed} from "../server/lib/disruption/phase5IndependentPairedTreatmentSourcePreview_v39";
const original=JSON.parse(readFileSync("data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json","utf8"));
const seed=(s:string)=>createHash("sha256").update("SYNTHETIC CI ONLY "+s).digest("hex");
const input={ownerCorrectedReadback:original,firstRunDateUtc:"2026-11-22",claimedRotationSeeds:{
 HUB:seed("hub"),MID_A:seed("mid-a"),MID_B:seed("mid-b"),REGIONAL:seed("region")}};
describe("four-HUB / six-region new-template rotation with actual corrected pairs",()=>{
 it("keeps exact pair replays, 21 unknown ordinary airport draws, and rotation counts",()=>{
  const a=proposeP5OrdinaryHubRegionRotation(input);
  expect(a.ordinaryHubsAndRegions).toHaveLength(21);expect(a.all31SlotMetadata).toHaveLength(31);
  expect(a.newTemplateDraws).toBe(26);expect(a.replayedDays).toBe(5);
  const newDays=a.all31SlotMetadata.filter(r=>r.drawType==="NEW_TEMPLATE");
  for(let i=0;i<26;i+=4){const block=newDays.slice(i,i+4);expect(new Set(block.map(x=>x.anchorIcao)).size).toBe(block.length);}
  for(const slot of ["MID_A","MID_B","REGIONAL"] as const)
   for(let i=0;i<26;i+=6){const block=newDays.slice(i,i+6);expect(new Set(block.map(x=>x.slotRegions[slot])).size).toBe(block.length);}
  for(let i=0;i<5;i++)expect(a.all31SlotMetadata[i+6].slotRegions).toEqual(a.all31SlotMetadata[i].slotRegions);
  expect(a.rotationSha256).toBe(proposeP5OrdinaryHubRegionRotation(input).rotationSha256);
  expect(a.ordinaryAirportSelectionsCreated).toBe(0);expect(a.phase6PaidGo).toBe(false);
 });
 it("feeds the existing B0062 draft with prospective seeds without inventing airports",()=>{
  const a=proposeP5OrdinaryHubRegionRotation(input);
  const s=seed("separate treatment");
  const d=buildP5ActualFivePairB0062CalendarOnlyDraft({schema:"v39.phase5.actual-five-pair-31-b0062-draft-input.v1",
   ownerCorrectedReadback:original,firstRunDateUtc:input.firstRunDateUtc,
   claimedTreatment:{treatmentSeedHex:s,announcedCommitmentSha256:p5TreatmentCommitmentForSeed(s),claimedCommitmentObservedAtUtc:"2026-11-15T00:00:00.000Z"},
   ordinaryHubsAndRegions:a.ordinaryHubsAndRegions,predeclaredDailyDrawSeeds:Array.from({length:31},(_,i)=>({runDayIndex:i+1,frozenDrawSeed:seed("day "+i)})),
   assembledAtUtc:"2026-11-15T00:00:00.000Z"});
  expect(d.calendarDays.filter(x=>x.pairAirportSet===null)).toHaveLength(21);expect(d.phase6PaidGo).toBe(false);
 });
 it("refuses recycled seed or changed fixed pair identity",()=>{
  expect(()=>proposeP5OrdinaryHubRegionRotation({...input,claimedRotationSeeds:{...input.claimedRotationSeeds,MID_A:input.claimedRotationSeeds.MID_B}})).toThrow("DISTINCT_EXTERNAL_SLOT_SEED");
  const changed=structuredClone(original);changed.candidatePairAirportSets[2].airports.MID_A.icao="KTEB";
  expect(()=>proposeP5OrdinaryHubRegionRotation({...input,ownerCorrectedReadback:changed})).toThrow();
 });
});
