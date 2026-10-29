/**
 * Exact Gate05 WSSS completed-hour ORIGINAL RAW custody & sample audit.
 * Run once in AUTHENTICATED Replit Workspace shell with Node 20 + tsx.
 * Database is READ ONLY; reads only original dedicated object-storage blobs.
 * No provider API, no CREATE/DELETE, no SQL writes, no raw or flight data
 * printed or written to disk. A strict scientific PASS is impossible here.
 *
 * Important: this is not a repair/replay or a source-semantic waiver.
 */
import "dotenv/config";
import pg from "pg";
import {createRequiredProviderBlobStoreV39} from
  "../server/lib/disruption/replitProviderBlobStore_v39.ts";
import {adaptGate05LoggedJournalToCensusV39} from
  "../server/lib/disruption/gate05LoggedJournalCensusAdapter_v39.ts";
import {censusGate05ObservedPilotV39} from
  "../server/lib/disruption/gate05ObservedSampleCensus_v39.ts";

const SCOPE="618582a3-ea3f-4a10-a756-c974c472af3c";
const RECEIVER="84b7f1565d0402facc8c3b9aacedc599eb6e2af1";
const AUTH="1fcded99e76cc974dc518495bd127000a3a7a9cb4344e41b6b89cb9e01b98b23";
const TICKET="cd93866bc18a2d1368981837d4af8c036094e421c7d30dd03570e0b611f43746";
const START="2026-10-29T03:45:00.000Z";
const STOP="2026-10-29T04:45:00.000Z";
const ACTUAL_START="2026-10-29T03:45:06.539Z";
const STOP_VERIFIED="2026-10-29T04:45:11.062Z";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HASH=/^[a-f0-9]{64}$/;
const OBJECT=/^v39\/provider\/raw_provider_content\/[a-f0-9]{2}\/[a-f0-9-]{36}\.blob$/;
const hold=code=>{throw Error("GATE05_RAW_READONLY_"+code);};
const yes=(check,code)=>{if(!check)hold(code);};
const iso=x=>new Date(x).toISOString();
const dbUrl=String(process.env.DATABASE_URL??"");
const info={
 schema:"v39.gate05.wsss-28-original-raw-readonly-audit.v1",
 scope:SCOPE,
 status:"NOT_STARTED", stage:"ENV",
 expectedJournalDeliveries:28,expectedJournalItems:151,
 matchedOriginalBlobCount:0,matchedOriginalItemCount:0,
 processedJournalDeliveries:0,originalBlobCount:null,
 sourceBeforeActualExpiryCount:0,sourceExpiredCount:0,
 sourceMarkedDeletedCount:0,sourceDownloadOrHashFailures:0,
 metadataSourceConflicts:0, earliestActualBlobExpiryUtc:null,
 latestActualBlobExpiryUtc:null,firstReceivedUtc:null,lastReceivedUtc:null,
 candidateCompletedStatusItemCount:0,candidateAirborneLocationItemCount:0,
 candidateStatusItemsAreNOTUniqueOperatingFlights:true,
 exactProviderOriginalRawBytesHashVerified:false,
 originalReceivedNotificationCount151Verified:false,
 originalHttp2xxAcknowledgementProven:false,
 verifiedDistinctPhysicalOperatingLegs:null,
 verifiedCompletedPhysicalFlights:null,
 verifiedAirbornePhysicalFlights:null,
 verifiedUniqueUsableAirbornePoints:null,
 prospectiveSameCohortT24T6T90Proven:false,
 scheduledWheelsOffSourceVerified:false,
 actualWheelsOffSourceActualityVerified:false,
 scientificGate05StrictPassed:false,
 providerApiCalls:0,providerBillableCalls:0,
 databaseWrites:0,objectStorageMutations:0
};
let client=null,tx=false;
try{
 info.stage="ENV";
 yes(dbUrl.startsWith("postgres"),"DATABASE_URL_MISSING");
 yes(String(process.env.V39_PROVIDER_BLOB_MODE??"").toLowerCase()==="required",
   "DEDICATED_STORAGE_MODE_REQUIRED");
 const bucket=String(process.env.V39_PROVIDER_BLOB_BUCKET_ID??"");
 yes(/^(?:r?eplit-objstore-)/.test(bucket),"DEDICATED_BUCKET_MISSING");
 // Never use a default bucket, another production's DB, or old historic scope.
 const store=createRequiredProviderBlobStoreV39();
 info.stage="NEON_READONLY_SNAPSHOT";
 client=new pg.Client({connectionString:dbUrl,connectionTimeoutMillis:8000,
   query_timeout:15000,statement_timeout:15000,lock_timeout:3500,
   options:"-c default_transaction_read_only=on",
   application_name:"gate05_wsss_original_raw_final_readonly"});
 client.on("error",()=>{});
 await client.connect();
 await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
 tx=true;
 const who=(await client.query(
   "SELECT current_database() AS db,current_user AS actor,"+
   "current_setting('transaction_read_only') AS readonly")).rows[0];
 yes(who?.db==="neondb"&&who?.actor==="neondb_owner"&&
   who?.readonly==="on","WRONG_DB_OR_ROLE_OR_READONLY");
 const owners=(await client.query(
   "SELECT state,source_commit,authorization_sha256,reviewed_stop_ticket_sha256,"+
   "airport_icao,start_at_utc,stop_at_utc,provider_subscription_id,created_at_utc "+
   "FROM clean.phase3_gate05_science_owner_v39 WHERE session_id=$1::uuid",
   [SCOPE])).rows;
 yes(owners.length===1,"OWNER_NOT_UNIQUE");
 const owner=owners[0];
 yes(owner.source_commit===RECEIVER&&owner.authorization_sha256===AUTH&&
   owner.reviewed_stop_ticket_sha256===TICKET&&owner.airport_icao==="WSSS"&&
   iso(owner.start_at_utc)===START&&iso(owner.stop_at_utc)===STOP&&
   typeof owner.provider_subscription_id==="string"&&
   owner.provider_subscription_id.length>=8&&
   ["ACTIVE","STOPPED"].includes(owner.state),"FOREIGN_OWNER_OR_UNBOUND");
 info.ownerState=owner.state;
 const rows=(await client.query(
  "SELECT d.session_id::text,d.delivery_id,d.blob_ref_id::text,d.body_sha256,"+
  "d.item_count,d.receiver_attempt_at_utc,d.blob_persisted_at_utc,"+
  "d.committed_at_utc,d.raw_before_db_commit_verified,d.http_2xx_delivery_verified,"+
  "r.storage_kind,r.contract_version,r.content_class,r.content_sha256,"+
  "r.content_bytes,r.source_kind,r.source_record_id,r.object_name,"+
  "r.persisted_at_utc,r.expires_at_utc,r.deleted_at_utc,r.retention_hours "+
  "FROM clean.gate05_science_delivery_custody_v39 d "+
  "JOIN clean.provider_content_blob_ref r ON r.blob_ref_id=d.blob_ref_id "+
  "WHERE d.session_id=$1::uuid ORDER BY d.receiver_attempt_at_utc,d.delivery_id",
  [SCOPE])).rows;
 yes(rows.length===28&&rows.reduce((n,r)=>n+Number(r.item_count),0)===151,
   "LOGGED_DENOMINATOR_DIFFERENT_FROM_PREVIOUS_AUDIT");
 yes(rows.every(r=>iso(r.receiver_attempt_at_utc)>=START&&
   iso(r.receiver_attempt_at_utc)<STOP),"OUT_OF_WINDOW_DELIVERY");
 info.originalBlobCount=rows.length;
 const exp=rows.map(r=>iso(r.expires_at_utc)).sort();
 info.earliestActualBlobExpiryUtc=exp[0]??null;
 info.latestActualBlobExpiryUtc=exp.at(-1)??null;
 info.firstReceivedUtc=iso(rows[0].receiver_attempt_at_utc);
 info.lastReceivedUtc=iso(rows.at(-1).receiver_attempt_at_utc);
 await client.query("ROLLBACK");tx=false;
 await client.end();client=null;
 info.stage="DEDICATED_STORAGE_RAW_BYTES_ONLY";
 const all=[];
 for(const row of rows){
   info.processedJournalDeliveries++;
   const now=new Date().toISOString();
   if(row.deleted_at_utc!==null){info.sourceMarkedDeletedCount++;continue;}
   if(iso(row.expires_at_utc)<=now){info.sourceExpiredCount++;continue;}
   info.sourceBeforeActualExpiryCount++;
   const path=String(row.object_name??"");
   const id=String(row.blob_ref_id??"");
   if(!UUID.test(id)||!OBJECT.test(path)||!path.endsWith("/"+id+".blob")||
      !HASH.test(row.content_sha256)||!HASH.test(row.body_sha256)||
      row.content_sha256!==row.body_sha256||
      row.source_record_id!=="prepaid:"+SCOPE+":"+row.delivery_id||
      row.storage_kind!=="replit_app_storage"||
      row.contract_version!=="provider-blob-contract-v39@1.0.0"||
      row.content_class!=="raw_provider_content"||
      row.source_kind!=="webhook"||
      !Number.isSafeInteger(row.item_count)||row.item_count<0){
      info.metadataSourceConflicts++;continue;
   }
   try{
     const bytes=await store.downloadBytes(path);
     const value=adaptGate05LoggedJournalToCensusV39({
       expectedSessionId:SCOPE,
       expectedProviderSubscriptionId:owner.provider_subscription_id,
       originalCanonicalBytes:bytes,
       readBackAtUtc:new Date().toISOString(),
       source:{
         blobRefId:id,sourceKind:row.source_kind,
         sourceRecordId:row.source_record_id,
         contentClass:row.content_class,storageKind:row.storage_kind,
         contractVersion:row.contract_version,
         contentSha256:row.content_sha256,contentBytes:Number(row.content_bytes),
         persistedAtUtc:iso(row.persisted_at_utc),
         expiresAtUtc:iso(row.expires_at_utc),
         deletedAtUtc:null
       },
       journal:{
         sessionId:row.session_id,
         deliveryId:row.delivery_id,blobRefId:id,
         bodySha256:row.body_sha256,itemCount:Number(row.item_count),
         receiverAttemptAtUtc:iso(row.receiver_attempt_at_utc),
         blobPersistedAtUtc:iso(row.blob_persisted_at_utc),
         committedAtUtc:iso(row.committed_at_utc),
         rawBeforeDbCommitVerified:row.raw_before_db_commit_verified,
         http2xxDeliveryVerified:row.http_2xx_delivery_verified
       }
     });
     info.matchedOriginalBlobCount++;
     info.matchedOriginalItemCount+=value.loggedItemCount;
     all.push(...value.itemFacts);
     // These are *candidate status items*, NOT unique physical flights.
     // Repeat notifications and codeshares may be duplicated.
     const seen=value.itemFacts;
     info.candidateCompletedStatusItemCount+=
       seen.filter(x=>x.flightStage==="COMPLETED").length;
     info.candidateAirborneLocationItemCount+=
       seen.filter(x=>x.flightStage==="AIRBORNE"&&x.airbornePointUtc).length;
   }catch{
     // Includes absent object, authentication, canonical/hash mismatch.
     // Refuse synthetic rows or retrying the paid provider to fill missing.
     info.sourceDownloadOrHashFailures++;
   }
 }
 const complete=info.matchedOriginalBlobCount===28&&
   info.matchedOriginalItemCount===151;
 info.exactProviderOriginalRawBytesHashVerified=complete;
 info.originalReceivedNotificationCount151Verified=complete;
 if(complete){
   // Intentionally *no* fake physical IDs, ACK times or runway labels.
   const c=censusGate05ObservedPilotV39({
     frozenAtUtc:iso(owner.created_at_utc),
     observedSubscriptionStartUtc:ACTUAL_START,
     exactProviderDeletionVerifiedAtUtc:STOP_VERIFIED,
     plannedEndUtc:STOP,
     evidenceSourceReviewed:false,
     items:all
   });
   info.censusInWindowRawItemCount=c.inWindowReceivedItemCount;
   info.censusOriginalRawAckItemsWithIndependentProof=c.rawBefore2xxItems;
   info.censusIdentityQualifiedPhysicalLegCountIsZeroBecauseEvidenceUnknown=
     c.sourceQualifiedPhysicalFlights===0;
   info.censusKnownEvidenceDeficits=c.deficits;
   info.censusSourceIntegrityFindings=c.integrityFindings;
 }
 info.status=complete?
   "ALL_28_ORIGINAL_BYTES_SHA_AND_151_ITEMS_VERIFIED_SCIENCE_NOT_CERTIFIED":
   "PARTIAL_ORIGINAL_SOURCE_RECOVERY_EVIDENCE_HOLD";
 info.stage="COMPLETE";
 console.log(JSON.stringify(info));
 if(!complete)process.exitCode=2;
}catch{
 console.log(JSON.stringify({...info,status:"GATE05_FINAL_READONLY_VERIFICATION_HOLD",
   stageWhereHeld:info.stage,sourceContentsNeverPrinted:true,
   originalStrictSciencePassed:false}));
 process.exitCode=2;
}finally{
 if(client){if(tx)await client.query("ROLLBACK").catch(()=>{});
   await client.end().catch(()=>{});}
}
