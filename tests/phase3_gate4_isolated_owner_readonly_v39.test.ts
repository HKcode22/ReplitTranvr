import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {
  parseGate4StandaloneArgsV39,
  gate4ReadonlySafeFailureCodeV39
} from "../scripts/v39_gate4_isolated_preflight_v39";

const actual="f5b1347b7b9aebd6830302394ea2cc5775aedbf4";
describe("Gate4 standalone owner READONLY: signed source + cap parser",()=>{
 it("parses only a small readonly isolated preflight",()=>{
  expect(parseGate4StandaloneArgsV39(["--dry-run","--published-head",
    actual,"--cap","20","--reserve","10"]))
    .toEqual({head:actual,cap:20,reserve:10});
 });
 it("rejects invalid source, no cap, invalid reserve and paid commands",()=>{
  const cases=[
   ["--apply","--published-head",actual,"--cap","20","--reserve","10"],
   ["--dry-run","--published-head","main","--cap","20","--reserve","10"],
   ["--dry-run","--published-head",actual,"--cap","1900","--reserve","10"],
   ["--dry-run","--published-head",actual,"--cap","20","--reserve","0"]
  ];
  for(const v of cases)
   expect(()=>parseGate4StandaloneArgsV39(v)).toThrow();
 });
 it("source uses REAL strict free reads and readonly SQL, no START/CREATE",()=>{
  const s=readFileSync(new URL(
   "../scripts/v39_gate4_isolated_preflight_v39.ts",import.meta.url
  ),"utf8");
  expect(s).toContain("verifyGate3PublishedPrepaidHostV39(args.head)");
  expect(s).toContain("await listSubscriptionsStrictWithRetry()");
  expect(s).toContain("await getBalanceEvidenceStrict()");
  expect(s).toContain("BEGIN TRANSACTION READ ONLY");
  expect(s).not.toContain("await listSubscriptions()");
  expect(s).not.toContain("UPDATE clean.");
  expect(s).not.toContain("startBatch(");
  expect(s).not.toContain("createSubscription(");
  expect(s).not.toContain("deleteSubscription(");
  expect(s).toContain("independentStopProcessArmed:false");
  expect(s).toContain("gate4CanaryCallbackRouteProven:false");
  expect(s).toContain("gate4LivePassed:false,paidAuthorization:false");
 });
});

describe("Gate4 preflight failed-stage diagnostics redact all raw errors",()=>{
 it("recognizes only fixed, safe provider, host and DB error classifications",()=>{
   expect(gate4ReadonlySafeFailureCodeV39(
     new Error("GATE3_OWNER_PUBLISHED_HOST_CONTRACT_MISMATCH_HOLD")))
       .toBe("PUBLISHED_HOST_IDENTITY_OR_AVAILABILITY_HOLD");
   expect(gate4ReadonlySafeFailureCodeV39(
     new Error("BALANCE_UNAVAILABLE: HTTP 429 secret=abc")))
       .toBe("STRICT_PROVIDER_BALANCE_GET_HOLD");
   expect(gate4ReadonlySafeFailureCodeV39(
     new Error("R1_LIST_UNAVAILABLE: HTTP 403 secret=abc")))
       .toBe("STRICT_PROVIDER_INVENTORY_GET_HOLD");
   expect(gate4ReadonlySafeFailureCodeV39(
     new Error("GATE4_WRONG_DATABASE_IDENTITY")))
       .toBe("PRODUCTION_DATABASE_IDENTITY_MISMATCH");
 });
 it("never echoes arbitrary secrets from PostgreSQL, transport or runtime",()=>{
   for(const message of [
     "password=really_private","HTTP 500 body apiKey=not-for-logs",
     "SELECT secret from private_table",
     "password authentication failed for user owner"
   ]){
     const result=gate4ReadonlySafeFailureCodeV39(new Error(message));
     expect(result).toBe("REDACTED_STAGE_FAILURE");
     expect(result).not.toContain(message);
   }
 });
 it("source identifies exactly one failure stage without changing authority",()=>{
   const source=readFileSync(new URL(
    "../scripts/v39_gate4_isolated_preflight_v39.ts",import.meta.url
   ),"utf8");
   for(const st of [
     "PUBLISHED_HOST_IDENTITY","STRICT_PROVIDER_LIST",
     "STRICT_BALANCE_READ_","PRODUCTION_DB_CONNECT",
     "PRODUCTION_DB_IDENTITY","PRODUCTION_BATCH_AND_SUBS_READ",
     "GATE4_ACCOUNT_SAFETY_EVALUATION"
   ]) expect(source).toContain(st);
   expect(source).toContain("failedStage:stage");
   expect(source).not.toContain("console.error(error)");
   expect(source).not.toContain("createSubscription(");
   expect(source).not.toContain("startBatch(");
   expect(source).toContain("paidAuthorization:false");
 });
});
