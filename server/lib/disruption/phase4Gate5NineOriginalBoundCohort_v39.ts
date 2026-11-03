/**
 * Future Phase4 Gate5 independent cohort closeout: require NINE original
 * source FIDS receipts (3 horizons x 3 exact frozen query slots) before
 * evaluating a generic airport-window PRE/webhook/outcome inventory.
 *
 * This is the missing connection between the merged V0076/V0077 original
 * request-frame readback and the cohort-wide generic read-only funnel.
 * The nine-original path is an OPTIONAL same-snapshot diagnostic when
 * licensed source lifetime actually permits it. A 24-hour FIDS cache often
 * expires T-24h original *before* the postflight audit. Normal pipeline must
 * audit each horizon while lawful originals exist, create independent
 * non-Contents GitHub-proved receipts (rights-reviewed), and later combine
 * them with PRE/POST without re-retaining original provider Contents.
 * One caller-owned REPEATABLE READ READ ONLY snapshot PER audit; no network,
 * production writes, source logging, activation or automatic scientific GO.
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
 expectedOwnerGithubRunId?:string;
 originalSourceSlots:readonly Slot[];
 readAsOfUtc:string;
}
export type P4G5NineOriginalReadOnlyDbV39 =
 P4G5OriginalFrameDbV39 & P4FreshReadOnlyDbV39;
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
   expectedOwnerGithubRunId:scope.expectedOwnerGithubRunId,
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


export interface P4G5SingleHorizonOriginalReviewScopeV39
 extends Omit<P4G5NineOriginalReviewScopeV39,"originalSourceSlots">{
 horizon:Horizon;
 originalSourceSlots:readonly Slot[];
}
/**
 * The practical per-horizon BEFORE-EXPIRY audit. T-24h source originals may
 * be deleted before a lawful postflight audit is possible. Caller separately
 * authenticates the GitHub manifest SHA + job logs; this function verifies
 * only the DB V0076/V0077 source/request/body while still legally retained.
 */
export async function auditP4G5OneHorizonOriginalBeforeExpiryV39(
 db:P4G5NineOriginalReadOnlyDbV39,
 scope:P4G5SingleHorizonOriginalReviewScopeV39
){
 if(!scope||!H.includes(scope.horizon)||
    !Array.isArray(scope.originalSourceSlots)||
    scope.originalSourceSlots.length!==3)
  reject("SINGLE_HORIZON_SCOPE");
 // Validate the exact grid and the independently pinned SHA, rejecting
 // malformed/late/changed freeze before an original response is even read.
 const {horizon,originalSourceSlots,...base}=scope;
 const p=base.reviewedFrozenManifestBytes;
 if(typeof p!=="string"||p.length>20000||
    !SHA.test(base.independentlyReviewedManifestSha256)||
    createHash("sha256").update(p,"utf8").digest("hex")!==
     base.independentlyReviewedManifestSha256||
    !/^[A-Z][A-Z0-9_-]{7,79}$/.test(base.expectedCohortId))
  reject("SINGLE_HORIZON_FROZEN_BYTES");
 let parsed:unknown;
 try{parsed=JSON.parse(p)}catch{reject("SINGLE_HORIZON_MANIFEST_JSON")}
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||
    p!==JSON.stringify(parsed,null,2)+"\n"||
    (parsed as Record<string,unknown>).cohortId!==base.expectedCohortId)
  reject("SINGLE_HORIZON_MANIFEST_CANONICAL");
 const grid=(parsed as {grid:Parameters<typeof draftP4Gate5ThreeHorizonGridV39>[0]}).grid;
 if(!grid||typeof grid!=="object"||Array.isArray(grid))
  reject("SINGLE_HORIZON_MANIFEST_GRID");
 const drafted=draftP4Gate5ThreeHorizonGridV39(grid);
 if(drafted.queries.filter(x=>x.horizon===horizon).length!==3)
  reject("SINGLE_HORIZON_NOT_THREE_QUERIES");
 at(scope.readAsOfUtc,"HORIZON_READ_ASOF");
 const seen=new Set<number>(),sourceIds=new Set<string>();
 let matched=0;
 const slots:Array<{horizon:Horizon;queryIndex:number;status:
  "MATCHED"|"MISSING_OR_EXPIRED"}>=[];
 for(const slot of [...originalSourceSlots].sort(
  (a,b)=>a.queryIndex-b.queryIndex)){
  if(!slot||slot.horizon!==horizon||
     ![0,1,2].includes(slot.queryIndex)||
     seen.has(slot.queryIndex)||!UUID.test(slot.populationQueryId)||
     sourceIds.has(slot.populationQueryId))
   reject("SINGLE_HORIZON_SLOT_IDENTITY");
  seen.add(slot.queryIndex);sourceIds.add(slot.populationQueryId);
  const result=await readP4Gate5OriginalRequestFrameV39(db,{
   reviewedManifestBytes:p,
   independentlyReviewedManifestSha256:base.independentlyReviewedManifestSha256,
   expectedCohortId:base.expectedCohortId,
   horizon,queryIndex:slot.queryIndex,
   populationQueryId:slot.populationQueryId,
   expectedOwnerGithubRunId:scope.expectedOwnerGithubRunId,
   readAsOfUtc:scope.readAsOfUtc
  });
  if(result.status==="ORIGINAL_AND_FROZEN_REQUEST_APPLICATION_INTENT_MATCH_NOT_HTTP_CERTIFIED"){
   matched++;
   slots.push({horizon,queryIndex:slot.queryIndex,status:"MATCHED"});
  }else if(result.status==="ORIGINAL_SOURCE_BINDING_MISSING_EXPIRED_OR_UNMEASURABLE"){
   slots.push({horizon,queryIndex:slot.queryIndex,status:"MISSING_OR_EXPIRED"});
  }else reject("SINGLE_HORIZON_UNEXPECTED_SOURCE_VERDICT");
 }
 if(seen.size!==3)reject("SINGLE_HORIZON_INCOMPLETE_SLOT_SET");
 return {
  schema:"v39.phase4.gate5-one-horizon-before-expiry-original-readonly.v1" as const,
  status:matched===3?
   "THREE_APPLICATION_SOURCE_FRAMES_MATCHED_NOT_PROVIDER_CERTIFIED" as const:
   "HOLD_MISSING_OR_EXPIRED_ONE_HORIZON_ORIGINAL" as const,
  manifestSha256:base.independentlyReviewedManifestSha256,
  horizon,checkedAtUtc:scope.readAsOfUtc,
  originalSourceSlotsExpected:3 as const,
  matchedOriginalSlots:matched,
  sourceStatusBySlot:slots,
  independentGitHubJobAttestationVerified:false as const,
  authenticatedProviderSourceOrigin:false as const,
  licensedNoncontentReceiptRetentionVerified:false as const,
  originalContentMustBeExpiredUnderActualLawfulDeadline:true as const,
  scientificallyCertifiedFirstT:false as const,
  scientificallyCertifiedPRE:false as const,
  actualOnlyTerminalTargetCertified:false as const,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}

export type P4G5HorizonReceiptV39 =
 Awaited<ReturnType<typeof auditP4G5OneHorizonOriginalBeforeExpiryV39>>;
/**
 * Syntactic handoff of three independently pre-expiry audited horizons.
 * NEVER claim authentication from passed-in objects. A future GH workflow
 * must fetch, validate and pin source job/log receipts independently.
 */
export function reconcileP4G5ThreeHorizonNoncontentReceiptsV39(
 reports:readonly P4G5HorizonReceiptV39[],
 independentlyReviewedManifestSha256:string
){
 if(!SHA.test(independentlyReviewedManifestSha256)||
    !Array.isArray(reports)||reports.length!==3)
  reject("NONCONTENT_RECEIPTS_SCOPE");
 const seen=new Set<Horizon>();
 for(const r of reports){
  if(!r||!H.includes(r.horizon)||seen.has(r.horizon)||
     r.manifestSha256!==independentlyReviewedManifestSha256||
     r.originalSourceSlotsExpected!==3||
     r.matchedOriginalSlots!==3||
     r.status!=="THREE_APPLICATION_SOURCE_FRAMES_MATCHED_NOT_PROVIDER_CERTIFIED"||
     !Array.isArray(r.sourceStatusBySlot)||
     r.sourceStatusBySlot.length!==3||
     r.sourceStatusBySlot.some((
      x:{horizon:Horizon;queryIndex:number;status:"MATCHED"|"MISSING_OR_EXPIRED"},
      i:number)=>
      x.horizon!==r.horizon||x.queryIndex!==i||x.status!=="MATCHED")||
     r.providerCalls!==0||r.databaseWrites!==0||
     r.scientificGate5Passed!==false)
   reject("NONCONTENT_HORIZON_PROOF_MISMATCH");
  at(r.checkedAtUtc,"HORIZON_PROOF_TIME");
  seen.add(r.horizon);
 }
 return {
  schema:"v39.phase4.gate5-three-horizon-noncontent-receipt-handoff.v1" as const,
  status:"THREE_HORIZON_REPORTS_SELF_CONSISTENT_EXTERNAL_AUTHENTICATION_PENDING" as const,
  perHorizonSourceApplicationReadbacks:3 as const,
  totalOriginalSlotsApplicationMatched:9 as const,
  independentlyVerifiedGitHubJobLogs:false as const,
  independentlyVerifiedLawfulMetadataRetention:false as const,
  independentlyVerifiedActualOnlyOutcome:false as const,
  genuinelyPersistedPreSnapshotsCount:null,
  physicalOperatingLegDenominator:null,
  scientificGate5Passed:false as const,
  phase5FreezeAuthorized:false as const,phase6Authorized:false as const,
  providerCalls:0 as const,databaseWrites:0 as const
 };
}


/**
 * Automation-ready read-only discovery for a future NEW cohort.
 * No human must copy internal FIDS source UUIDs from Replit shell. The
 * existing V0076/V0077 durable ledger supplies exactly three expected
 * original source links per frozen horizon. The audit function below then
 * validates their actual request/source-body integrity independently.
 */
export const P4_G5_HORIZON_BOUND_SOURCE_DISCOVERY_SQL_V39=[
 "SELECT o.horizon,q.query_index,",
 "b.population_query_id::text AS population_query_id",
 "FROM clean.phase4_g5_fids_original_binding_v39 b",
 "JOIN clean.phase4_g5_fids_physical_attempt_v39 a",
 "ON a.expected_reservation_sha256=b.expected_reservation_sha256",
 "AND a.query_digest=b.query_digest",
 "JOIN clean.phase4_g5_fids_allowed_query_v39 q",
 "ON q.query_digest=b.query_digest",
 "AND q.query_digest=a.query_digest",
 "AND q.owner_digest=a.owner_digest",
 "JOIN clean.phase4_g5_fids_physical_owner_v39 o",
 "ON o.owner_digest=q.owner_digest",
 "AND o.owner_digest=a.owner_digest",
 "AND o.manifest_sha256=b.manifest_sha256",
 "WHERE b.manifest_sha256=$1 AND o.horizon=$2",
 "ORDER BY q.query_index,b.population_query_id",
 "LIMIT 4"
].join(" ");

export async function auditP4G5DiscoveredHorizonOriginalBeforeExpiryV39(
 db:P4G5NineOriginalReadOnlyDbV39,
 scope:Omit<P4G5SingleHorizonOriginalReviewScopeV39,"originalSourceSlots">
){
 if(!scope||!SHA.test(scope.independentlyReviewedManifestSha256)||
    !H.includes(scope.horizon))reject("DISCOVERY_SCOPE");
 const rows=await db.query(P4_G5_HORIZON_BOUND_SOURCE_DISCOVERY_SQL_V39,[
  scope.independentlyReviewedManifestSha256,scope.horizon
 ]);
 if(!rows||!Array.isArray(rows.rows)||rows.rows.length>3)
  reject("DISCOVERY_DUPLICATE_OR_MALFORMED_LEDGER");
 // No source-bound rows is UNKNOWN/NOT YET RECONCILED, never zero flights.
 if(rows.rows.length!==3)return {
  schema:"v39.phase4.gate5-automatic-horizon-ledger-discovery.v1" as const,
  status:"HOLD_INCOMPLETE_V0077_HORIZON_ORIGINAL_LINKS" as const,
  discoveredOriginalSourceLinks:rows.rows.length,
  matchedOriginalSlots:null,sourceStatusBySlot:null,
  scientificGate5Passed:false as const,phase5FreezeAuthorized:false as const,
  phase6Authorized:false as const,providerCalls:0 as const,
  databaseWrites:0 as const
 };
 const slots:Slot[]=rows.rows.map(x=>{
  if(!x||typeof x!=="object"||Array.isArray(x))
   reject("DISCOVERY_INVALID_LEDGER_ROW");
  const r=x as Record<string,unknown>;
  if(r.horizon!==scope.horizon||
     !Number.isInteger(r.query_index)||
     !UUID.test(String(r.population_query_id)))
   reject("DISCOVERY_UNEXPECTED_HORIZON_QUERY_OR_SOURCE");
  return {horizon:scope.horizon,queryIndex:r.query_index as number,
   populationQueryId:String(r.population_query_id)};
 });
 // The single-horizon verifier independently rejects altered manifest,
 // wrong query index, duplicate source ID, expired original and body tamper.
 return auditP4G5OneHorizonOriginalBeforeExpiryV39(db,{
  ...scope,originalSourceSlots:slots
 });
}
