"use strict";
// Review-only evidence binding for Nov20. No provider/DB operations.
const {createHash}=require("node:crypto");
const BASE="0a7b1a28f243de76d4c83026d15f585265ef6f7b";
const AUTH="AUTH-20261119-P5INERTFREEZE";
const LEDGER="data-collection/evidence/ledgers/V3.9_PHASE6_SOURCE_ENABLE_APPROVALS.json";
const STOP_PATH="data-collection/phase5/evidence/2026-11-20_current_phase6_github_stop_attestation_NO_GO.json";
const STAGE=Object.freeze({
 authorizationId:AUTH,codeSha:BASE,
 manifestSha256:"3a0e3667dbbd3eb9bc101618b1858755d3814f4676d61f1487586463c6d91ba7",
 calendarSha256:"9ee062ab6d82de8b3949f88ba390d4bcb9121890be592797ec0b4c498ff289a6",
 configSha256:"001a3f0634cc41b8d1327be36404efa74feaaea21fe4ef6eead7e993acaf4c88",
 stagePacketSha256:"6d06cd56f3cf09b7d4f5a6033b70f253e6247a9e1b27dbb839b0080a66e771fc",
 costEnvelopeSha256:"a3d3525a890bfe542f9588b18d3b5d9367ba657ccae2c1c0401edc625ac46124"
});
const STOP_NAMES=["V39_PHASE6_PROCESS_ARMED","P5_CD_GH_PRE_STOP","P5_CD_GH_PRE_ARMED","P5_CD_GH_PREPARE_ARMED"];
const STOP_VALUES=["0","1","0","0"];
const MODE_NAMES=["P6_NONPAID_SOURCE_SCHEDULE_ENABLED","P6_PRIVATE_SOURCE_STORED_DISPATCH_ENABLED","P6_PRIVATE_POST_PARENT_ENABLED","P6_NATIVE_LATER_RUNTIME_ENABLED","P6_NATIVE_POST_PRODUCER_ENABLED","P6_PRIVATE_CURRENT_PRE_SCHEDULE_ENABLED","P6_PRIVATE_T24_EXECUTION_ENABLED","P6_PRIVATE_LATER_ENROLL_ENABLED","P6_PRIVATE_T24_ENROLL_ENABLED","P6_PRIVATE_LATER_ENROLL_SCHEDULE_ENABLED","P6_PRIVATE_T24_ENROLL_SCHEDULE_ENABLED","P5_CD_GH_PRE_SCHEDULE_ENABLED","P5_CD_GH_T24_SCHEDULE_ENABLED","P6_ROLLING_CONTROLLER_ENABLED","P5_AUTO_SOURCE_DISPATCH_ENABLED","P5_POST_AUTO_DISPATCH_ENABLED","P5_T24_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_AUTO_DISPATCH_ENABLED","P5_LATER_PRE_BATCH_AUTO_DISPATCH_ENABLED","P6_T24_CUSTODY_ENABLED","P6_STORED_SOURCE_NATIVE_AUDIT_ENABLED"];
const H=/^[a-f0-9]{64}$/;
const need=(x,s)=>{if(!x)throw Error("HOLD_P6_NOV20_REPIN_"+s)};
const sha=x=>createHash("sha256").update(x).digest("hex");
function verifyEnableReceipt(raw,ledger){
 const {transition:r,readback:b}=JSON.parse(raw);
 need(r&&Object.entries(STAGE).every(([k,v])=>r[k]===v)&&r.status==="EXISTING_DB_AUTH_ENABLED_NO_PROVIDER_NO_WORKFLOW_SWITCH_CHANGED"&&H.test(r.authArtifactSha256??"")&&r.independentStagedValuesMatch===true&&r.exactPhysicalRestGuardVerified===true&&r.databaseAuthorizationEnabled===true&&r.providerCalls===0&&r.databaseWrites===2&&r.githubFlagsChanged===0&&r.legacyAlertStarted===false&&r.phase6PaidGoGrantedByThisTransition===false,"EXACT_TRANSITION");
 need(b&&b.status==="P6_SOURCE_AUTH_ENABLED_INDEPENDENT_READBACK_NO_PAID_DISPATCH"&&b.verifiedReadOnly===true&&b.exactEnabledRowAndDurableMarker===true&&b.exactStoredReviewedManifest===true&&b.exactPhysicalRestGuardVerified===true&&b.providerCalls===0&&b.databaseWrites===0&&b.githubFlagsChanged===0&&b.phase6PaidGoGrantedByThisTransition===false&&Number.isFinite(Date.parse(r.enabledAtDatabaseUtc))&&Number.isFinite(Date.parse(b.observedAtUtc))&&Date.parse(b.observedAtUtc)>=Date.parse(r.enabledAtDatabaseUtc),"EXACT_INDEPENDENT_READBACK");
 need(ledger?.schema==="v39.phase6.source-enable-approval-ledger.v1"&&Array.isArray(ledger.approvals)&&ledger.approvals.some(x=>x.authorizationId===r.authorizationId&&x.artifactSha256===r.authArtifactSha256),"AUTH_NOT_IN_LEDGER");
 return r;
}
function verifyCurrentStop(evidenceRaw,ledger,secretRows,variables,now=Date.now()){
 const e=JSON.parse(evidenceRaw);
 need(e.productionMain===BASE&&e.fourStopSecretValuesExact===true&&e.all21ModeVarsUnset===true&&e.secretPlaintextPrinted===false&&e.githubWritesByAttestation===0&&e.providerCalls===0&&e.databaseWrites===0&&STOP_NAMES.every((n,i)=>e.expectedStopValues?.[n]===STOP_VALUES[i])&&Array.isArray(e.modeVariableNames)&&e.modeVariableNames.length===MODE_NAMES.length&&MODE_NAMES.every(n=>e.modeVariableNames.includes(n)),"STOP_ATTESTATION_SCOPE");
 need(ledger.evidence?.some(x=>x.path===STOP_PATH&&x.evidenceId===e.evidenceId&&x.sha256===sha(evidenceRaw)),"STOP_NOT_HASH_BOUND");
 const t=Date.parse(e.observedAtUtc);
 need(Number.isFinite(t)&&t<=now&&Array.isArray(secretRows)&&Array.isArray(variables),"STOP_TIME_OR_METADATA");
 for(const n of STOP_NAMES){
  const rows=secretRows.filter(x=>x.name===n);
  const updated=Date.parse(rows[0]?.updatedAt??rows[0]?.updated_at);
  need(rows.length===1&&Number.isFinite(updated)&&updated<=t,"STOP_SECRET_CHANGED_SINCE_ATTESTATION");
 }
 need(MODE_NAMES.every(n=>!variables.some(x=>x.name===n)),"COLLECTION_MODE_NOT_UNSET");
 return true;
}
module.exports={BASE,AUTH,LEDGER,STOP_PATH,STAGE,STOP_NAMES,STOP_VALUES,MODE_NAMES,verifyEnableReceipt,verifyCurrentStop};
