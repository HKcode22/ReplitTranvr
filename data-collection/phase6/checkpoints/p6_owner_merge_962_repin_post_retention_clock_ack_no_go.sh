#!/usr/bin/env bash
# Exact reviewed merge, STOP-only pin succession and existing no-provider checks.
# No new paid approval, calendar, key, migration, provider call or SOURCE enable.
set -Eeuo pipefail
set +x
umask 077
export REPO=HKcode22/ReplitTranvr RELAY=HKcode22/TravnrClockRelay
export OLD=e058b9d0817151d4b10282c9242c6c8ebeef7814
export HEADPIN=609341b862144a91c49e1b58fe1f3cb669c25d28
export CODE=6daa7156f9f987201959b3f4157adb9a15e58828
export RELAY_PIN=046d89d341fa9f24524ea11e2778e273e3f39533
export ENV_NAME=phase6-protected-runtime
export AUTH="$HOME/.travnr-phase6-source-auth-exact-962-3ae55fabcc03ac41/auth.json"
export AUTH_SHA=3ae55fabcc03ac4112c7b7d07c63e2454dc3242fe3f1cafd67026722346e482c
export BRIDGE=ac3eefb6cc7bc016347d10d94e6f8a7e5d71f11357a730422b9c50e3f45ff655
export JDIR="$HOME/.travnr-phase6-final-transition-609341b8"
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET DATABASE_URL V39_DATABASE_RUNTIME_URL NODE_TLS_REJECT_UNAUTHORIZED GITHUB_ACTIONS
hold(){ echo "HOLD_P6_FINAL_TRANSITION_$1" >&2; exit 2; }
[[ "$#" == 1 && "$1" == "MERGE_EXACT_OWNER_REVIEWED_962_AND_VERIFY_NO_PAID_GO" ]] || hold CONFIRM
[[ ! -e "$JDIR" ]] || hold EXISTING_TRANSITION_JOURNAL_RECONCILE_NO_REPLAY
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export TMP
gh auth status --hostname github.com >/dev/null
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER_IDENTITY
[[ "$(sha256sum "$AUTH" | cut -d' ' -f1)" == "$AUTH_SHA" ]] || hold AUTH_BYTES
main(){ gh api "repos/$REPO/git/ref/heads/main" --jq .object.sha; }
[[ "$(main)" == "$OLD" ]] || hold MAIN_MOVED
[[ "$(gh api "repos/$REPO/pulls/962" --jq .head.sha)" == "$HEADPIN" ]] || hold HEAD_MOVED
# Bounded wait for the actual CI already running. No reruns or auto-merge.
timeout 900 gh pr checks 962 -R "$REPO" --watch --interval 10 --fail-fast || hold SUCCESSOR_CI_NOT_GREEN
gh api "repos/$REPO/commits/$HEADPIN/check-runs?per_page=100" > "$TMP/checks"
jq -e '.total_count==43 and ([.check_runs[]|select(.status=="completed" and .conclusion=="success")]|length)==20 and ([.check_runs[]|select(.status=="completed" and .conclusion=="skipped")]|length)==23' "$TMP/checks" >/dev/null || hold EXACT_SUCCESSOR_CI
git fetch --quiet --no-tags origin main phase6/20261122-runtime-environment-capacity-review
git show "$HEADPIN:data-collection/phase5/evidence/phase6-operational-bridge-$BRIDGE.json" > "$TMP/bridge"
[[ "$(sha256sum "$TMP/bridge" | cut -d' ' -f1)" == "$BRIDGE" ]] || hold BRIDGE_BYTES
git diff --no-renames --name-only "$CODE" "$HEADPIN" > "$TMP/evidence-paths"
[[ "$(wc -l < "$TMP/evidence-paths" | tr -d ' ')" == 3 ]] || hold EVIDENCE_ONLY
grep -Ev '^(data-collection/evidence/ledgers/V3\.9_PHASE6_SOURCE_ENABLE_APPROVALS\.json|data-collection/phase5/evidence/phase6-(operational-bridge|prior-source-approval)-[a-f0-9]{64}\.json)$' "$TMP/evidence-paths" && hold EVIDENCE_SCOPE || true
[[ "$(git rev-parse "$HEADPIN^")" == "$CODE" ]] || hold EVIDENCE_PARENT
gh api "repos/$REPO/git/blobs/34156ac65811165c0d217e7175f8643eeef55761" --jq .content | base64 --decode > "$TMP/validator.cjs"
[[ "$(git hash-object "$TMP/validator.cjs")" == 34156ac65811165c0d217e7175f8643eeef55761 ]] || hold VALIDATOR_BYTES
node --input-type=module <<'NODE'
import fs from "node:fs";
import path from "node:path";
import {createHash,createPublicKey,randomBytes} from "node:crypto";
import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
const e=process.env,repo=e.REPO,relay=e.RELAY,old=e.OLD,head=e.HEADPIN,envName=e.ENV_NAME,jdir=e.JDIR;
const need=(x,s)=>{if(!x)throw Error("HOLD_P6_FINAL_TRANSITION_"+s)};
const gh=(a,input)=>execFileSync("gh",a,{input,encoding:"utf8",stdio:[input===undefined?"ignore":"pipe","pipe","pipe"],timeout:60000,maxBuffer:8*1024*1024}).trim();
const api=p=>JSON.parse(gh(["api",p]));
const remote=r=>gh(["api","repos/"+r+"/git/ref/heads/main","--jq",".object.sha"]);
const sha=b=>createHash("sha256").update(b).digest("hex"),hash=x=>sha(JSON.stringify(x));
const git=(...a)=>execFileSync("git",a,{stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:8*1024*1024});
const cleanDir=p=>{const s=fs.lstatSync(p);need(s.isDirectory()&&!s.isSymbolicLink()&&(s.mode&0o077)===0&&s.uid===process.getuid(),"PRIVATE_DIRECTORY");return p};
const read=p=>{const s=fs.lstatSync(p);need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&(s.mode&0o077)===0&&s.uid===process.getuid()&&s.size<2000000,"PRIVATE_FILE");return fs.readFileSync(p)};
const json=p=>JSON.parse(read(p).toString("utf8"));
const secretMap=(where)=>{const a=api("repos/"+repo+(where==="repo"?"/actions/secrets":"/environments/"+envName+"/secrets")+"?per_page=100");need(a.total_count===a.secrets.length,"SECRET_INVENTORY");return new Map(a.secrets.map(x=>[x.name,x.updated_at]))};
const vars=r=>Object.fromEntries(JSON.parse(gh(["variable","list","-R",r,"--limit","500","--json","name,value"])).map(x=>[x.name,x.value]));
const modes=["P6_NONPAID_SOURCE_SCHEDULE_ENABLED","P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NATIVE_LATER_RUNTIME_ENABLED","P6_NATIVE_POST_PRODUCER_ENABLED","P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED","P6_PRIVATE_T24_EXECUTION_ENABLED","P6_PRIVATE_LATER_ENROLL_ENABLED","P6_PRIVATE_T24_ENROLL_ENABLED","P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED","P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED","P5_CD_GH_PRE_SCHEDULE_ENABLED","P5_CD_GH_T24_SCHEDULE_ENABLED","P6_ROLLING_CONTROLLER_ENABLED","P5_AUTO_SOURCE_DISPATCH_ENABLED","P5_POST_AUTO_DISPATCH_ENABLED","P5_T24_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED","P6_T24_CUSTODY_ENABLED","P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED","P6_ROLLING_DIRECT_RECOVERY_ENABLED","P6_PHASE7_POST_RECOVERY_ENABLED","P5_CD_GH_WATCHDOG_ENABLED","P6_ROLLING_SCHEDULED_ROOT_ENABLED","P6_ROLLING_DYNAMIC_WINDOW_SCOPE_ENABLED","P6_ROLLING_WINDOW_CUSTODY_ENABLED"];
function stopped(pin){
 need(remote(repo)===pin&&remote(relay)===e.RELAY_PIN,"MAIN_DRIFT");
 const v=vars(repo);need(modes.every(n=>["","0","false","OFF"].includes(v[n]??"")),"COLLECTION_MODE_ACTIVE");
 for(const n of ["P5_PRIMARY_FIDS_EXPIRY_ENABLED","P5_PRIMARY_FIDS_BACKSTOP_ENABLED","P6_FULL_RETENTION_BACKSTOP_ENABLED","P7_EXPIRY_ENABLED"])need(v[n]==="true","RETENTION_DISABLED_"+n);
 need(v.P5_PRIMARY_FIDS_DEADLINE_PROFILE==="V0107_VERIFIED_FUTURE_POST_23H_MARGIN"&&v.P6_PRIVATE_EPOCH_EXPIRY_MODE==="APPLY_DUE_ONLY"&&v.P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256==="a596feb9b3d8a1d75c8856a2f2f6bc559a87d58fd18132bbfa0f48428965118e","RETENTION_SCOPE");
 return v;
}
const home=fs.realpathSync(e.HOME),bd=cleanDir(home+"/.travnr-phase6-final-policies-e058b9d0"),pd=cleanDir(home+"/.travnr-phase7-reviewer-keys-reissued-e058b9d0");
const v=json(bd+"/static-values-PRIVATE.json"),w=json(bd+"/six-policy-objects-PRIVATE.json"),b=json(bd+"/bundle-receipt.json"),j=json(bd+"/static-install-journal.json");
const pj=json(pd+"/phase7-final-commissioning-journal.json"),actorj=json(pd+"/disarmed-actor-preflight-flags-journal.json"),postRaw=read(pd+"/post-censor-only-policy.json"),post=JSON.parse(postRaw);
const auth=read(e.AUTH),a=JSON.parse(auth);
need(sha(auth)===e.AUTH_SHA&&a.authorizationId==="AUTH-20261119-P5INERTFREEZE"&&a.predecessorEvidenceIds.length===35&&a.releaseActivation.operationalReleaseEvidenceSha256===e.BRIDGE&&Date.now()<Date.parse(a.releaseActivation.accountEvidenceValidUntilUtc),"AUTH_SCOPE_OR_FRESHNESS");
const led=JSON.parse(git("show",head+":data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json"));
const app=led.approvals.filter(x=>x.authorizationId===a.authorizationId);
need(app.length===1&&app[0].artifactSha256===e.AUTH_SHA&&JSON.stringify(app[0].predecessorEvidenceIds)===JSON.stringify(a.predecessorEvidenceIds),"LEDGER_SCOPE");
need(b.main===old&&b.staticValuesSha256==="a1637fa624ec3a85c3eb21b9f68f9978f078b4f9911197a5fcd640fdcfb1c66f"&&hash(v)===b.staticValuesSha256&&hash(w)===b.policyBundleSha256&&j.main===old&&Object.keys(j.installed).length===31&&Object.keys(v).length===31&&Object.keys(w).length===6,"OLD_BUNDLE_SCOPE");
need(pj.main===old&&actorj.main===old,"ACTOR_JOURNALS");
let rm=secretMap("repo"),em=secretMap("env");
need([...em.keys()].every(n=>!rm.has(n)),"SECRET_SHADOW");
need(Object.keys(v).every(n=>j.installed[n]?.sha256===sha(v[n])&&j.installed[n]?.updatedAt===rm.get(n)),"OLD_STATIC_METADATA");
for(const [n,x] of Object.entries(pj.installed))need(x.updatedAt===rm.get(n),"EXISTING_P7_METADATA_"+n);
for(const n of ["V39_PHASE6_PROCESS_ARMED","V39_PHASE6_OWNER_APPROVED"])need(actorj.metadata[n]?.value==="0"&&actorj.metadata[n]?.updatedAt===rm.get(n),"GLOBAL_STOP_METADATA");
need(pj.installed.P6_PHASE7_POST_PRESERVATION_POLICY_BASE64?.sha256===sha(postRaw.toString("base64"))&&pj.installed.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256?.sha256===sha(sha(postRaw))&&post.nativePostPolicySha256===v.P6_NATIVE_POST_POLICY_SHA256,"EXACT_POST_POLICY");
const env=api("repos/"+repo+"/environments/"+envName),branches=api("repos/"+repo+"/environments/"+envName+"/deployment-branch-policies?per_page=100");
need(env.deployment_branch_policy?.protected_branches===false&&env.deployment_branch_policy?.custom_branch_policies===true&&branches.total_count===1&&branches.branch_policies[0].name==="main"&&branches.branch_policies[0].type==="branch","ENVIRONMENT_MAIN_ONLY");
const flags=["P6_PHASE7_POST_RECOVERY_APPROVED","P6_PHASE7_POST_RECOVERY_REVIEWER_APPROVED","P6_PHASE7_POST_STORAGE_APPROVED","P6_PRIVATE_POST_STORED_REVIEW_APPROVED"];
const wf=git("show",head+":.github/workflows/phase5-one-signed-future-post-v0083-main-manual.yml").toString();
const job=wf.slice(wf.indexOf("  exact-main-post-actors-only:"),wf.indexOf("  exact-signed-one-v0083-future-post:"));
const required=[...new Set(Array.from(job.matchAll(/secrets\.([A-Z0-9_]+)/g),m=>m[1]))];
need(required.length>30&&required.every(n=>rm.has(n)||em.has(n)||flags.includes(n)),"POST_REQUIRED_SECRET_NAMES");
need(em.size+flags.filter(n=>!rm.has(n)&&!em.has(n)).length<=100,"ENV_CAPACITY");
const vr=stopped(old),rv=vars(relay);
need(vr.P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA===old&&vr.P7_EXPIRY_APPROVED_MAIN_SHA===old,"RETENTION_PREDECESSOR");
need(rv.TRAVNR_RELAY_MODE==="MULTI_LANE"&&rv.TRAVNR_RELAY_PRIMARY_ENABLED==="1"&&rv.TRAVNR_RELAY_ROLLING_ENABLED==="1"&&rv.TRAVNR_RELAY_FULL_RETENTION_APPROVED==="1"&&rv.TRAVNR_RELAY_ROLLING_ROUTE==="DIRECT_VERIFY"&&rv.TRAVNR_RELAY_DIRECT_TICK_APPROVED==="0"&&rv.TRAVNR_APPROVED_TARGET_MAIN_SHA===old,"RELAY_STOP_SCOPE");
const validate=createRequire(import.meta.url)(e.TMP+"/validator.cjs");
const names=validate.NAMES;
const codeNames=["V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA"];
const ops={hash,publicFingerprint:pem=>{const k=createPublicKey(pem);need(k.asymmetricKeyType==="ed25519","KEY_TYPE");return sha(k.export({type:"spki",format:"der"}))},byteLength:Buffer.byteLength};
need(names.length===6&&names.every(n=>Buffer.from(v[n],"base64").toString("utf8")===JSON.stringify(w[n]))&&codeNames.every(n=>v[n]===old),"OLD_POLICY_CROSS_BIND");
const daily=w[names[1]];
const p={codeSha:old,manifestSha256:v.V39_P5_MANIFEST_SHA256,calendarSha256:v.V39_P5_CALENDAR_HASH,configSha256:v.V39_P5_CONFIG_HASH,frameSha256:v.V39_P5_FRAME_HASH,releaseSha256:v.V39_P5_RELEASE_SHA256,rightsSha256:v.V39_P5_RIGHTS_SHA256,providerContractSha256:v.V39_P5_PROVIDER_CONTRACT_SHA256,costSha256:v.P6_INERT_COST_ENVELOPE_SHA256,dayPlanSha256s:daily.dayPlanSha256s,airportTimezoneCatalogSha256:"4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",dailyRestCeiling:1900,cycleRestCeiling:49468,minimumProtectedFloor:1000,maxQueriesPerDay:288,nowUtc:new Date().toISOString(),outcomeTailUtc:"2026-12-29T04:00:00.000Z"};
need(p.dayPlanSha256s.length===31&&p.dayPlanSha256s.every((z,i)=>z.sha256===sha(git("show",head+":data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json"))),"DAY_PLAN_BYTES");
validate.validateFinalPolicies(w,p,ops);
function prepare(pin){
 const nv={...v},nw=JSON.parse(JSON.stringify(w)),[t,d,g,x,pt,np]=names.map(n=>nw[n]);
 const replace=(o,k)=>{need(o[k]===old,"OLD_CODE_PIN_"+k);o[k]=pin};
 for(const n of codeNames)nv[n]=pin;
 replace(t,"reviewedCodeSha");replace(d,"approvedCodeSha");replace(g,"approvedCodeSha");replace(d.nativeLaterReview.dayAppendPolicy,"approvedCodeSha");replace(x,"reviewedMainSha");replace(np,"reviewedCodeSha");
 x.dailyPolicySha256=hash(d);x.signingPolicySha256=hash(g);
 validate.validateFinalPolicies(nw,{...p,codeSha:pin},ops);
 for(const n of names)nv[n]=Buffer.from(JSON.stringify(nw[n])).toString("base64");
 for(const n of ["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"])nv[n+"_SHA256"]=sha(Buffer.from(nv[n+"_BASE64"],"base64"));
 need(Object.keys(nv).length===31&&!JSON.stringify(nw).includes(old)&&JSON.stringify(pt)===JSON.stringify(w[names[4]]),"PIN_ONLY_TRANSFORM");
 const nextPost=Buffer.from(JSON.stringify({...post,nativePostPolicySha256:nv.P6_NATIVE_POST_POLICY_SHA256}));
 const changes=Object.fromEntries(Object.keys(nv).filter(n=>nv[n]!==v[n]).map(n=>[n,nv[n]]));
 need(Object.keys(changes).length===16,"EXPECTED_STATIC_PIN_DELTA");
 Object.assign(changes,{P6_PHASE7_POST_PRESERVATION_POLICY_BASE64:nextPost.toString("base64"),P6_PHASE7_POST_PRESERVATION_POLICY_SHA256:sha(nextPost)});
 return {nv,nw,nextPost,changes};
}
prepare(head);
console.log(JSON.stringify({status:"P6_FINAL_RELEASE_PREMERGE_PRIVATE_INPUTS_AND_PIN_TRANSFORM_PASS",oldStaticsVerified:31,existingPolicyCount:6,changedPinValues:18,postFlags:flags.length,providerCalls:0,phase6PaidGo:false}));
const pr=api("repos/"+repo+"/pulls/962");need(pr.head.sha===head&&pr.base.sha===old&&!pr.draft&&!pr.merged&&pr.mergeable===true,"PREMERGE_PR");
stopped(old);
fs.mkdirSync(jdir,{mode:0o700});
const jpath=jdir+"/transition.json",state={oldMain:old,head,expectedTree:git("rev-parse",head+"^{tree}").toString().trim(),phase6PaidGo:false,step:"MERGE_ATTEMPTED_NO_REPLAY",writes:{}};
function save(){const tmp=jpath+"."+randomBytes(6).toString("hex");fs.writeFileSync(tmp,JSON.stringify(state,null,2)+"\n",{mode:0o600,flag:"wx"});fs.renameSync(tmp,jpath);}
save();
const merged=JSON.parse(gh(["api","-X","PUT","repos/"+repo+"/pulls/962/merge","-f","sha="+head,"-f","merge_method=merge"]));
need(merged.merged===true&&/^[a-f0-9]{40}$/.test(merged.sha),"MERGE_ACK_RECONCILE");
const pin=merged.sha;
state.finalMain=pin;state.step="MERGED_AWAITING_PIN_READBACK";save();
for(let i=0;i<15&&remote(repo)!==pin;i++)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);
const m=api("repos/"+repo+"/git/commits/"+pin);
need(remote(repo)===pin&&m.tree.sha===state.expectedTree&&m.parents.length===2&&m.parents[0].sha===old&&m.parents[1].sha===head,"MERGED_TREE_OR_PARENTS");
stopped(pin);
const setVar=(r,n,val)=>{need(remote(repo)===pin,"MAIN_MOVED");gh(["variable","set",n,"-R",r,"--body",val]);need(gh(["variable","get",n,"-R",r])===val,"VARIABLE_READBACK_"+n);state.writes[r+":"+n]={value:val};save()};
for(const n of ["P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA","P7_EXPIRY_APPROVED_MAIN_SHA"])setVar(repo,n,pin);
const next=prepare(pin);
fs.writeFileSync(jdir+"/static-values-PRIVATE.json",JSON.stringify(next.nv),{mode:0o600,flag:"wx"});
fs.writeFileSync(jdir+"/six-policy-objects-PRIVATE.json",JSON.stringify(next.nw),{mode:0o600,flag:"wx"});
fs.writeFileSync(jdir+"/post-censor-only-policy.json",next.nextPost,{mode:0o600,flag:"wx"});
function setSecret(n,value,scope){
 need(remote(repo)===pin,"MAIN_MOVED_DURING_SECRET_PIN");
 const before=secretMap(scope),other=secretMap(scope==="repo"?"env":"repo");
 need(!other.has(n),"SECRET_SHADOW_"+n);
 if(scope==="repo")need(before.has(n),"UNEXPECTED_NEW_GLOBAL_SECRET_"+n);
 const args=["secret","set",n,"-R",repo];if(scope==="env")args.push("--env",envName);
 state.step="SECRET_WRITE_ATTEMPTED_"+n;state.pending={name:n,scope,sha256:sha(value)};save();
 gh(args,value);
 const after=secretMap(scope);need(after.has(n),"SECRET_ACK_"+n);
 state.writes[n]={scope,sha256:sha(value),updatedAt:after.get(n)};delete state.pending;save();
}
for(const [n,value] of Object.entries(next.changes))setSecret(n,value,"repo");
for(const n of flags)setSecret(n,"1",rm.has(n)?"repo":"env");
stopped(pin);
need(actorj.metadata.V39_PHASE6_PROCESS_ARMED.updatedAt===secretMap("repo").get("V39_PHASE6_PROCESS_ARMED")&&actorj.metadata.V39_PHASE6_OWNER_APPROVED.updatedAt===secretMap("repo").get("V39_PHASE6_OWNER_APPROVED"),"GLOBAL_STOP_DRIFT");
state.step="MERGED_AND_DISARMED_PINS_ACKNOWLEDGED";save();
fs.writeFileSync(e.TMP+"/main",pin,{mode:0o600,flag:"wx"});
console.log(JSON.stringify({status:"P6_EXACT_MERGE_AND_DISARMED_DEPLOYMENT_PINS_PASS",main:pin,reviewedTree:state.expectedTree,staticPinUpdates:18,postActorFlags:4,sourceEnabled:false,providerCalls:0,phase6PaidGo:false}));
NODE
PIN="$(cat "$TMP/main")"
export PIN
test "$(main)" = "$PIN"
# Exact fresh no-provider dispatches. An unknown ACK stops; never repeat blindly.
dispatch(){
 local wf="$1" title="$2" key="$3"; shift 3
 local api="repos/$REPO/actions/workflows/$wf/runs?event=workflow_dispatch&branch=main&per_page=100"
 local f="$JDIR/$key.attempt"
 [[ ! -e "$f" ]] || hold ALREADY_ATTEMPTED_RECONCILE
 local initial="$(gh api "$api" --jq ".workflow_runs[] | select(.head_sha==\"$PIN\" and .display_title==\"$title\" and .run_attempt==1) | .id")"
 [[ -z "$initial" ]] || hold EXISTING_EXACT_RUN_RECONCILE
 printf '%s\n' "$PIN" > "$f"
 gh workflow run "$wf" -R "$REPO" --ref main "$@" >&2
 local id=""
 for _ in $(seq 1 45); do
  id="$(gh api "$api" --jq ".workflow_runs[] | select(.head_sha==\"$PIN\" and .display_title==\"$title\" and .run_attempt==1) | .id")"
  [[ "$(grep -c . <<< "$id" || true)" -le 1 ]] || hold MULTIPLE_RUN_ACKS
  [[ "$id" =~ ^[0-9]+$ ]] && break
  sleep 2
 done
 [[ "$id" =~ ^[0-9]+$ ]] || hold DISPATCH_ACK_UNKNOWN_NO_REPLAY
 printf '%s\n' "$id" > "$JDIR/$key.run"
 printf '%s\n' "$id"
}
# Start retention first, then POST without waiting for an unrelated main CI run.
FULL="$(dispatch phase5-primary-fids-expiry-no-provider.yml 'P5 FULL RETENTION BACKSTOP CHILD' retention -f confirm=APPLY_REVIEWED_FULL_RETENTION_BACKSTOP_NO_PROVIDER -f approved_main_sha="$PIN")"
POST="$(dispatch phase5-one-signed-future-post-v0083-main-manual.yml 'P5 POST ACTOR_PREFLIGHT_ONLY' post -f confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER -f frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY -f private_transport=checkout)"
echo "P6_FINAL_MAIN_RETENTION_RUN=$FULL"
echo "P6_FINAL_MAIN_POST_ACTOR_RUN=$POST"
timeout 900 gh run watch "$FULL" -R "$REPO" --exit-status --interval 10
gh api "repos/$REPO/actions/runs/$FULL/jobs?filter=latest&per_page=100" > "$TMP/full-jobs"
for job in primary-fids-expiry phase7-expiry; do
 id="$(jq -er --arg j "$job" --arg p "$PIN" '.jobs[]|select(.name==$j and .head_sha==$p and .run_attempt==1 and .conclusion=="success")|.id' "$TMP/full-jobs")"
 gh run view "$FULL" -R "$REPO" --job "$id" --log > "$TMP/$job.log"
done
node --input-type=module <<'NODE'
import fs from "node:fs";
const only=(f,status)=>{const x=fs.readFileSync(process.env.TMP+"/"+f,"utf8").split(/\r?\n/).flatMap(l=>{const i=l.indexOf("{");if(i<0)return [];try{return [JSON.parse(l.slice(i).trim())]}catch{return []}}).filter(x=>x.status===status);if(x.length!==1)throw Error("HOLD_RETENTION_MARKER_"+status);return x[0]};
const a=only("primary-fids-expiry.log","PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED"),b=only("primary-fids-expiry.log","PRIVATE_EXPIRY_DUE_AT_READBACK_CLEARED"),c=only("phase7-expiry.log","P7_EXPIRY_DUE_ONLY_INDEPENDENT_READBACK");
if([a,b,c].some(x=>x.providerCalls!==0||x.phase6PaidGo!==false)||a.reviewedMainSha!==process.env.PIN||b.reviewedMainSha!==process.env.PIN||a.deadlineEvidenceHold!==false||b.deadlineDueObservedAtInitialRead!==false||a.after?.deletionStopUnresolved!==false||b.after?.deletionStopUnresolved!==false||a.after?.eligibleOriginals!==0||a.after?.hardDueOriginals!==0||["duePackets","dueIndexes","expiredHeads","foreignDuePackets","foreignDueIndexes"].some(k=>b.after?.[k]!==0)||["dueLinks","dueBundles","dueFragments","liveLinksOnDueFragments"].some(k=>c.after?.[k]!==0))throw Error("HOLD_RETENTION_FINAL_READBACK");
console.log(JSON.stringify({status:"P6_FINAL_MAIN_FULL_RETENTION_BASELINE_PASS",hardDuePrimary:0,duePrivate:0,dueResearch:0,providerCalls:0,phase6PaidGo:false,physicalDeadlineSlaCertified:false}));
NODE
test "$(main)" = "$PIN"
test "$(gh api "repos/$RELAY/git/ref/heads/main" --jq .object.sha)" = "$RELAY_PIN"
test "$(gh variable get TRAVNR_RELAY_ROLLING_ROUTE -R "$RELAY")" = DIRECT_VERIFY
test "$(gh variable get TRAVNR_RELAY_DIRECT_TICK_APPROVED -R "$RELAY")" = 0
# Existing relay is already full-retention opt-in. Only repin the target and
# start an exact-main two-hour read-only epoch, NOT actual paid direct ticks.
SINCE="$(node -e 'console.log(new Date().toISOString())')"
gh variable set TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$RELAY" --body "$SINCE"
gh variable set TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RELAY" --body "$PIN"
test "$(gh variable get TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RELAY")" = "$PIN"
test "$(gh variable get TRAVNR_RELAY_ROLLING_SINCE_UTC -R "$RELAY")" = "$SINCE"
printf '%s\n' "$SINCE" > "$JDIR/relay-verify-epoch"
# The existing external scheduled relay also may wake. Let its own guarded,
# read-only route supply the exact target run; do not issue a paid command.
gh workflow run external-clock.yml -R "$RELAY" --ref main -f lane=ROLLING_ROOT
API="repos/$REPO/actions/workflows/phase6-direct-recovery-tick.yml/runs?event=workflow_dispatch&branch=main&per_page=100"
DIRECT=""
for _ in $(seq 1 90); do
 DIRECT="$(gh api "$API" --jq ".workflow_runs[] | select(.head_sha==\"$PIN\" and .display_title==\"P6 DIRECT RECOVERY VERIFY\" and .run_attempt==1) | .id" | head -n 1)"
 [[ "$DIRECT" =~ ^[0-9]+$ ]] && break
 sleep 3
done
[[ "$DIRECT" =~ ^[0-9]+$ ]] || hold RELAY_TARGET_ACK_UNKNOWN_NO_REPLAY
printf '%s\n' "$DIRECT" > "$JDIR/direct.run"
echo "P6_FINAL_MAIN_DIRECT_VERIFY_RUN=$DIRECT"
timeout 900 gh run watch "$POST" -R "$REPO" --exit-status --interval 10
id="$(gh api "repos/$REPO/actions/runs/$POST/jobs?filter=latest&per_page=100" --jq ".jobs[]|select(.name==\"exact-main-post-actors-only\" and .conclusion==\"success\" and .head_sha==\"$PIN\")|.id")"
[[ "$id" =~ ^[0-9]+$ ]] || hold POST_ACTOR_JOB
gh run view "$POST" -R "$REPO" --job "$id" --log > "$TMP/post.log"
node --input-type=module <<'NODE'
import fs from "node:fs";
const rows=fs.readFileSync(process.env.TMP+"/post.log","utf8").split(/\r?\n/).flatMap(l=>{const i=l.indexOf("{");if(i<0)return [];try{return [JSON.parse(l.slice(i).trim())]}catch{return []}}).filter(x=>x.status==="P7_POST_ACTOR_PREFLIGHT_PASS_NO_GO");
if(rows.length!==3||rows.map(x=>x.role).sort().join(",")!=="publisher,reviewer,storage"||rows.some(x=>x.providerCalls!==0||x.databaseWrites!==0||x.observationSigned!==false||x.phase6PaidGo!==false))throw Error("HOLD_POST_ACTOR_READBACK");
console.log(JSON.stringify({status:"P6_FINAL_MAIN_POST_ACTORS_PASS",roles:3,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
NODE
timeout 900 gh run watch "$DIRECT" -R "$REPO" --exit-status --interval 10
id="$(gh api "repos/$REPO/actions/runs/$DIRECT/jobs?filter=latest&per_page=100" --jq ".jobs[]|select(.name==\"direct-readonly-verify\" and .conclusion==\"success\" and .head_sha==\"$PIN\")|.id")"
[[ "$id" =~ ^[0-9]+$ ]] || hold DIRECT_JOB
gh run view "$DIRECT" -R "$REPO" --job "$id" --log > "$TMP/direct.log"
node --input-type=module <<'NODE'
import fs from "node:fs";
const x=fs.readFileSync(process.env.TMP+"/direct.log","utf8").split(/\r?\n/).flatMap(l=>{const i=l.indexOf("{");if(i<0)return [];try{return [JSON.parse(l.slice(i).trim())]}catch{return []}}).filter(z=>z.status==="ACTUAL_DIRECT_CLOCK_READONLY_METADATA_AND_PLAN_PROBE_NO_GO");
if(x.length!==1||x[0].observedMainSha!==process.env.PIN||x[0].providerCalls!==0||x[0].databaseReads!==0||x[0].databaseWrites!==0||x[0].dispatches!==0||x[0].routeStates?.length!==8||x[0].routeStates.some(r=>r.state!=="active"))throw Error("HOLD_DIRECT_ROUTE_READBACK");
console.log(JSON.stringify({status:"P6_FINAL_MAIN_EIGHT_ROUTE_CLOCK_PASS",routes:8,providerCalls:0,phase6PaidGo:false}));
NODE
# Authenticate the relay ACK, not just a target run bearing the expected title.
# Existing cron and the manual wake can overlap; a matching target run ID is
# the proof, not guessing which relay dispatched it.
MATCH=""
for _ in $(seq 1 20); do
 mapfile -t RIDS < <(gh api "repos/$RELAY/actions/workflows/external-clock.yml/runs?event=workflow_dispatch&branch=main&per_page=20" --jq ".workflow_runs[]|select(.head_sha==\"$RELAY_PIN\" and .display_title==\"TRAVNR EXTERNAL CLOCK ROLLING_ROOT\" and .run_attempt==1 and .conclusion==\"success\" and .created_at >= \"$SINCE\")|.id")
 for rid in "${RIDS[@]}"; do
  gh run view "$rid" -R "$RELAY" --log > "$TMP/relay-$rid.log"
  if node --input-type=module - "$TMP/relay-$rid.log" "$DIRECT" "$rid" <<'NODE'
import fs from "node:fs";
const [f,target,relay]=process.argv.slice(2);
const rows=fs.readFileSync(f,"utf8").split(/\r?\n/).flatMap(l=>{const i=l.indexOf("{");if(i<0)return [];try{return [JSON.parse(l.slice(i).trim())]}catch{return []}});
if(!rows.some(x=>x.status==="TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF"&&Number(x.targetRunId)===Number(target))||!rows.some(x=>x.status==="EXTERNAL_WAKE_TARGET_ACK_NOT_EXECUTION_PROOF"&&Number(x.runId)===Number(target)&&Number(x.relayRunId)===Number(relay)))process.exit(2);
NODE
  then MATCH="$rid"; break; fi
 done
 [[ "$MATCH" =~ ^[0-9]+$ ]] && break
 sleep 5
done
[[ "$MATCH" =~ ^[0-9]+$ ]] || hold RELAY_ACK_NOT_VERIFIED
printf '%s\n' "$MATCH" > "$JDIR/relay.run"
echo "P6_FINAL_MAIN_RELAY_ACK=$MATCH"
# Exact-main push CI is a separate check; all protected verification stayed disarmed.
MAINCI=""
for _ in $(seq 1 60); do
 MAINCI="$(gh api "repos/$REPO/actions/runs?head_sha=$PIN&event=push&per_page=100" --jq '.workflow_runs[]|select(.name=="V3.9 Offline Safety")|.id' | head -n1)"
 [[ "$MAINCI" =~ ^[0-9]+$ ]] && break
 sleep 2
done
[[ "$MAINCI" =~ ^[0-9]+$ ]] || hold FINAL_MAIN_CI_NOT_FOUND
echo "P6_FINAL_MAIN_OFFLINE_CI=$MAINCI"
timeout 900 gh run watch "$MAINCI" -R "$REPO" --exit-status --interval 10
test "$(main)" = "$PIN"
printf '%s\n' "$MAINCI" > "$JDIR/main-ci.run"
echo "{\"status\":\"P6_FINAL_RELEASE_PRODUCTION_PRECHECKS_PASS_NO_GO\",\"main\":\"$PIN\",\"retentionRun\":$FULL,\"postRun\":$POST,\"directRun\":$DIRECT,\"mainCiRun\":$MAINCI,\"sourceEnabled\":false,\"phase6PaidGo\":false}"
