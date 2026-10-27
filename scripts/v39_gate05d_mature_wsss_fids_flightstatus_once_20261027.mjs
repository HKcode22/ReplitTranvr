/**
 * New one-use AeroDataBox-only experiment. Two GET attempts maximum, zero retries.
 * WSSS FIDS departures scheduled 235-255 minutes before launch, then at most
 * one matching operating flight via official /flights/number/* Flight Status.
 * Raw licensed flight data/identifiers never persisted or printed.
 * 2 API units expected per GET; NO supplier-enforced hard cost cap.
 * Full exact runway target / pre-T provenance NOT proven by this diagnostic.
 */
import "dotenv/config";
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {homedir} from "node:os";
const GO="AUTHORIZE_NEW_GATE05D_ADB_ONLY_TWO_PAID_GETS_EXPECTED_4_UNITS_ZERO_RETRIES";
const pin=process.env.GATE05D_REVIEWED_MAIN_SHA||"";
if(process.env.GATE05D_PAID_GO!==GO)throw Error("G05D_NO_FRESH_APPROVAL");
if(!/^[a-f0-9]{40}$/.test(pin)||execFileSync("git",["rev-parse","FETCH_HEAD"],{encoding:"utf8",timeout:5000}).trim()!==pin)throw Error("G05D_SOURCE_PIN_REFUSED");
const key=process.env.AERODATABOX_API_KEY;
if(!key||key.length<10)throw Error("G05D_PROVIDER_KEY_MISSING");
const now=Date.now();
if(now<Date.parse("2026-10-27T00:00:00Z")||now>Date.parse("2026-10-30T03:00:00Z"))throw Error("G05D_STUDY_EXPIRED");
const host="https://aerodatabox.p.rapidapi.com";
const headers={"x-rapidapi-key":key,"x-rapidapi-host":"aerodatabox.p.rapidapi.com",accept:"application/json"};
let paidAttempts=0,previous=0;
function remain(h){const n=h.get("x-ratelimit-api-units-remaining");if(!/^[0-9]{1,12}$/.test(n||""))throw Error("G05D_QUOTA_HEADER");return Number(n);}
async function get(path,paid=false){
 if(!/^\/(?:subscriptions\/balance(?:$)|flights\/airports\/icao\/WSSS\/[0-9TZ%:-]+\/[0-9TZ%:-]+\?|flights\/number\/[A-Z0-9]+\/[0-9]{4}-[0-9]{2}-[0-9]{2}\?)/.test(path))throw Error("G05D_ROUTE_NOT_ALLOWED");
 const pause=2600-(Date.now()-previous);
 if(previous&&pause>0)await new Promise(r=>setTimeout(r,pause));
 previous=Date.now();
 if(paid){if(paidAttempts>=2)throw Error("G05D_ATTEMPTS_EXCEEDED");paidAttempts++;}
 const res=await fetch(host+path,{headers,method:"GET",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(res.status!==200)throw Error("G05D_HTTP_"+res.status+"_DO_NOT_RETRY");
 const buf=await res.arrayBuffer();
 if(buf.byteLength>7000000)throw Error("G05D_SIZE");
 let data;try{data=JSON.parse(Buffer.from(buf).toString("utf8"));}catch{throw Error("G05D_JSON");}
 return {data,api:remain(res.headers)};
}
function account(res){const obj=res.data?.balance??res.data;const alerts=Number(obj?.creditsRemaining);if(!Number.isSafeInteger(alerts)||alerts<0)throw Error("G05D_BALANCE");return {api:res.api,alerts};}
function sg(ms,dateOnly=false){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit",hour:dateOnly?undefined:"2-digit",minute:dateOnly?undefined:"2-digit",hourCycle:"h23"}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-")+(dateOnly?"":"T"+p.hour+":"+p.minute);
}
function parsedUtc(s){
 if(typeof s!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]{1,3})?)?Z$/.test(s))return null;
 const t=s.replace(" ","T"),ms=Date.parse(t);
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,16)===t.slice(0,16)?ms:null;
}
function tally(rows){
 const x={objects:rows.length,scheduledPresent:0,revisedPresent:0,runwayPresent:0,
  operatorRecords:0,marketingRecords:0,liveDeparture:0,approximateDeparture:0,
  departedOrArrived:0,lastUpdatedPresent:0};
 for(const f of rows){
  const d=f?.departure??f?.movement??{};
  if(parsedUtc(d.scheduledTime?.utc)!==null)x.scheduledPresent++;
  if(parsedUtc(d.revisedTime?.utc)!==null)x.revisedPresent++;
  if(parsedUtc(d.runwayTime?.utc)!==null)x.runwayPresent++;
  if(f?.codeshareStatus==="IsOperator"||f?.codeshareStatus===1)x.operatorRecords++;
  if(f?.codeshareStatus==="IsCodeshared"||f?.codeshareStatus===2)x.marketingRecords++;
  if(d.quality?.includes("Live"))x.liveDeparture++;
  if(d.quality?.includes("Approximate"))x.approximateDeparture++;
  if(["Departed","Arrived"].includes(f?.status))x.departedOrArrived++;
  if(parsedUtc(f?.lastUpdatedUtc)!==null)x.lastUpdatedPresent++;
 }
 return x;
}
function choose(rows){
 const list=rows.filter(f=>(f?.codeshareStatus==="IsOperator"||f?.codeshareStatus===1)&&typeof f.number==="string"&&/^[A-Z0-9 ]{3,10}$/i.test(f.number)&&parsedUtc(f.departure?.scheduledTime?.utc)!==null);
 const score=f=>Number(parsedUtc(f.departure.runwayTime?.utc)!==null)*4+Number(["Departed","Arrived"].includes(f.status))*2+Number(f.departure.quality?.includes("Live"));
 list.sort((a,b)=>score(b)-score(a));return list[0]??null;
}
const from=sg(now-255*60000),to=sg(now-235*60000);
const before=account(await get("/subscriptions/balance"));
if(before.api<4||before.alerts<1000)throw Error("G05D_ACCOUNT_FLOOR");
const dir=join(homedir(),".config","replittranvr","gate05d-mature-wsss-20261027");
mkdirSync(dir,{recursive:true,mode:0o700});
const file=join(dir,"once-intent.json");
const base={schema:"v39.gate05d.adb-mature-v1",sourceSha:pin,study:"WSSS mature 20min FIDS then single ADB Flight Status",beforeApi:before.api,beforeAlert:before.alerts,maxPhysicalGets:2,expectedApiUnits:4,noRetries:true,hardCostCap:false,rawProviderItemsRetained:false};
writeFileSync(file,JSON.stringify({...base,status:"ONCE_SPENT_BEFORE_FIRST_GET"})+"\n",{flag:"wx",mode:0o600});
const save=v=>writeFileSync(file,JSON.stringify({...base,...v})+"\n",{mode:0o600});
const measures={fids:null,flightStatus:null};let error=null;
try{
 const q1=new URLSearchParams({direction:"Departure",withCancelled:"true",withCodeshared:"true",withCargo:"false",withPrivate:"false",withLeg:"true",withLocation:"false"});
 save({status:"INTENT_FIRST_GET",paidAttempts:1});
 const first=await get("/flights/airports/icao/WSSS/"+encodeURIComponent(from)+"/"+encodeURIComponent(to)+"?"+q1,true);
 if(!Array.isArray(first.data?.departures)||first.data.departures.length>1000)throw Error("G05D_FIDS_SHAPE");
 measures.fids=tally(first.data.departures);
 if(before.api-first.api!==2)throw Error("G05D_FIRST_DEBIT_NOT_TWO_REFUSE_SECOND");
 const f=choose(first.data.departures);
 save({status:"FIRST_GET_MEASURED",paidAttempts,measures});
 if(f){
  const scheduled=parsedUtc(f.departure.scheduledTime.utc);
  const number=f.number.toUpperCase().replace(/\s+/g,"");
  const q2=new URLSearchParams({dateLocalRole:"Departure",withAircraftImage:"false",withLocation:"false",withFlightPlan:"false"});
  save({status:"INTENT_SECOND_GET",paidAttempts:2,measures});
  const second=await get("/flights/number/"+encodeURIComponent(number)+"/"+sg(scheduled,true)+"?"+q2,true);
  if(before.api-second.api!==4)throw Error("G05D_SECOND_DEBIT_NOT_FOUR");
  if(!Array.isArray(second.data)||second.data.length>100)throw Error("G05D_FLIGHTSTATUS_SHAPE");
  const matched=second.data.filter(x=>x?.departure?.airport?.icao==="WSSS"&&parsedUtc(x.departure.scheduledTime?.utc)!==null&&Math.abs(parsedUtc(x.departure.scheduledTime.utc)-scheduled)<=3600000);
  measures.flightStatus={...tally(matched),matchedWsssWithinOneHour:matched.length,rawReturnedCount:second.data.length,fieldActualityIndependentlyEstablished:false,scheduledRunwayBaselinePresent:false};
 }else measures.flightStatus={skipped:"NO_MATCHABLE_OPERATOR_NO_SECOND_SPEND"};
}catch(e){error=e instanceof Error?e.message:"G05D_UNKNOWN_HOLD";}
let after=null,settlement=null;
try{after=account(await get("/subscriptions/balance"));}catch(e){settlement=e instanceof Error?e.message:"G05D_SETTLEMENT_MISSING";}
const spent=after?before.api-after.api:null,alertSpent=after?before.alerts-after.alerts:null;
const ok=!error&&!settlement&&spent===2*paidAttempts&&alertSpent===0;
const final={status:ok?"GATE05D_ADB_MATURE_FIDS_FLIGHTSTATUS_DIAGNOSTIC_COMPLETE":"GATE05D_HOLD_DO_NOT_REPEAT",paidAttempts,expectedApiUnits:2*paidAttempts,apiUnitsSpent:spent,apiUnitsAfter:after?.api??null,alertCreditsSpent:alertSpent,alertCreditsAfter:after?.alerts??null,windowMinutes:20,scheduledDepartureAgeMinutes:[235,255],measurements:measures,detail:error??settlement??(ok?null:"QUOTA_MISMATCH"),exactRunwayDelayLabelProven:false,prospectivePredictionTProven:false,endedUtc:new Date().toISOString()};
save(final);console.log(JSON.stringify(final));if(!ok)process.exitCode=2;
