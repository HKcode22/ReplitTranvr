import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {parseGate4StandaloneArgsV39} from
 "../scripts/v39_gate4_isolated_preflight_v39";

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
