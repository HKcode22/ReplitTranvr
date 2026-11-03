/**
 * Gate5 cohort-scoped *transactional* PRE writer, no automatic live entrypoint.
 * Only a separately reviewed, source-native selected T + actual operating-leg
 * and legal rights permit may call this function. Bytes/SHA alone are not
 * independent evidence; the caller MUST authenticate those artifacts.
 */
import {persistPreSnapshot,type PreSnapshot,
 type PreHorizon,type SelectedTMilestoneConfig}
 from "./preSnapshotBuilder_v3";
import {stageP4G5ScopedPreV39,type P4G5PreDb,
 type P4G5ScopedPreScope}
 from "./phase4Gate5ScopedPreStaging_v39";

const SHA=/^[a-f0-9]{64}$/;
const HORIZONS=["T-24h","T-6h","T-90m"] as const;
const MAX_PRE_EARLY_MS=180000;
const PRE_COMMIT_MARGIN_MS=2000;
export interface P4G5ReviewedPreWriteScopeV39 extends P4G5ScopedPreScope{
 /** A production owner may write only its own due horizon, never all three. */
 horizon:PreHorizon;
}
export type P4G5PreTemporalDecisionV39="DUE"|"NOT_YET_DUE"|"LATE_NO_BACKFILL";
export function classifyP4G5PreCutoffAgainstDbClockV39(
 cutoff:Date,clock:Date
):P4G5PreTemporalDecisionV39{
 const t=cutoff?.getTime(),n=clock?.getTime();
 if(!Number.isFinite(t)||!Number.isFinite(n))
  throw Error("P4_G5_PRE_INVALID_DB_CLOCK_OR_CUTOFF_HOLD");
 if(n>t)return "LATE_NO_BACKFILL";
 if(t-n>MAX_PRE_EARLY_MS)return "NOT_YET_DUE";
 return "DUE";
}
function dbClockV39(q:{rows:unknown[]}):Date{
 if(!q||!Array.isArray(q.rows)||q.rows.length!==1)
  throw Error("P4_G5_PRE_UNVERIFIED_DATABASE_CLOCK_HOLD");
 const record=q.rows[0];
 if(!record||typeof record!=="object"||Array.isArray(record))
  throw Error("P4_G5_PRE_UNVERIFIED_DATABASE_CLOCK_HOLD");
 const raw=(record as Record<string,unknown>).db_now_utc;
 const d=raw instanceof Date?raw:typeof raw==="string"?new Date(raw):null;
 if(!d||!Number.isFinite(d.getTime()))
  throw Error("P4_G5_PRE_UNVERIFIED_DATABASE_CLOCK_HOLD");
 return d;
}
export const P4_G5_PRE_DB_CLOCK_SQL_V39=
 "SELECT clock_timestamp() AS db_now_utc";
export interface P4G5CertifiedPrePermit {
 exactCohortManifestSha256:string;
 independentSelectedTSourceEvidenceSha256:string;
 independentPhysicalOperatingIdentityEvidenceSha256:string;
 independentlyReviewedSourceRetentionEvidenceSha256:string;
 reviewedRunAuthorizationSha256:string;
 frozenBuilderSourceSha256:string;
 builderFrozenAtUtc:string;
 selectedTConfig:SelectedTMilestoneConfig;
 verifiedExternalSourceAndRightsReview:true;
}
function requireProof(permit:P4G5CertifiedPrePermit,
 scope:P4G5ReviewedPreWriteScopeV39){
 if(!HORIZONS.includes(scope?.horizon))
  throw Error("P4_G5_PRE_SINGLE_HORIZON_SCOPE_REQUIRED");
 if(!permit||!SHA.test(permit.exactCohortManifestSha256)||
  permit.exactCohortManifestSha256!==scope.reviewedFrozenManifestSha256||
  !SHA.test(permit.independentSelectedTSourceEvidenceSha256)||
  !SHA.test(permit.independentPhysicalOperatingIdentityEvidenceSha256)||
  !SHA.test(permit.independentlyReviewedSourceRetentionEvidenceSha256)||
  !SHA.test(permit.reviewedRunAuthorizationSha256)||
  !SHA.test(permit.frozenBuilderSourceSha256)||
  typeof permit.builderFrozenAtUtc!=="string"||
  !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(permit.builderFrozenAtUtc)||
  !Number.isFinite(Date.parse(permit.builderFrozenAtUtc))||
  new Date(permit.builderFrozenAtUtc).toISOString()!==permit.builderFrozenAtUtc||
  permit.verifiedExternalSourceAndRightsReview!==true||
  !permit.selectedTConfig||
  permit.selectedTConfig.verifiedProviderNativeSchedule!==true||
  permit.selectedTConfig.milestone!=="departure.scheduledTime.utc"||
  !permit.selectedTConfig.version?.trim()||
  !SHA.test(permit.selectedTConfig.artifactHash)||
  permit.selectedTConfig.semanticsEvidenceSha256!==
   permit.independentSelectedTSourceEvidenceSha256)
   throw Error("P4_G5_PRE_EXTERNAL_SEMANTIC_OR_RIGHTS_PROOF_HOLD");
}
// An existing flight/horizon/cutoff is idempotent ONLY if its stored source
// and frozen T binding are identical; ON CONFLICT must not mask drift.
export const P4_G5_PRE_CONFLICT_READ_SQL=[
 "SELECT flight_instance_id,horizon,prediction_cutoff_utc,",
 "selected_t_milestone_utc,selected_t_version,population_query_id,",
 "fids_response_hash,builder_version,",
 "features_json=$4::jsonb AS same_features,",
 "missingness_flags=$5::jsonb AS same_missingness,",
 "frame_hash IS NOT DISTINCT FROM $6 AS same_frame,",
 "config_hash IS NOT DISTINCT FROM $7 AS same_config,",
 "provenance_json=$8::jsonb AS same_provenance",
 "FROM clean.flight_snapshots",
 "WHERE flight_instance_id=$1 AND horizon=$2",
 "AND prediction_cutoff_utc=$3::timestamptz",
 "AND prediction_state='PRE_DEPARTURE'"
].join(" ");
export async function persistP4G5ReviewedPreForCohortV39(
 client:P4G5PreDb,scope:P4G5ReviewedPreWriteScopeV39,permit:P4G5CertifiedPrePermit
){
 // This exported function is deliberately NOT reachable from an Actions
 // workflow. A future reviewed production operator must authenticate
 // Github main/SHA, exact owner, permit bytes, data-rights and a real active
 // next-cohort prearm before granting this DB writer.
 requireProof(permit,scope);
 let tx=false,inserted=0,existing=0,expected=0;
 let notYetDue=0,lateNoBackfill=0;
 const insertedCutoffs:Date[]=[];
 try{
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ WRITE");
  tx=true;
  await client.query("SET LOCAL statement_timeout = '12000ms'");
  await client.query("SET LOCAL lock_timeout = '2000ms'");
  // The independently committed database clock, not caller-provided CLI
  // time, decides whether a predicted flight is currently due.
  const initialClock=dbClockV39(await client.query(P4_G5_PRE_DB_CLOCK_SQL_V39));
  const observedAt=Date.parse(scope.observedAtUtc);
  if(!Number.isFinite(observedAt)||observedAt>initialClock.getTime()||
     initialClock.getTime()-observedAt>MAX_PRE_EARLY_MS)
   throw Error("P4_G5_PRE_CLAIMED_OBSERVATION_CLOCK_NOT_CURRENT_HOLD");
  const staged=await stageP4G5ScopedPreV39(client,scope);
  const unique=new Set<string>();
  const horizonRows=staged.staged.filter(x=>x.horizon===scope.horizon);
  // Only this specific horizon may be considered for writing. Other
  // horizon candidates are NOT missing and must remain untouched.
  for(const {snapshot:unreviewed} of horizonRows){
   const decision=classifyP4G5PreCutoffAgainstDbClockV39(
    unreviewed.predictionCutoffUtc,initialClock);
   if(decision==="NOT_YET_DUE"){notYetDue++;continue;}
   if(decision==="LATE_NO_BACKFILL"){lateNoBackfill++;continue;}
   const clockNow=dbClockV39(await client.query(P4_G5_PRE_DB_CLOCK_SQL_V39));
   const current=classifyP4G5PreCutoffAgainstDbClockV39(
    unreviewed.predictionCutoffUtc,clockNow);
   if(current==="LATE_NO_BACKFILL"){lateNoBackfill++;continue;}
   if(current==="NOT_YET_DUE"){notYetDue++;continue;}
   expected++;
   // A newly written transform cannot reconstruct features that were not
   // deployable at the historical decision time (Plan f.8 §6.1).
   if(Date.parse(permit.builderFrozenAtUtc)>unreviewed.predictionCutoffUtc.getTime())
    throw Error("P4_G5_PRE_TRANSFORM_NOT_FROZEN_BY_CUTOFF");
   const k=unreviewed.flightInstanceId+"|"+unreviewed.horizon+"|"+
    unreviewed.predictionCutoffUtc.toISOString();
   if(unique.has(k))throw Error("P4_G5_PRE_DUPLICATE_CANONICAL_IDENTITY_HOLD");
   unique.add(k);
   const snap:PreSnapshot={
    ...unreviewed,
    selectedTVersion:permit.selectedTConfig.milestone+":"+
     permit.selectedTConfig.version+":"+
     permit.selectedTConfig.artifactHash,
    provenance:{
     ...unreviewed.provenance,
     // Authenticated evidence review still belongs to an independent operator
     // before calling this code; these are bound audit references.
     frameHash:scope.reviewedFrozenManifestSha256,
     configHash:permit.reviewedRunAuthorizationSha256
    }
   };
   const n=await persistPreSnapshot(client,snap);
   if(n===1){inserted++;insertedCutoffs.push(snap.predictionCutoffUtc);continue;}
   if(n!==0)throw Error("P4_G5_PRE_INSERT_RESULT_HOLD");
   const prior=await client.query(P4_G5_PRE_CONFLICT_READ_SQL,[
    snap.flightInstanceId,snap.horizon,snap.predictionCutoffUtc,
    JSON.stringify(snap.features.map(f=>({name:f.featureName,value:f.value}))),
    JSON.stringify(snap.provenance.missingnessFlags),
    snap.provenance.frameHash,snap.provenance.configHash,
    JSON.stringify(snap.provenance)
   ]);
   if(prior.rows.length!==1)throw Error("P4_G5_PRE_CONFLICT_UNVERIFIABLE");
   const x=prior.rows[0] as Record<string,unknown>;
   const oldT=x.selected_t_milestone_utc instanceof Date?
     x.selected_t_milestone_utc.toISOString():
     typeof x.selected_t_milestone_utc==="string"?
      new Date(x.selected_t_milestone_utc).toISOString():"";
   if(oldT!==snap.selectedTMilestoneUtc.toISOString()||
    x.selected_t_version!==snap.selectedTVersion||
    x.population_query_id!==snap.populationQueryId||
    x.fids_response_hash!==snap.provenance.fidsResponseHash||
    x.builder_version!==snap.provenance.builderVersion||
    x.same_features!==true||x.same_missingness!==true||
    x.same_frame!==true||x.same_config!==true||
    x.same_provenance!==true)
    throw Error("P4_G5_PRE_EXISTING_SNAPSHOT_PROVENANCE_CONFLICT");
   existing++;
  }
  if(inserted+existing!==expected)
   throw Error("P4_G5_PRE_SNAPSHOT_MATERIALIZATION_COUNT_HOLD");
  // A write durable only after the cutoff is retrospectively backfilled,
  // even if the INSERT itself began earlier. Recheck the actual database
  // clock before COMMIT; roll back all newly-created PREs if too late.
  if(insertedCutoffs.length){
   const commitClock=dbClockV39(await client.query(P4_G5_PRE_DB_CLOCK_SQL_V39));
   if(insertedCutoffs.some(cutoff=>
     commitClock.getTime()+PRE_COMMIT_MARGIN_MS>cutoff.getTime()))
    throw Error("P4_G5_PRE_COMMIT_TOO_LATE_ROLLBACK");
  }
  await client.query("COMMIT");
  tx=false;
  return {
   schema:"v39.phase4.gate5-scoped-transactional-pre-writer.v2" as const,
   status:expected===0?
    "NO_CURRENTLY_DUE_PRE_ROWS_NO_BACKFILL" as const:
    "REVIEWED_SOURCE_HORIZON_PRE_ROWS_MATERIALIZED_NOT_GATE5_PASS" as const,
   manifestSha256:scope.reviewedFrozenManifestSha256,
   sourceEvidenceSha256:permit.independentSelectedTSourceEvidenceSha256,
   frozenBuilderSha256:permit.frozenBuilderSourceSha256,
   builderFrozenAtUtc:permit.builderFrozenAtUtc,
   horizon:scope.horizon,
   expectedSourceQualifiedRows:expected,
   notYetDueCandidates:notYetDue,
   lateCutoffCandidatesNotBackfilled:lateNoBackfill,
   newlyPersistedRows:inserted,previousVerifiedIdempotentRows:existing,
   sourceAsOfMissingByHorizon:staged.counts
    .filter(x=>x.horizon===scope.horizon).map(x=>({
     horizon:x.horizon,unobserved:x.sourceUnobserved,
     ambiguousScopeOrOperatingIdentity:x.unverifiedScopeOrIdentity
    })),
   otherHorizonsUntouched:true as const,
   databaseClockBackfillBlocked:true as const,
   optionalFeatureMissingNeverSuppressesEligibleSnapshot:true as const,
   actualOnlyDepartureOutcomeProvenByThisFunction:false as const,
   strictGate5Passed:false as const,
   phase5FreezeAuthorized:false as const,phase6Authorized:false as const,
   providerCalls:0 as const,databaseWrites:inserted
  };
 }catch(e){
  if(tx)await client.query("ROLLBACK").catch(()=>undefined);
  throw e;
 }
}
