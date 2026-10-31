/**
 * One GitHub main-push, single paid AeroDataBox WSSS FIDS GET (max one
 * physical attempt; expected 2 REST API units), followed by atomic raw-first
 * persist + retained-content readback. No Alert, retry, or timed shell.
 *
 * This produces prospective SOURCE evidence and a Gate5 candidate population,
 * not certified first-T, scheduled passenger, or actual runway labels.
 */
import "dotenv/config";
import pg from "pg";
import {createHash} from "node:crypto";
import {fetchFidsPopulation,utcIntervalToLocal} from
 "../server/lib/disruption/fidsCensus_v3";
import {fetchFidsAirport,getBalanceEvidenceStrict} from
 "../server/lib/disruption/aerodataboxLimiter_v3";
import {getV39Pool} from "../server/lib/disruption/db_v39";
import {auditStoredDecodedFidsReadbackV39}
 from "../server/lib/disruption/phase4Gate5DecodedFidsReadback_v39";
import {inspectGate05OpenApiBytesV39}
 from "../server/lib/disruption/gate05OpenApiInspector_v39";

const EXACT_INTENT="PHASE4_ONE_WSSS_ORIGINAL_FIDS_2_API_UNITS_ZERO_RETRIES" as const;
const AIRPORT="WSSS";
const MAX_BYTES=4*1024*1024;
const DEADLINE=Date.parse("2026-11-01T23:59:59.000Z");
const PLAN_FIDS_MIN_SOURCE_LEAD_MS=26*3600_000;
const SCHEDULED_INTENT="PHASE4_WSSS_THREE_HORIZON_SINGLE_GET_PER_CRON_NO_RETRIES";
// The Oct31 03:07 PDT GitHub cron was not dispatched; the 07:37 PDT
// remaining event is push-prearmed explicitly, NOT disguised as a schedule.
const PREARMED_T90_INTENT="PHASE4_WSSS_OCT31_T90_PUSH_PREARM_ONE_GET_NO_RETRY";
const PREARMED_T90_WORKFLOW=
 "HKcode22/ReplitTranvr/.github/workflows/phase4-gate5-wsss-t90-push-prearm-20261031.yml@refs/heads/main";
// Three predeclared, finite source-receipt times for the SAME service window.
// Every time is UTC and earlier than the earliest candidate cutoff.
const HORIZON_SLOTS={
 "7 16 30 10 *":{horizon:"T-24h",runUtc:"2026-10-30T16:07:00.000Z",
                  cutoffUtc:"2026-10-30T17:00:00.000Z"},
 "7 10 31 10 *":{horizon:"T-6h",runUtc:"2026-10-31T10:07:00.000Z",
                  cutoffUtc:"2026-10-31T11:00:00.000Z"},
 "37 14 31 10 *":{horizon:"T-90m",runUtc:"2026-10-31T14:37:00.000Z",
                    cutoffUtc:"2026-10-31T15:30:00.000Z"}
} as const;
export function scheduledWsssHorizonV39(env:NodeJS.ProcessEnv,now:number){
 const slot=HORIZON_SLOTS[
   env.P4_FIDS_SCHEDULE_CRON as keyof typeof HORIZON_SLOTS
 ];
 if(!slot||env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="schedule"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA??"")||
    env.P4_ONE_FIDS_EXACT_INTENT!==SCHEDULED_INTENT||
    !Number.isFinite(now)||now>=DEADLINE||
    now<Date.parse(slot.runUtc)-10*60_000||
    now>Date.parse(slot.cutoffUtc)-15*60_000)
   throw Error("P4_FIDS_SCHEDULED_HORIZON_WINDOW_HOLD");
 const start=new Date("2026-10-31T17:00:00.000Z");
 const end=new Date("2026-10-31T18:00:00.000Z");
 return {horizon:slot.horizon,cutoffUtc:new Date(slot.cutoffUtc),
         window:{start,end}};
}
export function prearmedWsssT90HorizonV39(env:NodeJS.ProcessEnv,now:number){
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="push"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    env.GITHUB_WORKFLOW!=="Phase4 WSSS T90 PREARMED GitHub One Paid FIDS GET"||
    env.GITHUB_WORKFLOW_REF!==PREARMED_T90_WORKFLOW||
    env.GITHUB_JOB!=="prearmed-one-fids"||
    !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA??"")||
    env.P4_ONE_FIDS_EXACT_INTENT!==PREARMED_T90_INTENT||
    env.P4_FIDS_SCHEDULE_CRON!=="37 14 31 10 *"||
    !Number.isFinite(now)||
    now<Date.parse("2026-10-31T14:27:00.000Z")||
    now>Date.parse("2026-10-31T15:15:00.000Z"))
   throw Error("P4_FIDS_PUSH_PREARM_T90_CONTEXT_OR_CUTOFF_HOLD");
 const slot=HORIZON_SLOTS["37 14 31 10 *"];
 return {horizon:slot.horizon,cutoffUtc:new Date(slot.cutoffUtc),
  window:{start:new Date("2026-10-31T17:00:00.000Z"),
          end:new Date("2026-10-31T18:00:00.000Z")}};
}
/** Separate preflight for one exclusive T90 cohort/interval; no source values logged. */
async function refuseExistingT90ReceiptV39(dbUrl:string):Promise<void>{
 const c=new pg.Client({connectionString:dbUrl,
  application_name:"phase4_wsss_t90_prearm_duplicate_readonly",
  connectionTimeoutMillis:9000,query_timeout:8000});
 let begun=false,opened=false;
 try{
  await c.connect();opened=true;
  await c.query("BEGIN TRANSACTION READ ONLY");begun=true;
  const res=await c.query(`SELECT EXISTS(
    SELECT 1 FROM clean.fids_query_response
    WHERE source_airport_icao='WSSS'
      AND service_window_start_utc='2026-10-31T17:00:00.000Z'::timestamptz
      AND service_window_end_utc='2026-10-31T18:00:00.000Z'::timestamptz
      AND available_at>='2026-10-31T14:27:00.000Z'::timestamptz
      AND available_at<='2026-10-31T15:15:00.000Z'::timestamptz
  ) AS already_stored`);
  if(res.rows.length!==1||typeof res.rows[0]?.already_stored!=="boolean"||
     res.rows[0].already_stored)
    throw Error("P4_FIDS_T90_PREARM_DUPLICATE_SOURCE_HOLD");
 }finally{
  if(begun)await c.query("ROLLBACK").catch(()=>undefined);
  if(opened)await c.end().catch(()=>undefined);
 }
}
export function requireP4OneFidsSourceActionsV39(
 env:NodeJS.ProcessEnv,now:number
):void{
 if(env.GITHUB_ACTIONS!=="true"||
    env.GITHUB_REPOSITORY!=="HKcode22/ReplitTranvr"||
    env.GITHUB_REF!=="refs/heads/main"||
    env.GITHUB_EVENT_NAME!=="push"||
    env.GITHUB_RUN_ATTEMPT!=="1"||
    !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA??"")||
    env.P4_ONE_FIDS_EXACT_INTENT!==EXACT_INTENT||
    !Number.isFinite(now)||now>=DEADLINE)
   throw Error("P4_FIDS_ONE_PAID_CONTEXT_OR_DEADLINE_HOLD");
}
export function futureWsssPopulationWindowV39(now:number){
 if(!Number.isSafeInteger(now)||now<=0||now>=DEADLINE)
   throw Error("P4_FIDS_WINDOW_CLOCK_HOLD");
 // Future one-hour service window, >=27h from now, so today's source
 // cannot be backfilled into an already-passed T-24h prediction cutoff.
 const hour=3600_000;
 const start=Math.ceil(now/hour)*hour + 27*hour;
 const end=start+hour;
 if(start-now<PLAN_FIDS_MIN_SOURCE_LEAD_MS || end>8.64e15)
   throw Error("P4_FIDS_WINDOW_LEAD_HOLD");
 return {start:new Date(start),end:new Date(end)};
}
async function checkWritableSchema(url:string):Promise<void>{
 const c=new pg.Client({
   connectionString:url,application_name:"phase4_wsss_fids_once_preflight",
   connectionTimeoutMillis:9000,query_timeout:8000
 });
 let opened=false,begun=false;
 try{
   await c.connect();opened=true;
   await c.query("BEGIN READ ONLY");begun=true;
   const q=await c.query(`
     SELECT
       to_regclass('clean.fids_query_response') IS NOT NULL AS raw_exists,
       to_regclass('clean.flight_population') IS NOT NULL AS pop_exists,
       has_table_privilege(current_user,'clean.fids_query_response','INSERT') AS raw_insert,
       has_table_privilege(current_user,'clean.flight_population','INSERT') AS pop_insert,
       EXISTS(SELECT 1 FROM pg_trigger
         WHERE tgrelid='clean.fids_query_response'::regclass
         AND tgname='trg_fids_query_response_immutable' AND tgenabled<>'D') AS immutable_trigger,
       EXISTS(SELECT 1 FROM pg_trigger
         WHERE tgrelid='clean.fids_query_response'::regclass
         AND tgname='trg_fids_response_expire_population' AND tgenabled<>'D') AS expiry_trigger
   `);
   const x=q.rows[0];
   if(!x||!x.raw_exists||!x.pop_exists||!x.raw_insert||
      !x.pop_insert||!x.immutable_trigger||!x.expiry_trigger)
     throw Error("P4_FIDS_WRITER_OR_RETENTION_SCHEMA_HOLD");
 }finally{
   if(begun)await c.query("ROLLBACK").catch(()=>undefined);
   if(opened)await c.end().catch(()=>undefined);
 }
}
async function boundedBody(r:Response):Promise<Buffer>{
 const declared=r.headers.get("content-length");
 if(declared!==null &&
    (!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES))
   throw Error("P4_FIDS_ONE_BODY_TOO_LARGE");
 if(!r.body)throw Error("P4_FIDS_ONE_BODY_MISSING");
 const reader=r.body.getReader(),parts:Buffer[]=[];
 let length=0;
 try{
   while(true){
     const chunk=await reader.read();
     if(chunk.done)break;
     length+=chunk.value.byteLength;
     if(length>MAX_BYTES){
       await reader.cancel().catch(()=>undefined);
       throw Error("P4_FIDS_ONE_BODY_TOO_LARGE");
     }
     parts.push(Buffer.from(chunk.value));
   }
 }finally{reader.releaseLock();}
 return Buffer.concat(parts,length);
}
async function main():Promise<void>{
 let billableAttempts=0;
 let stored=false;
 let debit:number|null=null;
 let pool:ReturnType<typeof getV39Pool>|null=null;
 try{
   const now=Date.now();
   const isT90Prearmed=process.env.P4_ONE_FIDS_EXACT_INTENT===PREARMED_T90_INTENT;
   const scheduled=isT90Prearmed
     ?prearmedWsssT90HorizonV39(process.env,now)
     :process.env.GITHUB_EVENT_NAME==="schedule"
       ?scheduledWsssHorizonV39(process.env,now):null;
   if(!scheduled)requireP4OneFidsSourceActionsV39(process.env,now);
   const dbUrl=process.env.V39_DATABASE_RUNTIME_URL||
     process.env.GATE05_AUTOMATION_DATABASE_URL;
   const key=process.env.AERODATABOX_API_KEY;
   if(!dbUrl||!key||key.length<10)
     throw Error("P4_FIDS_ONE_REQUIRED_PROTECTED_SECRETS_HOLD");
   // Preflight live schema, writer grants, immutable raw, expiry trigger
   // BEFORE even reserving/issuing the one billable GET.
   await checkWritableSchema(dbUrl);
   if(isT90Prearmed)await refuseExistingT90ReceiptV39(dbUrl);
   process.env.V39_DATABASE_RUNTIME_URL=dbUrl;
   const window=scheduled?.window??futureWsssPopulationWindowV39(now);
   const locals=utcIntervalToLocal(window.start,window.end,"Asia/Singapore");
   const doc=await fetch("https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json",{
     redirect:"error",signal:AbortSignal.timeout(12000)
   });
   if(!doc.ok)throw Error("P4_FIDS_ONE_PUBLIC_OPENAPI_HOLD");
   const specBytes=Buffer.from(await doc.arrayBuffer());
   const spec=inspectGate05OpenApiBytesV39(specBytes);
   if(!spec.fids.localRangeGetTier2)
     throw Error("P4_FIDS_ONE_FIDS_ROUTE_CONTRACT_HOLD");
   const balance=await getBalanceEvidenceStrict(); // free entitlement read
   if(!Number.isSafeInteger(balance.quota.apiUnitsRemaining)||
      balance.quota.apiUnitsRemaining<4||
      !Number.isSafeInteger(balance.quota.requestsRemaining)||
      balance.quota.requestsRemaining<2||
      balance.balance.creditsRemaining<1000)
      throw Error("P4_FIDS_ONE_ACCOUNT_BUDGET_FLOOR_HOLD");
   const beforeUnits=balance.quota.apiUnitsRemaining;
   const fetchOnce:typeof fetchFidsAirport=async (icao,from,to,opts)=>{
     if(billableAttempts!==0||icao!==AIRPORT||from!==locals.fromLocal||
        to!==locals.toLocal||opts?.direction!=="Departure"||
        opts.withLeg!==true||opts.withCancelled!==true||
        opts.withCodeshared!==true||opts.withCargo!==false||
        opts.withPrivate!==false||opts.withLocation!==false)
       throw Error("P4_FIDS_ONE_FETCH_SCOPE_OR_REPLAY_HOLD");
     // Preflight includes DB, public OpenAPI and free quota reads. If any of
     // those are delayed, the initial schedule check can become stale.
     // Recheck the exact same scientifically approved horizon/deadline AT
     // PHYSICAL DISPATCH, before counting a possibly billable attempt.
     // A late scheduled fetch MUST HOLD with 0 billable provider attempts.
     if(isT90Prearmed){
       prearmedWsssT90HorizonV39(process.env,Date.now());
       await refuseExistingT90ReceiptV39(dbUrl);
       prearmedWsssT90HorizonV39(process.env,Date.now());
     }else if(scheduled)scheduledWsssHorizonV39(process.env,Date.now());
     billableAttempts=1; // ambiguous dispatch is SPENT: no retry
     console.log("P4_FIDS_ONE_BILLABLE_GET_STARTED_NO_RETRY_EXPECTED_2_UNITS");
     const args=new URLSearchParams({
       direction:"Departure",withLeg:"true",withCancelled:"true",
       withCodeshared:"true",withCargo:"false",withPrivate:"false",
       withLocation:"false"
     });
     const url="https://aerodatabox.p.rapidapi.com/flights/airports/icao/WSSS/"+
       encodeURIComponent(from)+"/"+encodeURIComponent(to)+"?"+args;
     const resp=await fetch(url,{
       redirect:"error",method:"GET",
       signal:AbortSignal.timeout(15000),
       headers:{"X-RapidAPI-Host":"aerodatabox.p.rapidapi.com",
         "X-RapidAPI-Key":key,Accept:"application/json"}
     });
     if(resp.status!==200)throw Error("P4_FIDS_ONE_HTTP_NON200_NO_RETRY");
     const afterHeader=resp.headers.get("x-ratelimit-api-units-remaining");
     if(afterHeader && /^[0-9]{1,12}$/.test(afterHeader)){
       const after=Number(afterHeader);
       if(after<=beforeUnits)debit=beforeUnits-after;
     }
     const bytes=await boundedBody(resp);
     let raw:unknown;
     try{raw=JSON.parse(bytes.toString("utf8"));}catch{
       throw Error("P4_FIDS_ONE_RESPONSE_JSON_HOLD");
     }
     if(!raw||typeof raw!=="object"||Array.isArray(raw)||
        !Array.isArray((raw as any).departures))
       throw Error("P4_FIDS_ONE_SOURCE_LIST_HOLD");
     const body=raw as {departures:any[];arrivals?:any[]};
     if(body.departures.length>900)
       throw Error("P4_FIDS_ONE_SOURCE_TRUNCATION_RISK_HOLD");
     const response:any={departures:body.departures,
       arrivals:Array.isArray(body.arrivals)?body.arrivals:[]};
     Object.defineProperty(response,"originalDecodedBody",{
       enumerable:false,configurable:false,writable:false,
       value:{representation:"FETCH_DECODED_RESPONSE_BODY_BYTES_NOT_HTTP_WIRE",
         sha256:createHash("sha256").update(bytes).digest("hex"),
         byteLength:bytes.byteLength,base64:bytes.toString("base64")}
     });
     return response;
   };
   const params={
     airportIcao:AIRPORT,fromLocal:locals.fromLocal,
     toLocal:locals.toLocal,ianaTimezone:"Asia/Singapore",
     direction:"Departure" as const,withCancelled:true,
     withCodeshared:true,withCargo:false,withPrivate:false,
     serviceWindowStartUtc:window.start,serviceWindowEndUtc:window.end,
     cutoffUtc:scheduled?.cutoffUtc??new Date(window.start.getTime()-24*3600_000),
     providerApiVersion:spec.version,
     fidsProtocolVersion:"v3.9-f.8",
     openapiSha256:spec.sha256,
     restCategory:"validation" as const
   };
   const output=await fetchFidsPopulation(params,{fetchAirport:fetchOnce});
   if(!output)throw Error("P4_FIDS_ONE_SOURCE_UNAVAILABLE");
   stored=true;
   pool=getV39Pool();
   // Independent in-process post-commit verification of stored original
   // bytes and JSONB-stable new envelope hash.
   const report=await auditStoredDecodedFidsReadbackV39(pool,{
     airport:AIRPORT,readAsOfUtc:new Date().toISOString()
   });
   const certifiedLocalBody=report.bodyAndEnvelopeShaVerified>=1 &&
     report.rejectedIntegrity===0;
   const summary={
     schema:"v39.phase4.one-prospective-wsss-fids-original-source.v1",
     status:certifiedLocalBody
       ?"ORIGINAL_STORAGE_CONSISTENT_PROSPECTIVE_FIDS_CANDIDATE"
       :"FIDS_PERSISTED_READBACK_NOT_PROVEN_HOLD",
     airport:AIRPORT,
     windowStartUtc:window.start.toISOString(),
     windowEndUtc:window.end.toISOString(),
     preliminaryHorizon:scheduled?.horizon??"T-24h",
     candidateFirstCutoffUtc:params.cutoffUtc.toISOString(),
     providerAttempted:billableAttempts,
     expectedApiUnits:2,measuredApiUnitDelta:debit,
     fidsRowsNormalized:output.flightCount,
     fidsRowsInserted:output.persistedPopulationRows,
     sourceBodyAndEnvelopeVerifiedInBoundedSample:
        report.bodyAndEnvelopeShaVerified,
     rawFirstAtomicPersisted:stored,
     originalHttpWireProven:false,
     providerTAndActualRunwayVerified:false,
     strictGate5Passed:false,phase6Authorized:false,
     alertCreates:0,providerRetries:0
   };
   console.log(JSON.stringify(summary));
   if(!certifiedLocalBody || (debit!==null&&debit!==2))
     process.exitCode=2;
 }catch{
   console.error(JSON.stringify({
     schema:"v39.phase4.one-prospective-wsss-fids-original-source.v1",
     status:billableAttempts>0?"HOLD_AFTER_ONE_POSSIBLY_PAID_FIDS_GET_NO_RETRY":
       "HOLD_BEFORE_PAID_FIDS_GET",
     providerAttempted:billableAttempts,rawFirstAtomicPersisted:stored,
     measuredApiUnitDelta:debit,maxBillableAttempts:1,
     expectedApiUnits:2,providerRetries:0,alertCreates:0,
     errorDetailsRedacted:true,strictGate5Passed:false,
     phase6Authorized:false
   }));
   process.exitCode=2;
 }finally{
   if(pool)await pool.end().catch(()=>undefined);
 }
}
if(process.argv[1]?.endsWith("v39_phase4_one_prospective_fids_paid_actions.ts")){
 void main();
}
