/**
 * Phase5 C+D NONPAID adapter contract: convert an ACKNOWLEDGED, independently
 * invoked existing Stage14 one-flight PRE result into the C parallel-runner
 * proof shape, after cross-checking immutable flight/horizon/native-T/cutoff.
 *
 * No new database writer, no new queue, no provider calls, no live deployment.
 * Caller MUST independently review SOURCE/rights, exact approved packet SHA,
 * and queue lease/fence/ownership. A pure object check is not authentication.
 */
import type {
  P5Stage14SingleFlightPrePermit,
  P5Stage14SingleFlightPreResult
} from "./phase5V0079SingleBoundFlightPreWriter_v39";
import type {
  P5PreQueueCandidate,P5ExistingStage14Proof
} from "./phase5CPlusDParallelPreProofOfConcept_v39";

const SHA=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const OFFSET:Record<P5PreQueueCandidate["horizon"],number>={
  "T-24h":86_400_000,"T-6h":21_600_000,"T-90m":5_400_000
};
function clock(s:string):number{
  if(typeof s!=="string"||!ISO.test(s)||!Number.isFinite(Date.parse(s))||
    new Date(s).toISOString()!==s)
    throw Error("REFUSED_P5_CD_STAGE14_BRIDGE_INVALID_UTC");
  return Date.parse(s);
}
function hold(why:string):never{
  throw Error("REFUSED_P5_CD_STAGE14_BRIDGE_"+why);
}

/**
 * Call only AFTER the existing Stage14 function returned an acknowledged
 * post-COMMIT readback. This cannot settle an UNKNOWN_COMMIT exception.
 * Even a successful bridge output cannot prove queue ownership/fencing.
 */
export function reviewP5CPlusDExistingStage14ProofOffline(
  queued:P5PreQueueCandidate,
  permit:P5Stage14SingleFlightPrePermit,
  saved:P5Stage14SingleFlightPreResult
):P5ExistingStage14Proof{
  if(!queued||!permit||!saved||
    queued.handoffState!=="EXTERNALLY_REVIEWED_PENDING"||
    !SHA.test(queued.packetSha256??""))
    hold("QUEUE_OR_PACKET_NOT_REVIEWED");
  const expectedOffset=OFFSET[queued.horizon];
  if(!expectedOffset)hold("UNKNOWN_HORIZON");
  const selected=clock(queued.selectedNativeTUtc);
  const cutoff=clock(queued.ownCutoffUtc);
  if(selected-cutoff!==expectedOffset||
    permit.flightInstanceId!==queued.flightInstanceId||
    permit.horizon!==queued.horizon||
    permit.selectedTNativeUtc!==queued.selectedNativeTUtc||
    saved.horizon!==queued.horizon||
    saved.runDayIndex!==permit.runDayIndex||
    saved.slot!==permit.slot||
    saved.cutoffUtc!==queued.ownCutoffUtc||
    saved.boundPopulationQueryId!==permit.expectedSourcePopulationQueryId)
    hold("FLIGHT_HORIZON_T_OR_SOURCE_MISMATCH");
  if(saved.schema!=="v39.phase5.stage14.single-bound-flight-pre-writer.v1"||
    saved.status!=="ONE_SOURCE_BOUND_PROSPECTIVE_PRE_SAVED_NOT_SCIENTIFIC_FREEZE"||
    saved.preSnapshotsInserted!==1||
    saved.postCommitDatabaseReadbackVerified!==true||
    saved.flightPreCommittedBeforeOwnCutoff!==true||
    saved.sourceOriginalCommittedBeforeFlightCutoff!==true||
    !/^[1-9]\d{0,17}$/.test(saved.committedSnapshotId??"")||
    saved.providerCalls!==0||saved.alertCreates!==0||
    saved.phase5FreezePassed!==false||saved.phase6PaidGo!==false)
    hold("NO_ACKNOWLEDGED_STAGE14_COMMIT_PROOF");
  const witness=clock(saved.postCommitDbClockAtUtc);
  if(witness>=cutoff)hold("POST_COMMIT_PROOF_TOO_LATE");
  return {
    flightInstanceId:queued.flightInstanceId,
    horizon:queued.horizon,
    packetSha256:queued.packetSha256,
    postCommitDatabaseReadbackVerified:true,
    preSnapshotsInserted:1
  };
}
