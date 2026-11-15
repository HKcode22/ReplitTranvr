/** Type declarations for the exact private reader scope implementation. */
export function assertP6CurrentPrivatePreMode(env:NodeJS.ProcessEnv):Readonly<{
 independentStudyTrustPinsApproved:true;
 expectedReaderSessionLogin:string;
 reviewedCodeSha:string;
 manifestSha256:string;
 calendarSha256:string;
 releaseSha256:string;
 rightsSha256:string;
 dayReviewerFingerprintSha256:string;
 dayReviewerPublicKeyPem:string;
 queryReviewerFingerprintSha256:string;
 queryReviewerPublicKeyPem:string;
}>;
export function readP6ScopedCurrentPrivateRosterDigest(env:NodeJS.ProcessEnv):string;
export function withP6AuthenticatedCurrentPrivateRoster<T>(input:{
 client:unknown;env:NodeJS.ProcessEnv;
 selector:{runDayIndex:number;indexRevision:number;shardIndex:number;indexSha256:string;laterRegistrySha256:string};
 policy:{independentLaterQueueTransportProjectionApproved:boolean;existingPaidDispatchApproved:boolean;independentlyApprovedStandaloneProtocolSha256?:string};
 expectedUnchangedRosterDigest?:string;
},work:(projection:any)=>Promise<T>):Promise<T>;

export function readP6UnchangedCurrentPreRoster(input:{
 client:unknown;env:NodeJS.ProcessEnv;
 selector:{runDayIndex:number;indexRevision:number;shardIndex:number;indexSha256:string;laterRegistrySha256:string};
 policy:{independentLaterQueueTransportProjectionApproved:boolean;existingPaidDispatchApproved:boolean;independentlyApprovedStandaloneProtocolSha256?:string};
 expectedUnchangedRosterDigest:string;
}):Promise<{selector:{runDayIndex:number;indexRevision:number;shardIndex:number;indexSha256:string;laterRegistrySha256:string};projection:any}>;
