/**
 * Gate 0.5 dry-run only. Does not import provider networking or execute REST.
 * This plan is NOT an AUTH, provider tariff quote, or FIDS sample evidence.
 */
export interface Gate05FidsScenarioV39 {
  direction:"Departure";
  withLeg:true;
  withLocation:boolean;
  maxPhysicalAttemptsPerQuery:3;
  reservedApiUnitsPerAttempt:2;
  theoreticalMaxUnits:6;
}
export function previewGate05FidsFeasibilityV39() {
  const scenarios:Gate05FidsScenarioV39[]=[
    {direction:"Departure",withLeg:true,withLocation:false,maxPhysicalAttemptsPerQuery:3,
      reservedApiUnitsPerAttempt:2,theoreticalMaxUnits:6},
    {direction:"Departure",withLeg:true,withLocation:true,maxPhysicalAttemptsPerQuery:3,
      reservedApiUnitsPerAttempt:2,theoreticalMaxUnits:6},
  ];
  return {
    schema:"v39.gate05.fids-dry-run-preview.v1" as const,
    status:"UNAUTHORIZED_NO_IO_PLAN_ONLY" as const,
    scenarios,
    maxReservedApiUnits:scenarios.reduce((n,s)=>n+s.theoreticalMaxUnits,0),
    theoreticalRequests:scenarios.length,
    providerApiCalls:0 as const,
    // The reviewed current FIDS wrapper hardcodes withLocation=false.
    currentFidsClientSupportsWithLocationTrue:false as const,
    tariffIndependentlyConfirmed:false as const,
    sourcePositionCoverageVerified:false as const,
    canonicalDepartureLabelVerified:false as const,
    canAuthorizePilot:false as const,
    note:"Preflight estimate from existing code: 2 units per attempt, 3 attempts per query; actual provider billing/availability and licensing require separate verification." as const
  };
}
