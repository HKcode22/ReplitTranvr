import { describe,it,expect } from "vitest";
import { selectStage2Top5,type FrozenProbeArtifact,type Stage1ProbeEvidence } from "../server/lib/disruption/anchorPromotion_v39";

function cand(i:number){return{icao:i===0?"WSSS":i===1?"OMAA":`H${String(i).padStart(3,"0")}`,region:"R",tier:"HUB",preEligible:true,postEligible:true,trafficMetricValue:100-i,degree:50,effectiveCarriers:20,intlShare:.5,regionShare:.1};}
function artifact():FrozenProbeArtifact{return{version:"v1",shortlist:Array.from({length:12},(_,i)=>cand(i)),replacements:[{...cand(20),icao:"REP1"},{...cand(21),icao:"REP2"}],hubCutMetric:100,degreeCap:100,carriersCap:40};}
function ev(icao:string,score=1,lower=10,upper=10,status="completed"):Stage1ProbeEvidence{return{icao,status,rowsPerHour:100,uniqueFlightsPerCredit:score,tailChainLinksPerCredit:score,stability:score,confirmedUniqueLower:lower,confirmedPlusAmbiguousUpper:upper};}

describe("V3.9 Stage-2 promotion",()=>{
  it("returns exactly five by anchor score with lexical tie break",()=>{
    const a=artifact();const rows=a.shortlist.map((c,i)=>ev(c.icao,1,100-i,100-i));const r=selectStage2Top5(a,rows);
    expect(r.selected).toHaveLength(5);expect(r.replacementsNeeded).toBe(0);
    expect(r.ranked.slice(0,5).map(x=>x.icao)).toEqual(r.selected);
  });
  it("refuses when ambiguity-bound ordering differs",()=>{
    const a=artifact();const rows=a.shortlist.map((c,i)=>ev(c.icao,1,100-i,100-i));rows[2].confirmedPlusAmbiguousUpper=999;
    expect(()=>selectStage2Top5(a,rows)).toThrow(/INSUFFICIENT_IDENTITY_RESOLUTION/);
  });
  it("uses completed frozen replacements only after primary shortfall",()=>{
    const a=artifact();const rows=a.shortlist.slice(0,4).map((c,i)=>ev(c.icao,1,100-i,100-i));rows.push(ev("REP1",1,50,50));
    const r=selectStage2Top5(a,rows);expect(r.selected).toHaveLength(5);expect(r.selected).toContain("REP1");expect(r.replacementsNeeded).toBe(0);
  });
  it("names the next ordered replacement and refuses an under-five pool",()=>{
    const a=artifact();const rows=a.shortlist.slice(0,4).map((c,i)=>ev(c.icao,1,100-i,100-i));const r=selectStage2Top5(a,rows);
    expect(r.selected).toHaveLength(4);expect(r.replacementsNeeded).toBe(1);expect(r.nextReplacement).toBe("REP1");
  });
  it("capacity failure cannot be traded against score",()=>{
    const a=artifact();const rows=a.shortlist.slice(0,6).map((c,i)=>ev(c.icao,1,100-i,100-i));rows[2].rowsPerHour=59;
    const r=selectStage2Top5(a,rows);expect(r.selected).toHaveLength(5);expect(r.selected).not.toContain(rows[2].icao);
  });
});
