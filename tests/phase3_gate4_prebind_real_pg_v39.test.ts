/**
 * REAL DISPOSABLE PG16 ONLY. No provider key, no production DB, no release.
 * Verifies staged V0071 original-wire table, immutable-byte insertion and
 * same/different-client post-COMMIT readback. Cannot certify hosted durability,
 * external STOP, provider authentication or the eventual ID-binding CAS.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
import {createGate4PrebindPgStoreV39} from
  "../server/lib/disruption/gate4PrebindPgStore_v39";
import {quarantineGate4PrebindOriginalV39} from
  "../server/lib/disruption/gate4PrebindIngress_v39";

const localUrl="postgresql://gate4_fixture:only_for_ci@127.0.0.1:5432/gate4_prebind_ci";
const safe=process.env.GITHUB_ACTIONS==="true"&&
  process.env.NODE_ENV==="test"&&
  process.env.GATE4_PREBIND_PG_TEST_URL===localUrl&&
  !process.env.AERODATABOX_API_KEY&&
  !process.env.RAPIDAPI_KEY&&
  !process.env.DATABASE_URL&&
  !process.env.V39_DATABASE_RUNTIME_URL;
const suite=safe?describe:describe.skip;
const scope={
 scopeId:"11111111-2222-3333-4444-555555555555",
 authorizationSha256:"b".repeat(64),
 sourceCommit:"a".repeat(40),
 airportIcao:"WSSS"
};
const wire=Buffer.from(JSON.stringify({
 subscription:{id:"earlyId99",
  subject:{type:"FlightByAirportIcao",id:"WSSS"}},
 flights:[{number:"SQ001"}]
}));
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");

suite("Gate4 staged prebind V0071 real disposable PG16 only",()=>{
 it("commits original bytes exactly once, ACKs after independent readback",async()=>{
  const pool=new pg.Pool({
    connectionString:localUrl,
    max:3,connectionTimeoutMillis:5000
  });
  try{
    const identity=(await pool.query(
      "SELECT current_database() AS db,current_user AS actor"
    )).rows[0];
    expect(identity).toMatchObject({
      db:"gate4_prebind_ci",actor:"gate4_fixture"
    });
    await pool.query("CREATE SCHEMA clean");
    const ddl=readFileSync(new URL(
      "../migrations/staged/V0071__gate4_alert_prebind_quarantine_v39.sql",
      import.meta.url),"utf8");
    expect(ddl).toContain("STAGED / NOT AUTO-APPLIED");
    await pool.query(ddl);
    const persist=(await pool.query(
      "SELECT c.relpersistence AS mode FROM pg_class c "+
      "JOIN pg_namespace n ON n.oid=c.relnamespace "+
      "WHERE n.nspname='clean' AND "+
      "c.relname='gate4_alert_prebind_original_v39'"
    )).rows;
    expect(persist).toEqual([{mode:"p"}]); // LOGGED, survives clean restart
    const store=createGate4PrebindPgStoreV39(pool);
    const first=await quarantineGate4PrebindOriginalV39(scope,wire,store);
    expect(first).toMatchObject({
      httpStatus:200,status:"QUARANTINED_DURABLY_PENDING_ID_BINDING",
      attributedToOwnedSubscription:false,sourceOwnerConfirmed:false
    });
    // Provider retry for byte-identical input is exactly-one durable original.
    const second=await quarantineGate4PrebindOriginalV39(scope,wire,store);
    expect(second.httpStatus).toBe(200);
    const rows=(await pool.query(
      "SELECT scope_id::text,original_sha256,original_wire,"+
      "claimed_provider_subscription_id "+
      "FROM clean.gate4_alert_prebind_original_v39"
    )).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].scope_id).toBe(scope.scopeId);
    expect(rows[0].original_sha256).toBe(digest(wire));
    expect(rows[0].original_wire.equals(wire)).toBe(true);
    expect(rows[0].claimed_provider_subscription_id).toBe("earlyId99");
    // Different original bytes MUST NOT silently overwrite the first row.
    const changed=Buffer.from(JSON.stringify({
      subscription:{id:"newId99",subject:{
       type:"FlightByAirportIcao",id:"WSSS"
      }},flights:[]
    }));
    expect((await quarantineGate4PrebindOriginalV39(
      scope,changed,store)).httpStatus).toBe(200);
    expect((await pool.query(
      "SELECT count(*)::int AS n FROM "+
      "clean.gate4_alert_prebind_original_v39"
    )).rows[0].n).toBe(2);
    const last=await store.readBackOriginal({
      ...scope,claimedSubscriptionId:"earlyId99",
      originalSha256:digest(wire),originalBytes:wire
    });
    expect(last).toMatchObject({
      committed:true,originalBytesVerified:true
    });
    // The exact persisted SHA must not be accepted with substituted
    // authorization or the wrong claimed provider identity.
    const wrongMeta=await store.readBackOriginal({
      ...scope,claimedSubscriptionId:"foreignID",
      originalSha256:digest(wire),originalBytes:wire
    });
    expect(wrongMeta).toMatchObject({committed:false,originalBytesVerified:false});
    const wrongAuth=await store.readBackOriginal({
      ...scope,authorizationSha256:"e".repeat(64),
      claimedSubscriptionId:"earlyId99",
      originalSha256:digest(wire),originalBytes:wire
    });
    expect(wrongAuth.committed).toBe(false);
    console.log("GATE4_DISPOSABLE_PG_ORIGINAL_AND_READBACK_PASS");
    console.log("PROVIDER_CALLS=0");
  }finally{await pool.end();}
 },30000);
});
