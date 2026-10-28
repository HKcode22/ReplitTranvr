import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import type {Client} from "pg";
import {
  reviewGate05UnloggedPrecreateRecoveryTimeV39,
  restoreExactGate05PreparedCallbackAfterRestartV39,
  type Gate05NoPaidCrashRecoveryScopeV39
} from "../server/lib/disruption/gate05PreparedCallbackRestartRecovery_v39";
const source=readFileSync("scripts/v39_gate05_science_one_paid_create_once_v39.ts","utf8");
const helper=readFileSync("server/lib/disruption/gate05PreparedCallbackRestartRecovery_v39.ts","utf8");
const scope:Gate05NoPaidCrashRecoveryScopeV39={
 sessionId:"98bbf760-6211-4eaa-908c-240be91e7b0d",
 receiverSource:"1".repeat(40),
 authorizationSha256:"2".repeat(64),
 stopTicketSha256:"3".repeat(64),
 startAtUtc:"2026-10-28T05:00:00.000Z",
 stopAtUtc:"2026-10-28T06:00:00.000Z",
 expiresAtUtc:"2026-10-28T06:20:00.000Z"
};
const now=Date.parse("2026-10-28T04:55:00.000Z");
const safe={
 providerAccountHasNoActiveSubscriptions:true,
 providerBalanceUnchanged:true,
 exactSafetyStopRunningAndAuthenticated:true,
 noPreviousPaidCreateIntent:true,
 publishedRuntimeDbAndSecretAuthenticated:true,
 nowMs:now
} as const;
function fake(overrides?:{state?:string;postmaster?:string;priorBlob?:boolean;callbackAlreadyPresent?:boolean}){
 const calls:string[]=[];
 const owner={
  session_id:scope.sessionId,airport_icao:"WSSS",
  source_commit:scope.receiverSource,
  authorization_sha256:scope.authorizationSha256,
  reviewed_stop_ticket_sha256:scope.stopTicketSha256,
  alert_credit_ceiling:500,early_stop_credits:350,rest_api_units_ceiling:12,
  state:overrides?.state??"PREPARED",
  provider_subscription_id:null,
  created_at_utc:"2026-10-28T04:30:00.000Z",
  start_at_utc:scope.startAtUtc,stop_at_utc:scope.stopAtUtc,
  session_expires_at_utc:scope.expiresAtUtc
 };
 const session={state:"armed",owner_kind:"phase3_gate05_science",
  icao:"WSSS",provider_subscription_id:null,expires_at_utc:scope.expiresAtUtc};
 const database={
  db:"neondb",actor:"neondb_owner",table_persistence:"u",
  restarted_at_utc:overrides?.postmaster??"2026-10-28T04:50:50.000Z"
 };
 const query=async(sql:string,params?:any[])=>{
  calls.push(sql.trim());
  if(sql.includes("pg_postmaster_start_time"))return {rows:[database],rowCount:1};
  if(sql.includes("FROM clean.phase3_gate05_science_owner_v39"))return {rows:[owner],rowCount:1};
  if(sql.includes("FROM clean.provider_content_blob_ref"))return {
   rows:[{any_prior_webhook_custody:overrides?.priorBlob??false}],rowCount:1
  };
  if(sql.includes("FROM clean.prepaid_probe_session_runtime")&&
     sql.includes("FOR UPDATE"))return overrides?.callbackAlreadyPresent?
    {rows:[session],rowCount:1}:{rows:[],rowCount:0};
  if(sql.includes("FROM clean.prepaid_probe_session_runtime"))
   return {rows:[session],rowCount:1};
  return {rows:[],rowCount:0};
 };
 return {db:{query} as unknown as Client,calls};
}
describe("Gate05 exact scientific UNLOGGED pre-CREATE crash recovery",()=>{
 it("rehydrates only original prepared WSSS session with postmaster newer than original",async()=>{
  const {db,calls}=fake();
  const r=await restoreExactGate05PreparedCallbackAfterRestartV39(db,scope,{...safe});
  expect(r.status).toBe("RESTORED_PREPARED_CALLBACK_AFTER_POSTMASTER_RESTART");
  expect(r.providerCreates).toBe(0);
  expect(r.paidFidsGets).toBe(0);
  expect(r.newSubscriptionAllowedByThisRecovery).toBe(false);
  expect(calls).toContain("COMMIT");
  expect(calls.some(s=>s.includes("INSERT INTO clean.prepaid_probe_session_runtime"))).toBe(true);
  expect(calls.some(s=>s.includes("FOR UPDATE"))).toBe(true);
 });
 it("never reactivates a paid or failed owner",async()=>{
  for(const state of ["ACTIVE","FAILED","STOPPED"]){
   const {db,calls}=fake({state});
   await expect(restoreExactGate05PreparedCallbackAfterRestartV39(db,scope,{...safe}))
     .rejects.toThrow("NOT_CERTIFIED_POSTMASTER_RESET_AND_PRESTART_WINDOW");
   expect(calls).not.toContain("COMMIT");
   expect(calls).toContain("ROLLBACK");
  }
 });
 it("requires exact external STOP, zero provider activity and intact balance",async()=>{
  for(const k of [
   "providerAccountHasNoActiveSubscriptions","providerBalanceUnchanged",
   "exactSafetyStopRunningAndAuthenticated",
   "noPreviousPaidCreateIntent",
   "publishedRuntimeDbAndSecretAuthenticated"
  ] as const){
   const {db,calls}=fake();
   await expect(restoreExactGate05PreparedCallbackAfterRestartV39(db,scope,{
     ...safe,[k]:false
   } as any)).rejects.toThrow("EXACT_ACCOUNT_STOP_AUTH_REQUIRED");
   expect(calls).toEqual([]);
  }
 });
 it("never 'recovers' an ordinary missing row without a subsequent postmaster restart",async()=>{
  const {db,calls}=fake({postmaster:"2026-10-28T04:20:00.000Z"});
  await expect(restoreExactGate05PreparedCallbackAfterRestartV39(db,scope,{...safe}))
    .rejects.toThrow("NOT_CERTIFIED_POSTMASTER_RESET_AND_PRESTART_WINDOW");
  expect(calls).toContain("ROLLBACK");
  expect(calls).not.toContain("COMMIT");
 });
 it("rejects any prior raw-provider blob evidence or unexpected existing session",async()=>{
  const a=fake({priorBlob:true});
  await expect(restoreExactGate05PreparedCallbackAfterRestartV39(a.db,scope,{...safe}))
    .rejects.toThrow("POSSIBLE_PRIOR_PROVIDER_DELIVERY");
  const b=fake({callbackAlreadyPresent:true});
  await expect(restoreExactGate05PreparedCallbackAfterRestartV39(b.db,scope,{...safe}))
    .rejects.toThrow("UNLOGGED_RUNTIME_NOT_MISSING");
 });
 it("must freeze a real hour, only attempt between T-10m and T-30s",()=>{
  const owner=Date.parse("2026-10-28T04:30:00Z");
  const reset=Date.parse("2026-10-28T04:50:50Z");
  const start=Date.parse(scope.startAtUtc);
  expect(()=>reviewGate05UnloggedPrecreateRecoveryTimeV39(
   start-5*60000,owner,reset,start,start+3600000,"PREPARED",true
  )).not.toThrow();
  expect(()=>reviewGate05UnloggedPrecreateRecoveryTimeV39(
   start+16000,owner,reset,start,start+3600000,"PREPARED",true
  )).toThrow();
  expect(()=>reviewGate05UnloggedPrecreateRecoveryTimeV39(
   start-45*60000,owner,reset,start,start+3600000,"PREPARED",true
  )).toThrow();
  expect(()=>reviewGate05UnloggedPrecreateRecoveryTimeV39(
   start-5*60000,owner,reset,start,start+40*60000,"PREPARED",true
  )).toThrow();
 });
 it("paid caller checks fresh runtime again immediately before intent, not blind retry",()=>{
  for(const s of [
   "restoreExactGate05PreparedCallbackAfterRestartV39",
   "NO_PAID_CALLBACK_RECOVERY_RUNTIME_DB_ATTESTATION",
   "NO_PAID_CALLBACK_RECOVERY_ACCOUNT_NOT_STABLE",
   "LAST_MOMENT_CALLBACK_ROW_LOST_BEFORE_CREATE",
   "liveSafety(input.stopRun,m,head)",
   "if(existsSync(INTENT)||existsSync(RECEIPT))"
  ])expect(source).toContain(s);
  const final=source.indexOf("LAST_MOMENT_CALLBACK_ROW_LOST_BEFORE_CREATE");
  const intent=source.indexOf("privateOnce(INTENT");
  const post=source.indexOf("const response=await createGate4SingleWithRawReceiptV39");
  expect(final).toBeLessThan(intent);
  expect(intent).toBeLessThan(post);
  expect(helper).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(helper).not.toContain("deleteSubscriptionVerifiedStrict");
 });
});
