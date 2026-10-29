/**
 * Metadata-only Phase4 Gate5 source audit. No provider HTTP, no paid spend,
 * no persistent artifacts, no raw flight data on stdout, and NO Gate5 PASS.
 * Exact one-shot operator opt-in required BEFORE dedicated DB connection.
 *
 * PHASE4_READONLY_REVIEWED_GO=METADATA_ONLY_NO_PROVIDER
 * PHASE4_READONLY_AIRPORT=WSSS
 * PHASE4_READONLY_START_UTC=...
 * PHASE4_READONLY_END_UTC=...
 * PHASE4_READONLY_TIER=HUB
 * PHASE4_READONLY_REGION=AS
 *
 * Not placed in scheduled GitHub Action: the connected production database
 * and source retention are not yet authorized or proven for public CI.
 */
import {readPhase4Gate5CandidateEvidenceV39,validateGate5ReadScopeV39,
 type Gate5ReadScope} from "../server/lib/disruption/phase4Gate5ReadOnlySource_v39";

async function main():Promise<number>{
 if(process.env.PHASE4_READONLY_REVIEWED_GO!=="METADATA_ONLY_NO_PROVIDER"){
   console.log(JSON.stringify({schema:"v39.phase4.gate5-readonly-operator.v1",
     status:"HOLD_EXPLICIT_REVIEWED_READONLY_OPTIN_REQUIRED",providerCalls:0,databaseWrites:0}));
   return 2;
 }
 const scope:Gate5ReadScope={
   airport:process.env.PHASE4_READONLY_AIRPORT??"",
   tier:process.env.PHASE4_READONLY_TIER??"",
   region:process.env.PHASE4_READONLY_REGION??"",
   startUtc:process.env.PHASE4_READONLY_START_UTC??"",
   endUtc:process.env.PHASE4_READONLY_END_UTC??"",
   readAsOfUtc:new Date().toISOString()
 };
 validateGate5ReadScopeV39(scope);
 // Dynamic import must occur AFTER opt-in and scope validation.
 const {v39Pool}=await import("../server/lib/disruption/db_v39");
 const client=await v39Pool.connect();
 let begun=false;
 try{
   await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
   begun=true;
   await client.query("SET LOCAL statement_timeout = '8000ms'");
   const evidence=await readPhase4Gate5CandidateEvidenceV39(client,scope);
   const out={
     schema:"v39.phase4.gate5-readonly-operator.v1",
     status:evidence.status,
     sourceCounts:evidence.counts,
     horizonSummaries:evidence.report.horizons.map(h=>({
       horizon:h.horizon,populationCandidate:h.population,
       snapshotExpectedCandidate:h.expectedSnapshots,snapshotCreatedCandidate:h.createdSnapshots,
       capturedCandidate:h.webhookCaptured,outsideObservedFidsCandidate:h.capturedOutsidePopulation,
       knownFidsButNotCutoffEligible:h.capturedWithPrimaryButNotCutoffEligible,
       firstFidsAfterCutoff:h.firstFidsAfterCutoff,
       noVerifiedT:h.noVerifiedT,
       violations:h.violations.length
     })),
     strictGate5Passed:false,
     firstTSourceSemanticsProven:false,
     sourceCompletenessProven:false,
     originalGate05SciencePassed:false,
     phase6Authorized:false,
     providerCalls:0,databaseWrites:0
   };
   console.log(JSON.stringify(out));
   return 2; // An evidence-only report never returns production Gate5 PASS.
 }finally{
   if(begun)await client.query("ROLLBACK").catch(()=>undefined);
   client.release();
 }
}
main().then(code=>{process.exitCode=code;}).catch(()=>{
 // No SQL/detail/raw payload/credential error logging in the public channel.
 console.error("GATE5_READONLY_SOURCE_AUDIT_HOLD_REVIEW_CONNECTION_OR_SCHEMA");
 process.exitCode=2;
});
