#!/usr/bin/env bash
# Only reviewed final-main deployment pin changes; no provider/DB writes.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
A="repos/$R"
E=phase6-protected-runtime
OLD=fe3fef5dbddc3577d585f778385677979031cd64
PIN=dfa7221990e21deacb45fdbacbaadc64a73bc907
H=3bb42d7c6ae71896de592665abe2f95b1d787ffb
VALIDATOR=34156ac65811165c0d217e7175f8643eeef55761
AUTH="$HOME/.travnr-phase6-source-auth-exact-962-3ae55fabcc03ac41/auth.json"
hold(){ echo "HOLD_P6_FINAL_PIN_REBIND_$1" >&2; exit 2; }
[[ "$#" == 1 && "$1" == REBIND_ONLY_REVIEWED_FINAL_MAIN_PINS_NO_PAID_GO ]] || hold CONFIRM
pin(){ [[ "$(gh api "$A/git/ref/heads/main" --jq .object.sha)" == "$PIN" ]] || hold MAIN_MOVED; }
pin
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
gh api "$A/pulls/964" | jq -e --arg p "$PIN" --arg h "$H" '.merged==true and .merge_commit_sha==$p and .head.sha==$h' >/dev/null || hold MERGE_ID
[[ "$(sha256sum "$AUTH" | cut -d' ' -f1)" == 3ae55fabcc03ac4112c7b7d07c63e2454dc3242fe3f1cafd67026722346e482c ]] || hold AUTH
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
gh api "$A/git/blobs/$VALIDATOR" --jq .content | base64 --decode >"$T/validator.cjs"
[[ "$(git hash-object "$T/validator.cjs")" == "$VALIDATOR" ]] || hold VALIDATOR
gh api "$A/actions/secrets?per_page=100" --paginate --jq '.secrets[].name' | sort -u >"$T/repo"
gh api "$A/environments/$E/secrets?per_page=100" --paginate --jq '.secrets[].name' | sort -u >"$T/env"
comm -12 "$T/repo" "$T/env" >"$T/dup"
[[ ! -s "$T/dup" ]] || hold SECRET_SHADOW
gh api "$A/environments/$E/deployment-branch-policies?per_page=100" | jq -e '.total_count==1 and .branch_policies[0].name=="main" and .branch_policies[0].type=="branch"' >/dev/null || hold ENV_SCOPE
# No downloads from npm. Use the prior exact 31-value file, previously
# independently read back by Actions run 44985990359, plus existing POST policy.
export P6_TMP="$T" P6_OLD="$OLD" P6_PIN="$PIN"
node --input-type=module <<'JS'
import fs from "node:fs";
import path from "node:path";
import {createHash,createPublicKey} from "node:crypto";
import {createRequire} from "node:module";
const e=process.env,t=e.P6_TMP,old=e.P6_OLD,pin=e.P6_PIN;
const need=(x,s)=>{if(!x)throw Error("HOLD_P6_FINAL_PIN_"+s)};
const sha=x=>createHash("sha256").update(x).digest("hex"),str=x=>JSON.stringify(x),hash=x=>sha(str(x));
const names=["V39_P5_APPROVED_CODE_SHA","P6_NONPAID_SOURCE_APPROVED_MAIN_SHA","V39_P5_ACTUAL_NATIVE_REVIEW_APPROVED_CODE_SHA","P5_CD_GH_PRE_APPROVED_CODE_SHA","V39_P5_POST_APPROVED_CODE_SHA","P6_PRIVATE_SOURCE_PARENT_RO_MAIN_SHA","V39_P5_QUEUE_APPROVED_CODE_SHA","V39_P5_MANIFEST_SHA256","V39_P5_CALENDAR_HASH","V39_P5_CONFIG_HASH","V39_P5_FRAME_HASH","V39_P5_RELEASE_SHA256","V39_P5_RIGHTS_SHA256","V39_P5_PROVIDER_CONTRACT_SHA256","P6_INERT_STAGE_INPUT_JSON","P6_INERT_STAGE_INPUT_SHA256","P6_INERT_COST_ENVELOPE_SHA256","P6_PRIVATE_POST_OUTCOME_TAIL_HOURS","V39_P5_POST_PROVIDER_CONTRACT_SHA256","V39_P5_POST_CATEGORY_BUDGET_SHA256","V39_P5_POST_PRICE_SHA256","P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64","P6_NONPAID_DAILY_POLICY_BASE64","P6_NONPAID_SIGNING_POLICY_BASE64","P6_NONPAID_TRANSPORT_TRUST_BASE64","P6_PRIVATE_POST_REVIEWER_TRUST_BASE64","P6_NATIVE_POST_POLICY_BASE64","P6_NONPAID_DAILY_POLICY_SHA256","P6_NONPAID_SIGNING_POLICY_SHA256","P6_NONPAID_TRANSPORT_TRUST_SHA256","P6_NATIVE_POST_POLICY_SHA256"];
const expected="7e07047d7173cbcf84e966ab869d66477efef36df38c83c58325396f31b83728";
const policyNames=names.slice(21,27),staticMatches=new Map(),posts=new Map();
const home=fs.realpathSync(e.HOME),uid=process.getuid();
const privateDir=s=>s.isDirectory()&&!s.isSymbolicLink()&&s.uid===uid&&(s.mode&0o077)===0;
const privateFile=s=>s.isFile()&&!s.isSymbolicLink()&&s.uid===uid&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=6000000;
function addPost(raw){
 try{const obj=JSON.parse(raw.toString("utf8"));if(obj?.schema==="v39.phase7.independent-post-settlement-policy.v1")posts.set(sha(raw),{raw,obj})}catch{}
}
function consider(x,raw,depth=0){
 if(!x||typeof x!=="object"||Array.isArray(x)||depth>3)return;
 if(names.every(k=>typeof x[k]==="string")){
  const v=Object.fromEntries(names.map(k=>[k,x[k]]));
  if(hash(v)===expected)staticMatches.set(expected,v);
 }
 if(x.schema==="v39.phase7.independent-post-settlement-policy.v1")addPost(raw??Buffer.from(str(x)));
 const b=x.P6_PHASE7_POST_PRESERVATION_POLICY_BASE64, h=x.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256;
 if(typeof b==="string"&&typeof h==="string"){
  const q=Buffer.from(b,"base64");if(q.toString("base64")===b&&sha(q)===h)addPost(q);
 }
 for(const [k,v] of Object.entries(x))if(v&&typeof v==="object"&&!Array.isArray(v)&&/policy|static|values|binding|secrets|post/i.test(k))consider(v,undefined,depth+1);
}
let scanned=0;
function scan(dir,depth){
 if(depth>4)return;
 for(const n of fs.readdirSync(dir,{withFileTypes:true})){
  const f=path.join(dir,n.name),s=fs.lstatSync(f);
  if(privateDir(s)){if(!/node_modules|^\.git$|^plans$/.test(n.name))scan(f,depth+1);continue;}
  if(!privateFile(s)||!/\.json$/i.test(n.name)||!/(post|policy|policies|static|values|binding|secrets|bundle|receipt)/i.test(n.name))continue;
  if(++scanned>2000)throw Error("HOLD_P6_FINAL_PIN_SCAN_BOUND");
  const raw=fs.readFileSync(f);let x;try{x=JSON.parse(raw)}catch{continue;}
  consider(x,raw);
 }
}
for(const n of fs.readdirSync(home,{withFileTypes:true})){
 if(!/^\.(?:travnr|phase5|phase6|phase7)[-_]/.test(n.name))continue;
 const f=path.join(home,n.name);if(privateDir(fs.lstatSync(f)))scan(f,0);
}
need(staticMatches.size===1,"EXACT_PRIOR_31_VALUES_NOT_FOUND");
const original=staticMatches.get(expected),v={...original};
const parse=k=>{const raw=Buffer.from(v[k],"base64");need(raw.toString("base64")===v[k],"POLICY_BASE64");const x=JSON.parse(raw);need(str(x)===raw.toString("utf8"),"POLICY_CANONICAL");return x};
const w=Object.fromEntries(policyNames.map(k=>[k,parse(k)]));
const [source,daily,signing,transport,postTrust,native]=policyNames.map(k=>w[k]);
const oldNative=v.P6_NATIVE_POST_POLICY_SHA256;
const matches=[...posts.values()].filter(({obj:p})=>p.manifestSha256===v.V39_P5_MANIFEST_SHA256&&p.rightsSha256===v.V39_P5_RIGHTS_SHA256&&p.nativePostPolicySha256===oldNative&&p.unverifiedLabelDisposition==="CENSOR_AFTER_REVIEWED_POST_OBSERVATION"&&p.independentBoundedSettlementApproved===true&&Date.parse(p.validFromUtc)<=Date.now()&&Date.parse(p.validUntilUtc)>Date.now());
const unique=new Map(matches.map(x=>[str(x.obj),x]));
need(unique.size===1,"EXISTING_EXACT_POST_POLICY_NOT_FOUND_OR_AMBIGUOUS");
const priorPost=[...unique.values()][0].obj;
const require=createRequire(import.meta.url),validator=require(t+"/validator.cjs");
const ctx={codeSha:old,manifestSha256:v.V39_P5_MANIFEST_SHA256,calendarSha256:v.V39_P5_CALENDAR_HASH,releaseSha256:v.V39_P5_RELEASE_SHA256,rightsSha256:v.V39_P5_RIGHTS_SHA256,configSha256:v.V39_P5_CONFIG_HASH,frameSha256:v.V39_P5_FRAME_HASH,providerContractSha256:v.V39_P5_PROVIDER_CONTRACT_SHA256,costSha256:v.P6_INERT_COST_ENVELOPE_SHA256,dayPlanSha256s:daily.dayPlanSha256s,airportTimezoneCatalogSha256:"4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534",dailyRestCeiling:1900,cycleRestCeiling:49468,minimumProtectedFloor:1000,maxQueriesPerDay:288,nowUtc:new Date().toISOString(),outcomeTailUtc:"2026-12-29T04:00:00.000Z"};
const ops={hash,publicFingerprint:pem=>{const key=createPublicKey(pem);need(key.asymmetricKeyType==="ed25519","PUBLIC_KEY");return sha(key.export({type:"spki",format:"der"}))},byteLength:Buffer.byteLength};
validator.validateFinalPolicies(w,ctx,ops);
need(names.slice(0,7).every(k=>v[k]===old)&&hash(native)===oldNative,"OLD_CODE_AND_NATIVE_PIN");
console.log(JSON.stringify({status:"P6_CONFIRMED_STALE_POST_EMBEDDED_CODE_PINS",oldMain:old,finalMain:pin,sourceTrustCodeMatchesOld:source.reviewedCodeSha===old,nativePostCodeMatchesOld:native.reviewedCodeSha===old,exactPriorStaticReadbackMatched:true}));
for(const k of names.slice(0,7))v[k]=pin;
source.reviewedCodeSha=pin;daily.approvedCodeSha=pin;daily.nativeLaterReview.dayAppendPolicy.approvedCodeSha=pin;signing.approvedCodeSha=pin;transport.reviewedMainSha=pin;transport.dailyPolicySha256=hash(daily);transport.signingPolicySha256=hash(signing);native.reviewedCodeSha=pin;
validator.validateFinalPolicies(w,{...ctx,codeSha:pin},ops);
for(const k of policyNames)v[k]=Buffer.from(str(w[k])).toString("base64");
for(const k of names.slice(27)){v[k]=sha(Buffer.from(v[k.replace(/_SHA256$/,"_BASE64")],"base64"))}
const post={...priorPost,nativePostPolicySha256:v.P6_NATIVE_POST_POLICY_SHA256};
need(str({...post,nativePostPolicySha256:oldNative})===str(priorPost),"POST_NON_PIN_CHANGE");
const changes=Object.fromEntries(names.filter(k=>v[k]!==original[k]).map(k=>[k,v[k]]));
const expectedChanges=[...names.slice(0,7),...policyNames.filter(k=>k!=="P6_PRIVATE_POST_REVIEWER_TRUST_BASE64"),...names.slice(27)];
need(Object.keys(changes).length===expectedChanges.length&&expectedChanges.every(k=>Object.hasOwn(changes,k)),"EXACT_PIN_DELTA");
changes.P6_PHASE7_POST_PRESERVATION_POLICY_BASE64=Buffer.from(str(post)).toString("base64");
changes.P6_PHASE7_POST_PRESERVATION_POLICY_SHA256=hash(post);
const out=path.join(home,".travnr-phase6-final-pin-rebind-"+pin.slice(0,12));
try{fs.mkdirSync(out,{mode:0o700})}catch(err){if(err.code!=="EEXIST")throw err}
need(privateDir(fs.lstatSync(out)),"OUTPUT_SCOPE");
function put(dir,name,raw){const f=path.join(dir,name);try{fs.writeFileSync(f,raw,{mode:0o600,flag:"wx"})}catch(err){if(err.code!=="EEXIST"||!privateFile(fs.lstatSync(f))||!fs.readFileSync(f).equals(Buffer.from(raw)))throw Error("HOLD_P6_FINAL_PIN_LOCAL_OUTPUT_DRIFT")}}
put(out,"static-values-PRIVATE.json",str(v));put(out,"post-preservation-policy-PRIVATE.json",str(post));put(out,"changed-values-PRIVATE.json",str(changes));put(t,"changes.json",str(changes));
console.log(JSON.stringify({status:"P6_REVIEWED_PIN_ONLY_POLICY_REBIND_VERIFIER_PASS",changedValues:Object.keys(changes).length,priorStaticSha256:expected,finalStaticSha256:hash(v),finalPostPolicySha256:hash(post),main:pin,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
JS
# No writes until both existing validators and the exact prior byte check pass.
while IFS= read -r k; do
 grep -Fxq "$k" "$T/repo" || grep -Fxq "$k" "$T/env" || hold "MISSING_EXISTING_SECRET_$k"
done < <(jq -r 'keys[]' "$T/changes.json")
for k in V39_PHASE6_PROCESS_ARMED V39_PHASE6_OWNER_APPROVED; do
 grep -Fxq "$k" "$T/repo" || hold GLOBAL_STOP
 gh secret set "$k" -R "$R" --body 0
done
while IFS= read -r k; do
 pin
 if grep -Fxq "$k" "$T/repo"; then
  jq -j --arg k "$k" '.[$k]' "$T/changes.json" | gh secret set "$k" -R "$R"
 else
  jq -j --arg k "$k" '.[$k]' "$T/changes.json" | gh secret set "$k" -R "$R" --env "$E"
 fi
done < <(jq -r 'keys[]' "$T/changes.json")
pin
echo '{"status":"P6_FINAL_MAIN_PIN_ONLY_SECRET_INSTALL_ACK_NO_GO","providerCalls":0,"databaseWrites":0,"sourceEnablementNotModified":true,"phase6PaidGo":false}'
WF=phase5-one-signed-future-post-v0083-main-manual.yml
Q="$A/actions/workflows/$WF/runs?branch=main&event=workflow_dispatch&per_page=100"
gh api "$Q" --jq '.workflow_runs[].id' | sort -n >"$T/before"
# New first-attempt read-only actor preflight, not rerun of failed workflow.
gh workflow run "$WF" -R "$R" --ref main -f confirm=ONLY_POST_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER -f frozen_future_post_packet=ACTOR_PREFLIGHT_ONLY -f private_transport=checkout
RUN=""
for n in $(seq 1 60); do
 gh api "$Q" | jq -r --arg p "$PIN" '.workflow_runs[]|select(.head_sha==$p and .run_attempt==1 and .display_title=="P5 POST ACTOR_PREFLIGHT_ONLY")|.id' | sort -n >"$T/after"
 comm -13 "$T/before" "$T/after" >"$T/new"
 N="$(wc -l <"$T/new" | tr -d ' ')"; [[ "$N" -le 1 ]] || hold POST_ACK_AMBIGUOUS
 if [[ "$N" == 1 ]]; then RUN="$(cat "$T/new")"; break; fi
 sleep 2
done
[[ "$RUN" =~ ^[1-9][0-9]*$ ]] || hold POST_ACK
echo "{\"status\":\"P6_POST_ACTORS_REBOUND_RUN_DISPATCHED\",\"runId\":$RUN,\"phase6PaidGo\":false}"
gh run watch "$RUN" -R "$R" --interval 5 --exit-status
JOB="$(gh api "$A/actions/runs/$RUN/jobs?filter=latest&per_page=100" | jq -er --arg p "$PIN" '[.jobs[]|select(.name=="exact-main-post-actors-only" and .head_sha==$p and .conclusion=="success")]|if length==1 then .[0].id else error("POST_JOB") end')"
# GitHub log scrubbing can redact numeric zeros, including in JSON receipts.
# Validate four exact hosted job steps rather than masked log JSON fields.
gh api "$A/actions/jobs/$JOB" | jq -e --arg p "$PIN" '
  .head_sha==$p and .run_attempt==1 and .status=="completed" and
  .conclusion=="success" and
  ([.steps[] | select(.name=="Verify exact disarmed POST actor admission" or
                       .name=="Preflight actual independent POST reviewer no observation" or
                       .name=="Preflight actual restricted POST publisher and deadline clock" or
                       .name=="Preflight exact independent bundle storage actors") ] |
   length==4 and all(.[];.status=="completed" and .conclusion=="success"))
' >/dev/null || hold POST_ACTORS_EXACT_STEP_READBACK
echo "{\"status\":\"P6_FINAL_MAIN_POST_THREE_ACTORS_EXACT_JOB_PASS_NO_GO\",\"runId\":$RUN,\"jobId\":$JOB,\"providerCalls\":0,\"databaseWrites\":0,\"phase6PaidGo\":false}"
pin
