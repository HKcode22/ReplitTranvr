/**
 * Phase4 Gate5 exact-main protected GitHub Actions source-body readback.
 *
 * No provider client, API credential, paid request, subscription or write.
 * All SQL is bounded, in one REPEATABLE READ READ ONLY transaction.
 * Only numerical aggregate status is reported; never raw JSON/hash/flight ID.
 */
import pg from "pg";
import {auditStoredDecodedFidsReadbackV39}
 from "../server/lib/disruption/phase4Gate5DecodedFidsReadback_v39";

const INTENT = "GATE5_FIDS_BODY_RETENTION_SCOPED_READONLY_NO_PROVIDER" as const;
const AIRPORTS = ["WSSS","YSSY"] as const;
export function requireP4FidsOriginalReadbackActionsContext(
 env:NodeJS.ProcessEnv
):{airports:typeof AIRPORTS}{
 if(env.GITHUB_ACTIONS!=="true" ||
    env.GITHUB_REF!=="refs/heads/main" ||
    env.GITHUB_EVENT_NAME!=="push" ||
    env.GITHUB_RUN_ATTEMPT!=="1" ||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??"") ||
    env.P4_FIDS_READBACK_EXACT_INTENT!==INTENT)
   throw Error("P4_FIDS_READBACK_ACTIONS_CONTEXT_HOLD");
 return {airports:AIRPORTS};
}

async function main():Promise<void>{
 const ctx=requireP4FidsOriginalReadbackActionsContext(process.env);
 const dbUrl=process.env.GATE05_AUTOMATION_DATABASE_URL;
 if(!dbUrl)throw Error("P4_FIDS_READBACK_PROTECTED_DB_READER_UNAVAILABLE");
 const client=new pg.Client({
   connectionString:dbUrl,
   application_name:"phase4_fids_original_body_readback_readonly",
   connectionTimeoutMillis:9000,query_timeout:10000
 });
 let begun=false;
 try{
   await client.connect();
   await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   begun=true;
   await client.query("SET LOCAL statement_timeout = '10000ms'");
   const asOfUtc=new Date().toISOString();
   const reports=[];
   for(const airport of ctx.airports){
     const r=await auditStoredDecodedFidsReadbackV39(client,{
       airport,readAsOfUtc:asOfUtc
     });
     reports.push({airport,...r});
   }
   // All returned fields are fixed-schema aggregate counts and Boolean flags.
   // No raw content, identities, provider credentials, DB URL, hashes or
   // source query identifiers are ever emitted to Actions logs.
   const invalid=reports.reduce((n,r)=>n+r.rejectedIntegrity,0);
   const verified=reports.reduce((n,r)=>n+r.bodyAndEnvelopeShaVerified,0);
   const bodyOnly=reports.reduce((n,r)=>n+r.bodyWithoutEnvelopeHash,0);
   const sampled=reports.reduce((n,r)=>n+r.sampled,0);
   console.log(JSON.stringify({
     schema:"v39.phase4.fids-original-readback-actions.v1",
     status:invalid>0?"SOURCE_BYTES_INTEGRITY_FAILURE_HOLD":
       sampled===0?"NO_LAWFULLY_RETAINED_SOURCE_UNMEASURABLE":
       verified===0?"NO_NEW_ENVELOPE_SOURCE_VERIFIED":
       "SOURCE_STORAGE_SAMPLE_CONSISTENT_NOT_PROVIDER_CERTIFIED",
     sourceAgeUpperBoundHours:24,
     samplesByAirport:reports,
     sampleCount:sampled,fullyCheckedSourceCount:verified,
     bodyOnlyLegacyCount:bodyOnly,corruptCount:invalid,
     originalHttpWireProven:false,
     independentProviderSignedOriginProven:false,
     actualVsEstimatedRunwayProven:false,
     scheduledPassengerScopeProven:false,
     strictGate5Passed:false,phase5FinalFreezePassed:false,
     phase6Authorized:false,providerCalls:0,databaseWrites:0
   }));
   if(invalid>0)process.exitCode=2;
 }finally{
   if(begun)await client.query("ROLLBACK").catch(()=>undefined);
   await client.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_gate5_decoded_fids_readback_actions.ts")){
 void main().catch(()=>{
   console.error("P4_FIDS_READBACK_HOLD_CONNECTION_SCHEMA_RETENTION_OR_PERMISSION");
   process.exitCode=2;
 });
}
