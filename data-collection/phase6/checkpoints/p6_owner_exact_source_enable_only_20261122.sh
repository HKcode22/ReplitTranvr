#!/usr/bin/env bash
# Owner-only exact SOURCE enable, separate from paid GO. Never dispatch or arm.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
RR=HKcode22/TravnrClockRelay
HEADPIN=fe3fef5dbddc3577d585f778385677979031cd64
STAGE=795ace55984b44a3d0bffa886d33a5ec11d31927
STAGESHA=8adfc61a2bdc73ebacf17aa16788bfa14b890d2eb501e8ca7435109116f096fc
COSTSHA=cef58dcc4e8009d46e686bb555faab0fe952b9921e8aa3aa13d610ea443e3bf9
AUTH="$HOME/.travnr-phase6-source-auth-exact-962-3ae55fabcc03ac41/auth.json"
AUTHSHA=3ae55fabcc03ac4112c7b7d07c63e2454dc3242fe3f1cafd67026722346e482c
ACCOUNT="$HOME/.travnr-phase6-final-prearm-readonly-fe3fef5d-20261122T060240Z/account.json"
ACCOUNTSHA=174d0167c956bb08c0c03ba5c0c559c95d1050921825934a22780fb189299562
hold(){ echo "HOLD_P6_SOURCE_ONLY_$1" >&2; exit 2; }
[[ "$#" == 1 && "$1" == ENABLE_EXACT_EXISTING_SOURCE_AUTH_NO_PAID_DISPATCH ]] || hold CONFIRM
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
[[ -n "${DATABASE_URL:-}" ]] || hold OWNER_DB_ABSENT
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 V39_P5_APPROVED_CODE_SHA="$STAGE"
unset AERODATABOX_API_KEY AERODATABOX_WEBHOOK_SECRET RAPIDAPI_KEY GITHUB_ACTIONS
export R RR HEADPIN AUTH AUTHSHA ACCOUNT ACCOUNTSHA
preflight(){
node --input-type=module <<'CHECK'
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
const e=process.env,hold=s=>{throw Error("HOLD_P6_SOURCE_ONLY_"+s)},need=(v,s)=>{if(!v)hold(s)};
const gh=(...a)=>execFileSync("gh",a,{encoding:"utf8",stdio:["ignore","pipe","ignore"],timeout:30000}).trim();
const api=p=>JSON.parse(gh("api",p));
const items=(repo,key)=>{const a=JSON.parse(gh("api","--paginate","--slurp","repos/"+repo+"/actions/"+key+"?per_page=100"));return a.flatMap(x=>x[key]);};
const vars=r=>Object.fromEntries(items(r,"variables").map(x=>[x.name,x.value]));
const safe=(p,h)=>{const s=fs.lstatSync(p),b=fs.readFileSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o077)===0&&createHash("sha256").update(b).digest("hex")===h,"PRIVATE_BYTES");return JSON.parse(b)};
const a=safe(e.AUTH,e.AUTHSHA),f=safe(e.ACCOUNT,e.ACCOUNTSHA),now=Date.now();
need(a.authorizationId==="AUTH-20261119-P5INERTFREEZE"&&a.predecessorEvidenceIds.length===35&&now>=Date.parse(a.startNotBeforeUtc)&&now<Date.parse(a.expiresAtUtc)&&now<Date.parse(a.releaseActivation.accountEvidenceValidUntilUtc),"AUTH_TIME_OR_SCOPE");
need(f.status==="FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER"&&f.apiUnitsLimit===60000&&f.apiUnitsRemaining===59968&&f.alertCreditsRemaining===1830&&f.activeBillableSubscriptions===0&&f.providerPaidGets===0&&f.providerMutations===0&&f.balancesStable===true&&f.phase6PaidGo===false&&Date.parse(f.observedAtUtc)<=now,"ACCOUNT_RECEIPT");
need(api("repos/"+e.R+"/git/ref/heads/main").object.sha===e.HEADPIN&&api("repos/"+e.RR+"/git/ref/heads/main").object.sha==="046d89d341fa9f24524ea11e2778e273e3f39533","PIN");
const modes=["P6_NONPAID_SOURCE_SCHEDULE_ENABLED","P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NATIVE_LATER_RUNTIME_ENABLED","P6_NATIVE_POST_PRODUCER_ENABLED","P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED","P6_PRIVATE_T24_EXECUTION_ENABLED","P6_PRIVATE_LATER_ENROLL_ENABLED","P6_PRIVATE_T24_ENROLL_ENABLED","P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED","P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED","P5_CD_GH_PRE_SCHEDULE_ENABLED","P5_CD_GH_T24_SCHEDULE_ENABLED","P6_ROLLING_CONTROLLER_ENABLED","P5_AUTO_SOURCE_DISPATCH_ENABLED","P5_POST_AUTO_DISPATCH_ENABLED","P5_T24_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED","P6_T24_CUSTODY_ENABLED","P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED","P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_PHASE7_POST_RECOVERY_ENABLED","P5_CD_GH_WATCHDOG_ENABLED","P6_ROLLING_SCHEDULED_ROOT_ENABLED","P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED","P6_ROLLING_WINDOW_CUSTODY_ENABLED"];
const v=vars(e.R),rv=vars(e.RR);
need(modes.every(n=>["","0","false","OFF"].includes(v[n]??"")),"COLLECTION_MODE_ACTIVE");
for(const n of ["P5_PRIMARY_FIDS_EXPIRY_ENABLED","P5_PRIMARY_FIDS_BACKSTOP_ENABLED","P6_FULL_RETENTION_BACKSTOP_ENABLED","P7_EXPIRY_ENABLED"])need(v[n]==="true","RETENTION_OFF_"+n);
need(v.P5_PRIMARY_FIDS_DEADLINE_PROFILE==="V0107_VERIFIED_FUTURE_POST_23H_MARGIN"&&v.P6_PRIVATE_EPOCH_EXPIRY_MODE==="APPLY_DUE_ONLY"&&v.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA===e.HEADPIN&&v.P7_EXPIRY_APPROVED_MAIN_SHA===e.HEADPIN,"RETENTION_PIN");
need(rv.TRAVNR_APPROVED_TARGET_MAIN_SHA===e.HEADPIN&&rv.TRAVNR_RELAY_ROLLING_ROUTE==="DIRECT_VERIFY"&&rv.TRAVNR_RELAY_DIRECT_TICK_APPROVED==="0"&&rv.TRAVNR_RELAY_PRIMARY_ENABLED==="1","RELAY_STOP_SCOPE");
const ss=items(e.R,"secrets"),map=new Map(ss.map(x=>[x.name,x.updated_at]));
for(const n of ["V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"])need(Number.isFinite(Date.parse(map.get(n)))&&Date.parse(map.get(n))<=Date.parse("2026-11-22T05:55:16Z"),"GLOBAL_STOP_CHANGED_SINCE_VERIFIED_PREFLIGHT");
const run=api("repos/"+e.R+"/actions/runs/44992100290");
need(run.head_sha===e.HEADPIN&&run.conclusion==="success","RETENTION_RUN");
console.log(JSON.stringify({status:"P6_SOURCE_ONLY_EXISTING_AUTH_ACCOUNT_AND_DISARMED_PINS_PASS",providerCalls:0,phase6PaidGo:false}));
CHECK
}
preflight
ROOT="$(pwd -P)"
TMP="$(mktemp -d)"
W="$TMP/checkout"
cleanup(){ git -C "$ROOT" worktree remove --force "$W" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
git fetch --quiet --no-tags origin main
git -C "$ROOT" worktree add --quiet --detach "$W" "$HEADPIN"
cd "$W"
git merge-base --is-ancestor "$STAGE" "$HEADPIN" || hold STAGE_ANCESTRY
STAGEPATH=data-collection/phase5/evidence/phase6-monday-stage-input-795ace55.json
[[ "$(sha256sum "$STAGEPATH" | cut -d' ' -f1)" == "$STAGESHA" ]] || hold STAGE_BYTES
[[ "$(git hash-object package-lock.json)" == "a9882e5fb747eeef10d3990b72938e46979f5ccc" ]] || hold LOCKFILE_DRIFT
node --input-type=module <<'LOCK'
import fs from "node:fs";
const l=JSON.parse(fs.readFileSync("package-lock.json","utf8")),p=l.packages;
const hold=s=>{throw Error("HOLD_P6_MINIMAL_LOCK_"+s)};
if(l.lockfileVersion!==3||p["node_modules/pg"]?.version!=="8.18.0"||p["node_modules/tsx"]?.version!=="4.21.0")hold("ROOTS");
const todo=["node_modules/pg","node_modules/tsx"],out={};
function resolve(k,n){
 let a=k;
 while(true){
  const x=(a?a+"/":"")+"node_modules/"+n;
  if(p[x])return x;
  if(!a)return null;
  const i=a.lastIndexOf("/node_modules/");a=i<0?"":a.slice(0,i);
 }
}
while(todo.length){
 const k=todo.pop();if(out[k])continue;
 const v=p[k];
 if(!v||v.link||!v.integrity||!v.resolved||/(?:^|\/)vite(?:\/|$)/.test(k))hold("UNEXPECTED_PACKAGE");
 out[k]=v;
 for(const n of Object.keys({...v.dependencies,...v.optionalDependencies,...v.peerDependencies})){
  const x=resolve(k,n);
  if(x)todo.push(x);
  else if(!v.optionalDependencies?.[n]&&!v.peerDependenciesMeta?.[n]?.optional)hold("MISSING_REQUIRED");
 }
}
if(Object.keys(out).length!==45)hold("EXACT_CLOSURE");
const root={name:"p6-owner-verifier-only",version:"1.0.0",dependencies:{pg:"8.18.0"},devDependencies:{tsx:"4.21.0"}};
fs.writeFileSync("package.json",JSON.stringify({...root,private:true,type:"module"},null,2)+"\n");
fs.writeFileSync("package-lock.json",JSON.stringify({name:root.name,version:root.version,lockfileVersion:3,requires:true,packages:{"":root,...out}},null,2)+"\n");
console.log(JSON.stringify({status:"P6_VERIFIER_MINIMAL_LOCK_READY",lockedPackages:45,includesVite:false,registryPolicyUnchanged:true}));
LOCK
( unset DATABASE_URL; npm ci --ignore-scripts --include=dev --no-audit --no-fund )
# Restore the committed manifests before running any release verifier or git add.
git show "$HEADPIN:package.json" > package.json
git show "$HEADPIN:package-lock.json" > package-lock.json
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || hold TEMP_MANIFEST_RESTORE

preflight
# One transition, original immutable ledger + exact bridge + independent DB readback.
# Failure/unknown commit: inspect owner receipt; do not replay.
node --import tsx scripts/v39_phase6_enable_source_owner_v39.ts \
  --enable-exact-existing-source-auth "$STAGEPATH" "$STAGESHA" "$COSTSHA" "$AUTH" "$AUTHSHA"
