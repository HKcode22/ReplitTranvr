import {describe,it,expect,vi} from "vitest";
import {createHash} from "node:crypto";
vi.mock("../server/lib/disruption/phase5ExpiryReceiverTransport_v39",()=>({
 admitP5ExpiryReceiver:vi.fn(()=>({scope:{apply:false}}))
}));
import {P5_EXPIRY_BUCKET,P5_EXPIRY_DB_ENDPOINT,sealP5ExpiryValues,openP5ExpiryValues,loadP5ExpirySealedConfig} from "../server/lib/disruption/phase5ExpirySealedHandoff_v39";
import {makeP5ExpiryHandoffValues} from "../scripts/v39_phase5_expiry_sealed_handoff_v39";
const sha="a".repeat(40);
const env={V39_DATABASE_RUNTIME_URL:"postgresql://runtime:synthetic@same.invalid/neondb",
 AERODATABOX_WEBHOOK_SECRET:"fictional".repeat(4),V39_PROVIDER_BLOB_MODE:"required",
 V39_PROVIDER_BLOB_BUCKET_ID:P5_EXPIRY_BUCKET,V39_WORKSPACE_RUNTIME_OWNER_MODE:"replit-published-deployment"};
const v={P5_RECURRING_EXPIRY_HTTP_ENABLED:"1",P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256:createHash("sha256").update("fictional").digest("hex"),
 P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha,P5_RECURRING_EXPIRY_MODE:"VERIFY_ONLY",
 P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID:P5_EXPIRY_BUCKET,P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:P5_EXPIRY_DB_ENDPOINT,
 P5_RECURRING_EXPIRY_WRITER_ROLE:"phase5_recurring_expiry_writer_prod",P5_RECURRING_EXPIRY_READER_ROLE:"phase5_recurring_expiry_reader_prod",
 P5_RECURRING_EXPIRY_WRITER_URL:"postgresql://writer:fictional@same.invalid/neondb",
 P5_RECURRING_EXPIRY_READER_URL:"postgresql://reader:fictional@same.invalid/neondb"};
describe("actual AES-GCM with mocked transport DB admission (no production host or credentials)",()=>{
 it("reuses exact commissioned file shape but transfers only scoped URLs and a distinct token digest",()=>{
  const token="b".repeat(64),file={
   P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:"335e77398f3a326721186014c2903ef729e64c03",
   ADB_AUTO_COLLECT:"0",P5_RECURRING_EXPIRY_MODE:"VERIFY_ONLY",V39_PROVIDER_BLOB_MODE:"required",
   V39_PROVIDER_BLOB_BUCKET_ID:P5_EXPIRY_BUCKET,
   P5_RECURRING_EXPIRY_EXPECTED_BUCKET_ID:P5_EXPIRY_BUCKET,P5_RECURRING_EXPIRY_EXPECTED_DB_ENDPOINT_SHA256:P5_EXPIRY_DB_ENDPOINT,
   P5_RECURRING_EXPIRY_WRITER_ROLE:v.P5_RECURRING_EXPIRY_WRITER_ROLE,
   P5_RECURRING_EXPIRY_READER_ROLE:v.P5_RECURRING_EXPIRY_READER_ROLE,
   P5_RECURRING_EXPIRY_WRITER_URL:v.P5_RECURRING_EXPIRY_WRITER_URL,
   P5_RECURRING_EXPIRY_READER_URL:v.P5_RECURRING_EXPIRY_READER_URL
  };
  const values=makeP5ExpiryHandoffValues(file,sha,token);
  expect(values.P5_RECURRING_EXPIRY_HTTP_AUTH_SHA256).toBe(createHash("sha256").update(token).digest("hex"));
  expect(values.P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA).toBe(sha);
  expect(values.P5_RECURRING_EXPIRY_WRITER_URL).toBe(file.P5_RECURRING_EXPIRY_WRITER_URL);
  expect(JSON.stringify(values)).not.toContain(token);
  expect(file.P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA).not.toBe(sha);
  for(const patch of [{DATABASE_URL:"owner"},{P5_RECURRING_EXPIRY_APPROVED_MAIN_SHA:sha},{P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY"}])
   expect(()=>makeP5ExpiryHandoffValues({...file,...patch},sha,token)).toThrow();
 });
 it("round trips, uses fresh salt/IV, binds source and both custody secrets, refuses tamper",()=>{
  const b=sealP5ExpiryValues(v,sha,env);
  expect(openP5ExpiryValues(b,sha,env)).toEqual(v);
  expect(b.equals(sealP5ExpiryValues(v,sha,env))).toBe(false);
  expect(b.toString()).not.toContain("fictional");
  for(const patch of [{AERODATABOX_WEBHOOK_SECRET:"different".repeat(5)},{V39_DATABASE_RUNTIME_URL:"postgresql://runtime:different@same.invalid/neondb"}])
   expect(()=>openP5ExpiryValues(b,sha,{...env,...patch})).toThrow();
  expect(()=>openP5ExpiryValues(b,"c".repeat(40),env)).toThrow();
  const wire=JSON.parse(b.toString());wire.tag=Buffer.alloc(16).toString("base64");
  expect(()=>openP5ExpiryValues(Buffer.from(JSON.stringify(wire)),sha,env)).toThrow();
  expect(()=>sealP5ExpiryValues({...v,P5_RECURRING_EXPIRY_MODE:"APPLY_DUE_ONLY"},sha,env)).toThrow();
 });
 it("only merges exact sealed values into a clean optional config and refuses ambiguous ambient configuration",async()=>{
  const bytes=sealP5ExpiryValues(v,sha,env),store={exists:async()=>true,downloadBytes:async()=>bytes};
  const loaded=await loadP5ExpirySealedConfig(env,sha,store);
  expect(loaded).toEqual({...env,...v});expect(env).not.toHaveProperty("P5_RECURRING_EXPIRY_HTTP_ENABLED");
  await expect(loadP5ExpirySealedConfig({...env,P5_RECURRING_EXPIRY_MODE:"VERIFY_ONLY"},sha,store)).rejects.toThrow();
 });
});
