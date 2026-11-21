/** Aggregate preservation census over the EXISTING independently scoped
 * PRE/POST readers. It is observational, not a collection or launch gate.
 * Read the same exported PostgreSQL snapshot; only durable project UUIDs
 * and already-approved derived packets enter memory. No original, source
 * link, provider identifier, extra role, retention extension or writes.
 */
import {createHash} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {P7_PRESERVATION_ACTORS,verifyP7PreservationLogin} from "../../../scripts/v39_phase7_preservation_logins_owner_v39.mjs";
import {P7_INERT_ROLES} from "./phase7InertStorageCommission_v39";
import {serializePhase7DerivedReleasePacket,type Phase7DerivedReleasePacket} from "./phase6DerivedTrainingReleasePacket_v39";
import {hashPhase7DurableCandidate,type Phase7DurableDerivedBundle} from "./phase7DurableDerivedBundleCandidate_v39";
import {P7_ABSENT_PRE_PLACEHOLDER,type Phase7StoredPreFragment} from "./phase7FinalGroupAssembly_v39";
import type {Phase7DerivedReleaseContract,Phase6ReleaseHorizon,Phase7ReleaseSplit} from "./phase6DerivedTrainingReleaseContract_v39";
import type {Phase7ReviewedTransformationProfile} from "./phase7ReviewedSourceTransformation_v39";

const HORIZONS=["T-24h","T-6h","T-90m"] as const;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const MAX_FRAGMENTS=30000,MAX_BYTES=64*1024*1024;
const fail=(s:string):never=>{throw Error("HOLD_P7_RETAINED_PRE_COVERAGE_"+s)};
const need=(v:unknown,s:string)=>{if(!v)fail(s)};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const counter=()=>({"T-24h":0,"T-6h":0,"T-90m":0});
const same=(a:unknown,b:unknown)=>hashPhase7DurableCandidate(a)===hashPhase7DurableCandidate(b);
type Scope={cohortBucket:number;split:Phase7ReleaseSplit};
function checkScope(contract:Phase7DerivedReleaseContract,s:Scope){
 need(Number.isInteger(s.cohortBucket)&&s.cohortBucket>=0&&s.cohortBucket<contract.cohortBucketCount&&["train","validation","test"].includes(s.split),"SCOPE");
}
/** Exact preservation of an already retained fragment, NOT of every raw
 * source observation or of independent data lanes. An absent bundle is
 * an unsettled group, never a discarded PRE or fabricated outcome. */
export function summarizePhase7RetainedPreCoverage(contract:Phase7DerivedReleaseContract,profile:Phase7ReviewedTransformationProfile,s:Scope,fragments:readonly Phase7StoredPreFragment[],bundles:ReadonlyMap<string,Phase7DurableDerivedBundle>){
 checkScope(contract,s);need(fragments.length<=MAX_FRAGMENTS,"BOUND");
 const groups=new Map<string,Map<Phase6ReleaseHorizon,Phase7DerivedReleasePacket["rows"][number]>>();
 const ids=new Set<string>(),retained=counter(),finalized=counter(),unsettled=counter();
 const cHash=hashPhase7DurableCandidate(contract),pHash=hashPhase7DurableCandidate(profile);
 for(const f of fragments){
  need(UUID.test(f.groupId)&&f.contractSha256===cHash&&f.profileSha256===pHash&&hash(serializePhase7DerivedReleasePacket(contract,f.packet))===f.packetSha256&&f.packet.rows.length===1,"FRAGMENT_BINDING");
  const row=f.packet.rows[0],g=groups.get(f.groupId)??new Map();
  need(row.cohortBucket===s.cohortBucket&&row.split===s.split&&row.censoring==="not_due"&&!ids.has(row.releaseRowId)&&!g.has(row.horizon),"FRAGMENT_IDENTITY");
  ids.add(row.releaseRowId);g.set(row.horizon,row);groups.set(f.groupId,g);retained[row.horizon]++;
 }
 need([...bundles.keys()].every(id=>groups.has(id)),"OUTSIDE_GROUP");
 let settledGroups=0,unsettledGroups=0,unsettledT24OnlyGroups=0,unsettledWithT6Groups=0,primaryObserved=0;
 for(const [groupId,g] of groups){
  const b=bundles.get(groupId);
  if(!b){
   unsettledGroups++;if(g.size===1&&g.has("T-24h"))unsettledT24OnlyGroups++;if(g.has("T-6h"))unsettledWithT6Groups++;
   for(const h of g.keys())unsettled[h]++;
   continue;
  }
  const packet=serializePhase7DerivedReleasePacket(contract,b.packet),a=b.paired.groups;
  need(b.schema==="v39.phase7.durable-derived-bundle.v1"&&b.packet.packetId===groupId&&b.packet.rows.length===3&&b.paired.sourceMappingPersisted===false&&b.paired.approvedForUse===true&&b.paired.packetSha256===hash(packet)&&a.length===1&&a[0].groupId===groupId&&a[0].split===s.split&&a[0].rows.length===3,"FINAL_GROUP_BINDING");
  const byHorizon=new Map(b.packet.rows.map(row=>[row.horizon,row]));
  need(byHorizon.size===3&&HORIZONS.every(h=>byHorizon.has(h)),"FINAL_HORIZONS");
  for(const h of HORIZONS){
   const got=byHorizon.get(h)!,prev=g.get(h);
   need(got.cohortBucket===s.cohortBucket&&got.split===s.split&&got.censoring!=="not_due"&&a[0].rows.filter(x=>x.horizon===h&&x.releaseRowId===got.releaseRowId).length===1,"FINAL_ROW_BINDING");
   if(prev){
    need(got.releaseRowId===prev.releaseRowId&&same(got.featureBuckets,prev.featureBuckets)&&(got.qualityFlags&P7_ABSENT_PRE_PLACEHOLDER)===0,"PRESERVED_FEATURE_OR_ID_CHANGED");
    for(const f of Object.keys(prev.featureBuckets))need(got.missingness[f]===prev.missingness[f],"PRESERVED_MISSINGNESS_CHANGED");
    finalized[h]++;
   }else need((got.qualityFlags&P7_ABSENT_PRE_PLACEHOLDER)!==0&&got.censoring==="missing"&&Object.values(got.featureBuckets).every(v=>v===null)&&Object.values(got.labelBuckets).every(v=>v===null),"FICTIONAL_PRE");
  }
  const c=b.continuous,primary=byHorizon.get("T-6h")!;
  need(c.schema==="v39.phase7.continuous-gate-out-target-packet.v1"&&c.targetName==="gate_out_delay_minutes"&&c.primaryHorizon==="T-6h"&&c.unit==="minutes"&&c.derivedPacketSha256===hash(packet)&&c.rows.length===1&&c.rows[0].releaseRowId===primary.releaseRowId&&c.rows[0].censoring===primary.censoring&&(primary.censoring==="observed"?g.has("T-6h")&&typeof c.rows[0].value==="number"&&Number.isFinite(c.rows[0].value):c.rows[0].value===null),"CONTINUOUS_TARGET_BINDING");
  if(primary.censoring==="observed")primaryObserved++;
  settledGroups++;
 }
 need(HORIZONS.every(h=>retained[h]===finalized[h]+unsettled[h])&&groups.size===settledGroups+unsettledGroups,"DENOMINATOR");
 return {schema:"v39.phase7.retained-pre-coverage.v1",...s,retainedPreFragments:fragments.length,retainedGroups:groups.size,settledGroups,unsettledGroups,unsettledT24OnlyGroups,unsettledWithT6Groups,primaryObserved,retainedByHorizon:retained,finalizedByHorizon:finalized,unsettledByHorizon:unsettled,sourceCompletenessCertified:false,independentSourceLanesCertified:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
/** Same MVCC snapshot across the TWO already commissioned read-only roles.
 * Explicit per-cohort bounds. Do not fall back to an owner login or retry
 * on an inconsistent snapshot. Exact SQL reads only durable tables. */
export async function readPhase7RetainedPreCoverage(preReader:Pool,bundleReader:Pool,contract:Phase7DerivedReleaseContract,profile:Phase7ReviewedTransformationProfile,s:Scope){
 checkScope(contract,s);need(preReader!==bundleReader,"DISTINCT_READERS");
 const p=await preReader.connect();let b:PoolClient|undefined;
 try {
  b=await bundleReader.connect();
  const actor=(role:string)=>P7_PRESERVATION_ACTORS.find(x=>x.role===role)!;
  await verifyP7PreservationLogin(p,actor(P7_INERT_ROLES.preReader));
  await verifyP7PreservationLogin(b,actor(P7_INERT_ROLES.bundleReader));
  await p.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await p.query("SET LOCAL statement_timeout='20000ms'");
  const v=(await p.query("SELECT pg_export_snapshot() snapshot,statement_timestamp() observed_at")).rows[0];
  need(typeof v?.snapshot==="string"&&/^[0-9A-Fa-f-]{10,80}$/.test(v.snapshot)&&v.observed_at instanceof Date&&v.observed_at.getTime()<Date.parse(contract.researchExpiryUtc),"SNAPSHOT_CLOCK");
  await b.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await b.query("SET TRANSACTION SNAPSHOT '"+v.snapshot+"'");
  await b.query("SET LOCAL statement_timeout='20000ms'");
  const at=v.observed_at.toISOString();
  const fscope="cohort_bucket=$1 AND split=$2 AND research_expiry_utc>$3::timestamptz";
  const args=[s.cohortBucket,s.split,at];
  const cap=(await p.query("SELECT count(*)::int n,coalesce(sum(octet_length(packet_bytes)),0)::text bytes FROM phase7_private.pre_fragment_v39 WHERE "+fscope,args)).rows[0];
  need(Number.isSafeInteger(cap.n)&&cap.n<=MAX_FRAGMENTS&&Number(cap.bytes)<=MAX_BYTES,"FRAGMENT_READ_BOUND");
  const rows=(await p.query("SELECT row_id::text,group_id::text,horizon,contract_sha256,profile_sha256,packet_sha256,packet_bytes,research_expiry_utc FROM phase7_private.pre_fragment_v39 WHERE "+fscope+" ORDER BY group_id,horizon",args)).rows;
  need(rows.length===cap.n,"SNAPSHOT_FRAGMENT_COUNT");
  const fragments:Phase7StoredPreFragment[]=rows.map(row=>{
   need(Buffer.isBuffer(row.packet_bytes)&&hash(row.packet_bytes)===row.packet_sha256&&row.research_expiry_utc instanceof Date&&row.research_expiry_utc.toISOString()===contract.researchExpiryUtc,"STORED_FRAGMENT_BYTES");
   const packet=JSON.parse(row.packet_bytes.toString("utf8")) as Phase7DerivedReleasePacket;
   need(packet.rows?.length===1&&packet.rows[0].releaseRowId===row.row_id&&packet.rows[0].horizon===row.horizon,"STORED_FRAGMENT_ROW");
   return {groupId:row.group_id,contractSha256:row.contract_sha256,profileSha256:row.profile_sha256,packetSha256:row.packet_sha256,packet};
  });
  const groupIds=[...new Set(fragments.map(f=>f.groupId))],bundles=new Map<string,Phase7DurableDerivedBundle>();
  let byteTotal=0;
  for(let i=0;i<groupIds.length;i+=256){
   const scope=groupIds.slice(i,i+256);
   const vcap=(await b.query("SELECT count(*)::int n,coalesce(sum(octet_length(payload_bytes)),0)::text bytes FROM phase7_private.derived_release_bundle_v39 WHERE packet_id=ANY($1::uuid[])",[scope])).rows[0];
   byteTotal+=Number(vcap.bytes);need(Number.isSafeInteger(byteTotal)&&byteTotal<=MAX_BYTES&&vcap.n<=scope.length,"BUNDLE_READ_BOUND");
   const found=(await b.query("SELECT packet_id::text,bundle_sha256,row_count,research_expiry_utc,payload_bytes FROM phase7_private.derived_release_bundle_v39 WHERE packet_id=ANY($1::uuid[])",[scope])).rows;
   need(found.length===vcap.n,"SNAPSHOT_BUNDLE_COUNT");
   for(const row of found){
    need(Buffer.isBuffer(row.payload_bytes)&&hash(row.payload_bytes)===row.bundle_sha256&&row.row_count===3&&row.research_expiry_utc instanceof Date&&row.research_expiry_utc.toISOString()===contract.researchExpiryUtc&&!bundles.has(row.packet_id),"STORED_BUNDLE_BYTES");
    bundles.set(row.packet_id,JSON.parse(row.payload_bytes.toString("utf8")));
   }
  }
  const result=summarizePhase7RetainedPreCoverage(contract,profile,s,fragments,bundles);
  return {...result,observedAtUtc:at,samePrimarySnapshot:true,expiredSourceLinksRead:false};
 }finally{
  if(b){try{await b.query("ROLLBACK");b.release()}catch{b.release(true)}}
  try{await p.query("ROLLBACK");p.release()}catch{p.release(true)}
 }
}
