/** Runtime opening of the protected static review and restricted readback
 * pool. Per-permit field proof comes only from the authenticated roster.
 * Closing the pool is mandatory. No provider request or policy signing. */
import {Pool} from "pg";
import {sameP6NeonDatabaseEndpoint} from "./phase6SameNeonEndpoint_v39";
import {checkProspectivePrePolicy,type Phase7BoundPreTransactionInput} from "./phase7PreFragmentTransaction_v39";
import {verifyPhase7SignedPreFieldProof} from "./phase7SignedPreFieldProof_v39";
import type {P5CdPhase7PreResolver} from "./phase5CdGithubBoundedPreTick_v39";
type Static=Pick<Phase7BoundPreTransactionInput,"contract"|"profile"|"dispositions"|"review"|"reviewSha256">;
const hold=(s:string):never=>{throw Error("HOLD_P7_PROTECTED_PRE_RESOLVER_"+s);};
export function parsePhase7ProtectedPrePolicy(env:NodeJS.ProcessEnv):Static{
 const raw=env.P6_PHASE7_PRE_POLICY_BASE64;
 if(!raw||raw.length>100000||!(/^[A-Za-z0-9+/]+={0,2}$/).test(raw))return hold("MISSING_POLICY");
 const b=Buffer.from(raw,"base64");
 if(b.toString("base64")!==raw||b.length>75000)hold("POLICY_ENCODING");
 const x=JSON.parse(b.toString("utf8")) as Static;
 if(!x||Object.keys(x).sort().join("|")!=="contract|dispositions|profile|review|reviewSha256"||
  x.reviewSha256!==env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256||
  !Array.isArray(x.dispositions)||x.dispositions.some(d=>d.disposition==="LONG_TERM_RIGHTS_REQUIRED"))hold("UNCOMMISSIONED_POLICY");
 checkProspectivePrePolicy(x,env.V39_P5_MANIFEST_SHA256??"",env.V39_P5_RIGHTS_SHA256??"");
 return x;
}
export function openPhase7ProtectedPreResolver(env:NodeJS.ProcessEnv){
 const policy=parsePhase7ProtectedPrePolicy(env);
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("TLS");
 const role=env.P6_PHASE7_PRE_READBACK_ROLE??"";
 if(!/^phase7_pre_reader_[a-z0-9_]{6,40}$/.test(role))hold("ROLE");
 const url=new URL(env.P6_PHASE7_PRE_READBACK_DATABASE_URL??""),pre=new URL(env.P5_V39_PRE_DATABASE_URL??"");
 if(!sameP6NeonDatabaseEndpoint(url,pre)||decodeURIComponent(url.username)!==role||url.username===pre.username||
  !url.password||url.searchParams.getAll("sslmode").length!==1||url.searchParams.get("sslmode")!=="verify-full"||
  [...url.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
  (url.searchParams.has("channel_binding")&&(url.searchParams.getAll("channel_binding").length!==1||url.searchParams.get("channel_binding")!=="require")))hold("DISTINCT_TLS_READER");
 const reader=new Pool({connectionString:url.toString(),max:8,connectionTimeoutMillis:8000,query_timeout:15000,application_name:"phase7_pre_independent_readback"});
 const resolver:P5CdPhase7PreResolver=async packet=>{
  const proof=verifyPhase7SignedPreFieldProof(env,packet.permit,policy.reviewSha256,policy.dispositions,packet.phase7FieldProof);
  return {packetSha256:packet.packetSha256,integration:{...policy,reader,expectedReaderRole:role,separatelyVerifiedFields:proof.fields.map(f=>f.field),signedSeparateFieldProof:packet.phase7FieldProof}};
 };
 return {resolver,close:()=>reader.end()};
}
