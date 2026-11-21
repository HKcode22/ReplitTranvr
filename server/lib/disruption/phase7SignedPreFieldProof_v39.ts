/** Independent PRE field proof, carried only inside the already-private
 * signed roster packet and expiring with that packet. No signing key is
 * available to the PRE worker. A proof is not produced by hashing a field:
 * the independent reviewer must authenticate its lawful separate lane.
 */
import {createHash,createPublicKey,verify} from "node:crypto";
import {P5_E_ALLOWED_PRE_FEATURES,type P5EPreField} from "./phase5AmendmentEAsOfFeatureSelectionOffline_v39";
import type {PreFeatureInput} from "./preSnapshotBuilder_v3";
import type {P5Stage14SingleFlightPrePermit} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39";
import type {Phase7CanonicalFieldDisposition} from "./phase7CanonicalFieldParity_v39";
const H=/^[a-f0-9]{64}$/;
const digest=(x:unknown):x is string=>typeof x==="string"&&H.test(x)&&!/^([a-f0-9])\1{63}$/.test(x);
const hold=(s:string):never=>{throw Error("HOLD_P7_SIGNED_PRE_PROOF_"+s);};
const exact=(x:unknown,ks:string[]):boolean=>!!x&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const clock=(s:string)=>{const n=Date.parse(s);if(!Number.isFinite(n)||new Date(n).toISOString()!==s)hold("CLOCK");return n;};
const decode=(s:unknown,max:number):Buffer=>{
 if(typeof s!=="string"||s.length<4||s.length>Math.ceil(max/3)*4||!(/^[A-Za-z0-9+/]+={0,2}$/).test(s))return hold("BASE64");
 const b=Buffer.from(s,"base64");if(b.length>max||b.toString("base64")!==s)hold("BASE64");return b;
};
export interface Phase7SignedPreFieldProofWire{
 payloadBase64:string;
 signatureBase64:string;
}
interface FieldProof{field:P5EPreField;selectedFeatureSha256:string;independentEvidenceSha256:string}
export interface Phase7VerifiedPreFieldProof{
 schema:"v39.phase7.separate-pre-field-proof.v1";
 manifestSha256:string;rightsSha256:string;policySha256:string;permitSha256:string;
 issuedAtUtc:string;validUntilUtc:string;fields:readonly FieldProof[];
}
/** Exact signed PRE proof shape, checked before private mailbox storage.
 * Only canonical field names and digests are permitted; a signed extra
 * source value is not a field proof. This is not independent evidence or
 * field-policy approval. The consumer still binds the permit and policy. */
export function assertPhase7PreProofMetadataShape(input:unknown): asserts input is Phase7VerifiedPreFieldProof {
 const x=input as Phase7VerifiedPreFieldProof;
 if(!exact(x,["schema","manifestSha256","rightsSha256","policySha256","permitSha256","issuedAtUtc","validUntilUtc","fields"])||
  x.schema!=="v39.phase7.separate-pre-field-proof.v1"||
  ![x.manifestSha256,x.rightsSha256,x.policySha256,x.permitSha256].every(digest)||
  !Array.isArray(x.fields)||x.fields.length>16)hold("METADATA_SHAPE");
 const fields=new Set<string>();
 for(const f of x.fields){
  if(!exact(f,["field","selectedFeatureSha256","independentEvidenceSha256"])||
   !P5_E_ALLOWED_PRE_FEATURES.includes(f.field)||fields.has(f.field)||
   !digest(f.selectedFeatureSha256)||!digest(f.independentEvidenceSha256))hold("METADATA_FIELD_SCOPE");
  fields.add(f.field);
 }
 const from=clock(x.issuedAtUtc),until=clock(x.validUntilUtc);
 if(from>=until||until-from>24*3600000)hold("METADATA_WINDOW");
}
export function phase7SelectedFeatureDigest(f:PreFeatureInput){
 if(!P5_E_ALLOWED_PRE_FEATURES.includes(f.featureName as P5EPreField)||
  f.value===null||f.value===undefined||!["string","number","boolean"].includes(typeof f.value)||
  (typeof f.value==="number"&&!Number.isFinite(f.value))||!(f.informationAvailableAt instanceof Date)||
  !Number.isFinite(f.informationAvailableAt.getTime())||!f.source||!f.sourceVersion)hold("FEATURE_SHAPE");
 return hashPhase7DurableCandidate({field:f.featureName,value:f.value,availableAtUtc:f.informationAvailableAt!.toISOString(),source:f.source,sourceVersion:f.sourceVersion});
}
export function verifyPhase7SignedPreFieldProof(env:NodeJS.ProcessEnv,p:P5Stage14SingleFlightPrePermit,policySha256:string,dispositions:readonly Phase7CanonicalFieldDisposition[],wire:unknown):Phase7VerifiedPreFieldProof{
 if(!exact(wire,["payloadBase64","signatureBase64"])||!digest(policySha256)||policySha256!==env.P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256||
  !digest(env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256)||!env.P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64)
  return hold("PROTECTED_TRUST");
 const w=wire as Phase7SignedPreFieldProofWire,bytes=decode(w.payloadBase64,16384),sig=decode(w.signatureBase64,64);
 const pem=decode(env.P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64,4096).toString("utf8");
 if(!pem.startsWith("-----BEGIN PUBLIC KEY-----"))hold("PUBLIC_KEY_ONLY");
 const key=createPublicKey(pem);
 if(key.asymmetricKeyType!=="ed25519"||createHash("sha256").update(key.export({type:"spki",format:"der"})).digest("hex")!==env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256||
  sig.length!==64||!verify(null,bytes,key,sig))hold("SIGNATURE");
 const x=JSON.parse(bytes.toString("utf8")) as Phase7VerifiedPreFieldProof;
 if(!exact(x,["schema","manifestSha256","rightsSha256","policySha256","permitSha256","issuedAtUtc","validUntilUtc","fields"])||
  x.schema!=="v39.phase7.separate-pre-field-proof.v1"||x.manifestSha256!==p.manifestSha256||
  x.rightsSha256!==p.expectedReviewedSourceRightsSha256||x.policySha256!==policySha256||
  x.permitSha256!==hashPhase7DurableCandidate(p)||!Array.isArray(x.fields)||x.fields.length>16||
  new Set(x.fields.map(f=>f.field)).size!==x.fields.length)hold("EXACT_PERMIT");
 const from=clock(x.issuedAtUtc),until=clock(x.validUntilUtc);
 const cutoff=clock(p.selectedTNativeUtc)-({"T-24h":86400000,"T-6h":21600000,"T-90m":5400000}[p.horizon]);
 if(!Number.isFinite(cutoff)||from>=until||until>cutoff||until-from>24*3600000)hold("PROSPECTIVE_WINDOW");
 for(const f of x.fields)if(!exact(f,["field","selectedFeatureSha256","independentEvidenceSha256"])||
  !digest(f.selectedFeatureSha256)||!digest(f.independentEvidenceSha256)||
  !dispositions.some(d=>d.field===f.field&&["INDEPENDENT_SOURCE_EXACT_LANE","PURPOSE_BOUND_REFERENCE_LANE"].includes(d.disposition)))hold("FIELD_SCOPE");
 return Object.freeze({...x,fields:Object.freeze(x.fields.map(f=>Object.freeze({...f})))});
}
/** Rebind the signed proof to the actual Stage14 selected values and DB issue
 * clock inside the transaction. Never accept an unrelated earlier field hash. */
export function verifyPhase7SelectedFieldProofs(proof:Phase7VerifiedPreFieldProof,features:readonly PreFeatureInput[],issuedAtUtc:string,sourceExpiryUtc:string){
 const t=clock(issuedAtUtc),from=clock(proof.issuedAtUtc),until=clock(proof.validUntilUtc),expiry=clock(sourceExpiryUtc);
 if(t<from||t>=until||until>expiry)hold("PROOF_WINDOW");
 for(const f of proof.fields){
  const matches=features.filter(x=>x.featureName===f.field);
  if(matches.length!==1||phase7SelectedFeatureDigest(matches[0])!==f.selectedFeatureSha256||
   matches[0].informationAvailableAt!.getTime()>from)hold("SELECTED_VALUE_DRIFT");
 }
 return proof.fields.map(f=>f.field);
}

/** Attach actual independent wire to the completed UNSIGNED exact permit
 * before the existing roster/registry signature. This does not produce
 * evidence or alter the permit. Keep private payload fields nonenumerable
 * in the completion receipt; the wire is carried inside exact packet bytes. */
export function attachPhase7SignedProofBeforeRoster<T extends {packet:{prePermit:P5Stage14SingleFlightPrePermit};packetBytes:Buffer;packetSha256:string}>(
 completed:T,env:NodeJS.ProcessEnv,policySha256:string,dispositions:readonly Phase7CanonicalFieldDisposition[],wire:unknown
):T{
 if(!completed||!Buffer.isBuffer(completed.packetBytes)||completed.packetBytes.length>200000||
  createHash("sha256").update(completed.packetBytes).digest("hex")!==completed.packetSha256||
  !Buffer.from(JSON.stringify(completed.packet),"utf8").equals(completed.packetBytes)||
  Object.hasOwn(completed.packet,"phase7FieldProof"))hold("UNSIGNED_COMPLETION_BYTES");
 verifyPhase7SignedPreFieldProof(env,completed.packet.prePermit,policySha256,dispositions,wire);
 const packet={...completed.packet,phase7FieldProof:wire};
 const bytes=Buffer.from(JSON.stringify(packet),"utf8");
 if(bytes.length>200000)hold("PACKET_BOUND");
 const out={...completed,packetSha256:createHash("sha256").update(bytes).digest("hex")};
 Object.defineProperties(out,{
  packet:{value:packet,enumerable:false,writable:false,configurable:false},
  packetBytes:{value:bytes,enumerable:false,writable:false,configurable:false}
 });
 return Object.freeze(out) as T;
}
