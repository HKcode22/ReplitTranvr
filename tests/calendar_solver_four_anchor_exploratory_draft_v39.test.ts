import {createHash} from "node:crypto";
import {describe,expect,it} from "vitest";
import {
  solveV39Calendar,solveV39FourAnchorExploratoryDraft,validateV39Calendar,
  type FrozenCalendarDesignInput,type FrozenAirportSlotAssignment,
} from "../server/lib/disruption/experimentCalendarSolver_v39";
function ordered<T>(xs:readonly T[],seed:string):T[]{
  return xs.map((value,i)=>({value,key:createHash("sha256")
    .update(`${seed}|${i}|${JSON.stringify(value)}`).digest("hex")}))
    .sort((a,b)=>a.key.localeCompare(b.key)).map(x=>x.value);
}
function fixture():FrozenCalendarDesignInput {
  const region:Record<string,string>={
    WSSS:"ASIA_PACIFIC",OMAA:"GULF_AFRICA",
    SKBO:"SOUTH_AMERICA",YSSY:"OCEANIA",
  };
  const airports=["WSSS","OMAA","SKBO","YSSY"].map(icao=>({icao,region:region[icao]}));
  const pick=(draw:number):FrozenAirportSlotAssignment=>{
    const cycle=Math.floor(draw/airports.length);
    return ordered(airports,`anchor-4-seed|cycle-${cycle}`)[draw%airports.length];
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
  const partition:Record<string,string>={},alerts:Record<string,number>={};
  for(let i=1;i<=31;i++){
    partition[String(i)]=i<=20?"TRAIN":i<=25?"VALIDATION":"TEST";
    alerts[String(i)]=1500; // 46500 < 57900, all <=1900.
  }
  for(let p=1;p<=5;p++)partition[String(p+6)]="TRAIN";
  return {
    startDate:"2026-10-26",seed:"four-calendar-seed",anchorSeed:"anchor-4-seed",
    anchorPool:airports,
    eligibleRegionsBySlot:{
      MID_A:["MID_A_REGION"],MID_B:["MID_B_REGION"],
      REGIONAL:["REGIONAL_REGION"],
    },
    pairAirportSets,evaluationPartitionByRunDay:partition,
    projectedAlertCreditsByRunDay:alerts,
    projectedRestUnitsTotal:800,protectedRestBudget:1000,
  };
}
describe("four-anchor prospective exploratory calendar, NEVER production AUTH",()=>{
  it("preserves original five-anchor solver's fail-closed boundary",()=>{
    expect(solveV39Calendar(fixture())).toMatchObject({status:"UNSAT",calendarHash:null,days:[]});
  });
  it("SATs 31 windows/5 matched crossover comparisons with 4 unique anchor ICAOs",()=>{
    const x=fixture(),r=solveV39FourAnchorExploratoryDraft(x);
    expect(r.reason, "four-anchor UNSAT diagnostic").toBeNull();
    expect(r).toMatchObject({
      status:"SAT",
      studyVersion:"V39_EXPLORATORY_FOUR_ANCHOR_DRAFT_1",
      researchScope:"four_anchor_stratified_operational_frame_only",
      historicalYssyCreditReconciliationPassed:false,
      historicalOriginalFiveAnchorGate2Passed:false,
      operationalPhase6StartAuthorized:false,
      anchorIcaos:["WSSS","OMAA","SKBO","YSSY"],
    });
    expect(r.days).toHaveLength(31);
    expect(validateV39Calendar(r.days,x)).toEqual([]);
    for(const [shape,n] of [["4h",26],["2x2h",3],["up-to-6h",2]] as const){
      expect(r.days.filter(d=>d.windowShape===shape)).toHaveLength(n);
    }
    const paired=r.days.filter(d=>d.crossoverPeriod===1);
    expect(paired).toHaveLength(5);
    // Four distinct anchors across five paired experiments: one will repeat
    // legitimately, not an invented fifth distinct site.
    expect(new Set(paired.map(d=>d.pairAirportSet!.HUB.icao))).toEqual(
      new Set(["WSSS","OMAA","SKBO","YSSY"]));
    expect(r.days.filter(d=>d.drawType==="NEW_TEMPLATE")).toHaveLength(26);
    expect(r.days.filter(d=>d.drawType==="PAIR_REPLAY")).toHaveLength(5);
    expect(r.calendarHash).toMatch(/^[a-f0-9]{64}$/);
    expect(r.calendarHash).not.toBe(createHash("sha256").update(JSON.stringify(r.days)).digest("hex"));
  });
  it("keeps one anchor HUB, two different MID, one REGIONAL and 5 exact paired replays",()=>{
    const r=solveV39FourAnchorExploratoryDraft(fixture());
    expect(r.status).toBe("SAT");
    for(let p=1;p<=5;p++){
      const first=r.days[p-1],repeat=r.days[p+5];
      expect(first.pairAirportSet).toBeTruthy();
      expect(new Set(Object.values(first.pairAirportSet!).map(x=>x.icao)).size).toBe(4);
      expect(repeat.utcSlot).toBe(first.utcSlot);
      expect(repeat.weekdayClass).toBe(first.weekdayClass);
      expect(repeat.pairAirportSet).toEqual(first.pairAirportSet);
      expect(repeat.slotRegions).toEqual(first.slotRegions);
      expect(repeat.drawType).toBe("PAIR_REPLAY");
      expect(repeat.pairRole).not.toBe(first.pairRole);
    }
  });
  it("respects four-unique cycle (new draws only), stable seeded replay",()=>{
    const r=solveV39FourAnchorExploratoryDraft(fixture());
    const fresh=r.days.filter(d=>d.drawType==="NEW_TEMPLATE");
    for(let i=0;i+4<=fresh.length;i+=4){
      expect(new Set(fresh.slice(i,i+4).map(d=>d.slotRegions.HUB)).size).toBe(4);
    }
    expect(solveV39FourAnchorExploratoryDraft(fixture()).calendarHash).toBe(r.calendarHash);
  });
  it("rejects removing YSSY, MMUN substitution and duplicates",()=>{
    for(const names of [
      ["WSSS","OMAA","SKBO"],
      ["WSSS","OMAA","SKBO","MMUN"],
      ["WSSS","OMAA","SKBO","SKBO"],
      ["WSSS","OMAA","SKBO","YSSY","MMUN"],
    ]){
      const x=fixture();x.anchorPool=names.map(icao=>({icao,region:"OTHER_MAPPED"}));
      const r=solveV39FourAnchorExploratoryDraft(x);
      expect(r.status).toBe("UNSAT");
      expect(r.operationalPhase6StartAuthorized).toBe(false);
    }
  });
  it("keeps run-total credit ceiling and per-day, REST, pairing constraints",()=>{
    const mutations=[
      (x:FrozenCalendarDesignInput)=>{for(let i=1;i<=31;i++)x.projectedAlertCreditsByRunDay[String(i)]=1900;},
      (x:FrozenCalendarDesignInput)=>{x.projectedAlertCreditsByRunDay["1"]=1901;},
      (x:FrozenCalendarDesignInput)=>{x.projectedRestUnitsTotal=1001;},
      (x:FrozenCalendarDesignInput)=>{x.evaluationPartitionByRunDay["7"]="TEST";},
      (x:FrozenCalendarDesignInput)=>{x.pairAirportSets["pair-1"].HUB.icao="MMUN";},
      (x:FrozenCalendarDesignInput)=>{x.eligibleRegionsBySlot.MID_A=[];},
    ];
    for(const change of mutations){
      const x=fixture();change(x);
      expect(solveV39FourAnchorExploratoryDraft(x).status).toBe("UNSAT");
    }
  });
});
