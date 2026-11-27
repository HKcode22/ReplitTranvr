/** I105/T099: owner-only exact F017 ledger geometry comparison.
 * No provider calls, payload reads, raw flight identifiers or mutations. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const RED=[45916017872,45916024425,45917970925,45917973226,45918951801,45918953474,45920892584,45920897865,45921929483,45921933755,45924489072,45924490983,45924493194,45924497130,45925889069,45925891193,45935416290,45935412456,45933472740,45933470866,45936371009,45936369471,45939232130,45939228107,45938233503,45938231602];
const GOOD=[45916019790,45916022655,45917967223,45917969051,45918955072,45918956820,45920894223,45920895966,45921930902,45921932410,45924485122,45924487131,45924495142,45924499396,45925887042,45925893179];
const PLAN='1cce9eb859ad596d2c31a982cb009183abc59442';
const SLOTS={HUB:['YSSY','Australia/Sydney'],MID_A:['KBUF','America/New_York'],MID_B:['LFQQ','Europe/Paris'],REGIONAL:['NZNP','Pacific/Auckland']};
const hold=s=>{throw Error('HOLD_F017_'+s)};
const utc=x=>{try{return new Date(x instanceof Date?x.getTime():x).toISOString()}catch{hold('CLOCK')}};
function local(x,z){const p=new Intl.DateTimeFormat('en-US',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(x));const v=k=>p.find(y=>y.type===k)?.value;return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;}
function project(rows,templates,scope){
 if(!Array.isArray(rows)||rows.length!==scope.size||scope.size<1||scope.size>64||!Array.isArray(templates)||new Set(templates.map(x=>x.queryKey)).size!==templates.length)hold('CARDINALITY');
 const seen=new Set(),map=new Map(templates.map(x=>[x.queryKey,x])),groups=new Map(),examples=new Map(),contract=new Set(),versions=new Set();
 let planDrift=0,localDrift=0,zoneDrift=0,reservationClockDrift=0;
 for(const x of rows){
  const id=String(x.run_id),cls=scope.get(id),ref=SLOTS[x.slot_id];
  if(!cls||seen.has(id)||x.run_day_index!==3||x.horizon!=='T-6h'||!ref||x.airport_icao!==ref[0]||x.reserved!==true||x.query_run_id!==id||x.prearm_run_id!==id||x.physical_attempt_number!==1||x.charged_reserved_units!==2||typeof x.bound!=='boolean'||typeof x.timely!=='boolean'||x.bound!==(cls==='TIMELY')||x.timely!==(cls==='TIMELY')||!map.has(x.query_key))hold('LEDGER_OR_LOG_CONTRADICTION');
  seen.add(id);const t=map.get(x.query_key),start=utc(x.service_window_start_utc),end=utc(x.service_window_end_utc),planned=utc(x.planned_dispatch_utc),cutoff=utc(x.prediction_cutoff_utc),reserved=utc(x.committed_at_utc),prearmed=utc(x.prearmed_at_utc),latest=utc(x.hard_latest_dispatch_utc);
  const badPlan=t.runDayIndex!==3||t.slot!==x.slot_id||t.horizon!==x.horizon||t.providerQueryDirection!=='Departure'||t.serviceWindowStartUtc!==start||t.serviceWindowEndUtc!==end||t.scheduledRequestUtc!==planned||t.earliestPlannedCutoffUtc!==cutoff||t.physicalChargeDayUtc!==x.charge_date||t.apiUnitsPerAttempt!==2||t.maxAttempts!==1||x.api_units_per_attempt!==2||x.max_physical_attempts!==1;
  let badLocal=true,badZone=true;
  try{const from=local(start,x.airport_iana_timezone),to=local(end,x.airport_iana_timezone);badLocal=from!==x.from_local||to!==x.to_local;badZone=from!==local(start,ref[1])||to!==local(end,ref[1]);}catch{/* malformed zone remains explicit drift */}
  const badClock=prearmed>reserved||reserved<planned||reserved>latest||reserved>=cutoff||reserved.slice(0,10)!==x.charge_date;
  if(!/^[a-f0-9]{64}$/.test(x.provider_contract_sha256??'')||typeof x.provider_api_version!=='string'||typeof x.fids_protocol_version!=='string')hold('CONTRACT_METADATA');
  contract.add(x.provider_contract_sha256);versions.add(JSON.stringify([x.provider_api_version,x.fids_protocol_version]));
  planDrift+=Number(badPlan);localDrift+=Number(badLocal);zoneDrift+=Number(badZone);reservationClockDrift+=Number(badClock);
  const k=x.slot_id,g=groups.get(k)??{slot:k,airport:x.airport_icao,selectedRuns:0,loggedNoContent:0,timelyBound:0,planDrift:0,localDrift:0,zoneDrift:0,reservationClockDrift:0,minLeadMinutes:null,maxLeadMinutes:null};
  const lead=Math.round((Date.parse(start)-Date.parse(reserved))/60000*100)/100;
  g.selectedRuns++;g.loggedNoContent+=Number(cls==='NO_CONTENT');g.timelyBound+=Number(cls==='TIMELY');g.planDrift+=Number(badPlan);g.localDrift+=Number(badLocal);g.zoneDrift+=Number(badZone);g.reservationClockDrift+=Number(badClock);g.minLeadMinutes=g.minLeadMinutes===null?lead:Math.min(g.minLeadMinutes,lead);g.maxLeadMinutes=g.maxLeadMinutes===null?lead:Math.max(g.maxLeadMinutes,lead);groups.set(k,g);
  const e=k+'|'+cls;if(!examples.has(e))examples.set(e,{slot:k,airport:x.airport_icao,reportedClass:cls,runId:id,serviceWindowStartUtc:start,serviceWindowEndUtc:end,fromLocal:x.from_local,toLocal:x.to_local,zone:x.airport_iana_timezone,plannedRequestUtc:planned,reservationCommittedAtUtc:reserved});
 }
 return {status:planDrift||localDrift||zoneDrift||reservationClockDrift||contract.size!==1||versions.size!==1?'F017_REQUEST_METADATA_DRIFT_DETECTED':'F017_SELECTED_LEDGER_REQUEST_GEOMETRY_MATCHED_NO_CAUSE_CERTIFICATION',selectedRuns:seen.size,loggedNoContent:rows.filter(x=>scope.get(String(x.run_id))==='NO_CONTENT').length,timelyControls:rows.filter(x=>scope.get(String(x.run_id))==='TIMELY').length,planDrift,localDrift,zoneDrift,reservationClockDrift,contractDigestCount:contract.size,protocolVersionCount:versions.size,bySlot:[...groups.values()],examples:[...examples.values()],sourceEndpointFromReviewedCode:{direction:'Departure',withCancelled:true,withCodeshared:true,withCargo:false,withPrivate:false,withLocation:false,withLeg:true},selectedEvidenceNotFullCalendarDenominator:true,actualHttpWireNotCertified:true,providerBillingNotCertified:true,historicalProviderCauseCertified:false,providerCalls:0,databaseWrites:0};
}
if(process.argv[2]==='--self-test'){
 const t={queryKey:'q',runDayIndex:3,slot:'MID_A',horizon:'T-6h',providerQueryDirection:'Departure',serviceWindowStartUtc:'2026-11-27T08:00:00.000Z',serviceWindowEndUtc:'2026-11-27T10:00:00.000Z',scheduledRequestUtc:'2026-11-27T01:45:00.000Z',earliestPlannedCutoffUtc:'2026-11-27T02:00:00.000Z',physicalChargeDayUtc:'2026-11-27',apiUnitsPerAttempt:2,maxAttempts:1};
 const x={run_id:'1',query_run_id:'1',prearm_run_id:'1',run_day_index:3,slot_id:'MID_A',airport_icao:'KBUF',horizon:'T-6h',reserved:true,bound:false,timely:false,query_key:'q',physical_attempt_number:1,charged_reserved_units:2,api_units_per_attempt:2,max_physical_attempts:1,service_window_start_utc:t.serviceWindowStartUtc,service_window_end_utc:t.serviceWindowEndUtc,planned_dispatch_utc:t.scheduledRequestUtc,prediction_cutoff_utc:t.earliestPlannedCutoffUtc,hard_latest_dispatch_utc:'2026-11-27T01:55:00.000Z',committed_at_utc:'2026-11-27T01:45:01.000Z',prearmed_at_utc:'2026-11-27T00:30:00.000Z',charge_date:'2026-11-27',from_local:'2026-11-27T03:00',to_local:'2026-11-27T05:00',airport_iana_timezone:'America/New_York',provider_contract_sha256:'a'.repeat(64),provider_api_version:'fixture',fids_protocol_version:'fixture'};
 const scope=new Map([['1','NO_CONTENT']]);
 assert.match(project([x],[t],scope).status,/MATCHED_NO_CAUSE/);
 assert.equal(project([{...x,from_local:'2026-11-27T08:00'}],[t],scope).localDrift,1);
 assert.equal(project([{...x,airport_iana_timezone:'UTC',from_local:'2026-11-27T08:00',to_local:'2026-11-27T10:00'}],[t],scope).zoneDrift,1);
 assert.equal(project([{...x,committed_at_utc:'2026-11-27T01:56:00.000Z'}],[t],scope).reservationClockDrift,1);
 assert.equal(project([x],[{...t,serviceWindowEndUtc:'2026-11-27T11:00:00.000Z'}],scope).planDrift,1);
 assert.throws(()=>project([{...x,bound:true}],[t],scope),/LEDGER_OR_LOG/);assert.throws(()=>project([],[t],scope),/CARDINALITY/);
 console.log('P6_I105_T099_GEOMETRY_SELF_TEST_PASS');process.exit(0);
}
let c,tx=false;
try{
 if(process.argv.length!==3||!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')hold('OWNER_OR_ARGS');
 const b=readFileSync(process.argv[2]);if(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')!==PLAN)hold('PLAN_BLOB');
 const plan=JSON.parse(b.toString('utf8'));if(plan.runDayIndex!==3||plan.schema!=='v39.phase6.reviewed-future-day-source-plan.v1'||plan.templates?.length!==192)hold('PLAN_SHAPE');
 const scope=new Map([...RED.map(id=>[String(id),'NO_CONTENT']),...GOOD.map(id=>[String(id),'TIMELY'])]);if(scope.size!==42)hold('RUN_SCOPE');
 const {Client}=createRequire(resolve(process.cwd(),'package.json'))('pg');c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000,query_timeout:20000});await c.connect();
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');tx=true;
 await c.query("SET LOCAL statement_timeout='20000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");
 const ident=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
 if(!ident?.db||!ident.owner||!ident.login||!ident.primary||!ident.ro)hold('OWNER_CONTEXT');
 const auth=(await c.query('SELECT manifest_sha256 FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL')).rows;
 if(auth.length!==1||!/^[a-f0-9]{64}$/.test(auth[0].manifest_sha256??''))hold('AUTH');
 const rows=(await c.query(`SELECT e.run_id,q.github_run_id AS query_run_id,p.github_run_id AS prearm_run_id,q.run_day_index,q.slot_id,q.airport_icao,q.horizon,q.query_key,q.service_window_start_utc,q.service_window_end_utc,q.planned_dispatch_utc,q.hard_latest_dispatch_utc,q.prediction_cutoff_utc,q.from_local,q.to_local,q.airport_iana_timezone,q.api_units_per_attempt,q.max_physical_attempts,q.provider_contract_sha256,q.provider_api_version,q.fids_protocol_version,p.prearmed_at_utc,a.committed_at_utc,a.charged_utc_date::text AS charge_date,a.physical_attempt_number,a.charged_reserved_units,a.reservation_sha256 IS NOT NULL AS reserved,b.population_query_id IS NOT NULL AS bound,coalesce(b.bound_at_utc<=q.prediction_cutoff_utc,false) AS timely FROM unnest($1::text[]) AS e(run_id) LEFT JOIN clean.phase5_fids_physical_attempt_v39 a ON a.github_run_id=e.run_id AND a.manifest_sha256=$2 LEFT JOIN clean.phase5_fids_allowed_query_v39 q ON q.manifest_sha256=a.manifest_sha256 AND q.query_digest=a.query_digest LEFT JOIN clean.phase5_fids_github_prearm_v39 p ON p.manifest_sha256=a.manifest_sha256 AND p.query_digest=a.query_digest LEFT JOIN clean.phase5_fids_original_binding_v39 b ON b.manifest_sha256=a.manifest_sha256 AND b.query_digest=a.query_digest AND b.reservation_sha256=a.reservation_sha256 ORDER BY e.run_id`,[[...scope.keys()],auth[0].manifest_sha256])).rows;
 console.log(JSON.stringify({observedAtUtc:utc(ident.at),...project(rows,plan.templates,scope)}));
}catch(e){console.error(JSON.stringify({status:'HOLD_F017_OWNER_GEOMETRY',category:/^HOLD_F017_[A-Z_]+$/.test(e?.message??'')?e.message:null,sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??'')?e.code:null,providerCalls:0,databaseWrites:0}));process.exitCode=2;}
finally{if(c){if(tx)await c.query('ROLLBACK').catch(()=>{});await c.end().catch(()=>{});}}
