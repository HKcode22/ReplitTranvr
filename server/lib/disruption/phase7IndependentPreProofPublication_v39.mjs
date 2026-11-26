/** Exact private permit handoff, never a proof signer or legal review.
 * A commissioned independent port must return genuine signed evidence. */
import {parsePhase7ProtectedPrePolicy} from "./phase7ProtectedPreResolver_v39.ts";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39.ts";
import {verifyPhase7SignedPreFieldProof} from "./phase7SignedPreFieldProof_v39.ts";
import {prepareP5ConditionalPrePermitPageFromSignedReviews,buildP5ConditionalPreProofPage,completeP5ConditionalPreProofPage} from "./phase5ConditionalPrePermitPreparation_v39.ts";
const hold=s=>{throw Error("HOLD_P7_PRE_PROOF_PUBLICATION_"+s);};
export async function resolveP7PublicationProofs({preview,env,port,readClock,forbiddenSignerFingerprints=[]}){
 const list=preview?.privateCompletedPackets;
 if(preview?.phase7ProofPreviewOnly!==true||preview.signatureIssued===true||preview.providerCalls!==0||preview.databaseWrites!==0||
    Object.getOwnPropertyDescriptor(preview,"privateCompletedPackets")?.enumerable!==false||!Array.isArray(list)||list.length<1||list.length>96||
    typeof port?.readExactPermitProofs!=="function"||typeof readClock!=="function")hold("PRIVATE_PREVIEW_OR_INDEPENDENT_PORT");
 const policy=parsePhase7ProtectedPrePolicy(env);
 if(forbiddenSignerFingerprints.includes(env.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256))hold("SIGNER_ALIAS");
 const permits=list.map(x=>x.completed.packet.prePermit),keys=permits.map(hashPhase7DurableCandidate);
 if(new Set(keys).size!==keys.length)hold("DUPLICATE_PERMIT");
 const wires=await port.readExactPermitProofs(Object.freeze(permits.map(p=>Object.freeze(structuredClone(p)))));
 if(!(wires instanceof Map)||wires.size!==keys.length||keys.some(k=>!wires.has(k)))hold("EXACT_PROOF_SET_MISSING");
 const at=await readClock(),now=Date.parse(at);
 if(!Number.isFinite(now)||new Date(now).toISOString()!==at)hold("DATABASE_CLOCK");
 for(let i=0;i<permits.length;i++){
  const p=permits[i],proof=verifyPhase7SignedPreFieldProof(env,p,policy.reviewSha256,policy.dispositions,wires.get(keys[i]));
  const cutoff=Date.parse(p.selectedTNativeUtc)-({"T-24h":86400000,"T-6h":21600000,"T-90m":5400000}[p.horizon]);
  if(Date.parse(proof.issuedAtUtc)>now||Date.parse(proof.validUntilUtc)<=now||cutoff<=now+900000)hold("STALE_OR_LATE_PROOF");
 }
 return {phase7ProofRequired:true,phase7ProtectedEnv:env,phase7IndependentProofsByPermitSha256:wires};
}

/** Actual conditional review ingress -> original independent proof port ->
 * proof-attached private page. Runtime must supply protected scope/pins from
 * authenticated SOURCE and owner policy. No signer or publication authority. */
export async function resolveP7ConditionalPublicationPage({pool,scope,requestedFlightIds,reviewWire,reviewAuthority,env,port,readClock,forbiddenSignerFingerprints=[]}){
 const protectedEnv=Object.freeze({...env});
 const policy=parsePhase7ProtectedPrePolicy(protectedEnv);
 const proofFp=protectedEnv.P6_PHASE7_PRE_PROOF_REVIEWER_FINGERPRINT_SHA256;
 if(!/^[a-f0-9]{64}$/.test(proofFp??"")||!reviewAuthority||
    !Array.isArray(reviewAuthority.forbiddenSignerFingerprints)||!Array.isArray(forbiddenSignerFingerprints)||
    proofFp===reviewAuthority.expectedReviewerFingerprintSha256||
    forbiddenSignerFingerprints.includes(proofFp)||
    forbiddenSignerFingerprints.includes(reviewAuthority.expectedReviewerFingerprintSha256)||
    protectedEnv.V39_P5_MANIFEST_SHA256!==scope?.source?.manifestSha256||
    protectedEnv.V39_P5_RIGHTS_SHA256!==scope?.source?.rightsReviewSha256||
    typeof port?.readExactPermitProofs!=="function"||typeof readClock!=="function")hold("CONDITIONAL_PROTECTED_SCOPE_OR_SIGNER_ALIAS");
 const authority={...reviewAuthority,forbiddenSignerFingerprints:[
  ...new Set([...reviewAuthority.forbiddenSignerFingerprints,...forbiddenSignerFingerprints,proofFp])]};
 const prepared=await prepareP5ConditionalPrePermitPageFromSignedReviews(pool,scope,requestedFlightIds,reviewWire,authority);
 const preview=buildP5ConditionalPreProofPage(prepared.privatePrepared);
 const proofs=await resolveP7PublicationProofs({preview,env:protectedEnv,port,readClock,
  forbiddenSignerFingerprints:[...forbiddenSignerFingerprints,authority.expectedReviewerFingerprintSha256]});
 const done=completeP5ConditionalPreProofPage(preview,protectedEnv,policy.reviewSha256,policy.dispositions,proofs.phase7IndependentProofsByPermitSha256);
 return Object.freeze(Object.defineProperties({...done},{privateAttachedPackets:{value:done.privateAttachedPackets,enumerable:false},privateSourceExpiresAtUtc:{value:prepared.privateSourceExpiresAtUtc,enumerable:false}}));
}
