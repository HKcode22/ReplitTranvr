/**
 * Gate4 GitHub Actions long-running-job proof-of-pattern: NO PROVIDER.
 * Exercises the exact-ID WATCH/STOP decision through multiple 5-second
 * in-job ticks (no cron). This source is not the live provider STOP worker.
 * Never imports the AeroDataBox transport or production DB.
 */
import {pathToFileURL} from "node:url";
import {decideGate4ActionsTickV39} from
  "../server/lib/disruption/gate4ActionsWatchdogPolicy_v39";
const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export async function runGate4ActionsRehearsalV39(
  waitImpl:(ms:number)=>Promise<void>=wait,
  emit:(msg:Record<string,unknown>)=>void=msg=>console.log(JSON.stringify(msg))
){
  const start=Date.parse("2026-10-22T20:00:00.000Z");
  const x={
    scopeId:"11111111-2222-3333-4444-555555555555",
    sourceCommit:"a".repeat(40),authorizationSha256:"b".repeat(64),
    airportIcao:"WSSS",startUtc:new Date(start).toISOString(),
    stopUtc:new Date(start+20_000).toISOString(),
    observedStartingCredits:2037,softCreditTarget:20,
    protectedCreditFloor:1000
  };
  let seenStop=false;
  for(const seconds of [0,5,10,15,20]){
    const owner=seconds===0?null:"syntheticOwnerID99";
    const list=owner===null?[]:[{
      id:owner,isActive:true,billingType:"CreditBased" as const,
      subject:{type:"FlightByAirportIcao",id:"WSSS"}
    }];
    const tick=decideGate4ActionsTickV39(
      x,new Date(start+seconds*1000).toISOString(),2037,list,owner
    );
    emit({status:tick.action,reason:tick.reason,
      synthetic:true,providerRequests:0,providerMutations:0,
      guaranteesHardCreditCap:false});
    if(seconds===20){
      if(tick.action!=="STOP_EXACT_OWNED"||
        tick.exactOwnedId!=="syntheticOwnerID99")
        throw Error("GATE4_ACTIONS_INJOB_STOP_TICK_MISSING");
      seenStop=true;
    }else if(tick.action!=="WATCH")
      throw Error("GATE4_ACTIONS_INJOB_EARLY_UNEXPECTED_STOP");
    if(seconds<20)await waitImpl(5_000);
  }
  if(!seenStop)throw Error("GATE4_ACTIONS_NO_STOP_SIGNAL");
  return {status:"GATE4_ACTIONS_IN_JOB_SYNTHETIC_PASS",
    ticks:5,providerRequests:0,providerMutations:0,
    liveStopArmed:false} as const;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  runGate4ActionsRehearsalV39()
    .then(out=>console.log(JSON.stringify(out)))
    .catch(()=>{
      console.error("GATE4_ACTIONS_IN_JOB_REHEARSAL_HOLD");
      process.exitCode=2;
    });
}
