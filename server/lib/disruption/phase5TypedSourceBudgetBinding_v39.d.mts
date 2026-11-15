/** Legacy exact-grid pins or explicit V0093 distinct cost-only upper bound. */
export interface P5TypedSourceBudgetBinding{
 budgetReleaseMode?:"EXACT_SOURCE_GRID"|"COST_UPPER_BOUND";
 reviewed31DaySourceRequestGridSha256:string|null;
 reviewedCostEnvelopeSha256?:string|null;
}
export function normalizeP5TypedSourceBudgetBinding(x:unknown):Required<P5TypedSourceBudgetBinding>|null;
export function sameP5TypedSourceBudgetBinding(a:unknown,b:unknown):boolean;
export function matchesP5TypedSourceBudgetReleaseRow(review:unknown,row:unknown):boolean;
export const P5_TYPED_RELEASE_SELECT_COLUMNS:string;
