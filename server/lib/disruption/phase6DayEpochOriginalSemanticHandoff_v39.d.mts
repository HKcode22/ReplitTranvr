export const P6_DAY_EPOCH_EXISTING_SEMANTICS_SCHEMA:string;
type Receipt={redactedSummary:Record<string,unknown>;readonly privateRoutingCandidates:unknown[];
 readonly getFrozen:(path:string)=>Buffer};
export function inspectP6DayEpochExistingShardSemanticsNoGo(verified:unknown):Receipt;
export function hydrateAndInspectP6DayEpochOriginalSemanticsReadOnly(input:{
 client:{query:(sql:string,values?:any[])=>Promise<any>};pins:Record<string,unknown>;
 wire:{review:Record<string,unknown>;signatureBase64:string};publicKeyPem:string;
 scope:{privateDayRegistryReadOnlyApproved:boolean;existingPaidDispatchApproved:boolean;requireCurrentRevisionForPlanning?:boolean}
}):Promise<Receipt>;
