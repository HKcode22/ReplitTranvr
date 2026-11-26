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
import {selectP5EReviewedSupplementalFeatures,type P5EReviewedSupplementalBundle,type P5EReviewedSupplementalObservation} from "./phase5AmendmentESignedSupplementalFeatures_v39";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import type {Phase7CanonicalFieldDisposition} from "./phase7CanonicalFieldParity_v39";
import {phase7SelectedFeatureDigest} from "./phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
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

/** Actual native-review handoff. Public weather source lookup has only a
 * station set and as-of clock, not flight IDs or any source-record scope.
 * A missing optional source stays missing; malformed or mismatched signed
 * evidence never becomes a prediction. The original matched flight count
 * is unchanged. No provider fetch, private packet write or signature here. */
/** Optional weather must not become a dependency of a signed permit that
 * contains no weather. A malformed or present observation still goes through
 * the original independent proof checks. */
export async function readP7WeatherOnlyForPresentPermit(
 p:Readonly<P5Stage14SingleFlightPrePermit>,
 port?:{readExactReviewedWeatherArtifacts(p:Readonly<P5Stage14SingleFlightPrePermit>):Promise<readonly P7SignedPublicNoaaArtifact[]>}
){
 const observations=p.reviewedSupplementalFeatureBundle?.observations;
 const fields=new Set(["origin_metar_visibility_m","origin_metar_wind_kt","origin_taf_flight_category","destination_taf_flight_category"]);
 const present=Array.isArray(observations)&&observations.some(o=>fields.has(o.field)&&o.value!==null&&o.value!==undefined);
 if(!present)return [];
 if(!port)return HOLD("PRESENT_WEATHER_READER_REQUIRED");
 return port.readExactReviewedWeatherArtifacts(p);
}
export async function enrichP7NativeFeatureReviewWithNoaa(input:{
 env:NodeJS.ProcessEnv;handoff:any;featureReview:any;
 port:{readReviewedWeatherArtifacts:(scope:Readonly<{airports:readonly string[];observedDbClockUtc:string}>)=>Promise<readonly P7SignedPublicNoaaArtifact[]>};
 forbiddenSignerFingerprints:readonly string[];
}){
 const {env,handoff:h,featureReview:f,port}=input;
 if(!f||f.status!=="EXACT_BOUND_ORIGINAL_NATIVE_FEATURE_BATCH_NOT_SIGNED"||h?.status!=="UNSIGNED_PRE_REVIEW_HANDOFF_NOT_AUTHORIZED"||
  f.horizon!==h.horizon||f.runDayIndex!==h.runDayIndex||f.providerCalls!==0||f.dbWrites!==0||f.phase6PaidGo!==false||
  Object.getOwnPropertyDescriptor(f,"privateDecisions")?.enumerable!==false||Object.getOwnPropertyDescriptor(h,"privateReviewEntries")?.enumerable!==false||
  !Array.isArray(f.privateDecisions)||!Array.isArray(h.privateReviewEntries)||f.privateDecisions.length>2500||h.privateReviewEntries.length>2500||
  typeof port?.readReviewedWeatherArtifacts!=="function"||input.forbiddenSignerFingerprints.includes(env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256??""))HOLD("NATIVE_REVIEW_HANDOFF");
 const now=at(f.observedDbClockUtc),byId=new Map<string,any>(h.privateReviewEntries.map((e:any)=>[e.source.flightInstanceId,e.source]));
 if(byId.size!==h.privateReviewEntries.length)HOLD("DUPLICATE_NATIVE_SELECTION");
 const stations=new Set<string>(),scopes=new Map<string,P7WeatherJoinScope>(),seen=new Set<string>();
 let late=0,matched=0;
 for(const d of f.privateDecisions){
  const s=byId.get(d.flightInstanceId);
  if(!s||seen.has(d.flightInstanceId))HOLD("CROSS_NATIVE_SELECTION");
  seen.add(d.flightInstanceId);
  if(d.status!=="MATCHED_NATIVE_ORIGINAL")continue;
  matched++;
  const x=d.privateWeatherJoinScope,b=d.compiled?.bundle;
  if(!x||Object.getOwnPropertyDescriptor(d,"privateWeatherJoinScope")?.enumerable!==false||
   d.compiled?.sourceBodyAndCanonicalEnvelopeIntegrityVerified!==true||d.compiled?.sameOriginalNativeOperatingLegBoundOnly!==true||
   b?.flightInstanceId!==d.flightInstanceId||b.populationQueryId!==s.expectedSourcePopulationQueryId||b.originalResponseSha256!==s.expectedSourceResponseSha256||
   x.originIcao!==s.airportIcao||x.selectedNativeTUtc!==s.selectedTNativeUtc||x.memberAvailableAtUtc!==s.sourceMemberAvailableAtUtc||
   !ICAO.test(x.originIcao)||!ICAO.test(x.destinationIcao))HOLD("MATCHED_ORIGINAL_ROUTE");
  const cutoff=at(s.ownPreCutoffUtc);
  if(now>=cutoff){late++;continue;}
  stations.add(x.originIcao);stations.add(x.destinationIcao);
  scopes.set(d.flightInstanceId,{flightInstanceId:d.flightInstanceId,originIcao:x.originIcao,destinationIcao:x.destinationIcao,selectedNativeTUtc:x.selectedNativeTUtc,ownCutoffUtc:s.ownPreCutoffUtc,observedDbClockUtc:f.observedDbClockUtc});
 }
 if(matched!==f.matchedCount||stations.size>2501)HOLD("NATIVE_REVIEW_DENOMINATOR");
 const raw=scopes.size?await port.readReviewedWeatherArtifacts(Object.freeze({airports:Object.freeze([...stations].sort()),observedDbClockUtc:f.observedDbClockUtc})):[];
 if(!Array.isArray(raw)||raw.length>128)HOLD("WEATHER_ARTIFACT_SET");
 const weather=raw.map(v=>verifyP7IndependentPublicNoaaArtifact(env,v,f.observedDbClockUtc));
 // Artifact may serve multiple airports; require that it intersects this
 // exact request. Avoid unrelated global material in this native handoff.
 if(weather.some(a=>!a.privateReceipt.requestedAirports.some(v=>stations.has(v)))||new Set(weather.map(a=>a.receiptSha256)).size!==weather.length)HOLD("WEATHER_ARTIFACT_SCOPE");
 const counts={weatherArtifactCount:weather.length,weatherEligibleFlightCount:scopes.size,weatherLateFlightCount:late,weatherPresentFields:0,weatherMissingFields:0,weatherAmbiguousFields:0};
 const decisions=f.privateDecisions.map((d:any)=>{
  const scope=scopes.get(d.flightInstanceId);if(!scope)return d;
  const relevant=weather.filter(a=>a.privateReceipt.requestedAirports.includes(scope.originIcao)||(scope.destinationIcao!==null&&a.privateReceipt.requestedAirports.includes(scope.destinationIcao)));
  const m=mergeP7VerifiedNoaaIntoBoundPreBundle(d.compiled.bundle,scope,relevant);
  counts.weatherPresentFields+=m.weatherFieldsPresent;counts.weatherMissingFields+=m.weatherFieldsMissing;counts.weatherAmbiguousFields+=m.ambiguousFields;
  return Object.freeze(Object.defineProperty({...d,compiled:{...d.compiled,bundle:m.privateBundle}},"privateWeatherJoinScope",{value:d.privateWeatherJoinScope,enumerable:false}));
 });
 return Object.freeze(Object.defineProperty({...f,...counts},"privateDecisions",{value:Object.freeze(decisions),enumerable:false}));
}

/** Independently reconstruct the WEATHER part of a specific prospective
 * permit's selected-feature evidence from actual signed public source bytes.
 * The caller must obtain the exact member/route/clock via the restricted
 * source reader. Not a complete lane authority: reference identifiers and
 * other present separate fields need their own genuine independent readback.
 * In particular, a copied source value, sourceRecordId, or permit digest is
 * not a substitute for recomputing these observations from the archive.
 */
export function verifyP7NoaaExactPreLaneEvidence(input:{
 env:NodeJS.ProcessEnv;permit:Readonly<P5Stage14SingleFlightPrePermit>;
 scope:Readonly<{flightInstanceId:string;originIcao:string;destinationIcao:string|null;memberAvailableAtUtc:string;observedDbClockUtc:string}>;
 dispositions:readonly Phase7CanonicalFieldDisposition[];artifacts:readonly P7SignedPublicNoaaArtifact[];
}){
 const {env,permit:p,scope:s,dispositions,artifacts}=input,b=p.reviewedSupplementalFeatureBundle;
 const names=["origin_metar_visibility_m","origin_metar_wind_kt","origin_taf_flight_category","destination_taf_flight_category"] as const;
 const isWeather=(f:string):f is typeof names[number]=>names.includes(f as typeof names[number]);
 const policy=env.P6_PHASE7_NOAA_SOURCE_PURPOSE_SHA256;
 const now=at(s.observedDbClockUtc),cutoff=at(p.selectedTNativeUtc)-({"T-24h":86400000,"T-6h":21600000,"T-90m":5400000}[p.horizon]);
 if(!digest(policy)||!b||p.manifestSha256!==env.V39_P5_MANIFEST_SHA256||p.expectedReviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
  p.flightInstanceId!==s.flightInstanceId||p.airportIcao!==s.originIcao||p.expectedDestinationIcao!==undefined&&p.expectedDestinationIcao!==s.destinationIcao||
  !Number.isFinite(cutoff)||now>=cutoff||at(s.memberAvailableAtUtc)>now||!Array.isArray(artifacts)||artifacts.length>128||
  !Array.isArray(dispositions)||new Set(dispositions.map(x=>x.field)).size!==dispositions.length)HOLD("EXACT_WEATHER_LANE_SCOPE");
 const chosen=selectP5EReviewedSupplementalFeatures({flightInstanceId:p.flightInstanceId,horizon:p.horizon,selectedNativeTUtc:p.selectedTNativeUtc,
  cutoffUtc:new Date(cutoff).toISOString(),issuedAtUtc:s.observedDbClockUtc,sourceOriginalSha256:p.expectedSourceResponseSha256,
  sourcePopulationQueryId:p.expectedSourcePopulationQueryId,memberAvailableAtUtc:s.memberAvailableAtUtc,originIcao:s.originIcao,destinationIcao:s.destinationIcao,bundle:b!});
 const verified=artifacts.map(w=>verifyP7IndependentPublicNoaaArtifact(env,w,s.observedDbClockUtc));
 if(verified.some(a=>a.privateReceipt.sourcePurposeSha256!==policy||
   !a.privateReceipt.requestedAirports.some(v=>v===s.originIcao||v===s.destinationIcao))||
   new Set(verified.map(a=>a.receiptSha256)).size!==verified.length)HOLD("WEATHER_LANE_PURPOSE_OR_ARTIFACT_SET");
 const candidates:{observation:P5EReviewedSupplementalObservation;artifact:Verified}[]=[];
 for(const a of verified){
  const q=a.privateReceipt;
  const xs=q.kind==="METAR"?compileP5ExistingNoaaMetarToE({flightInstanceId:p.flightInstanceId,originAirportIcao:s.originIcao,actualPredictionIssuedAtUtc:s.observedDbClockUtc,
     receipt:a.privateMetarReceipts.find(v=>v.airportIcao===s.originIcao)??null,independentlyReviewedSourcePurposeSha256:q.sourcePurposeSha256}).observations:
    s.destinationIcao===s.originIcao?[]:compileP5AlreadyDurableNoaaTafAsOfV39({flightInstanceId:p.flightInstanceId,originAirportIcao:s.originIcao,destinationAirportIcao:s.destinationIcao,
     originalSelectedNativeDepartureUtc:p.selectedTNativeUtc,actualPredictionIssuedAtUtc:s.observedDbClockUtc,sourceJsonText:a.privateSourceJsonText,
     fetchedAtUtc:q.fetchedAtUtc,durableArtifactReadAtUtc:q.durableReadAtUtc,independentlyReviewedResponseBytesSha256:q.sourceBodySha256,
     independentlyReviewedPurposeSha256:q.sourcePurposeSha256}).observations;
  for(const observation of xs)candidates.push({observation,artifact:a});
 }
 const fields: {field:typeof names[number];disposition:"INDEPENDENT_SOURCE_EXACT_LANE";purpose:"independent_research";fieldReviewSha256:string;selectedFeatureSha256:string;durableEvidenceSha256:string;durableReadAtUtc:string}[]=[];
 const present=chosen.features.filter(f=>isWeather(f.featureName)&&f.value!==null&&f.value!==undefined);
 for(const f of present){
  const field=f.featureName as typeof names[number],disposition=dispositions.find(d=>d.field===field);
  if(!disposition||!digest(disposition.reviewSha256)||!["INDEPENDENT_SOURCE_EXACT_LANE","REVIEWED_DERIVED_BUCKET"].includes(disposition.disposition))HOLD("WEATHER_LANE_FIELD_DISPOSITION");
  const observations=b!.observations.filter(o=>o.field===field&&o.value!==null);
  if(observations.length!==1)HOLD("WEATHER_LANE_OBSERVATION_DENOMINATOR");
  const observation=observations[0],obsSha=hashPhase7DurableCandidate(observation);
  // Multiple authentic artifact receipts may contain the same original
  // row, but the exact durable clock and observation bytes must match.
  const matches=candidates.filter(c=>hashPhase7DurableCandidate(c.observation)===obsSha);
  if(matches.length!==1)HOLD("WEATHER_LANE_EXACT_SOURCE_OBSERVATION_NOT_REPRODUCED");
  const {artifact}=matches[0],q=artifact.privateReceipt;
  if(disposition!.disposition==="INDEPENDENT_SOURCE_EXACT_LANE"){
   fields.push({field,disposition:"INDEPENDENT_SOURCE_EXACT_LANE",purpose:"independent_research",fieldReviewSha256:disposition!.reviewSha256,
    selectedFeatureSha256:phase7SelectedFeatureDigest(f),durableEvidenceSha256:hashPhase7DurableCandidate({receiptSha256:artifact.receiptSha256,
     archiveSha256:q.artifactArchiveSha256,sourceBodySha256:q.sourceBodySha256,sourceObservationSha256:obsSha}),durableReadAtUtc:q.durableReadAtUtc});
  }
 }
 const out={status:"P7_NOAA_WEATHER_FIELDS_INDEPENDENTLY_REPRODUCED_NO_GO",presentWeatherFields:present.length,weatherFieldsMissing:names.length-present.length,
  separateWeatherLaneFields:fields.length,completePreLaneEvidence:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(out,"privateWeatherFields",{value:Object.freeze(fields.map(f=>Object.freeze(f))),enumerable:false})) as typeof out&{readonly privateWeatherFields:ReadonlyArray<Readonly<typeof fields[number]>>};
}
