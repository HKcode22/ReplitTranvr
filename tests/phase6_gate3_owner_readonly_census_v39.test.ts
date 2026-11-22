import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {projectG3ReadOnlyCounts} from "../scripts/v39_phase6_gate3_owner_readonly_live_census_v39.mjs";
const at=new Date("2026-11-22T09:45:00.000Z");
describe("Gate3 owner-only live read-only no-provider private census",()=>{
 it("aggregates bounded metadata, never source values, flight identities or raw packets",()=>{
  expect(projectG3ReadOnlyCounts([
   {kind:"SOURCE_QUERY_PACKET",count:6,due:1,within_one_hour:2,earliest_deadline:new Date("2026-11-22T09:30:00.000Z")},
   {kind:"PHASE7_SIGNED_REVIEW",count:3,due:0,within_one_hour:1,earliest_deadline:new Date("2026-11-22T10:20:00.000Z")}
  ],at)).toEqual({privatePacketRows:9,duePackets:1,nearDeadlinePackets:3,groups:[
   {kind:"SOURCE_QUERY_PACKET",count:6,due:1,withinOneHour:2,earliestSignedDeadlineUtc:"2026-11-22T09:30:00.000Z"},
   {kind:"PHASE7_SIGNED_REVIEW",count:3,due:0,withinOneHour:1,earliestSignedDeadlineUtc:"2026-11-22T10:20:00.000Z"}
  ]});
 });
 it("cannot accept unknown or forged census groups or overflow",()=>{
  const good={kind:"SOURCE_QUERY_PACKET",count:2,due:1,within_one_hour:1,earliest_deadline:null};
  for(const bad of [
   {kind:"SOURCE QUERY",count:2,due:1,within_one_hour:1,earliest_deadline:null},
   {...good,due:3},{...good,within_one_hour:2},{...good,count:0},
   {...good,earliest_deadline:"invalid"},{...good,count:3.5}
  ])expect(()=>projectG3ReadOnlyCounts([bad],at)).toThrow();
  expect(()=>projectG3ReadOnlyCounts([good,good],at)).toThrow();
  expect(()=>projectG3ReadOnlyCounts(Array.from({length:25},(_,i)=>({...good,kind:"K"+String(i).padStart(2,"0")})),at)).toThrow();
 });
 it("production census source contains no data modifications or provider client",()=>{
  const raw=readFileSync("scripts/v39_phase6_gate3_owner_readonly_live_census_v39.mjs","utf8");
  expect(raw).toContain("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  expect(raw).toContain("ROLLBACK");
  expect(raw).not.toMatch(/\b(?:INSERT INTO|UPDATE clean[.]|DELETE FROM|TRUNCATE TABLE|CREATE TABLE|DROP TABLE)\b/);
  expect(raw).not.toMatch(/fetch\s*\(|axios\s*\(|AERODATABOX_API_KEY/);
 });
});
