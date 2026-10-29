/**
 * Gate05 WSSS one-off FREE public ADS-B source availability research probe.
 * ONE HTTP GET, no retries, keys, paid AeroDataBox, DB, blob, scheduler,
 * local output files, aircraft hex/callsigns/coordinates printed.
 * One snapshot is NOT evidence of reliable production coverage.
 */
import {normalizeGate05AdsbLolOfflineV39,gate05AdsbAggregateOnlyV39}
 from "../server/lib/disruption/gate05ZeroCostAdsbEvidence_v39.ts";

const URL="https://api.adsb.lol/v2/point/1.359211/103.989325/60";
const fail=(code:string):never=>{throw Error("GATE05_FREE_ADSB_ONE_GET_"+code);};
async function main(){
 if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.GITHUB_REF!=="refs/heads/main"||
    process.env.GITHUB_EVENT_NAME!=="push"||
    process.env.GITHUB_RUN_ATTEMPT!=="1")
  fail("REVIEWED_ONE_SHOT_GITHUB_MAIN_ONLY");
 const res=await fetch(URL,{
   method:"GET",redirect:"error",headers:{accept:"application/json"},
   signal:AbortSignal.timeout(12000)
 });
 if(res.status!==200)fail("UPSTREAM_HTTP_NON_200");
 const size=res.headers.get("content-length");
 if(size!==null&&Number(size)>8000000)fail("UNEXPECTED_RESPONSE_SIZE");
 const body=await res.text();
 if(body.length>8000000)fail("UNEXPECTED_RESPONSE_BODY_TOO_BIG");
 let parsed:unknown;
 try{parsed=JSON.parse(body);}catch{fail("INVALID_JSON");}
 // Response received time is separately recorded; provider last-seen must
 // never be treated as the time our PRE model had source available.
 const receivedAtUtc=new Date().toISOString();
 const data=normalizeGate05AdsbLolOfflineV39(parsed,receivedAtUtc);
 const summary=gate05AdsbAggregateOnlyV39(data);
 console.log(JSON.stringify({
  schema:"v39.gate05.wsss-adsblol-single-free-get-research.v1",
  status:"ONE_FREE_PUBLIC_ADSB_SNAPSHOT_INSPECTED_NOT_PRODUCTION_APPROVED",
  airport:"WSSS",
  radiusNm:60,
  sampleAvailableAtUtc:receivedAtUtc,
  ...summary,
  protocolAdsbSourceTermReviewStillRequired:true,
  oneSnapshotCannotEstablishDailyCoverageOrFlightMatches:true,
  providerSourcePermissionForLongRunNotGranted:true,
  originalGate05SciencePassed:false,
  noPaidProviderRequests:true,noRepeatedPolling:true,
  noDatabaseWrites:true,noRawResponsesPrinted:true
 }));
}
void main().catch(e=>{
 console.log(JSON.stringify({
  schema:"v39.gate05.wsss-adsblol-single-free-get-research.v1",
  status:"FREE_RESEARCH_SOURCE_UNAVAILABLE_OR_SHAPE_HOLD",
  reason:e instanceof Error?e.message:"UNKNOWN",
  oneRequestAtMost:true,noPaidProviderRequests:true,
  originalGate05SciencePassed:false
 }));
 process.exitCode=2;
});
