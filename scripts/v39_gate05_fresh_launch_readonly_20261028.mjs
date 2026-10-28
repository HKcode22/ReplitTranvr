/**
 * Gate05 fresh prospect LIVE READ-ONLY preparation (one command).
 *
 * GitHub main is authoritative for source. This script may be piped from
 * "git show FETCH_HEAD:scripts/..." to plain node --input-type=module.
 * No provider SDK/key, paid POST/GET, provider CREATE/DELETE/refill, DB DDL,
 * SQL writes, gh mutation or Replit timer. Published DB identity challenge
 * is a documented POST that explicitly does no DB/provider mutation.
 *
 * A successful source/custody check is NOT a scientific PASS or a paid GO:
 * new exact-scoped signed owner, independent live STOP, credit balance and
 * prospective same-flight PRE/POST FIDS are separate mandatory controls.
 */
import pg from "pg";
import {randomUUID,createHmac} from "node:crypto";

const PUBLISHED="https://replit-tranvr--hk84164.replit.app";
const HEX40=/^[a-f0-9]{40}$/;
const expected=String(process.env.GATE05_EXPECTED_SOURCE_SHA??"").trim();
const reasons=[];
const output={
 schema:"v39.gate05.fresh-one-command-readiness.v1",
 reviewedGitHubSource:HEX40.test(expected)?expected:null,
 publishedHealthPass:false,
 publishedSource:null,
 publishedSourceMatchesReviewed:false,
 publishedCallbackOnly:false,
 publishedCustodyOptIn:false,
 databaseIdentityMatched:false,
 liveDatabaseProof:false,
 loggedOwnerSchemaPresent:false,
 loggedDeliveryJournalPresent:false,
 loggedDeliveryJournalDurable:false,
 nonterminalScienceOwners:null,
 historicalPaidOwnerClosed:null,
 noProviderApiCalls:true,
 noPaidFidsGets:true,
 noAlertCreateDeleteOrRefill:true,
 noDatabaseWrites:true,
 noGithubMutations:true,
 independentStopArmedByThisCheck:false,
 paidAuthorizationGeneratedByThisCheck:false,
 scientificGate05Passed:false,
 canStartPaidNow:false,
 blockers:reasons
};
const limitError=err=>{
  const e=err instanceof Error?err.message:String(err);
  // Only short local category, never transport/SQL error text (may leak URL).
  return /timeout/i.test(e)?"TIMEOUT":/authentication|password/i.test(e)?
    "AUTHENTICATION_FAILED":"READ_UNAVAILABLE";
};
const client=new pg.Client({
 connectionString:process.env.DATABASE_URL||"postgresql://missing.invalid/hold",
 connectionTimeoutMillis:6500,query_timeout:7500,
 statement_timeout:7500,
 options:"-c default_transaction_read_only=on",
 application_name:"gate05_future_readonly_launch_audit"
});
try{
  if(!HEX40.test(expected))reasons.push("MISSING_EXACT_GITHUB_MAIN_PIN");
  let health=null;
  try{
    const h=await fetch(PUBLISHED+"/__v39/workspace-runtime",{
      method:"GET",redirect:"error",cache:"no-store",
      signal:AbortSignal.timeout(12000)
    });
    if(h.status===200)health=await h.json();
  }catch{reasons.push("PUBLISHED_RECEIVER_READ_UNAVAILABLE");}
  if(!health)reasons.push("PUBLISHED_HEALTH_NOT_PASS");
  else{
    output.publishedHealthPass=health.status==="PASS" &&
      health.published_deployment===true &&
      health.provider_mutation===false;
    output.publishedSource=typeof health.git_head==="string" &&
      HEX40.test(health.git_head)?health.git_head:null;
    output.publishedSourceMatchesReviewed=
      output.publishedHealthPass && output.publishedSource===expected;
    output.publishedCallbackOnly=health.prepaid_route_registered===true;
    output.publishedCustodyOptIn=health.gate05_durable_custody_ready===true;
    if(!output.publishedHealthPass)reasons.push("PUBLISHED_RUNTIME_NOT_PASS");
    if(!output.publishedSourceMatchesReviewed)
      reasons.push("PUBLISHED_SOURCE_DOES_NOT_MATCH_REVIEWED_MAIN");
    if(!output.publishedCallbackOnly)reasons.push("PUBLISHED_CALLBACK_ROUTE_ABSENT");
    if(!output.publishedCustodyOptIn)
      reasons.push("PUBLISHED_GATE05_DURABLE_CUSTODY_DISABLED_OR_OLD");
  }
  const admin=process.env.DATABASE_URL||"";
  const runtime=process.env.V39_DATABASE_RUNTIME_URL||"";
  if(!admin||!runtime){
    reasons.push("REPLIT_RUNTIME_AND_ADMIN_DB_URLS_REQUIRED");
  }else{
    try{
      const a=new URL(admin),b=new URL(runtime);
      output.databaseIdentityMatched=
        ["postgres:","postgresql:"].includes(a.protocol) &&
        a.hostname===b.hostname&&a.pathname==="/neondb"&&
        b.pathname==="/neondb" &&
        !a.username.includes("reader");
    }catch{}
    if(!output.databaseIdentityMatched){
      reasons.push("ADMIN_AND_PUBLISHED_DATABASE_IDENTITY_MISMATCH");
    }else{
      // Existing published endpoint proves shared runtime DB secret,
      // without sending the credential or modifying published SQL.
      try{
        const challenge="gate05-readonly-"+randomUUID();
        const proof=createHmac("sha256",runtime)
          .update("phase2g-db-binding:"+challenge).digest("hex");
        const answer=await fetch(
          PUBLISHED+"/__v39/phase2g/runtime-db-binding",{
            method:"POST",redirect:"error",cache:"no-store",
            headers:{
              "x-v39-phase2g-db-challenge":challenge,
              "x-v39-phase2g-db-proof":proof
            },
            signal:AbortSignal.timeout(10000)
          });
        if(answer.status===200){
          const x=await answer.json();
          output.liveDatabaseProof=x.schema===
            "v39.phase2g-runtime-db-binding.v1"&&
            x.status==="PASS"&&x.provider_call===false&&
            x.provider_mutation===false&&x.database_mutation===false&&
            Number(x.alert_credits_spent)===0;
        }
      }catch{}
      if(!output.liveDatabaseProof)
        reasons.push("PUBLISHED_DB_BINDING_NOT_INDEPENDENTLY_PROVEN");
      try{
        await client.connect();
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
        const q=await client.query(
          "SELECT current_database() AS db,pg_is_in_recovery() AS replica,"+
          "to_regclass('clean.phase3_gate05_science_owner_v39')::text AS owner,"+
          "to_regclass('clean.gate05_science_delivery_custody_v39')::text AS journal");
        const row=q.rows[0];
        if(row?.db!=="neondb"||row?.replica!==false)
          reasons.push("WRONG_OR_REPLICA_DATABASE");
        output.loggedOwnerSchemaPresent=Boolean(row?.owner);
        output.loggedDeliveryJournalPresent=Boolean(row?.journal);
        if(!output.loggedOwnerSchemaPresent)
          reasons.push("STAGED_V0074_OWNER_NOT_INSTALLED");
        if(!output.loggedDeliveryJournalPresent)
          reasons.push("STAGED_V0075_JOURNAL_NOT_INSTALLED");
        if(row?.journal){
          const k=await client.query(
            "SELECT relpersistence,relkind FROM pg_class WHERE oid="+
            "'clean.gate05_science_delivery_custody_v39'::regclass");
          output.loggedDeliveryJournalDurable=
            k.rows[0]?.relpersistence==="p"&&k.rows[0]?.relkind==="r";
          if(!output.loggedDeliveryJournalDurable)
            reasons.push("CUSTODY_JOURNAL_IS_NOT_DURABLE_LOGGED_TABLE");
        }
        if(row?.owner){
          const c=await client.query(
            "SELECT count(*) FILTER (WHERE state IN ('PREPARED','ACTIVE'))::int AS open,"+
            "count(*) FILTER (WHERE session_id="+
            "'e69ffa34-d8a6-456f-a49c-9dd459e6d294'::uuid "+
            "AND state='STOPPED')::int AS historical_closed "+
            "FROM clean.phase3_gate05_science_owner_v39");
          output.nonterminalScienceOwners=c.rows[0]?.open??null;
          output.historicalPaidOwnerClosed=c.rows[0]?.historical_closed===1;
          if(output.nonterminalScienceOwners!==0)
            reasons.push("UNSETTLED_NEW_SCIENCE_OWNER_ALREADY_EXISTS");
          if(output.historicalPaidOwnerClosed!==true)
            reasons.push("HISTORICAL_PAID_SCOPE_NOT_CONFIRMED_STOPPED");
        }
        await client.query("ROLLBACK");
      }catch(e){
        reasons.push("READ_ONLY_DATABASE_PREFLIGHT_"+limitError(e));
      }finally{await client.end().catch(()=>undefined);}
    }
  }
  // Even if all infrastructure is ready, this does not attest latest FREE
  // provider balance, new signed owner/credits, ARMED STOP, scheduled
  // same-cohort FIDS T-24h/T-6h/T-90m or actual-vs-estimated source truth.
  if(reasons.length===0){
    reasons.push("NEW_ONE_USE_OWNER_AND_INDEPENDENT_STOP_NOT_YET_VERIFIED");
    reasons.push("FIDS_PRE_POST_SAME_COHORT_AND_LABEL_SOURCE_NOT_PROVEN");
  }
}catch{reasons.push("AUDIT_UNEXPECTED_READ_FAILURE");}
output.blockers=[...new Set(reasons)];
output.status=output.blockers.some(s=>/PUBLISHED|DATABASE|V0074|V0075|CUSTODY/.test(s))?
  "HOLD_PUBLISHED_OR_DATABASE_RELEASE":
  "HOLD_NEW_EXACT_SCOPE_STOP_AND_SCIENCE";
console.log(JSON.stringify(output,null,2));
process.exitCode=output.canStartPaidNow?0:2;
