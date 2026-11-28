/** Read-only recovery of already-created owner-local policy predecessor.
 * No provider, DB, network, subprocess, secret write, signature or policy assembly.
 * Local commitment MUST be compared with fresh protected runtime custody.
 * Never print individual policy hashes, private values, paths or exceptions.
 */
import {createHash} from "node:crypto";
import {lstatSync,openSync,fstatSync,readFileSync,closeSync,readdirSync,constants} from "node:fs";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/;
const h=b=>createHash("sha256").update(b).digest("hex"),hash=x=>h(JSON.stringify(x));
const hold=s=>{throw Error("HOLD_P6_LOCAL_POLICY_PREDECESSOR_"+s)};
const dirPattern=/^\.travnr-phase6-final-policies-[a-zA-Z0-9_-]{1,100}$/;
const fields=["V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH","V39_P5_CONFIG_HASH","V39_P5_FRAME_HASH","V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256","P6_INERT_STAGE_INPUT_JSON","P6_INERT_STAGE_INPUT_SHA256","P6_INERT_COST_ENVELOPE_SHA256","P6_PRIVATE_POST_OUTCOME_TAIL_HOURS","V39_P5_POST_PROVIDER_CONTRACT_SHA256","V39_P5_POST_CATEGORY_BUDGET_SHA256","V39_P5_POST_PRICE_SHA256","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256","P6_NONPAID_SIGNING_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_SHA256","P6_NATIVE_POST_POLICY_SHA256"];
const policyNames=fields.filter(k=>k.endsWith("_BASE64"));
const names={daily:"P6_NONPAID_DAILY_POLICY",signing:"P6_NONPAID_SIGNING_POLICY",transport:"P6_NONPAID_TRANSPORT_TRUST"};
function privateDirectory(path,uid){
 const s=lstatSync(path);
 if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==uid||(s.mode&0o077)!==0)hold("UNSAFE_DIRECTORY");
 return s;
}
function readPrivate(path,uid){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{
  const s=fstatSync(fd);
  if(!s.isFile()||s.uid!==uid||s.nlink!==1||(s.mode&0o077)!==0||s.size<2||s.size>600000)hold("UNSAFE_FILE");
  const b=readFileSync(fd);
  if(b.length!==s.size||fstatSync(fd).mtimeMs!==s.mtimeMs)hold("FILE_CHANGED");
  const v=JSON.parse(b.toString("utf8"));if(!v||typeof v!=="object"||Array.isArray(v))hold("JSON_SHAPE");
  return v;
 }finally{closeSync(fd);}
}
function validate(v,w,b,expectedManifest,expectedRights){
 if(b.status!=="SIX_EXACT_REVISED_POLICY_BYTES_PREPARED_AWAITING_BYTE_REVIEW_NO_GO"||!C.test(b.main??"")||
  b.staticCount!==31||b.staticValuesSha256!==hash(v)||b.policyBundleSha256!==hash(w)||b.phase6PaidGo!==false||
  Object.keys(v).length!==fields.length||fields.some(n=>!Object.hasOwn(v,n)||typeof v[n]!=="string"||!v[n].length||Buffer.byteLength(v[n])>48000)||
  Object.keys(w).length!==policyNames.length||policyNames.some(n=>!Object.hasOwn(w,n))||
  v.V39_P5_MANIFEST_SHA256!==expectedManifest||v.V39_P5_RIGHTS_SHA256!==expectedRights)hold("BUNDLE_BYTES_OR_SCOPE");
 for(const n of policyNames){
  const raw=Buffer.from(v[n],"base64"),d=n.replace("_BASE64","_SHA256");
  if(raw.toString("base64")!==v[n]||!raw.equals(Buffer.from(JSON.stringify(w[n])))||
    (Object.hasOwn(v,d)&&v[d]!==h(raw)))hold("POLICY_STATIC_CROSS_BIND");
 }
 const baseDigests=Object.fromEntries(Object.entries(names).map(([k,n])=>[k,h(Buffer.from(v[n+"_BASE64"],"base64"))]));
 const p=w[names.daily+"_BASE64"],q=w[names.signing+"_BASE64"],t=w[names.transport+"_BASE64"];
 if(p.schema!=="v39.phase6.delegated-daily-source-review-policy.v1"||q.schema!=="v39.phase6.delegated-source-review-policy.v1"||
  t.schema!=="v39.phase6.approved-nonpaid-source-transport-trust.v1"||
  [p,q].some(x=>x.manifestSha256!==expectedManifest||x.rightsSha256!==expectedRights)||
  t.dailyPolicySha256!==baseDigests.daily||t.signingPolicySha256!==baseDigests.signing)hold("POLICY_BASE_CROSS_BIND");
 if(Object.hasOwn(p,"conditionalPreFeatureReview")||Object.hasOwn(p,"conditionalT24PermitReview")||Object.hasOwn(p,"conditionalLaterPermitReview")||
  Object.hasOwn(q,"conditionalServicePolicy")||Object.hasOwn(p.nativeLaterReview??{},"nativeT24PolicyTransition")||
  Object.hasOwn(p.nativeLaterReview??{},"conditionalT24Scope")||Object.hasOwn(p.nativeLaterReview??{},"conditionalLaterDayAppendPolicy")||
  Object.hasOwn(p.nativeLaterReview?.dayAppendPolicy??{},"conditionalLaterPreScope"))hold("NOT_NATIVE_PREDECESSOR");
 return h(JSON.stringify({schema:"v39.phase5b.custody-base-commitment.v1",...baseDigests}));
}
export function inspectP6OwnerLocalPolicyPredecessor(home,expectedManifest,expectedRights){
 if(typeof home!=="string"||!home.startsWith("/")||!H.test(expectedManifest??"")||!H.test(expectedRights??"")||typeof process.getuid!=="function")hold("SCOPE");
 const uid=process.getuid(),hs=lstatSync(home);
 if(!hs.isDirectory()||hs.isSymbolicLink()||hs.uid!==uid||(hs.mode&0o022))hold("HOME_SCOPE");
 const dirs=readdirSync(home,{withFileTypes:true}).filter(e=>dirPattern.test(e.name));
 if(dirs.length>32)hold("BOUNDED_DIRECTORY_COUNT");
 const matches=new Map();let rejected=0;
 for(const e of dirs){
  try{
   const d=join(home,e.name),before=privateDirectory(d,uid);
   const v=readPrivate(join(d,"static-values-PRIVATE.json"),uid),w=readPrivate(join(d,"six-policy-objects-PRIVATE.json"),uid),b=readPrivate(join(d,"bundle-receipt.json"),uid);
   const after=privateDirectory(d,uid);if(before.ino!==after.ino||before.dev!==after.dev)hold("DIRECTORY_CHANGED");
   const commitment=validate(v,w,b,expectedManifest,expectedRights);
   matches.set(commitment,(matches.get(commitment)??0)+1);
  }catch{rejected++;}
 }
 const unique=matches.size===1,commitment=unique?[...matches.keys()][0]:null;
 return Object.freeze({status:unique?"OWNER_LOCAL_NATIVE_POLICY_PREDECESSOR_FOUND_NOT_PROTECTED_PROOF":matches.size?"HOLD_MULTIPLE_DISTINCT_LOCAL_PREDECESSORS":"HOLD_NO_EXACT_LOCAL_PREDECESSOR",
  directoriesChecked:dirs.length,rejectedDirectories:rejected,distinctValidCommitments:matches.size,matchingLocalCopies:unique?matches.get(commitment):0,
  basePolicyCommitmentSha256:commitment,actualProtectedBytesVerified:false,actualConditionalPolicyInstalledVerified:false,actualConditionalPreCommitVerified:false,
  providerCalls:0,databaseReads:0,databaseWrites:0,githubWrites:0,signaturesIssued:0,phase6PaidGo:false});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  if(process.argv.length!==4)hold("CLI_ARGUMENTS");
  const out=inspectP6OwnerLocalPolicyPredecessor(process.env.HOME,process.argv[2],process.argv[3]);console.log(JSON.stringify(out));
  if(!out.basePolicyCommitmentSha256)process.exitCode=2;
 }catch{console.log("HOLD_P6_LOCAL_POLICY_PREDECESSOR_REDACTED");process.exitCode=2;}
}
