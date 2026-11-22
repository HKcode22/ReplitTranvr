#!/usr/bin/env bash
# Owner execution is explicit adoption of the exact 20-file TECHNICAL review,
# under the previously documented owner-adopted agent-review standard.
# Does NOT certify independent human approval, deadline SLA, merge or paid GO.
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
MAIN="e058b9d0817151d4b10282c9242c6c8ebeef7814"
HEADPIN="6daa7156f9f987201959b3f4157adb9a15e58828"
STAGE="795ace55984b44a3d0bffa886d33a5ec11d31927"
BRANCH="phase6/20261122-runtime-environment-capacity-review"
INV="5c946215a6b5e2103791bd28188f2eeac8aa039a"
OLD="$HOME/.travnr-phase6-source-auth-exact-repaired-27074fed/auth.json"
OLDSHA="4da414a46138060a66104fa1885a8ba5c32e513908bae1c28a84f51eef2da106"
hold(){ echo "HOLD_P6_EXACT_962_OWNER_ADOPTION_$1" >&2; exit 2; }
[[ "$#" == 1 && "$1" == "ADOPT_EXACT_962_TECHNICAL_REVIEW_NO_RETENTION_WAIVER_NO_GO" ]] || hold OWNER_ADOPTION_REQUIRED
ROOT="$(git rev-parse --show-toplevel)"
TMP="$(mktemp -d)"
W="$TMP/tree"
cleanup(){ git -C "$ROOT" worktree remove --force "$W" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
pin(){
 [[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$MAIN" ]] || hold MAIN_MOVED
 [[ "$(gh api "repos/$REPO/pulls/962" --jq '.head.sha')" == "$HEADPIN" ]] || hold PR_MOVED
 [[ "$(gh api "repos/$REPO/pulls/962" --jq '.merged or .draft')" == false ]] || hold PR_STATE
}
pin
[[ "$(gh api user --jq .login)" == HKcode22 ]] || hold OWNER_IDENTITY
gh api "repos/$REPO/commits/$HEADPIN/check-runs?per_page=100" > "$TMP/checks.json"
jq -e '.total_count==43 and ([.check_runs[]|select(.status=="completed" and .conclusion=="success")]|length)==20 and ([.check_runs[]|select(.status=="completed" and .conclusion=="skipped")]|length)==23' "$TMP/checks.json" >/dev/null || hold EXACT_CI
gh api "repos/$REPO/environments/phase6-protected-runtime/deployment-branch-policies?per_page=100" | jq -e '.total_count==1 and .branch_policies[0].name=="main" and .branch_policies[0].type=="branch"' >/dev/null || hold ENVIRONMENT_SCOPE
[[ -f "$OLD" && ! -L "$OLD" ]] || hold PRIVATE_EXISTING_AUTH_ABSENT
[[ "$(sha256sum "$OLD" | cut -d' ' -f1)" == "$OLDSHA" ]] || hold PRIVATE_EXISTING_AUTH_HASH
gh api "repos/$REPO/git/blobs/$INV" --jq .content | base64 --decode > "$TMP/inventory.json"
[[ "$(git hash-object "$TMP/inventory.json")" == "$INV" ]] || hold INVENTORY_HASH
git -C "$ROOT" fetch --quiet --no-tags origin "$BRANCH" main
git -C "$ROOT" merge-base --is-ancestor "$STAGE" "$HEADPIN" || hold STAGE_ANCESTRY
git -C "$ROOT" worktree add --quiet --detach "$W" "$HEADPIN"
cd "$W"
export ADB_AUTO_COLLECT=0 V39_PHASE6_PROCESS_ARMED=0 V39_PHASE6_OWNER_APPROVED=0 V39_P5_APPROVED_CODE_SHA="$STAGE"
unset AERODATABOX_API_KEY RAPIDAPI_KEY AERODATABOX_WEBHOOK_SECRET V39_DATABASE_RUNTIME_URL NODE_TLS_REJECT_UNAUTHORIZED GITHUB_ACTIONS
( unset DATABASE_URL; npm ci --ignore-scripts --include=dev --no-audit --no-fund )
export P6_OWNER_HEAD="$HEADPIN" P6_OWNER_STAGE="$STAGE" P6_OWNER_MAIN="$MAIN" P6_OWNER_OLD="$OLD" P6_OWNER_OLDSHA="$OLDSHA" P6_OWNER_INV="$TMP/inventory.json"
node --import tsx --input-type=module <<'NODE'
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {verifyP6SourceEnableAuthBytes} from "./scripts/v39_phase6_source_enable_approval_ledger_v39.ts";
import {verifyP6MondayRevisedExecutableBridge} from "./scripts/v39_phase6_revised_stage_executable_bridge_v39.ts";
import {verifyP6SourceActivationReview} from "./scripts/v39_phase6_enable_source_owner_v39.ts";
import {admitP6InertOwnerReadback} from "./scripts/v39_phase6_inert_release_stage_manual_v39.mjs";
const e=process.env,head=e.P6_OWNER_HEAD,stage=e.P6_OWNER_STAGE,main=e.P6_OWNER_MAIN;
const need=(v,s)=>{if(!v)throw Error("HOLD_P6_EXACT_962_"+s)};
const git=(...a)=>execFileSync("git",a,{stdio:["ignore","pipe","ignore"],timeout:20000,maxBuffer:4*1024*1024});
const read=p=>git("show",head+":"+p);
const sha=b=>createHash("sha256").update(b).digest("hex");
const pretty=x=>Buffer.from(JSON.stringify(x,null,2)+"\n");
const diff=h=>git("diff","--no-renames","--name-only",stage,h).toString().trim().split("\n").filter(Boolean);
const blob=(h,p)=>git("ls-tree",h,"--",p).toString().split("\t")[0];
const ledgerPath="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const historyPath="data-collection/evidence/ledgers/V3.9_RUN_REPORTS_AND_EVIDENCE.md";
const evidencePath="data-collection/phase5/evidence/";
const isEvidence=p=>p===ledgerPath||/^data-collection\/phase5\/evidence\/[A-Za-z0-9][A-Za-z0-9_.-]{0,180}\.(?:json|md)$/.test(p);
const inv=JSON.parse(fs.readFileSync(e.P6_OWNER_INV,"utf8"));
need(inv.candidateExecutableCommit===head&&inv.baseMainSha===main&&inv.stageCodeSha===stage&&inv.changedBlobs.length===20,"INVENTORY_SCOPE");
const actual=diff(head).filter(p=>!isEvidence(p)).sort().map(p=>{const [mode,type,blobSha]=blob(head,p).split(" ");need(type==="blob","BLOB_TYPE");return {path:p,blobSha,mode}});
need(JSON.stringify(actual)===JSON.stringify(inv.changedBlobs),"EXACT_20_BLOBS");
const oldFile=fs.lstatSync(e.P6_OWNER_OLD),oldDir=fs.lstatSync(path.dirname(e.P6_OWNER_OLD));
need(oldFile.isFile()&&!oldFile.isSymbolicLink()&&oldFile.nlink===1&&(oldFile.mode&0o077)===0&&oldFile.uid===process.getuid()&&oldDir.isDirectory()&&!oldDir.isSymbolicLink()&&(oldDir.mode&0o077)===0&&oldDir.uid===process.getuid(),"PRIVATE_AUTH_PERMISSIONS");
const old=fs.readFileSync(e.P6_OWNER_OLD),oldLedger=read(ledgerPath),history=read(historyPath),now=new Date();
need(sha(old)===e.P6_OWNER_OLDSHA,"OLD_AUTH_BYTES");
const before=verifyP6SourceEnableAuthBytes(old,oldLedger,history,read,now);
need(before.verdict.verified===true,"OLD_AUTH_NOT_CURRENT");
const auth=JSON.parse(old),ledger=JSON.parse(oldLedger);
need(auth.authorizationId==="AUTH-20261119-P5INERTFREEZE"&&auth.predecessorEvidenceIds.length===33,"AUTH_IDENTITY");
const oldEntry=ledger.approvals.find(x=>x.authorizationId===auth.authorizationId);
need(oldEntry?.artifactSha256===sha(old)&&JSON.stringify(oldEntry.predecessorEvidenceIds)===JSON.stringify(auth.predecessorEvidenceIds),"OLD_APPROVAL");
const stageRaw=read(evidencePath+"phase6-monday-stage-input-795ace55.json").toString("utf8");
need(sha(Buffer.from(stageRaw))===inv.stagePacketSha256,"STAGE_BYTES");
const ctx=admitP6InertOwnerReadback(e,stageRaw,inv.stagePacketSha256,inv.costEnvelopeSha256,stage);
verifyP6SourceActivationReview(ctx,before,now);
const bridge=pretty({schema:"v39.phase6.revised-stage-executable-bridge-review.v1",stageCodeSha:stage,stagePacketSha256:inv.stagePacketSha256,costEnvelopeSha256:inv.costEnvelopeSha256,reviewedExecutableCommit:head,changedBlobs:actual,reviewedBy:"Repository owner HKcode22 explicitly adopts ChatGPT technical review 6010565895 and exact green CI under existing owner-delegated review convention; not independent human review; no physical-retention deadline waiver",reviewedAtUtc:now.toISOString(),independentOperationalReleaseApproved:true,phase6PaidGo:false});
const bh=sha(bridge),bp=evidencePath+"phase6-operational-bridge-"+bh+".json";
verifyP6MondayRevisedExecutableBridge({stageCode:stage,stageSha:inv.stagePacketSha256,costSha:inv.costEnvelopeSha256,currentHead:head,reviewBytes:bridge,expectedOperationalEvidenceSha256:bh,now,stageIsAncestor:true,reviewedCommitIsAncestor:true,reviewedDiff:diff(head),currentDiff:diff(head),readReviewedBlob:p=>blob(head,p),readCurrentBlob:p=>blob(head,p)},stageRaw,auth.releaseActivation.stageContentSha256,auth.releaseActivation.costEnvelopeSha256);
const archive=pretty({schema:"v39.phase6.prior-exact-source-approval-archive.v1",priorApproval:oldEntry,replacedOperationalEvidenceSha256:auth.releaseActivation.operationalReleaseEvidenceSha256,replacementOperationalEvidenceSha256:bh,priorMain:main,reviewedExecutableCommit:head,phase6PaidGo:false});
const ap=evidencePath+"phase6-prior-source-approval-"+sha(archive)+".json";
const ids=["DEC-20261122-P962OWNERADOPT","RUN-20261122-P962PRIORAUTHARCHIVE"];
need(ids.every(id=>!ledger.evidence.some(x=>x.evidenceId===id)&&!auth.predecessorEvidenceIds.includes(id)),"SUCCESSOR_ID_REPLAY");
ledger.evidence.push({evidenceId:ids[0],path:bp,sha256:bh},{evidenceId:ids[1],path:ap,sha256:sha(archive)});
auth.predecessorEvidenceIds=[...auth.predecessorEvidenceIds,...ids];
auth.releaseActivation.operationalReleaseEvidenceSha256=bh;
const newAuth=pretty(auth),ah=sha(newAuth);
ledger.approvals=ledger.approvals.map(x=>x.authorizationId===auth.authorizationId?{authorizationId:auth.authorizationId,artifactSha256:ah,predecessorEvidenceIds:auth.predecessorEvidenceIds}:x);
const lb=pretty(ledger),v=verifyP6SourceEnableAuthBytes(newAuth,lb,history,p=>p===bp?bridge:p===ap?archive:read(p),now);
need(v.verdict.verified===true&&v.artifactHash===ah,"SUCCESSOR_VERIFIER");
verifyP6SourceActivationReview(ctx,v,now);
const out=path.join(fs.realpathSync(e.HOME),".travnr-phase6-source-auth-exact-962-"+ah.slice(0,16));
fs.mkdirSync(out,{mode:0o700});
fs.writeFileSync(path.join(out,"auth.json"),newAuth,{mode:0o600,flag:"wx"});
fs.writeFileSync(bp,bridge,{flag:"wx"});
fs.writeFileSync(ap,archive,{flag:"wx"});
fs.writeFileSync(ledgerPath,lb);
console.log(JSON.stringify({status:"P6_EXACT_962_OWNER_ADOPTED_BRIDGE_AND_AUTH_PREFLIGHT_PASS_NO_GO",authArtifactSha256:ah,authPath:path.join(out,"auth.json"),operationalEvidenceSha256:bh,predecessors:auth.predecessorEvidenceIds.length,accountValidUntilUtc:auth.releaseActivation.accountEvidenceValidUntilUtc,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
NODE
git add -- data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json data-collection/phase5/evidence/phase6-operational-bridge-*.json data-collection/phase5/evidence/phase6-prior-source-approval-*.json
[[ "$(git diff --cached --name-only | wc -l | tr -d ' ')" == 3 ]] || hold STAGED_SCOPE
git diff --cached --name-only | grep -Ev '^(data-collection/evidence/ledgers/V3\.9_PHASE6_SOURCE_ENABLE_APPROVALS\.json|data-collection/phase5/evidence/phase6-(operational-bridge|prior-source-approval)-[a-f0-9]{64}\.json)$' && hold UNEXPECTED_PATH || true
pin
git commit -m "Bind owner-adopted exact PR 962 technical review and existing SOURCE AUTH (NO GO)" >/dev/null
NEW="$(git rev-parse HEAD)"
[[ "$(git rev-parse HEAD^)" == "$HEADPIN" ]] || hold COMMIT_PARENT
pin
git push origin "HEAD:refs/heads/$BRANCH"
[[ "$(gh api "repos/$REPO/pulls/962" --jq '.head.sha')" == "$NEW" ]] || hold PUSH_ACK_RECONCILE_NO_REPLAY
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$MAIN" ]] || hold MAIN_MOVED_AFTER_EVIDENCE_PUSH
echo "{\"status\":\"P6_EXACT_962_SUCCESSOR_EVIDENCE_PUSHED_NO_GO\",\"candidateEvidenceHead\":\"$NEW\",\"providerCalls\":0,\"databaseWrites\":0,\"sourceEnabled\":false,\"phase6PaidGo\":false}"
