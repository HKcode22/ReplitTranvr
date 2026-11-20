/** Independent PRE proof issuance: a genuine separate-lane evidence
 * authority must authenticate its durable readback BEFORE this issuer signs.
 * The native roster publisher/paid worker cannot invent field evidence by
 * hashing the permit or selected ADB value. No new source collection, public
 * artifacts, rights decision, provider request, or permanent source map.
 */
import {createHash,createPublicKey,sign,verify,type KeyObject} from "node:crypto";
import type {PreFeatureInput} from "./preSnapshotBuilder_v3";
import type {P5EPreField} from "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import type {Phase7CanonicalFieldDisposition} from "./phase7CanonicalFieldParity_v39";
import {phase7SelectedFeatureDigest,verifyPhase7SignedPreFieldProof,type Phase7SignedPreFieldProofWire,type Phase7VerifiedPreFieldProof} from "./phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
const H=/^[a-f0-9]{64}$/;
const digest=(x:unknown):x is string=>typeof x==="string"&&H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
const hold=(s:string):never=>{throw Error("HOLD_P7_INDEPENDENT_PRE_ISSUER_"+s);};
const exact=(x:unknown,ks:readonly string[])=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const clock=(v:string)=>{const t=Date.parse(v);if(!Number.isFinite(t)||new Date(t).toISOString()!==v)hold("CLOCK");return t;};
const fingerprint=(k:KeyObject)=>createHash("sha256").update(k.export({type:"spki",format:"der"})).digest("hex");
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const horizonMs={"T-24h":86400000,"T-6h":21600000,"T-90m":5400000} as const;
function bytes(s:unknown,max:number){
 if(typeof s!=="string"||s.length<4||s.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(s))return hold("WIRE_ENCODING");
 const b=Buffer.from(s,"base64");if(b.length>max||b.toString("base64")!==s)hold("WIRE_ENCODING");return b;
}
type Lane="INDEPENDENT_SOURCE_EXACT_LANE"|"PURPOSE_BOUND_REFERENCE_LANE";
type Purpose="independent_research"|"identify"|"link"|"retrieve";
export interface Phase7AuthenticatedLaneReceipt{
 schema:"v39.phase7.independent-pre-lane-readback.v1";
 manifestSha256:string;rightsSha256:string;policySha256:string;permitSha256:string;
 sourceExpiresAtUtc:string;reviewedAtUtc:string;validUntilUtc:string;
 fields:readonly {
  field:P5EPreField;disposition:Lane;purpose:Purpose;fieldReviewSha256:string;
  selectedFeatureSha256:string;durableEvidenceSha256:string;durableReadAtUtc:string;
 }[];
}
/** Real source authority port: independently re-read selected values and the
 * protected, separately signed evidence. A mere asserted set of fields is
 * not a receipt; an empty receipt for present fields is not accepted.
 * This port must be commissioned against the actual lawful lane archive. */
export interface Phase7IndependentPreLaneReader{
 readExactLaneEvidence(permit:Readonly<P5Stage14SingleFlightPrePermit>):Promise<{
  selectedFeatures:readonly PreFeatureInput[];
  wire:unknown;
 }>;
 readDatabaseClockUtc():Promise<string>;
}
type Settings={
 env:NodeJS.ProcessEnv;policySha256:string;dispositions:readonly Phase7CanonicalFieldDisposition[];
 evidenceAuthorityPublicKey:KeyObject;proofSigningKey:KeyObject;forbiddenSignerFingerprints:readonly string[];
 reader:Phase7IndependentPreLaneReader;
};
const fieldKeys=["field","disposition","purpose","fieldReviewSha256","selectedFeatureSha256","durableEvidenceSha256","durableReadAtUtc"] as const;
export function createPhase7IndependentPreProofPort(d:Settings){
 const {env,policySha256,dispositions,reader}=d;
 if(env.P6_PHASE7_PRE_PROOF_ISSUER_APPROVED!=="1"||env.AERODATABOX_API_KEY||env.RAPIDAPI_KEY||env.AERODATABOX_WEBHOOK_SECRET||
  env.DATABASE_URL||env.V39_DATABASE_RUNTIME_URL||env.P5_V39_OTHER_REST_RESERVE_DATABASE_URL||env.P5_V39_PRE_DATABASE_URL||
  env.P6_PRIVATE_PUBLISHER_DATABASE_URL||env.P6_PHASE7_POST_BUNDLE_WRITER_DATABASE_URL||
  !digest(policySha256)||policySha256!==env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256||
  typeof reader?.readExactLaneEvidence!=="function"||typeof reader?.readDatabaseClockUtc!=="function"||
  !Array.isArray(dispositions)||new Set(dispositions.map(x=>x.field)).size!==dispositions.length||
  dispositions.some(x=>!digest(x.reviewSha256)||x.disposition==="LONG_TERM_RIGHTS_REQUIRED"))hold("ISSUER_SCOPE");
 const authority=d.evidenceAuthorityPublicKey,signer=d.proofSigningKey;
 if(authority?.type!=="public"||authority.asymmetricKeyType!=="ed25519"||signer?.type!=="private"||signer.asymmetricKeyType!=="ed25519")hold("KEY_TYPES");
 const fp=fingerprint(authority),proofFp=fingerprint(createPublicKey(signer));
 if(fp===proofFp||fp!==env.P6_PHASE7_PRE_LANE_EVIDENCE_AUTHORITY_FINGERPRINT_SHA256||
  proofFp!==env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||
  [...d.forbiddenSignerFingerprints].some(x=>x===fp||x===proofFp))hold("DISTINCT_PINNED_ISSUERS");
 const byField=new Map(dispositions.map(x=>[x.field,x]));
 async function one(p:Readonly<P5Stage14SingleFlightPrePermit>):Promise<Phase7SignedPreFieldProofWire>{
  const permitSha=hashPhase7DurableCandidate(p);
  if(!digest(permitSha)||p.manifestSha256!==env.V39_P5_MANIFEST_SHA256||p.expectedReviewedSourceRightsSha256!==env.V39_P5_RIGHTS_SHA256||
    !Object.hasOwn(horizonMs,p.horizon))hold("PERMIT_SCOPE");
  const cutoff=clock(p.selectedTNativeUtc)-horizonMs[p.horizon];
  const result=await reader.readExactLaneEvidence(Object.freeze(structuredClone(p)));
  if(!result||!exact(result.wire,["payloadBase64","signatureBase64"])||!Array.isArray(result.selectedFeatures)||
    result.selectedFeatures.length>16||new Set(result.selectedFeatures.map(f=>f.featureName)).size!==result.selectedFeatures.length)hold("EVIDENCE_WIRE_OR_SELECTION");
  const w=result.wire as {payloadBase64:string;signatureBase64:string},raw=bytes(w.payloadBase64,20000),sig=bytes(w.signatureBase64,64);
  if(sig.length!==64||!verify(null,raw,authority,sig))hold("LANE_SIGNATURE");
  const x=JSON.parse(raw.toString("utf8")) as Phase7AuthenticatedLaneReceipt;
  if(!exact(x,["schema","manifestSha256","rightsSha256","policySha256","permitSha256","sourceExpiresAtUtc","reviewedAtUtc","validUntilUtc","fields"])||
   x.schema!=="v39.phase7.independent-pre-lane-readback.v1"||x.manifestSha256!==p.manifestSha256||
   x.rightsSha256!==p.expectedReviewedSourceRightsSha256||x.policySha256!==policySha256||x.permitSha256!==permitSha||
   !Array.isArray(x.fields)||x.fields.length>16||new Set(x.fields.map(f=>f.field)).size!==x.fields.length)hold("EXACT_LANE_RECEIPT");
  const at=await reader.readDatabaseClockUtc(),now=clock(at),reviewed=clock(x.reviewedAtUtc),expiry=clock(x.sourceExpiresAtUtc),until=clock(x.validUntilUtc);
  if(reviewed>now||now>=until||cutoff<=now+900000||cutoff>until||until>expiry||cutoff-now>86400000||
    until-reviewed>86400000)hold("PROSPECTIVE_LANE_CLOCK");
  const present=result.selectedFeatures.filter(f=>{
   const disp=byField.get(f.featureName as P5EPreField);
   if(!disp)hold("UNREVIEWED_SELECTED_FIELD");
   return f.value!==null&&f.value!==undefined&&disp!.disposition!=="REVIEWED_DERIVED_BUCKET";
  });
  if(present.length!==x.fields.length||present.some(f=>!x.fields.some(y=>y.field===f.featureName)))hold("COMPLETE_SEPARATE_LANE_DENOMINATOR");
  for(const e of x.fields){
   const f=present.find(z=>z.featureName===e.field),disp=byField.get(e.field);
   if(!exact(e,fieldKeys)||!f||!disp||e.disposition!==disp.disposition||e.fieldReviewSha256!==disp.reviewSha256||
    !digest(e.durableEvidenceSha256)||e.selectedFeatureSha256!==phase7SelectedFeatureDigest(f)||
    (e.disposition==="INDEPENDENT_SOURCE_EXACT_LANE"?e.purpose!=="independent_research":
     e.disposition!=="PURPOSE_BOUND_REFERENCE_LANE"||!["identify","link","retrieve"].includes(e.purpose))||
    clock(e.durableReadAtUtc)>reviewed||!f.informationAvailableAt||f.informationAvailableAt.getTime()>clock(e.durableReadAtUtc))hold("FIELD_EVIDENCE_OR_PURPOSE");
  }
  // Hash the exact signed independent receipt and its individual scope,
  // not the original provider field alone. The existing writer again
  // checks the actual selected value at its Stage14 transaction clock.
  const proof:Phase7VerifiedPreFieldProof={schema:"v39.phase7.separate-pre-field-proof.v1",
   manifestSha256:p.manifestSha256,rightsSha256:p.expectedReviewedSourceRightsSha256,policySha256,permitSha256:permitSha,
   issuedAtUtc:at,validUntilUtc:new Date(cutoff).toISOString(),fields:x.fields.map(e=>({
    field:e.field,selectedFeatureSha256:e.selectedFeatureSha256,
    independentEvidenceSha256:hashPhase7DurableCandidate({receiptSha256:sha(raw),signatureSha256:sha(sig),field:e.field,evidenceSha256:e.durableEvidenceSha256})}))};
  const rawProof=Buffer.from(JSON.stringify(proof)),wire={payloadBase64:rawProof.toString("base64"),signatureBase64:sign(null,rawProof,signer).toString("base64")};
  verifyPhase7SignedPreFieldProof(env,p,policySha256,dispositions,wire);
  return Object.freeze(wire);
 }
 return Object.freeze({
  async readExactPermitProofs(permits:readonly P5Stage14SingleFlightPrePermit[]){
   if(!Array.isArray(permits)||permits.length<1||permits.length>96)hold("PERMIT_BATCH");
   const keys=permits.map(hashPhase7DurableCandidate);
   if(new Set(keys).size!==keys.length)hold("DUPLICATE_PERMIT");
   // Bounded serial read preserves reader isolation; the existing native
   // publication rechecks the fresh clock and exact set before signing.
   const wires=new Map<string,Phase7SignedPreFieldProofWire>();
   for(let i=0;i<permits.length;i++)wires.set(keys[i],await one(permits[i]));
   return wires;
  }
 });
}
