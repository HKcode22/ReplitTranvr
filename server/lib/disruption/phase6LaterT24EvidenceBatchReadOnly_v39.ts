/** Native later-review prerequisite, READ ONLY, with original V0081 and
 * Stage24 semantics. Classify a bounded page of already exact-SHA-reviewed
 * SOURCE dossier candidates using the actual commissioned PRE role.
 * No provider call, private-key operation, new role, new table, PRE write,
 * retroactive witness or independent scientific/rights certification.
 * A missing separately archived Stage17 receipt is NOT missing T24.
 */
import type {Pool} from "pg";
import {P5_STAGE28_GROUPS} from "./phase5Stage28DedicatedRolePool_v39";
import {P5_STAGE24_REVIEWED_WITNESSED_T24_SQL} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {digestP5Stage24ReviewedReceipt,verifyP5Stage24WitnessedFrozenT,type P5Stage24ReviewedT24Receipt}
 from "./phase5T24WitnessedLaterHorizonGuard_v39";
import {digestP5UnsignedNativePreDossier,pageP5UnsignedNativePreReviewDossier,type P5UnsignedNativePreDossier}
 from "./phase5SourceBoundUnsignedPreDossier_v39";
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
 if(!page||page.entries.length<1||page.entries.length>96||scope.reviewedReceipts.length>page.entries.length)
  hold("UNBOUNDED_OR_EMPTY_PAGE");
 const priorClock=utc(dossier.sourceObservedDbClockUtc),ids=page.entries.map(e=>e.source.flightInstanceId);
 if(new Set(ids).size!==ids.length||ids.some(id=>!ID.test(id))||
    page.entries.some(e=>e.source.manifestSha256!==scope.expectedManifestSha256||
     e.source.expectedReviewedReleaseSha256!==scope.expectedReleaseSha256||
     e.source.expectedReviewedSourceRightsSha256!==scope.expectedRightsSha256||e.source.horizon!==dossier.horizon||
     utc(e.source.selectedTNativeUtc)-utc(e.source.ownPreCutoffUtc)!==(dossier.horizon==="T-6h"?21600000:5400000)))
  hold("CROSS_STUDY_PAGE_OR_NATIVE_CUTOFF_DRIFT");
 const byReceipt=new Map<string,ReviewReceipt>();
 for(const r of scope.reviewedReceipts){
  const id=r?.receipt?.flightInstanceId;
  if(!ids.includes(id)||byReceipt.has(id)||!H.test(r.expectedReceiptSha256??"")||
     r.receipt.receiptSha256!==r.expectedReceiptSha256||
     digestP5Stage24ReviewedReceipt(r.receipt)!==r.expectedReceiptSha256)
   hold("UNPINNED_DUPLICATE_OR_CROSS_PAGE_RECEIPT");
  byReceipt.set(id,r);
 }
 const c=await pool.connect();let begun=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");begun=true;
  await c.query("SET LOCAL statement_timeout='10000ms'");
  await c.query("SET LOCAL lock_timeout='2000ms'");
  const ident=await c.query("SELECT current_database() AS db,current_user AS actor,session_user AS login,"+
   "current_setting('server_version_num')::int AS version,current_setting('transaction_read_only') AS ro,"+
   "pg_is_in_recovery() AS replica,clock_timestamp() AS now");
  const i=ident.rows[0];
  if(ident.rowCount!==1||i?.db!=="neondb"||i.actor!==P5_STAGE28_GROUPS.pre||
     i.login!=="phase5_p30_pre_login_20261107"||Number(i.version)<160000||Number(i.version)>=170000||
     i.ro!=="on"||i.replica!==false)hold("ACTUAL_COMMISSIONED_PG16_PRE_READ_ROLE_REQUIRED");
  const now=utc(i.now);
  if(now<priorClock)hold("SOURCE_OR_READ_CLOCK_REGRESSION");
  const limit=2*ids.length+1,args=[ids,limit];
  const snap=await c.query(P6_LATER_T24_SNAPSHOTS_BATCH_SQL,args),witness=await c.query(P6_LATER_T24_WITNESSES_BATCH_SQL,args);
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
  const decisions:Decision[]=page.entries.map(e=>{
   const s=e.source,id=s.flightInstanceId,native=utc(s.selectedTNativeUtc),cutoff=utc(s.ownPreCutoffUtc),
    sr=snaps.get(id)??[],wr=witnesses.get(id)??[],r=byReceipt.get(id);
   let status:P6LaterT24EvidenceStatus;
   let receiptSha256:string|null=null;
   if(now>=cutoff-900000)status="LATER_REVIEW_LEAD_MISSED_CENSOR";
   else if(sr.length===0&&wr.length===0){
    if(r)status="T24_RECEIPT_OR_NATIVE_ANCHOR_MISMATCH";
    else status=now<native-86400000?"T24_NOT_YET_DUE_NO_MISSINGNESS_CLAIM":
     "T24_ABSENT_AFTER_CUTOFF_SEPARATE_MISSINGNESS_REVIEW_REQUIRED";
   }else if(sr.length!==1||wr.length!==1||String(sr[0].snapshot_id)!==String(wr[0].snapshot_id))
    status="T24_PARTIAL_OR_AMBIGUOUS_NO_REPLAY";
   else if(!r)status="T24_EXISTS_PRIVATE_RECEIPT_UNAVAILABLE";
   else{
    try{
     verifyP5Stage24WitnessedFrozenT(wr[0],r.receipt,{flightInstanceId:id,selectedTNativeUtc:s.selectedTNativeUtc,
      expectedSelectedTVersion:scope.expectedSelectedTVersion,expectedFrameSha256:scope.expectedFrameSha256,
      expectedConfigSha256:scope.expectedConfigSha256,cutoffUtc:s.ownPreCutoffUtc,horizon:s.horizon as "T-6h"|"T-90m"});
     if(utc(r.receipt.stage17PostCommitReadbackAtUtc)>now)hold("FUTURE_T24_READBACK");
     status="T24_PERSISTED_AND_SEPARATE_RECEIPT_MATCH_REVIEW_REQUIRED";receiptSha256=r.expectedReceiptSha256;
    }catch{status="T24_RECEIPT_OR_NATIVE_ANCHOR_MISMATCH";}
   }
   return Object.freeze({flightInstanceId:id,horizon:s.horizon as "T-6h"|"T-90m",status,receiptSha256});
  });
  await c.query("ROLLBACK");begun=false;
  const counts:Partial<Record<P6LaterT24EvidenceStatus,number>>={};
  for(const d of decisions)counts[d.status]=(counts[d.status]??0)+1;
  const report={status:"ACTUAL_T24_EVIDENCE_PAGE_FOR_SEPARATE_LATER_REVIEW_NO_GO",expectedDossierSha256:scope.expectedDossierSha256,
   runDayIndex:dossier.runDayIndex,pageIndex:scope.pageIndex,observedDbClockUtc:new Date(now).toISOString(),
   candidateCount:decisions.length,counts,sourceRightsCertified:false,reviewedPacketsIssued:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
  return Object.freeze(Object.defineProperty(report,"privateDecisions",{value:Object.freeze(decisions),enumerable:false})) as typeof report&{readonly privateDecisions:readonly Decision[]};
 }finally{
  if(begun)await c.query("ROLLBACK").catch(()=>{});
  c.release();
 }
}
