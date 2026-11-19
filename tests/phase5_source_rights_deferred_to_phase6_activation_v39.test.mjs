import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const workflow=readFileSync(".github/workflows/phase5-exact-inert-release-stage-manual.yml","utf8");
const inert=readFileSync("scripts/v39_phase6_inert_release_stage_manual_v39.mjs","utf8");
const cost=readFileSync("server/lib/disruption/phase5V0093CostOnlySevenRestFreezeWriter_v39.mjs","utf8");
const enable=readFileSync("scripts/v39_phase6_enable_source_owner_v39.ts","utf8");

test("inert B0062/V0093 staging does not consume source-rights approval",()=>{
 assert.equal(workflow.includes("V39_PHASE5_SOURCE_RIGHTS_APPROVED"),false);
 assert.match(inert,/sourceUseDeferredToPhase6Activation:true/);
 assert.match(inert,/independentSourceContentsRightsForIntendedUseApproved:false/);
 assert.match(cost,/freezeReview\.sourceUseDeferredToPhase6Activation!==true/);
 assert.match(cost,/freezeReview\.independentSourceContentsRightsForIntendedUseApproved!==false/);
});

test("legacy source-rights flag is explicitly rejected by inert cost admission",()=>{
 assert.match(inert,/SOURCE_RIGHTS_FLAG_RESERVED_FOR_PHASE6_ACTIVATION/);
});

test("Phase6 source enable still requires genuine source-use approval",()=>{
 assert.match(enable,/b\.independentSourceUseApproved!==true/);
 assert.match(enable,/rightsDeferred=m\?\.sourceRightsApproved===false&&m\?\.sourceUseDeferredToPhase6Activation===true/);
 assert.match(enable,/EXACT_INDEPENDENT_AUTH_SCOPE_OR_BUDGET_REQUIRED/);
});
