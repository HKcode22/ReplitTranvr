/**
 * Minimal source/clock and chronological split screen for exploratory ML.
 * Pure offline: no DB, provider, raw webhook export, model training, or
 * authorization. NOT the Phase6 protected Engine-A test gate.
 *
 * All feature timestamps represent when that actual feature value was
 * knowable, not when the producer first scheduled a possible API request.
 * Caller must provide real evidence; a boolean flag alone is not proof.
 */
export interface MlPilotRowV39 {
  rowId: string;
  flightInstanceId: string;
  predictionCutoffUtc: string;
  labelObservedAtUtc: string | null;
  labelIsActual: boolean;
  delayMinutes: number | null;
  tier: "A_VERIFIED_PRIMARY" | "B_DEGRADED_OBSERVED_ONLY";
  originSourceSha256: string;
  featureValues: Record<string, number | null>;
  featureAvailableAtUtc: Record<string, string | null>;
}
export interface MlPilotSplitV39 {
  trainBeforeUtc: string;
  validationBeforeUtc: string;
  testBeforeUtc: string;
  featureNames: readonly string[];
}
export type MlPilotPartitionV39 = "TRAIN" | "VALIDATION" | "EXPLORATORY_TEST";
export interface MlPilotAuditV39 {
  schema: "v39.ml.exploratory-input-audit.v1";
  status: "READY_FOR_EXPLORATORY_MODEL_ONLY" | "HOLD";
  // Sanitized aggregate only; no flight identifiers or source objects output.
  totalRows: number;
  acceptedRows: number;
  rejectedByReason: Record<string, number>;
  splitSizes: Record<MlPilotPartitionV39, number>;
  qualifiedTierBRows: number;
  seenSourceShaCount: number;
  splitBoundariesValid: boolean;
  crossPartitionFlightOverlap: boolean;
  modelTrained: false;
  phase6EvaluationCertified: false;
}
const isIso = (v:unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v) &&
  Number.isFinite(Date.parse(v));
const isSha=(v:unknown):v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const empty=():Record<MlPilotPartitionV39,number> => ({
  TRAIN:0,VALIDATION:0,EXPLORATORY_TEST:0,
});
export function auditMlPilotInputV39(
  rows: readonly MlPilotRowV39[],
  split: MlPilotSplitV39,
): MlPilotAuditV39 {
  const errors:Record<string,number>={};
  const flag=(v:string)=>{errors[v]=(errors[v]??0)+1;};
  const partitions=empty();
  const seenSources=new Set<string>();
  const identities=new Map<string,MlPilotPartitionV39>();
  const observedKeys=new Set<string>();
  let accepted=0,tierB=0,cross=false;
  const boundValid=split!==null && typeof split==="object" &&
    isIso(split.trainBeforeUtc) && isIso(split.validationBeforeUtc) &&
    isIso(split.testBeforeUtc) &&
    split.trainBeforeUtc<split.validationBeforeUtc &&
    split.validationBeforeUtc<split.testBeforeUtc &&
    Array.isArray(split.featureNames) && split.featureNames.length>0 &&
    split.featureNames.every(x=>typeof x==="string"&&x.length>0) &&
    new Set(split.featureNames).size===split.featureNames.length;
  if(!boundValid) flag("INVALID_SPLIT_OR_FEATURE_FREEZE");
  if(!Array.isArray(rows)) flag("ROWS_NOT_ARRAY");
  if(boundValid&&Array.isArray(rows)){
    for(const row of rows){
      if(!row || typeof row!=="object" || Array.isArray(row)){flag("MALFORMED_ROW");continue;}
      if(typeof row.rowId!=="string" || !row.rowId.trim() ||
        observedKeys.has(row.rowId)) {flag("DUPLICATE_OR_INVALID_ROW_ID");continue;}
      observedKeys.add(row.rowId);
      if(typeof row.flightInstanceId!=="string" || !row.flightInstanceId.trim()) {
        flag("MISSING_CANONICAL_FLIGHT_ID"); continue;
      }
      if(!isSha(row.originSourceSha256)){flag("SOURCE_SHA_UNVERIFIED");continue;}
      if(!isIso(row.predictionCutoffUtc)) {flag("INVALID_PREDICTION_CUTOFF");continue;}
      if(!isIso(row.labelObservedAtUtc) ||
        row.labelObservedAtUtc<=row.predictionCutoffUtc ||
        row.labelIsActual!==true ||
        typeof row.delayMinutes!=="number" || !Number.isFinite(row.delayMinutes)){
        flag("LABEL_NOT_OBSERVED_ACTUAL_AFTER_CUTOFF");continue;
      }
      if(row.tier!=="A_VERIFIED_PRIMARY"&&row.tier!=="B_DEGRADED_OBSERVED_ONLY"){
        flag("INVALID_RESEARCH_COHORT_TIER");continue;
      }
      if(!row.featureValues || typeof row.featureValues!=="object" ||
        !row.featureAvailableAtUtc || typeof row.featureAvailableAtUtc!=="object"){
        flag("FEATURE_EVIDENCE_MISSING");continue;
      }
      let badFeature=false;
      for(const name of split.featureNames){
        const value=row.featureValues[name],available=row.featureAvailableAtUtc[name];
        if(typeof value!=="number"||!Number.isFinite(value) ||
           !isIso(available)||available>row.predictionCutoffUtc) {
          badFeature=true;break;
        }
      }
      if(badFeature){flag("FUTURE_OR_UNVERIFIED_FEATURE");continue;}
      const stamp=row.predictionCutoffUtc;
      if(stamp>=split.testBeforeUtc){flag("OUTSIDE_FROZEN_EXPLORATORY_WINDOW");continue;}
      const part:MlPilotPartitionV39=stamp<split.trainBeforeUtc?"TRAIN":
        stamp<split.validationBeforeUtc?"VALIDATION":"EXPLORATORY_TEST";
      const existing=identities.get(row.flightInstanceId);
      if(existing && existing!==part){cross=true;flag("CROSS_PARTITION_FLIGHT_ID");continue;}
      identities.set(row.flightInstanceId,part);
      partitions[part]++;
      accepted++;
      seenSources.add(row.originSourceSha256);
      if(row.tier==="B_DEGRADED_OBSERVED_ONLY")tierB++;
    }
  }
  // Even a correct synthetic audit does not certify source provenance or
  // authorize a protected-test read. A real learner has separate safeguards.
  const ready=boundValid&&accepted>0&&Object.keys(errors).length===0&&
    Object.values(partitions).every(x=>x>0)&&!cross;
  return {
    schema:"v39.ml.exploratory-input-audit.v1",
    status:ready?"READY_FOR_EXPLORATORY_MODEL_ONLY":"HOLD",
    totalRows:Array.isArray(rows)?rows.length:0,
    acceptedRows:accepted,rejectedByReason:errors,
    splitSizes:partitions,qualifiedTierBRows:tierB,
    seenSourceShaCount:seenSources.size,
    splitBoundariesValid:boundValid,crossPartitionFlightOverlap:cross,
    modelTrained:false,phase6EvaluationCertified:false,
  };
}
