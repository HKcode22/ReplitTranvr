import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {lanes,intended,legacy,summarizeInventory} from "../scripts/v39_phase6_release_inventory_readonly.mjs";
describe("Phase6 release metadata inventory no GO",()=>{
 it("resolves all actual canonical workflow jobs and classifies only known flags and secret names",()=>{
  const a=summarizeInventory({readWorkflow:(x:string)=>readFileSync(".github/workflows/"+x,"utf8"),head:"a".repeat(40),
   secretNames:["P6_PRIVATE_READER_DATABASE_URL","P6_PRIVATE_PUBLISHER_DATABASE_URL"],
   variables:[{name:"P6_PRIVATE_SOURCE_REVIEW_MODE",value:"stored"},{name:"P6_PRIVATE_POST_PARENT_ENABLED",value:"secret-looking-unknown-value"},
    {name:"P5_AUTO_SOURCE_DISPATCH_ENABLED",value:"true"},{name:"UNRELATED_VAR",value:"DO_NOT_PRINT"}]});
  expect(a.lanes).toHaveLength(15);
  expect(a.lanes.find(x=>x.lane==="inert_release_stage")?.missingRepositorySecretReferences).toContain("P6_INERT_STAGE_INPUT_SHA256");
  expect(a.lanes.find(x=>x.lane==="early_draw_readonly")?.missingRepositorySecretReferences).toContain("V39_P5_EARLY_DRAW_DATABASE_URL");
  expect(a.lanes).toHaveLength(lanes.length);
  expect(a.lanes.find(x=>x.lane==="early_draw")?.missingRepositorySecretReferences).toContain("V39_P5_EARLY_DRAW_DATABASE_URL");
  expect(a.lanes.find(x=>x.lane==="pre_recovery")?.missingRepositorySecretReferences).toContain("P6_PRIVATE_SOURCE_STABLE_TRUST_BASE64");
  expect(a.lanes.find(x=>x.lane==="retention_metadata")?.missingRepositorySecretReferences).toContain("P5_RETENTION_READER_DATABASE_URL");
  expect(a.lanes.every(x=>x.repositorySecretReferences>0&&x.conditionalOrInheritedSecretsNotResolved)).toBe(true);
  expect(a.lanes.find(x=>x.lane==="daily")?.missingRepositorySecretReferences).toContain("P6_NONPAID_DAILY_POLICY_BASE64");
  expect(a.lanes.find(x=>x.lane==="daily")?.missingRepositorySecretReferences).not.toContain("P6_PRIVATE_READER_DATABASE_URL");
  expect(a.intendedFutureModeFlags).toContainEqual({name:"P6_PRIVATE_SOURCE_REVIEW_MODE",state:"MATCHES_REFERENCE_VALUE"});
  expect(a.legacyCompetingFlags).toContainEqual({name:"P5_AUTO_SOURCE_DISPATCH_ENABLED",state:"MATCHES_REFERENCE_VALUE"});
  expect(a.intendedFutureModeFlags).toContainEqual({name:"P6_PRIVATE_POST_PARENT_ENABLED",state:"OTHER_VALUE"});
  expect(JSON.stringify(a)).not.toContain("secret-looking-unknown-value");
  expect(JSON.stringify(a)).not.toContain("DO_NOT_PRINT");
  expect(a).toMatchObject({secretValuesRead:false,githubMutations:0,providerCalls:0,phase6PaidGo:false});
 });
 it("refuses a changed job layout instead of certifying an incomplete inventory",()=>{
  expect(()=>summarizeInventory({readWorkflow:()=>"",head:"a".repeat(40),secretNames:[],variables:[]})).toThrow("HOLD_P6_INVENTORY_JOB_CHANGED");
  expect(Object.keys(intended).some(x=>Object.hasOwn(legacy,x))).toBe(false);
 });
});
