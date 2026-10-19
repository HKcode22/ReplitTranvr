import {describe,it,expect} from "vitest";
import {inventoryGate05OfflineItems} from "../server/lib/disruption/gate05OfflineInventory_v39";
import {previewGate05FidsFeasibilityV39} from "../server/lib/disruption/gate05FidsFeasibility_v39";
import {FIDS_REST_UNITS_PER_ATTEMPT} from "../server/lib/disruption/aerodataboxLimiter_v3";

function item(dep:string,arr:string,revised?:string,runway?:string){
  return {
    number:"SQ123",airline:{iata:"SQ"},status:2,
    departure:{airport:{icao:dep},scheduledTime:{utc:"2026-10-19T04:00:00Z"},
      ...(revised?{revisedTime:{utc:revised}}:{}),
      ...(runway?{runwayTime:{utc:runway}}:{})},
    arrival:{airport:{icao:arr},scheduledTime:{utc:"2026-10-19T06:00:00Z"}}
  };
}
describe("Gate0.5 candidate time evidence is never an actual certified target",()=>{
  it("separates WSSS outbound scheduled/revised pairs from inbound pairs",()=>{
    const r=inventoryGate05OfflineItems({airportIcao:"WSSS",items:[
      item("WSSS","OMAA","2026-10-19T04:03:00Z","2026-10-19T04:05:00Z"),
      item("EGLL","WSSS","2026-10-19T04:04:00Z","2026-10-19T04:06:00Z"),
      item("WSSS","OMAA","2026-10-19T04:03:00Z")
    ]});
    expect(r.roles.departure.scheduledRevisedPairs).toBe(2);
    expect(r.roles.departure.scheduledRunwayPairs).toBe(1);
    expect(r.roles.arrival.scheduledRevisedPairs).toBe(1);
    expect(r.roles.arrival.scheduledRunwayPairs).toBe(1);
    expect(r.selectedTMilestone).toBeNull();
    expect(r.selectedPrimaryTarget).toBeNull();
    expect(r.departureActualMovementLabel).toBeNull();
    expect(r.gate05PilotCertified).toBe(false);
  });
  it("refuses malformed UTC and never promotes a lone revised timestamp",()=>{
    const r=inventoryGate05OfflineItems({airportIcao:"WSSS",items:[
      item("WSSS","OMAA","tomorrow","2026-10-19T04:05:00Z"),
      item("WSSS","OMAA","2026-10-19T04:06:00Z","tomorrow")
    ]});
    expect(r.roles.departure.scheduledRevisedPairs).toBe(1);
    expect(r.roles.departure.scheduledRunwayPairs).toBe(1);
    expect(r.selectedPrimaryTarget).toBeNull();
  });
});
describe("Gate0.5 FIDS feasibility preview cannot issue provider calls",()=>{
  it("proposes two explicit departure queries; reserves 2 units x 3 attempts each",()=>{
    const plan=previewGate05FidsFeasibilityV39();
    expect(FIDS_REST_UNITS_PER_ATTEMPT).toBe(2);
    expect(plan.scenarios).toHaveLength(2);
    expect(plan.scenarios.map(s=>s.withLocation)).toEqual([false,true]);
    expect(plan.scenarios.every(s=>s.direction==="Departure"&&s.withLeg===true)).toBe(true);
    expect(plan.maxReservedApiUnits).toBe(12);
    expect(plan.providerApiCalls).toBe(0);
    expect(plan.canAuthorizePilot).toBe(false);
    expect(plan.currentFidsClientSupportsWithLocationTrue).toBe(false);
    expect(plan.tariffIndependentlyConfirmed).toBe(false);
  });
});
