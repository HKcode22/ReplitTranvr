import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {verifyP6Day1LateRegistrationScope} from "../server/lib/disruption/phase6Day1LateRegistrationScope_v39.mjs";
const hash=b=>createHash("sha256").update(b).digest("hex");
const plan=readFileSync(new URL("../data-collection/phase5/planning/phase6-source-day-01.json",import.meta.url));
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const p={schema:"v39.phase6.day1-late-registration-policy.v1",runDayIndex:1,incidentRunId:45293307564,originalDayPlanSha256:hash(plan),manifestSha256:"a".repeat(64),calendarSha256:"b".repeat(64),configSha256:"c".repeat(64),frameSha256:"d".repeat(64),reviewedCodeSha:"e".repeat(40),reviewerFingerprintSha256:hash(publicKey.export({type:"spki",format:"der"})),allowLateFixedPairRegistration:true,allowPaidDispatch:false,allowBackdating:false,missingnessClass:"HONESTLY_UNOBSERVED_NOT_BACKFILLED",validFromUtc:"2026-11-24T00:00:00.000Z",validUntilUtc:"2026-11-24T17:30:00.000Z",minimumPreparationLeadMinutes:15};
const pairs={HUB:"OMAA",MID_A:"OMSJ",MID_B:"SPJC",REGIONAL:"KDEC"};
const args=(policy=p)=>{
 const policyBytes=Buffer.from(JSON.stringify(policy));
 return {policyBytes,signatureBase64:sign(null,policyBytes,privateKey).toString("base64"),reviewerPublicKeyPem:publicKey.export({type:"spki",format:"pem"}),pins:{...p,policySha256:hash(policyBytes)},dayPlanBytes:plan,observedDbUtc:"2026-11-24T00:45:47.000Z",calendarDay:{runDayIndex:1,scheduledStartUtc:"2026-11-25T00:00:00.000Z",drawType:"NEW_TEMPLATE",calendarHash:p.calendarSha256,configHash:p.configSha256,frameHash:p.frameSha256,slotRegions:Object.fromEntries(Object.keys(pairs).map(k=>[k,k])),pairAirportSet:Object.fromEntries(Object.entries(pairs).map(([k,v])=>[k,{icao:v,region:k}]))},futureCommittedDraws:[{runDayIndex:2,icao:"WSSS"},{runDayIndex:2,icao:"SBFL"},{runDayIndex:2,icao:"TJSJ"},{runDayIndex:2,icao:"LSZB"}],existingDrawRows:[],sourceAttempts:0,otherRestReservations:0,unresolvedStops:0};
};
test("exact signed bounded scope allows only a candidate late registration",()=>{
 const r=verifyP6Day1LateRegistrationScope(args());
 assert.equal(r.authorizesPaidGet,false);assert.equal(r.databaseWrites,0);assert.deepEqual(r.fixedAirports,pairs);assert.equal(r.candidateQueryCount+r.excludedQueryCount,192);
});
test("reject signature substitution, expired time, existing spend, conflicting future selection",()=>{
 const a=args();assert.throws(()=>verifyP6Day1LateRegistrationScope({...a,signatureBase64:Buffer.alloc(64).toString("base64")}),/SIGNATURE/);
 assert.throws(()=>verifyP6Day1LateRegistrationScope({...a,observedDbUtc:"2026-11-24T17:30:00.000Z"}),/INCIDENT_WINDOW/);
 assert.throws(()=>verifyP6Day1LateRegistrationScope({...a,sourceAttempts:1}),/HISTORY/);
 assert.throws(()=>verifyP6Day1LateRegistrationScope({...a,futureCommittedDraws:[{runDayIndex:2,icao:"OMAA"}]}),/FUTURE_SITE_STATE_CONFLICT/);
});
test("no blanket recovery or paid GO, no redraw",()=>{
 assert.throws(()=>verifyP6Day1LateRegistrationScope(args({...p,allowPaidDispatch:true})),/POLICY_SCOPE/);
 assert.throws(()=>verifyP6Day1LateRegistrationScope(args({...p,allowBackdating:true})),/POLICY_SCOPE/);
 const a=args();a.calendarDay.pairAirportSet.HUB.icao="WSSS";assert.throws(()=>verifyP6Day1LateRegistrationScope(a),/CALENDAR_OR_PAIR/);
});
