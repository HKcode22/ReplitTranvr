/** Existing runtime checked private index receipt. Not a substitute for Ed25519. */
export const P6_DAY_EPOCH_FULL_REGISTRY_SCHEMA:string;
export function hydrateP6DayEpochFullRegistriesReadOnly(input:{
 client:{query:(sql:string,values?:any[])=>Promise<any>};pins:Record<string,unknown>;
 wire:{review:Record<string,unknown>;signatureBase64:string};publicKeyPem:string;
 scope:{privateDayRegistryReadOnlyApproved:boolean;existingPaidDispatchApproved:boolean;requireCurrentRevisionForPlanning?:boolean}
}):Promise<{redactedSummary:{status:"SIGNED_DAY_EPOCH_FULL_REGISTRY_READONLY_NO_DISPATCH";runDayIndex:number;indexRevision:number;indexSha256:string;observedDbClockUtc:string;externalEd25519ReviewerVerified:true;restrictedPrivatePg16ReaderVerified:true;actualPrivateRegistryBytesRead:true;providerCalls:0;databaseWrites:0;githubChildDispatches:0;phase6PaidGo:false};
 readonly privateCurrentIndexBytes:Buffer;readonly privatePreviousIndexBytes:Buffer|null;readonly privateParsedIndex:unknown;readonly getFrozen:(path:string)=>Buffer}>;
