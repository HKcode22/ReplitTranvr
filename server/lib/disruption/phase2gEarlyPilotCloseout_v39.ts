/** Pure offline Phase2G early-pilot closeout evaluator, not a paid or official Gate2 owner. */
export type PilotProbeV39=Readonly<{
  icao:"WSSS"|"OMAA"|"MMUN"|"SKBO"|"YSSY";probeId:number;
  metricContract:string;status:string;reconciliation:string;
  durationCensored:boolean;observedSeconds:number;
  officialRowsPerHour:number|null;deliveryGapCredits:number;
  verifiedSavedOriginals:boolean|null;
  researchTier:"A_VERIFIED_PRIMARY"|"B_DEGRADED_OBSERVED_ONLY";
}>;
export type PilotCloseoutV39=Readonly<{
  schema:"v39.phase2g.early-pilot-closeout.v1";
  fieldwork:"COMPLETE"|"INCOMPLETE";researchInventory:"INCLUDED_WITH_EXCEPTIONS"|"HOLD";
  formalGate2:"HOLD_UNSATISFIED_VALIDITY_AND_FINAL_POOL";
  formallyCapacityEligible:string[];fullDuration:string[];
  researchQualified:string[];noneligible:string[];blockers:string[];
  conditionalStage2Trigger:boolean;automaticStage2Authorized:false;
  gate3PaidAuthorized:false;phase3OfflinePreparationAllowed:true;
  historicalProbeStatusesModified:false;finalAnchorPoolConfirmed:false;
}>;
const ids={WSSS:11,OMAA:12,MMUN:14,SKBO:15,YSSY:19} as const;
const sites=Object.keys(ids) as Array<keyof typeof ids>;
export function evaluatePhase2gEarlyPilotCloseoutV39(
  probes:readonly PilotProbeV39[],
  operational:Readonly<{
    activeBillableSubscriptions:number;
    incident31Resolved:boolean;
    rawSourceDispositionCompleted:boolean;
  }>,
):PilotCloseoutV39 {
  const blockers:string[]=[];const seen=new Set<string>();
  for(const p of probes){
    if(seen.has(p.icao)||p.probeId!==ids[p.icao])
      blockers.push("DUPLICATE_OR_WRONG_PROBE_ID");
    seen.add(p.icao);
    if(p.metricContract!=="v39-physical-flight-instance-v2")
      blockers.push("WRONG_IDENTITY_METRIC_CONTRACT");
    if(!Number.isFinite(p.observedSeconds)||p.observedSeconds<0||
       (p.officialRowsPerHour!==null &&
        (!Number.isFinite(p.officialRowsPerHour)||p.officialRowsPerHour<0))||
       !Number.isSafeInteger(p.deliveryGapCredits)||p.deliveryGapCredits<0)
      blockers.push("INVALID_PROBE_NUMERIC_EVIDENCE");
  }
  if(probes.length!==5||sites.some(x=>!seen.has(x)))
    blockers.push("MISSING_EARLY_PILOT_EVIDENCE");
  if(!Number.isSafeInteger(operational.activeBillableSubscriptions)||
     operational.activeBillableSubscriptions!==0)
    blockers.push("ACTIVE_OR_UNVERIFIED_PAID_EXPOSURE");
  if(!operational.incident31Resolved) blockers.push("INCIDENT31_UNRESOLVED");
  if(!operational.rawSourceDispositionCompleted) blockers.push("RAW_RETENTION_PENDING");

  const full=probes.filter(p=>!p.durationCensored&&p.observedSeconds>=7200).map(p=>p.icao);
  const formallyEligible=probes.filter(p=>
    !p.durationCensored&&p.observedSeconds>=7200&&
    p.metricContract==="v39-physical-flight-instance-v2"&&
    p.status==="completed"&&p.reconciliation==="MATCH"&&
    p.deliveryGapCredits===0&&p.officialRowsPerHour!==null&&
    p.officialRowsPerHour>=60).map(p=>p.icao);
  const researchQualified=probes.filter(p=>
    p.researchTier==="B_DEGRADED_OBSERVED_ONLY"&&
    p.verifiedSavedOriginals===true&&!p.durationCensored&&
    p.observedSeconds>=7200).map(p=>p.icao);
  const fieldworkDone=full.length===5 &&
    !blockers.includes("DUPLICATE_OR_WRONG_PROBE_ID")&&
    !blockers.includes("MISSING_EARLY_PILOT_EVIDENCE")&&
    !blockers.includes("WRONG_IDENTITY_METRIC_CONTRACT")&&
    !blockers.includes("INVALID_PROBE_NUMERIC_EVIDENCE");
  return {
    schema:"v39.phase2g.early-pilot-closeout.v1",
    fieldwork:fieldworkDone?"COMPLETE":"INCOMPLETE",
    researchInventory:fieldworkDone&&operational.activeBillableSubscriptions===0?
      "INCLUDED_WITH_EXCEPTIONS":"HOLD",
    formalGate2:"HOLD_UNSATISFIED_VALIDITY_AND_FINAL_POOL",
    formallyCapacityEligible:formallyEligible,
    fullDuration:full,
    researchQualified,
    noneligible:full.filter(x=>!formallyEligible.includes(x)),
    blockers:[...new Set(blockers)],
    conditionalStage2Trigger:formallyEligible.length<5,
    automaticStage2Authorized:false,gate3PaidAuthorized:false,
    phase3OfflinePreparationAllowed:true,historicalProbeStatusesModified:false,
    finalAnchorPoolConfirmed:false,
  };
}
