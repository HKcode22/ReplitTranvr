/** Fixed metadata only; no exception messages, queries, identifiers or DSNs. */
const STAGES=new Set(["PROOF_RESOLVER_OPEN","CODE_LINEAGE","RELEASE_ADMISSION","READ_DUE_ROSTERS","ROSTER_IDENTITY_CHECK","WORKER_POOL_SETUP","SIGNED_WORKER_EXECUTION","WORKER_POOL_CLOSE","PROOF_RESOLVER_CLOSE"]);
export function classifyP6CurrentPreFailure(stage,error){
 const code=error&&typeof error==="object"?error.code:undefined;
 const category=code==="57014"?"DB_QUERY_CANCELLED_OR_TIMEOUT":code==="55P03"?"DB_LOCK_UNAVAILABLE":code==="40001"?"DB_SERIALIZATION_CONFLICT":code==="40P01"?"DB_DEADLOCK":code==="42501"?"DB_PERMISSION_DENIED":typeof code==="string"&&/^08[A-Z0-9]{3}$/.test(code)?"DB_CONNECTION_FAILURE":["ETIMEDOUT","ECONNRESET","ECONNREFUSED","EPIPE"].includes(code)?"TRANSPORT_FAILURE":"UNCLASSIFIED_REDACTED";
 return {status:"HOLD_P6_CURRENT_PRIVATE_LATER_PRE_REDACTED_NO_REPLAY",stage:STAGES.has(stage)?stage:"UNKNOWN_STAGE",category,providerCalls:0,commitOutcomeInferred:false,replayAuthorized:false};
}
