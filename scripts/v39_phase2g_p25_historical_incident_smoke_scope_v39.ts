/**
 * Read-only decision for a ZERO-PROVIDER, isolated disposable POST smoke.
 * Never permits a paid launch, clears any incident, or claims historic
 * provider deletion, runtime cleanup or scientific reconciliation.
 *
 * Only a very specific retained historical YSSY incident #30 may coexist
 * with the isolated smoke. The paid owner/preflight deliberately continues
 * to reject ANY open incident.
 */
export type Incident30SmokeWitnessV39=Readonly<{
  incidents:readonly {id:number;cause:string;resolved:boolean;kind:string|null;reason:string|null;
    providerDeleteVerified:string|null;runtimeCleanupVerified:string|null;}[];
  historicalProbe:Readonly<{probeId:number;icao:string;status:string;
    durationCensored:boolean;reconciliationStatus:string;stopReason:string;
    exactSessionBound:boolean;runtimeCleanupVerifiedAtUtc:string|null;}>;
  originalRefs:number;untombstonedOriginalRefs:number;
  historicalRuntimeRows:number;historicalCleanupJournalRows:number;
  currentActiveOrSettlingProbes:number;
}>;
export type Incident30SmokeDecisionV39=Readonly<{
  allowed:boolean;historicalIncident30Preserved:boolean;
  paidLaunchAuthorized:false;incidentClosureAuthorized:false;
  originalDeletionAuthorized:false;historicalSciencePromotionAuthorized:false;
  reason:string;
}>;
export function assessIncident30ZeroProviderSmokeV39(
  w:Incident30SmokeWitnessV39
):Incident30SmokeDecisionV39{
  const refuse=(reason:string):Incident30SmokeDecisionV39=>({
    allowed:false,historicalIncident30Preserved:false,
    paidLaunchAuthorized:false,incidentClosureAuthorized:false,
    originalDeletionAuthorized:false,historicalSciencePromotionAuthorized:false,
    reason
  });
  if(w.currentActiveOrSettlingProbes!==0)
    return refuse("ACTIVE_OR_SETTLING_PROBE");
  if(w.incidents.length===0)return {
    allowed:true,historicalIncident30Preserved:false,
    paidLaunchAuthorized:false,incidentClosureAuthorized:false,
    originalDeletionAuthorized:false,historicalSciencePromotionAuthorized:false,
    reason:"NO_OPEN_INCIDENTS_DISPOSABLE_SMOKE_ONLY"
  };
  if(w.incidents.length!==1)return refuse("UNRELATED_OR_MULTIPLE_OPEN_INCIDENTS");
  const i=w.incidents[0],p=w.historicalProbe;
  if(i.id!==30||i.cause!=="reconciliation"||i.resolved!==false||
    i.kind!=="stage1_supervisor_recovery"||
    i.reason!=="supervisor_child_exit_recovered"||
    i.providerDeleteVerified!=="true"||i.runtimeCleanupVerified!=="false")
    return refuse("INCIDENT30_IDENTITY_OR_HISTORICAL_CLAIMS_CHANGED");
  if(p.probeId!==18||p.icao!=="YSSY"||p.status!=="failed"||
    p.durationCensored!==true||p.reconciliationStatus!=="UNRESOLVED"||
    p.stopReason!=="supervisor_child_exit_recovered"||
    p.exactSessionBound!==true||p.runtimeCleanupVerifiedAtUtc!==null)
    return refuse("PROBE18_IMMUTABLE_FAILURE_NOT_CONFIRMED");
  if(w.originalRefs!==30||w.untombstonedOriginalRefs!==30)
    return refuse("RETAINED_ORIGINAL_30_REFERENCES_NOT_EXACT");
  if(w.historicalRuntimeRows!==0||w.historicalCleanupJournalRows!==0)
    return refuse("HISTORICAL_CLEANUP_STATE_CHANGED_REQUIRE_ADJUDICATION");
  return {
    allowed:true,historicalIncident30Preserved:true,
    paidLaunchAuthorized:false,incidentClosureAuthorized:false,
    originalDeletionAuthorized:false,historicalSciencePromotionAuthorized:false,
    reason:"EXACT_UNRESOLVED_HISTORICAL_INCIDENT30_ISOLATED_SMOKE_ONLY"
  };
}
