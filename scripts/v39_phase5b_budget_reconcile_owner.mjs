/** Exact active-manifest REST ledger audit, no provider request or mutation.
 * Reuse the already-tested category accounting SQL, distinguish FIDS-only
 * V0079 counters from V0083 other-category consumption. Do not turn an
 * unspent historical reservation into a refund or a new signed window. */
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {P6_CATEGORY_ACCOUNTING_SQL} from "../server/lib/disruption/phase6RollingRestSettlementReadback_v39.mjs";
const C=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"];
const LIVE_MANIFEST="31677d1afccb59d4c0469108156b9cf5314cbc2d6578d4451f8f0a4b2e8ec3ac";
const LIVE_CALENDAR="55ea0dd4b50d43af11af65a1e2910928e98a731ffa5efdeda7eee98ac451077b";
const CAPS=[11904,384,1260,496,22400,0,296];
const hold=x=>{throw Error("HOLD_P5B_BUDGET_"+x)};
const n=x=>{if(!Number.isSafeInteger(x)||x<0)hold("INVALID_COUNTER");return x};
const sum=(xs,f)=>xs.reduce((s,x)=>s+n(x[f]),0);
const date=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+"T00:00:00Z"))&&new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
export function reconcileP5BRestBudget({rows,caps,days,cycle,observedAtUtc},expected){
 if(!Array.isArray(rows)||rows.length>500||!Array.isArray(days)||days.length!==expected.chargeDays||
  !Array.isArray(caps)||caps.length!==7||!cycle||!Number.isFinite(Date.parse(observedAtUtc)))hold("DENOMINATOR");
 const byCat=new Map(),byDay=new Map(),seen=new Set();
 for(const r of caps){if(!C.includes(r.category)||byCat.has(r.category))hold("CAPS");byCat.set(r.category,{category:r.category,cap:n(r.cap),planned:0,reserved:0});}
 for(const [i,cat] of C.entries())if(byCat.get(cat)?.cap!==expected.caps[i])hold("FROZEN_CAP_DRIFT");
 for(const d of days){if(!date(d.day)||byDay.has(d.day))hold("UTC_DAY");byDay.set(d.day,{...d,categories:0,planned:0,reserved:0,sourcePlanned:0,sourceReserved:0,otherPlanned:0,otherReserved:0});}
 let mismatches=0;
 for(const r of rows){
  const cat=byCat.get(r.category),d=byDay.get(r.day),key=r.day+"|"+r.category;
  if(!cat||!d||seen.has(key)||r.planned_units===null||r.reserved_units===null)hold("MISSING_OR_UNCLASSIFIED_LEDGER_CELL");
  seen.add(key);const p=n(r.planned_units),v=n(r.reserved_units),actual=n(r.ledger_units);
  if(v!==actual||v>p)mismatches++;
  cat.planned+=p;cat.reserved+=v;d.categories++;d.planned+=p;d.reserved+=v;
  if(C.indexOf(r.category)<2){d.sourcePlanned+=p;d.sourceReserved+=v;}else{d.otherPlanned+=p;d.otherReserved+=v;}
 }
 const ds=[...byDay.values()],cs=[...byCat.values()];
 for(const d of ds)if(d.categories!==7||d.sourceReserved!==n(d.fids_reserved)||d.otherPlanned!==n(d.other_reserved)||
  d.planned>n(d.daily_ceiling)||d.planned>expected.peakDailyUnits)mismatches++;
 for(const c of cs)if(c.planned!==c.cap||c.reserved>c.cap)mismatches++;
 const planned=sum(ds,"planned"),reserved=sum(ds,"reserved"),source=sum(ds,"sourceReserved"),other=sum(ds,"otherReserved");
 if(planned!==expected.totalUnits||source!==n(cycle.fids_reserved)||sum(ds,"otherPlanned")!==n(cycle.other_reserved)||
  planned+n(cycle.protected_floor)>n(cycle.cycle_ceiling))mismatches++;
 const today=observedAtUtc.slice(0,10),future=ds.filter(d=>d.day>=today),elapsed=ds.filter(d=>d.day<today);
 return {status:mismatches?"REST_LEDGER_RECONCILIATION_HOLD":"REST_LEDGER_RECONCILED_NOT_BILLING_OR_PAID_GO",
  observedAtUtc,chargeDays:ds.length,categoryCells:rows.length,plannedUnits:planned,irreversibleReservedUnits:reserved,
  fidsReservedUnits:source,otherReservedUnits:other,unreservedEnvelopeUnits:planned-reserved,
  elapsedDateUnreservedUnits:sum(elapsed,"planned")-sum(elapsed,"reserved"),
  currentAndFutureDateUnreservedUpperBound:sum(future,"planned")-sum(future,"reserved"),
  actualPeakReservedUnits:Math.max(0,...ds.map(d=>d.reserved)),cycleCeiling:cycle.cycle_ceiling,protectedFloor:cycle.protected_floor,
  categories:cs,days:ds.map(({day,planned,reserved,sourceReserved,otherReserved})=>({day,planned,reserved,sourceReserved,otherReserved})),
  mismatchCount:mismatches,providerBillingVerified:false,elapsedWindowsReusable:false,providerCalls:0,databaseWrites:0,phase6PaidGo:false};
}
export async function readP5BRestBudget(c,expected={manifest:LIVE_MANIFEST,calendar:LIVE_CALENDAR,caps:CAPS,chargeDays:37,totalUnits:36740,peakDailyUnits:1280},actor="neondb_owner"){
 let open=false,attempted=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");open=true;
  await c.query("SET LOCAL TIME ZONE 'UTC'; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='2s'");
  const q=await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,current_setting('transaction_read_only') ro,clock_timestamp() at");
  const w=q.rows[0];
  if(q.rowCount!==1||w.db!=="neondb"||w.actor!==actor||w.login!==actor||w.ver<160000||w.ver>=170000||w.replica!==false||w.ro!=="on")hold("OWNER_PG16");
  const auth=await c.query("SELECT manifest_sha256,calendar_hash FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL");
  if(auth.rowCount!==1||auth.rows[0].manifest_sha256!==expected.manifest||auth.rows[0].calendar_hash!==expected.calendar)hold("FROZEN_STUDY");
  const m=expected.manifest;
  const cycle=await c.query("SELECT cycle_api_ceiling::int cycle_ceiling,other_category_reserved_units::int other_reserved,protected_api_floor_units::int protected_floor,physically_reserved_units::int fids_reserved FROM clean.phase5_fids_cycle_budget_v39 WHERE manifest_sha256=$1",[m]);
  if(cycle.rowCount!==1)hold("CYCLE");
  const caps=(await c.query("SELECT category,ceiling_units::int cap FROM clean.phase5_fids_cycle_rest_category_cap_v39 WHERE manifest_sha256=$1 ORDER BY category",[m])).rows;
  const days=(await c.query("SELECT charge_day_utc::text day,daily_api_ceiling::int daily_ceiling,daily_other_reserved_units::int other_reserved,physically_reserved_units::int fids_reserved FROM clean.phase5_fids_utc_charge_budget_v39 WHERE manifest_sha256=$1 ORDER BY charge_day_utc",[m])).rows;
  const rows=(await c.query(P6_CATEGORY_ACCOUNTING_SQL,[m])).rows;
  const out=reconcileP5BRestBudget({rows,caps,days,cycle:cycle.rows[0],observedAtUtc:new Date(w.at).toISOString()},expected);
  attempted=true;await c.query("ROLLBACK");open=false;return out;
 }finally{if(open&&!attempted)await c.query("ROLLBACK").catch(()=>{});}
}
async function cli(){
 if(process.argv.length!==2||process.env.GITHUB_ACTIONS==="true"||process.env.ADB_AUTO_COLLECT!=="0"||process.env.V39_PHASE6_PROCESS_ARMED!=="0"||
  process.env.V39_PHASE6_OWNER_APPROVED!=="0"||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0"||[process.env.AERODATABOX_API_KEY,process.env.RAPIDAPI_KEY,process.env.AERODATABOX_WEBHOOK_SECRET,process.env.V39_DATABASE_RUNTIME_URL].some(Boolean))hold("OWNER_NO_PROVIDER_SCOPE");
 const u=new URL(process.env.DATABASE_URL??"");
 if(!["postgresql:","postgres:"].includes(u.protocol)||decodeURIComponent(u.username)!=="neondb_owner"||!u.password||!u.hostname.endsWith(".neon.tech")||u.pathname!=="/neondb"||u.searchParams.getAll("sslmode").length!==1||!["require","verify-full"].includes(u.searchParams.get("sslmode")))hold("OWNER_TLS");
 u.searchParams.set("sslmode","verify-full");
 const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
 const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:30000});
 try{await c.connect();const out=await readP5BRestBudget(c);console.log(JSON.stringify(out));if(out.mismatchCount)process.exitCode=2;}
 finally{await c.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(e=>{console.error(/^HOLD_P5B_BUDGET_[A-Z_]+$/.test(e?.message??"")?e.message:"HOLD_P5B_BUDGET_READBACK_UNVERIFIED");process.exitCode=2;});
