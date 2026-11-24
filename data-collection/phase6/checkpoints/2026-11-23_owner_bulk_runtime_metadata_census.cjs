// Owner-side Phase 6 incident census: metadata GETs and READ ONLY DB transaction.
// No secret values, mutations, provider requests, or workflow dispatches.
"use strict";
const {execFileSync}=require("node:child_process");
const R="HKcode22/ReplitTranvr",L="HKcode22/TravnrClockRelay",E="phase6-protected-runtime";
const S="c8e065d665ccacb6d2575070e94c5500b7583044",LS="c5a8763f2dfd20d9dbe7d6badc7749ed62f43eed";
function gh(...a){return execFileSync("gh",a,{encoding:"utf8",maxBuffer:16*1024*1024,timeout:60000,stdio:["ignore","pipe","pipe"]}).trim();}
function api(path,...a){return gh("api",path,...a);}
function lines(s){return s?s.split("\n"):[];}
function getNames(path){return new Set(lines(api(path,"--paginate","--jq",".secrets[].name")));}
function getVars(path){return new Map(lines(api(path,"--paginate","--jq",'.variables[] | [.name,.value] | @tsv')).map(l=>{const i=l.indexOf("\t");return [l.slice(0,i),l.slice(i+1)];}));}
const targets=[
["phase6-direct-recovery-tick.yml","direct-protected-recovery-tick"],
["phase5-source-upcoming-queue-main-scheduled-readonly.yml","separately-authorized-stored-source-children","separately-authorized-current-private-post-children","separately-authorized-native-post-producer"],
["phase6-private-later-enrollment.yml","enroll-current-signed-day","enroll-current-signed-t24-day"],
["phase5-cd-github-one-queued-t24-witness-main-manual.yml","current-private-native-t24"],
["phase5-cd-github-bounded-pre-tick.yml","bounded-reviewed-real-pre"],
["phase6-nonpaid-source-day-prepare-publish.yml","protected-main-one-day-nonpaid"],
["phase5-cd-github-existing-queue-lease-watchdog.yml","reviewed-existing-queue-watchdog"],
["phase5-six-slot-approved-early-four-airport-draw.yml","gated-exact-early-parent"],
["phase5-private-blob-retention-readonly-sentinel-no-provider.yml","private-main-restricted-metadata-sentinel"],
["phase5-one-signed-day-source-child-dispatch.yml","exact-private-source-existing-one-get-child"],
["phase5-one-signed-future-post-v0083-main-manual.yml","exact-signed-one-v0083-future-post"]
];
const directRequired=["P6_ROLLING_DIRECT_RECOVERY_APPROVED","V39_P5_APPROVED_CODE_SHA","V39_PHASE5_FREEZE_SIGNED","V39_PHASE5_SOURCE_RIGHTS_APPROVED","V39_P5_SEVEN_REST_BUDGET_SIGNED","V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED","P5_CD_GH_PRE_STOP","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH","V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256"];
function safe(v){if(v===undefined)return "ABSENT";if(v==="")return "EMPTY";return /^(0|1|true|false|stored|PHASE6_APPROVED|MULTI_LANE|DIRECT_TICK|DIRECT_VERIFY|CLOCK_ONLY)$/.test(v)||/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)?v:"PRESENT_OTHER_VALUE_NOT_SHOWN";}
async function main(){
if(api("user","--jq",".login")!=="HKcode22")throw Error("OWNER_REQUIRED");
if(api("repos/"+R+"/git/ref/heads/main","--jq",".object.sha")!==S||api("repos/"+L+"/git/ref/heads/main","--jq",".object.sha")!==LS)throw Error("PIN_CHANGED_REVIEW_FIRST");
const repo=getNames("repos/"+R+"/actions/secrets?per_page=100");
const env=getNames("repos/"+R+"/environments/"+E+"/secrets?per_page=100");
const rv=getVars("repos/"+R+"/actions/variables?per_page=100");
const ev=getVars("repos/"+R+"/environments/"+E+"/variables?per_page=100");
const lv=getVars("repos/"+L+"/actions/variables?per_page=100");
console.log(JSON.stringify({kind:"scope",repoSecretCount:repo.size,environmentSecretCount:env.size,rolling:safe(lv.get("TRAVNR_RELAY_ROLLING_ENABLED")),retention:safe(lv.get("TRAVNR_RELAY_PRIMARY_ENABLED")),relayRoute:safe(lv.get("TRAVNR_RELAY_ROLLING_ROUTE")),relayEpoch:safe(lv.get("TRAVNR_RELAY_ROLLING_SINCE_UTC"))}));
function loc(k,p){return p&&env.has(k)?(repo.has(k)?"ENV_SHADOWS_REPO":"ENV"):repo.has(k)?"REPO":"ABSENT";}
console.log(JSON.stringify({kind:"direct_required_presence",missing:directRequired.filter(k=>loc(k,true)==="ABSENT"),sessionConflictSecret:loc("P6_ROLLING_SESSION_APPROVED",true),note:"Names only; not effective values."}));
for(const [wf,...jobs] of targets){
 const source=Buffer.from(api("repos/"+R+"/contents/.github/workflows/"+wf+"?ref="+S,"--jq",".content"),"base64").toString("utf8");
 const all=source.split(/\r?\n/);
 for(const j of jobs){
  const i=all.indexOf("  "+j+":");if(i<0)throw Error("JOB_NOT_FOUND_"+j);
  let end=i+1;while(end<all.length&&!/^  [A-Za-z0-9_-]+:\s*$/.test(all[end]))end++;
  const block=all.slice(i,end).join("\n"),p=/^\s{4}environment:\s*phase6-protected-runtime\s*$/m.test(block);
  const refs=[...new Set([...block.matchAll(/\bsecrets\.([A-Z0-9_]+)/g)].map(m=>m[1]))].sort();
  const vars=[...new Set([...block.matchAll(/\bvars\.([A-Z0-9_]+)/g)].map(m=>m[1]))].sort();
  console.log(JSON.stringify({kind:"job_metadata",workflow:wf,job:j,protectedEnvironment:p,referencedSecrets:refs.length,absentReferences:refs.filter(k=>loc(k,p)==="ABSENT"),shadowedReferences:refs.filter(k=>loc(k,p)==="ENV_SHADOWS_REPO"),variables:Object.fromEntries(vars.map(k=>[k,{repository:safe(rv.get(k)),environment:p?safe(ev.get(k)):"NOT_APPLICABLE"}])),note:"Absent references may be conditional or deliberately unset; do not set them automatically."}));
 }
}
const manifest="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e";
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL_MISSING");
const {Client}=require("pg");const db=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
try{
 await db.connect();await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");await db.query("SET LOCAL statement_timeout='10s'");
 const result=await db.query("SELECT clock_timestamp() AS observed_utc,current_database()='neondb' AS correct_db,current_setting('transaction_read_only')='on' AS read_only, NOT pg_is_in_recovery() AS primary,(SELECT COUNT(*)::int FROM clean.phase5_fids_physical_attempt_v39 WHERE manifest_sha256=$1) AS source_attempts,(SELECT COUNT(*)::int FROM clean.phase5_other_rest_physical_reservation_v39 WHERE manifest_sha256=$1) AS other_rest_reservations,(SELECT COUNT(*)::int FROM clean.adb_incident_stop WHERE NOT resolved) AS unresolved_stops,(SELECT COUNT(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=1) AS day1_draw_rows,(SELECT COUNT(*)::int FROM clean.adb_sampling_draw WHERE run_day_index=2) AS day2_draw_rows",[manifest]);
 await db.query("COMMIT");const row=result.rows[0];console.log(JSON.stringify({kind:"database_census",...row}));if(!row.correct_db||!row.read_only||!row.primary)throw Error("WRONG_DATABASE_OR_TRANSACTION");
}finally{await db.end().catch(()=>{});}
console.log("P6_OWNER_BULK_METADATA_AND_READONLY_CENSUS_COMPLETE_NOT_GO");
}
main().catch(e=>{console.error("HOLD_P6_OWNER_CENSUS",e.code||(/^[A-Z0-9_]+$/.test(e.message)?e.message:e.name));process.exitCode=2;});
