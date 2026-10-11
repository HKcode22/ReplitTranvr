/**
 * P14: aggregate ONLY stored original bytes, not upstream provider sent events.
 *
 * Pure 30-object audit helper. No DB, storage SDK, provider auth/credits,
 * network calls, subscription writes, file output, or original identifiers.
 *
 * Each source is verified against its immutable LOGGED bytes+SHA contract
 * by the caller and AGAIN here, then parsed using production original JSON
 * duplicate-key/UTF-8 guard. Saved content is canonical JSON; it is NOT
 * claimed to be the provider's literal original HTTP wire representation.
 */
import {createHash} from "node:crypto";
import {assertPrepaidOriginalJsonStructureV39} from
  "../server/lib/disruption/prepaidOriginalJsonStructure_v39";
const HEX=/^[0-9a-f]{64}$/;
const digest=(x:Uint8Array)=>createHash("sha256").update(x).digest("hex");
const canonical=(v:any):string=>{
  if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
};
export type PreservedOriginalSourceV39=Readonly<{
  contentSha256:string;contentBytes:number;storedBytes:Uint8Array;
}>;
export type PreservedOriginalItemEvidenceV39=Readonly<{
  schema:"v39.p14-saved-original-item-evidence.v1";
  originalStorageReferencesVerified:number;
  uniqueCanonicalSourceObjects:number;
  duplicateCanonicalSourceObjectReferences:number;
  notificationItemsInSavedObjects:number;
  explicitCostCreditClaimTotal:number;
  sourceObjectsWithExplicitCostClaim:number;
  sourceObjectsWithoutExplicitCostClaim:number;
  sourceObjectsWithItemCostDisagreement:number;
  sourceObjectsWithInvalidCostClaim:number;
  originalSavedContentRepresentation:"CANONICAL_PARSED_JSON_NOT_LITERAL_HTTP_WIRE";
  senderCreditClaimSource:"SAVED_NOTIFICATION_BODY_UNAUTHENTICATED";
  independentUpstreamSenderAttemptCount:null;
  independentUpstreamBilledFlightItemCredits:null;
  upstreamProviderAttemptsNotSeen:null;
  providerBillingVersusInternalExactMatch:null;
  actualProvider260Versus259CauseResolved:false;
  externalOriginalWireBytesAuthenticated:false;
  sourceContentReconstructionDoesNotProveOriginalPostArrivalUtc:true;
  canDeclareF8Complete:false;
  canAuthorizePaidLaunch:false;
  providerCalls:0;databaseReads:0;databaseMutations:0;storageMutations:0;
}>;
export function summarizePreservedOriginalItemEvidenceV39(
  originals:readonly PreservedOriginalSourceV39[]
):PreservedOriginalItemEvidenceV39{
  if(!Array.isArray(originals)||originals.length===0||originals.length>1000)
    throw Error("P14_PRESERVED_ORIGINAL_REFERENCE_COUNT_INVALID");
  const seen=new Set<string>();
  let items=0n,credits=0n,withCost=0,withoutCost=0,disagree=0,invalidCost=0;
  for(const source of originals){
    if(!(source.storedBytes instanceof Uint8Array)||
      source.storedBytes.length===0||source.storedBytes.length>2*1024*1024||
      !HEX.test(source.contentSha256)||
      !Number.isSafeInteger(source.contentBytes)||
      source.contentBytes!==source.storedBytes.byteLength||
      digest(source.storedBytes)!==source.contentSha256)
      throw Error("P14_PRESERVED_ORIGINAL_SHA_OR_BYTES_INVALID");
    assertPrepaidOriginalJsonStructureV39(source.storedBytes);
    let body:any;
    try{
      body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(source.storedBytes));
    }catch{throw Error("P14_PRESERVED_ORIGINAL_JSON_INVALID");}
    if(!body||typeof body!=="object"||
      (!Array.isArray(body)&&!Array.isArray(body.flights)))
      throw Error("P14_PRESERVED_ORIGINAL_FLIGHT_ENVELOPE_INVALID");
    const expected=Buffer.from(canonical(body),"utf8");
    if(!expected.equals(Buffer.from(source.storedBytes)))
      throw Error("P14_PRESERVED_ORIGINAL_NOT_CANONICAL");
    const flights=Array.isArray(body)?body:body.flights;
    if(flights.some((f:any)=>!f||typeof f!=="object"||Array.isArray(f)))
      throw Error("P14_PRESERVED_ORIGINAL_FLIGHT_ITEM_INVALID");
    items+=BigInt(flights.length);
    seen.add(source.contentSha256);
    const cost=Array.isArray(body)?undefined:body?.deliveryAttempt?.costCredits;
    if(cost===undefined||cost===null){
      withoutCost++;
    }else if(typeof cost!=="number"||!Number.isSafeInteger(cost)||cost<0){
      invalidCost++;
    }else{
      withCost++;
      credits+=BigInt(cost);
      if(cost!==flights.length)disagree++;
    }
  }
  if(items>BigInt(Number.MAX_SAFE_INTEGER)||
    credits>BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("P14_PRESERVED_ORIGINAL_CREDIT_OR_ITEMS_TOTAL_UNSAFE");
  return {
    schema:"v39.p14-saved-original-item-evidence.v1",
    originalStorageReferencesVerified:originals.length,
    uniqueCanonicalSourceObjects:seen.size,
    duplicateCanonicalSourceObjectReferences:originals.length-seen.size,
    notificationItemsInSavedObjects:Number(items),
    explicitCostCreditClaimTotal:Number(credits),
    sourceObjectsWithExplicitCostClaim:withCost,
    sourceObjectsWithoutExplicitCostClaim:withoutCost,
    sourceObjectsWithItemCostDisagreement:disagree,
    sourceObjectsWithInvalidCostClaim:invalidCost,
    originalSavedContentRepresentation:"CANONICAL_PARSED_JSON_NOT_LITERAL_HTTP_WIRE",
    senderCreditClaimSource:"SAVED_NOTIFICATION_BODY_UNAUTHENTICATED",
    independentUpstreamSenderAttemptCount:null,
    independentUpstreamBilledFlightItemCredits:null,
    upstreamProviderAttemptsNotSeen:null,
    providerBillingVersusInternalExactMatch:null,
    actualProvider260Versus259CauseResolved:false,
    externalOriginalWireBytesAuthenticated:false,
    sourceContentReconstructionDoesNotProveOriginalPostArrivalUtc:true,
    canDeclareF8Complete:false,canAuthorizePaidLaunch:false,
    providerCalls:0,databaseReads:0,databaseMutations:0,storageMutations:0
  };
}
