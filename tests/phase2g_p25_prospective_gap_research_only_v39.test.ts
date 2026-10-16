import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {researchOnlyBilledGapV39} from "../data-collection/analysis/prospective_billed_gap_research_only_v39";

const base={receivedCostItemContradictions:0,durationCensored:false,settlementVerified:true};
describe("P25 prospective mathematical gap audit — NOT scientific acceptance",()=>{
  it("P2G22 YSSY 260/259 is a 0.3846% billed-credit gap, not proof only one unique flight missed",()=>{
    const x=researchOnlyBilledGapV39({...base,externalSettledCredits:260,internalReceivedCredits:259});
    expect(x.gapCredits).toBe(1);
    expect(x.billedCreditCaptureFraction).toBeCloseTo(259/260,12);
    expect(x.billedCreditGapFraction).toBeCloseTo(1/260,12);
    expect(x.historicSeptember22DraftOneCredit99PctNumericScreen).toBe(true);
    expect(x.interpretation).toBe("POSITIVE_BILLED_CREDIT_GAP");
    expect(x.creditGapImpliesMissingUniqueFlightCount).toBe(false);
    expect(x.originalPhysicalFlightMissingnessKnown).toBe(false);
    expect(x.historicalReclassificationAuthorized).toBe(false);
    expect(x.scientificMatchAuthorized).toBe(false);
    expect(x.confirmatoryRankingAuthorized).toBe(false);
    expect(x.paidLaunchAuthorized).toBe(false);
  });
  it("P2G06 WSSS 220/219 also screens numerically but cannot reverse its historical FAIL",()=>{
    const x=researchOnlyBilledGapV39({...base,externalSettledCredits:220,internalReceivedCredits:219});
    expect(x.gapCredits).toBe(1);
    expect(x.historicSeptember22DraftOneCredit99PctNumericScreen).toBe(true);
    expect(x.historicalReclassificationAuthorized).toBe(false);
    expect(x.scientificMatchAuthorized).toBe(false);
  });
  it("MMUN 65/60 (7.69% credit discrepancy) fails even superseded one-credit screen",()=>{
    const x=researchOnlyBilledGapV39({...base,externalSettledCredits:65,internalReceivedCredits:60});
    expect(x.gapCredits).toBe(5);
    expect(x.billedCreditGapFraction).toBeCloseTo(5/65,12);
    expect(x.historicSeptember22DraftOneCredit99PctNumericScreen).toBe(false);
    expect(x.scientificMatchAuthorized).toBe(false);
  });
  it("clean 100/100 arithmetic is never itself an end-to-end science PASS",()=>{
    const x=researchOnlyBilledGapV39({...base,externalSettledCredits:100,internalReceivedCredits:100});
    expect(x.exactAccountingEquality).toBe(true);
    expect(x.historicSeptember22DraftOneCredit99PctNumericScreen).toBe(false);
    expect(x.scientificMatchAuthorized).toBe(false);
    expect(x.paidLaunchAuthorized).toBe(false);
  });
  it("duration-censored, unstable settle and cost-item contradictory attempts never pass numeric screen",()=>{
    for(const changed of [
      {durationCensored:true},{settlementVerified:false},
      {receivedCostItemContradictions:1}
    ]){
      const x=researchOnlyBilledGapV39({...base,...changed,externalSettledCredits:260,internalReceivedCredits:259});
      expect(x.historicSeptember22DraftOneCredit99PctNumericScreen).toBe(false);
      expect(x.scientificMatchAuthorized).toBe(false);
    }
  });
  it("impossible signed balance negatives, nonintegers, negative counts and invalid boolean refuse",()=>{
    for(const [externalSettledCredits,internalReceivedCredits,receivedCostItemContradictions] of [
      [-1,2,0],[260,261,-1],[2.5,2,0],[NaN,0,0],[Infinity,0,0]
    ]){
      expect(()=>researchOnlyBilledGapV39({
        ...base,externalSettledCredits,internalReceivedCredits,receivedCostItemContradictions
      })).toThrow("OFFLINE_GAP_RESEARCH_INVALID_INPUT");
    }
  });
  it("paid production never imports exploratory calculation or changes exact accepted completeness",()=>{
    const production=readFileSync("server/lib/disruption/prepaidProbeWindow_v39.ts","utf8");
    const safety=readFileSync("scripts/v39_phase2g_stage1_paid_preflight_v39.ts","utf8");
    expect(production).toContain("PROBE_DELIVERY_COMPLETENESS_FLOOR_V39 = 1");
    expect(production).toContain('if (floor !== 1) throw new Error("PROBE_NONZERO_RECONCILIATION_TOLERANCE_NOT_AUTHORIZED")');
    expect(production).not.toContain("researchOnlyBilledGapV39");
    expect(safety).not.toContain("researchOnlyBilledGapV39");
  });
});
