/** Private post-capture boundary. No provider action, no authorization creation.
 * The real commissioned consumer must authenticate independent review and
 * perform scoped durable writes/readback; an unconfigured CLI holds pre-spend.
 */
import type {P5ReviewedFuturePostOneGet} from "./phase5V0083FuturePostOriginalDb_v39";
import type {P6PostCommittedScope,auditP6ActualPostOutcomeObservability} from "./phase6ActualPostOutcomeObservability_v39";
export type Phase7PostAudit=ReturnType<typeof auditP6ActualPostOutcomeObservability>;
export interface Phase7PostConsumer{
 readonly policySha256:string;
 preflight(p:Readonly<P5ReviewedFuturePostOneGet>):Promise<void>;
 preserveCommitted(scope:Readonly<P6PostCommittedScope>,audit:Phase7PostAudit):Promise<{
  independentlyReadBack:true;sourceMappingPersisted:false;providerCalls:0;
  verifiedGroupCount:number;heldGroupCount:number;excludedAmbiguousGroupCount:number;accountedRetainedFlightCount:number;
 }>;
}
const hold=(s:string):never=>{throw Error("HOLD_P7_POST_PRESERVATION_"+s);};
export function requirePhase7PostConsumer(env:NodeJS.ProcessEnv,c?:Phase7PostConsumer):Phase7PostConsumer{
 if(!c||!(/^[a-f0-9]{64}$/).test(c.policySha256)||/^([a-f0-9])\1{63}$/.test(c.policySha256)||
  c.policySha256!==env.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256||
  typeof c.preflight!=="function"||typeof c.preserveCommitted!=="function")return hold("UNCOMMISSIONED");
 return c;
}
/** Only the read-only committed source audit may classify scientifically
 * ambiguous groups. An absent proof, failed write or unknown commit is NOT
 * an ambiguity exclusion. The complete retained denominator stays visible. */
export function phase7AuditedPreservationGroups(a:Phase7PostAudit){
 if(!Array.isArray(a.privateAmbiguousPreservationFlightIds)||Object.getOwnPropertyDescriptor(a,"privateAmbiguousPreservationFlightIds")?.enumerable!==false||
  !Array.isArray(a.privatePreservationAnchors)||!Number.isSafeInteger(a.uniqueRetainedPreFlights)||a.uniqueRetainedPreFlights<0)hold("PRIVATE_GROUP_CLASSIFICATION");
 const excluded=new Set(a.privateAmbiguousPreservationFlightIds),eligible=new Map<string,typeof a.privatePreservationAnchors[number][]>();
 if(excluded.size!==a.privateAmbiguousPreservationFlightIds.length||[...excluded].some(k=>typeof k!=="string"||!k))hold("AMBIGUITY_DENOMINATOR");
 for(const h of a.privatePreservationAnchors){
  if(!h.flightInstanceId||h.ambiguousIdentity!==excluded.has(h.flightInstanceId))hold("AMBIGUITY_ANCHOR_DRIFT");
  if(excluded.has(h.flightInstanceId))continue;
  const rows=eligible.get(h.flightInstanceId)??[];rows.push(h);eligible.set(h.flightInstanceId,rows);
 }
 if(eligible.size+excluded.size!==a.uniqueRetainedPreFlights)hold("GROUP_DENOMINATOR");
 return {eligible,excluded};
}
export async function consumeCommittedPhase7Post(c:Phase7PostConsumer,s:Readonly<P6PostCommittedScope>,a:Phase7PostAudit){
 if(!Array.isArray(a.privatePreservationAnchors)||!Array.isArray(a.privateDecisions)||
  Object.getOwnPropertyDescriptor(a,"privatePreservationAnchors")?.enumerable!==false||
  Object.getOwnPropertyDescriptor(a,"privateDecisions")?.enumerable!==false||
  a.privatePreservationAnchors.some(x=>x.manifestSha256!==s.packet.manifestSha256||x.rightsSha256!==s.packet.reviewedSourceRightsSha256||
   x.runDayIndex!==s.packet.runDayIndex||x.airportIcao!==s.packet.airportIcao||x.frameSha256!==s.packet.reviewedFrameSha256))
  hold("PRIVATE_HANDOFF_DRIFT");
 const groups=phase7AuditedPreservationGroups(a);
 const receipt=await c.preserveCommitted(s,a);
 if(!receipt||receipt.independentlyReadBack!==true||receipt.sourceMappingPersisted!==false||receipt.providerCalls!==0||
  ![receipt.verifiedGroupCount,receipt.heldGroupCount,receipt.excludedAmbiguousGroupCount,receipt.accountedRetainedFlightCount].every(n=>Number.isSafeInteger(n)&&n>=0)||
  receipt.accountedRetainedFlightCount!==a.uniqueRetainedPreFlights||
  receipt.excludedAmbiguousGroupCount!==groups.excluded.size||receipt.verifiedGroupCount!==groups.eligible.size||
  receipt.verifiedGroupCount+receipt.heldGroupCount+receipt.excludedAmbiguousGroupCount!==receipt.accountedRetainedFlightCount||
  receipt.heldGroupCount!==0)hold("INCOMPLETE_DURABLE_READBACK_NO_REPLAY");
 // Allow-list the public receipt; never trust an arbitrary object spread.
 return {independentlyReadBack:true as const,sourceMappingPersisted:false as const,providerCalls:0 as const,
  verifiedGroupCount:receipt.verifiedGroupCount,excludedAmbiguousGroupCount:receipt.excludedAmbiguousGroupCount,
  accountedRetainedFlightCount:receipt.accountedRetainedFlightCount};
}
