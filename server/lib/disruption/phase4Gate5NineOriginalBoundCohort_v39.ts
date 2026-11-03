/**
 * Future Phase4 Gate5 independent cohort closeout: require NINE original
 * source FIDS receipts (3 horizons x 3 exact frozen query slots) before
 * evaluating a generic airport-window PRE/webhook/outcome inventory.
 *
 * This is the missing connection between the merged V0076/V0077 original
 * request-frame readback and the cohort-wide generic read-only funnel.
 * One caller-owned REPEATABLE READ READ ONLY snapshot; no network, production
 * writes, source logging, activation or automatic scientific GO.
 *
 * A caller-supplied reviewed hash is NOT an independently signed GitHub pin.
 * Passing nine application-level integrity checks does NOT verify lawful
 * retention, per-flight first T, actual-only labels or a complete denominator.
 */
import {createHash} from "node:crypto";
import {draftP4Gate5ThreeHorizonGridV39}
 from "./phase4Gate5FrozenGridDraft_v39";
import {readP4Gate5OriginalRequestFrameV39,
 type P4G5OriginalFrameDbV39}
 from "./phase4Gate5OriginalRequestFrameReadOnly_v39";
import {auditP4FreshCohortV39,
 type P4FreshReadOnlyDbV39}
 from "./phase4Gate5FreshCohortReadOnly_v39";

export const P4_G5_NINE_ORIGINAL_COHORT_SCHEMA_V39 =
 "v39.phase4.gate5-nine-original-bound-future-cohort-audit.v1" as const;
const H=["T-24h","T-6h","T-90m"] as const;
type Horizon=typeof H[number];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
type Slot={horizon:Horizon;queryIndex:number;populationQueryId:string};
export interface P4G5NineOriginalReviewScopeV39{
 reviewedFrozenManifestBytes:string;
 independentlyReviewedManifestSha256:string;
 expectedCohortId:string;
 originalSourceSlots:readonly Slot[];
 readAsOfUtc:string;
}
export interface P4G5NineOriginalReadOnlyDbV39
 extends P4G5OriginalFrameDbV39,P4FreshReadOnlyDbV39 {}
function reject(why:string):never{
 throw Error("P4_G5_NINE_ORIGINAL_"+why+"_HOLD");
}
function at(x:unknown,kind:string):number{
 if(typeof x!=="string"||!UTC.test(x))reject("INVALID_"+kind);
 const n=Date.parse(x);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==x)
  reject("INVALID_"+kind);
 return n;
}
function validate(scope:P4G5NineOriginalReviewScopeV39){
 if(!scope||typeof scope.reviewedFrozenManifestBytes!=="string"||
    scope.reviewedFrozenManifestBytes.length>20000||
    !SHA.test(scope.independentlyReviewedManifestSha256)||
    !/^[A-Z][A-Z0-9_-]{7,79}$/.test(scope.expectedCohortId)||
    !Array.isArray(scope.originalSourceSlots)||
    scope.originalSourceSlots.length!==9)
  reject("REVIEW_SCOPE_OR_NINE_SLOTS");
 const read=at(scope.readAsOfUtc,"READ_ASOF");
 const computed=createHash("sha256")
  .update(scope.reviewedFrozenManifestBytes,"utf8").digest("hex");
 if(computed!==scope.independentlyReviewedManifestSha256)
  reject("MANIFEST_SHA");
 let p:unknown;
 try{p=JSON.parse(scope.reviewedFrozenManifestBytes)}catch{reject("MANIFEST_JSON")}
 if(!p||typeof p!=="object"||Array.isArray(p))reject("MANIFEST_OBJECT");
 const manifest=p as Record<string,unknown>;
 if(scope.reviewedFrozenManifestBytes!==JSON.stringify(manifest,null,2)+"\n"||
    manifest.cohortId!==scope.expectedCohortId||
    !manifest.grid||typeof manifest.grid!=="object"||
    Array.isArray(manifest.grid))reject("MANIFEST_CANONICAL");
 const g=manifest.grid as Parameters<typeof draftP4Gate5ThreeHorizonGridV39>[0];
 // Reuse the *same* Plan f.8 three-horizon timezone/DST/clock algorithm.
 const drafted=draftP4Gate5ThreeHorizonGridV39(g);
 if(drafted.queries.length!==9||
    H.some(h=>drafted.queries.filter(q=>q.horizon===h).length!==3)||
    read<at(g.serviceWindowEndUtc,"WINDOW_END"))
  reject("NON_NINE_GRID_OR_PRE_SERVICE_READ");
 const keyed=new Map<string,Slot>();
 const ids=new Set<string>();
 for(const slot of scope.originalSourceSlots){
  if(!slot||!H.includes(slot.horizon)||
     !Number.isInteger(slot.queryIndex)||
     slot.queryIndex<0||slot.queryIndex>2||
     !UUID.test(slot.populationQueryId))
    reject("BAD_SLOT");
  const key=slot.horizon+"|"+slot.queryIndex;
  if(keyed.has(key)||ids.has(slot.populationQueryId))
    reject("DUPLICATE_SLOT_OR_SOURCE_UUID");
  keyed.set(key,slot);ids.add(slot.populationQueryId);
 }
 // Re-derive every expected horizon/index, rather than trusting array order.
 const ordered:Slot[]=[];
 for(const h of H)for(let i=0;i<3;i++){
  const slot=keyed.get(h+"|"+i);
  if(!slot)reject("MISSING_EXPECTED_SLOT");
  ordered.push(slot);
 }
 return {g,ordered};
}
type SlotReceipt={
 horizon:Horizon;queryIndex:number;status:"MATCHED"|"MISSING_OR_EXPIRED";
};
export async function auditP4G5NineOriginalBoundCohortV39(
 db:P4G5NineOriginalReadOnlyDbV39,
 scope:P4G5NineOriginalReviewScopeV39
){
 const {g,ordered}=validate(scope);
 const receiptRows:SlotReceipt[]=[];
 let matched=0;
 for(const slot of ordered){
  const report=await readP4Gate5OriginalRequestFrameV39(db,{
   reviewedManifestBytes:scope.reviewedFrozenManifestBytes,
   independentlyReviewedManifestSha256:scope.independentlyReviewedManifestSha256,
   expectedCohortId:scope.expectedCohortId,
   horizon:slot.horizon,queryIndex:slot.queryIndex,
   populationQueryId:slot.populationQueryId,
   readAsOfUtc:scope.readAsOfUtc
  });
  if(report.status===
    "ORIGINAL_AND_FROZEN_REQUEST_APPLICATION_INTENT_MATCH_NOT_HTTP_CERTIFIED"){
   matched++;
   receiptRows.push({horizon:slot.horizon,queryIndex:slot.queryIndex,status:"MATCHED"});
  }else if(report.status==="ORIGINAL_SOURCE_BINDING_MISSING_EXPIRED_OR_UNMEASURABLE"){
   receiptRows.push({horizon:slot.horizon,queryIndex:slot.queryIndex,
    status:"MISSING_OR_EXPIRED"});
  }else reject("UNEXPECTED_SOURCE_ADJUDICATION");
 }
 const sourceOnly={
  schema:P4_G5_NINE_ORIGINAL_COHORT_SCHEMA_V39,
  manifestSha256:scope.independentlyReviewedManifestSha256,
  expectedOriginalSlotCount:9 as const,
  matchedOriginalSourceSlots:matched,
  missingOrExpiredOriginalSourceSlots:9-matched,
  sourcePerSlotReceipts:receiptRows,
  independentGithubManifestPinVerified:false as const,
  providerSourceTransportAuthenticated:false as const,
  legalRetentionIndependentlyVerified:false as const,
  providerNativeFirstTVerified:false as const,
  actualOnlyWheelsOffVerified:false as const,
  persistedPRECertified:false as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
 // Do NOT turn an empty readback into an empty denominator.
 // Never query the generic population funnel until all exact original slots
 // have been independently matched to their V0076/V0077 paid reservation.
 if(matched!==9)return {
  ...sourceOnly,
  status:"HOLD_MISSING_OR_EXPIRED_ORIGINAL_SOURCE_SLOTS" as const,
  historicalQueryReceiptsMeasured:null,
  retainedOriginalQueryReceiptsMeasured:null,
  provisionalFlightFunnel:null
 };
 const inventory=await auditP4FreshCohortV39(db,{
  airportIcao:g.airportIcao,
  serviceWindowStartUtc:g.serviceWindowStartUtc,
  serviceWindowEndUtc:g.serviceWindowEndUtc,
  readAsOfUtc:scope.readAsOfUtc,
  reviewedFrozenManifestSha256:scope.independentlyReviewedManifestSha256
 });
 const countAll=inventory.historicalQueryReceiptsMeasured;
 const countRetained=inventory.retainedOriginalQueryReceiptsMeasured;
 // Legacy inventory is scoped by airport/window only, not independently by
 // manifest. If even one extra/missing query receipt exists, it could have
 // contaminated the flight-horizon and webhook population counters.
 if(countAll!==9||countRetained!==9)return {
  ...sourceOnly,
  status:"HOLD_UNBOUND_OR_EXTRA_AIRPORT_WINDOW_SOURCE_RECEIPTS" as const,
  historicalQueryReceiptsMeasured:countAll,
  retainedOriginalQueryReceiptsMeasured:countRetained,
  provisionalFlightFunnel:null
 };
 return {
  ...sourceOnly,
  status:"ALL_NINE_ORIGINAL_REQUEST_FRAMES_MATCHED_PROVISIONAL_FUNNEL_ONLY" as const,
  historicalQueryReceiptsMeasured:9 as const,
  retainedOriginalQueryReceiptsMeasured:9 as const,
  provisionalFlightFunnel:inventory,
  // These matches prove an application-level query/window connection only;
  // the provider's HTTP identity and right to keep the original are external.
  allNineApplicationSourceBindingsConsistent:true as const
 };
}
