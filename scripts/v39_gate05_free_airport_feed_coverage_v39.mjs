/**
 * Source-controlled FREE-TIER AeroDataBox airport-feed coverage diagnostic.
 * EXACTLY 2 airport status GETs (WSSS and YSSY); 2 FREE balance GETs
 * independently compare RapidAPI API-units and subscription credits.
 * No FIDS GET, Flight Alert CREATE, retry, POST/DELETE or database write.
 * The documented "/health/services/airports/{icao}/feeds" is FREE TIER:
 * https://doc.aerodatabox.com/docs/openapi-rapidapi-v1.json
 *
 * A live feed status DOES NOT certify individual timestamps as actual;
 * does not authorize paid Gate05, nor settle the historical YSSY gap.
 */
import "dotenv/config";
const BASE="https://aerodatabox.p.rapidapi.com";
const key=process.env.AERODATABOX_API_KEY;
if(!key || key.trim().length<10)throw Error("GATE05_FREE_FEED_AUTH_MISSING");
const auth={
  "x-rapidapi-key":key,
  "x-rapidapi-host":"aerodatabox.p.rapidapi.com",
  "accept":"application/json"
};
async function onlyGet(path){
  if(!/^\/(?:subscriptions\/balance|health\/services\/airports\/(?:WSSS|YSSY)\/feeds)$/.test(path))
    throw Error("GATE05_FREE_FEED_UNREVIEWED_PATH");
  const r=await fetch(BASE+path,{
    method:"GET",headers:auth,redirect:"error",signal:AbortSignal.timeout(9000)
  });
  if(r.status!==200)throw Error("GATE05_FREE_FEED_HTTP_"+r.status);
  const obj=await r.json();
  if(!obj||typeof obj!=="object"||Array.isArray(obj))
    throw Error("GATE05_FREE_FEED_BAD_RESPONSE_SHAPE");
  return {body:obj,headers:r.headers};
}
function quotaRemaining(h){
  const raw=h.get("x-ratelimit-api-units-remaining");
  const n=raw===null?NaN:Number(raw);
  if(!Number.isSafeInteger(n)||n<0)
    throw Error("GATE05_FREE_FEED_QUOTA_HEADER_MISSING");
  return n;
}
function balanceCredits(obj){
  const value=obj?.balance??obj;
  const raw=value?.creditsRemaining??value?.credits;
  const n=raw===null||raw===undefined?NaN:Number(raw);
  if(!Number.isSafeInteger(n)||n<0)
    throw Error("GATE05_FREE_FEED_BALANCE_SHAPE");
  return n;
}
function statusOf(record){
  const s=record?.status;
  return typeof s==="string"&&s.length<=80?s:"UNKNOWN";
}
const before=await onlyGet("/subscriptions/balance");
const unitBefore=quotaRemaining(before.headers);
const creditsBefore=balanceCredits(before.body);
const rows=[];
for(const icao of ["WSSS","YSSY"]){
  const {body}=await onlyGet("/health/services/airports/"+icao+"/feeds");
  rows.push({
    icao,
    scheduleFeed:statusOf(body.flightSchedulesFeed),
    liveFeed:statusOf(body.liveFlightUpdatesFeed),
    adsbFeed:statusOf(body.adsbUpdatesFeed),
    generalAvailabilityPresent:Boolean(body.generalAvailability),
    timestampActualityProven:false,
    scheduledWheelsOffSourceProven:false
  });
}
const after=await onlyGet("/subscriptions/balance");
const unitAfter=quotaRemaining(after.headers);
const creditsAfter=balanceCredits(after.body);
const quotaStable=unitBefore===unitAfter && creditsBefore===creditsAfter;
console.log(JSON.stringify({
  schema:"v39.gate05.free-airport-feed-custody.v1",
  status:quotaStable?"FREE_FEED_READBACK_QUOTA_STABLE":
    "FREE_FEED_QUOTA_OR_BALANCE_CHANGED_CAUSE_UNDETERMINED",
  providerMethods:["GET"],
  providerPaths:{
    accountBalance:2,
    freeAirportFeeds:2,
    fids:0,subCreates:0,providerDeletes:0
  },
  quotaApiUnitsBefore:unitBefore,
  quotaApiUnitsAfter:unitAfter,
  alertCreditsBefore:creditsBefore,
  alertCreditsAfter:creditsAfter,
  noRetries:true,
  airports:rows,
  gate05FullScientificLabelPass:false,
  paidGate05Authorized:false
}));
if(!quotaStable)process.exitCode=2;
