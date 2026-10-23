/**
 * Disposable PG16 only. Rehearses staged production V0071/72/73 and the
 * disabled-by-default additive receiver's ACTUAL narrow DB access.
 * Never use against production. No provider key, API calls or Phase6.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
import {
  createGate4PrebindPgStoreV39
} from "../server/lib/disruption/gate4PrebindPgStore_v39";
import {
  gate4CheckAdditivePgRoleV39
} from "../server/lib/disruption/gate4PrebindAdditiveRoute_v39";

// The full offline suite runs without a database service. Skip there; the
// dedicated disposable-PG16 job must set BOTH exact test-only sentinels.
const DISPOSABLE_ONLY=process.env.CI==="true"&&
  process.env.GATE4_DISPOSABLE_DB_ACK==="GATE4_PG16_ONLY";
describe.skipIf(!DISPOSABLE_ONLY)(
  "Gate4 limited release: actual restricted PG16 quarantine",()=>{

 it("prepaid runtime no grants; exact dedicated receiver bytes+readback and no V0072",async()=>{
  if(process.env.CI!=="true"||
    process.env.GATE4_DISPOSABLE_DB_ACK!=="GATE4_PG16_ONLY")
    throw Error("GATE4_REAL_PG_TEST_NOT_DISPOSABLE_CI");
  const uri=process.env.GATE4_TEST_PG_URL;
  if(!uri||!uri.includes("127.0.0.1")||!uri.includes("/neondb"))
    throw Error("GATE4_TEST_MUST_TARGET_LOCAL_DISPOSABLE_NEONDB");
  const admin=new pg.Pool({connectionString:uri,max:2});
  try{
   await admin.query("CREATE SCHEMA clean");
   await admin.query("CREATE ROLE travnr_v39_runtime NOLOGIN");
   await admin.query(
     "ALTER DEFAULT PRIVILEGES IN SCHEMA clean "+
     "GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO travnr_v39_runtime"
   );
   const old=[
     "V0071__gate4_alert_prebind_quarantine_v39.sql",
     "V0072__gate4_owned_binding_v39.sql"
   ];
   for(const fname of old){
     const text=readFileSync(new URL("../migrations/staged/"+fname,
       import.meta.url),"utf8");
     await admin.query(text);
   }
   // In production only a confirmed owner connection may create these.
   await admin.query("CREATE ROLE gate4_receiver_20261022 LOGIN PASSWORD 'fixtureonly'");
   await admin.query("CREATE ROLE gate4_safety_reader_20261022 LOGIN PASSWORD 'fixtureonly'");
   const grants=readFileSync(new URL(
    "../migrations/staged/V0073__gate4_existing_neon_role_grants_v39.sql",
    import.meta.url),"utf8");
   await admin.query(grants);
   const broad=(await admin.query(
     "SELECT has_table_privilege('travnr_v39_runtime',"+
     "'clean.gate4_alert_prebind_original_v39','SELECT') AS raw,"+
     "has_table_privilege('travnr_v39_runtime',"+
     "'clean.gate4_alert_owned_binding_v39','SELECT') AS owned"
   )).rows[0];
   expect(broad).toEqual({raw:false,owned:false});
   const restrictedUrl=new URL(uri);
   restrictedUrl.username="gate4_receiver_20261022";
   restrictedUrl.password="fixtureonly";
   const receiver=new pg.Pool({connectionString:restrictedUrl.toString()});
   try{
    await gate4CheckAdditivePgRoleV39(
      receiver,"gate4_receiver_20261022","neondb"
    );
    const wire=Buffer.from(JSON.stringify({
      subscription:{id:"testSubscription99",
      subject:{type:"FlightByAirportIcao",id:"WSSS"}},flights:[]
    }));
    const original={
      scopeId:"11111111-2222-3333-4444-555555555555",
      authorizationSha256:"b".repeat(64),
      sourceCommit:"a".repeat(40),airportIcao:"WSSS",
      claimedSubscriptionId:"testSubscription99",
      originalSha256:createHash("sha256").update(wire).digest("hex"),
      originalBytes:wire
    };
    const store=createGate4PrebindPgStoreV39(receiver);
    expect(await store.writeOriginal(original)).toMatchObject({
      committed:true,originalBytesVerified:true
    });
    expect(await store.readBackOriginal(original)).toMatchObject({
      committed:true,originalBytesVerified:true
    });
    expect(await store.writeOriginal(original)).toMatchObject({
      committed:true,originalBytesVerified:true
    });
    await expect(receiver.query(
      "SELECT * FROM clean.gate4_alert_owned_binding_v39"
    )).rejects.toThrow();
    await expect(receiver.query(
      "DELETE FROM clean.gate4_alert_prebind_original_v39"
    )).rejects.toThrow();
    const rows=(await admin.query(
      "SELECT count(*)::int AS total FROM "+
      "clean.gate4_alert_prebind_original_v39"
    )).rows[0].total;
    expect(rows).toBe(1);
   }finally{await receiver.end();}
   const safetyUrl=new URL(uri);
   safetyUrl.username="gate4_safety_reader_20261022";
   safetyUrl.password="fixtureonly";
   const safety=new pg.Pool({connectionString:safetyUrl.toString()});
   try{
    expect((await safety.query(
      "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39"
    )).rows[0].n).toBe(0);
    await expect(safety.query(
      "INSERT INTO clean.gate4_alert_owned_binding_v39 "+
      "(scope_id) VALUES ('11111111-2222-3333-4444-555555555555')"
    )).rejects.toThrow();
   }finally{await safety.end();}
   console.log("GATE4_MINIMAL_RELEASE_REAL_PG16_PASS_NO_PROVIDER");
  }finally{await admin.end();}
 });
});
