import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
 GATE05_ADSB_LOL_SOURCE_V39,
 normalizeGate05AdsbLolOfflineV39,
 gate05AdsbAsOfEligibleV39,
 gate05AdsbAggregateOnlyV39
} from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39";

const rec="2026-10-29T07:00:00.000Z";
const now=Date.parse(rec);
const center={lat:1.35921,lon:103.989325};
const record=(other:Record<string,unknown>={})=>({
 hex:"abc123",flight:"SIA123  ",lat:1.36,lon:103.99,
 type:"adsb_icao",seen_pos:3.5,alt_baro:31000,gs:410,...other
});

describe("Gate05 zero-cost ADS-B source agreement offline only",()=>{
 it("validates provider clock, freshness, geometry and stores availability separately from position",()=>{
  const out=normalizeGate05AdsbLolOfflineV39({now,ac:[record()]},rec);
  expect(out.originalRows).toBe(1);
  expect(out.recentValidPoints).toBe(1);
  expect(out.httpGetCalls).toBe(0);
  expect(out.databaseWrites).toBe(0);
  const p=out.points[0];
  expect(p.callsign).toBe("SIA123");
  expect(p.icao24Hex).toBe("abc123");
  expect(p.receivedAtUtc).toBe(rec);
  expect(p.approximatePositionUtc).toBe("2026-10-29T06:59:56.500Z");
  expect(p.timing).toBe("PROVIDER_NOW_MINUS_SEEN_POS_APPROXIMATE");
  expect(p.originalAeroDataBoxFlightMatched).toBe(false);
  expect(p.runwayEventActualVerified).toBe(false);
  expect(gate05AdsbAsOfEligibleV39(p,"2026-10-29T06:59:59.000Z")).toBe(false);
  expect(gate05AdsbAsOfEligibleV39(p,"2026-10-29T07:00:00.000Z")).toBe(true);
  expect(out.distinctPhysicalOperatingFlightsCertified).toBe(false);
  expect(out.actualWheelsOffLabelCertified).toBe(false);
 });
 it("reports stale, absent coordinates, transient hex and invalid JSON separately",()=>{
  const x=normalizeGate05AdsbLolOfflineV39({now,ac:[
    record({seen_pos:31}),
    record({lat:null}),
    record({hex:"~aaaaaa"}),
    null,
    record({hex:"abc124",alt_baro:"ground",seen_pos:1})
  ]},rec);
  expect(x.recentValidPoints).toBe(1);
  expect(x.stalePositionCount).toBe(1);
  expect(x.missingPositionCount).toBe(1);
  expect(x.invalidOrPrivateHexCount).toBe(1);
  expect(x.invalidRows).toBe(1);
  expect(x.points[0].groundState).toBe("GROUND_REPORTED");
  expect(x.points[0].runwayEventActualVerified).toBe(false);
 });
 it("rejects impossible provider clocks, invalid radius, and fabricated source shape",()=>{
  expect(()=>normalizeGate05AdsbLolOfflineV39({now:Math.floor(now/1000),ac:[]},rec))
    .toThrow("GATE05_ADSB_SERVER_CLOCK_SKEW");
  expect(()=>normalizeGate05AdsbLolOfflineV39({now,ac:[]},rec,{radiusNm:300}))
    .toThrow("GATE05_ADSB_SOURCE_BOUND_INVALID");
  expect(()=>normalizeGate05AdsbLolOfflineV39({now,aircraft:[]},rec))
    .toThrow("GATE05_ADSB_UNEXPECTED_SOURCE_SHAPE");
 });
 it("prints safe aggregate without coordinates, ids, callsigns or a source target claim",()=>{
  const out=normalizeGate05AdsbLolOfflineV39({now,ac:[record()]},rec);
  const aggregate=JSON.stringify(gate05AdsbAggregateOnlyV39(out));
  expect(aggregate).toContain("recentValidPoints");
  expect(aggregate).not.toContain("abc123");
  expect(aggregate).not.toContain("SIA123");
  expect(aggregate).not.toContain("1.36");
  expect(aggregate).toContain("productionUseBlockedWithoutOperatorCoordination");
  expect(aggregate).toContain('"paidProviderCalls":0');
 });
 it("is never a live collector, never a scheduled provider request or a hidden paid fallback",()=>{
  const src=readFileSync("server/lib/disruption/gate05ZeroCostAdsbEvidence_v39.ts","utf8");
  expect(GATE05_ADSB_LOL_SOURCE_V39.productionAccessApproved).toBe(false);
  expect(src).not.toContain("fetch(");
  expect(src).not.toContain("axios");
  expect(src).not.toContain("pg.Client");
  expect(src).not.toContain("process.env.");
  expect(src).not.toContain("setInterval");
  expect(src).not.toContain("AERODATABOX_API_KEY");
  expect(src).not.toContain("CREATE SUBSCRIPTION");
  expect(src).not.toContain("INSERT INTO");
 });
});