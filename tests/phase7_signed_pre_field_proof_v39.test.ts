import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {attachPhase7SignedProofBeforeRoster,phase7SelectedFeatureDigest,verifyPhase7SignedPreFieldProof,verifyPhase7SelectedFieldProofs} from "../server/lib/disruption/phase7SignedPreFieldProof_v39";
import {hashPhase7DurableCandidate} from "../server/lib/disruption/phase7DurableDerivedBundleCandidate_v39";
import type {P5Stage14SingleFlightPrePermit} from "../server/lib/disruption/phase5V0079SingleBoundFlightPreWriter_v39";
import type {Phase7CanonicalFieldDisposition} from "../server/lib/disruption/phase7CanonicalFieldParity_v39";
const h=(s:string)=>createHash("sha256").update(s).digest("hex");
function fixture(){
 const p={manifestSha256:h("manifest"),expectedReviewedSourceRightsSha256:h("rights"),horizon:"T-6h",selectedTNativeUtc:"2027-01-02T12:00:00.000Z"} as P5Stage14SingleFlightPrePermit;
 const policy=h("policy"),{privateKey,publicKey}=generateKeyPairSync("ed25519");
 const env={P6_PHASE7_PRE_PRESERVATION_POLICY_SHA256:policy,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:h2(publicKey.export({type:"spki",format:"der"})),
 P6_PHASE7_PRE_PROOF_REVIEWER_PUBLIC_KEY_BASE64:Buffer.from(publicKey.export({type:"spki",format:"pem"})).toString("base64")};
 const feature={featureName:"origin_icao",value:"WSSS",source:"AERODATABOX_FIDS",sourceVersion:"synthetic",informationAvailableAt:new Date("2027-01-02T05:00:00.000Z")};
 const dispositions:Phase7CanonicalFieldDisposition[]=[{field:"origin_icao",disposition:"PURPOSE_BOUND_REFERENCE_LANE",outputField:null,reviewSha256:h("rights scope")}];
 const proof={schema:"v39.phase7.separate-pre-field-proof.v1",manifestSha256:p.manifestSha256,rightsSha256:p.expectedReviewedSourceRightsSha256,policySha256:policy,permitSha256:hashPhase7DurableCandidate(p),issuedAtUtc:"2027-01-02T05:15:00.000Z",validUntilUtc:"2027-01-02T06:00:00.000Z",fields:[{field:"origin_icao",selectedFeatureSha256:phase7SelectedFeatureDigest(feature),independentEvidenceSha256:h("independent fixture")} ]};
 const wire=(x:unknown)=>{const b=Buffer.from(JSON.stringify(x));return {payloadBase64:b.toString("base64"),signatureBase64:sign(null,b,privateKey).toString("base64")}};
 return {p,policy,env,feature,dispositions,proof,wire};
}
function h2(b:Buffer){return createHash("sha256").update(b).digest("hex")}
describe("signed exact PRE separate-lane field proof",()=>{
 it("binds private proof to signer, permit, selected values and actual DB clock",()=>{
  const f=fixture(),v=verifyPhase7SignedPreFieldProof(f.env,f.p,f.policy,f.dispositions,f.wire(f.proof));
  expect(verifyPhase7SelectedFieldProofs(v,[f.feature],"2027-01-02T05:59:00.000Z","2027-01-02T09:00:00.000Z")).toEqual(["origin_icao"]);
  expect(()=>verifyPhase7SelectedFieldProofs(v,[{...f.feature,value:"YSSY"}],"2027-01-02T05:59:00.000Z","2027-01-02T09:00:00.000Z")).toThrow("SELECTED_VALUE_DRIFT");
  expect(()=>verifyPhase7SelectedFieldProofs(v,[f.feature],"2027-01-02T06:00:00.000Z","2027-01-02T09:00:00.000Z")).toThrow("PROOF_WINDOW");
 });
 it("attaches only genuine exact proof bytes before roster signing, without public receipt leakage",()=>{
  const f=fixture(),packet={schema:"synthetic",prePermit:f.p};
  const packetBytes=Buffer.from(JSON.stringify(packet)),packetSha256=h2(packetBytes),p={packet,packetBytes,packetSha256};
  const wire=f.wire(f.proof),out=attachPhase7SignedProofBeforeRoster(p,f.env,f.policy,f.dispositions,wire);
  expect(out.packetSha256).not.toBe(packetSha256);
  expect(out.packetSha256).toBe(h2(out.packetBytes));
  expect(JSON.parse(out.packetBytes.toString("utf8"))).toEqual({...packet,phase7FieldProof:wire});
  expect(out.packet.prePermit).toEqual(f.p);
  expect(JSON.stringify(out)).not.toContain("payloadBase64");
  expect(()=>attachPhase7SignedProofBeforeRoster({...p,packetBytes:Buffer.from("tampered")},f.env,f.policy,f.dispositions,wire)).toThrow("UNSIGNED_COMPLETION_BYTES");
  expect(()=>attachPhase7SignedProofBeforeRoster(p,f.env,f.policy,f.dispositions,{})).toThrow("PROTECTED_TRUST");
 });
 it("refuses wrong signer, permit, unsigned field and proof beyond cutoff",()=>{
  const f=fixture(),w=f.wire(f.proof);
  expect(()=>verifyPhase7SignedPreFieldProof({...f.env,P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256:h("wrong")},f.p,f.policy,f.dispositions,w)).toThrow("SIGNATURE");
  expect(()=>verifyPhase7SignedPreFieldProof(f.env,{...f.p,selectedTNativeUtc:"2027-01-02T13:00:00.000Z"},f.policy,f.dispositions,w)).toThrow("EXACT_PERMIT");
  expect(()=>verifyPhase7SignedPreFieldProof(f.env,f.p,f.policy,[],w)).toThrow("FIELD_SCOPE");
  expect(()=>verifyPhase7SignedPreFieldProof(f.env,f.p,f.policy,f.dispositions,f.wire({...f.proof,validUntilUtc:"2027-01-02T06:00:00.001Z"}))).toThrow("PROSPECTIVE_WINDOW");
 });
});
