import {describe,it,expect} from "vitest";
import {planGate05ProspectiveGridV39}
 from "../server/lib/disruption/gate05ProspectiveAcquisitionGrid_v39";

const base={
 airportIcao:"WSSS",planningClockUtc:"2026-10-27T06:00:00Z",
 serviceWindowStartUtc:"2026-10-29T08:00:00Z",
 serviceWindowEndUtc:"2026-10-29T08:20:00Z",
 selectedNativeTMilestoneSourceVerified:true,
 horizonSet:["T-24h","T-6h","T-90m"] as const,
 populationAcquisitionGuardMinutes:3,
 populationRefreshCadenceMinutes:5,
 populationMaxStalenessMinutes:10,
 proposedMaximumFidsGets:12,
 assumedApiUnitsPerGet:2,
 proposedMaximumApiUnits:24
};
describe("Gate05 real prospective acquisition grid planner, zero provider access",()=>{
 it("plans all 3 T horizons and 12 individual request slots without retroactive backfill",()=>{
  const v=planGate05ProspectiveGridV39(base);
  expect(v.status).toBe("ELIGIBLE_FOR_OWNER_REVIEW");
  expect(v.expectedFidsGets).toBe(12);
  expect(v.expectedApiUnits).toBe(24);
  expect(v.providerCalls).toBe(0);
  expect(v.writes).toBe(0);
  expect(v.ownerPaidAuthorizationGranted).toBe(false);
  const p=v.grid.find(x=>x.horizon==="T-24h");
  expect(p?.targetCutoffGridUtc).toBe("2026-10-28T08:00:00.000Z");
  expect(p?.requestMustStartByUtc).toBe("2026-10-28T07:57:00.000Z");
  expect(p?.requestNotBeforeUtc).toBe("2026-10-28T07:52:00.000Z");
  expect(v.grid.filter(x=>x.horizon==="T-90m")).toHaveLength(4);
 });
 it("blocks a past target acquisition rather than fabricating an earlier as-of observation",()=>{
  const x=planGate05ProspectiveGridV39({...base,
    planningClockUtc:"2026-10-28T08:00:00Z"});
  expect(x.status).toBe("BLOCKED_GRID_HAS_ALREADY_STARTED");
  expect(x.grid).toHaveLength(12);
 });
 it("missing source semantics are a named blocker even with adequate budget",()=>{
  expect(planGate05ProspectiveGridV39({...base,
    selectedNativeTMilestoneSourceVerified:false}).status)
    .toBe("BLOCKED_UNVERIFIED_NATIVE_T");
 });
 it("blocks insufficient cost budget instead of quietly dropping required horizon points",()=>{
  expect(planGate05ProspectiveGridV39({...base,
    proposedMaximumApiUnits:22}).status).toBe("BLOCKED_BUDGET");
  expect(planGate05ProspectiveGridV39({...base,
    proposedMaximumFidsGets:10}).expectedFidsGets).toBe(12);
 });
 it("rejects impossible time, staleness and duplicate horizons",()=>{
  expect(()=>planGate05ProspectiveGridV39({...base,
    populationRefreshCadenceMinutes:11})).toThrow("GATE05_GRID_INVALID_FROZEN_INPUT");
  expect(()=>planGate05ProspectiveGridV39({...base,
    horizonSet:["T-24h","T-24h"]})).toThrow("GATE05_GRID_INVALID_FROZEN_INPUT");
  expect(()=>planGate05ProspectiveGridV39({...base,
    serviceWindowStartUtc:"2026-02-30T08:00:00Z"})).toThrow("GATE05_GRID_INVALID_UTC");
 });
});
