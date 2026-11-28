/** Native later-review prerequisite, READ ONLY, with original V0081 and
 * Stage24 semantics. Classify a bounded page of already exact-SHA-reviewed
 * SOURCE dossier candidates using the actual commissioned PRE role.
 * No provider call, private-key operation, new role, new table, PRE write,
 * retroactive witness or independent scientific/rights certification.
 * A missing separately archived Stage17 receipt is NOT missing T24.
 */
import type {Pool} from "pg";
import {readP5ConditionalLaterIdentityInventory,type P5SignedConditionalFeatureReadScope} from "./phase5ConditionalBoundSourceReview_v39";
import type {P5EReadOnlyPgPool} from "./phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
import {P5_STAGE24_REVIEWED_WITNESSED_T24_SQL} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {digestP5Stage24ReviewedReceipt,verifyP5Stage24WitnessedFrozenT,type P5Stage24ReviewedT24Receipt}
 from "./phase5T24WitnessedLaterHorizonGuard_v39";
import {digestP5UnsignedNativePreDossier,pageP5UnsignedNativePreReviewDossier,type P5UnsignedNativePreDossier,type P5UnsignedPreReviewEntry}
 from "./phase5SourceBoundUnsignedPreDossier_v39";
import {readP6T24WitnessCustodyBatch} from "./phase6PrivateT24WitnessReceiptTransport_v39.mjs";
const H=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_.:|-]{5,200}$/;
const hold=(s:string):never=>{throw Error("HOLD_P6_LATER_T24_EVIDENCE_READ_"+s);};
function utc(v:unknown){
 const n=v instanceof Date?v.getTime():typeof v==="string"?Date.parse(v):NaN;
 if(!Number.isFinite(n)||typeof v==="string"&&new Date(n).toISOString()!==v)hold("NONEXACT_DB_OR_CANDIDATE_CLOCK");
 return n;
}
export type P6LaterT24EvidenceStatus=
 "T24_PERSISTED_AND_SEPARATE_RECEIPT_MATCH_REVIEW_REQUIRED"|
 "T24_ABSENT_AFTER_CUTOFF_SEPARATE_MISSINGNESS_REVIEW_REQUIRED"|
 "T24_NOT_YET_DUE_NO_MISSINGNESS_CLAIM"|
 "T24_EXISTS_PRIVATE_RECEIPT_UNAVAILABLE"|
 "T24_PARTIAL_OR_AMBIGUOUS_NO_REPLAY"|
 "T24_RECEIPT_OR_NATIVE_ANCHOR_MISMATCH"|
 "T24_PRIVATE_CUSTODY_INVALID_OR_EXPIRED_UNRESOLVED"|
 "T24_SIGNED_WITNESS_BINDING_UNAVAILABLE"|
 "POST_T24_WITNESS_WINDOW_ELAPSED_UNRESOLVED"|
 "LATER_REVIEW_LEAD_MISSED_CENSOR";
type ReviewReceipt={expectedReceiptSha256:string;receipt:P5Stage24ReviewedT24Receipt};
export interface P6LaterT24EvidenceReadScope{
 independentDossierReviewPinned:true;
 independentT24EvidenceReadApproved:true;
 existingPaidDispatchApproved:false;
 expectedDossierSha256:string;
 expectedManifestSha256:string;
 expectedRightsSha256:string;
 expectedReleaseSha256:string;
 expectedFrameSha256:string;
 expectedConfigSha256:string;
 expectedSelectedTVersion:string;
 pageIndex:number;
 /** Optional exact subset of original page, selected by current signed
  * day-index duplicate/lead filtering. Never change the original dossier SHA. */
 selectedFlightInstanceIds?:readonly string[];
 /** Only from actual exact stored-custody validation; never call absence
  * when a conflicting/expired custody record was seen. */
 unresolvedCustodyFlightInstanceIds?:readonly string[];
 /** Exact existing Stage17 receipt obtained via lawful private custody.
  * No reconstruction of second post-COMMIT observation from today's DB
  * clock. A digest is not independent organizational approval. */
 reviewedReceipts:readonly ReviewReceipt[];
}
type Decision={flightInstanceId:string;horizon:"T-6h"|"T-90m";status:P6LaterT24EvidenceStatus;receiptSha256:string|null};
/** Same exact witness JOIN as Stage14; bounded batch projection.
 * Total rows at 2 per flight are queried. >2n is structural damage, not
 * evidence of missing observations. Never search unrelated flights. */
export const P6_LATER_T24_WITNESSES_BATCH_SQL=P5_STAGE24_REVIEWED_WITNESSED_T24_SQL.replace(
 " WHERE w.flight_instance_id=$1 LIMIT 2",
 " WHERE w.flight_instance_id=ANY($1::text[]) ORDER BY w.flight_instance_id,w.snapshot_id LIMIT $2");
export const P6_LATER_T24_SNAPSHOTS_BATCH_SQL=
 "SELECT flight_instance_id,id::text AS snapshot_id FROM clean.flight_snapshots"+
 " WHERE flight_instance_id=ANY($1::text[]) AND horizon='T-24h' ORDER BY flight_instance_id,id LIMIT $2";
/** Conditional-only metadata projections. The existing native PRE reader
 * remains unchanged; no conditional signer receives the PRE writer URL. */
export const P6_CONDITIONAL_T24_SNAPSHOTS_SQL="SELECT flight_instance_id,snapshot_id FROM phase6_private.conditional_t24_snapshot_meta_v39 WHERE flight_instance_id=ANY($1::text[]) ORDER BY flight_instance_id,snapshot_id LIMIT $2";
export const P6_CONDITIONAL_T24_WITNESSES_SQL="SELECT snapshot_id,joined_snapshot_id,flight_instance_id,selected_t_version,fids_response_hash,source_query_digest,frame_hash,config_hash,selected_t_native_utc,t24_cutoff_utc,post_pre_commit_db_observed_at_utc,source_t24_population_query_id,snapshot_prediction_state,snapshot_horizon FROM phase6_private.conditional_t24_witness_meta_v39 WHERE flight_instance_id=ANY($1::text[]) ORDER BY flight_instance_id,snapshot_id LIMIT $2";
export async function assertP6ConditionalT24MetadataReader(c:Pick<import("pg").PoolClient,"query">,expectedLogin:string){
 if(!/^phase6_private_reader_login_[a-z0-9_]{6,50}$/.test(expectedLogin??""))return hold("CONDITIONAL_METADATA_LOGIN");
 const z=await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int version,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,clock_timestamp() now,"+
  "has_table_privilege(current_user,'phase6_private.conditional_t24_snapshot_meta_v39','SELECT') snap_read,"+
  "has_table_privilege(current_user,'phase6_private.conditional_t24_witness_meta_v39','SELECT') witness_read,"+
  "has_table_privilege(current_user,'phase6_private.conditional_t24_snapshot_meta_v39','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') snap_write,"+
  "has_table_privilege(current_user,'phase6_private.conditional_t24_witness_meta_v39','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') witness_write,"+
  "EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='clean' AND c.relname IN ('flight_snapshots','phase5_t24_postcommit_witness_v39') AND (has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER'))) base_access,"+
  "a.rolcanlogin login_enabled,a.rolsuper login_super,a.rolcreaterole login_admin,a.rolbypassrls login_bypass,g.rolcanlogin group_login,g.rolsuper group_super,g.rolbypassrls group_bypass "+
  "FROM pg_roles a,pg_roles g WHERE a.rolname=session_user AND g.rolname=current_user");
 const i=z.rows[0];
 if(z.rowCount!==1||i?.db!=="neondb"||i.actor!=="phase6_private_frozen_reader_v39"||i.login!==expectedLogin||
    Number(i.version)<160000||Number(i.version)>=170000||i.ro!=="on"||i.replica!==false||
    i.snap_read!==true||i.witness_read!==true||i.snap_write!==false||i.witness_write!==false||i.base_access!==false||
    i.login_enabled!==true||i.login_super!==false||i.login_admin!==false||i.login_bypass!==false||
    i.group_login!==false||i.group_super!==false||i.group_bypass!==false)return hold("CONDITIONAL_METADATA_ROLE_OR_ACL");
 return new Date(utc(i.now)).toISOString();
}
export async function readP6LaterT24EvidencePage(pool:Pick<Pool,"connect">,dossier:P5UnsignedNativePreDossier,scope:P6LaterT24EvidenceReadScope){
 if(!scope||scope.independentDossierReviewPinned!==true||scope.independentT24EvidenceReadApproved!==true||
    scope.existingPaidDispatchApproved!==false||!pool||typeof pool.connect!=="function"||
    ![scope.expectedDossierSha256,scope.expectedManifestSha256,scope.expectedRightsSha256,scope.expectedReleaseSha256,
     scope.expectedFrameSha256,scope.expectedConfigSha256].every(s=>H.test(s??""))||
    typeof scope.expectedSelectedTVersion!=="string"||scope.expectedSelectedTVersion.length<10||scope.expectedSelectedTVersion.length>500||
    !Number.isSafeInteger(scope.pageIndex)||scope.pageIndex<1||!Array.isArray(scope.reviewedReceipts)||
    !dossier||!["T-6h","T-90m"].includes(dossier.horizon)||dossier.manifestSha256!==scope.expectedManifestSha256||
    digestP5UnsignedNativePreDossier(dossier)!==scope.expectedDossierSha256)
  hold("NO_EXACT_INDEPENDENT_READ_SCOPE");
 const pages=pageP5UnsignedNativePreReviewDossier(dossier);
 const page=pages[scope.pageIndex-1];
 if(!page||page.entries.length<1||page.entries.length>96)
  hold("UNBOUNDED_OR_EMPTY_PAGE");
 const requested=scope.selectedFlightInstanceIds;
 if(requested!==undefined&&(!Array.isArray(requested)||requested.length<1||requested.length>96||
    new Set(requested).size!==requested.length||requested.some(id=>!ID.test(id)||!page.entries.some(e=>e.source.flightInstanceId===id))))
  hold("INVALID_SELECTED_PAGE_SUBSET");
 const selected=requested===undefined?page.entries:page.entries.filter(e=>requested.includes(e.source.flightInstanceId));
 if(scope.reviewedReceipts.length>selected.length)hold("UNBOUNDED_OR_EMPTY_PAGE");
 const ids=selected.map(e=>e.source.flightInstanceId);
 if(new Set(ids).size!==ids.length||ids.some(id=>!ID.test(id))||
    selected.some(e=>e.source.manifestSha256!==scope.expectedManifestSha256||
     e.source.expectedReviewedReleaseSha256!==scope.expectedReleaseSha256||
     e.source.expectedReviewedSourceRightsSha256!==scope.expectedRightsSha256||e.source.horizon!==dossier.horizon||
     utc(e.source.selectedTNativeUtc)-utc(e.source.ownPreCutoffUtc)!==(dossier.horizon==="T-6h"?21600000:5400000)))
  hold("CROSS_STUDY_PAGE_OR_NATIVE_CUTOFF_DRIFT");
 const unresolved=scope.unresolvedCustodyFlightInstanceIds??[];
 if(!Array.isArray(unresolved)||new Set(unresolved).size!==unresolved.length||unresolved.some(id=>!ids.includes(id)))
  hold("INVALID_UNRESOLVED_CUSTODY_SCOPE");
 const byReceipt=new Map<string,ReviewReceipt>();
 for(const r of scope.reviewedReceipts){
  const id=r?.receipt?.flightInstanceId;
  if(!ids.includes(id)||byReceipt.has(id)||unresolved.includes(id)||!H.test(r.expectedReceiptSha256??"")||
     r.receipt.receiptSha256!==r.expectedReceiptSha256||
     digestP5Stage24ReviewedReceipt(r.receipt)!==r.expectedReceiptSha256)
   hold("UNPINNED_DUPLICATE_OR_CROSS_PAGE_RECEIPT");
  byReceipt.set(id,r);
 }
 return readP6ExactSelectedLaterT24Evidence(pool,selected,{...scope,runDayIndex:dossier.runDayIndex,sourceObservedDbClockUtc:dossier.sourceObservedDbClockUtc},byReceipt,unresolved);
}
type SelectedEvidence={source:{flightInstanceId:string;selectedTNativeUtc:string;ownPreCutoffUtc:string;horizon:string;
 expectedT24ReceiptSha256?:string;preIssuedAtUtc?:string;sourceExpiresAtUtc?:string;assessmentWatermarkUtc?:string}};
type SelectedScope=Pick<P6LaterT24EvidenceReadScope,"expectedDossierSha256"|"expectedFrameSha256"|"expectedConfigSha256"|"expectedSelectedTVersion"|"pageIndex">&{runDayIndex:number;sourceObservedDbClockUtc:string};
/** Both identity tiers use exactly the same existing persisted witness and
 * immutable readback rules. The native and conditional admission checks
 * remain separate; this common reader has no signing or publishing power. */
async function readP6ExactSelectedLaterT24Evidence(pool:Pick<Pool,"connect">,selected:readonly SelectedEvidence[],
  scope:SelectedScope,byReceipt:ReadonlyMap<string,ReviewReceipt>,unresolved:readonly string[],conditionalMetadataReaderLogin?:string,
  // Private positional authority: never read this mode from a caller's
  // extensible native scope. Only the conditional entry passes its frame.
  conditionalFrozenT24SourceWindow?:{startUtc:string;endUtc:string},postCommittedT6=false){
 const priorClock=utc(scope.sourceObservedDbClockUtc),ids=selected.map(e=>e.source.flightInstanceId);
 if(postCommittedT6&&(!conditionalFrozenT24SourceWindow||!conditionalMetadataReaderLogin||selected.some(e=>e.source.horizon!=="T-6h")))hold("POST_WITNESS_PRIVATE_MODE");
 const c=await pool.connect();let begun=false,rollbackAttempted=false,discard=false;
 try{
  // The server can start a transaction before the BEGIN acknowledgement
  // is lost. Reconcile on this exact session before returning it to a pool.
  begun=true;await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  let now:number;
  if(conditionalMetadataReaderLogin!==undefined){
   if(ids.some(id=>!/^leg:g5a:[a-f0-9]{64}$/.test(id)))return hold("CONDITIONAL_METADATA_IDENTITY_SCOPE");
   now=utc(await assertP6ConditionalT24MetadataReader(c,conditionalMetadataReaderLogin));
  }else{
  const ident=await c.query("SELECT current_database() AS db,current_user AS actor,session_user AS login,"+
   "current_setting('server_version_num')::int AS version,current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now");
  const i=ident.rows[0];
  if(ident.rowCount!==1||i?.db!=="neondb"||i.actor!==P5_STAGE28_GROUPS.pre||
     i.login!=="phase5_p30_pre_login_20261107"||Number(i.version)<160000||Number(i.version)>=170000||
     i.ro!=="on"||i.replica!==false)hold("ACTUAL_COMMISSIONED_PG16_PRE_READ_ROLE_REQUIRED");
  now=utc(i.now);

  }
  if(now<priorClock)hold("SOURCE_OR_READ_CLOCK_REGRESSION");
  const limit=2*ids.length+1,args=[ids,limit];
  const snap=await c.query(conditionalMetadataReaderLogin===undefined?P6_LATER_T24_SNAPSHOTS_BATCH_SQL:P6_CONDITIONAL_T24_SNAPSHOTS_SQL,args),
   witness=await c.query(conditionalMetadataReaderLogin===undefined?P6_LATER_T24_WITNESSES_BATCH_SQL:P6_CONDITIONAL_T24_WITNESSES_SQL,args);
  const map=(rows:Record<string,unknown>[])=>{
   if(!Array.isArray(rows)||rows.length>=limit)hold("UNBOUNDED_T24_EVIDENCE_ROWS");
   const by=new Map<string,Record<string,unknown>[]>();
   for(const row of rows){
    const id=String(row.flight_instance_id);
    if(!ids.includes(id))hold("UNREVIEWED_CROSS_PAGE_SQL_ROW");
    const list=by.get(id)??[];list.push(row);by.set(id,list);
   }
   return by;
  };
  const snaps=map(snap.rows),witnesses=map(witness.rows);
  const decisions:Decision[]=selected.map(e=>{
   const s=e.source,id=s.flightInstanceId,native=utc(s.selectedTNativeUtc),cutoff=utc(s.ownPreCutoffUtc),
    sr=snaps.get(id)??[],wr=witnesses.get(id)??[],r=byReceipt.get(id);
   let status:P6LaterT24EvidenceStatus;
   let receiptSha256:string|null=null;
   if(postCommittedT6&&!H.test(s.expectedT24ReceiptSha256??""))status="T24_SIGNED_WITNESS_BINDING_UNAVAILABLE";
   else if(postCommittedT6&&(now>=utc(s.sourceExpiresAtUtc)||now>=utc(s.assessmentWatermarkUtc)))status="POST_T24_WITNESS_WINDOW_ELAPSED_UNRESOLVED";
   else if(!postCommittedT6&&!conditionalFrozenT24SourceWindow&&now>=cutoff-900000)status="LATER_REVIEW_LEAD_MISSED_CENSOR";
   else if(unresolved.includes(id))status="T24_PRIVATE_CUSTODY_INVALID_OR_EXPIRED_UNRESOLVED";
   else if(sr.length===0&&wr.length===0){
    if(r)status="T24_RECEIPT_OR_NATIVE_ANCHOR_MISMATCH";
    else status=now<native-86400000?"T24_NOT_YET_DUE_NO_MISSINGNESS_CLAIM":
     "T24_ABSENT_AFTER_CUTOFF_SEPARATE_MISSINGNESS_REVIEW_REQUIRED";
   }else if(sr.length!==1||wr.length!==1||String(sr[0].snapshot_id)!==String(wr[0].snapshot_id))
    status="T24_PARTIAL_OR_AMBIGUOUS_NO_REPLAY";
   else if(!r)status="T24_EXISTS_PRIVATE_RECEIPT_UNAVAILABLE";
   else{
    try{
     const frame=conditionalFrozenT24SourceWindow;
     const frozen=frame?utc(r.receipt.selectedTNativeUtc):native;
     const frozenCutoff=frame?frozen-(s.horizon==="T-6h"?21600000:5400000):cutoff;
     if(frame&&(frozen<utc(frame.startUtc)||frozen>=utc(frame.endUtc)))hold("T24_REFERENCE_OUTSIDE_SIGNED_SOURCE_FRAME");
     // Actual persisted witness + separately authenticated custody first.
     // A current reported retime never rewrites the original reference.
     verifyP5Stage24WitnessedFrozenT(wr[0],r.receipt,{flightInstanceId:id,selectedTNativeUtc:new Date(frozen).toISOString(),
      expectedSelectedTVersion:scope.expectedSelectedTVersion,expectedFrameSha256:scope.expectedFrameSha256,
       expectedConfigSha256:scope.expectedConfigSha256,cutoffUtc:new Date(frozenCutoff).toISOString(),horizon:s.horizon as "T-6h"|"T-90m"});
     if(utc(r.receipt.stage17PostCommitReadbackAtUtc)>now)hold("FUTURE_T24_READBACK");
     // A committed T6 is different from a proposed later PRE. Its original
     // cutoff was already enforced; rechecking the future PRE lead would
     // censor every valid POST review. Bind the exact previously signed T24
     // digest, frozen T and original PRE time instead, never move a cutoff.
     if(postCommittedT6&&(r.expectedReceiptSha256!==s.expectedT24ReceiptSha256||frozen!==native||frozenCutoff!==cutoff||
        utc(r.receipt.stage17PostCommitReadbackAtUtc)>=utc(s.preIssuedAtUtc)))hold("POST_SIGNED_WITNESS_OR_PRE_CLOCK_DRIFT");
     if(!postCommittedT6&&now>=frozenCutoff-900000)status="LATER_REVIEW_LEAD_MISSED_CENSOR";
     else{status="T24_PERSISTED_AND_SEPARATE_RECEIPT_MATCH_REVIEW_REQUIRED";receiptSha256=r.expectedReceiptSha256;}
    }catch{status="T24_RECEIPT_OR_NATIVE_ANCHOR_MISMATCH";}
   }
   return Object.freeze({flightInstanceId:id,horizon:s.horizon as "T-6h"|"T-90m",status,receiptSha256});
  });
  if(postCommittedT6){
   const completed=await c.query("SELECT clock_timestamp() AS now"),at=utc(completed.rows[0]?.now);
   if(completed.rowCount!==1||at<now||at-priorClock>120000)hold("POST_WITNESS_READ_CLOCK_DRIFT");
   for(let i=0;i<decisions.length;i++)if(decisions[i].receiptSha256!==null&&
     (at>=utc(selected[i].source.sourceExpiresAtUtc)||at>=utc(selected[i].source.assessmentWatermarkUtc)))
    decisions[i]=Object.freeze({...decisions[i],status:"POST_T24_WITNESS_WINDOW_ELAPSED_UNRESOLVED",receiptSha256:null});
   now=at;
  }
  rollbackAttempted=true;
  try{await c.query("ROLLBACK");begun=false;}catch{discard=true;hold("ROLLBACK_UNACKNOWLEDGED");}
  const counts:Partial<Record<P6LaterT24EvidenceStatus,number>>={};
  for(const d of decisions)counts[d.status]=(counts[d.status]??0)+1;
  const report={status:"ACTUAL_T24_EVIDENCE_PAGE_FOR_SEPARATE_LATER_REVIEW_NO_GO",expectedDossierSha256:scope.expectedDossierSha256,
   runDayIndex:scope.runDayIndex,pageIndex:scope.pageIndex,observedDbClockUtc:new Date(now).toISOString(),
   candidateCount:decisions.length,counts,sourceRightsCertified:false,reviewedPacketsIssued:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
  return Object.freeze(Object.defineProperty(report,"privateDecisions",{value:Object.freeze(decisions),enumerable:false})) as typeof report&{readonly privateDecisions:readonly Decision[]};
 }finally{
  try{
   if(begun&&!rollbackAttempted){
    rollbackAttempted=true;
    try{await c.query("ROLLBACK");}catch{discard=true;hold("ROLLBACK_UNACKNOWLEDGED");}
   }
  }finally{if(discard)c.release(true);else c.release();}
 }
}


/** Connect #747's private selected candidates to the original T24 reader.
 * One invocation is bounded to one original page. An empty selection is
 * not evidence of missing T24 and requires no DB connection. The caller
 * supplies its existing independently pinned dossier/release scope. */
type PendingStoredT24Custody={
 readerClient:{query:(sql:string,args?:any[])=>Promise<any>};
 /** Independent stable custody trust from protected review configuration.
  * Flight IDs below are derived solely from the exact selected page. */
 trust:{independentT24CustodyTrustApproved:true;runDayIndex:number;reviewedCodeSha:string;
  manifestSha256:string;rightsSha256:string;releaseSha256:string;policySha256:string;
  reviewerFingerprintSha256:string;reviewerPublicKeyPem:string;expectedFrameSha256:string;
  expectedConfigSha256:string;expectedSelectedTVersion:string;maximumRetentionHours:number;
  policyValidFromUtc:string;policyValidUntilUtc:string};
 scope:{privateT24CustodyApproved:true;existingPaidDispatchApproved:false;adbAutoCollect:"0";phase6ProcessArmed:"0";expectedSessionLogin:string};
};
export async function readP6PendingLaterT24EvidencePage(
 pool:Pick<Pool,"connect">,
 handoff:{status:string;horizon:string;runDayIndex:number;reviewEntryCount:number;
  privateOriginalDossier:P5UnsignedNativePreDossier;privateOriginalDossierSha256:string;
  privateReviewEntries:readonly P5UnsignedPreReviewEntry[]},
 scope:Omit<P6LaterT24EvidenceReadScope,"selectedFlightInstanceIds"|"unresolvedCustodyFlightInstanceIds">,
 custody?:PendingStoredT24Custody
){
 const sealed=(k:string)=>{const d=Object.getOwnPropertyDescriptor(handoff??{},k);return Boolean(d&&!d.enumerable&&!d.writable);};
 const d=handoff?.privateOriginalDossier,entries=handoff?.privateReviewEntries;
 if(!scope||scope.independentDossierReviewPinned!==true||scope.independentT24EvidenceReadApproved!==true||
    scope.existingPaidDispatchApproved!==false||!Number.isSafeInteger(scope.pageIndex)||scope.pageIndex<1||
    !Array.isArray(scope.reviewedReceipts)||handoff?.status!=="UNSIGNED_PRE_REVIEW_HANDOFF_NOT_AUTHORIZED"||
    !sealed("privateOriginalDossier")||!sealed("privateOriginalDossierSha256")||!sealed("privateReviewEntries")||
    !d||handoff.horizon!==d.horizon||!["T-6h","T-90m"].includes(d.horizon)||
    handoff.runDayIndex!==d.runDayIndex||handoff.privateOriginalDossierSha256!==scope.expectedDossierSha256||
    d.manifestSha256!==scope.expectedManifestSha256||digestP5UnsignedNativePreDossier(d)!==scope.expectedDossierSha256||
    !Array.isArray(entries)||entries.length!==handoff.reviewEntryCount||entries.length>d.entries.length)
  hold("NO_EXACT_PENDING_HANDOFF");
 const ids=new Set<string>();
 for(const e of entries){
  if(!e?.source||ids.has(e.source.flightInstanceId)||!d.entries.some(x=>JSON.stringify(x)===JSON.stringify(e)))
   hold("PENDING_HANDOFF_ENTRY_DRIFT");
  ids.add(e.source.flightInstanceId);
 }
 const page=pageP5UnsignedNativePreReviewDossier(d)[scope.pageIndex-1];
 if(!page)hold("INVALID_PENDING_PAGE");
 const selected=page.entries.filter(e=>ids.has(e.source.flightInstanceId)).map(e=>e.source.flightInstanceId);
 if(!selected.length){
  if(scope.reviewedReceipts.length)hold("RECEIPT_WITHOUT_PENDING_SELECTION");
  return {status:"NO_PENDING_T24_EVIDENCE_ON_PAGE_NO_SQL",runDayIndex:d.runDayIndex,pageIndex:scope.pageIndex,
   candidateCount:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }
 if(!custody)return readP6LaterT24EvidencePage(pool,d,{...scope,selectedFlightInstanceIds:selected});
 const t=custody.trust;
 if(scope.reviewedReceipts.length||!t||t.independentT24CustodyTrustApproved!==true||
    t.runDayIndex!==d.runDayIndex||t.reviewedCodeSha!==d.reviewedMainCodeSha||
    t.manifestSha256!==scope.expectedManifestSha256||t.rightsSha256!==scope.expectedRightsSha256||
    t.releaseSha256!==scope.expectedReleaseSha256||t.expectedFrameSha256!==scope.expectedFrameSha256||
    t.expectedConfigSha256!==scope.expectedConfigSha256||t.expectedSelectedTVersion!==scope.expectedSelectedTVersion)
  hold("STORED_CUSTODY_TRUST_NOT_EXACT_PENDING_PAGE");
 const got=await readP6T24WitnessCustodyBatch({client:custody.readerClient,trusts:selected.map(flightInstanceId=>({...t,flightInstanceId})),scope:custody.scope});
 const receipts:ReviewReceipt[]=got.privateDecisions.flatMap(x=>x.status==="EXACT_CUSTODY_RECEIPT_AWAIT_SCIENTIFIC_REVIEW"?
  [{receipt:x.receipt,expectedReceiptSha256:x.receipt.receiptSha256}]:[]);
 const unresolved=got.privateDecisions.filter(x=>x.status==="CUSTODY_INVALID_OR_EXPIRED_UNRESOLVED").map(x=>x.flightInstanceId);
 const evidence=await readP6LaterT24EvidencePage(pool,d,{...scope,selectedFlightInstanceIds:selected,reviewedReceipts:receipts,
  unresolvedCustodyFlightInstanceIds:unresolved});
 if(utc(evidence.observedDbClockUtc)<utc(got.observedDbClockUtc))hold("CUSTODY_TO_ACTUAL_PRE_CLOCK_REGRESSION");
 // Verified custody is NOT independent native/source/scientific review.
 const out={...evidence,privateCustodyVerifiedCount:got.verifiedCount,privateCustodyAbsentCount:got.absentCount,
  privateCustodyUnresolvedCount:got.unresolvedCount,scientificReviewStillRequired:true};
 return Object.freeze(Object.defineProperties(out,{privateDecisions:{value:evidence.privateDecisions,enumerable:false},
  privateCustodyReceipts:{value:Object.freeze(receipts),enumerable:false}}));

}

/** Independently read the actual prospective conditional original and
 * requested members, then original T24 custody and commissioned PRE
 * witness rows. Never create a fake native dossier. A returned absence
 * classification is NOT authorization for standalone later PRE. */
export async function readP6ConditionalLaterT24EvidencePage(
 sourcePool:P5EReadOnlyPgPool,prePool:Pick<Pool,"connect">,sourceScope:P5SignedConditionalFeatureReadScope,
 requestedFlightInstanceIds:readonly string[],scope:{
 independentConditionalLaterEvidenceReadApproved:true;existingPaidDispatchApproved:false;
 expectedReviewedCodeSha:string;expectedProtocolSha256:string;expectedContentUseReviewSha256:string;
 expectedFrameSha256:string;expectedConfigSha256:string;expectedSelectedTVersion:string;
 conditionalMetadataReaderLogin?:string;
 },custody:PendingStoredT24Custody){
 const q=sourceScope?.source,t=custody?.trust;
 if(!q||!scope||scope.independentConditionalLaterEvidenceReadApproved!==true||scope.existingPaidDispatchApproved!==false||
    !["T-6h","T-90m"].includes(q.horizon)||!/^([a-f0-9]{40})$/.test(scope.expectedReviewedCodeSha??"")||
    ![scope.expectedProtocolSha256,scope.expectedContentUseReviewSha256,scope.expectedFrameSha256,scope.expectedConfigSha256].every(x=>H.test(x??""))||
    sourceScope.protocolSha256!==scope.expectedProtocolSha256||sourceScope.externalContentUseReviewSha256!==scope.expectedContentUseReviewSha256||
    (scope.conditionalMetadataReaderLogin!==undefined&&scope.conditionalMetadataReaderLogin!==custody?.scope?.expectedSessionLogin)||
    typeof scope.expectedSelectedTVersion!=="string"||scope.expectedSelectedTVersion.length<10||
    !Array.isArray(requestedFlightInstanceIds)||requestedFlightInstanceIds.length<1||requestedFlightInstanceIds.length>96||
    new Set(requestedFlightInstanceIds).size!==requestedFlightInstanceIds.length||requestedFlightInstanceIds.some(x=>!/^leg:g5a:[a-f0-9]{64}$/.test(x))||
    !t||t.independentT24CustodyTrustApproved!==true||t.runDayIndex!==q.runDayIndex||t.reviewedCodeSha!==scope.expectedReviewedCodeSha||
    t.manifestSha256!==q.manifestSha256||t.rightsSha256!==q.rightsReviewSha256||t.releaseSha256!==q.reviewedReleaseSha256||
    t.expectedFrameSha256!==scope.expectedFrameSha256||t.expectedConfigSha256!==scope.expectedConfigSha256||t.expectedSelectedTVersion!==scope.expectedSelectedTVersion)
  return hold("CONDITIONAL_EXACT_SCOPE");
 const actual=await readP5ConditionalLaterIdentityInventory(sourcePool,sourceScope);
 const members=new Map(actual.memberReview.privateReviewProposals.map(p=>[p.flightInstanceId,p]));
 const drafts=new Set(actual.privateFeatureDrafts.map(p=>p.flightInstanceId));
 if(actual.report.predictionTimingReviewed!==false||members.size!==actual.memberReview.privateReviewProposals.length||drafts.size!==actual.privateFeatureDrafts.length||
    requestedFlightInstanceIds.some(id=>!members.has(id)||!drafts.has(id)))return hold("CONDITIONAL_CURRENT_MEMBER_REQUIRED");
 const selected=requestedFlightInstanceIds.map(id=>{
  const p=members.get(id)!;
   if(p.forecastReferenceEvidence!=="PENDING_T24_REVIEW"||p.identityEvidenceTier!=="CONDITIONAL_QUERY_FILTERED_SERVICE"||p.reviewedProtocolAmendmentSha256!==sourceScope.protocolSha256||
     p.manifestSha256!==q.manifestSha256||p.horizon!==q.horizon||
     utc(p.selectedTNativeUtc)-utc(p.predictionCutoffUtc)!==(q.horizon==="T-6h"?21600000:5400000))
   return hold("CONDITIONAL_MEMBER_CUTOFF_DRIFT");
  return {source:{flightInstanceId:id,selectedTNativeUtc:p.selectedTNativeUtc,ownPreCutoffUtc:p.predictionCutoffUtc,horizon:p.horizon}};
 });
 const got=await readP6T24WitnessCustodyBatch({client:custody.readerClient,trusts:requestedFlightInstanceIds.map(flightInstanceId=>({...t,flightInstanceId})),scope:custody.scope});
 if(utc(got.observedDbClockUtc)<utc(actual.observedDbClockUtc))return hold("CONDITIONAL_CUSTODY_CLOCK_REGRESSION");
 const byReceipt=new Map<string,ReviewReceipt>(),unresolved:string[]=[];
 for(const x of got.privateDecisions){
  if(x.status==="EXACT_CUSTODY_RECEIPT_AWAIT_SCIENTIFIC_REVIEW")byReceipt.set(x.flightInstanceId,{receipt:x.receipt,expectedReceiptSha256:x.receipt.receiptSha256});
  else if(x.status==="CUSTODY_INVALID_OR_EXPIRED_UNRESOLVED")unresolved.push(x.flightInstanceId);
 }
 const evidence=await readP6ExactSelectedLaterT24Evidence(prePool,selected,{
  expectedDossierSha256:q.queryDigestSha256,expectedFrameSha256:scope.expectedFrameSha256,expectedConfigSha256:scope.expectedConfigSha256,
   expectedSelectedTVersion:scope.expectedSelectedTVersion,pageIndex:1,runDayIndex:q.runDayIndex,sourceObservedDbClockUtc:actual.observedDbClockUtc},byReceipt,unresolved,scope.conditionalMetadataReaderLogin,
   {startUtc:sourceScope.expectedServiceWindowStartUtc,endUtc:sourceScope.expectedServiceWindowEndUtc});
 if(utc(evidence.observedDbClockUtc)<utc(got.observedDbClockUtc))return hold("CONDITIONAL_CUSTODY_TO_PRE_CLOCK_REGRESSION");
 const {expectedDossierSha256:unused,...redacted}=evidence;
 const summary={...redacted,status:"ACTUAL_CONDITIONAL_T24_EVIDENCE_PAGE_FOR_SEPARATE_LATER_REVIEW_NO_GO",
  identityEvidenceTier:"CONDITIONAL_QUERY_FILTERED_SERVICE",expectedSourceQueryDigestSha256:q.queryDigestSha256,
  privateCustodyVerifiedCount:got.verifiedCount,privateCustodyAbsentCount:got.absentCount,
  privateCustodyUnresolvedCount:got.unresolvedCount,scientificReviewStillRequired:true,standaloneLaterAuthorized:false};
 return Object.freeze(Object.defineProperties(summary,{privateDecisions:{value:evidence.privateDecisions,enumerable:false},
  privateCustodyReceipts:{value:Object.freeze([...byReceipt.values()]),enumerable:false}})) as typeof summary&{readonly privateDecisions:readonly Decision[];readonly privateCustodyReceipts:readonly ReviewReceipt[]};
}

/** Conditional POST planning only: exact committed T6 + already verified
 * Packet B candidates use the existing separately authenticated T24 custody
 * and restricted metadata views. No new signer, table, queue, permission,
 * retroactive witness, standalone approval or actual physical label. */
export interface P6ConditionalPostWitnessAnchor {
 flightInstanceId:string;selectedTNativeUtc:string;predictionCutoffUtc:string;preIssuedAtUtc:string;
 sourceExpiresAtUtc:string;assessmentWatermarkUtc:string;expectedT24ReceiptSha256?:string;
 configSha256:string;selectedTVersion:string;
}
export interface P6ConditionalPostWitnessReadScope {
 independentConditionalPostWitnessReadApproved:true;existingPaidDispatchApproved:false;
 manifestSha256:string;rightsSha256:string;releaseSha256:string;reviewedCodeSha:string;
 expectedFrameSha256:string;sourceQueryDigestSha256:string;runDayIndex:number;
 sourceObservedDbClockUtc:string;serviceWindowStartUtc:string;serviceWindowEndUtc:string;
}
export async function readP6ConditionalPostT24WitnessPage(prePool:Pick<Pool,"connect">,anchors:readonly P6ConditionalPostWitnessAnchor[],
 scope:P6ConditionalPostWitnessReadScope,custody:PendingStoredT24Custody){
 const t=custody?.trust;
 if(!scope||scope.independentConditionalPostWitnessReadApproved!==true||scope.existingPaidDispatchApproved!==false||
    ![scope.manifestSha256,scope.rightsSha256,scope.releaseSha256,scope.expectedFrameSha256,scope.sourceQueryDigestSha256].every(v=>H.test(v??""))||
    !/^[a-f0-9]{40}$/.test(scope.reviewedCodeSha??"")||!Number.isSafeInteger(scope.runDayIndex)||scope.runDayIndex<1||scope.runDayIndex>31||
    !t||t.independentT24CustodyTrustApproved!==true||t.runDayIndex!==scope.runDayIndex||t.reviewedCodeSha!==scope.reviewedCodeSha||
    t.manifestSha256!==scope.manifestSha256||t.rightsSha256!==scope.rightsSha256||t.releaseSha256!==scope.releaseSha256||t.expectedFrameSha256!==scope.expectedFrameSha256||
    !H.test(t.expectedConfigSha256??"")||typeof t.expectedSelectedTVersion!=="string"||t.expectedSelectedTVersion.length<10||
    !custody.scope||!prePool||typeof prePool.connect!=="function"||!Array.isArray(anchors)||anchors.length<1||anchors.length>16)
  return hold("CONDITIONAL_POST_WITNESS_SCOPE");
 const sourceAt=utc(scope.sourceObservedDbClockUtc),start=utc(scope.serviceWindowStartUtc),end=utc(scope.serviceWindowEndUtc);
 if(start>=end||new Set(anchors.map(x=>x.flightInstanceId)).size!==anchors.length)hold("CONDITIONAL_POST_WITNESS_PAGE");
 const selected=anchors.map(a=>{
  const T=utc(a.selectedTNativeUtc),cutoff=utc(a.predictionCutoffUtc),pre=utc(a.preIssuedAtUtc),expiry=utc(a.sourceExpiresAtUtc),watermark=utc(a.assessmentWatermarkUtc);
  if(!/^leg:g5a:[a-f0-9]{64}$/.test(a.flightInstanceId)||T<start||T>=end||T-cutoff!==21600000||pre>=cutoff||pre>sourceAt||watermark!==T+7200000||expiry<=watermark||sourceAt>=watermark||
     a.configSha256!==t.expectedConfigSha256||a.selectedTVersion!==t.expectedSelectedTVersion||
     (a.expectedT24ReceiptSha256!==undefined&&!H.test(a.expectedT24ReceiptSha256)))hold("CONDITIONAL_POST_WITNESS_ANCHOR");
  return {source:{flightInstanceId:a.flightInstanceId,selectedTNativeUtc:a.selectedTNativeUtc,ownPreCutoffUtc:a.predictionCutoffUtc,horizon:"T-6h",
    expectedT24ReceiptSha256:a.expectedT24ReceiptSha256,preIssuedAtUtc:a.preIssuedAtUtc,sourceExpiresAtUtc:a.sourceExpiresAtUtc,assessmentWatermarkUtc:a.assessmentWatermarkUtc}};
 });
 const got=await readP6T24WitnessCustodyBatch({client:custody.readerClient,trusts:anchors.map(a=>({...t,flightInstanceId:a.flightInstanceId})),scope:custody.scope});
 if(utc(got.observedDbClockUtc)<sourceAt||utc(got.observedDbClockUtc)-sourceAt>120000||got.requestedCount!==anchors.length)hold("POST_CUSTODY_CLOCK_OR_DENOMINATOR");
 const byReceipt=new Map<string,ReviewReceipt>(),unresolved:string[]=[];
 for(const x of got.privateDecisions){
  if(x.status==="EXACT_CUSTODY_RECEIPT_AWAIT_SCIENTIFIC_REVIEW")byReceipt.set(x.flightInstanceId,{receipt:x.receipt,expectedReceiptSha256:x.receipt.receiptSha256});
  else if(x.status==="CUSTODY_INVALID_OR_EXPIRED_UNRESOLVED")unresolved.push(x.flightInstanceId);
 }
 const read=await readP6ExactSelectedLaterT24Evidence(prePool,selected,{expectedDossierSha256:scope.sourceQueryDigestSha256,
  expectedFrameSha256:scope.expectedFrameSha256,expectedConfigSha256:t.expectedConfigSha256,expectedSelectedTVersion:t.expectedSelectedTVersion,
  pageIndex:1,runDayIndex:scope.runDayIndex,sourceObservedDbClockUtc:got.observedDbClockUtc},byReceipt,unresolved,custody.scope.expectedSessionLogin,
  {startUtc:scope.serviceWindowStartUtc,endUtc:scope.serviceWindowEndUtc},true);
 if(utc(read.observedDbClockUtc)-sourceAt>120000)hold("POST_WITNESS_TOTAL_CLOCK");
 const verified=read.privateDecisions.filter(d=>d.status==="T24_PERSISTED_AND_SEPARATE_RECEIPT_MATCH_REVIEW_REQUIRED"&&d.receiptSha256!==null).length;
 const summary={status:"ACTUAL_CONDITIONAL_POST_T24_WITNESS_READ_NO_GO",runDayIndex:scope.runDayIndex,candidateCount:anchors.length,
  verifiedT24WitnessCount:verified,unresolvedT24WitnessCount:anchors.length-verified,observedDbClockUtc:read.observedDbClockUtc,
  counts:read.counts,scientificReviewStillRequired:true,standaloneLaterAuthorized:false,postIssuerCommissioned:false,physicalGateOutCertified:false,
  providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(summary,"privateDecisions",{value:read.privateDecisions,enumerable:false})) as typeof summary&{readonly privateDecisions:readonly Decision[]};
}
