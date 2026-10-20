/**
 * CI-ONLY signed Gate05 PREPARED transaction rehearsal.
 *
 * No production commissioning entrypoint is exported by this file. Uses an
 * EPHEMERAL, SELF-PINNED TEST SIGNER (not owner authentication); no paid
 * consent, deployment, external API, or live database rights are asserted.
 *
 * V0066/V0067/V0068 are applied only within a disposable-PG16 transaction.
 * Every mutation is rolled back, even on failed assertions.
 */
import {describe,it,expect} from "vitest";
import {createHash,generateKeyPairSync,randomUUID,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import pg from "pg";
import {gate05FidsQueryFingerprintV39} from "../server/lib/disruption/gate05ScopedFidsOwner_v39";
import {gate05Ed25519SigningMessageV39} from "../server/lib/disruption/gate05DetachedEd25519Approval_v39";
import {reviewGate05SignedPreparedCommissionV39} from "../server/lib/disruption/gate05SignedPreparedCommissionReview_v39";
import {
  gate05PreparedCommissionInventorySqlV39,
  verifyGate05PreparedCommissionInventoryV39,
  verifyGate05PreparedReadbackV39
} from "../server/lib/disruption/gate05AuthorizationArtifact_v39";

const disposableUrl="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const inCI=process.env.GITHUB_ACTIONS==="true"&&
  process.env.NODE_ENV==="test"&&
  process.env.DATABASE_URL===disposableUrl&&
  !process.env.AERODATABOX_API_KEY;
const onlyCI=inCI?describe:describe.skip;
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");

function signedFixture(){
  const {publicKey,privateKey}=generateKeyPairSync("ed25519");
  const publicDer=Buffer.from(publicKey.export({format:"der",type:"spki"}));
  const observed=new Date();
  const starts=new Date(observed.getTime()+12*60_000).toISOString();
  const expires=new Date(observed.getTime()+42*60_000).toISOString();
  const reset=new Date(observed.getTime()+10*86_400_000).toISOString();
  const q={icao:"WSSS",fromLocal:"2026-10-21T10:00",toLocal:"2026-10-21T11:00"};
  const artifact={
    schema:"v39.gate05.fids-feasibility-auth.v1",
    scopeId:randomUUID(),authorizationId:"AUTH-G05-DISPOSABLE-SIGNED-001",
    sourceCommit:"a".repeat(40),openapiSha256:"b".repeat(64),
    cycleId:"ci-test-only-no-provider-entitlement",providerResetUtc:reset,
    airportIcao:"WSSS",ianaTimezone:"Asia/Singapore",
    fromLocal:q.fromLocal,toLocal:q.toLocal,
    startsAtUtc:starts,expiresAtUtc:expires,
    noLocationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:false}),
    locationQuerySha256:gate05FidsQueryFingerprintV39({...q,withLocation:true}),
    maxBaseUnits:4,maxRetryUnits:8,maxTotalUnits:12,maxAlertCreates:0,
    purpose:"TWO_QUERY_FEASIBILITY_NOT_SCIENTIFIC_PILOT"
  };
  const authorizationBytes=Buffer.from(JSON.stringify(artifact));
  const detachedSignatureBase64=sign(
    null,gate05Ed25519SigningMessageV39(authorizationBytes),privateKey
  ).toString("base64");
  const independentPins={
    independentlyReviewedArtifactSha256:sha(authorizationBytes),
    independentlyApprovedSignerSpkiSha256:sha(publicDer),
    expectedSourceCommit:artifact.sourceCommit,
    expectedOpenapiSha256:artifact.openapiSha256,
    expectedProviderResetUtc:reset,
    expectedIanaTimezone:"Asia/Singapore",
    observedNowUtc:observed.toISOString()
  };
  return {
    authorizationBytes,detachedSignatureBase64,
    signerPublicKeySpkiDerBase64:publicDer.toString("base64"),
    independentPins
  };
}
onlyCI("Gate05 signed PREPARED transaction is all-or-nothing on disposable PG16",()=>{
  it("requires valid signature, rolls back injected failure, and verifies exact 3-row readback",async()=>{
    const fixture=signedFixture();
    const reviewed=reviewGate05SignedPreparedCommissionV39(fixture);
    expect(reviewed.cryptographicSignatureVerified).toBe(true);
    expect(reviewed.productionCommissioningAuthorized).toBe(false);
    expect(reviewed.paidPilotAuthorized).toBe(false);
    expect(reviewed.plannedCommands).toHaveLength(2);

    // No DB work occurs even in this test when the signer/pin is wrong.
    expect(()=>reviewGate05SignedPreparedCommissionV39({
      ...fixture,detachedSignatureBase64:Buffer.alloc(64,0).toString("base64")
    })).toThrow("GATE05_SIGNER_SIGNATURE_NOT_VALID_HOLD");
    expect(()=>reviewGate05SignedPreparedCommissionV39({
      ...fixture,independentPins:{
        ...fixture.independentPins,
        independentlyApprovedSignerSpkiSha256:"0".repeat(64)
      }
    })).toThrow("GATE05_SIGNER_ROOT_PIN_MISMATCH_HOLD");

    const db=new pg.Client({connectionString:disposableUrl,connectionTimeoutMillis:8000});
    await db.connect();
    try{
      expect((await db.query("SELECT current_database() AS db")).rows[0].db).toBe("v39_ci");
      await db.query("BEGIN");
      await db.query("SELECT pg_advisory_xact_lock(hashtext('gate05_staged_schema_test_v39'))");
      for(const file of [
        "V0066__gate05_scoped_fids_budget_v39.sql",
        "V0067__gate05_fids_function_only_roles_v39.sql",
        "V0068__gate05_single_open_scope_v39.sql"
      ]){
        await db.query(readFileSync("migrations/staged/"+file,"utf8"));
      }

      const inventory=gate05PreparedCommissionInventorySqlV39(reviewed.scopeId);
      const fetchInv=async()=>(await db.query(inventory.sql,[...inventory.params])).rows;
      expect(verifyGate05PreparedCommissionInventoryV39(
        await fetchInv(),"BEFORE"
      ).status).toBe("NO_CONCURRENT_OPEN_SCOPE_VERIFIED");

      // Simulated failure AFTER owner INSERT but BEFORE both allowlisted
      // queries: SQL error aborts the savepoint and leaves no orphan scope.
      await db.query("SAVEPOINT inject_failure");
      const first=reviewed.plannedCommands[0];
      const second=reviewed.plannedCommands[1];
      expect((await db.query(first.sql,[...first.params])).rowCount).toBe(1);
      await expect(db.query("SELECT 1/0")).rejects.toMatchObject({code:"22012"});
      await db.query("ROLLBACK TO SAVEPOINT inject_failure");
      await db.query("RELEASE SAVEPOINT inject_failure");
      expect(verifyGate05PreparedCommissionInventoryV39(
        await fetchInv(),"BEFORE"
      ).status).toBe("NO_CONCURRENT_OPEN_SCOPE_VERIFIED");

      // Only PREPARED is written; ACTIVE, new reservations and STOP are not
      // initiated. This is a rehearsal, NOT approved human commissioning.
      expect((await db.query(first.sql,[...first.params])).rowCount).toBe(1);
      expect((await db.query(second.sql,[...second.params])).rowCount).toBe(2);
      expect(verifyGate05PreparedCommissionInventoryV39(
        await fetchInv(),"AFTER"
      ).status).toBe("ONE_EXCLUSIVE_PREPARED_SCOPE_VERIFIED");
      const scopeRows=(await db.query(
        "SELECT scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc,state,base_cap_units,retry_cap_units,"+
        "base_used_units,retry_used_units,stopped_at_utc,stop_reason "+
        "FROM clean.gate05_fids_pilot_scope_v39 WHERE scope_id=$1",
        [reviewed.scopeId]
      )).rows;
      const queryRows=(await db.query(
        "SELECT scope_id,query_sha256,query_index,with_location,last_reserved_attempt "+
        "FROM clean.gate05_fids_allowed_query_v39 WHERE scope_id=$1",
        [reviewed.scopeId]
      )).rows;
      const receipt=verifyGate05PreparedReadbackV39(
        fixture.authorizationBytes,fixture.independentPins,scopeRows,queryRows
      );
      expect(receipt).toMatchObject({
        status:"EXACT_THREE_PREPARED_ROWS_MATCH_NO_LIVE_AUTH",
        exactRowsSha256:reviewed.exactRowsSha256,
        rowsVerified:3,activeScopesVerified:0,usedApiUnitsVerified:0,
        paidPilotAuthorized:false,providerRequests:0
      });

      // Re-inserting the same signed authorization under a different scope
      // stays illegal due to globally unique AUTH-ID and byte-SHA indexes.
      await db.query("SAVEPOINT replay");
      await expect(db.query(
        "INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,starts_at_utc,expires_at_utc) "+
        "VALUES($1,$2,$3,$4,'WSSS',$5,$6)",
        [randomUUID(),first.params[1],first.params[2],first.params[3],
         first.params[5],first.params[6]]
      )).rejects.toMatchObject({code:"23505"});
      await db.query("ROLLBACK TO SAVEPOINT replay");
    }finally{
      await db.query("ROLLBACK").catch(()=>{});
      // Staged schemas and roles were created inside the same transaction.
      // Nothing, not even the V0068 indexes, may survive test rollback.
      const check=await db.query(
        "SELECT to_regclass('clean.gate05_fids_pilot_scope_v39') AS scope"
      ).catch(()=>null);
      if(check)expect(check.rows[0].scope).toBeNull();
      await db.end().catch(()=>{});
    }
  },40000);
});
