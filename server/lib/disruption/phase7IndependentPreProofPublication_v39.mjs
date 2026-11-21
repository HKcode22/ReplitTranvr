/** Exact private permit handoff, never a proof signer or legal review.
 * A commissioned independent port must return genuine signed evidence. */
import {parsePhase7ProtectedPrePolicy} from "./phase7ProtectedPreResolver_v39.ts";
import {hashPhase7DurableCandidate} from "./phase7DurableDerivedBundleCandidate_v39.ts";
import {verifyPhase7SignedPreFieldProof} from "./phase7SignedPreFieldProof_v39.ts";
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
