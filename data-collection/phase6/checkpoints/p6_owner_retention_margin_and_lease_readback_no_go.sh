#!/usr/bin/env bash
# Read-only owner evidence. No provider, database, secret write, lease mutation,
# dispatch, SOURCE transition or paid GO. Only reviewed numerical policy geometry.
set -Eeuo pipefail
set +x
umask 077
PIN=fe3fef5dbddc3577d585f778385677979031cd64
R=HKcode22/ReplitTranvr
L=HKcode22/TravnrClockRelay
test "$(gh api "repos/$R/git/ref/heads/main" --jq '.object.sha')" = "$PIN"
test "$(gh api "repos/$L/git/ref/heads/main" --jq '.object.sha')" = 046d89d341fa9f24524ea11e2778e273e3f39533
git cat-file -e "$PIN^{commit}" 2>/dev/null || git fetch --no-tags "https://github.com/$R.git" "$PIN" --quiet
export PIN
node --input-type=module <<'JS'
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const pin=process.env.PIN,need=(x,msg)=>{if(!x)throw Error(msg)},sha=x=>createHash("sha256").update(x).digest("hex");
const utc=x=>{const n=Date.parse(x);need(Number.isFinite(n),"INVALID_POLICY_CLOCK");return n};
const integer=(x,min,max)=>{need(Number.isSafeInteger(x)&&x>=min&&x<=max,"INVALID_DURATION");return x};
const f=path.join(os.homedir(),".travnr-phase6-final-pin-rebind-"+pin.slice(0,12),"static-values-PRIVATE.json");
const v=JSON.parse(fs.readFileSync(f,"utf8"));
const read=k=>{const b=Buffer.from(v[k+"_BASE64"],"base64");need(b.toString("base64")===v[k+"_BASE64"]&&sha(b)===v[k+"_SHA256"],"EXACT_POLICY_BYTES_REQUIRED");return JSON.parse(b.toString("utf8"));};
const d=read("P6_NONPAID_DAILY_POLICY"),s=read("P6_NONPAID_SIGNING_POLICY"),t=read("P6_NONPAID_TRANSPORT_TRUST"),p=read("P6_NATIVE_POST_POLICY");
need(d.approvedCodeSha===pin&&s.approvedCodeSha===pin&&t.reviewedMainSha===pin&&p.reviewedCodeSha===pin&&t.dailyPolicySha256===v.P6_NONPAID_DAILY_POLICY_SHA256&&t.signingPolicySha256===v.P6_NONPAID_SIGNING_POLICY_SHA256,"POLICY_PIN_DRIFT");
need(d.manifestSha256===v.V39_P5_MANIFEST_SHA256&&s.manifestSha256===d.manifestSha256&&p.manifestSha256===d.manifestSha256,"MANIFEST_DRIFT");
const min=integer(t.minimumPreparationLeadMinutes,15,180),look=integer(t.maximumPreparationLookaheadMinutes,min,2880),ttl=integer(t.maximumDailyReviewRetentionHours,1,168);
const follow=integer(p.followupAfterPartitionEndSeconds,0,172800),window=integer(p.dispatchWindowSeconds,1,1800);
need(follow+window<=172800,"POST_WINDOW_TOO_LONG");
need(Array.isArray(d.dayPlanSha256s)&&d.dayPlanSha256s.length===31,"MISSING_PLANS");
const rows=d.dayPlanSha256s.map((q,i)=>{
 need(q.runDayIndex===i+1,"DAY_INDEX_DRIFT");
 const name="data-collection/phase5/planning/phase6-source-day-"+String(i+1).padStart(2,"0")+".json";
 const b=execFileSync("git",["show",pin+":"+name],{maxBuffer:1000000});
 need(sha(b)===q.sha256,"DAY_PLAN_DIGEST_DRIFT");
 const z=JSON.parse(b.toString("utf8"));need(z.runDayIndex===i+1&&z.templates.length>0,"DAY_PLAN_INVALID");
 const first=Math.min(...z.templates.map(x=>utc(x.scheduledRequestUtc))),end=Math.max(...z.templates.map(x=>utc(x.serviceWindowEndUtc)));
 const earliestReview=Math.max(utc(d.validFromUtc),first-look*60000);
 const nominalHard=Math.min(earliestReview+ttl*3600000,utc(d.validUntilUtc),utc(s.validUntilUtc));
 const plannedPostEnd=end+(follow+window)*1000;
 return {day:i+1,earliestReviewUtc:new Date(earliestReview).toISOString(),nominalReviewUpperBoundUtc:new Date(nominalHard).toISOString(),plannedPostWindowEndUtc:new Date(plannedPostEnd).toISOString(),nominalMarginMinutes:(nominalHard-plannedPostEnd)/60000};
});
console.log(JSON.stringify({status:"P6_LOCAL_REVIEW_POLICY_GEOMETRY_READBACK_NOT_ACTUAL_PACKET_EXPIRY_NO_GO",main:pin,days:rows.length,minimumPreparationLeadMinutes:min,maximumPreparationLookaheadMinutes:look,maximumDailyReviewRetentionHours:ttl,postFollowupSeconds:follow,postDispatchWindowSeconds:window,postMaximumPrivateRetentionHours:p.maximumPrivateRetentionHours,minimumNominalMarginMinutes:Math.min(...rows.map(x=>x.nominalMarginMinutes)),nonpositiveMarginDays:rows.filter(x=>x.nominalMarginMinutes<=0).map(x=>x.day),rows,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
JS
# gh API returns public configuration metadata only. Never print credential values.
for k in TRAVNR_LEASE_CONTINUITY_ARMED TRAVNR_LEASE_ENV_READY TRAVNR_RELAY_MODE TRAVNR_RELAY_PRIMARY_ENABLED TRAVNR_RELAY_ROLLING_ENABLED TRAVNR_ROLLING_POLICY_UNTIL_UTC; do
 if v="$(gh variable get "$k" -R "$L" 2>/dev/null)"; then
   case "$v" in
     0|1|MULTI_LANE|DIRECT_VERIFY|DIRECT_TICK|SHADOW|[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*)
       printf '%s=%s\n' "$k" "$v";;
     *) printf '%s=UNEXPECTED_VALUE_NOT_PRINTED\n' "$k";;
   esac
 else printf '%s=UNAVAILABLE_OR_ABSENT\n' "$k"; fi
done
if gh api "repos/$L/environments/travnr-cron-lease-renewal" --jq '{environment:.name,protectionRuleTypes:[.protection_rules[].type],deploymentBranchPolicy:.deployment_branch_policy}' 2>/dev/null; then
 if names="$(gh secret list -R "$L" --env travnr-cron-lease-renewal --json name --jq 'map(.name) | {accountKeyNamePresent:contains(["TRAVNR_CRON_ACCOUNT_KEY"]),relayTokenNamePresent:contains(["TRAVNR_CRON_RELAY_TOKEN"])}' 2>/dev/null)"; then printf '%s\n' "$names"; else echo RENEWAL_SECRET_NAME_READBACK_UNAVAILABLE; fi
else echo RENEWAL_ENVIRONMENT_UNAVAILABLE_OR_ABSENT; fi
echo P6_OWNER_RETENTION_MARGIN_AND_LEASE_READBACK_COMPLETE_NO_PAID_GO
