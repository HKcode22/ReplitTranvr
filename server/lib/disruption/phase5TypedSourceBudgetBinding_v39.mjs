/** Disjoint reviewed provenance for legacy V0082 and actual V0093.
 * A cost ceiling is not a fabricated complete future airport query grid. */
const SHA=/^[a-f0-9]{64}$/;
const sha=s=>typeof s==="string"&&SHA.test(s);
export function normalizeP5TypedSourceBudgetBinding(x){
 if(!x||typeof x!=="object")return null;
 const mode=x.budgetReleaseMode===undefined?"EXACT_SOURCE_GRID":x.budgetReleaseMode;
 if(mode==="EXACT_SOURCE_GRID"&&sha(x.reviewed31DaySourceRequestGridSha256)&&
    (x.reviewedCostEnvelopeSha256===null||x.reviewedCostEnvelopeSha256===undefined))
  return {budgetReleaseMode:mode,reviewed31DaySourceRequestGridSha256:x.reviewed31DaySourceRequestGridSha256,reviewedCostEnvelopeSha256:null};
 if(mode==="COST_UPPER_BOUND"&&x.budgetReleaseMode===mode&&
    x.reviewed31DaySourceRequestGridSha256===null&&sha(x.reviewedCostEnvelopeSha256))
  return {budgetReleaseMode:mode,reviewed31DaySourceRequestGridSha256:null,reviewedCostEnvelopeSha256:x.reviewedCostEnvelopeSha256};
 return null;
}
export function sameP5TypedSourceBudgetBinding(a,b){
 const x=normalizeP5TypedSourceBudgetBinding(a),y=normalizeP5TypedSourceBudgetBinding(b);
 return Boolean(x&&y&&JSON.stringify(x)===JSON.stringify(y));
}
/** Explicit cost mode requires actual V0093 columns, never legacy fallback. */
export function matchesP5TypedSourceBudgetReleaseRow(review,row){
 if(!row||typeof row!=="object")return false;
 return sameP5TypedSourceBudgetBinding(review,{
  budgetReleaseMode:row.budget_release_mode??undefined,
  reviewed31DaySourceRequestGridSha256:row.reviewed_source_request_grid_sha256,
  reviewedCostEnvelopeSha256:row.reviewed_cost_envelope_sha256
 });
}
export const P5_TYPED_RELEASE_SELECT_COLUMNS=
 "reviewed_source_request_grid_sha256,"+
 "to_jsonb(rel)->>'budget_release_mode' AS budget_release_mode,"+
 "to_jsonb(rel)->>'reviewed_cost_envelope_sha256' AS reviewed_cost_envelope_sha256,";
