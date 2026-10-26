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
import express from "express";
import {createServer} from "node:http";
import {createGate4PrebindPgStoreV39} from
  "../server/lib/disruption/gate4PrebindPgStore_v39";
import {createGate4OwnedBindingPgStoreV39} from
  "../server/lib/disruption/gate4OwnedBindingPgStore_v39";
import {gate4CheckAdditivePgRoleV39,mountGate4PrebindAdditiveRouteV39} from
  "../server/lib/disruption/gate4PrebindAdditiveRoute_v39";
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
// Provider-shaped notification based on AeroDataBox official OpenAPI v1.15.4.0.
// Synthetic fixture only, no actual flight data or external API calls.
const wire=Buffer.from(JSON.stringify({
 id:"80cc1332-1511-46a5-8ccc-e828c9c04790",
 timestampUtc:"2026-10-24T06:48:00Z",
 deliveryAttempt:{seqNo:0,costCredits:1,
   timestampUtc:"2026-10-24T06:48:00Z"},
 subscription:{id:"earlyId99",isActive:true,
  createdOnUtc:"2026-10-24T06:45:00Z",
  subscriber:{type:"Webhook",id:"disposable-ci"},
  subject:{type:"FlightByAirportIcao",id:"WSSS"}},
 flights:[{number:"SQ001",status:"Expected",
   lastUpdatedUtc:"2026-10-24T06:47:59Z",
   departure:{},arrival:{},codeshareStatus:"Unknown",isCargo:false}]
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
    // Recreate the real V3.9 default grant behavior on the disposable
    // admin account; Gate4 tables must REVOKE its future broad DML.
    await pool.query("CREATE ROLE travnr_v39_runtime NOLOGIN");
    await pool.query(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA clean "+
      "GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES "+
      "TO travnr_v39_runtime"
    );
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
    // Real disposable-PG end-to-end: HTTP application/json -> raw byte
    // body -> quarantine -> independent post-COMMIT SELECT -> HTTP 200.
    // No production DB, provider key, Replit publishing or charged CREATE.
    const app=express();
    const bearer="disposable-ci-secret-"+ "z".repeat(40);
    mountGate4PrebindAdditiveRouteV39(app,scope,bearer,store);
    app.use(express.json()); // must not pre-consume mounted raw route
    const server=createServer(app);
    await new Promise<void>((resolve,reject)=>{
      server.once("error",reject);
      server.listen(0,"127.0.0.1",()=>resolve());
    });
    const bound=server.address();
    if(!bound||typeof bound==="string")throw Error("DISPOSABLE_BIND_UNAVAILABLE");
    try{
      const response=await fetch(
        "http://127.0.0.1:"+bound.port+
        "/api/v1/webhooks/aerodatabox/"+bearer,{
          method:"POST",
          headers:{"content-type":"application/json; charset=utf-8"},
          body:wire,
          signal:AbortSignal.timeout(10000)
        });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        received:true,
        status:"QUARANTINED_DURABLY_PENDING_ID_BINDING",
        attribution:"none",
        paidAuthorization:false
      });
    }finally{
      await new Promise<void>(resolve=>server.close(()=>resolve()));
    }
    const httpOwned=(await pool.query(
      "SELECT original_wire,original_sha256 FROM "+
      "clean.gate4_alert_prebind_original_v39 "+
      "WHERE scope_id=$1::uuid",[scope.scopeId]
    )).rows;
    expect(httpOwned).toHaveLength(1);
    expect(httpOwned[0].original_wire.equals(wire)).toBe(true);
    expect(httpOwned[0].original_sha256).toBe(digest(wire));
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
    // STAGED V0072 is applied to this disposable CI database only.
    const ddlBind=readFileSync(new URL(
      "../migrations/staged/V0072__gate4_owned_binding_v39.sql",
      import.meta.url),"utf8");
    expect(ddlBind).toContain("STAGED");
    await pool.query(ddlBind);
    // Current runtime broad role must receive NONE of the new V0071/V0072
    // table grants, even when its default privileges applied at CREATE.
    const noBroad=(await pool.query(
      "SELECT "+
      "has_table_privilege('travnr_v39_runtime',"+
      "'clean.gate4_alert_prebind_original_v39','SELECT') AS raw_select,"+
      "has_table_privilege('travnr_v39_runtime',"+
      "'clean.gate4_alert_prebind_original_v39','INSERT') AS raw_insert,"+
      "has_table_privilege('travnr_v39_runtime',"+
      "'clean.gate4_alert_owned_binding_v39','SELECT') AS bound_select"
    )).rows[0];
    expect(noBroad).toEqual({
      raw_select:false,raw_insert:false,bound_select:false
    });
    // V0073 is intentionally STAGED: only a synthetic disposable PG
    // already containing the two restricted logins can GRANT permissions.
    await pool.query("CREATE ROLE gate4_receiver_20261022 LOGIN");
    await pool.query("CREATE ROLE gate4_safety_reader_20261022 LOGIN");
    const ddlGrants=readFileSync(new URL(
      "../migrations/staged/V0073__gate4_existing_neon_role_grants_v39.sql",
      import.meta.url),"utf8");
    expect(ddlGrants).toContain("STAGED / NOT AUTO-APPLIED");
    const disposableOnly=ddlGrants.replace(
      "GRANT CONNECT ON DATABASE neondb",
      "GRANT CONNECT ON DATABASE gate4_prebind_ci"
    );
    expect(disposableOnly).not.toBe(ddlGrants);
    await pool.query(disposableOnly);
    const receiver=await pool.connect();
    try{
      await receiver.query("SET ROLE gate4_receiver_20261022");
      await gate4CheckAdditivePgRoleV39(receiver,
        "gate4_receiver_20261022","gate4_prebind_ci");
      // A real restricted role can SELECT its own raw table but cannot
      // query the positive binding table or alter original rows.
      expect((await receiver.query(
        "SELECT count(*)::int AS n FROM "+
        "clean.gate4_alert_prebind_original_v39"
      )).rows[0].n).toBe(2);
      await expect(receiver.query(
        "SELECT count(*) FROM clean.gate4_alert_owned_binding_v39"
      )).rejects.toThrow();
      await expect(receiver.query(
        "UPDATE clean.gate4_alert_prebind_original_v39 "+
        "SET airport_icao='KLAX'"
      )).rejects.toThrow();
    }finally{
      await receiver.query("RESET ROLE").catch(()=>undefined);
      receiver.release();
    }
    // Live 422 regression: preserve authenticated provider-style JSON
    // variant as exact bytes; do not attribute it to a paid provider owner.
    const nullableOriginal=Buffer.from(JSON.stringify({
      subscription:{id:"originalVariant999",
        subject:{type:"FlightByAirportIcao",id:null}},
      flights:[{number:"CI100",status:"Expected"}]
    }));
    expect(await quarantineGate4PrebindOriginalV39(
      scope,nullableOriginal,store)).toMatchObject({
      httpStatus:200,responseAcknowledged:true,
      attributedToOwnedSubscription:false,sourceOwnerConfirmed:false,
      paidAuthorization:false,
      reason:"OFFICIAL_OPTIONAL_SUBJECT_ID_ABSENT"
    });
    const missingId=Buffer.from(JSON.stringify({
      subscription:{subject:{type:"FlightByAirportIcao",id:"WSSS"}},
      flights:[]
    }));
    expect(await quarantineGate4PrebindOriginalV39(
      scope,missingId,store)).toMatchObject({
      httpStatus:200,attributedToOwnedSubscription:false,
      reason:"UNTRUSTED_SUBSCRIPTION_ID_INVALID"
    });
    const captured=(await pool.query(
      "SELECT original_wire,original_sha256,claimed_provider_subscription_id "+
      "FROM clean.gate4_alert_prebind_original_v39 "+
      "WHERE scope_id=$1::uuid AND original_sha256 IN ($2,$3)",
      [scope.scopeId,digest(nullableOriginal),digest(missingId)]
    )).rows;
    expect(captured).toHaveLength(2);
    expect(captured.every(x=>Buffer.isBuffer(x.original_wire)&&
      digest(x.original_wire)===x.original_sha256)).toBe(true);
    const bySha=new Map(captured.map(x=>[x.original_sha256,x]));
    expect(bySha.get(digest(nullableOriginal))?.original_wire
      .equals(nullableOriginal)).toBe(true);
    expect(bySha.get(digest(missingId))?.claimed_provider_subscription_id)
      .toBe("UNVERIFIED");
    console.log("GATE4_PG16_AUTH_RAW_FIRST_VARIANT_PERSISTED");
    const safety=await pool.connect();
    try{
      await safety.query("SET ROLE gate4_safety_reader_20261022");
      const p=(await safety.query(
        "SELECT has_table_privilege(current_user,"+
        "'clean.gate4_alert_owned_binding_v39','SELECT') AS can_read,"+
        "has_table_privilege(current_user,"+
        "'clean.gate4_alert_owned_binding_v39','INSERT') AS can_write"
      )).rows[0];
      expect(p).toEqual({can_read:true,can_write:false});
    }finally{
      await safety.query("RESET ROLE").catch(()=>undefined);
      safety.release();
    }
    // The adapter MUST work through a truly separate least-privilege
    // connection: INSERT+SELECT only, NOT the fixture DB owner.
    await pool.query(
      "CREATE ROLE gate4_writer_ci LOGIN NOINHERIT "+
      "NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS "+
      "PASSWORD 'disposable_writer_only'"
    );
    await pool.query("GRANT CONNECT ON DATABASE gate4_prebind_ci TO gate4_writer_ci");
    await pool.query("GRANT USAGE ON SCHEMA clean TO gate4_writer_ci");
    await pool.query("GRANT SELECT,INSERT ON TABLE "+
      "clean.gate4_alert_owned_binding_v39 TO gate4_writer_ci");
    // Mirror the scope-limited production RLS design (disposable PG only).
    // Owner bypasses RLS; writer and safety reader do not.
    await pool.query(
      "ALTER TABLE clean.gate4_alert_owned_binding_v39 ENABLE ROW LEVEL SECURITY"
    );
    await pool.query(
      "CREATE POLICY gate4_test_safety_select ON "+
      "clean.gate4_alert_owned_binding_v39 FOR SELECT TO "+
      "gate4_safety_reader_20261022 USING (true)"
    );
    const allowed="scope_id='"+scope.scopeId+"'::uuid"+
      " AND authorization_sha256='"+scope.authorizationSha256+"'"+
      " AND source_commit='"+scope.sourceCommit+"'"+
      " AND airport_icao='"+scope.airportIcao+"'";
    await pool.query(
      "CREATE POLICY gate4_test_writer_select ON "+
      "clean.gate4_alert_owned_binding_v39 FOR SELECT TO "+
      "gate4_writer_ci USING ("+allowed+")"
    );
    await pool.query(
      "CREATE POLICY gate4_test_writer_insert ON "+
      "clean.gate4_alert_owned_binding_v39 FOR INSERT TO "+
      "gate4_writer_ci WITH CHECK ("+allowed+")"
    );
    expect((await pool.query(
      "SELECT relrowsecurity AS enabled FROM pg_class "+
      "WHERE oid='clean.gate4_alert_owned_binding_v39'::regclass"
    )).rows[0].enabled).toBe(true);
    const writerUrl=localUrl.replace(
      "gate4_fixture:only_for_ci",
      "gate4_writer_ci:disposable_writer_only");
    expect(writerUrl).not.toBe(localUrl);
    const writerPool=new pg.Pool({
      connectionString:writerUrl,max:3,connectionTimeoutMillis:5000
    });
    try {
      const priv=(await writerPool.query(
        "SELECT current_user AS actor,"+
        "has_table_privilege(current_user,"+
        "'clean.gate4_alert_owned_binding_v39','SELECT') AS can_read,"+
        "has_table_privilege(current_user,"+
        "'clean.gate4_alert_owned_binding_v39','INSERT') AS can_insert,"+
        "has_table_privilege(current_user,"+
        "'clean.gate4_alert_owned_binding_v39','UPDATE') AS can_update,"+
        "has_table_privilege(current_user,"+
        "'clean.gate4_alert_owned_binding_v39','DELETE') AS can_delete,"+
        "has_table_privilege(current_user,"+
        "'clean.gate4_alert_prebind_original_v39','SELECT') AS raw_read"
      )).rows[0];
      expect(priv).toEqual({
        actor:"gate4_writer_ci",can_read:true,can_insert:true,
        can_update:false,can_delete:false,raw_read:false
      });
      const bindStore=createGate4OwnedBindingPgStoreV39(writerPool);
    const binding={
      ...scope,subscriptionId:"exactOwned99",
      reviewedCreateReceiptSha256:"c".repeat(64),
      signedStopTicketSha256:"d".repeat(64)
    };
    // Adapter intentionally needs airportIcao/sourceCommit/authorizationSha256,
    // and rejects any attempt to rewrite this trial to another provider ID.
    expect(await bindStore.bindOnce(binding)).toMatchObject({
      committed:true,exactFieldsVerified:true
    });
    expect(await bindStore.readBack(binding)).toMatchObject({
      committed:true,exactFieldsVerified:true
    });
    expect(await bindStore.bindOnce(binding)).toMatchObject({
      committed:true,exactFieldsVerified:true
    });
    const foreign={...binding,subscriptionId:"foreignID"};
    await expect(bindStore.bindOnce(foreign)).rejects.toThrow(
      "GATE4_BIND_COMMIT_UNCERTAIN_HOLD"
    );
    expect(await bindStore.readBack(foreign)).toMatchObject({
      committed:false,exactFieldsVerified:false
    });
    const foreignAuth={...binding,authorizationSha256:"e".repeat(64)};
    expect((await bindStore.readBack(foreignAuth)).committed).toBe(false);
    const duplicateIdOtherScope={
      ...binding,scopeId:"22222222-3333-4444-5555-666666666666"
    };
    await expect(bindStore.bindOnce(duplicateIdOtherScope)).rejects.toThrow(
      "GATE4_BIND_COMMIT_UNCERTAIN_HOLD"
    );
    expect((await pool.query(
      "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39"
    )).rows[0].n).toBe(1);
      // A SECOND scoped writer must coexist with the historical positive
      // record and old per-role policies. Nothing is deleted or rebound.
      const nextScope={
        scopeId:"66666666-7777-4888-9999-aaaaaaaaaaaa",
        authorizationSha256:"f".repeat(64),
        sourceCommit:"e".repeat(40),
        airportIcao:"WSSS"
      };
      const nextRole="gate4_writer_ci_next";
      await pool.query("CREATE ROLE "+nextRole+
        " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
        "NOREPLICATION NOBYPASSRLS PASSWORD 'disposable_next_only'");
      await pool.query("GRANT CONNECT ON DATABASE gate4_prebind_ci TO "+nextRole);
      await pool.query("GRANT USAGE ON SCHEMA clean TO "+nextRole);
      await pool.query("GRANT SELECT,INSERT ON TABLE "+
        "clean.gate4_alert_owned_binding_v39 TO "+nextRole);
      const nextPredicate="scope_id='"+nextScope.scopeId+"'::uuid"+
        " AND authorization_sha256='"+nextScope.authorizationSha256+"'"+
        " AND source_commit='"+nextScope.sourceCommit+"'"+
        " AND airport_icao='"+nextScope.airportIcao+"'";
      await pool.query("CREATE POLICY gate4_test_next_writer_select ON "+
        "clean.gate4_alert_owned_binding_v39 FOR SELECT TO "+nextRole+
        " USING ("+nextPredicate+")");
      await pool.query("CREATE POLICY gate4_test_next_writer_insert ON "+
        "clean.gate4_alert_owned_binding_v39 FOR INSERT TO "+nextRole+
        " WITH CHECK ("+nextPredicate+")");
      const nextWriterUrl=localUrl.replace("gate4_fixture:only_for_ci",
        "gate4_writer_ci_next:disposable_next_only");
      const nextPool=new pg.Pool({
        connectionString:nextWriterUrl,max:2,connectionTimeoutMillis:5000
      });
      try{
        const nextStore=createGate4OwnedBindingPgStoreV39(nextPool);
        const nextBinding={
          ...nextScope,subscriptionId:"nextOwned77",
          reviewedCreateReceiptSha256:"1".repeat(64),
          signedStopTicketSha256:"2".repeat(64)
        };
        // Before the new INSERT the next writer must not read the old owner.
        expect((await nextPool.query(
          "SELECT count(*)::int AS n FROM "+
          "clean.gate4_alert_owned_binding_v39"
        )).rows[0].n).toBe(0);
        expect(await nextStore.bindOnce(nextBinding)).toMatchObject({
          committed:true,exactFieldsVerified:true
        });
        expect((await pool.query(
          "SELECT count(*)::int AS n FROM "+
          "clean.gate4_alert_owned_binding_v39"
        )).rows[0].n).toBe(2);
        expect((await nextPool.query(
          "SELECT count(*)::int AS n FROM "+
          "clean.gate4_alert_owned_binding_v39"
        )).rows[0].n).toBe(1);
        // Old 20261023 writer still sees only its old UUID; no cross-read.
        expect((await writerPool.query(
          "SELECT count(*)::int AS n FROM "+
          "clean.gate4_alert_owned_binding_v39"
        )).rows[0].n).toBe(1);
        // A second writer cannot forge a second provider ID for the first
        // owner UUID, even while a permissive safety SELECT policy exists.
        await expect(nextStore.bindOnce({
          ...nextBinding,scopeId:scope.scopeId
        })).rejects.toThrow("GATE4_BIND_COMMIT_UNCERTAIN_HOLD");
        const oldBinding={
          ...scope,subscriptionId:"exactOwned99",
          reviewedCreateReceiptSha256:"c".repeat(64),
          signedStopTicketSha256:"d".repeat(64)
        };
        expect((await bindStore.readBack(oldBinding)).committed).toBe(true);
        expect((await pool.query(
          "SELECT count(*)::int AS n FROM "+
          "clean.gate4_alert_prebind_original_v39"
        )).rows[0].n).toBe(4); // two canonical + two raw-first quarantine variants
        // The separately authorized safety reader must see BOTH exact
        // bindings so it can independently stop the new owned ID.
        const scopedSafety=await pool.connect();
        try{
          await scopedSafety.query("SET ROLE gate4_safety_reader_20261022");
          expect((await scopedSafety.query(
            "SELECT count(*)::int AS n FROM "+
            "clean.gate4_alert_owned_binding_v39"
          )).rows[0].n).toBe(2);
          await expect(scopedSafety.query(
            "INSERT INTO clean.gate4_alert_owned_binding_v39 "+
            "(scope_id) VALUES ($1::uuid)",[nextScope.scopeId]
          )).rejects.toThrow();
        }finally{
          await scopedSafety.query("RESET ROLE").catch(()=>undefined);
          scopedSafety.release();
        }
      }finally{
        await nextPool.end();
      }
      console.log("GATE4_SECOND_SCOPE_PG16_RLS_COEXISTENCE_PASS");
      console.log("GATE4_PREVIOUS_POSITIVE_BINDING_UNCHANGED_PASS");
      console.log("GATE4_SAFETY_READER_BOTH_SCOPES_SELECT_ONLY_PASS");
      const watch=await pool.connect();
      try{
        await watch.query("SET ROLE gate4_safety_reader_20261022");
        const n=(await watch.query(
          "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39"
        )).rows[0].n;
        expect(n).toBe(2);
      }finally{
        await watch.query("RESET ROLE").catch(()=>undefined);
        watch.release();
      }
      console.log("GATE4_DISPOSABLE_PG_EXACT_SCOPE_RLS_WRITER_PASS");
      console.log("GATE4_DISPOSABLE_PG_INSERT_SELECT_ONLY_WRITER_PASS");
    }finally{
      await writerPool.end();
    }
    console.log("GATE4_DISPOSABLE_PG_RESTRICTED_ROLES_AND_DEFAULT_GRANTS_PASS");
    console.log("GATE4_DISPOSABLE_PG_OWNER_BIND_WRITE_ONCE_PASS");
    console.log("GATE4_DISPOSABLE_PG_ORIGINAL_AND_READBACK_PASS");
    console.log("PROVIDER_CALLS=0");
  }finally{await pool.end();}
 },30000);
});
