/**
 * Second ordinary Alert receiver scoping, disposable GitHub Actions PG16 only.
 * Different database but same cluster-global roles as prior existing fixture.
 * No production URL, hosted callback, provider credentials, or paid activity.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
import {reviewGate4SecondReceiverRlsV39} from
 "../server/lib/disruption/gate4SecondReceiverRlsPlan_v39";
import {createGate4PrebindPgStoreV39} from
 "../server/lib/disruption/gate4PrebindPgStore_v39";
const adminUrl="postgresql://gate4_fixture:only_for_ci@127.0.0.1:5432/gate4_prebind_ci";
const safe=process.env.GITHUB_ACTIONS==="true"&&
 process.env.NODE_ENV==="test"&&
 process.env.GATE4_PREBIND_PG_TEST_URL===adminUrl&&
 !process.env.AERODATABOX_API_KEY&&
 !process.env.RAPIDAPI_KEY&&
 !process.env.DATABASE_URL&&
 !process.env.V39_DATABASE_RUNTIME_URL&&
 !process.env.V39_PRODUCTION_DATABASE_OWNER_URL;
const suite=safe?describe:describe.skip;
const OLD="498dccd7-5da3-4687-a6ea-e0dc03b54398";
const NEXT="11111111-2222-4333-8444-555555555555";
const AUTH="b".repeat(64),NEXT_AUTH="c".repeat(64);
const SOURCE="a".repeat(40),NEXT_SOURCE="d".repeat(40);
const RROLE="gate4_receiver_2026_next1";
const digest=(buf:Buffer)=>createHash("sha256").update(buf).digest("hex");
suite("Gate4 receiver additive two-scope RLS — disposable PG16",()=>{
 it("keeps legacy original visible to old login, isolates new writer and preserves both",async()=>{
  const root=new pg.Pool({connectionString:adminUrl});
  const nextUrl=adminUrl.replace("/gate4_prebind_ci","/gate4_receiver_ci");
  const owner=new pg.Pool({connectionString:nextUrl,max:3});
  let oldUser:pg.PoolClient|undefined,newUser:pg.PoolClient|undefined;
  let scopedPool:pg.Pool|undefined;
  try{
   expect((await root.query(
    "SELECT current_database() AS db,current_user AS actor"
   )).rows[0]).toEqual({db:"gate4_prebind_ci",actor:"gate4_fixture"});
   await root.query("CREATE DATABASE gate4_receiver_ci");
   await owner.query("CREATE SCHEMA clean");
   const migration=readFileSync(new URL(
    "../migrations/staged/V0071__gate4_alert_prebind_quarantine_v39.sql",
    import.meta.url),"utf8");
   await owner.query(migration);
   const roles=(await owner.query(
    "SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname=$1",
    ["gate4_receiver_20261022"]
   )).rows;
   // Earlier exact owned-handoff CI test already commissioned old fixture.
   expect(roles).toEqual([{rolname:"gate4_receiver_20261022",rolcanlogin:true}]);
   await owner.query("GRANT CONNECT ON DATABASE gate4_receiver_ci "+
    "TO gate4_receiver_20261022");
   await owner.query("GRANT USAGE ON SCHEMA clean TO gate4_receiver_20261022");
   await owner.query("GRANT SELECT,INSERT ON TABLE "+
    "clean.gate4_alert_prebind_original_v39 TO gate4_receiver_20261022");
   const oldWire=Buffer.from('{"kind":"old-synthetic-only"}');
   const nextWire=Buffer.from('{"kind":"new-test-only"}');
   const insert="INSERT INTO clean.gate4_alert_prebind_original_v39 "+
    "(scope_id,original_sha256,source_commit,authorization_sha256,"+
    "airport_icao,claimed_provider_subscription_id,original_wire) "+
    "VALUES ($1::uuid,$2,$3,$4,'WSSS',$5,$6)";
   await owner.query(insert,[OLD,digest(oldWire),SOURCE,AUTH,
    "oldSynthetic99",oldWire]);
   const review=reviewGate4SecondReceiverRlsV39({
    oldScopeId:OLD,nextScopeId:NEXT,
    nextAuthSha256:NEXT_AUTH,nextPublishedSourceSha:NEXT_SOURCE,
    nextReceiverRole:RROLE,oldOriginalCount:1,otherOriginalCount:0,
    oldReceiverExists:true,oldReceiverLoginEnabled:true,
    newReceiverAlreadyExists:false,rlsCurrentlyEnabled:false,
    existingPolicies:[]
   });
   expect(review.status).toBe("REVIEW_ONLY_READY");
   await owner.query("CREATE ROLE "+RROLE+
    " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
    "NOREPLICATION NOBYPASSRLS PASSWORD 'ci_fixture_only'");
   for(const sql of review.statements){
    await owner.query(sql);
   }
   const count="SELECT count(*)::int AS n "+
    "FROM clean.gate4_alert_prebind_original_v39";
   oldUser=await owner.connect();
   await oldUser.query("SET ROLE gate4_receiver_20261022");
   expect((await oldUser.query(count)).rows[0].n).toBe(1);
   await expect(oldUser.query(insert,[
    NEXT,digest(nextWire),NEXT_SOURCE,NEXT_AUTH,"badLegacy99",nextWire
   ])).rejects.toThrow();
   newUser=await owner.connect();
   await newUser.query("SET ROLE "+RROLE);
   expect((await newUser.query(count)).rows[0].n).toBe(0);
   await expect(newUser.query(insert,[
    OLD,digest(nextWire),NEXT_SOURCE,NEXT_AUTH,"badOld99",nextWire
   ])).rejects.toThrow();
   await expect(newUser.query(insert,[
    NEXT,digest(nextWire),NEXT_SOURCE,AUTH,"badAuth99",nextWire
   ])).rejects.toThrow();
   await expect(newUser.query(insert,[
    NEXT,digest(nextWire),SOURCE,NEXT_AUTH,"badSource99",nextWire
   ])).rejects.toThrow();
   await newUser.query(insert,[NEXT,digest(nextWire),
    NEXT_SOURCE,NEXT_AUTH,"newOwnedClaim99",nextWire]);
   expect((await newUser.query(count)).rows[0].n).toBe(1);
   expect((await oldUser.query(count)).rows[0].n).toBe(1);
   expect((await owner.query(count)).rows[0].n).toBe(2);
   // The real production V0071 adapter must work under RLS too:
   // duplicate original is idempotent, byte-identical readback succeeds
   // using the NEW least-privileged receiver, not the fixture DB owner.
   const connection=new URL(nextUrl);
   connection.username=RROLE;
   connection.password="ci_fixture_only";
   scopedPool=new pg.Pool({
    connectionString:connection.toString(),max:2,
    connectionTimeoutMillis:5000
   });
   const store=createGate4PrebindPgStoreV39(scopedPool);
   const raw={
    scopeId:NEXT,authorizationSha256:NEXT_AUTH,
    sourceCommit:NEXT_SOURCE,airportIcao:"WSSS",
    claimedSubscriptionId:"newOwnedClaim99",
    originalSha256:digest(nextWire),originalBytes:nextWire
   };
   expect(await store.readBackOriginal(raw)).toMatchObject({
    committed:true,originalBytesVerified:true
   });
   expect(await store.writeOriginal(raw)).toMatchObject({
    committed:true,originalBytesVerified:true
   });
   expect((await owner.query(count)).rows[0].n).toBe(2);
   const values=(await owner.query(
    "SELECT scope_id::text, original_sha256,original_wire "+
    "FROM clean.gate4_alert_prebind_original_v39 ORDER BY scope_id"
   )).rows;
   expect(values.find(x=>x.scope_id===OLD)?.original_wire.equals(oldWire)).toBe(true);
   expect(values.find(x=>x.scope_id===NEXT)?.original_wire.equals(nextWire)).toBe(true);
   await expect(newUser.query(
    "DELETE FROM clean.gate4_alert_prebind_original_v39"
   )).rejects.toThrow();
   await expect(newUser.query(
    "UPDATE clean.gate4_alert_prebind_original_v39 "+
    "SET airport_icao='KLAX'"
   )).rejects.toThrow();
   // This isolated database has no V0072 owner table at all; the
   // pure plan must not create or GRANT owner-binding access.
   expect((await owner.query(
    "SELECT to_regclass('clean.gate4_alert_owned_binding_v39') IS NULL AS absent"
   )).rows[0].absent).toBe(true);
   expect(review.statements.join("\n")).not.toContain(
    "gate4_alert_owned_binding_v39");
   const policyNames=(await owner.query(
    "SELECT policyname FROM pg_policies WHERE schemaname='clean' "+
    "AND tablename='gate4_alert_prebind_original_v39' ORDER BY policyname"
   )).rows.map(x=>x.policyname);
   expect(policyNames).toHaveLength(4);
   console.log("GATE4_SECOND_RECEIVER_SCOPE_RLS_PG16_PASS_NO_PROVIDER");
  }finally{
   await newUser?.query("RESET ROLE").catch(()=>undefined);
   newUser?.release();
   await oldUser?.query("RESET ROLE").catch(()=>undefined);
   oldUser?.release();
   await scopedPool?.end().catch(()=>undefined);
   await owner.end().catch(()=>undefined);
   await root.end().catch(()=>undefined);
  }
 });
});
