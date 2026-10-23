/**
 * Gate4 ZERO-PROVIDER read-only public health diagnostic.
 * Only GETs an explicit, pinned Replit published runtime health endpoint.
 * Does NOT call AeroDataBox, query SQL, test a secret callback URL, POST
 * synthetic webhook payloads, activate alerts, or authorize spending.
 *
 * Usage: node --import tsx scripts/v39_gate4_alert_route_readonly_v39.ts
 *   --published-head <40-hex>
 */
import {pathToFileURL} from "node:url";
import {assessGate4AlertRouteReadinessV39} from
  "../server/lib/disruption/gate4AlertRouteReadiness_v39";

const HOST="https://replit-tranvr--hk84164.replit.app/__v39/workspace-runtime";
export function gate4ReadOnlyHealthArgsV39(argv:readonly string[]):string{
  if(argv.length!==2||argv[0]!=="--published-head"||
    !/^[a-f0-9]{40}$/.test(argv[1]))
    throw Error("GATE4_ALERT_READONLY_USAGE_HOLD");
  return argv[1];
}
export async function runGate4AlertRouteReadOnlyV39(
  argv:readonly string[]=process.argv.slice(2),
  getHealth:()=>Promise<unknown>=async()=>{
    const response=await fetch(HOST,{
      method:"GET",headers:{accept:"application/json"},
      redirect:"manual",signal:AbortSignal.timeout(12000)
    });
    if(response.status!==200)
      throw Error("PUBLISHED_HEALTH_HTTP_NOT_200");
    return response.json();
  }
):Promise<number>{
  let expected:string;
  try{expected=gate4ReadOnlyHealthArgsV39(argv);}
  catch{
    console.log(JSON.stringify({
      schema:"v39.gate4.alert-route-readiness.v1",
      status:"HOLD",reason:"ARGUMENTS_INVALID",
      callbackDeliveryAndAckProven:false,liveGate4Certified:false,
      paidAuthorization:false,providerRequests:0,databaseWrites:0
    }));
    return 2;
  }
  let health:unknown;
  try{health=await getHealth();}
  catch{
    console.log(JSON.stringify({
      schema:"v39.gate4.alert-route-readiness.v1",
      status:"HOLD",reason:"PUBLISHED_HEALTH_GET_FAILED_OR_UNAVAILABLE",
      callbackDeliveryAndAckProven:false,liveGate4Certified:false,
      paidAuthorization:false,providerRequests:0,databaseWrites:0
    }));
    return 2;
  }
  const result=assessGate4AlertRouteReadinessV39(health,expected);
  console.log(JSON.stringify(result,null,2));
  // Even a declared route is not a real callback delivery+ACK certificate.
  return result.status==="ROUTE_DECLARED_NOT_LIVE_PROVEN"?0:2;
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
  runGate4AlertRouteReadOnlyV39().then(code=>{process.exitCode=code})
    .catch(()=>{console.error("GATE4_ALERT_READONLY_UNHANDLED_HOLD");process.exitCode=2});
}
