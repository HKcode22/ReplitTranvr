import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash,generateKeyPairSync} from "node:crypto";
import {
 NEXT3_INFINITE_VALIDITY_V39,NEXT3_NO_TTL_INTENT_V39,
 NEXT3_NO_TTL_BLOB_V39,next3InfinitySqlV39
} from "../scripts/v39_gate4_next3_no_expiry_roles_and_custody_v39";
import {
 NEXT3_SOURCE_V39,NEXT3_OWNER_ROLE_V39,
 sealNext3OwnerCustodyV39,openNext3OwnerCustodyV39
} from "../scripts/v39_gate4_next3_no_provider_writer_signer_seal_v39";
import {NEXT3_ID,NEXT3_RECEIVER_ROLE} from
 "../server/lib/disruption/gate4Next3SealedBootstrap_v39";

const file=(s:string)=>readFileSync(new URL("../"+s,import.meta.url),"utf8");
const repair=file("scripts/v39_gate4_next3_no_expiry_roles_and_custody_v39.ts");
const loader=file("scripts/v39_gate4_next3_paid_trial_custody_v39.ts");
const paid=file("scripts/v39_gate4_next3_one_paid_create_operator_v39.ts");

describe("NEXT3 restricted role expiry retirement (NO provider; no production DB)",()=>{
 it("permits ONLY existing scoped receiver/writer roles; no password/privilege rotation",()=>{
  expect(NEXT3_INFINITE_VALIDITY_V39).toBe("infinity");
  expect(next3InfinitySqlV39(NEXT3_RECEIVER_ROLE)).toBe(
   'ALTER ROLE "gate4_receiver_2026_next3" VALID UNTIL \'infinity\'');
  expect(next3InfinitySqlV39(NEXT3_OWNER_ROLE_V39)).toBe(
   'ALTER ROLE "gate4_owner_writer_2026_next3" VALID UNTIL \'infinity\'');
  expect(()=>next3InfinitySqlV39("postgres")).toThrow("FOREIGN_ROLE");
  expect(repair).not.toContain("ALTER ROLE \"postgres\"");
  expect(repair).not.toContain("ALTER ROLE \"neondb_owner\"");
  expect(repair).not.toContain(" PASSWORD ");
  expect(repair).not.toContain("CREATE ROLE");
  expect(repair).not.toContain("GRANT ALL");
  expect(repair).not.toContain("getBalanceEvidenceStrict");
  expect(repair).not.toContain("createGate4SingleWithRawReceiptV39");
  expect(repair).toContain('mode==="--extend-once"');
  expect(repair).toContain("GATE4_NEXT3_EXPIRY_OPERATOR_SHA");
  expect(repair).toContain("GATE4_NEXT3_EXPIRY_GO");
 });
 it("binds previous 9PM custody and authenticates four RLS policies",()=>{
  expect(repair).toContain("NEXT3_EXPIRY_BLOB_V39");
  expect(repair).toContain("NEXT3_EXTENDED_EXPIRES_V39");
  expect(repair).toContain("PREVIOUS_EXTENSION_CUSTODY_DRIFT");
  expect(repair).toContain("p.role_count===1&&p.assigned_role===role");
  expect(repair).toContain("RLS_POLICY_DRIFT");
  expect(repair).toContain("SYNTHETIC_OR_OWNER_DRIFT");
  expect(repair).toContain('rolvaliduntil=\'infinity\'::timestamptz');
  expect(repair).toContain("BEFORE");
  expect(repair).toContain("2026-10-26T04:00:00.000Z");
 });
 it("writes immutable intent before exactly two SQL modifications and encrypts V3 afterward",()=>{
  expect(NEXT3_NO_TTL_INTENT_V39).toContain("internal/gate4/next3/");
  expect(NEXT3_NO_TTL_BLOB_V39).toContain("internal/gate4/next3/");
  const intent=repair.indexOf("await storage.uploadBytes(NEXT3_NO_TTL_INTENT_V39,intent)");
  const alter=repair.indexOf("await db.query(next3InfinitySqlV39(role))");
  const seal=repair.indexOf("await storage.uploadBytes(NEXT3_NO_TTL_BLOB_V39,sealed)");
  expect(intent).toBeGreaterThan(0);
  expect(alter).toBeGreaterThan(intent);
  expect(seal).toBeGreaterThan(alter);
  expect(repair).toContain("EXTENSION_ALREADY_ATTEMPTED");
  expect(repair).toContain("BEGIN ISOLATION LEVEL SERIALIZABLE");
  expect(repair).toContain('mode==="--verify"');
  expect(repair).toContain("providerCalls:0");
 });
 it("loads only consistent, source/signer-bound V3; ambiguous partial fails closed",()=>{
  expect(loader).toContain("NEXT3_NO_TTL_INTENT_V39");
  expect(loader).toContain("NEXT3_NO_TTL_BLOB_V39");
  expect(loader).toContain("noTtlIntent!==noTtlBlob");
  expect(loader).toContain('hold("NO_EXPIRY_CUSTODY_PARTIAL")');
  expect(loader).toContain("NO_EXPIRY_CUSTODY_UNTRUSTED");
  expect(loader).toContain("current.signerSpkiSha256!==custody.signerSpkiSha256");
  expect(loader).toContain("current.writerExpiresUtc!==NEXT3_INFINITE_VALIDITY_V39");
  expect(loader).toContain('current.writerExpiresUtc!==NEXT3_INFINITE_VALIDITY_V39&&');
 });
 it("supports AES-GCM roundtrip with exact infinity sentinel and preserves signature",()=>{
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const priv=Buffer.from(privateKey.export({format:"der",type:"pkcs8"}));
  const pub=Buffer.from(publicKey.export({format:"der",type:"spki"}));
  const data={
   sourceSha:NEXT3_SOURCE_V39,scopeId:NEXT3_ID,
   authorizationSha256:"f".repeat(64),
   writerUrl:"postgresql://gate4_owner_writer_2026_next3:fake_secure_local_pass@fake-dev-db.example.org:5432/neondb?sslmode=verify-full",
   writerExpiresUtc:"infinity",
   signerPrivatePkcs8Base64:priv.toString("base64"),
   signerPublicSpkiBase64:pub.toString("base64"),
   signerSpkiSha256:createHash("sha256").update(pub).digest("hex")
  };
  const env={
   V39_DATABASE_RUNTIME_URL:"postgresql://only_test_runtime:fake_runtime_password@fake-dev-db.example.org:5432/neondb?sslmode=verify-full",
   AERODATABOX_WEBHOOK_SECRET:"only-test-synthetic-in-memory-secret-00000"
  } as NodeJS.ProcessEnv;
  const blob=sealNext3OwnerCustodyV39(data,env);
  const opened=openNext3OwnerCustodyV39(blob,data.authorizationSha256,env);
  expect(opened).toEqual(data);
 });
 it("paid operator retains exact GO, active STOP + independent observer, no implicit create",()=>{
  expect(paid).toContain('x.writerExpiresUtc!=="infinity"');
  expect(paid).toContain('hold("WRITER_EXPIRY_BEFORE_STOP_SETTLEMENT_BUFFER")');
  expect(paid).toContain("next3StopArmedV39(scope,runnerSha,stopRunId)");
  expect(paid).toContain("next3ObserverRunningV39(healthRunId,runnerSha)");
  expect(paid).toContain("await next3PutOnceV39(x.storage,INTENT");
  expect(paid).toContain('readyForPaidCreate:false');
  expect(paid).toContain("createAttempted=true");
  expect(paid).toContain("providerHttpPostAcceptanceUnconfirmed:createAttempted");
 });
});
