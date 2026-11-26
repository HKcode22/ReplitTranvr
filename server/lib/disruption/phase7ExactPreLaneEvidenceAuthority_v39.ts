/** Genuine PRE lane authority candidate. Independently rereads the actual
 * bound original with the existing restricted SOURCE role. A separately
 * approved Article 5.8 purpose policy authorizes per-item reference LINK
 * evidence only; never a permanent per-flight model feature or substitute
 * database. Public weather must be independently recomputed from the
 * actual archived public observations. Unsupported PRESENT exact lanes
 * hold, rather than being silently omitted or self-attested.
 *
 * This process holds the lane authority key, never the PRE proof signing
 * key, roster/key publisher or paid/provider credentials. The existing
 * SOURCE login retains its prior grants; this process opens READ ONLY
 * transactions and never performs a SOURCE mutation.
 */
import {createHash,createPublicKey,randomUUID,sign,type KeyObject} from "node:crypto";
import {Pool} from "pg";
import {issueP5ConditionalT24SignedReviewPage} from "./phase5ConditionalPrePermitPreparation_v39";
import type {P5SignedConditionalFeatureReadScope} from "./phase5ConditionalBoundSourceReview_v39";
import {makeP5Stage28DedicatedRolePool} from "./phase5Stage28DedicatedRolePool_v39";
import {P5_E_V0079_SOURCE_READONLY_LOGIN_V39} from "./phase5AmendmentEOriginalFidsReadonlyCompiler_v39";
import {admitP7ExactSourcePreProducer,readP7RestrictedSourceClock} from "./phase7ExactSourcePreProofProducer_v39";
import {readP7ExactSelectedFeatures,readP7ReviewedTierSelectedFeatures,readP7ReviewedTierSelectedFeaturesPage,requireP7ActualSourceReadback,type P7ConditionalProofScopePort} from "./phase7IndependentPreSourceReader_v39";
import {verifyP7NoaaExactPreLaneEvidence,readP7WeatherOnlyForPresentPermit,type P7SignedPublicNoaaArtifact} from "./phase7IndependentNoaaReceipt_v39";
import {admitPurposeBoundReferenceIdentifier} from "./phase7PurposeBoundReferenceIdentifier_v39";
import {assertP7IndependentLaneReceiptMetadata,type Phase7AuthenticatedLaneReceipt} from "./phase7IndependentPreProofIssuer_v39";
import {phase7SelectedFeatureDigest} from "./phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import type {Phase7CanonicalFieldDisposition} from "./phase7CanonicalFieldParity_v39";
const hold=(s:string):never=>{throw Error("HOLD_P7_PRE_LANE_AUTHORITY_"+s);};
const H=/^[a-f0-9]{64}$/;
const digest=(s:unknown):s is string=>typeof s==="string"&&H.test(s)&&!/^([a-f0-9])\1{63}$/.test(s);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const clock=(s:string)=>{const t=Date.parse(s);if(!Number.isFinite(t)||new Date(t).toISOString()!==s)hold("CLOCK");return t};
const offset={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000} as const;
/** Reviewed provider carrier code format is explicit. Existing signed Amendment E
 * FIDS fixtures contain both two-letter IATA (SQ) and three-letter ICAO (SIA).
 * Do not silently infer or rewrite a source code; the exact field policy
 * authorizes one supported kind and the value is validated against that kind. */
const referenceKinds={
 origin_icao:["airport_icao"],
 destination_icao:["airport_icao"],
 operating_carrier:["airline_iata","airline_icao"]
} as const;
type ReferenceField=keyof typeof referenceKinds;
type ReferenceKind=(typeof referenceKinds)[ReferenceField][number];
type ReferenceReview={field:ReferenceField;kind:ReferenceKind;purpose:"link";fieldReviewSha256:string};
export type P7ReferenceLinkPolicy={schema:"v39.phase7.pre-reference-link-purpose-policy.v1";manifestSha256:string;rightsSha256:string;prePolicySha256:string;termsReviewSha256:string;independentPurposeReviewSha256:string;validFromUtc:string;validUntilUtc:string;scope:"SINGLE_ORIGINAL_MEMBER_LINK_ONLY";allowSubstituteCompilation:false;allowPerFlightTrainingLink:false;fields:ReferenceReview[]};
const exact=(o:unknown,ks:string[])=>!!o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
/** The approved field profile alone is not authority to use identifiers for
 * arbitrary purposes. Require explicit protected per-field link decision,
 * exact manifest/rights/terms/profile and bounded clock. The check does not
 * create a legal review or a new right. */
export function parseP7ReferenceLinkPolicy(env:NodeJS.ProcessEnv,termsReviewSha256:string,dispositions:readonly Phase7CanonicalFieldDisposition[]){
 const raw=env.P6_PHASE7_PRE_REFERENCE_LINK_POLICY_BASE64??"";
 if(!raw||raw.length>20000||!(/^[A-Za-z0-9+/]+={0,2}$/).test(raw))return hold("REFERENCE_PURPOSE_POLICY");
 const b=Buffer.from(raw,"base64");
 if(b.toString("base64")!==raw||!digest(env.P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256)||sha(b)!==env.P6_PHASE7_PRE_REFERENCE_LINK_POLICY_SHA256)hold("REFERENCE_PURPOSE_POLICY");
 const x=JSON.parse(b.toString("utf8")) as P7ReferenceLinkPolicy;
 if(!exact(x,["schema","manifestSha256","rightsSha256","prePolicySha256","termsReviewSha256","independentPurposeReviewSha256","validFromUtc","validUntilUtc","scope","allowSubstituteCompilation","allowPerFlightTrainingLink","fields"])||
  x.schema!=="v39.phase7.pre-reference-link-purpose-policy.v1"||x.manifestSha256!==env.V39_P5_MANIFEST_SHA256||x.rightsSha256!==env.V39_P5_RIGHTS_SHA256||
  x.prePolicySha256!==env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256||x.termsReviewSha256!==termsReviewSha256||
  ![x.manifestSha256,x.rightsSha256,x.prePolicySha256,x.termsReviewSha256,x.independentPurposeReviewSha256].every(digest)||
  x.scope!=="SINGLE_ORIGINAL_MEMBER_LINK_ONLY"||x.allowSubstituteCompilation!==false||x.allowPerFlightTrainingLink!==false||
  clock(x.validFromUtc)>=clock(x.validUntilUtc)||!Array.isArray(x.fields)||x.fields.length>3||
  new Set(x.fields.map(f=>f.field)).size!==x.fields.length)hold("REFERENCE_PURPOSE_SCOPE");
 const expected=dispositions.filter(d=>d.disposition==="PURPOSE_BOUND_REFERENCE_LANE");
 if(expected.length!==x.fields.length||x.fields.some(f=>!exact(f,["field","kind","purpose","fieldReviewSha256"])||
  !Object.hasOwn(referenceKinds,f.field)||!(referenceKinds[f.field] as readonly string[]).includes(f.kind)||f.purpose!=="link"||!digest(f.fieldReviewSha256)||
  !expected.some(d=>d.field===f.field&&d.reviewSha256===f.fieldReviewSha256&&d.outputField===null)))hold("REFERENCE_PURPOSE_FIELD_DENOMINATOR");
 return Object.freeze(x);
}
type Actual=Awaited<ReturnType<typeof readP7ExactSelectedFeatures>>;
type AuthorityConfig={env:NodeJS.ProcessEnv;signer:KeyObject;termsReviewSha256:string;dispositions:readonly Phase7CanonicalFieldDisposition[];referencePolicy:Readonly<P7ReferenceLinkPolicy>};
export function signP7ActualPreLaneReceipt(config:AuthorityConfig,p:Readonly<P5Stage14SingleFlightPrePermit>,actual:Actual,weatherArtifacts:readonly P7SignedPublicNoaaArtifact[]){
 requireP7ActualSourceReadback(actual);
 const {env,signer,dispositions,referencePolicy:ref}=config;
 if(env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_APPROVED!=="1"||env.P6_PHASE7_PRE_PROOF_REVIEWER_PRIVATE_KEY_BASE64||
  signer.type!=="private"||signer.asymmetricKeyType!=="ed25519"||
  sha(createPublicKey(signer).export({type:"spki",format:"der"}))!==env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256||
  env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256===env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||
  actual.permitSha256!==hashPhase7DurableCandidate(p)||p.manifestSha256!==env.V39_P5_MANIFEST_SHA256||p.expectedReviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
  !digest(env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256)||!Object.hasOwn(offset,p.horizon)||!Array.isArray(weatherArtifacts)||weatherArtifacts.length>128)hold("DISTINCT_ACTUAL_AUTHORITY");
 const reviewed=clock(actual.observedDbClockUtc),cutoff=clock(p.selectedTNativeUtc)-offset[p.horizon],expiry=clock(actual.sourceExpiresAtUtc);
 if(reviewed<clock(ref.validFromUtc)||cutoff>clock(ref.validUntilUtc)||cutoff<=reviewed+900000||cutoff>expiry||cutoff-reviewed>86400000)hold("LIVE_REFERENCE_AND_SOURCE_WINDOW");
 // Revalidate the exact protected reference decision, not a caller-constructed
 // lookalike. It permits a real link to the existing durable original only.
 if(hashPhase7DurableCandidate(ref)!==hashPhase7DurableCandidate(parseP7ReferenceLinkPolicy(env,config.termsReviewSha256,dispositions)))hold("REFERENCE_REVIEW_DRIFT");
 const fields:Phase7AuthenticatedLaneReceipt["fields"][number][]=[];
 const weatherNames=new Set(["origin_metar_visibility_m","origin_metar_wind_kt","origin_taf_flight_category","destination_taf_flight_category"]);
 const present=actual.privateSelectedFeatures.filter(f=>f.value!==null&&f.value!==undefined);
 const expected=present.filter(f=>dispositions.find(d=>d.field===f.featureName)?.disposition!=="REVIEWED_DERIVED_BUCKET");
 if(present.some(f=>!dispositions.some(d=>d.field===f.featureName&&d.disposition!=="LONG_TERM_RIGHTS_REQUIRED")))hold("UNREVIEWED_PRESENT_FIELD");
 if(present.some(f=>weatherNames.has(f.featureName))){
  const weather=verifyP7NoaaExactPreLaneEvidence({env,permit:p,scope:actual.privateWeatherScope,dispositions,artifacts:weatherArtifacts});
  fields.push(...weather.privateWeatherFields);
 }
 for(const f of expected){
  const d=dispositions.find(x=>x.field===f.featureName)!;
  if(weatherNames.has(f.featureName))continue;
  // No placeholder for an unsupported source. A future present exact
  // history/ADSB/native-time field needs its real separately approved lane.
  if(d.disposition!=="PURPOSE_BOUND_REFERENCE_LANE"||!Object.hasOwn(referenceKinds,f.featureName))hold("PRESENT_SEPARATE_LANE_UNIMPLEMENTED");
  const rr=ref.fields.find(x=>x.field===f.featureName);
  if(!rr||f.source!=="AERODATABOX_FIDS"||typeof f.value!=="string")return hold("EXACT_REFERENCE_FIELD");
  const item=admitPurposeBoundReferenceIdentifier({schema:"v39.phase7.reference-identifier-scope.v1",itemScopeId:randomUUID(),kind:rr.kind,purpose:"link",value:f.value,
   termsReviewSha256:ref.termsReviewSha256,purposeReviewSha256:rr.fieldReviewSha256,independentScopeApproved:true});
  // Actual original and operating member were joined and verified through
  // restricted PostgreSQL readback. This attests ONLY that scoped link.
  // No persistent exact code, item ID or training mapping is created here.
  fields.push({field:d.field,disposition:"PURPOSE_BOUND_REFERENCE_LANE",purpose:"link",fieldReviewSha256:d.reviewSha256,selectedFeatureSha256:phase7SelectedFeatureDigest(f),
   durableEvidenceSha256:hashPhase7DurableCandidate({schema:"v39.phase7.actual-reference-link-readback.v1",permitSha256:actual.permitSha256,sourceOriginalSha256:p.expectedSourceResponseSha256,
    populationQueryId:p.expectedSourcePopulationQueryId,purposeReviewSha256:ref.independentPurposeReviewSha256,itemScopeSha256:hashPhase7DurableCandidate(item),
    observedDbClockUtc:actual.observedDbClockUtc,sourceExpiresAtUtc:actual.sourceExpiresAtUtc}),durableReadAtUtc:actual.observedDbClockUtc});
 }
 if(fields.length!==expected.length||new Set(fields.map(f=>f.field)).size!==fields.length||expected.some(f=>!fields.some(e=>e.field===f.featureName)))hold("ALL_PRESENT_SEPARATE_FIELDS");
 const receipt:Phase7AuthenticatedLaneReceipt={schema:"v39.phase7.independent-pre-lane-readback.v1",manifestSha256:p.manifestSha256,rightsSha256:p.expectedReviewedSourceRightsSha256,
  policySha256:env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256!,permitSha256:actual.permitSha256,sourceExpiresAtUtc:actual.sourceExpiresAtUtc,reviewedAtUtc:actual.observedDbClockUtc,validUntilUtc:new Date(cutoff).toISOString(),fields};
 assertP7IndependentLaneReceiptMetadata(receipt);
 const raw=Buffer.from(JSON.stringify(receipt)),wire={payloadBase64:raw.toString("base64"),signatureBase64:sign(null,raw,signer).toString("base64")};
 const result={status:"P7_ACTUAL_PRE_LANE_RECEIPT_ISSUED_NO_GO",referenceLinkFields:fields.filter(f=>f.purpose==="link").length,independentExactFields:fields.filter(f=>f.purpose==="independent_research").length,
  longTermReferenceTrainingUseApproved:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
 return Object.freeze(Object.defineProperty(result,"privateWire",{value:Object.freeze(wire),enumerable:false})) as typeof result&{readonly privateWire:Readonly<typeof wire>};
}
/** Separate protected authority process, existing SOURCE actor and genuine
 * public archive port only. No proof signer or private publisher capability. */
export function openP7ActualPreLaneEvidenceAuthority(env:NodeJS.ProcessEnv,signer:KeyObject,weatherPort?:{
 readExactReviewedWeatherArtifacts(p:Readonly<P5Stage14SingleFlightPrePermit>):Promise<readonly P7SignedPublicNoaaArtifact[]>
},conditionalScope?:P7ConditionalProofScopePort){
 const a=admitP7ExactSourcePreProducer(env,"lane");
 const fp=sha(createPublicKey(signer).export({type:"spki",format:"der"}));
 if(signer.type!=="private"||signer.asymmetricKeyType!=="ed25519"||fp!==env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256||
  fp!==sha(a.authority.export({type:"spki",format:"der"}))||fp===env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||a.forbiddenSignerFingerprints.includes(fp))hold("AUTHORITY_KEY_ISOLATION");
 const referencePolicy=parseP7ReferenceLinkPolicy(env,a.policy.profile.termsReviewSha256,a.policy.dispositions);
 const underlying=new Pool({connectionString:a.sourceUrl,max:1,connectionTimeoutMillis:8000,query_timeout:25000,application_name:"p7_actual_pre_lane_authority",options:"-c default_transaction_read_only=on"});
 const pool=makeP5Stage28DedicatedRolePool(underlying,{group:"source",reviewedDedicatedLogin:P5_E_V0079_SOURCE_READONLY_LOGIN_V39,forbiddenApplicationLogin:"phase5_runtime_application_login"});
 return {async issueConditionalT24Review(scope:P5SignedConditionalFeatureReadScope,ids:readonly string[],reviewedCodeSha:string,additionalForbidden:readonly string[]){
  const raw=env.P6_NONPAID_DAILY_POLICY_BASE64??"",policyBytes=Buffer.from(raw,"base64");
  if(policyBytes.toString("base64")!==raw)hold("CONDITIONAL_T24_POLICY_BYTES");
  return issueP5ConditionalT24SignedReviewPage(pool,scope,ids,{policyBytes,expectedPolicySha256:env.P6_NONPAID_DAILY_POLICY_SHA256??"",
   expectedReviewedCodeSha:reviewedCodeSha,expectedReviewerFingerprintSha256:fp,forbiddenSignerFingerprints:[...new Set([...a.forbiddenSignerFingerprints,...additionalForbidden])],signer,env});
 },async issueExactLaneReceipt(p:Readonly<P5Stage14SingleFlightPrePermit>){
  const weather=await readP7WeatherOnlyForPresentPermit(p,weatherPort);
  const actual=await readP7ReviewedTierSelectedFeatures(pool,p,a.externalContentUseReviewSha256,conditionalScope);
  return signP7ActualPreLaneReceipt({env,signer,termsReviewSha256:a.policy.profile.termsReviewSha256,dispositions:a.policy.dispositions,referencePolicy},p,actual,weather);
 },async issueExactLaneReceiptPage(permits:readonly P5Stage14SingleFlightPrePermit[]){
  if(!Array.isArray(permits)||permits.length<1||permits.length>96)hold("EXACT_AUTHORITY_PAGE");
  const weather: (readonly P7SignedPublicNoaaArtifact[])[]=[];
  for(const p of permits)weather.push(await readP7WeatherOnlyForPresentPermit(p,weatherPort));
  const actual=await readP7ReviewedTierSelectedFeaturesPage(pool,permits,a.externalContentUseReviewSha256,conditionalScope);
  const config={env,signer,termsReviewSha256:a.policy.profile.termsReviewSha256,dispositions:a.policy.dispositions,referencePolicy};
  return permits.map((p,i)=>signP7ActualPreLaneReceipt(config,p,actual[i],weather[i]));
 },preflight:()=>readP7RestrictedSourceClock(pool),close:()=>underlying.end()};
}
