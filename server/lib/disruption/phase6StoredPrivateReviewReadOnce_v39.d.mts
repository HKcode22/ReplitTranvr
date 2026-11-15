type Selector={kind:"CURRENT_DAY";runDayIndex:number}|
 {kind:"EXACT_DAY";runDayIndex:number;indexRevision:number;indexSha256:string}|
 {kind:"SOURCE_QUERY"|"POST";runDayIndex:number;shardIndex:number;logicalPath:string;contentSha256:string};
export function readP6StoredPrivateReviewOnce(input:{
 client:{query:(sql:string,values?:any[])=>Promise<any>};trust:Record<string,unknown>;selector:Selector;
 scope:{privateStoredReviewReadOnlyApproved:boolean;existingPaidDispatchApproved:boolean}
}):Promise<{status:string;kind:"DAY_INDEX"|"SOURCE_QUERY_PACKET"|"POST_PACKET";providerCalls:0;databaseWrites:0;githubDispatches:0;paidPhase6Go:false;
 readonly pins:Record<string,unknown>;readonly wire:{review:Record<string,unknown>;signatureBase64:string};readonly publicKeyPem:string}>;
