/**
 * Exact post-retirement V0072 RLS test on a disposable GitHub Actions PG16.
 * Refuses nonlocal URLs, missing CI sentinels, or any provider credential.
 * This tests the proposed policies, NOT the sealed production --apply path.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
import {reviewGate4SecondScopeRlsV39} from
 "../server/lib/disruption/gate4SecondScopeRlsPlan_v39";

const fixture="postgresql://gate4_fixture:only_for_ci@127.0.0.1:5432/gate4_prebind_ci";
const allow=process.env.GITHUB_ACTIONS==="true" &&
 process.env.NODE_ENV==="test" &&
 process.env.GATE4_PREBIND_PG_TEST_URL===fixture &&
 !process.env.AERODATABOX_API_KEY &&
 !process.env.RAPIDAPI_KEY &&
 !process.env.DATABASE_URL &&
 !process.env.V39_DATABASE_RUNTIME_URL &&
 !process.env.V39_PRODUCTION_DATABASE_OWNER_URL;
const suite=allow?describe:describe.skip;
const OLD="498dccd7-5da3-4687-a6ea-e0dc03b54398";
const NEW="66334455-7777-4888-9111-123456789abc";
const SHA="a".repeat(40),NEXT_SHA="b".repeat(40);
const AUTH="c".repeat(64),NEXT_AUTH="d".repeat(64);
const nextRole="gate4_owner_writer_2026_next1";

suite("Gate4 second writer strict post-retirement real PG16",()=>{
 it("preserves old receipt; new role confined to fresh scope and safety reader sees both",async()=>{
  const adminRoot=new pg.Pool({connectionString:fixture,max:1});
  const target=fixture.replace("/gate4_prebind_ci","/neondb");
  const db=new pg.Pool({connectionString:target,max:2});
  let writer:pg.Pool|undefined;
  try{
   const identity=(await adminRoot.query(
    "SELECT current_database() AS db,current_user AS actor"
   )).rows[0];
   expect(identity).toEqual({db:"gate4_prebind_ci",actor:"gate4_fixture"});
   await adminRoot.query("CREATE DATABASE neondb");
   await db.query("CREATE SCHEMA clean");
   const migration=(name:string)=>readFileSync(new URL(
    "../migrations/staged/"+name,import.meta.url),"utf8");
   await db.query(migration("V0071__gate4_alert_prebind_quarantine_v39.sql"));
   await db.query(migration("V0072__gate4_owned_binding_v39.sql"));
   // PostgreSQL roles are cluster-wide. The preceding established
   // disposable-PG test already provisions these two fixed legacy roles.
   // Reuse and verify them; do not CREATE duplicate global role names.
   const inheritedRoles=(await db.query(
    "SELECT rolname,rolcanlogin FROM pg_roles WHERE rolname=ANY($1::text[])",
    [["gate4_receiver_20261022","gate4_safety_reader_20261022"]]
   )).rows;
   expect(inheritedRoles).toHaveLength(2);
   expect(inheritedRoles.every(r=>r.rolcanlogin===true)).toBe(true);
   await db.query(migration("V0073__gate4_existing_neon_role_grants_v39.sql"));
   await db.query(
    "CREATE ROLE gate4_owner_writer_20261023 NOLOGIN NOINHERIT "+
    "NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
   await db.query(
    "ALTER TABLE clean.gate4_alert_owned_binding_v39 "+
    "ENABLE ROW LEVEL SECURITY");
   await db.query(
    "CREATE POLICY gate4_safety_select_v39 ON "+
    "clean.gate4_alert_owned_binding_v39 FOR SELECT "+
    "TO gate4_safety_reader_20261022 USING (true)");
   const original=Buffer.from('{"kind":"test-synthetic-only"}');
   const rawSHA=createHash("sha256").update(original).digest("hex");
   await db.query(
    "INSERT INTO clean.gate4_alert_prebind_original_v39 "+
    "(scope_id,original_sha256,source_commit,authorization_sha256,"+
    "airport_icao,claimed_provider_subscription_id,original_wire) "+
    "VALUES($1::uuid,$2,$3,$4,'WSSS',$5,$6)",
    [OLD,rawSHA,SHA,AUTH,"syntheticOld99",original]
   );
   await db.query(
    "INSERT INTO clean.gate4_alert_owned_binding_v39 "+
    "(scope_id,authorization_sha256,source_commit,airport_icao,"+
    "subscription_id,reviewed_create_receipt_sha256,"+
    "signed_stop_ticket_sha256) "+
    "VALUES($1::uuid,$2,$3,'WSSS',$4,$5,$6)",
    [OLD,AUTH,SHA,"historicalOwned99","e".repeat(64),"f".repeat(64)]
   );
   const spec={
    previousScopeId:OLD,nextScopeId:NEW,
    nextAuthorizationSha256:NEXT_AUTH,nextReceiverSourceSha:NEXT_SHA,
    airportIcao:"WSSS" as const,nextWriterRole:nextRole,
    legacyOwnedBindings:1,otherOwnedBindings:0,previousOriginalRows:1,
    previousWriterExists:true,previousWriterLoginEnabled:false,
    nextWriterRoleExists:false,rlsEnabled:true,
    existingPolicyNames:["gate4_safety_select_v39"]
   };
   const plan=reviewGate4SecondScopeRlsV39(spec);
   expect(plan.status).toBe("REVIEW_ONLY_READY");
   expect(plan.statements).toHaveLength(5);
   await db.query("CREATE ROLE "+nextRole+
     " LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE "+
     "NOREPLICATION NOBYPASSRLS PASSWORD 'only_disposable_test'");
   for(const sql of plan.statements)await db.query(sql);
   const writerUrl=new URL(target);
   writerUrl.username=nextRole;
   writerUrl.password="only_disposable_test";
   writer=new pg.Pool({connectionString:writerUrl.toString(),max:2});
   const grants=(await writer.query(
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
    "'clean.gate4_alert_prebind_original_v39','SELECT') AS raw"
   )).rows[0];
   expect(grants).toEqual({actor:nextRole,can_read:true,
    can_insert:true,can_update:false,can_delete:false,raw:false});
   const count=async(pool:pg.Pool)=>(
     await pool.query("SELECT count(*)::int AS n FROM "+
      "clean.gate4_alert_owned_binding_v39")).rows[0].n as number;
   expect(await count(writer)).toBe(0); // old row excluded by RLS
   const insert="INSERT INTO clean.gate4_alert_owned_binding_v39 "+
    "(scope_id,authorization_sha256,source_commit,airport_icao,"+
    "subscription_id,reviewed_create_receipt_sha256,signed_stop_ticket_sha256) "+
    "VALUES($1::uuid,$2,$3,'WSSS',$4,$5,$6)";
   await expect(writer.query(insert,[OLD,NEXT_AUTH,NEXT_SHA,
     "mustRejectOld99","e".repeat(64),"f".repeat(64)])).rejects.toThrow();
   await expect(writer.query(insert,[NEW,AUTH,NEXT_SHA,
     "mustRejectAuth99","e".repeat(64),"f".repeat(64)])).rejects.toThrow();
   await expect(writer.query(insert,[NEW,NEXT_AUTH,SHA,
     "mustRejectSource99","e".repeat(64),"f".repeat(64)])).rejects.toThrow();
   expect(await count(writer)).toBe(0);
   await writer.query(insert,[NEW,NEXT_AUTH,NEXT_SHA,
     "freshOwned99","e".repeat(64),"f".repeat(64)]);
   expect(await count(writer)).toBe(1);
   expect(await count(db)).toBe(2);
   await expect(writer.query(
    "DELETE FROM clean.gate4_alert_owned_binding_v39 "+
    "WHERE scope_id=$1::uuid",[NEW])).rejects.toThrow();
   // Verify SELECT as the actual restricted role via SET ROLE. The fixture
   // already created this cluster-global role without a LOGIN password.
   const safety=await db.connect();
   try{
    await safety.query("SET ROLE gate4_safety_reader_20261022");
    expect((await safety.query(
     "SELECT count(*)::int AS n FROM clean.gate4_alert_owned_binding_v39"
    )).rows[0].n).toBe(2);
    await expect(safety.query(insert,[NEW,NEXT_AUTH,NEXT_SHA,
     "readerWriteDenied99","e".repeat(64),"f".repeat(64)])).rejects.toThrow();
   }finally{
    await safety.query("RESET ROLE").catch(()=>undefined);
    safety.release();
   }
   const historical=(await db.query(
    "SELECT subscription_id,source_commit,authorization_sha256 "+
    "FROM clean.gate4_alert_owned_binding_v39 WHERE scope_id=$1::uuid",
    [OLD])).rows[0];
   expect(historical).toEqual({subscription_id:"historicalOwned99",
    source_commit:SHA,authorization_sha256:AUTH});
   expect((await db.query("SELECT count(*)::int AS n FROM "+
    "clean.gate4_alert_prebind_original_v39")).rows[0].n).toBe(1);
   expect((await db.query(
    "SELECT rolcanlogin FROM pg_roles WHERE rolname=$1",
    ["gate4_owner_writer_20261023"])).rows[0].rolcanlogin).toBe(false);
   console.log("GATE4_POST_RETIREMENT_REAL_PG16_NEW_WRITER_ISOLATION_PASS");
   console.log("PROVIDER_REQUESTS=0 PRODUCTION_DATABASE_WRITES=0");
  }finally{
   await writer?.end().catch(()=>undefined);
   await db.end().catch(()=>undefined);
   await adminRoot.end().catch(()=>undefined);
  }
 });
});
