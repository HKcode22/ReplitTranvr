/**
 * Gate4 offline diagnostic — never claims a synthetic arithmetic
 * simulation establishes actual provider safety or a completed live gate.
 */
import { runGate4OfflineTest } from "../server/lib/disruption/gates_v3";
import {assessGate4SpendV39} from
  "../server/lib/disruption/gate4SendAwareDecision_v39";
export async function runGate4Owner():Promise<number> {
  const simulation=runGate4OfflineTest();
  const before=assessGate4SpendV39({
    cap:100,softStopMargin:10,unsettledBurstReserve:10,
    openingBalance:500,currentBalance:411,
    receivedItemUnits:89,deliveryFailures:0
  });
  const threshold=assessGate4SpendV39({
    cap:100,softStopMargin:10,unsettledBurstReserve:10,
    openingBalance:500,currentBalance:410,
    receivedItemUnits:90,deliveryFailures:0
  });
  const ready=simulation.passed&&before.action==="CONTINUE"&&
    threshold.action==="STOP";
  console.log(JSON.stringify({
    schema:"v39.gate4-evidence.v2",
    status:ready?"OFFLINE_ONLY_NOT_LIVE_CERTIFIED":"OFFLINE_TEST_FAILED",
    simulation,policy:{before,threshold},
    paidCalls:0,formalGate4Passed:false,
    verifiedRealSendOvershootBound:false,
    verifiedRealSecondStart:false
  }));
  return ready?0:1;
}
if(import.meta.url==="file://"+process.argv[1]){
  runGate4Owner().then(code=>{process.exitCode=code}).catch(error=>{
    console.error(JSON.stringify({
      status:"OFFLINE_TEST_FAILED",formalGate4Passed:false,
      error:error?.message??String(error)
    }));
    process.exitCode=1;
  });
}
