import { describe,it,expect } from "vitest";
import { solveV39Calendar,validateV39Calendar,type FrozenCalendarDesignInput } from "../server/lib/disruption/experimentCalendarSolver_v39";
function input():FrozenCalendarDesignInput{
  const sets:Record<string,string[]>={},parts:Record<string,string>={},alerts:Record<string,number>={};
  for(let i=1;i<=31;i++){sets[String(i)]=[`A${i}`,`B${i}`,`C${i}`,`D${i}`];parts[String(i)]="eval-A";alerts[String(i)]=1500;}
  for(let p=1;p<=5;p++)sets[String(p+6)]=[...sets[String(p)]];
  return{startDate:"2026-10-05",seed:"calendar-seed",airportSetsByRunDay:sets,evaluationPartitionByRunDay:parts,projectedAlertCreditsByRunDay:alerts,projectedRestUnitsTotal:800,protectedRestBudget:1000};
}
describe("strict V3.9 calendar solver",()=>{
  it("generates exact 26/3/2 with five matched pairs and six-slot blocks",()=>{const r=solveV39Calendar(input());expect(r.status).toBe("SAT");expect(r.days).toHaveLength(31);expect(r.days.filter(d=>d.windowShape==="4h")).toHaveLength(26);expect(r.days.filter(d=>d.windowShape==="2x2h")).toHaveLength(3);expect(r.days.filter(d=>d.windowShape==="up-to-6h")).toHaveLength(2);expect(validateV39Calendar(r.days,input())).toEqual([]);});
  it("is deterministic for one seed and seed actually changes pair treatment order",()=>{const a=input(),b=input();b.seed="different-seed";const r1=solveV39Calendar(a),r2=solveV39Calendar(a),r3=solveV39Calendar(b);expect(r1.days.map(d=>d.windowShape)).toEqual(r2.days.map(d=>d.windowShape));expect(r1.days.slice(0,11).map(d=>d.windowShape)).not.toEqual(r3.days.slice(0,11).map(d=>d.windowShape));});
  it("refuses airport-set replay mismatch",()=>{const x=input();x.airportSetsByRunDay["7"]=["X","Y","Z","Q"];expect(solveV39Calendar(x).status).toBe("UNSAT");});
  it("refuses evaluation-partition mismatch",()=>{const x=input();x.evaluationPartitionByRunDay["7"]="other";expect(solveV39Calendar(x).status).toBe("UNSAT");});
  it("refuses Alert or REST infeasibility",()=>{const a=input();a.projectedAlertCreditsByRunDay["4"]=1901;expect(solveV39Calendar(a).status).toBe("UNSAT");const b=input();b.projectedRestUnitsTotal=1001;expect(solveV39Calendar(b).status).toBe("UNSAT");});
  it("refuses missing frozen four-airport set",()=>{const x=input();delete x.airportSetsByRunDay["5"];expect(solveV39Calendar(x).status).toBe("UNSAT");});
  it("validator catches washout/time-class/replay tampering",()=>{const x=input(),r=solveV39Calendar(x);expect(r.status).toBe("SAT");const days=structuredClone(r.days);days[6].timeClass="20:00";days[6].airportSet=["X","Y","Z","Q"];expect(validateV39Calendar(days,x).join(" ")).toMatch(/time class mismatch|airport replay mismatch/);});
});
