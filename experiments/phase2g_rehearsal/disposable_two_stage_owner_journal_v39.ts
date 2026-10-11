import {createHash} from "node:crypto";
import type {PoolClient} from "pg";
import {
  verifySyntheticTwoStageOwnerV39
} from "./synthetic_two_stage_owner_protocol_v39";

/**
 * TEST ONLY: P13 prospective LOGGED one-plan/one-subscription journal.
 * A database row is atomic; a provider CREATE and database INSERT are NOT.
 * Do NOT invoke a provider or interpret a row as authoritative billing.
 * The test database and schema are disposable and intentionally hard-gated.
 *
 * Fixture DDL: p2g_two_stage_fixture.owner_bindings
 *   plan_sha256 PRIMARY KEY,
 *   subscription_id UNIQUE,
 *   create_attempt_sha256 UNIQUE,
 *   post_freeze_sha256,
 *   signed_binding_sha256,
 *   bound_at_utc
 */
const TARGET="p2g_two_stage_fixture.owner_bindings";
const onlyDisposable=()=>{
  if(process.env.P2G_DISPOSABLE_POSTGRES!=="YES"||
     process.env.V39_DATABASE_RUNTIME_URL||
     process.env.AERODATABOX_API_KEY)
    throw new Error("TWO_STAGE_DISPOSABLE_ONLY");
  let url:URL;
  try{url=new URL(process.env.P2G_FIXTURE_POSTGRES_URL??"")}
  catch{throw new Error("TWO_STAGE_DISPOSABLE_URL_REQUIRED")}
  if(url.hostname!=="127.0.0.1"||url.pathname!=="/p2g_stage1_fixture")
    throw new Error("TWO_STAGE_NONDISPOSABLE_TARGET_REFUSED");
};

export async function recordSyntheticTwoStageOwnerBindingV39(input:{
  client:Pick<PoolClient,"query">;
  verification:Parameters<typeof verifySyntheticTwoStageOwnerV39>[0];
}):Promise<{
  duplicate:boolean;
  planSha256:string;
  postFreezeSha256:string;
  providerSubscriptionId:string;
  productionSubscriptionUniquenessProven:false;
  paidLaunchAuthorized:false;
  automaticRecoveryAuthorized:false;
}>{
  onlyDisposable();
  // Cryptographic and external-context preflight MUST happen before a write.
  const verified=verifySyntheticTwoStageOwnerV39(input.verification);
  const bind=input.verification.signedBinding.binding;
  const signedBindingSha256=createHash("sha256")
    .update("p2g-synthetic-signed-binding-record-v1\n")
    .update(JSON.stringify([
      bind.schema,bind.mode,bind.prePlanSha256,bind.postFreezeSha256,
      bind.providerSubscriptionId,bind.createAttemptSha256,
      bind.providerCreatedAtUtc,bind.boundAtUtc,
      input.verification.signedBinding.signatureBase64
    ])).digest("hex");
  const inserted=await input.client.query(
    "INSERT INTO "+TARGET+" (plan_sha256,subscription_id,"+
    " create_attempt_sha256,post_freeze_sha256,signed_binding_sha256,bound_at_utc)"+
    " VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING"+
    " RETURNING plan_sha256",
    [verified.prePlanSha256,verified.providerSubscriptionId,
     bind.createAttemptSha256,verified.boundFreezeSha256,
     signedBindingSha256,bind.boundAtUtc]
  );
  const stored=await input.client.query(
    "SELECT plan_sha256,subscription_id,create_attempt_sha256,"+
    "post_freeze_sha256,signed_binding_sha256,bound_at_utc "+
    "FROM "+TARGET+" WHERE plan_sha256=$1",
    [verified.prePlanSha256]
  );
  if(stored.rowCount!==1)
    throw new Error("TWO_STAGE_SUBSCRIPTION_OR_CREATE_TOKEN_ALREADY_OWNED");
  const s=stored.rows[0];
  if(s.subscription_id!==verified.providerSubscriptionId||
     s.create_attempt_sha256!==bind.createAttemptSha256||
     s.post_freeze_sha256!==verified.boundFreezeSha256||
     s.signed_binding_sha256!==signedBindingSha256||
     new Date(s.bound_at_utc).toISOString()!==bind.boundAtUtc)
    throw new Error("TWO_STAGE_IMMUTABLE_JOURNAL_CONFLICT");
  return {
    duplicate:inserted.rowCount===0,
    planSha256:verified.prePlanSha256,
    postFreezeSha256:verified.boundFreezeSha256,
    providerSubscriptionId:verified.providerSubscriptionId,
    productionSubscriptionUniquenessProven:false,
    paidLaunchAuthorized:false,automaticRecoveryAuthorized:false
  };
}
