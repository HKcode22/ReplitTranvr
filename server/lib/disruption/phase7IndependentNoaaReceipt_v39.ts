/** Reuse the existing Amendment E NOAA METAR and TAF compilers against
 * exact independently authenticated PUBLIC weather artifact bytes.
 * Never request weather from this module, accept flight data in a weather
 * receipt, make up a GitHub durable clock, or certify provider rights.
 * A separate reviewer authenticates the actual public artifact and signs
 * its receipt; native producer and PRE worker have only the public key.
 */
import {createHash,createPublicKey,verify} from "node:crypto";
import {decodeP4G5FreeNoaaMetarV39,type P4G5NoaaMetarReceiptV39} from "./phase4Gate5NoaaMetarReceipt_v39";
import {compileP5ExistingNoaaMetarToE,draftP5ECombinedExistingSourcesPacket} from "./phase5AmendmentENoaaHistoricalReceiptCompiler_v39";
import {compileP5AlreadyDurableNoaaTafAsOfV39} from "./phase5AmendmentEExistingNoaaTafReceipt_v39";
import type {P5EReviewedSupplementalBundle,P5EReviewedSupplementalObservation} from "./phase5AmendmentESignedSupplementalFeatures_v39";
const HOLD=(s:string):never=>{throw Error("HOLD_P7_INDEPENDENT_NOAA_"+s)};
const H=/^[a-f0-9]{64}$/,ICAO=/^[A-Z]{4}$/,NUM=/^[1-9][0-9]{4,24}$/;
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const digest=(s:unknown):s is string=>typeof s==="string"&&H.test(s)&&!/^([a-f0-9])\1{63}$/.test(s);
const at=(s:unknown)=>{if(typeof s!=="string"||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)return HOLD("CLOCK");return Date.parse(s)};
const exact=(o:unknown,k:string[])=>!!o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
function decode(s:unknown,max:number){
 if(typeof s!=="string"||s.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(s))return HOLD("ENCODING");
 const b=Buffer.from(s,"base64");if(b.length>max||b.toString("base64")!==s)HOLD("ENCODING");return b;
}
export interface P7SignedPublicNoaaArtifact{
 receiptBase64:string;signatureBase64:string;sourceJsonText:string;
}
export interface P7PublicNoaaArtifactReceipt{
 schema:"v39.phase7.independent-public-noaa-artifact-receipt.v1";
 kind:"METAR"|"TAF";manifestSha256:string;rightsSha256:string;policySha256:string;
 sourcePurposeSha256:string;sourceBodySha256:string;artifactArchiveSha256:string;
 githubRunId:string;githubArtifactId:string;requestedAirports:readonly string[];
 fetchedAtUtc:string;artifactCreatedAtUtc:string;durableReadAtUtc:string;reviewedAtUtc:string;validUntilUtc:string;
}
export type P7WeatherJoinScope={
 flightInstanceId:string;originIcao:string;destinationIcao:string|null;selectedNativeTUtc:string;
 ownCutoffUtc:string;observedDbClockUtc:string;
};
const receiptKeys=["schema","kind","manifestSha256","rightsSha256","policySha256","sourcePurposeSha256","sourceBodySha256","artifactArchiveSha256","githubRunId","githubArtifactId","requestedAirports","fetchedAtUtc","artifactCreatedAtUtc","durableReadAtUtc","reviewedAtUtc","validUntilUtc"];
export function verifyP7IndependentPublicNoaaArtifact(env:NodeJS.ProcessEnv,wire:P7SignedPublicNoaaArtifact,observedDbClockUtc:string){
 if(!exact(wire,["receiptBase64","signatureBase64","sourceJsonText"])||typeof wire.sourceJsonText!=="string"||Buffer.byteLength(wire.sourceJsonText)>1000000||
    !digest(env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256)||!digest(env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256))HOLD("PROTECTED_SCOPE");
 const pem=decode(env.P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64,4096).toString("utf8"),key=createPublicKey(pem);
 const raw=decode(wire.receiptBase64,12000),sig=decode(wire.signatureBase64,64);
 if(!pem.startsWith("-----BEGIN PUBLIC KEY-----")||key.asymmetricKeyType!=="ed25519"||
    hash(key.export({format:"der",type:"spki"}))!==env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||
    sig.length!==64||!verify(null,raw,key,sig))HOLD("SIGNATURE");
 const x=JSON.parse(raw.toString("utf8")) as P7PublicNoaaArtifactReceipt;
 if(!exact(x,receiptKeys)||x.schema!=="v39.phase7.independent-public-noaa-artifact-receipt.v1"||!["METAR","TAF"].includes(x.kind)||
    x.manifestSha256!==env.V39_P5_MANIFEST_SHA256||x.rightsSha256!==env.V39_P5_RIGHTS_SHA256||x.policySha256!==env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256||
    ![x.manifestSha256,x.rightsSha256,x.policySha256,x.sourcePurposeSha256,x.sourceBodySha256,x.artifactArchiveSha256].every(digest)||
    x.sourceBodySha256!==hash(wire.sourceJsonText)||!NUM.test(x.githubRunId??"")||!NUM.test(x.githubArtifactId??"")||
    !Array.isArray(x.requestedAirports)||x.requestedAirports.length<1||x.requestedAirports.length>8||
    x.requestedAirports.some(a=>typeof a!=="string"||!ICAO.test(a))||new Set(x.requestedAirports).size!==x.requestedAirports.length)HOLD("EXACT_ARTIFACT_SCOPE");
 const now=at(observedDbClockUtc),fetched=at(x.fetchedAtUtc),created=at(x.artifactCreatedAtUtc),durable=at(x.durableReadAtUtc),reviewed=at(x.reviewedAtUtc),until=at(x.validUntilUtc);
 if(fetched>created||created>durable||durable>reviewed||reviewed>now||now>=until||until-reviewed>24*3600000||now-fetched>24*3600000)HOLD("DURABLE_AS_OF_CLOCK");
 const rows=JSON.parse(wire.sourceJsonText);
 if(!Array.isArray(rows)||rows.length>(x.kind==="METAR"?400:40)||rows.some(v=>!v||typeof v!=="object"||Array.isArray(v)||!x.requestedAirports.includes(v.icaoId)))HOLD("PUBLIC_STATION_SCOPE");
 let metarReceipts:readonly P4G5NoaaMetarReceiptV39[]=[];
 if(x.kind==="METAR"){
  const decoded=decodeP4G5FreeNoaaMetarV39({sourceJsonText:wire.sourceJsonText,collectedAtUtc:x.fetchedAtUtc,requestedAirports:x.requestedAirports});
  if(decoded.sourceBodySha256!==x.sourceBodySha256||decoded.rejectedUnexpectedAirportCount!==0)HOLD("METAR_REDECODE");
  metarReceipts=decoded.receipts.map(v=>({...v,durableArtifactReadAtUtc:x.durableReadAtUtc}));
 }
 const res={kind:x.kind,receiptSha256:hash(raw),observedDbClockUtc,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 Object.defineProperties(res,{privateReceipt:{value:Object.freeze(x),enumerable:false},privateSourceJsonText:{value:wire.sourceJsonText,enumerable:false},privateMetarReceipts:{value:Object.freeze(metarReceipts),enumerable:false}});
 return Object.freeze(res) as typeof res&{readonly privateReceipt:P7PublicNoaaArtifactReceipt;readonly privateSourceJsonText:string;readonly privateMetarReceipts:readonly P4G5NoaaMetarReceiptV39[]};
}
type Verified=ReturnType<typeof verifyP7IndependentPublicNoaaArtifact>;
/** Compile once per matched private source member. The same public airport
 * artifact can serve many flights. Choose newest eligible observation,
 * reject equal-clock disagreement as explicit missing, never replace an
 * existing FIDS value or move a feature across the frozen PRE clock. */
export function mergeP7VerifiedNoaaIntoBoundPreBundle(bundle:P5EReviewedSupplementalBundle,scope:P7WeatherJoinScope,artifacts:readonly Verified[]){
 const now=at(scope.observedDbClockUtc),t=at(scope.selectedNativeTUtc),cutoff=at(scope.ownCutoffUtc);
 if(!scope||bundle.flightInstanceId!==scope.flightInstanceId||!ICAO.test(scope.originIcao)||scope.destinationIcao!==null&&!ICAO.test(scope.destinationIcao)||
    now>=cutoff||cutoff>=t||!Array.isArray(artifacts)||artifacts.length>128||
    artifacts.some(a=>a.observedDbClockUtc!==scope.observedDbClockUtc||Object.getOwnPropertyDescriptor(a,"privateReceipt")?.enumerable!==false))HOLD("BOUND_PRE_SCOPE");
 const obs:P5EReviewedSupplementalObservation[]=[];
 for(const a of artifacts){
  const p=a.privateReceipt;
  if(p.kind==="METAR"){
   const weather=compileP5ExistingNoaaMetarToE({flightInstanceId:scope.flightInstanceId,originAirportIcao:scope.originIcao,actualPredictionIssuedAtUtc:scope.observedDbClockUtc,receipt:a.privateMetarReceipts.find(v=>v.airportIcao===scope.originIcao)??null,independentlyReviewedSourcePurposeSha256:p.sourcePurposeSha256});
   obs.push(...weather.observations);
  }else if(scope.destinationIcao!==scope.originIcao){
   const taf=compileP5AlreadyDurableNoaaTafAsOfV39({flightInstanceId:scope.flightInstanceId,originAirportIcao:scope.originIcao,destinationAirportIcao:scope.destinationIcao,originalSelectedNativeDepartureUtc:scope.selectedNativeTUtc,actualPredictionIssuedAtUtc:scope.observedDbClockUtc,sourceJsonText:a.privateSourceJsonText,fetchedAtUtc:p.fetchedAtUtc,durableArtifactReadAtUtc:p.durableReadAtUtc,independentlyReviewedResponseBytesSha256:p.sourceBodySha256,independentlyReviewedPurposeSha256:p.sourcePurposeSha256});
   obs.push(...taf.observations);
  }
 }
 const fields=["origin_metar_visibility_m","origin_metar_wind_kt","origin_taf_flight_category","destination_taf_flight_category"] as const;
 const selected:P5EReviewedSupplementalObservation[]=[];
 let ambiguousFields=0;
 for(const field of fields){
  const hits=obs.filter(v=>v.field===field).sort((a,b)=>at(b.observedAtUtc)-at(a.observedAtUtc)||at(b.availableAtUtc)-at(a.availableAtUtc));
  if(!hits.length)continue;
  const newest=hits[0],ties=hits.filter(v=>at(v.observedAtUtc)===at(newest.observedAtUtc));
  if(ties.some(v=>v.value!==newest.value||v.sourceRecordId!==newest.sourceRecordId)){ambiguousFields++;continue}
  selected.push(newest);
 }
 const merged=draftP5ECombinedExistingSourcesPacket({existingV0079FidsBundle:bundle,weather:selected.filter(v=>v.source==="NOAA_METAR"),taf:selected.filter(v=>v.source==="NOAA_TAF"),historical:[],externallyReviewedWholePacketUseSha256:bundle.externalSourceAndContentsReviewReceiptSha256});
 const out={weatherFieldsPresent:selected.length,ambiguousFields,weatherFieldsMissing:4-selected.length,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(out,"privateBundle",{value:merged.bundle,enumerable:false})) as typeof out&{readonly privateBundle:P5EReviewedSupplementalBundle};
}
