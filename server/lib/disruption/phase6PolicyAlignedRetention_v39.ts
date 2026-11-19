/**
 * Phase 6 policy-aligned field retention contract.
 *
 * This preserves the scientific feature inventory. Useful route, carrier,
 * schedule, weather, PRE, POST and outcome fields are not forbidden here.
 * The contract separates short-lived source custody from any future
 * long-lived disposition that requires exact source/terms review.
 */
const SHA256=/^[a-f0-9]{64}$/i;
const SHA1=/^[a-f0-9]{40}$/i;
const FIELD_ID=/^[a-z][a-z0-9_]{2,96}$/;
const SOURCES=[
  "AERODATABOX_FIDS","NOAA_METAR","NOAA_TAF","ADSB_LOL",
  "REVIEWED_HISTORIC_CONTEXT","PROJECT_METADATA"
] as const;
export type PolicySource=typeof SOURCES[number];
export type RetentionClass="raw_provider_content"|"independent_source_content"|"provider_derived_candidate"|"project_metadata";
export type LongTermDisposition="short_lived_only"|"review_required"|"approved_after_external_review";
export type ReconstructionRisk="provider_record_reconstructable"|"unknown"|"reviewed_nonreconstructable"|"none";
export interface Phase6PolicyField{
  fieldId:string; table:string; source:PolicySource; scientificRole:string;
  retentionClass:RetentionClass; sourceAccessMaximumHours:number;
  longTermDisposition:LongTermDisposition; reconstructionRisk:ReconstructionRisk;
  transformation:string; externalReviewSha256:string|null;
  expiryAction:"hard_delete_or_clear"|"independent_source_lifecycle"|"project_lifecycle";
}
export interface Phase6PolicyContract{
  schema:"v39.phase6.policy-aligned-field-retention.v1";
  predecessorMainSha:string; predecessorManifestSha256:string;
  predecessorConfigSha256:string; predecessorCalendarSha256:string;
  fields:readonly Phase6PolicyField[];
}
export interface Phase6PolicyVerdict{pass:boolean;failures:string[];pendingReviewFieldIds:string[];}
function unique(values:string[]):string[]{return [...new Set(values)].sort();}
function validField(f:Phase6PolicyField,failures:string[]):void{
  if(!f||!FIELD_ID.test(f.fieldId??"")){failures.push(`field-id-invalid:${f?.fieldId??"missing"}`);return;}
  if(typeof f.table!=="string"||!f.table.trim())failures.push(`table-invalid:${f.fieldId}`);
  if(!SOURCES.includes(f.source))failures.push(`source-invalid:${f.fieldId}`);
  if(!f.scientificRole?.trim())failures.push(`scientific-role-missing:${f.fieldId}`);
  if(!["raw_provider_content","independent_source_content","provider_derived_candidate","project_metadata"].includes(f.retentionClass))failures.push(`retention-class-invalid:${f.fieldId}`);
  if(!Number.isInteger(f.sourceAccessMaximumHours)||f.sourceAccessMaximumHours<1||f.sourceAccessMaximumHours>168)failures.push(`source-access-hours-invalid:${f.fieldId}`);
  if(!["short_lived_only","review_required","approved_after_external_review"].includes(f.longTermDisposition))failures.push(`long-term-disposition-invalid:${f.fieldId}`);
  if(!["provider_record_reconstructable","unknown","reviewed_nonreconstructable","none"].includes(f.reconstructionRisk))failures.push(`reconstruction-risk-invalid:${f.fieldId}`);
  if(!f.transformation?.trim())failures.push(`transformation-missing:${f.fieldId}`);
  if(f.externalReviewSha256!==null&&!SHA256.test(f.externalReviewSha256??""))failures.push(`external-review-sha-invalid:${f.fieldId}`);
  if(!["hard_delete_or_clear","independent_source_lifecycle","project_lifecycle"].includes(f.expiryAction))failures.push(`expiry-action-invalid:${f.fieldId}`);
  const adb=f.source==="AERODATABOX_FIDS";
  if(adb&&f.sourceAccessMaximumHours>24)failures.push(`adb-fids-access-over-24h:${f.fieldId}`);
  if(adb&&f.retentionClass==="project_metadata")failures.push(`adb-fids-misclassified-as-project-metadata:${f.fieldId}`);
  if((f.retentionClass==="raw_provider_content"||adb)&&f.expiryAction!=="hard_delete_or_clear")failures.push(`provider-field-expiry-action-invalid:${f.fieldId}`);
  if(f.longTermDisposition==="approved_after_external_review"){
    if(f.externalReviewSha256===null)failures.push(`approved-field-missing-external-review:${f.fieldId}`);
    if(f.reconstructionRisk!=="reviewed_nonreconstructable")failures.push(`approved-field-not-reviewed-nonreconstructable:${f.fieldId}`);
    if(!/transform|aggregate|statistic|feature engineering|computational/i.test(f.transformation))failures.push(`approved-field-transformation-not-described:${f.fieldId}`);
  }
  if(f.retentionClass==="project_metadata"&&f.source!=="PROJECT_METADATA")failures.push(`project-metadata-source-invalid:${f.fieldId}`);
  if(f.retentionClass==="independent_source_content"&&adb)failures.push(`adb-field-not-independent-source:${f.fieldId}`);
}
export function verifyPhase6PolicyContract(c:Phase6PolicyContract):Phase6PolicyVerdict{
  const failures:string[]=[];
  if(!c||c.schema!=="v39.phase6.policy-aligned-field-retention.v1")failures.push("schema-invalid");
  if(!SHA1.test(c?.predecessorMainSha??""))failures.push("predecessorMainSha-invalid");
  for(const [name,value] of [["predecessorManifestSha256",c?.predecessorManifestSha256],["predecessorConfigSha256",c?.predecessorConfigSha256],["predecessorCalendarSha256",c?.predecessorCalendarSha256]] as const)
    if(!SHA256.test(value??""))failures.push(`${name}-invalid`);
  const fields=c?.fields??[];
  if(!Array.isArray(fields)||fields.length===0)failures.push("fields-missing");
  const ids:string[]=[];
  for(const f of fields){validField(f,failures);if(f?.fieldId)ids.push(f.fieldId);}
  for(const id of ids.filter((x,i)=>ids.indexOf(x)!==i))failures.push(`field-id-duplicate:${id}`);
  return{pass:failures.length===0,failures:unique(failures),pendingReviewFieldIds:unique(fields.filter(f=>f.longTermDisposition==="review_required").map(f=>f.fieldId))};
}
export const PHASE6_POLICY_CONTRACT_NEVER_AUTHORIZES_GO=Object.freeze({
  sourceRightsApproved:false as const, authorizationEnabled:false as const, phase6PaidGo:false as const,
});
