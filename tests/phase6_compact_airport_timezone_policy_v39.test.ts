import {describe,it,expect} from "vitest";
import {resolveP6DailyAirportTimezoneCatalog as resolve} from "../server/lib/disruption/phase6DelegatedDailySourceReviewProducer_v39";
const hubs=[{icao:"WSSS",ianaTimezone:"Asia/Singapore"},{icao:"OMAA",ianaTimezone:"Asia/Dubai"},{icao:"YSSY",ianaTimezone:"Australia/Sydney"},{icao:"SKBO",ianaTimezone:"America/Bogota"}];
describe("reviewed compact airport timezone mapping",()=>{
 it("preserves the exact legacy mapping",()=>{
  const groups=hubs.map(f=>({ianaTimezone:f.ianaTimezone,icaos:[f.icao]}));
  expect([...resolve({airportTimezoneGroups:groups})]).toEqual([...resolve({airportFrames:hubs})]);
 });
 it("fits a synthetic full-size catalog within the existing policy byte limit",()=>{
  const icaos=Array.from({length:1018},(_,i)=>"Z"+String.fromCharCode(65+Math.floor(i/676),65+Math.floor(i/26)%26,65+i%26));
  const compact={airportTimezoneGroups:[{ianaTimezone:"UTC",icaos}]};
  const legacy={airportFrames:icaos.map(icao=>({icao,ianaTimezone:"UTC"}))};
  expect(resolve(compact).size).toBe(1018);
  expect([...resolve(compact)]).toEqual([...resolve(legacy)]);
  expect(Buffer.byteLength(JSON.stringify(compact))).toBeLessThan(8000);
  expect(Buffer.byteLength(JSON.stringify(legacy))).toBeGreaterThan(35000);
 });
 it("rejects dual, absent, duplicate and invalid timezone catalogs",()=>{
  const g={ianaTimezone:"UTC",icaos:["AAAA","BBBB","CCCC","DDDD"]};
  expect(()=>resolve({})).toThrow();
  expect(()=>resolve({airportFrames:hubs,airportTimezoneGroups:[g]})).toThrow();
  expect(()=>resolve({airportTimezoneGroups:[g,{ianaTimezone:"Asia/Dubai",icaos:["AAAA"]}]})).toThrow();
  expect(()=>resolve({airportTimezoneGroups:[{...g,ianaTimezone:"not/a-zone"}]})).toThrow();
  expect(()=>resolve({airportTimezoneGroups:[g,{ianaTimezone:"UTC",icaos:["EEEE"]}]})).toThrow();
 });
});
