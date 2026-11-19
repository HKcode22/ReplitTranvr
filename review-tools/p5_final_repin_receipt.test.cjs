"use strict";
// Historical, sanitized zero-work production receipts only; no DB, provider,
// dispatch or secret use. Run: node --test review-tools/p5_final_repin_receipt.test.cjs
const test=require("node:test"),assert=require("node:assert/strict");
const {verifyReceipt}=require("./p5_final_primary_relay_repin.cjs");
const fixtures=[
  {
    "run": {
      "id": 44469516939,
      "head_sha": "70580b3749544dfcbeff39da181b2aa42b1b4476",
      "path": ".github/workflows/phase5-primary-fids-expiry-no-provider.yml",
      "head_branch": "main",
      "event": "workflow_dispatch",
      "run_attempt": 1,
      "status": "completed",
      "conclusion": "success",
      "created_at": "2026-11-19T06:04:31Z"
    },
    "jobs": {
      "total_count": 1,
      "jobs": [
        {
          "id": 135375302864,
          "run_id": 44469516939,
          "head_sha": "70580b3749544dfcbeff39da181b2aa42b1b4476",
          "name": "primary-fids-expiry",
          "run_attempt": 1,
          "status": "completed",
          "conclusion": "success",
          "completed_at": "2026-11-19T06:04:59Z",
          "steps": [
            {
              "name": "Verify exact main and execute only bounded primary FIDS expiry",
              "status": "completed",
              "conclusion": "success",
              "number": 5,
              "started_at": "2026-11-19T06:04:56Z",
              "completed_at": "2026-11-19T06:04:57Z"
            }
          ]
        }
      ]
    },
    "line": "2026-11-19T06:04:57.7054078Z {\"providerCalls\":0,\"objectDeletions\":0,\"backupOrPitrVerified\":false,\"completeRetentionDeploymentVerified\":false,\"phase6PaidGo\":false,\"distinctDbActorsVerified\":true,\"privateCommissionState\":\"GRANTED\",\"status\":\"PRIMARY_FIDS_ELIGIBLE_AT_READBACK_CLEARED\",\"before\":{\"schema\":\"v39.phase5.primary-fids-expiry-status.v1\",\"observedAtUtc\":\"2026-11-19T06:04:57.650Z\",\"liveOriginals\":0,\"eligibleOriginals\":0,\"hardDueOriginals\":0,\"eligibleNextHour\":0,\"hardDueNextHour\":0,\"unboundLiveOriginals\":0,\"markedExpiredPayloadPresent\":0,\"unlinkedUnexpiredPopulation\":0,\"unexpiredPopulationWithoutLiveOriginal\":0,\"deletionStopUnresolved\":false,\"providerCalls\":0,\"databaseWrites\":0,\"backupOrPitrVerified\":false,\"completeRetentionDeploymentVerified\":false,\"phase6PaidGo\":false},\"after\":{\"schema\":\"v39.phase5.primary-fids-expiry-status.v1\",\"observedAtUtc\":\"2026-11-19T06:04:57.650Z\",\"liveOriginals\":0,\"eligibleOriginals\":0,\"hardDueOriginals\":0,\"eligibleNextHour\":0,\"hardDueNextHour\":0,\"unboundLiveOriginals\":0,\"markedExpiredPayloadPresent\":0,\"unlinkedUnexpiredPopulation\":0,\"unexpiredPopulationWithoutLiveOriginal\":0,\"deletionStopUnresolved\":false,\"providerCalls\":0,\"databaseWrites\":0,\"backupOrPitrVerified\":false,\"completeRetentionDeploymentVerified\":false,\"phase6PaidGo\":false},\"receipts\":[],\"databaseWritesPossible\":false,\"reviewedMainSha\":\"70580b3749544dfcbeff39da181b2aa42b1b4476\"}",
    "apply": true,
    "clock": 1795068300000
  },
  {
    "run": {
      "id": 44243549045,
      "head_sha": "3e7aca07852d1cc81868e4000771ca85b2ea4bab",
      "path": ".github/workflows/phase5-primary-fids-expiry-no-provider.yml",
      "head_branch": "main",
      "event": "workflow_dispatch",
      "run_attempt": 1,
      "status": "completed",
      "conclusion": "success",
      "created_at": "2026-11-18T05:20:18Z"
    },
    "jobs": {
      "total_count": 1,
      "jobs": [
        {
          "id": 134596913331,
          "run_id": 44243549045,
          "head_sha": "3e7aca07852d1cc81868e4000771ca85b2ea4bab",
          "name": "primary-fids-expiry",
          "run_attempt": 1,
          "status": "completed",
          "conclusion": "success",
          "completed_at": "2026-11-18T05:20:41Z",
          "steps": [
            {
              "name": "Verify exact main and execute only bounded primary FIDS expiry",
              "status": "completed",
              "conclusion": "success",
              "number": 5,
              "started_at": "2026-11-18T05:20:38Z",
              "completed_at": "2026-11-18T05:20:39Z"
            }
          ]
        }
      ]
    },
    "line": "2026-11-18T05:20:39.4708125Z {\"status\":\"PRIMARY_FIDS_VERIFY_ONLY_NO_WRITES\",\"before\":{\"schema\":\"v39.phase5.primary-fids-expiry-status.v1\",\"observedAtUtc\":\"2026-11-18T05:20:39.452Z\",\"liveOriginals\":0,\"eligibleOriginals\":0,\"hardDueOriginals\":0,\"eligibleNextHour\":0,\"hardDueNextHour\":0,\"unboundLiveOriginals\":0,\"markedExpiredPayloadPresent\":0,\"unlinkedUnexpiredPopulation\":0,\"unexpiredPopulationWithoutLiveOriginal\":0,\"deletionStopUnresolved\":false,\"providerCalls\":0,\"databaseWrites\":0,\"backupOrPitrVerified\":false,\"completeRetentionDeploymentVerified\":false,\"phase6PaidGo\":false},\"providerCalls\":0,\"objectDeletions\":0,\"backupOrPitrVerified\":false,\"completeRetentionDeploymentVerified\":false,\"phase6PaidGo\":false,\"distinctDbActorsVerified\":true,\"privateCommissionState\":\"GRANTED\",\"databaseWrites\":0,\"reviewedMainSha\":\"3e7aca07852d1cc81868e4000771ca85b2ea4bab\"}",
    "apply": false,
    "clock": 1794979242000
  }
];
const [apply,verify]=fixtures;
const check=(f,log=f.line,overrides={})=>{
 const x={...f,...overrides};
 return verifyReceipt(x.run,x.jobs,log,x.run.head_sha,x.run.id,x.clock,x.apply);
};
const q=JSON.parse(apply.line.slice(apply.line.indexOf("{")));
test("real APPLY job 135375302864 (providerCalls precedes status)",()=>assert.equal(check(apply).jobId,135375302864));
test("real VERIFY job 134596913331 (status first)",()=>assert.equal(check(verify).jobId,134596913331));
test("CLI prefix, JSON key order and whitespace",()=>{
 assert.equal(check(apply,"primary-fids-expiry\tVerify exact main\t"+apply.line).jobId,135375302864);
 assert.equal(check(apply,"2026-11-19T06:04:57Z "+JSON.stringify({status:q.status,...q},null,0).replace('":','": ')).jobId,135375302864);
});
test("refuse duplicate, malformed, trailing and nested receipts",()=>{
 for(const x of [apply.line+"\n"+apply.line,apply.line.slice(0,-1),apply.line+" arbitrary",JSON.stringify({nested:q})])assert.throws(()=>check(apply,x),/EXACT_RECEIPT/);
});
test("refuse wrong main, wrong attempt and stale receipt",()=>{
 assert.throws(()=>check(apply,apply.line,{run:{...apply.run,head_sha:"0".repeat(40)}}),/ACTUAL_STEP|RUN_IDENTITY/);
 assert.throws(()=>check(apply,apply.line,{run:{...apply.run,run_attempt:2}}),/RUN_IDENTITY/);
 assert.throws(()=>check(apply,apply.line,{clock:apply.clock+3600000}),/ZERO_WORK_RECEIPT_SCOPE/);
});
test("refuse paid work, nonzero eligible rows or absent after receipt",()=>{
 for(const x of [{...q,providerCalls:1},{...q,before:{...q.before,eligibleOriginals:1}},{...q,after:null}])assert.throws(()=>check(apply,JSON.stringify(x)),/ZERO_WORK_RECEIPT_SCOPE/);
});
