/** Open the already-commissioned three exact POST research storage actors.
 * Reuse the same reviewed PRE contract/profile, never a second dictionary.
 * Actual independent settlement transport remains a separate mandatory input.
 * No provider request, signing key, owner connection or permissive fallback. */
import {Pool} from "pg";
import {sameP6NeonDatabaseEndpoint} from "./phase6SameNeonEndpoint_v39";
import {parsePhase7ProtectedPrePolicy} from "./phase7ProtectedPreResolver_v39";
import {readP6StablePostTrust} from "./phase6StoredSourceRuntimeTrust_v39.mjs";
import {readPhase7PostReviewerPublicKey} from "./phase7SignedPostReview_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import {createPhase7SignedPostConsumer,type Phase7PrivateOutcomeReviewTransport} from "./phase7SignedPostConsumer_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_PROTECTED_POST_RESOLVER_"+s);};
const H=/^[a-f0-9]{64}$/;
export const P7_POST_ACTORS=Object.freeze({
 scoped:{role:"phase7_post_scoped_prod20261120",secret:"P6_PHASE7_POST_SCOPED_DATABASE_URL"},
 writer:{role:"phase7_bundle_writer_prod20261120",secret:"P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL"},
 reader:{role:"phase7_bundle_reader_prod20261120",secret:"P6_PHASE7_POST_BUNDLE_READER_DATABASE_URL"}
});
function checkedUrl(env:NodeJS.ProcessEnv,base:URL,role:string,name:string){
 let u:URL;try{u=new URL(env[name]??"");}catch{return hold("MISSING_RESTRICTED_URL");}
 if(!sameP6NeonDatabaseEndpoint(u,base)||decodeURIComponent(u.username)!==role||!u.password||
  u.searchParams.getAll("sslmode").length!==1||u.searchParams.get("sslmode")!=="verify-full"||
  [...u.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
  (u.searchParams.has("channel_binding")&&(u.searchParams.getAll("channel_binding").length!==1||u.searchParams.get("channel_binding")!=="require")))hold("DISTINCT_TLS_ACTOR");
 return u.toString();
}
export function admitPhase7ProtectedPostResolver(env:NodeJS.ProcessEnv){
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||env.P6_PHASE7_POST_STORAGE_APPROVED!=="1"||env.DATABASE_URL||
  env.V39_DATABASE_RUNTIME_URL||env.P6_PRIVATE_PUBLISHER_DATABASE_URL||
  Object.entries(env).some(([k,v])=>k.startsWith("P6_PHASE7_")&&k.includes("PRIVATE_KEY")&&v))hold("PROTECTED_STORAGE_SCOPE");
 const policy=parsePhase7ProtectedPrePolicy(env),trust=readP6StablePostTrust(env);
 if(hashPhase7DurableCandidate(policy.contract)!==env.P6_PHASE7_POST_CONTRACT_SHA256||
  hashPhase7DurableCandidate(policy.profile)!==env.P6_PHASE7_POST_PROFILE_SHA256)hold("PRE_POST_CONTRACT_MISMATCH");
 const fp=env.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256,preFp=env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256;
 if(!H.test(fp??"")||!H.test(preFp??"")||[preFp,trust.postReviewerFingerprintSha256,trust.dayReviewerFingerprintSha256,trust.queryReviewerFingerprintSha256].includes(fp)||fp===preFp||
  (env.P6_PHASE7_POST_NATIVE_REVIEWER_FINGERPRINT_SHA256&&env.P6_PHASE7_POST_NATIVE_REVIEWER_FINGERPRINT_SHA256!==trust.postReviewerFingerprintSha256))hold("DISTINCT_EXACT_REVIEWER");
 const local={...env,P6_PHASE7_POST_NATIVE_REVIEWER_FINGERPRINT_SHA256:trust.postReviewerFingerprintSha256};
 readPhase7PostReviewerPublicKey(local);
 let base:URL;try{base=new URL(env.V39_P5_SOURCE_DATABASE_URL??"");}catch{return hold("SOURCE_ENDPOINT");}
 const urls=Object.fromEntries(Object.entries(P7_POST_ACTORS).map(([k,a])=>[k,checkedUrl(env,base,a.role,a.secret)])) as Record<keyof typeof P7_POST_ACTORS,string>;
 const out={policySha256:env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256!,roles:Object.fromEntries(Object.entries(P7_POST_ACTORS).map(([k,v])=>[k,v.role])),providerCalls:0,databaseWrites:0};
 Object.defineProperties(out,{privateUrls:{value:urls,enumerable:false},privatePolicy:{value:policy,enumerable:false},privateEnv:{value:local,enumerable:false}});
 return out as typeof out&{privateUrls:typeof urls;privatePolicy:typeof policy;privateEnv:typeof local};
}
export function openPhase7ProtectedPostConsumer(env:NodeJS.ProcessEnv,transport:Phase7PrivateOutcomeReviewTransport){
 if(typeof transport?.preflight!=="function"||typeof transport?.readExactReview!=="function"||
    typeof transport?.readOrRecordExactRecoveryReceipt!=="function"||typeof transport?.readExactRecoveryReceipt!=="function")hold("INDEPENDENT_TRANSPORT_UNCOMMISSIONED");
 const x=admitPhase7ProtectedPostResolver(env),u=x.privateUrls;
 const scoped=new Pool({connectionString:u.scoped,max:2,connectionTimeoutMillis:8000,query_timeout:15000,application_name:"p7_post_scoped_read"});
 const writer=new Pool({connectionString:u.writer,max:2,connectionTimeoutMillis:8000,query_timeout:60000,application_name:"p7_post_bundle_write"});
 const reader=new Pool({connectionString:u.reader,max:2,connectionTimeoutMillis:8000,query_timeout:60000,application_name:"p7_post_bundle_readback"});
 const close=async()=>{await Promise.allSettled([scoped.end(),writer.end(),reader.end()]);};
 try{
  const consumer=createPhase7SignedPostConsumer({env:x.privateEnv,contract:x.privatePolicy.contract,profile:x.privatePolicy.profile,scopedReader:scoped,scopedReaderRole:P7_POST_ACTORS.scoped.role,bundleWriter:writer,bundleWriterRole:P7_POST_ACTORS.writer.role,bundleReader:reader,bundleReaderRole:P7_POST_ACTORS.reader.role,transport});
  return {consumer,close};
 }catch(e){void close();throw e;}
}
