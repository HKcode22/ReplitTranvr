/**
 * Gate05 §5.2: temporal join of a prospective FIDS cohort.
 * No provider/DB I/O. A source reader supplies observed, lawfully held facts.
 * A later or differently scheduled FIDS snapshot must NEVER leak into PRE.
 * Only same verified operating leg is joined; unknown aliases are excluded.
 * Published provider fields alone never certify actual runway label or T.
 */
export const GATE05_ASOF_FIDS_SCHEMA = "v39.gate05.fids-asof-cohort.v1" as const;
export type Gate05FidsSnapshotV39 = Readonly<{
  captureId: string;
  responseSha256: string;
  availableAtUtc: string;
  /** First provider-native selected milestone, frozen before hindsight. */
  frozenNativeTAtUtc: string;
  /** Native anchor must have been originally available before this capture. */
  nativeTFirstObservedAtUtc: string;
  /** An independent trusted source reader, not the field name, establishes identity. */
  physicalOperatingLegId: string | null;
  physicalIdentity: "VERIFIED_OPERATING_LEG" | "PROVISIONAL" | "UNKNOWN";
  codeshareRole: "OPERATOR" | "MARKETING" | "UNKNOWN";
  phase: "PRE" | "POST";
  scheduledDepartureCandidateUtc: string | null;
  departureRunwayCandidateUtc: string | null;
}>;
export type Gate05AsOfHorizon = "T-24h" | "T-6h" | "T-90m";
export type Gate05FidsAsOfReportV39 = Readonly<{
  schema:typeof GATE05_ASOF_FIDS_SCHEMA;
  inputObjects:number;
  verifiedOperatingLegCandidates:number;
  marketingOrIdentityUnverifiedObjects:number;
  conflictingNativeTLegCount:number;
  retainedSameCohortPostLegs:number;
  postRecordsWithoutMatchedPre:number;
  perHorizon:Readonly<Record<Gate05AsOfHorizon,Readonly<{
    eligibleLegs:number;
    joinedLaterPostLegs:number;
    sourceUnavailableBeforeCutoffLegs:number;
    observedRunwayCandidatePresent:number;
    observedScheduleCandidatePresent:number;
    latestEligibleAvailabilityUtc:string|null;
  }>>>;
  physicalFlightIdentityIndependentlyConfirmed:false;
  runwayCandidateProvenActual:false;
  scheduledDepartureProvenWheelsOff:false;
  nativeTSourceIndependentlyConfirmed:false;
  genuineFlightLevelPredictionCutoffCertified:false;
  strictScientificLabelProven:false;
  providerCalls:0;
  databaseWrites:0;
}>;
const hash=/^[0-9a-f]{64}$/;
const HORIZONS:Readonly<Record<Gate05AsOfHorizon,number>>={
  "T-24h":86_400_000, "T-6h":21_600_000,"T-90m":5_400_000
};
const horizons=["T-24h","T-6h","T-90m"] as const;
function readUtc(s:string|null,k:string):number|null{
  if(s===null)return null;
  if(typeof s!=="string" ||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s))
    throw Error("GATE05_FIDS_ASOF_INVALID_UTC_"+k);
  const v=Date.parse(s);
  if(!Number.isFinite(v) || new Date(v).toISOString().slice(0,19)!==s.slice(0,19))
    throw Error("GATE05_FIDS_ASOF_INVALID_UTC_"+k);
  return v;
}
export function assessGate05FidsAsOfCohortV39(
  rows:readonly Gate05FidsSnapshotV39[]
):Gate05FidsAsOfReportV39{
  if(!Array.isArray(rows)||rows.length>50_000)
    throw Error("GATE05_FIDS_ASOF_INVALID_ROWS");
  type Item={phase:"PRE"|"POST";at:number;t:number;firstT:number;
    scheduled:number|null;runway:number|null};
  const groups=new Map<string,Item[]>();
  const seen=new Set<string>();
  let excluded=0;
  for(const row of rows){
    if(!row || typeof row!=="object" ||
       !/^[A-Za-z0-9:_-]{8,160}$/.test(row.captureId) ||
       !hash.test(row.responseSha256) ||
       !["VERIFIED_OPERATING_LEG","PROVISIONAL","UNKNOWN"].includes(row.physicalIdentity) ||
       !["OPERATOR","MARKETING","UNKNOWN"].includes(row.codeshareRole) ||
       !["PRE","POST"].includes(row.phase) ||
       !(row.physicalOperatingLegId===null ||
         (typeof row.physicalOperatingLegId==="string" &&
          /^[A-Za-z0-9:_-]{8,160}$/.test(row.physicalOperatingLegId))))
      throw Error("GATE05_FIDS_ASOF_INVALID_ROW");
    const at=readUtc(row.availableAtUtc,"available")!;
    const t=readUtc(row.frozenNativeTAtUtc,"native_t")!;
    const firstT=readUtc(row.nativeTFirstObservedAtUtc,"t_first_seen")!;
    const scheduled=readUtc(row.scheduledDepartureCandidateUtc,"scheduled");
    const runway=readUtc(row.departureRunwayCandidateUtc,"runway");
    if(firstT>at)throw Error("GATE05_FIDS_ASOF_T_AVAILABLE_AFTER_RESPONSE");
    if(row.physicalIdentity!=="VERIFIED_OPERATING_LEG" ||
       row.codeshareRole!=="OPERATOR" || row.physicalOperatingLegId===null){
      excluded++;continue;
    }
    const key=row.captureId+"|"+row.physicalOperatingLegId+"|"+row.phase;
    if(seen.has(key))throw Error("GATE05_FIDS_ASOF_DUPLICATE_CAPTURE_LEG");
    seen.add(key);
    const arr=groups.get(row.physicalOperatingLegId)??[];
    arr.push({phase:row.phase,at,t,firstT,scheduled,runway});
    groups.set(row.physicalOperatingLegId,arr);
  }
  let conflicting=0,joined=0,postWithout=0;
  const report={
    "T-24h":{eligibleLegs:0,joinedLaterPostLegs:0,
      sourceUnavailableBeforeCutoffLegs:0,observedRunwayCandidatePresent:0,
      observedScheduleCandidatePresent:0,latestEligibleAvailabilityUtc:null as string|null},
    "T-6h":{eligibleLegs:0,joinedLaterPostLegs:0,
      sourceUnavailableBeforeCutoffLegs:0,observedRunwayCandidatePresent:0,
      observedScheduleCandidatePresent:0,latestEligibleAvailabilityUtc:null as string|null},
    "T-90m":{eligibleLegs:0,joinedLaterPostLegs:0,
      sourceUnavailableBeforeCutoffLegs:0,observedRunwayCandidatePresent:0,
      observedScheduleCandidatePresent:0,latestEligibleAvailabilityUtc:null as string|null}
  };
  for(const events of groups.values()){
    const ts=new Set(events.map(x=>x.t));
    const initial=new Set(events.map(x=>x.firstT));
    // A changed first-frozen T is a sign that disparate retimes or legs
    // have been incorrectly joined. Exclude from every denominator.
    if(ts.size!==1 || initial.size!==1){conflicting++;continue;}
    const t=events[0].t;
    const pre=events.filter(x=>x.phase==="PRE");
    const post=events.filter(x=>x.phase==="POST" && x.at>=t);
    if(post.length&&!pre.length)postWithout++;
    if(post.length&&pre.length)joined++;
    for(const horizon of horizons){
      const cutoff=t-HORIZONS[horizon];
      // The per-flight source availability timestamp is the only
      // admissible cutoff witness. Post cannot supply missing PRE fields.
      const qualifying=pre.filter(x=>x.at<=cutoff && x.firstT<=cutoff);
      const selected=qualifying.sort((a,b)=>b.at-a.at)[0];
      const s=report[horizon];
      if(!selected){
        s.sourceUnavailableBeforeCutoffLegs++;
        continue;
      }
      s.eligibleLegs++;
      if(selected.scheduled!==null)s.observedScheduleCandidatePresent++;
      const latest=selected.at;
      if(!s.latestEligibleAvailabilityUtc ||
         latest>Date.parse(s.latestEligibleAvailabilityUtc))
        s.latestEligibleAvailabilityUtc=new Date(latest).toISOString();
      if(post.length){
        s.joinedLaterPostLegs++;
        if(post.some(x=>x.runway!==null))s.observedRunwayCandidatePresent++;
      }
    }
  }
  return {
    schema:GATE05_ASOF_FIDS_SCHEMA,
    inputObjects:rows.length,
    verifiedOperatingLegCandidates:groups.size,
    marketingOrIdentityUnverifiedObjects:excluded,
    conflictingNativeTLegCount:conflicting,
    retainedSameCohortPostLegs:joined,
    postRecordsWithoutMatchedPre:postWithout,
    perHorizon:report,
    physicalFlightIdentityIndependentlyConfirmed:false,
    runwayCandidateProvenActual:false,
    scheduledDepartureProvenWheelsOff:false,
    nativeTSourceIndependentlyConfirmed:false,
    genuineFlightLevelPredictionCutoffCertified:false,
    strictScientificLabelProven:false,
    providerCalls:0,databaseWrites:0
  };
}
