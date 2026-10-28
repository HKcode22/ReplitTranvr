/**
 * Gate05: project a REAL LOGGED delivery journal + hash-validated original
 * Replit App Storage bytes to the observed-item sample census after a
 * PostgreSQL UNLOGGED reset. No DB, network, provider or mutation.
 *
 * Journal must have been inserted by the exact science receiver together
 * with the original blob-ref, before the callback could return HTTP 2xx.
 * This does NOT prove an HTTP 2xx was actually delivered upstream.
 *
 * Flight identity, state transition clocks and exact runway label remain
 * independently unverified even though notification COUNT can be recovered.
 */
import {recoverGate05SourceFromLoggedRefV39,
  type Gate05RawRehydrationInputV39}
  from "./gate05LoggedRawRecovery_v39";
import type {Gate05RawItemV39} from "./gate05ObservedSampleCensus_v39";
export const GATE05_LOGGED_JOURNAL_CENSUS_VERSION =
  "v39.gate05.logged-journal-census.v1" as const;
const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const read=(v:string,name:string)=>{
  if(typeof v!=="string"||!ISO.test(v))throw Error("GATE05_JOURNAL_CLOCK_"+name);
  const t=Date.parse(v);
  if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,19)!==v.slice(0,19))
    throw Error("GATE05_JOURNAL_CLOCK_"+name);
  return t;
};
export type Gate05LoggedJournalV39=Readonly<{
  sessionId:string;
  deliveryId:string;
  blobRefId:string;
  bodySha256:string;
  itemCount:number;
  receiverAttemptAtUtc:string;
  blobPersistedAtUtc:string;
  committedAtUtc:string;
  rawBeforeDbCommitVerified:true;
  http2xxDeliveryVerified:false;
}>;
export type Gate05LoggedCensusInputV39=Readonly<
  Gate05RawRehydrationInputV39 & {journal:Gate05LoggedJournalV39}
>;
export function adaptGate05LoggedJournalToCensusV39(x:Gate05LoggedCensusInputV39):
Readonly<{
  schema:typeof GATE05_LOGGED_JOURNAL_CENSUS_VERSION;
  result:"SOURCE_BYTES_AND_LOGGED_RECEIPT_VERIFIED_ACK_AND_PHYSICAL_ID_UNKNOWN";
  inWindowClassificationRequiresSubscriptionWindow:true;
  loggedItemCount:number;
  itemFacts:readonly Gate05RawItemV39[];
  receiverAttemptClockFromLoggedDb:true;
  originalRawBytesHashChecked:true;
  independentPhysicalFlightIdentity:false;
  actualHttp2xxAcknowledgementVerified:false;
  independentRunwaySourceVerified:false;
  scientificPass:false;
  providerCalls:0;
  databaseWrites:0;
}>{
  if(!x||!x.journal||!x.source)
    throw Error("GATE05_JOURNAL_MISSING_SOURCE");
  const j=x.journal,source=x.source;
  const prefix="prepaid:"+x.expectedSessionId+":";
  if(j.sessionId!==x.expectedSessionId ||
     j.deliveryId!==source.sourceRecordId.slice(prefix.length) ||
     !source.sourceRecordId.startsWith(prefix)||
     j.blobRefId!==source.blobRefId||
     !SHA.test(j.bodySha256)||j.bodySha256!==source.contentSha256||
     j.rawBeforeDbCommitVerified!==true||
     j.http2xxDeliveryVerified!==false||
     !Number.isSafeInteger(j.itemCount)||
     j.itemCount<0||j.itemCount>5000)
    throw Error("GATE05_JOURNAL_SOURCE_IDENTITY_MISMATCH");
  const at=read(j.receiverAttemptAtUtc,"receiver");
  const persisted=read(j.blobPersistedAtUtc,"blob");
  const committed=read(j.committedAtUtc,"committed");
  if(new Date(persisted).toISOString()!==
       new Date(read(source.persistedAtUtc,"source")).toISOString()||
     at>committed+180_000||persisted>committed+180_000||
     at>read(x.readBackAtUtc,"audit")||
     committed>read(x.readBackAtUtc,"audit")+180_000)
    throw Error("GATE05_JOURNAL_SOURCE_CLOCK_CONFLICT");
  const original=recoverGate05SourceFromLoggedRefV39(x);
  if(original.callbackItemCount!==j.itemCount ||
     original.observations.length!==j.itemCount)
    throw Error("GATE05_JOURNAL_ITEM_COUNT_MISMATCH");
  const items:Gate05RawItemV39[]=original.observations.map(p=>({
    envelopeId:p.envelopeId,
    itemOrdinal:p.itemOrdinal,
    rawSha256:p.rawSha256,
    receivedAtUtc:new Date(at).toISOString(), // logged RECEIVER attempt, not blob time
    rawDurableAtUtc:new Date(persisted).toISOString(),
    http2xxAtUtc:null,
    physicalFlightId:null,
    identityBasis:"UNKNOWN",
    codeshareRole:p.codeshareRole,
    flightStage:p.flightStage,
    airbornePointUtc:p.airbornePointUtc,
    terminalStateUpdatedAtUtc:null
  }));
  return {
    schema:GATE05_LOGGED_JOURNAL_CENSUS_VERSION,
    result:"SOURCE_BYTES_AND_LOGGED_RECEIPT_VERIFIED_ACK_AND_PHYSICAL_ID_UNKNOWN",
    inWindowClassificationRequiresSubscriptionWindow:true,
    loggedItemCount:items.length,itemFacts:items,
    receiverAttemptClockFromLoggedDb:true,originalRawBytesHashChecked:true,
    independentPhysicalFlightIdentity:false,
    actualHttp2xxAcknowledgementVerified:false,
    independentRunwaySourceVerified:false,scientificPass:false,
    providerCalls:0,databaseWrites:0
  };
}
