/**
 * Phase4/Gate5 f.8 §§5–7: pure, NO-IO adjunct admission of ADSB.lol candidate
 * aircraft positions alongside AeroDataBox's independently established FIDS
 * population. This does NOT match a physical flight by itself.
 *
 * A scheduled FIDS departure, a tracked aircraft, an inferred takeoff and an
 * independently verified actual-only wheels-off label are four different
 * evidence classes. Nothing in this module can create an actual-only label,
 * certify a provider license or authorize a production feed.
 */
import {
  gate05AdsbAsOfEligibleV39,
  type Gate05AdsbCandidateV39
} from "./gate05ZeroCostAdsbEvidence_v39";

export type P4DualSourcePhaseV39 = "PRE"|"AIRBORNE"|"POST";
export type P4AdsbLinkageV39 =
  "INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK"|
  "CALLSIGN_ONLY_CANDIDATE"|"AIRCRAFT_ONLY_CANDIDATE"|
  "CONFLICT"|"UNMATCHED";

export interface P4DualSourceAdsbInputV39 {
  /** This must refer to the already separately verified FIDS operating leg. */
  aeroDataBoxPhysicalOperatingLegVerified:boolean;
  /** An aircraft can be swapped, and a transponder can span many legs. */
  aircraftSwapOrConflictingIdentity:boolean;
  linkage:P4AdsbLinkageV39;
  adsbPosition:Gate05AdsbCandidateV39|null;
  predictionCutoffUtc:string;
  phase:P4DualSourcePhaseV39;
  /** Legal/technical admission from a separate independently reviewed owner. */
  licenseAndRetentionReviewed:boolean;
}
export interface P4DualSourceAdsbResultV39 {
  schema:"v39.phase4.gate5-dual-source-adsb-admission.v1";
  adsbSource:"adsb.lol";
  populationSource:"AeroDataBox FIDS";
  linkage:P4AdsbLinkageV39;
  positionProvenance:"DIRECT_ADSB"|"MLAT_OR_TISB"|"UNKNOWN"|"ABSENT";
  availableAtDecision:boolean;
  independentlyLinkedToOperatingLeg:boolean;
  /** Candidate to include in *future* AIRBORNE features after production wiring. */
  airborneCandidateEligible:boolean;
  rejectedReason:
    "NO_POSITION"|"POST_CUTOFF_OR_CLOCK"|"UNVERIFIED_PHYSICAL_LEG"|
    "AIRCRAFT_IDENTITY_CONFLICT"|"INSUFFICIENT_LINKAGE"|
    "LICENSE_OR_RETENTION_NOT_REVIEWED"|"PRE_OR_POST_NOT_AIRBORNE"|null;
  certifiedActualOnlyWheelsOff:false;
  certifiedScheduledWheelsOff:false;
  inferenceIsNotGroundTruth:true;
  /** This pure gate does NOT grant permission for live/source collection. */
  productionSourceActivationAuthorized:false;
  noProviderRequests:true;
  noDatabaseWrites:true;
}
/** This procedure never logs flight keys, callsigns or positions. */
export function assessP4Gate5DualSourceAdsbV39(
  input:P4DualSourceAdsbInputV39
):P4DualSourceAdsbResultV39{
  if(!input||typeof input.aeroDataBoxPhysicalOperatingLegVerified!=="boolean"||
     typeof input.aircraftSwapOrConflictingIdentity!=="boolean"||
     typeof input.licenseAndRetentionReviewed!=="boolean"||
     !["PRE","AIRBORNE","POST"].includes(input.phase)||
     !["INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK",
       "CALLSIGN_ONLY_CANDIDATE","AIRCRAFT_ONLY_CANDIDATE",
       "CONFLICT","UNMATCHED"].includes(input.linkage))
    throw Error("P4_G5_DUAL_SOURCE_INVALID_BOUNDARY");
  // Validate cutoff even when the position is absent: invalid time cannot be
  // mistaken for an ordinary missing aircraft.
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input.predictionCutoffUtc)||
     !Number.isFinite(Date.parse(input.predictionCutoffUtc))||
     new Date(Date.parse(input.predictionCutoffUtc)).toISOString().slice(0,19)!==
       input.predictionCutoffUtc.slice(0,19))
    throw Error("P4_G5_DUAL_SOURCE_INVALID_CUTOFF_UTC");
  const p=input.adsbPosition;
  if(p!==null&&(
    p.identity!=="UNLINKED_AIRCRAFT_CANDIDATE"||
    p.runwayEventActualVerified!==false||
    p.originalAeroDataBoxFlightMatched!==false
  ))throw Error("P4_G5_DUAL_SOURCE_FAKE_PROVIDER_ACTUALITY");
  const source=p?.sourceType??"";
  const provenance:P4DualSourceAdsbResultV39["positionProvenance"]=
    !p?"ABSENT":source.startsWith("adsb")?"DIRECT_ADSB":
    source==="mlat"||source==="tisb"?"MLAT_OR_TISB":"UNKNOWN";
  const asOf=p?gate05AdsbAsOfEligibleV39(p,input.predictionCutoffUtc):false;
  const linked=input.aeroDataBoxPhysicalOperatingLegVerified &&
    !input.aircraftSwapOrConflictingIdentity &&
    input.linkage==="INDEPENDENT_OPERATING_LEG_AND_AIRCRAFT_LINK";
  let rejected:P4DualSourceAdsbResultV39["rejectedReason"]=null;
  if(!p)rejected="NO_POSITION";
  else if(!asOf)rejected="POST_CUTOFF_OR_CLOCK";
  else if(!input.aeroDataBoxPhysicalOperatingLegVerified)
    rejected="UNVERIFIED_PHYSICAL_LEG";
  else if(input.aircraftSwapOrConflictingIdentity||input.linkage==="CONFLICT")
    rejected="AIRCRAFT_IDENTITY_CONFLICT";
  else if(!linked)rejected="INSUFFICIENT_LINKAGE";
  else if(!input.licenseAndRetentionReviewed)
    rejected="LICENSE_OR_RETENTION_NOT_REVIEWED";
  else if(input.phase!=="AIRBORNE")rejected="PRE_OR_POST_NOT_AIRBORNE";
  return {
    schema:"v39.phase4.gate5-dual-source-adsb-admission.v1",
    adsbSource:"adsb.lol",populationSource:"AeroDataBox FIDS",
    linkage:input.linkage,positionProvenance:provenance,
    availableAtDecision:asOf,independentlyLinkedToOperatingLeg:linked,
    airborneCandidateEligible:rejected===null,rejectedReason:rejected,
    certifiedActualOnlyWheelsOff:false,
    certifiedScheduledWheelsOff:false,
    inferenceIsNotGroundTruth:true,
    productionSourceActivationAuthorized:false,
    noProviderRequests:true,noDatabaseWrites:true
  };
}
