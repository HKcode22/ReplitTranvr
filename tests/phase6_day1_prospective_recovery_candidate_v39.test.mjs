import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {classifyP6Day1Recovery} from "../server/lib/disruption/phase6Day1ProspectiveRecoveryCandidate_v39.mjs";
const bytes=readFileSync(new URL("../data-collection/phase5/planning/phase6-source-day-01.json",import.meta.url));
const hash=b=>createHash("sha256").update(b).digest("hex");
const run=(at,b=bytes,digest=hash(b),lead=15)=>classifyP6Day1Recovery({dayPlanBytes:b,expectedDayPlanSha256:digest,observedDbUtc:at,minimumPreparationLeadMinutes:lead});
test("original 192 denominator preserved, primary and update still future at incident",()=>{
 const r=run("2026-11-24T00:35:30.000Z");
 assert.equal(r.planned,192);assert.equal(r.eligible.length+r.missed.length,192);
 assert.equal(r.byHorizon["T-6h"].prospectiveCandidates,64);assert.equal(r.byHorizon["T-90m"].prospectiveCandidates,64);
 assert.equal(r.authorizesPaidGet,false);assert.equal(r.databaseWrites,0);
 assert.ok(r.byHorizon["T-24h"].excluded>0);
});
test("exact preparation boundary excludes, no past replay",()=>{
 const r=run("2026-11-24T17:30:00.000Z");assert.equal(r.byHorizon["T-24h"].prospectiveCandidates,0);
 assert.equal(r.byHorizon["T-6h"].prospectiveCandidates,60);
 const later=run("2026-11-25T02:00:00.000Z");assert.equal(later.eligible.length,0);
});
test("reject tampering even if caller substitutes digest, reject wrong original digest",()=>{
 const p=JSON.parse(bytes);p.templates[0].scheduledRequestUtc="2026-11-24T10:00:00.000Z";const b=Buffer.from(JSON.stringify(p));
 assert.throws(()=>run("2026-11-24T00:35:30.000Z",b,hash(bytes)),/ORIGINAL_PLAN_DIGEST/);
 assert.throws(()=>run("2026-11-24T00:35:30.000Z",b),/ORIGINAL_CLOCK_OR_BUDGET/);
 p.pairedIcaos.HUB="WSSS";assert.throws(()=>run("2026-11-24T00:35:30.000Z",Buffer.from(JSON.stringify(p))),/ORIGINAL_DAY1_GEOMETRY/);
});
