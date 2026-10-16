/**
 * OFFLINE MATHEMATICAL RESEARCH ONLY.
 * Never called by paid owner, window settlement, preflight, or scoring.
 * The 2026-09-22 one-credit/99% draft is SUPERSEDED by the later strict
 * f.8 Stage1 scientific acceptance policy. A numeric screen is NOT GO.
 * No provider, database, filesystem or network imports.
 */
export type BilledGapResearchInputV39=Readonly<{
  externalSettledCredits:number;
  internalReceivedCredits:number;
  receivedCostItemContradictions:number;
  durationCensored:boolean;
  settlementVerified:boolean;
}>;
export type BilledGapResearchDiagnosticV39=Readonly<{
  externalSettledCredits:number;
  internalReceivedCredits:number;
  gapCredits:number;
  billedCreditCaptureFraction:number|null;
  billedCreditGapFraction:number|null;
  exactAccountingEquality:boolean;
  historicSeptember22DraftOneCredit99PctNumericScreen:boolean;
  creditGapImpliesMissingUniqueFlightCount:false;
  sourceAttemptIdentityProven:false;
  originalPhysicalFlightMissingnessKnown:false;
  historicalReclassificationAuthorized:false;
  paidLaunchAuthorized:false;
  scientificMatchAuthorized:false;
  confirmatoryRankingAuthorized:false;
  interpretation:"EXACT_ARITHMETIC_ONLY"|"POSITIVE_BILLED_CREDIT_GAP"|"NEGATIVE_OR_CONTRADICTORY_ACCOUNTING"|"NO_BILLED_EXPOSURE";
}>;

export function researchOnlyBilledGapV39(
  input:BilledGapResearchInputV39
):BilledGapResearchDiagnosticV39{
  const {externalSettledCredits:e,internalReceivedCredits:i,
    receivedCostItemContradictions:c,durationCensored,settlementVerified}=input;
  if(![e,i,c].every(Number.isSafeInteger)||e<0||i<0||c<0||
     typeof durationCensored!=="boolean"||
     typeof settlementVerified!=="boolean")
    throw Error("OFFLINE_GAP_RESEARCH_INVALID_INPUT");
  const gap=e-i;
  const fraction=e>0?i/e:null;
  const gapFraction=e>0?gap/e:null;
  // Historical candidate threshold is only reproduced for comparison:
  // NOT an approved production/Stage1 error allowance.
  const numericScreen=settlementVerified&&!durationCensored&&c===0&&
    e>0&&gap>0&&gap<=1&&fraction!==null&&fraction>=0.99;
  return {
    externalSettledCredits:e,internalReceivedCredits:i,
    gapCredits:gap,billedCreditCaptureFraction:fraction,
    billedCreditGapFraction:gapFraction,
    exactAccountingEquality:gap===0&&c===0,
    historicSeptember22DraftOneCredit99PctNumericScreen:numericScreen,
    creditGapImpliesMissingUniqueFlightCount:false,
    sourceAttemptIdentityProven:false,
    originalPhysicalFlightMissingnessKnown:false,
    historicalReclassificationAuthorized:false,
    paidLaunchAuthorized:false,scientificMatchAuthorized:false,
    confirmatoryRankingAuthorized:false,
    interpretation:e===0&&i===0?"NO_BILLED_EXPOSURE":
      gap<0||c>0||(!settlementVerified)?"NEGATIVE_OR_CONTRADICTORY_ACCOUNTING":
      gap===0?"EXACT_ARITHMETIC_ONLY":"POSITIVE_BILLED_CREDIT_GAP"
  };
}
