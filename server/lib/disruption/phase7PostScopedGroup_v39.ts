/** Scoped read of already-durable PRE fragments and independently reviewed
 * final group persistence. Never read expired FIDS or write source linkage.
 * This adapter is not a commissioning approval or an outcome reviewer.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import type {P6PostPreservationAnchor} from "./phase6ActualPostOutcomeObservability_v39";
import type {Phase7DerivedReleaseContract} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";
import {serializePhase7DerivedReleasePacket,type Phase7DerivedReleasePacket} from "./phase6DerivedTrainingReleasePacket_v39";
import {assemblePhase7FinalGroupCandidate,type Phase7StoredPreFragment,type Phase7GroupOutcomeScope,type Phase7FinalAssemblyIds} from "./phase7FinalGroupAssembly_v39";
import {hashPhase7DurableCandidate,writeReviewedPhase7DurableBundle,type Phase7DurableDerivedBundle,type Phase7DurableBundleApproval} from "./phase7DurableDerivedBundleCandidate_v39";
const H=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const role=(s:string)=>/^[a-z][a-z0-9_]{4,62}$/.test(s)&&!["postgres","neondb_owner"].includes(s);
const hold=(s:string):never=>{throw Error("HOLD_P7_SCOPED_POST_GROUP_"+s);};
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const fn="phase7_private.read_bound_pre_group_v39(text,bigint,text,text,integer,text,text)";
const conditionalFn="phase7_private.read_bound_conditional_t6_group_v39(text,bigint,text,text,integer,text,text,text)";
export const P7_POST_CONDITIONAL_T6_GROUP_SQL="SELECT group_id::text AS group_id,contract_sha256,profile_sha256,packet_sha256,packet_bytes FROM phase7_private.read_bound_conditional_t6_group_v39($1,$2::bigint,$3,$4,$5::integer,$6,$7,$8)";
export const P7_POST_SCOPED_GROUP_SQL="SELECT group_id::text AS group_id,contract_sha256,profile_sha256,packet_sha256,packet_bytes FROM phase7_private.read_bound_pre_group_v39($1,$2::bigint,$3,$4,$5::integer,$6,$7)";
async function assertPhase7PostScopedActor(c:import("pg").PoolClient,expectedRole:string,expiryMs:number,scopedFn=fn){
 if(!role(expectedRole)||!Number.isFinite(expiryMs))hold("BAD_PREFLIGHT_SCOPE");
  const q=(await c.query("SELECT current_user actor,session_user login,current_database() db,current_setting('transaction_read_only') ro,current_setting('server_version_num')::int version,pg_is_in_recovery() replica,clock_timestamp() AS at,r.rolsuper,r.rolcreaterole,r.rolcreatedb,r.rolbypassrls,r.rolreplication,EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS member,has_schema_privilege(current_user,'phase7_private','USAGE') can_use,has_schema_privilege(current_user,'phase7_private','CREATE') can_create,has_function_privilege(current_user,$1,'EXECUTE') can_scope,(SELECT count(*)<>8 OR coalesce(bool_or(has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER')),true) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname||'.'||c.relname)=ANY(ARRAY['phase7_private.pre_fragment_v39','phase7_private.pre_source_link_v39','phase7_private.pre_preservation_policy_v39','phase7_private.derived_release_bundle_v39','clean.flight_snapshots','clean.flight_population','clean.fids_query_response','clean.phase5_fids_original_binding_v39'])) AS can_direct FROM pg_roles r WHERE r.rolname=current_user",[scopedFn])).rows;
  const x=q[0];
  if(q.length!==1||x.actor!==expectedRole||x.login!==expectedRole||x.db!=="neondb"||x.ro!=="on"||x.version<160000||x.version>=170000||x.replica!==false||x.can_use!==true||x.can_scope!==true||["rolsuper","rolcreaterole","rolcreatedb","rolbypassrls","rolreplication","member","can_create","can_direct"].some(k=>x[k]!==false)||
     !(x.at instanceof Date)||!Number.isFinite(x.at.getTime())||x.at.getTime()>=expiryMs)hold("READER_SCOPE_OR_CLOCK");
 return x;
}
/** F048 cleanup parity: a successful read is not returned before an
 * acknowledged rollback; never recycle a session of uncertain state. */
async function withScopedRead<T>(reader:Pick<Pool,"connect">,read:(c:import("pg").PoolClient)=>Promise<T>):Promise<T>{
 const c=await reader.connect();
 let rollbackAttempted=false,discard=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await c.query("SET LOCAL statement_timeout='12000ms'");
  const result=await read(c);
  rollbackAttempted=true;
  try{await c.query("ROLLBACK");}catch{discard=true;hold("ROLLBACK_UNACKNOWLEDGED");}
  return result;
 }catch(e){
  if(!rollbackAttempted){
   try{await c.query("ROLLBACK");}catch{discard=true;hold("ROLLBACK_UNACKNOWLEDGED");}
  }
  throw e;
 }finally{c.release(discard);}
}
/** Check the same exact scoped-reader grants before a paid POST. */
export async function preflightPhase7PostScopedReader(reader:Pick<Pool,"connect">,expectedRole:string,contract:Phase7DerivedReleaseContract){
 return withScopedRead(reader,async c=>{const x=await assertPhase7PostScopedActor(c,expectedRole,Date.parse(contract.researchExpiryUtc));return (x.at as Date).toISOString();});
}
export async function readPhase7PostScopedGroup(reader:Pick<Pool,"connect">,expectedRole:string,contract:Phase7DerivedReleaseContract,profile:Phase7ReviewedTransformationProfile,a:P6PostPreservationAnchor):Promise<{fragments:Phase7StoredPreFragment[];observedAtUtc:string}>{
 return readScopedGroup(reader,expectedRole,contract,profile,a);
}
/** Conditional schedule-revision lane only; no native physical inference. */
export async function readPhase7ConditionalT6ScopedGroup(reader:Pick<Pool,"connect">,expectedRole:string,contract:Phase7DerivedReleaseContract,profile:Phase7ReviewedTransformationProfile,a:P6PostPreservationAnchor,protocolSha256:string){
 if(a?.horizon!=="T-6h"||typeof a.flightInstanceId!=="string"||!/^leg:g5a:[a-f0-9]{64}$/.test(a.flightInstanceId)||
    typeof protocolSha256!=="string"||!H.test(protocolSha256))hold("CONDITIONAL_T6_SCOPE");
 return readScopedGroup(reader,expectedRole,contract,profile,a,protocolSha256);
}
async function readScopedGroup(reader:Pick<Pool,"connect">,expectedRole:string,contract:Phase7DerivedReleaseContract,profile:Phase7ReviewedTransformationProfile,a:P6PostPreservationAnchor,protocolSha256?:string):Promise<{fragments:Phase7StoredPreFragment[];observedAtUtc:string}>{
 if(!role(expectedRole)||!a||a.ambiguousIdentity||!(/^[1-9][0-9]{0,17}$/).test(a.snapshotId)||
  ![a.manifestSha256,a.rightsSha256,a.queryDigestSha256,a.frameSha256].every(v=>H.test(v))||
  !Number.isSafeInteger(a.runDayIndex)||a.runDayIndex<1||a.runDayIndex>31||!(/^[A-Z0-9]{4}$/).test(a.airportIcao)||
  !Number.isFinite(Date.parse(a.sourceExpiresAtUtc))||!Number.isFinite(Date.parse(contract.researchExpiryUtc)))hold("BAD_ANCHOR");
 return withScopedRead(reader,async c=>{
  const x=await assertPhase7PostScopedActor(c,expectedRole,Math.min(Date.parse(a.sourceExpiresAtUtc),Date.parse(contract.researchExpiryUtc)),protocolSha256===undefined?fn:conditionalFn);
  const args=[a.manifestSha256,a.snapshotId,a.rightsSha256,a.queryDigestSha256,a.runDayIndex,a.airportIcao,a.frameSha256];
  const q2=protocolSha256===undefined?await c.query(P7_POST_SCOPED_GROUP_SQL,args):await c.query(P7_POST_CONDITIONAL_T6_GROUP_SQL,[...args,protocolSha256]);
  if(q2.rowCount!==q2.rows.length||q2.rows.length<1||q2.rows.length>3)hold("FRAGMENT_COUNT");
  const fragments=q2.rows.map((z):Phase7StoredPreFragment=>{
   if(!UUID.test(z.group_id)||z.contract_sha256!==hashPhase7DurableCandidate(contract)||z.profile_sha256!==hashPhase7DurableCandidate(profile)||!Buffer.isBuffer(z.packet_bytes)||z.packet_bytes.length>65536||sha(z.packet_bytes)!==z.packet_sha256)hold("FRAGMENT_BINDING");
   const packet=JSON.parse(z.packet_bytes.toString("utf8")) as Phase7DerivedReleasePacket;
   if(serializePhase7DerivedReleasePacket(contract,packet)!==z.packet_bytes.toString("utf8")||packet.rows.length!==1||packet.rows[0].censoring!=="not_due"||
      packet.rows[0].cohortBucket!==a.runDayIndex-1||packet.rows[0].split!==(a.runDayIndex<=20?"train":a.runDayIndex<=25?"validation":"test")||
      Object.values(packet.rows[0].labelBuckets).some(v=>v!==null))hold("FRAGMENT_PAYLOAD");
   return {groupId:z.group_id,contractSha256:z.contract_sha256,profileSha256:z.profile_sha256,packetSha256:z.packet_sha256,packet};
  });
  if(fragments.some(f=>f.groupId!==fragments[0].groupId)||new Set(fragments.map(f=>f.packet.rows[0].horizon)).size!==fragments.length||
   !fragments.some(f=>f.packet.rows[0].horizon===a.horizon))hold("ANCHOR_GROUP_DRIFT");
  const at=(await c.query("SELECT clock_timestamp() AS at")).rows[0]?.at;
  if(!(at instanceof Date)||!Number.isFinite(at.getTime())||at<x.at||at.getTime()>=Math.min(Date.parse(a.sourceExpiresAtUtc),Date.parse(contract.researchExpiryUtc)))hold("EXPIRED_DURING_READ");
  return {fragments,observedAtUtc:at.toISOString()};
 });
}
/** The external reviewer must authenticate settlement and exact same-leg
 * evidence, including any expired comparator, before returning this scope.
 * A review of the exact resulting bundle is separate; no self-generated
 * review hashes and no promotion of unverified POST observations. */
export async function finalizeReviewedPhase7PostGroup(input:{
 writer:Pool;reader:Pool;writerRole:string;readerRole:string;
 contract:Phase7DerivedReleaseContract;profile:Phase7ReviewedTransformationProfile;
 anchor:P6PostPreservationAnchor;fragments:readonly Phase7StoredPreFragment[];
 scope:Phase7GroupOutcomeScope;releasedAtUtc:string;assemblyIds?:Phase7FinalAssemblyIds;
 independentlyApproveExactBundle:(b:Readonly<Phase7DurableDerivedBundle>)=>Promise<Phase7DurableBundleApproval>;
}){
 const {anchor:a,scope:s}=input;
 if(a.ambiguousIdentity||!input.fragments.some(f=>f.packet.rows[0]?.horizon===a.horizon)||
  Object.values(s.evidence).some(e=>e!=null&&(e.flightInstanceId!==a.flightInstanceId||e.selectedNativeTUtc!==a.selectedNativeTUtc))||
  (s.evidence[a.horizon]!=null&&(
   s.evidence[a.horizon]!.preIssuedAtUtc!==a.preIssuedAtUtc||s.evidence[a.horizon]!.originalSourceAvailableAtUtc!==a.originalSourceAvailableAtUtc||
   s.evidence[a.horizon]!.frozenSourceOriginalSha256!==a.sourceResponseSha256)))hold("REVIEW_NOT_BOUND_TO_LIVE_ANCHOR");
 const v=assemblePhase7FinalGroupCandidate(input.contract,input.profile,input.fragments,s,input.releasedAtUtc,input.assemblyIds);
 // Construct exact requested final bytes, not an approval. The independent
 // reviewer must return a valid review binding precisely these bytes.
 const bundle:Phase7DurableDerivedBundle={schema:"v39.phase7.durable-derived-bundle.v1",packet:v.packet,
  paired:{...v.association,schema:"v39.phase7.paired-derived-association-reviewed.v1",approvedForUse:true},continuous:v.continuous};
 const expected=hashPhase7DurableCandidate(bundle),approval=await input.independentlyApproveExactBundle(bundle);
 if(hashPhase7DurableCandidate(bundle)!==expected||approval?.bundleSha256!==expected)hold("EXACT_BUNDLE_REVIEW_DRIFT");
 return writeReviewedPhase7DurableBundle(input.writer,input.reader,input.contract,bundle,approval,{writerRole:input.writerRole,readerRole:input.readerRole},new Date(input.releasedAtUtc));
}
