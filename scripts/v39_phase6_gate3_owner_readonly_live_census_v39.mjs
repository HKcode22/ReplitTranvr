/** Phase 6 G3: EXACT existing PG16 owner, READ-ONLY physical release census.
 * No consumer access to source packets, original bodies, URLs in output,
 * mutation, SQL function application, scheduler or paid-provider operation.
 * Standalone by design: run from a verified Git blob without changing main.
 */
import pg from "pg";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const fail=x=>{throw Error("HOLD_P6_GATE3_READONLY_"+x);};
const expectedRelayBlob="66e10596b138a9c6d0b2872586d8448126dc26fc";
const sha=/^[0-9a-f]{40}$/;
const maxKinds=24;
function endpoint(env){
 if(env.NODE_TLS_REJECT_UNAUTHORIZED==="0")fail("TLS_DISABLED");
 let u;try{u=new URL(env.DATABASE_URL||"");}catch{fail("OWNER_URL_NOT_AVAILABLE");}
 if(!["postgres:","postgresql:"].includes(u.protocol)||!u.hostname.endsWith(".neon.tech")||
   decodeURIComponent(u.username)!=="neondb_owner"||!u.password||
   u.pathname!=="/neondb"||!["require","verify-full"].includes(u.searchParams.get("sslmode")))
  fail("EXACT_EXISTING_NEON_OWNER_URL_REQUIRED");
 return u.toString();
}
function relay(){
 const blob=execFileSync("gh",["api","repos/HKcode22/TravnrClockRelay/contents/relay.mjs?ref=main","--jq",".sha"],{
  encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:15000}).trim();
 return {relayCompatibilityOnMain:blob===expectedRelayBlob};
}
const date=x=>x instanceof Date?x.toISOString():typeof x==="string"&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
export function projectG3ReadOnlyCounts(rows,at){
 if(!Array.isArray(rows)||rows.length>maxKinds||!date(at))fail("INVALID_COUNT_SHAPE");
 const seen=new Set(),groups=[];
 for(const r of rows){
  if(typeof r?.kind!=="string"||!/^[A-Z0-9_]{3,64}$/.test(r.kind)||
    seen.has(r.kind)||![r.count,r.due,r.within_one_hour].every(n=>Number.isSafeInteger(n)&&n>=0)||
    r.due>r.count||r.within_one_hour>r.count-r.due||
    (r.earliest_deadline!==null&&!date(r.earliest_deadline)))
   fail("GROUP_OR_DEADLINE_INVALID");
  seen.add(r.kind);
  groups.push({kind:r.kind,count:r.count,due:r.due,
   withinOneHour:r.within_one_hour,earliestSignedDeadlineUtc:date(r.earliest_deadline)});
 }
 return {groups,privatePacketRows:groups.reduce((s,r)=>s+r.count,0),
  duePackets:groups.reduce((s,r)=>s+r.due,0),
  nearDeadlinePackets:groups.reduce((s,r)=>s+r.withinOneHour,0)};
}
async function main(){
 if(process.argv.length!==2)fail("READONLY_NO_ARGUMENTS");
 const url=endpoint(process.env),r=relay();
 const c=new pg.Client({connectionString:url,connectionTimeoutMillis:8000,
  query_timeout:20000,application_name:"p6_gate3_nonpaid_owner_readonly_census"});
 await c.connect();let tx=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='15000ms'");
  const id=(await c.query("SELECT current_database() db,current_user actor,session_user login,pg_is_in_recovery() replica,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,clock_timestamp() observed")).rows[0];
  if(id?.db!=="neondb"||id.actor!=="neondb_owner"||id.login!==id.actor||
     id.replica!==false||id.ver<160000||id.ver>=170000||id.ro!=="on"||
     !date(id.observed))fail("EXACT_READONLY_PG16_OWNER");
  const auth=(await c.query("SELECT enabled,revoked_at_utc IS NULL active,code_sha,manifest_sha256 FROM clean.adb_phase6_authorization WHERE singleton_key")).rows;
  if(auth.length!==1||!sha.test(auth[0].code_sha)||!/^[0-9a-f]{64}$/.test(auth[0].manifest_sha256))
   fail("AUTH_NOT_SINGLETON");
  const kinds=(await c.query("SELECT kind,count(*)::integer AS count,count(*) FILTER(WHERE retention_not_after_utc<=statement_timestamp())::integer AS due,count(*) FILTER(WHERE retention_not_after_utc>statement_timestamp() AND retention_not_after_utc<=statement_timestamp()+interval '1 hour')::integer AS within_one_hour,min(retention_not_after_utc) earliest_deadline FROM phase6_private.frozen_native_packet_v39 GROUP BY kind ORDER BY kind")).rows;
  const group=projectG3ReadOnlyCounts(kinds,id.observed);
  const indexes=(await c.query("SELECT count(*)::integer rows,count(*) FILTER(WHERE retention_not_after_utc<=statement_timestamp())::integer due,count(DISTINCT run_day_index)::integer days FROM phase6_private.signed_run_day_index_revision_v39")).rows[0];
  const stop=(await c.query("SELECT count(*)::integer n FROM clean.adb_incident_stop WHERE cause='deletion' AND NOT resolved")).rows[0];
  const s=(await c.query("SELECT clean.phase6_private_epoch_expiry_status_v39($1) v",[auth[0].manifest_sha256])).rows[0].v;
  if(!["v39.phase6.private-epoch-expiry-status.v1","v39.phase6.private-epoch-expiry-status.v2"].includes(s?.schema)||
     s.providerCalls!==0||s.databaseWrites!==0||s.phase6PaidGo!==false)
   fail("EXISTING_EXPIRY_PROFILE_UNRECOGNIZED");
  const p7=(await c.query("SELECT to_regclass('phase7_private.pre_fragment_v39') IS NOT NULL pre,to_regclass('phase7_private.derived_release_bundle_v39') IS NOT NULL derived")).rows[0];
  let durable=null;
  if(p7.pre&&p7.derived){
   const n=(await c.query("SELECT (SELECT count(*)::integer FROM phase7_private.pre_fragment_v39) fragments,(SELECT count(*)::integer FROM phase7_private.derived_release_bundle_v39) bundles")).rows[0];
   durable={fragments:n.fragments,bundles:n.bundles};
  }
  console.log(JSON.stringify({status:"P6_GATE3_OWNER_READONLY_ACTUAL_CENSUS_NO_GO",
   observedDbClockUtc:date(id.observed),productionDatabase:"neondb",
   sourceAuthorizationEnabled:auth[0].enabled===true&&auth[0].active===true,
   existingSourceReviewCodeSha40:auth[0].code_sha,  // public Git code identity, NOT secret
   ...r,...group,indexes,unresolvedDeletionStops:stop.n,
   privateExpiryProfile:s.schema.endsWith(".v2")?"V0108":"V0105",
   sourceBearingDeadlineClassificationProductionVerified:s.schema.endsWith(".v2"),
   phase7DurableTablesPresent:p7.pre&&p7.derived,
   phase7DurableAggregateCounts:durable,
   noProviderDataRead:true,noOriginalOrFlightIdentityRead:true,
   providerCalls:0,databaseWrites:0,productionInstallExecuted:false,paidGo:false}));
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});await c.end().catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 await main().catch(e=>{const m=String(e?.message??"");
  console.error(/^HOLD_P6_GATE3_READONLY_[A-Z0-9_]+$/.test(m)?m:"HOLD_P6_GATE3_READONLY_REDACTED_NO_SIDE_EFFECTS");
  process.exitCode=2;
 });
