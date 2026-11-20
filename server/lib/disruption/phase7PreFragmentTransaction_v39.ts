/** Same-transaction PRE persistence. Candidate for reviewed installation;
 * does not create approvals, install SQL, make provider calls, or extend
 * the original source clock. Existing Stage14 source membership stays
 * authoritative. Stored derived fragment and temporary link are distinct. */
import {randomUUID,createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {preparePhase7BoundPrePreservation,type Phase7BoundPrePreservationRequest} from "./phase7BoundPrePreservation_v39";
import {buildPhase7DerivedReleasePacket} from "./phase7DerivedReleaseWriter_v39";
import {serializePhase7DerivedReleasePacket} from "./phase6DerivedTrainingReleasePacket_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import type {Phase7DerivedReleaseContract} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";
import type {Phase7CanonicalFieldDisposition} from "./phase7CanonicalFieldParity_v39";
import type {P5EPreField} from "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";
const H=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const fail=(s:string):never=>{throw Error("PHASE7_PRE_FRAGMENT_REJECTED:"+s)};
const need=(v:unknown,s:string)=>{if(!v)fail(s)};
const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
const digest=(s:unknown):s is string=>typeof s==="string"&&H.test(s)&&!/^([a-f0-9])\1{63}$/.test(s);
const iso=(d:unknown)=>{need(d instanceof Date&&Number.isFinite(d.getTime()),"database-clock");return (d as Date).toISOString()};
export interface Phase7ProspectivePrePreservationPolicy{
 schema:"v39.phase7.prospective-pre-preservation-review.v1";
 manifestSha256:string;rightsSha256:string;contractSha256:string;profileSha256:string;
 dispositionsSha256:string;mappingHours:number;researchExpiryUtc:string;
 approvedForPreDurableStorage:true;boundedSameLegLinkApproved:true;
}
type PolicyInputs={contract:Phase7DerivedReleaseContract;profile:Phase7ReviewedTransformationProfile;dispositions:readonly Phase7CanonicalFieldDisposition[];review:Phase7ProspectivePrePreservationPolicy;reviewSha256:string};
export interface Phase7BoundPreTransactionInput extends PolicyInputs{
 manifestSha256:string;queryDigestSha256:string;rightsSha256:string;
 snapshotId:string;runDayIndex:number;
 selectedNativeTUtc:string;cutoffUtc:string;issuedAtUtc:string;sourceExpiresAtUtc:string;
 horizon:Phase7BoundPrePreservationRequest["horizon"];features:Phase7BoundPrePreservationRequest["features"];
 /** Actual separately authenticated field proof (not merely source present). */
 separatelyVerifiedFields:readonly P5EPreField[];
}
export interface Phase7PreFragmentReceipt{
 rowId:string;groupId:string;packetSha256:string;bytes:string;
 researchExpiryUtc:string;temporaryLinkExpiresAtUtc:string;
}
export function checkProspectivePrePolicy(x:PolicyInputs,manifest:string,rights:string){
 const p=x.review,keys=["schema","manifestSha256","rightsSha256","contractSha256","profileSha256","dispositionsSha256","mappingHours","researchExpiryUtc","approvedForPreDurableStorage","boundedSameLegLinkApproved"];
 need(p&&Object.keys(p).length===keys.length&&keys.every(k=>Object.hasOwn(p,k))&&p.schema==="v39.phase7.prospective-pre-preservation-review.v1"&&[manifest,rights,x.reviewSha256,p.contractSha256,p.profileSha256,p.dispositionsSha256].every(digest)&&p.manifestSha256===manifest&&p.rightsSha256===rights&&p.contractSha256===hashPhase7DurableCandidate(x.contract)&&p.profileSha256===hashPhase7DurableCandidate(x.profile)&&p.dispositionsSha256===hashPhase7DurableCandidate(x.dispositions)&&x.reviewSha256===hashPhase7DurableCandidate(p)&&p.mappingHours===x.contract.sourceToReleaseMappingExpiryHours&&p.mappingHours===x.profile.mappingExpiryHours&&p.researchExpiryUtc===x.contract.researchExpiryUtc&&p.approvedForPreDurableStorage===true&&p.boundedSameLegLinkApproved===true,"review-binding");
 // No future claim that these hashes alone authenticate a reviewer.
}
export async function persistPhase7BoundPreFragmentInTransaction(c:PoolClient,x:Phase7BoundPreTransactionInput):Promise<Phase7PreFragmentReceipt>{
 checkProspectivePrePolicy(x,x.manifestSha256,x.rightsSha256);
 need(digest(x.queryDigestSha256)&&/^[1-9][0-9]{0,17}$/.test(x.snapshotId)&&Number.isInteger(x.runDayIndex)&&x.runDayIndex>=1&&x.runDayIndex<=31&&x.contract.cohortBucketCount>=31,"exact-source-scope");
 // Original 20/5/6 chronological day assignment. Same-leg groups with
 // conflicting day assignments must hold rather than move across splits.
 const split=x.runDayIndex<=20?"train":x.runDayIndex<=25?"validation":"test";
 const q=(await c.query("SELECT clock_timestamp() AS at,current_setting('transaction_isolation') AS isolation,current_setting('transaction_read_only') AS ro")).rows;
 need(q.length===1&&q[0].isolation==="serializable"&&q[0].ro==="off","same-transaction");
 const at=iso(q[0].at);
 need(Date.parse(at)<Date.parse(x.cutoffUtc),"late-preservation");
 const out=preparePhase7BoundPrePreservation(x.contract,x.profile,{horizon:x.horizon,selectedNativeTUtc:x.selectedNativeTUtc,cutoffUtc:x.cutoffUtc,issuedAtUtc:x.issuedAtUtc,transformedAtUtc:at,sourceExpiresAtUtc:x.sourceExpiresAtUtc,cohortBucket:x.runDayIndex-1,split,features:x.features,dispositions:x.dispositions,separatelyVerifiedFields:x.separatelyVerifiedFields});
 // A source-present field must not silently disappear. Null/missing input
 // remains legitimate. Input review choices do not authorize data loss.
 need(Object.values(out.audit.counts).every(v=>v.lost===0&&v.falsePresence===0),"unpreserved-present-field");
 need(x.dispositions.every(d=>d.disposition!=="LONG_TERM_RIGHTS_REQUIRED"),"unresolved-field-review");
 const packet=buildPhase7DerivedReleasePacket(x.contract,[out.input]),rowId=packet.rows[0].releaseRowId;
 const bytes=serializePhase7DerivedReleasePacket(x.contract,packet),packetSha256=hash(bytes);
 const result=await c.query("SELECT group_id::text AS group_id,expires_at_utc FROM phase7_private.persist_bound_pre_fragment_v39($1,$2,$3::bigint,$4::uuid,$5::uuid,$6,$7,$8,$9,$10,$11,$12::timestamptz,$13::timestamptz,$14,$15::timestamptz)",[x.manifestSha256,x.queryDigestSha256,x.snapshotId,randomUUID(),rowId,x.review.contractSha256,x.review.profileSha256,x.rightsSha256,x.reviewSha256,Buffer.from(bytes),packetSha256,x.issuedAtUtc,x.sourceExpiresAtUtc,x.review.mappingHours,x.review.researchExpiryUtc]);
 const z=result.rows[0];need(result.rowCount===1&&UUID.test(z?.group_id),"exact-fragment-insert");
 const expiry=iso(z.expires_at_utc);
 need(Date.parse(expiry)<=Math.min(Date.parse(x.sourceExpiresAtUtc),Date.parse(x.issuedAtUtc)+x.review.mappingHours*3600000,Date.parse(x.review.researchExpiryUtc))&&Date.parse(expiry)>Date.parse(at),"mapping-clock");
 return {rowId,groupId:z.group_id,packetSha256,bytes,researchExpiryUtc:x.review.researchExpiryUtc,temporaryLinkExpiresAtUtc:expiry};
}
/** Separate restricted reader. No temporary source linkage permission is
 * necessary; failures after the original commit are reconcile/no-replay. */
export async function verifyPhase7PreFragmentReadback(reader:Pool,expectedReaderRole:string,receipt:Phase7PreFragmentReceipt){
 need(/^[a-z][a-z0-9_]{4,62}$/.test(expectedReaderRole)&&!["postgres","neondb_owner"].includes(expectedReaderRole),"reader-role");
 const c=await reader.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const q=(await c.query("SELECT current_user AS actor,session_user AS login,current_setting('transaction_read_only') AS ro,pg_is_in_recovery() replica,r.rolsuper,r.rolcreaterole,r.rolcreatedb,r.rolbypassrls,r.rolreplication,EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS member,has_table_privilege(current_user,'phase7_private.pre_fragment_v39','SELECT') AS can_read,has_any_column_privilege(current_user,'phase7_private.pre_fragment_v39','INSERT,UPDATE') AS can_write,has_table_privilege(current_user,'phase7_private.pre_fragment_v39','DELETE,TRUNCATE,TRIGGER') AS can_mutate,has_any_column_privilege(current_user,'phase7_private.pre_source_link_v39','SELECT,INSERT,UPDATE,REFERENCES') AS can_link,has_table_privilege(current_user,'phase7_private.pre_source_link_v39','DELETE,TRUNCATE,TRIGGER') AS can_mutate_link,has_schema_privilege(current_user,'phase7_private','CREATE') AS can_create FROM pg_roles r WHERE r.rolname=current_user")).rows;
  const a=q[0];need(q.length===1&&a.actor===expectedReaderRole&&a.login===expectedReaderRole&&a.ro==="on"&&a.replica===false&&a.can_read===true&&["rolsuper","rolcreaterole","rolcreatedb","rolbypassrls","rolreplication","member","can_write","can_mutate","can_link","can_mutate_link","can_create"].every(k=>a[k]===false),"independent-reader-privileges");
  const z=(await c.query("SELECT group_id::text AS group_id,packet_sha256,packet_bytes,research_expiry_utc FROM phase7_private.pre_fragment_v39 WHERE row_id=$1::uuid AND research_expiry_utc>clock_timestamp()",[receipt.rowId])).rows;
  need(z.length===1&&z[0].group_id===receipt.groupId&&z[0].packet_sha256===receipt.packetSha256&&Buffer.isBuffer(z[0].packet_bytes)&&z[0].packet_bytes.equals(Buffer.from(receipt.bytes))&&iso(z[0].research_expiry_utc)===receipt.researchExpiryUtc,"independent-fragment-readback");
  await c.query("ROLLBACK");
  return {verified:true,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 }finally{await c.query("ROLLBACK").catch(()=>{});c.release()}
}
