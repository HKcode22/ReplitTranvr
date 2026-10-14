import {createHash} from "node:crypto";
import {describe,expect,it} from "vitest";
import {
  solveV39Calendar,
  solveV39ThreeAnchorExploratoryDraft,
  validateV39Calendar,
  type FrozenAirportSlotAssignment,
  type FrozenCalendarDesignInput,
} from "../server/lib/disruption/experimentCalendarSolver_v39";

function seededOrder<T>(xs:readonly T[],seed:string):T[]{
  return xs.map((value,i)=>({
    value,
    key:createHash("sha256").update(JSON.stringify(`${seed}|${i}|${JSON.stringify(value)}`)).digest("hex"),
  })).sort((a,b)=>a.key.localeCompare(b.key)).map(x=>x.value);
}
function fixture():FrozenCalendarDesignInput {
  const airports=["WSSS","OMAA","SKBO"].map(icao=>({icao,region:"FROZEN_TEST_ANCHOR_REGION"}));
  const pick=(draw:number):FrozenAirportSlotAssignment=>{
    const cycle=Math.floor(draw/airports.length);
    const inside=draw%airports.length;
    return seededOrder(airports,`anchor-seed|cycle-${cycle}`)[inside];
  };
  const pairAirportSets:FrozenCalendarDesignInput["pairAirportSets"]={};
  for(let p=1;p<=5;p++){
    pairAirportSets[`pair-${p}`]={
      HUB:pick(p-1),
      MID_A:{icao:`M${p}A`,region:"MID_A_REGION"},
      MID_B:{icao:`M${p}B`,region:"MID_B_REGION"},
      REGIONAL:{icao:`R${p}`,region:"REGIONAL_REGION"},
    };
  }
  const evaluationPartitionByRunDay:Record<string,string>={};
  const projectedAlertCreditsByRunDay:Record<string,number>={};
  for(let i=1;i<=31;i++){
    evaluationPartitionByRunDay[String(i)]=i<=20?"TRAIN":i<=25?"VALIDATION":"TEST";
    projectedAlertCreditsByRunDay[String(i)]=1500;
  }
  for(let p=1;p<=5;p++)evaluationPartitionByRunDay[String(p+6)]="TRAIN";
  return {
    startDate:"2026-10-26",
    seed:"calendar-seed",
    anchorSeed:"anchor-seed",
    anchorPool:airports,
    eligibleRegionsBySlot:{
      MID_A:["MID_A_REGION"],MID_B:["MID_B_REGION"],
      REGIONAL:["REGIONAL_REGION"],
    },
    pairAirportSets,
    evaluationPartitionByRunDay,
    projectedAlertCreditsByRunDay,
    projectedRestUnitsTotal:800,
    protectedRestBudget:1000,
  };
}
describe("PROPOSAL-ONLY V39 three verified anchors, five paired contrasts",()=>{
  it("original frozen production solver still rejects 3 anchors",()=>{
    expect(solveV39Calendar(fixture())).toMatchObject({
      status:"UNSAT",calendarHash:null,days:[],
    });
  });
  it("new explicitly named draft can construct 31 days without promoting original Gate2",()=>{
    const x=fixture(), r=solveV39ThreeAnchorExploratoryDraft(x);
    expect(r.reason, "three-anchor UNSAT diagnostic").toBeNull();
    expect(r).toMatchObject({
      status:"SAT",
      studyVersion:"V39_EXPLORATORY_THREE_ANCHOR_DRAFT_1",
      researchScope:"selected_airport_time_operational_frame_only",
      originalFiveAnchorGate2Passed:false,
      operationalPhase6StartAuthorized:false,
    });
    expect(r.days).toHaveLength(31);
    expect(validateV39Calendar(r.days,x)).toEqual([]);
    expect(r.days.filter(d=>d.windowShape==="4h")).toHaveLength(26);
    expect(r.days.filter(d=>d.windowShape==="2x2h")).toHaveLength(3);
    expect(r.days.filter(d=>d.windowShape==="up-to-6h")).toHaveLength(2);
    const hubs=r.days.filter(d=>d.crossoverPeriod===1)
      .map(d=>d.pairAirportSet!.HUB.icao);
    expect(new Set(hubs)).toEqual(new Set(["WSSS","OMAA","SKBO"]));
    expect(hubs).toHaveLength(5); // five paired experiments, NOT five independent hubs
    expect(r.calendarHash).toMatch(/^[a-f0-9]{64}$/);
    expect(r.calendarHash).not.toBe(createHash("sha256").update(JSON.stringify(r.days)).digest("hex"));
  });
  it("replays exact identical four-airport sets at matched time/weekday",()=>{
    const r=solveV39ThreeAnchorExploratoryDraft(fixture());
    expect(r.status).toBe("SAT");
    for(let p=1;p<=5;p++){
      const first=r.days[p-1],repeat=r.days[p+5];
      expect(repeat.utcSlot).toBe(first.utcSlot);
      expect(repeat.weekdayClass).toBe(first.weekdayClass);
      expect(repeat.pairAirportSet).toEqual(first.pairAirportSet);
      expect(repeat.drawType).toBe("PAIR_REPLAY");
      expect(repeat.pairRole).not.toBe(first.pairRole);
    }
    expect(solveV39ThreeAnchorExploratoryDraft(fixture()).calendarHash).toBe(r.calendarHash);
  });
  it("refuses other sites, under-covered pairs, and too few unique anchors",()=>{
    for(const anchors of [
      ["WSSS","OMAA"],["WSSS","OMAA","YSSY"],
      ["WSSS","OMAA","OMAA"],["WSSS","OMAA","SKBO","MMUN"],
    ]){
      const x=fixture();
      x.anchorPool=anchors.map(icao=>({icao,region:"FROZEN_TEST_ANCHOR_REGION"}));
      expect(solveV39ThreeAnchorExploratoryDraft(x).status).toBe("UNSAT");
    }
  });
  it("fails budget math for 31x1900 >57900 even though each day <=1900",()=>{
    const x=fixture();
    for(let i=1;i<=31;i++)x.projectedAlertCreditsByRunDay[String(i)]=1900;
    expect(solveV39ThreeAnchorExploratoryDraft(x)).toMatchObject({status:"UNSAT"});
    expect(solveV39ThreeAnchorExploratoryDraft(x).reason).toMatch(/57900/);
    // Keeping the historical original solver unchanged is independent of this
    // new explicit draft additional run-total cap check.
  });
  it("retains existing strict per-day ceiling, pair identity, REST and partition stops",()=>{
    const tests=[
      (x:FrozenCalendarDesignInput)=>{x.projectedAlertCreditsByRunDay["1"]=1901;},
      (x:FrozenCalendarDesignInput)=>{x.projectedRestUnitsTotal=1001;},
      (x:FrozenCalendarDesignInput)=>{x.pairAirportSets["pair-1"].HUB.icao="YSSY";},
      (x:FrozenCalendarDesignInput)=>{x.evaluationPartitionByRunDay["7"]="TEST";},
      (x:FrozenCalendarDesignInput)=>{x.eligibleRegionsBySlot.MID_B=[];},
    ];
    for(const mutate of tests){
      const x=fixture();mutate(x);
      const verdict=solveV39ThreeAnchorExploratoryDraft(x);
      expect(verdict.status).toBe("UNSAT");
      expect(verdict.operationalPhase6StartAuthorized).toBe(false);
    }
  });
});
