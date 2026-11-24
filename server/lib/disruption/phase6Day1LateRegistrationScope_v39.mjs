/** Candidate only, no authority by itself. An independently pinned signed
 * recovery policy must bind the exact Day1 original plan and actor context.
 * This pure verifier never chooses airports, backdates or spends.
 */
import {createHash,createPublicKey,verify} from "node:crypto";
import {projectP6Day1RemainingPreparation} from "./phase6Day1ProspectiveRecoveryCandidate_v39.mjs";
const SHA=/^[a-f0-9]{64}$/;
const CODE=/^[a-f0-9]{40}$/;
const hold=x=>{throw Error("HOLD_P6_DAY1_LATE_REGISTRATION_"+x)};
const digest=b=>createHash("sha256").update(b).digest("hex");
const slots=["HUB","MID_A","MID_B","REGIONAL"];
const issuedScopes=new WeakSet();
/** Only scopes verified in this module and process may authorize the draft adapter. */
export function isVerifiedP6Day1LateScope(scope){return !!scope&&issuedScopes.has(scope); }
const paired={HUB:"OMAA",MID_A:"OMSJ",MID_B:"SPJC",REGIONAL:"KDEC"};
const time=x=>{const n=Date.parse(x);if(typeof x!=="string"||!Number.isFinite(n)||new Date(n).toISOString()!==x)hold("CLOCK");return n;};
/** Verify exact signed bytes using a reviewer identity from independent configuration.
 * Do not derive pins from the supplied packet. Caller must obtain actual PG clock
 * and durable rows in a restricted transaction; this verifier is not that transaction.
 */
export function verifyP6Day1LateRegistrationScope({policyBytes,signatureBase64,reviewerPublicKeyPem,pins,dayPlanBytes,observedDbUtc,calendarDay,futureCommittedDraws,existingDrawRows,sourceAttempts,otherRestReservations,unresolvedStops}){
 if(!pins||!SHA.test(pins.policySha256??"")||!SHA.test(pins.reviewerFingerprintSha256??"")||
 !SHA.test(pins.originalDayPlanSha256??"")||!SHA.test(pins.manifestSha256??"")||!SHA.test(pins.calendarSha256??"")||
 !SHA.test(pins.configSha256??"")||!SHA.test(pins.frameSha256??"")||!CODE.test(pins.reviewedCodeSha??"")||
 !Buffer.isBuffer(policyBytes)||policyBytes.length>8192||digest(policyBytes)!==pins.policySha256)hold("PINS");
 let key;try{key=createPublicKey(reviewerPublicKeyPem);}catch{hold("REVIEWER_KEY");}
 if(key.asymmetricKeyType!=="ed25519"||digest(key.export({type:"spki",format:"der"}))!==pins.reviewerFingerprintSha256)hold("REVIEWER_IDENTITY");
 const sig=Buffer.from(signatureBase64??"","base64");
 if(sig.length!==64||sig.toString("base64")!==signatureBase64||!verify(null,policyBytes,key,sig))hold("SIGNATURE");
 let p;try{p=JSON.parse(policyBytes.toString("utf8"));}catch{hold("POLICY_JSON");}
 if(!p||p.schema!=="v39.phase6.day1-late-registration-policy.v1"||p.runDayIndex!==1||p.incidentRunId!==45293307564||
 p.originalDayPlanSha256!==pins.originalDayPlanSha256||p.manifestSha256!==pins.manifestSha256||
 p.calendarSha256!==pins.calendarSha256||p.configSha256!==pins.configSha256||p.frameSha256!==pins.frameSha256||
 p.reviewedCodeSha!==pins.reviewedCodeSha||p.reviewerFingerprintSha256!==pins.reviewerFingerprintSha256||
 p.allowLateFixedPairRegistration!==true||p.allowPaidDispatch!==false||p.allowBackdating!==false||
 p.missingnessClass!=="HONESTLY_UNOBSERVED_NOT_BACKFILLED")hold("POLICY_SCOPE");
 const now=time(observedDbUtc),from=time(p.validFromUtc),until=time(p.validUntilUtc);
 // Bounded to remaining Day1 acquisition windows; a missed early
 // refresh must not suppress a still-future independently valid refresh.
 if(from<time("2026-11-24T00:00:00.000Z")||until>time("2026-11-25T02:00:00.000Z")||now<from||now>=until||until<=from)hold("INCIDENT_WINDOW");
 const c=calendarDay;
 if(!c||c.runDayIndex!==1||c.scheduledStartUtc!=="2026-11-25T00:00:00.000Z"||c.drawType!=="NEW_TEMPLATE"||
 c.calendarHash!==pins.calendarSha256||c.configHash!==pins.configSha256||c.frameHash!==pins.frameSha256||
 !c.pairAirportSet||Object.keys(c.pairAirportSet).length!==4||
 slots.some(s=>c.pairAirportSet[s]?.icao!==paired[s]||c.pairAirportSet[s]?.region!==c.slotRegions?.[s]))hold("CALENDAR_OR_PAIR");
 if(!Array.isArray(existingDrawRows)||existingDrawRows.length!==0||sourceAttempts!==0||otherRestReservations!==0||unresolvedStops!==0)hold("EXISTING_OR_UNCERTAIN_HISTORY");
 if(!Array.isArray(futureCommittedDraws)||futureCommittedDraws.length>120||
 futureCommittedDraws.some(r=>!Number.isSafeInteger(r.runDayIndex)||r.runDayIndex<2||r.runDayIndex>31||
 !/^[A-Z]{4}$/.test(r.icao??"")))hold("FUTURE_HISTORY");
 // Never rewind sampling state for an airport already registered for a later day.
 if(futureCommittedDraws.some(r=>Object.values(paired).includes(r.icao)))hold("FUTURE_SITE_STATE_CONFLICT");
 const projection=projectP6Day1RemainingPreparation({dayPlanBytes,expectedDayPlanSha256:pins.originalDayPlanSha256,observedDbUtc,minimumPreparationLeadMinutes:p.minimumPreparationLeadMinutes});
 if(projection.byHorizon["T-24h"].prospectiveCandidates!==0||projection.templates.length===0)hold("NO_ELIGIBLE_REMAINING_HORIZON");
 const result=Object.freeze({schema:"v39.phase6.day1-late-registration-verified-scope.v1",runDayIndex:1,observedDbUtc,policySha256:pins.policySha256,
 manifestSha256:pins.manifestSha256,calendarSha256:pins.calendarSha256,configSha256:pins.configSha256,frameSha256:pins.frameSha256,
 originalDayPlanSha256:pins.originalDayPlanSha256,reviewedCodeSha:pins.reviewedCodeSha,
 fixedAirports:Object.freeze({...paired}),candidateQueryCount:projection.templates.length,excludedQueryCount:projection.excluded.length,
 remainingPreparationProjectionSha256:projection.projectionSha256,byHorizon:projection.byHorizon,
 providerCalls:0,databaseWrites:0,authorizesPaidGet:false,requiresRestrictedAtomicRegistration:true});
 issuedScopes.add(result);return result;
}
