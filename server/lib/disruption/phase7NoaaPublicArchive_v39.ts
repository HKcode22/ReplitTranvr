/** Free public station data only. No flight data, database, signing key or
 * paid provider. Reuses the established METAR/TAF decoders downstream. */
import {createHash,createPublicKey,sign,type KeyObject} from "node:crypto";
import {decodeP4G5FreeNoaaMetarV39} from "./phase4Gate5NoaaMetarReceipt_v39";
import {verifyP7IndependentPublicNoaaArtifact,type P7PublicNoaaArtifactReceipt,type P7SignedPublicNoaaArtifact} from "./phase7IndependentNoaaReceipt_v39";
const HOLD=(s:string):never=>{throw Error("HOLD_P7_NOAA_ARCHIVE_"+s)};
const H=/^[0-9a-f]{64}$/,C=/^[0-9a-f]{40}$/,N=/^[1-9][0-9]{4,24}$/;
const sha=(s:Buffer|string)=>createHash("sha256").update(s).digest("hex");
const at=(s:unknown)=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)return HOLD("CLOCK");return Date.parse(s)};
const exact=(x:unknown,k:string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===k.length&&k.every(v=>Object.hasOwn(x,v));
export const P7_NOAA_CANARY_STATIONS=Object.freeze(["KDEC","OMAA","OMSJ","SPJC"]);
export const P7_NOAA_ARTIFACT_NAME="v39-p7-noaa-public-source-canary";
export type P7NoaaKind="METAR"|"TAF";
export type P7NoaaSourceReceipt={kind:P7NoaaKind;requestedAirports:string[];fetchedAtUtc:string;sourceBodySha256:string;httpStatus:200|204};
export type P7NoaaCapture={schema:"v39.phase7.noaa-public-source-canary.v1";githubRunId:string;codeSha:string;sources:P7NoaaSourceReceipt[]};
function stations(a:readonly string[]){
 if(!Array.isArray(a)||a.length<1||a.length>8||a.some(s=>!/^[A-Z]{4}$/.test(s))||new Set(a).size!==a.length)HOLD("STATIONS");
 return [...a].sort();
}
export function validateP7NoaaPublicBody(kind:P7NoaaKind,body:string,scope:readonly string[],fetchedAtUtc:string){
 at(fetchedAtUtc);const wanted=stations(scope);
 if(!["METAR","TAF"].includes(kind)||typeof body!=="string"||Buffer.byteLength(body)>1000000)HOLD("BODY_BOUND");
 const rows=JSON.parse(body);
 if(!Array.isArray(rows)||rows.length>(kind==="METAR"?400:40)||rows.some(x=>!x||typeof x!=="object"||Array.isArray(x)||!wanted.includes(x.icaoId)))HOLD("STATION_SCOPE");
 if(kind==="METAR"){
  const v=decodeP4G5FreeNoaaMetarV39({sourceJsonText:body,collectedAtUtc:fetchedAtUtc,requestedAirports:wanted});
  if(v.rejectedUnexpectedAirportCount!==0||v.sourceBodySha256!==sha(body))HOLD("METAR_DECODE");
 }
 return {sourceBodySha256:sha(body),rowCount:rows.length};
}
export async function readP7NoaaBoundedResponse(response:Response,max:number){
 if(!response.body)return Buffer.alloc(0);
 const reader=response.body.getReader();let bytes=0;const parts:Buffer[]=[];
 try{while(true){const v=await reader.read();if(v.done)break;bytes+=v.value.byteLength;if(bytes>max){await reader.cancel();HOLD("RESPONSE_BOUND")}parts.push(Buffer.from(v.value))}return Buffer.concat(parts,bytes)}
 finally{reader.releaseLock()}
}
export async function captureP7NoaaPublicSource(kind:P7NoaaKind,scope:readonly string[],http:typeof fetch=fetch){
 if(!["METAR","TAF"].includes(kind))HOLD("KIND");
 const requestedAirports=stations(scope);
 const url=new URL("https://aviationweather.gov/api/data/"+kind.toLowerCase());
 url.searchParams.set("ids",requestedAirports.join(","));url.searchParams.set("format","json");
 const r=await http(url,{method:"GET",redirect:"error",signal:AbortSignal.timeout(15000),headers:{"Accept":"application/json","User-Agent":"HKcode22-Travnr-P7-public-weather-research/1.0"}});
 if(r.status!==200&&r.status!==204)HOLD("HTTP_"+r.status);
 const bytes=await readP7NoaaBoundedResponse(r,1000000);
 if(r.status===204&&bytes.length!==0)HOLD("HTTP_204_BODY");
 const body=r.status===204?"[]":new TextDecoder("utf-8",{fatal:true}).decode(bytes);
 const fetchedAtUtc=new Date().toISOString(),v=validateP7NoaaPublicBody(kind,body,requestedAirports,fetchedAtUtc);
 const receipt:P7NoaaSourceReceipt={kind,requestedAirports,fetchedAtUtc,sourceBodySha256:v.sourceBodySha256,httpStatus:r.status as 200|204};
 return {receipt,body,rowCount:v.rowCount};
}
// Only this process may use the result of its actual archive verification.
// Rehydrating JSON or supplying a caller-authored report is not issuer evidence.
const verifiedArchiveReports=new WeakSet<object>();
export function verifyP7NoaaArchive(input:{capture:unknown;metar:string;taf:string;githubRunId:string;codeSha:string;githubArtifactId:string;artifactDigest:string;archiveBytes:Buffer;artifactCreatedAtUtc:string;durableReadAtUtc:string;reviewedAtUtc:string}){
 const i=input,x=i.capture as P7NoaaCapture;
 if(!exact(x,["schema","githubRunId","codeSha","sources"])||x.schema!=="v39.phase7.noaa-public-source-canary.v1"||
 !N.test(i.githubRunId)||!N.test(i.githubArtifactId)||!C.test(i.codeSha)||x.githubRunId!==i.githubRunId||x.codeSha!==i.codeSha||
 !Array.isArray(x.sources)||x.sources.length!==2||x.sources[0]?.kind!=="METAR"||x.sources[1]?.kind!=="TAF"||
 !Buffer.isBuffer(i.archiveBytes)||i.archiveBytes.length<100||i.archiveBytes.length>2200000||!H.test(i.artifactDigest)||sha(i.archiveBytes)!==i.artifactDigest)HOLD("ARCHIVE_IDENTITY");
 const created=at(i.artifactCreatedAtUtc),durable=at(i.durableReadAtUtc),reviewed=at(i.reviewedAtUtc);
 if(created>durable||durable>reviewed||reviewed-created>24*3600000)HOLD("ARCHIVE_CLOCK");
 const sources=x.sources.map((s,j)=>{
  if(!exact(s,["kind","requestedAirports","fetchedAtUtc","sourceBodySha256","httpStatus"])||
   JSON.stringify(s.requestedAirports)!==JSON.stringify(P7_NOAA_CANARY_STATIONS)||![200,204].includes(s.httpStatus)||
   at(s.fetchedAtUtc)>created||created-at(s.fetchedAtUtc)>3600000)HOLD("SOURCE_SCOPE");
  const body=j===0?i.metar:i.taf,v=validateP7NoaaPublicBody(s.kind,body,s.requestedAirports,s.fetchedAtUtc);
  if(v.sourceBodySha256!==s.sourceBodySha256||s.httpStatus===204&&body!=="[]")HOLD("SOURCE_DIGEST");
  return {...s,rowCount:v.rowCount};
 });
 if(at(sources[0].fetchedAtUtc)>at(sources[1].fetchedAtUtc))HOLD("SOURCE_CLOCK_ORDER");
 const result={status:"P7_PUBLIC_NOAA_ARCHIVE_INDEPENDENT_BYTE_READBACK_NO_GO",githubRunId:i.githubRunId,githubArtifactId:i.githubArtifactId,artifactArchiveSha256:i.artifactDigest,artifactCreatedAtUtc:i.artifactCreatedAtUtc,durableReadAtUtc:i.durableReadAtUtc,reviewedAtUtc:i.reviewedAtUtc,sources,paidProviderCalls:0,databaseWrites:0,phase6PaidGo:false};
 const frozen=Object.freeze({...result,sources:Object.freeze(result.sources.map(s=>Object.freeze({...s,requestedAirports:Object.freeze([...s.requestedAirports])})))});
 verifiedArchiveReports.add(frozen);return frozen;
}
/** Independently protected issuer (not the capture job). No arbitrary public
 * caller may turn a canary into an approval or fake a production source.
 * The real reviewed GitHub reader must supply bytes to verifyP7NoaaArchive. */
export function issueP7NoaaArchiveWires(input:{env:NodeJS.ProcessEnv;verified:ReturnType<typeof verifyP7NoaaArchive>;metar:string;taf:string;signer:KeyObject}):P7SignedPublicNoaaArtifact[]{
 const {env,verified,signer}=input;
 if(!verifiedArchiveReports.has(verified))HOLD("ISSUER_REHYDRATED_OR_UNVERIFIED_REPORT");
 if(env.P6_PHASE7_NOAA_ARCHIVE_ISSUER_APPROVED!=="1"||env.ADB_AUTO_COLLECT!=="0"||env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||
  signer?.type!=="private"||signer.asymmetricKeyType!=="ed25519"||sha(createPublicKey(signer).export({format:"der",type:"spki"}))!==env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||
  !H.test(env.P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256??""))HOLD("ISSUER_APPROVAL");
 return verified.sources.map((s,j)=>{
  const sourceJsonText=j===0?input.metar:input.taf;
  if(sha(sourceJsonText)!==s.sourceBodySha256)HOLD("ISSUER_BYTES");
  const expiry=Math.min(at(s.fetchedAtUtc)+86400000,at(verified.reviewedAtUtc)+86400000);
  if(expiry<=at(verified.reviewedAtUtc))HOLD("ISSUER_EXPIRED");
  const receipt:P7PublicNoaaArtifactReceipt={schema:"v39.phase7.independent-public-noaa-artifact-receipt.v1",kind:s.kind,
   manifestSha256:env.V39_P5_MANIFEST_SHA256!,rightsSha256:env.V39_P5_RIGHTS_SHA256!,policySha256:env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256!,sourcePurposeSha256:env.P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256!,
   sourceBodySha256:s.sourceBodySha256,artifactArchiveSha256:verified.artifactArchiveSha256,githubRunId:verified.githubRunId,githubArtifactId:verified.githubArtifactId,
   requestedAirports:s.requestedAirports,fetchedAtUtc:s.fetchedAtUtc,artifactCreatedAtUtc:verified.artifactCreatedAtUtc,durableReadAtUtc:verified.durableReadAtUtc,reviewedAtUtc:verified.reviewedAtUtc,validUntilUtc:new Date(expiry).toISOString()};
  const b=Buffer.from(JSON.stringify(receipt)),w={receiptBase64:b.toString("base64"),signatureBase64:sign(null,b,signer).toString("base64"),sourceJsonText};
  verifyP7IndependentPublicNoaaArtifact(env,w,verified.reviewedAtUtc);return w;
 });
}
