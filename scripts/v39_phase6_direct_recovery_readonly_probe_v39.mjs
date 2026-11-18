/** Read-only hosted/direct-clock experiment. NO worker dispatch, provider,
 * DB credentials, signed-release assumptions or paid GO. Same eight route
 * paths and actual GitHub history endpoints used by the proposed scheduler.
 */
import {readFileSync} from "node:fs";
import {P6_ROLLING_ROUTES,readP6RollingGithubSnapshot} from "../server/lib/disruption/phase6RollingGithubController_v39.mjs";
const REPO="HKcode22/ReplitTranvr",ROOT="https://api.github.com/repos/"+REPO;
const hold=s=>{throw Error("HOLD_P6_DIRECT_VERIFY_"+s);},MIN=60000;
const e=process.env,mode=e.GITHUB_EVENT_NAME;
const isPr=mode==="pull_request",isMain=mode==="workflow_dispatch";
const confirm="VERIFY_DIRECT_RECOVERY_CLOCK_NO_PROVIDER_NO_DB_NO_DISPATCH";
const forbidden=["AERODATABOX_API_KEY","RAPIDAPI_KEY","AERODATABOX_WEBHOOK_SECRET","DATABASE_URL","V39_DATABASE_RUNTIME_URL","V39_P5_SOURCE_DATABASE_URL","P5_V39_PRE_DATABASE_URL","P5_V39_PREPARE_DATABASE_URL","P5_V39_T24_WITNESS_DATABASE_URL","P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL","P5_V39_OTHER_REST_REVIEW_DATABASE_URL","P5_V39_OTHER_REST_RESERVE_DATABASE_URL","P6_ROLLING_WINDOW_CUSTODY_DATABASE_URL"];
async function probe(){
 if(e.GITHUB_ACTIONS!=="true"||e.GITHUB_REPOSITORY!==REPO||e.GITHUB_RUN_ATTEMPT!=="1"||
    !(isPr&&/^refs\/pull\/[1-9]\d*\/merge$/.test(e.GITHUB_REF??"")||
      isMain&&e.GITHUB_REF==="refs/heads/main"&&e.P6_DIRECT_VERIFY_CONFIRM===confirm&&
       e.P6_DIRECT_VERIFY_APPROVED_MAIN===e.GITHUB_SHA&&e.P6_ROLLING_DIRECT_RECOVERY_ENABLED!=="1")||
    e.ADB_AUTO_COLLECT!=="0"||e.NODE_TLS_REJECT_UNAUTHORIZED==="0"||forbidden.some(k=>e[k])||
    typeof e.GITHUB_TOKEN!=="string"||e.GITHUB_TOKEN.length<16)hold("NO_READONLY_SCOPE");
 const start=Date.now(),epoch=Math.floor((start-90*MIN)/1000)*1000;
 const headers={Accept:"application/vnd.github+json",Authorization:"Bearer "+e.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"};
 let reads=0;
 const api=async(url,init)=>{
  const u=new URL(url);
  if(u.origin!=="https://api.github.com"||!u.pathname.startsWith("/repos/"+REPO+"/")||u.username||u.password||u.hash||
     init?.method!=="GET"||++reads>180||Date.now()-start>120000)hold("READ_BOUND_NO_POST");
  return fetch(url,{...init,redirect:"error",signal:AbortSignal.timeout(10000)});
 };
 const get=async path=>{
  const r=await api(ROOT+path,{method:"GET",headers});
  if(!r.ok)hold("GITHUB_HTTP_"+r.status);
  return r.json();
 };
 const sha=(await get("/git/ref/heads/main"))?.object?.sha;
 if(!/^[a-f0-9]{40}$/.test(sha??"")||isMain&&sha!==e.GITHUB_SHA)hold("MAIN_DRIFT");
 const direct=(await get("/actions/runs/"+e.GITHUB_RUN_ID));
 if(direct?.id!==Number(e.GITHUB_RUN_ID)||direct.head_sha!==e.GITHUB_SHA||direct.event!==mode||
    direct.path!==".github/workflows/phase6-direct-recovery-tick.yml"||direct.status!=="in_progress"||
    direct.run_attempt!==1||isMain&&direct.display_title!=="P6 DIRECT RECOVERY VERIFY")hold("ACTUAL_RUN_IDENTITY");
 const routeStates=[];
 for(const r of P6_ROLLING_ROUTES){
  const x=await get("/actions/workflows/"+r.workflow);
  if(x.path!==".github/workflows/"+r.workflow||x.state!=="active"||!Number.isSafeInteger(x.id))hold("EXISTING_WORKFLOW_NOT_ACTIVE");
  routeStates.push({lane:r.lane,workflow:r.workflow,state:x.state});
 }
 const counts=[],relevant=new Set(P6_ROLLING_ROUTES.map(r=>".github/workflows/"+r.workflow));
 for(const status of ["failure","cancelled","timed_out","action_required","stale","neutral"]){
  const r=await get("/actions/runs?branch=main&status="+status+"&per_page=100&created="+encodeURIComponent(">="+new Date(epoch).toISOString()));
  if(!Number.isSafeInteger(r?.total_count)||r.total_count<0||!Array.isArray(r.workflow_runs)||
     r.workflow_runs.length!==Math.min(100,r.total_count))hold("NEGATIVE_HISTORY_API_SHAPE");
  let matched=null;
  if(r.total_count<=100){
   if(r.workflow_runs.some(x=>x.head_branch!=="main"||x.status!=="completed"||x.conclusion!==status||
    !Number.isSafeInteger(x.id)||typeof x.path!=="string"||!Number.isFinite(Date.parse(x.created_at))||Date.parse(x.created_at)<epoch))
     hold("NEGATIVE_HISTORY_API_IDENTITY");
   matched=r.workflow_runs.filter(x=>relevant.has(x.path)).length;
  }
  counts.push({conclusion:status,totalCount:r.total_count,matchingExistingWorkerCount:matched,complete:r.total_count<=100});
 }
 const snap=await readP6RollingGithubSnapshot({sha,epoch,token:e.GITHUB_TOKEN,fetcher:api});
 if((await get("/git/ref/heads/main"))?.object?.sha!==sha)hold("MAIN_CHANGED_DURING_PROBE");
 // Actual committed plan geometry, no future flight identities and no paid
 // admission. These are nominal SOURCE timing opportunities, not a forecast.
 const groups=new Map(),keys=new Set();let first=Infinity,total=0;
 for(let i=1;i<=31;i++){
  const p=JSON.parse(readFileSync("data-collection/phase5/planning/phase6-source-day-"+String(i).padStart(2,"0")+".json","utf8"));
  if(p.runDayIndex!==i||!Array.isArray(p.templates)||!p.templates.length)hold("DAY_PLAN");
  for(const t of p.templates){
   const s=Date.parse(t.scheduledRequestUtc);
   if(!Number.isFinite(s)||keys.has(t.queryKey)||t.runDayIndex!==i)hold("TEMPLATE");
   keys.add(t.queryKey);groups.set(s,(groups.get(s)??0)+1);first=Math.min(first,s);total++;
  }
 }
 if(total!==6144)hold("REVIEWED_TEMPLATE_DENOMINATOR_CHANGED");
 const maxLead=90,minLead=15,earliest=first-maxLead*MIN,last=first-minLead*MIN,ticks=[];
 for(let t=Math.floor(earliest/MIN)*MIN;t<=last;t+=MIN)
  if(t>=earliest&&[8,18,28,38,48,58].includes(new Date(t).getUTCMinutes()))ticks.push(t);
 const waves=[...groups].sort((a,b)=>a[0]-b[0]);let maximum=0,maximumStart=null;
 for(let i=0,j=0,n=0;i<waves.length;i++){
  while(j<waves.length&&waves[j][0]<waves[i][0]+90*MIN)n+=waves[j++][1];
  if(n>maximum){maximum=n;maximumStart=waves[i][0];}
  n-=waves[i][1];
 }
 const sourceTiming={firstSourceUtc:new Date(first).toISOString(),firstWaveTemplates:groups.get(first),
  admissibleParentObservationFromUtc:new Date(earliest).toISOString(),admissibleParentObservationThroughUtc:new Date(last).toISOString(),
  nominalExternalTicks:ticks.map(t=>new Date(t).toISOString()),conservativeAssumedClockToParentObservationMinutes:[0,2,5,10,20].map(m=>({minutes:m,eligibleTickCount:ticks.filter(t=>t+m*MIN<=last).length})),
  totalTemplates:total,distinctRequestWaves:waves.length,maxTemplatesAtSameInstant:Math.max(...groups.values()),
  maximumTemplatesInNominalHalfOpen90mWindow:maximum,maximumWindowStartUtc:new Date(maximumStart).toISOString(),
  sourcePerTickCapReviewOnly:8,sourceInFlightCapReviewOnly:24,actualCapacityOrCadenceProven:false};
 console.log(JSON.stringify({status:"ACTUAL_DIRECT_CLOCK_READONLY_METADATA_AND_PLAN_PROBE_NO_GO",runId:Number(e.GITHUB_RUN_ID),event:mode,
  observedMainSha:sha,actualCheckoutSha:e.GITHUB_SHA,routeStates,negativeHistory:counts,previewStatus:snap.plan.status,
  assessments:snap.plan.assessments.map(x=>({lane:x.lane,state:x.state})),sourceTiming,githubReads:reads,
  providerCalls:0,databaseReads:0,databaseWrites:0,dispatches:0,phase6PaidGo:false}));
}
probe().catch(err=>{console.error(/^HOLD_[A-Z0-9_]{1,150}$/.test(err?.message??"")?err.message:"HOLD_P6_DIRECT_VERIFY_REDACTED");process.exitCode=2;});
