#!/usr/bin/env bash
# Consolidate only remaining Gate 3/7/8 facts. No replay, no source enable,
# no provider paid GET, no GitHub settings or production database writes.
set -Eeuo pipefail
set +x
umask 077
R=HKcode22/ReplitTranvr
RR=HKcode22/TravnrClockRelay
PIN=fe3fef5dbddc3577d585f778385677979031cd64
RP=046d89d341fa9f24524ea11e2778e273e3f39533
A="repos/$R"
B="repos/$RR"
D="$HOME/.travnr-phase6-final-pin-rebind-fe3fef5dbddc"
AUTH="$HOME/.travnr-phase6-source-auth-exact-962-3ae55fabcc03ac41/auth.json"
hold(){ echo "HOLD_P6_REMAINING_PREFLIGHT_$1" >&2; exit 2; }
[[ "$#" == 1 && "$1" == VERIFY_ONLY_REMAINING_3_7_8_NO_PAID_GO ]] || hold CONFIRM
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER
pin(){ [[ "$(gh api "$A/git/ref/heads/main" --jq .object.sha)" == "$PIN" && "$(gh api "$B/git/ref/heads/main" --jq .object.sha)" == "$RP" ]] || hold PIN; }
pin
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
[[ "$(sha256sum "$AUTH" | cut -d' ' -f1)" == 3ae55fabcc03ac4112c7b7d07c63e2454dc3242fe3f1cafd67026722346e482c ]] || hold EXISTING_AUTH
export P6_OWNER_STATIC="$D/static-values-PRIVATE.json" P6_OWNER_POST="$D/post-preservation-policy-PRIVATE.json" P6_OWNER_AUTH="$AUTH"
node --input-type=module <<'JS'
import fs from "node:fs";
import {createHash} from "node:crypto";
const sha=x=>createHash("sha256").update(x).digest("hex"),e=process.env;
const read=(p,h)=>{const s=fs.lstatSync(p),b=fs.readFileSync(p);if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)!==0||s.uid!==process.getuid()||sha(b)!==h)throw Error("HOLD_EXISTING_PRIVATE_BYTES");return JSON.parse(b)};
const v=read(e.P6_OWNER_STATIC,"7e07047d7173cbcf84e966ab869d66477efef36df38c83c58325396f31b83728"),post=read(e.P6_OWNER_POST,"76a4c7f4fa6e86f6be353effd89fa09972ce92ea8276796364eaed8c2a9f01f3"),a=read(e.P6_OWNER_AUTH,"3ae55fabcc03ac4112c7b7d07c63e2454dc3242fe3f1cafd67026722346e482c");
const keys=["P6_NONPAID_DAILY_POLICY","P6_NONPAID_SIGNING_POLICY","P6_NONPAID_TRANSPORT_TRUST","P6_NATIVE_POST_POLICY"];
const p=Object.fromEntries(keys.map(k=>{const b=Buffer.from(v[k+"_BASE64"],"base64");if(sha(b)!==v[k+"_SHA256"])throw Error("HOLD_POLICY_HASH");return [k,JSON.parse(b)]}));
const d=p[keys[0]],s=p[keys[1]],t=p[keys[2]],n=p[keys[3]],l=d.nativeLaterReview;
if(post.nativePostPolicySha256!==v.P6_NATIVE_POST_POLICY_SHA256||v.V39_P5_APPROVED_CODE_SHA!=="fe3fef5dbddc3577d585f778385677979031cd64")throw Error("HOLD_POLICY_CROSS_BINDING");
console.log(JSON.stringify({status:"P6_REMAINING_EXACT_RETENTION_POLICY_LIMITS_READONLY",sourceSigningMaximumReviewRetentionHours:s.maximumReviewRetentionHours,dailyTransportMaximumReviewRetentionHours:t.maximumDailyReviewRetentionHours,nativeLaterMaximumPrivateRetentionHours:l.maximumPrivateRetentionHours,t24CustodyMaximumRetentionHours:l.t24Custody.maximumRetentionHours,nativePostMaximumPrivateRetentionHours:n.maximumPrivateRetentionHours,postPolicyValidUntilUtc:post.validUntilUtc,accountEvidenceValidUntilUtc:a.releaseActivation.accountEvidenceValidUntilUtc,authorizationStartNotBeforeUtc:a.startNotBeforeUtc,authorizationExpiresAtUtc:a.expiresAtUtc,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
JS
# Existing actual final pins, no variables updated.
for pair in "P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA:$PIN" "P7_EXPIRY_APPROVED_MAIN_SHA:$PIN" "P5_PRIMARY_FIDS_DEADLINE_PROFILE:V0107_VERIFIED_FUTURE_POST_23H_MARGIN" "P6_PRIVATE_EPOCH_EXPIRY_MODE:APPLY_DUE_ONLY" "P6_FULL_RETENTION_BACKSTOP_ENABLED:true"; do
 k="${pair%%:*}"; v="${pair#*:}"
 [[ "$(gh variable get "$k" -R "$R")" == "$v" ]] || hold "DRIFT_$k"
done
[[ "$(gh variable get TRAVNR_APPROVED_TARGET_MAIN_SHA -R "$RR")" == "$PIN" ]] || hold RELAY_TARGET
[[ "$(gh variable get TRAVNR_RELAY_PRIMARY_VERIFY_RUN_ID -R "$RR")" == 44991126911 ]] || hold RELAY_BASELINE
# Inspect actual already-scheduled relay ACKs, no duplicate dispatch.
gh api "$B/actions/runs?branch=main&event=workflow_dispatch&per_page=20" >"$T/relay.json"
for lane in PRIMARY_BACKSTOP ROLLING_ROOT; do
 id="$(jq -r --arg l "$lane" --arg p "$RP" '[.workflow_runs[]|select(.head_sha==$p and .display_title==("TRAVNR EXTERNAL CLOCK "+$l) and .created_at>="2026-11-22T05:51:00Z" and .status=="completed" and .conclusion=="success")]|first|.id//empty' "$T/relay.json")"
 if [[ -z "$id" ]]; then echo "{\"status\":\"P6_RELAY_FINAL_PIN_ACK_NOT_YET_OBSERVED\",\"lane\":\"$lane\",\"phase6PaidGo\":false}"; continue; fi
 job="$(gh api "$B/actions/runs/$id/jobs?filter=latest&per_page=100" | jq -r '[.jobs[]|select(.name=="target-forward" and .conclusion=="success")]|first|.id//empty')"
 if [[ -z "$job" ]]; then echo "{\"status\":\"P6_RELAY_NO_FORWARD_JOB\",\"lane\":\"$lane\",\"runId\":$id}"; continue; fi
 gh run view "$id" -R "$RR" --job "$job" --log >"$T/relay-$lane.log"
 target="$(node --input-type=module - "$T/relay-$lane.log" "$id" "$lane" <<'JS'
import fs from "node:fs";const [f,id,lane]=process.argv.slice(2),a=[];
for(const l of fs.readFileSync(f,"utf8").split(/\r?\n/)){const i=l.indexOf("{");if(i<0)continue;try{const x=JSON.parse(l.slice(i));if(x.status==="TARGET_ACK_AND_RUN_IDENTITY_VERIFIED_NOT_COLLECTION_PROOF"&&x.relayRunId===Number(id)&&x.mode===lane&&x.relayDispatches===1&&x.providerCallsByRelay===0&&x.databaseReadsByRelay===0&&x.databaseWritesByRelay===0&&x.paidAuthorityGranted===false)a.push(x)}catch{}}
if(a.length===1&&Number.isSafeInteger(a[0].targetRunId))console.log(a[0].targetRunId);
JS
)"
 if [[ -z "$target" ]]; then echo "{\"status\":\"P6_RELAY_ACK_NOT_PRESENT_OR_MASKED\",\"lane\":\"$lane\",\"runId\":$id}"; continue; fi
 gh api "$A/actions/runs/$target" | jq -c --arg lane "$lane" --arg p "$PIN" --argjson relay "$id" '{status:(if .head_sha==$p and .run_attempt==1 and .event=="workflow_dispatch" and .conclusion=="success" then "P6_FINAL_RELAY_TARGET_ACK_AND_RUN_PASS_NO_GO" else "P6_FINAL_RELAY_TARGET_NOT_COMPLETE_OR_DRIFT" end),lane:$lane,relayRunId:$relay,targetRunId:.id,targetMain:.head_sha,targetStatus:.status,targetConclusion:.conclusion,phase6PaidGo:false}'
done
# Free-provider endpoint only. Prior current AUTH remains unchanged; if quota
# differs or evidence expires, activation must reconcile it, never silently arm.
F="review-tools/p6_launch_free_account_prearm_current_v39.mjs"
gh api "$A/contents/$F?ref=$PIN" --jq .content | base64 --decode >"$T/account.mjs"
[[ "$(git hash-object "$T/account.mjs")" == "$(gh api "$A/contents/$F?ref=$PIN" --jq .sha)" ]] || hold ACCOUNT_HELPER_HASH
( unset DATABASE_URL V39_DATABASE_RUNTIME_URL; export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0; node "$T/account.mjs" ) >"$T/account.json"
jq -e '.status=="FREE_ACCOUNT_PREARM_STABLE_ZERO_ACTIVE_SUBSCRIPTIONS_NO_PAID_PROVIDER" and .providerPaidGets==0 and .providerMutations==0 and .databaseWrites==0 and .apiUnitsRemaining>=50468 and .activeBillableSubscriptions==0 and .phase6PaidGo==false' "$T/account.json" >/dev/null || hold ACCOUNT_FLOOR_OR_BALANCE
cat "$T/account.json"
out="$HOME/.travnr-phase6-final-prearm-readonly-fe3fef5d-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$out"
install -m 600 "$T/account.json" "$out/account.json"
pin
echo "{\"status\":\"P6_REMAINING_GATE3_7_8_PREFLIGHT_READONLY_COMPLETE_NO_GO\",\"accountReceiptSha256\":\"$(sha256sum "$out/account.json" | cut -d' ' -f1)\",\"privateReceiptPath\":\"$out/account.json\",\"providerPaidGets\":0,\"databaseWrites\":0,\"sourceEnabled\":false,\"phase6PaidGo\":false}"
