import {describe,it,expect,vi} from "vitest";
import {makeP5ExpiryHandoffValues} from "../scripts/v39_phase5_expiry_sealed_handoff_v39";
import {P5_EXPIRY_BUCKET,P5_EXPIRY_DB_ENDPOINT,p5ExpirySealKey,sealP5ExpiryValues,openP5ExpiryValues,loadP5ExpirySealedConfig} from "../server/lib/disruption/phase5ExpirySealedHandoff_v39";
// The actual endpoint is private. This file checks real production
// admission refusal. Separate crypto tests mock only that admission
// predicate to exercise real authenticated encryption with synthetic keys.
const sha="a".repeat(40),token="b".repeat(64);
const env={V39_DATABASE_RUNTIME_URL:"postgresql://runtime:synthetic@same.invalid/neondb",
 AERODATABOX_WEBHOOK_SECRET:"fictional".repeat(4),V39_PROVIDER_BLOB_MODE:"required",
 V39_PROVIDER_BLOB_BUCKET_ID:P5_EXPIRY_BUCKET,V39_WORKSPACE_RUNTIME_OWNER_MODE:"replit-published-deployment"};
describe("sealed expiry handoff safe refusal",()=>{
 it("never allows arbitrary object name, mode, source, or owner credentials",()=>{
  expect(p5ExpirySealKey(sha)).toContain(sha);
  expect(()=>p5ExpirySealKey("../outside")).toThrow();
  for(const x of [{DATABASE_URL:"owner"},{P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY"},
    {P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:P5_EXPIRY_DB_ENDPOINT}])
   expect(()=>makeP5ExpiryHandoffValues(x,sha,token)).toThrow();
  expect(()=>sealP5ExpiryValues({},sha,env)).toThrow();
  expect(()=>openP5ExpiryValues(Buffer.from("bad"),sha,env)).toThrow();
 });
 it("explicit disabled config bypasses storage; missing bundle leaves receiver unchanged",async()=>{
  const store={exists:vi.fn(async()=>false),downloadBytes:vi.fn(async()=>Buffer.from("bad"))};
  const disabled={...env,P5_RECURRING_EXPIRY_HTTP_ENABLED:"0"};
  expect(await loadP5ExpirySealedConfig(disabled,sha,store)).toBe(disabled);
  expect(store.exists).not.toHaveBeenCalled();
  expect(await loadP5ExpirySealedConfig(env,sha,store)).toBe(env);
  expect(store.exists).toHaveBeenCalledWith(p5ExpirySealKey(sha));expect(store.downloadBytes).not.toHaveBeenCalled();
 });
 it("malformed sealed object never enables route",async()=>{
  const store={exists:vi.fn(async()=>true),downloadBytes:vi.fn(async()=>Buffer.from("bad"))};
  await expect(loadP5ExpirySealedConfig(env,sha,store)).rejects.toThrow("P5_EXPIRY_SEALED_HANDOFF_HOLD");
 });
});
