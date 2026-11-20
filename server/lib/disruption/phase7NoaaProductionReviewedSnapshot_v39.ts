/** Signed public-only, complete reviewed NOAA snapshot. No flight selector,
 * source content, paid request, DB write, or authority to change the study.
 * The separately reviewed archive bytes are signed before native SOURCE.
 * Snapshot signature binds the full station/wire denominator, not just each
 * individual receipt; omission, substitution or mixed capture is rejected.
 */
import {createHash,createPublicKey,sign,verify,type KeyObject} from "node:crypto";
import {verifyP7IndependentPublicNoaaArtifact,type P7PublicNoaaArtifactReceipt,type P7SignedPublicNoaaArtifact} from "./phase7IndependentNoaaReceipt_v39";
import {P7_NOAA_PUBLIC_MAX_AGE_MS} from "./phase7NoaaProductionArchivePlan_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_PUBLIC_NOAA_SNAPSHOT_"+s)};
const H=/^[a-f0-9]{64}$/,C=/^[a-f0-9]{40}$/,N=/^[1-9][0-9]{4,24}$/,I=/^[A-Z]{4}$/;
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const at=(x:unknown)=>{if(typeof x!=="string"||!Number.isFinite(Date.parse(x))||new Date(Date.parse(x)).toISOString()!==x)return hold("CLOCK");return Date.parse(x)};
const exact=(x:unknown,k:string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(v=>Object.hasOwn(x,v));
function b64(s:unknown,max:number){if(typeof s!=="string"||s.length<4||s.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(s))return hold("BASE64");const b=Buffer.from(s,"base64");if(b.length>max||b.toString("base64")!==s)hold("BASE64");return b}
const envKeys=["V39_P5_MANIFEST_SHA256","V39_P5_RIGHTS_SHA256","P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256","P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256"] as const;
const fp=(k:KeyObject)=>sha(k.export({type:"spki",format:"der"}));
function trust(e:NodeJS.ProcessEnv){
 if(e.P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED!=="1"||e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||!C.test(e.GITHUB_SHA??"")||e.GITHUB_SHA!==e.V39_P5_APPROVED_CODE_SHA||
  !envKeys.every(k=>H.test(e[k]??""))||[e.AERODATABOX_API_KEY,e.RAPIDAPI_KEY,e.AERODATABOX_WEBHOOK_SECRET,e.DATABASE_URL,e.V39_DATABASE_RUNTIME_URL].some(Boolean))hold("PROTECTED_TRUST");
 const p=b64(e.P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64,4096);
 if(!p.toString("utf8").startsWith("-----BEGIN PUBLIC KEY-----"))hold("PUBLIC_KEY_ONLY");
 const k=createPublicKey(p);
 if(k.asymmetricKeyType!=="ed25519"||fp(k)!==e.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||fp(k)===e.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256||fp(k)===e.P6_PHASE7_POST_OUTCOME_REVIEWER_FINGERPRINT_SHA256)hold("REVIEWER_KEY");
 return k;
}
type Payload={schema:"v39.phase7.noaa-public-reviewed-snapshot.v1";codeSha:string;manifestSha256:string;rightsSha256:string;policySha256:string;purposeSha256:string;githubRunId:string;rawArtifactId:string;rawArchiveSha256:string;scopeAtUtc:string;reviewedAtUtc:string;groups:readonly (readonly string[])[];wireSha256s:string[]};
export type P7PublicNoaaSnapshot={payloadBase64:string;signatureBase64:string;wires:readonly P7SignedPublicNoaaArtifact[]};
export type P7VerifiedPublicNoaaSnapshot={snapshotSha256:string;scopeAtUtc:string;reviewedAtUtc:string;githubRunId:string;rawArtifactId:string;rawArchiveSha256:string;stationCount:number;wires:readonly P7SignedPublicNoaaArtifact[];receipts:readonly P7PublicNoaaArtifactReceipt[]};
function checkGroups(g:readonly (readonly string[])[]){
 if(!Array.isArray(g)||g.length<1||g.length>4||g.some(a=>!Array.isArray(a)||a.length<1||a.length>8||a.some(x=>!I.test(x))||a.some((x,i)=>i>0&&a[i-1]>=x)))hold("GROUPS");
 const all=g.flat();
 if(new Set(all).size!==all.length||all.some((x,i)=>i>0&&all[i-1]>=x)||g.slice(0,-1).some(x=>x.length!==8))hold("GROUP_DENOMINATOR");return all;
}
export function verifyP7PublicNoaaSnapshot(env:NodeJS.ProcessEnv,input:unknown):P7VerifiedPublicNoaaSnapshot{
 const k=trust(env),x=input as P7PublicNoaaSnapshot;
 if(!exact(x,["payloadBase64","signatureBase64","wires"])||!Array.isArray(x.wires)||x.wires.length<2||x.wires.length>8)hold("SNAPSHOT_SHAPE");
 const raw=b64(x.payloadBase64,12000),sig=b64(x.signatureBase64,64);
 if(sig.length!==64||!verify(null,raw,k,sig))hold("SNAPSHOT_SIGNATURE");
 const p=JSON.parse(raw.toString("utf8")) as Payload;
 if(!exact(p,["schema","codeSha","manifestSha256","rightsSha256","policySha256","purposeSha256","githubRunId","rawArtifactId","rawArchiveSha256","scopeAtUtc","reviewedAtUtc","groups","wireSha256s"])||
  p.schema!=="v39.phase7.noaa-public-reviewed-snapshot.v1"||p.codeSha!==env.GITHUB_SHA||p.manifestSha256!==env.V39_P5_MANIFEST_SHA256||p.rightsSha256!==env.V39_P5_RIGHTS_SHA256||
  p.policySha256!==env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256||p.purposeSha256!==env.P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256||!N.test(p.githubRunId)||!N.test(p.rawArtifactId)||!H.test(p.rawArchiveSha256)||
  at(p.reviewedAtUtc)<at(p.scopeAtUtc)||at(p.reviewedAtUtc)-at(p.scopeAtUtc)>1800000||!Array.isArray(p.wireSha256s)||p.wireSha256s.length!==x.wires.length)hold("SNAPSHOT_SCOPE");
 const stations=checkGroups(p.groups);
 if(x.wires.length!==p.groups.length*2||new Set(p.wireSha256s).size!==x.wires.length)hold("WIRE_DENOMINATOR");
 const verified=x.wires.map((w,i)=>{
  if(sha(JSON.stringify(w))!==p.wireSha256s[i])hold("WIRE_BYTES");
  const q=verifyP7IndependentPublicNoaaArtifact(env,w,p.reviewedAtUtc).privateReceipt;
  if(q.kind!==(i%2===0?"METAR":"TAF")||JSON.stringify(q.requestedAirports)!==JSON.stringify(p.groups[Math.floor(i/2)])||
   q.githubRunId!==p.githubRunId||q.githubArtifactId!==p.rawArtifactId||q.artifactArchiveSha256!==p.rawArchiveSha256||q.sourcePurposeSha256!==p.purposeSha256||
   at(q.fetchedAtUtc)<at(p.scopeAtUtc)||q.reviewedAtUtc!==p.reviewedAtUtc)hold("EXACT_WIRE_SCOPE");
  return q;
 });
 return Object.freeze({snapshotSha256:sha(raw),scopeAtUtc:p.scopeAtUtc,reviewedAtUtc:p.reviewedAtUtc,githubRunId:p.githubRunId,rawArtifactId:p.rawArtifactId,rawArchiveSha256:p.rawArchiveSha256,stationCount:stations.length,
  wires:Object.freeze(x.wires.map(w=>Object.freeze({...w}))),receipts:Object.freeze(verified.map(q=>Object.freeze({...q,requestedAirports:Object.freeze([...q.requestedAirports])})))});
}
/** Sign only receipt wires already signed by the pinned weather reviewer with
 * the complete independently derived public plan denominator, before upload.
 * The individual wires were minted exclusively from verified archive reports.
 */
export function signP7PublicNoaaSnapshot(env:NodeJS.ProcessEnv,signer:KeyObject,input:{githubRunId:string;rawArtifactId:string;rawArchiveSha256:string;scopeAtUtc:string;reviewedAtUtc:string;groups:readonly (readonly string[])[];wires:readonly P7SignedPublicNoaaArtifact[]}):P7PublicNoaaSnapshot{
 const k=trust(env);
 if(signer?.type!=="private"||signer.asymmetricKeyType!=="ed25519"||fp(createPublicKey(signer))!==fp(k))hold("SIGNER");
 const p:Payload={schema:"v39.phase7.noaa-public-reviewed-snapshot.v1",codeSha:env.GITHUB_SHA!,manifestSha256:env.V39_P5_MANIFEST_SHA256!,rightsSha256:env.V39_P5_RIGHTS_SHA256!,policySha256:env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256!,purposeSha256:env.P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256!,githubRunId:input.githubRunId,rawArtifactId:input.rawArtifactId,rawArchiveSha256:input.rawArchiveSha256,scopeAtUtc:input.scopeAtUtc,reviewedAtUtc:input.reviewedAtUtc,groups:input.groups,wireSha256s:input.wires.map(w=>sha(JSON.stringify(w)))};
 const raw=Buffer.from(JSON.stringify(p)),out={payloadBase64:raw.toString("base64"),signatureBase64:sign(null,raw,signer).toString("base64"),wires:input.wires};
 verifyP7PublicNoaaSnapshot(env,out);return out;
}
export function makeP7PublicWeatherSnapshotPort(env:NodeJS.ProcessEnv,snapshot:P7PublicNoaaSnapshot|null){
 trust(env);
 const v=snapshot===null?null:verifyP7PublicNoaaSnapshot(env,snapshot);
 function relevant(airports:readonly string[],clock:string){
  const now=at(clock);
  if(!Array.isArray(airports)||airports.length>2501||airports.some(a=>!I.test(a))||new Set(airports).size!==airports.length)hold("STATION_READ_SCOPE");
  if(!v||now<at(v.reviewedAtUtc)||now-at(v.scopeAtUtc)>P7_NOAA_PUBLIC_MAX_AGE_MS)return [];
  const wanted=new Set(airports);
  return v.wires.filter((_w,i)=>v.receipts[i].requestedAirports.some(a=>wanted.has(a)));
 }
 return Object.freeze({snapshotSha256:v?.snapshotSha256??null,reviewedAtUtc:v?.reviewedAtUtc??null,stationCount:v?.stationCount??0,
  async readReviewedWeatherArtifacts(scope:Readonly<{airports:readonly string[];observedDbClockUtc:string}>){return relevant(scope.airports,scope.observedDbClockUtc)},
  /** Exact selected weather scope from original permit. The independent
   * authority still checks the real normalized route and original member. */
  async readExactReviewedWeatherArtifacts(p:Readonly<import("./phase5V0079SingleBoundFlightPreWriter_v39").P5Stage14SingleFlightPrePermit>){
   if(!v)return [];
   const airports=new Set<string>([p.airportIcao]);
   if(p.expectedDestinationIcao)airports.add(p.expectedDestinationIcao);
   for(const field of p.reviewedSupplementalFeatureBundle?.observations??[])if(field.source==="NOAA_TAF"&&field.airportIcao)airports.add(field.airportIcao);
   return relevant([...airports],v.reviewedAtUtc);
  }
 });
}
