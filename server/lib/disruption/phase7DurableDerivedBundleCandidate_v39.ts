/** Review-only durable release boundary; deliberately not called by a collector.
 * A genuine independent release decision, authentic source membership and
 * reviewed source-to-derived parity are upstream prerequisites. No ephemeral
 * mapping receipt, provider raw bytes, source identifier or clock enters storage.
 */
import {createHash} from "node:crypto";
import type {Pool} from "pg";
import {serializePhase7DerivedReleasePacket,type Phase7DerivedReleasePacket} from "./phase6DerivedTrainingReleasePacket_v39";
import type {Phase7DerivedReleaseContract,Phase7ReleaseCensoring,Phase6ReleaseHorizon,Phase7ReleaseSplit} from "./phase6DerivedTrainingReleaseContract_v39";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const digest=(x:string)=>createHash("sha256").update(x,"utf8").digest("hex");
const H=/^[a-f0-9]{64}$/;
const validHash=(x:unknown):x is string=>typeof x==="string"&&H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
const fail=(s:string):never=>{throw Error("PHASE7_DURABLE_BUNDLE_REJECTED:"+s)};
const need=(x:unknown,s:string)=>{if(!x)fail(s)};
const exact=(x:unknown,k:string[])=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null)&&Object.keys(x).length===k.length&&k.every(key=>Object.hasOwn(x,key));
function canonical(x:unknown):string{
 if(x===null||typeof x!=="object")return JSON.stringify(x);
 if(Array.isArray(x))return "["+x.map(canonical).join(",")+"]";
 const o=x as Record<string,unknown>;
 return "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+canonical(o[k])).join(",")+"}";
}
type Pair={groupId:string;split:Phase7ReleaseSplit;rows:readonly {horizon:Phase6ReleaseHorizon;releaseRowId:string}[]};
type Continuous={schema:"v39.phase7.continuous-gate-out-target-packet.v1";packetId:string;derivedPacketSha256:string;targetName:"gate_out_delay_minutes";unit:"minutes";primaryHorizon:"T-6h";rows:readonly {releaseRowId:string;value:number|null;censoring:Phase7ReleaseCensoring}[]};
export interface Phase7DurableDerivedBundle {
 schema:"v39.phase7.durable-derived-bundle.v1";
 packet:Phase7DerivedReleasePacket;
 paired:{schema:"v39.phase7.paired-derived-association-reviewed.v1";packetSha256:string;reviewEvidenceSha256:string;groups:readonly Pair[];sourceMappingPersisted:false;approvedForUse:true};
 continuous:Continuous;
}
export interface Phase7DurableBundleApproval {
 schema:"v39.phase7.durable-derived-bundle-independent-review.v1";
 contractSha256:string;
 bundleSha256:string;
 sourceParityReviewSha256:string;
 reconstructionReviewSha256:string;
 fieldReviewSha256:string;
 associationReviewSha256:string;
 continuousTargetReviewSha256:string;
 approvedForDurableStorage:true;
 sourceMappingPersisted:false;
 minTargetMinutes:number;
 maxTargetMinutes:number;
}
const approvedKeys=["schema","contractSha256","bundleSha256","sourceParityReviewSha256","reconstructionReviewSha256","fieldReviewSha256","associationReviewSha256","continuousTargetReviewSha256","approvedForDurableStorage","sourceMappingPersisted","minTargetMinutes","maxTargetMinutes"];
const RECORD="phase7_private.derived_release_bundle_v39";
export function validateDurableDerivedBundle(contract:Phase7DerivedReleaseContract,bundle:Phase7DurableDerivedBundle,approval:Phase7DurableBundleApproval,now:Date){
 need(exact(bundle,["schema","packet","paired","continuous"])&&bundle.schema==="v39.phase7.durable-derived-bundle.v1","bundle-shape");
 // Canonical packet validation checks the entire approved dictionary, missingness and censoring.
 const packetBytes=serializePhase7DerivedReleasePacket(contract,bundle.packet);
 const packetHash=digest(packetBytes),byId=new Map(bundle.packet.rows.map(x=>[x.releaseRowId,x]));
 const pair=bundle.paired,t=bundle.continuous;
 need(exact(approval,approvedKeys)&&approval.schema==="v39.phase7.durable-derived-bundle-independent-review.v1"&&approval.approvedForDurableStorage===true&&approval.sourceMappingPersisted===false&&approvedKeys.filter(x=>x.endsWith("Sha256")).every(k=>validHash(approval[k as keyof Phase7DurableBundleApproval]))&&approval.contractSha256===digest(canonical(contract)),"review-scope");
 need(Number.isFinite(now.getTime())&&Date.parse(contract.researchExpiryUtc)>now.getTime(),"research-expired");
 need(exact(pair,["schema","packetSha256","reviewEvidenceSha256","groups","sourceMappingPersisted","approvedForUse"])&&pair.schema==="v39.phase7.paired-derived-association-reviewed.v1"&&pair.approvedForUse===true&&pair.sourceMappingPersisted===false&&pair.packetSha256===packetHash&&pair.reviewEvidenceSha256===approval.associationReviewSha256&&Array.isArray(pair.groups)&&pair.groups.length>0&&pair.groups.length<=33333,"pair-review");
 const rowIds=new Set<string>(),groupIds=new Set<string>(),horizons=["T-24h","T-6h","T-90m"];
 for(const g of pair.groups){
  need(exact(g,["groupId","split","rows"])&&UUID.test(g.groupId)&&!groupIds.has(g.groupId)&&Array.isArray(g.rows)&&g.rows.length===3&&new Set(g.rows.map(x=>x.horizon)).size===3&&horizons.every(h=>g.rows.some(x=>x.horizon===h)),"pair-group");
  groupIds.add(g.groupId);
  for(const x of g.rows){
   const r=byId.get(x.releaseRowId);
   need(exact(x,["horizon","releaseRowId"])&&r&&r.horizon===x.horizon&&r.split===g.split&&!rowIds.has(x.releaseRowId),"pair-member");
   rowIds.add(x.releaseRowId);
  }
  need(new Set(g.rows.map(x=>byId.get(x.releaseRowId)?.cohortBucket)).size===1,"pair-cohort");
 }
 need(rowIds.size===byId.size,"pair-denominator");
 need(exact(t,["schema","packetId","derivedPacketSha256","targetName","unit","primaryHorizon","rows"])&&t.schema==="v39.phase7.continuous-gate-out-target-packet.v1"&&UUID.test(t.packetId)&&t.derivedPacketSha256===packetHash&&t.targetName==="gate_out_delay_minutes"&&t.unit==="minutes"&&t.primaryHorizon==="T-6h"&&Array.isArray(t.rows)&&Number.isFinite(approval.minTargetMinutes)&&Number.isFinite(approval.maxTargetMinutes)&&approval.minTargetMinutes<approval.maxTargetMinutes,"continuous-scope");
 const tIds=new Set<string>();
 for(const x of t.rows){
  const r=byId.get(x.releaseRowId);
  need(exact(x,["releaseRowId","value","censoring"])&&r?.horizon==="T-6h"&&r.censoring===x.censoring&&!tIds.has(x.releaseRowId),"continuous-member");
  need(x.censoring==="observed"?typeof x.value==="number"&&Number.isFinite(x.value)&&x.value>=approval.minTargetMinutes&&x.value<=approval.maxTargetMinutes:x.value===null,"continuous-value");
  tIds.add(x.releaseRowId);
 }
 need(tIds.size===bundle.packet.rows.filter(x=>x.horizon==="T-6h").length,"continuous-denominator");
 const bytes=canonical(bundle),bundleSha256=digest(bytes);
 need(Buffer.byteLength(bytes)<=32*1024*1024&&bundleSha256===approval.bundleSha256,"exact-reviewed-bundle-bytes");
 return {bytes,bundleSha256,packetId:bundle.packet.packetId,rowCount:byId.size,researchExpiryUtc:contract.researchExpiryUtc,approvalSha256:digest(canonical(approval))};
}
export const hashPhase7DurableCandidate=(x:unknown)=>digest(canonical(x));
type Verified=ReturnType<typeof validateDurableDerivedBundle>;
type Actor={writerRole:string;readerRole:string};
const roleName=(x:string)=>/^[a-z][a-z0-9_]{4,62}$/.test(x)&&!["postgres","neondb_owner"].includes(x);
async function actor(c:import("pg").PoolClient,expected:string,readOnly:boolean){
 const q=(await c.query("SELECT current_user actor,session_user login,current_setting('transaction_read_only') ro,current_database() db,pg_is_in_recovery() replica,r.rolsuper,r.rolcreaterole,r.rolcreatedb,r.rolbypassrls,r.rolreplication,EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) member FROM pg_roles r WHERE r.rolname=current_user")).rows;
 need(q.length===1&&q[0].actor===expected&&q[0].login===expected&&q[0].ro===(readOnly?"on":"off")&&q[0].db==="neondb"&&q[0].replica===false&&q[0].rolsuper===false&&q[0].rolcreaterole===false&&q[0].rolcreatedb===false&&q[0].rolbypassrls===false&&q[0].rolreplication===false&&q[0].member===false,"restricted-actor");
}
function roles(a:Actor){need(roleName(a.writerRole)&&roleName(a.readerRole)&&a.writerRole!==a.readerRole,"distinct-roles")}
async function independentReadback(reader:Pool,v:Verified,a:Actor){
 const c=await reader.connect();
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await c.query("SET LOCAL statement_timeout=\u002760000ms\u0027");await actor(c,a.readerRole,true);
  const q=(await c.query("SELECT bundle_sha256,approval_sha256,row_count,research_expiry_utc,payload_bytes FROM "+RECORD+" WHERE packet_id=$1",[v.packetId])).rows;
  need(q.length===1&&q[0].bundle_sha256===v.bundleSha256&&q[0].approval_sha256===v.approvalSha256&&q[0].row_count===v.rowCount&&new Date(q[0].research_expiry_utc).toISOString()===v.researchExpiryUtc&&Buffer.isBuffer(q[0].payload_bytes)&&q[0].payload_bytes.equals(Buffer.from(v.bytes)),"independent-exact-readback");
  await c.query("ROLLBACK");
 }finally{await c.query("ROLLBACK").catch(()=>{});c.release();}
}
/** Production grants/installation deliberately absent. No retry on unknown
 * commit; caller must reconcile same frozen bundle on independent reader.
 * The evidence booleans/hash checks are mechanical, not authentication of law
 * or of upstream source observations. */
export async function writeReviewedPhase7DurableBundle(writer:Pool,reader:Pool,contract:Phase7DerivedReleaseContract,bundle:Phase7DurableDerivedBundle,approval:Phase7DurableBundleApproval,a:Actor,now:Date){
 roles(a);need(writer!==reader,"distinct-connections");
 const v=validateDurableDerivedBundle(contract,bundle,approval,now);
 const c=await writer.connect();let commitAttempted=false,commitAck=false;
 try{
  await c.query("BEGIN");await c.query("SET LOCAL statement_timeout=\u002760000ms\u0027");await actor(c,a.writerRole,false);
  const r=await c.query("INSERT INTO "+RECORD+"(packet_id,bundle_sha256,approval_sha256,row_count,research_expiry_utc,payload_bytes) VALUES($1,$2,$3,$4,$5,$6)",[v.packetId,v.bundleSha256,v.approvalSha256,v.rowCount,v.researchExpiryUtc,Buffer.from(v.bytes)]);
  need(r.rowCount===1,"insert-count");
  commitAttempted=true;await c.query("COMMIT");commitAck=true;
 }catch(e){if(!commitAttempted)await c.query("ROLLBACK").catch(()=>{});if(commitAttempted)fail("commit-unknown-reconcile-no-replay");throw e;}
 finally{c.release(commitAttempted&&!commitAck?Error("UNKNOWN_COMMIT"):undefined)}
 try{await independentReadback(reader,v,a)}catch{fail("committed-readback-unverified-reconcile-no-replay")}
 return {status:"DERIVED_BUNDLE_DURABLE_INDEPENDENT_READBACK",packetId:v.packetId,bundleSha256:v.bundleSha256,rowCount:v.rowCount,providerCalls:0,sourceMappingPersisted:false,phase6PaidGo:false};
}
export async function reconcileReviewedPhase7DurableBundle(reader:Pool,contract:Phase7DerivedReleaseContract,bundle:Phase7DurableDerivedBundle,approval:Phase7DurableBundleApproval,a:Actor,now:Date){
 roles(a);const v=validateDurableDerivedBundle(contract,bundle,approval,now);await independentReadback(reader,v,a);
 return {status:"DERIVED_BUNDLE_EXACT_READBACK_NO_REPLAY",packetId:v.packetId,bundleSha256:v.bundleSha256,rowCount:v.rowCount,databaseWrites:0,phase6PaidGo:false};
}
