/** NEXT4 independent public GET-only monitor. No AeroDataBox credentials/calls. */
import {pathToFileURL} from "node:url";
const SOURCE="1885703c04ba8f24bf8d1183f873eb86d1f83d7c";
const URL="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
const snooze=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export async function observeNext4PublicV39(stopUtc:string):Promise<void>{
 const stop=Date.parse(stopUtc),now=Date.now();
 if(!Number.isFinite(stop)||stop<=now+30_000||stop>now+60*60_000)
  throw Error("NEXT4_HEALTH_WINDOW_HOLD");
 let good=0,missed=0;
 while(Date.now()<stop){
  let ok=false;
  try{
   const res=await fetch(URL,{method:"GET",redirect:"error",
    signal:AbortSignal.timeout(7000)});
   if(res.status===200){
    const j=await res.json() as Record<string,unknown>;
    ok=j.schema==="v39.phase2f-workspace-runtime.v1"&&
      j.status==="PASS"&&j.git_head===SOURCE&&
      j.published_deployment===true&&
      j.gate4_alert_ingress_registered===true&&
      j.provider_mutation===false;
   }
  }catch{}
  if(ok)good++;else missed++;
  // 6 primary + 6 backup is a monitoring cadence, NOT a guaranteed paid callback retry.
  if((good+missed)%6===0||!ok)
   console.log(JSON.stringify({status:ok?"NEXT4_HEALTH_GOOD":"NEXT4_HEALTH_HOLD",
    publicGetChecks:good+missed,passed:good,failed:missed,
    providerRequests:0,databaseWrites:0,providerCreates:0}));
  await snooze(Math.min(15_000,Math.max(0,stop-Date.now())));
 }
 console.log(JSON.stringify({status:"NEXT4_HEALTH_WINDOW_ENDED",passed:good,
  failed:missed,providerCreates:0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 observeNext4PublicV39(String(process.env.GATE4_NEXT4_HEALTH_STOP_UTC??""))
 .catch(()=>{console.error("NEXT4_HEALTH_OBSERVER_HOLD");process.exitCode=2;});
