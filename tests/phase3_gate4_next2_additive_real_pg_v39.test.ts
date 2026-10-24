/**
 * Disposable PostgreSQL16 snapshot of the exact 7 post-NEXT1 RLS policies
 * observed from owner's production read-only metadata audit.
 * Tests NEXT2 additive SQL, scoped role denies, original and binding custody.
 * Never accesses Neon, Replit, GitHub or AeroDataBox.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import pg from "pg";
import {gate4Next2RoleDDLV39,gate4Next2ScopedStatementsV39} from
 "../scripts/v39_gate4_next2_additive_commission_no_provider_v39";
import {recoverNext2PredicateV39} from
 "../scripts/v39_gate4_next2_lost_private_scope_recovery_v39";
import {gate4Next2PoliciesMatchV39} from
 "../scripts/v39_gate4_next2_production_readonly_inventory_v39";

const ci="postgresql://gate4_fixture:only_for_ci@127.0.0.1:5432/gate4_prebind_ci";
const allowed=process.env.GITHUB_ACTIONS==="true"&&
 process.env.NODE_ENV==="test"&&process.env.GATE4_PREBIND_PG_TEST_URL===ci&&
 !process.env.AERODATABOX_API_KEY&&!process.env.RAPIDAPI_KEY&&
 !process.env.DATABASE_URL&&!process.env.V39_DATABASE_RUNTIME_URL&&
 !process.env.V39_PRODUCTION_DATABASE_OWNER_URL;
const suite=allowed?describe:describe.skip;
const old="498dccd7-5da3-4687-a6ea-e0dc03b54398";
const next1="d6c0fcac-798e-4913-bfd1-a561adb3dd82";
const next2="16f819c6-7c68-4d5a-82cf-3820e9294dc7";
const sha="29d3e0dff8b8863f55f6d73e609e21480b8e46db";
const auth="a".repeat(64),oldSha="b".repeat(40);
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const raw="clean.gate4_alert_prebind_original_v39";
const own="clean.gate4_alert_owned_binding_v39";

suite("Gate4 NEXT2 additive post-NEXT1 PostgreSQL16 scope custody",()=>{
 it("adds two fresh exact roles and four policies, preserves both old owner rows",async()=>{
  const root=new pg.Pool({connectionString:ci,max:1});
  const target=ci.replace("/gate4_prebind_ci","/gate4_next2_ci");
  const db=new pg.Pool({connectionString:target,max:4});
  let receiver:pg.PoolClient|undefined,writer:pg.PoolClient|undefined;
  try{
   expect((await root.query("SELECT current_database() AS db")).rows[0].db)
    .toBe("gate4_prebind_ci");
   await root.query("CREATE DATABASE gate4_next2_ci");
   await db.query("CREATE SCHEMA clean");
   const migration=(name:string)=>readFileSync(new URL(
    "../migrations/staged/"+name,import.meta.url),"utf8");
   await db.query(migration("V0071__gate4_alert_prebind_quarantine_v39.sql"));
   await db.query(migration("V0072__gate4_owned_binding_v39.sql"));
   const existing=[
    "gate4_receiver_20261022","gate4_receiver_2026_next1",
    "gate4_owner_writer_2026_next1","gate4_safety_reader_20261022"
   ];
   const roles=(await db.query(
    "SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",
    [existing])).rows;
   expect(roles.map(x=>x.rolname).sort()).toEqual(existing.sort());

   const oldWire=Buffer.from('{"synthetic":"historical"}');
   await db.query(
    "INSERT INTO "+raw+
    " (scope_id,original_sha256,source_commit,authorization_sha256,"+
    "airport_icao,claimed_provider_subscription_id,original_wire) "+
    " VALUES ($1::uuid,$2,$3,$4,'WSSS',$5,$6)",
    [old,digest(oldWire),oldSha,auth,"oldfixture99",oldWire]
   );
   const insertOwner="INSERT INTO "+own+
    " (scope_id,authorization_sha256,source_commit,airport_icao,"+
    "subscription_id,reviewed_create_receipt_sha256,"+
    "signed_stop_ticket_sha256) "+
    "VALUES ($1::uuid,$2,$3,'WSSS',$4,$5,$6)";
   await db.query(insertOwner,[old,auth,oldSha,"oldfixture99",
    "e".repeat(64),"f".repeat(64)]);
   await db.query(insertOwner,[next1,auth,oldSha,"next1fixture99",
    "e".repeat(64),"f".repeat(64)]);
   for(const role of ["gate4_receiver_20261022","gate4_receiver_2026_next1"]){
    await db.query("GRANT CONNECT ON DATABASE gate4_next2_ci TO "+role);
    await db.query("GRANT USAGE ON SCHEMA clean TO "+role);
    await db.query("GRANT SELECT,INSERT ON TABLE "+raw+" TO "+role);
   }
   await db.query("GRANT CONNECT ON DATABASE gate4_next2_ci TO gate4_owner_writer_2026_next1");
   await db.query("GRANT USAGE ON SCHEMA clean TO gate4_owner_writer_2026_next1");
   await db.query("GRANT SELECT,INSERT ON TABLE "+own+" TO gate4_owner_writer_2026_next1");
   await db.query("GRANT CONNECT ON DATABASE gate4_next2_ci TO gate4_safety_reader_20261022");
   await db.query("GRANT USAGE ON SCHEMA clean TO gate4_safety_reader_20261022");
   await db.query("GRANT SELECT ON TABLE "+own+" TO gate4_safety_reader_20261022");
   const predicate=(scope:string,source:string)=>
    "scope_id='"+scope+"'::uuid AND "+
    "authorization_sha256='"+auth+"' AND "+
    "source_commit='"+source+"' AND airport_icao='WSSS'";
   for(const [name,cmd,role,scope,source] of [
    ["gate4_legacy_receiver_select_v39","SELECT","gate4_receiver_20261022",old,oldSha],
    ["gate4_legacy_receiver_insert_v39","INSERT","gate4_receiver_20261022",old,oldSha],
    ["gate4_next_receiver_select_v39","SELECT","gate4_receiver_2026_next1",next1,oldSha],
    ["gate4_next_receiver_insert_v39","INSERT","gate4_receiver_2026_next1",next1,oldSha]
   ]){
    await db.query("CREATE POLICY "+name+" ON "+raw+" FOR "+cmd+
     " TO "+role+" "+(cmd==="SELECT"?"USING":"WITH CHECK")+
     " ("+predicate(scope,source)+")");
   }
   await db.query("CREATE POLICY gate4_safety_select_v39 ON "+own+
    " FOR SELECT TO gate4_safety_reader_20261022 USING (true)");
   for(const [name,cmd] of [
    ["gate4_next_writer_select_v39","SELECT"],
    ["gate4_next_writer_insert_v39","INSERT"]
   ]){
    await db.query("CREATE POLICY "+name+" ON "+own+" FOR "+cmd+
     " TO gate4_owner_writer_2026_next1 "+
     (cmd==="SELECT"?"USING":"WITH CHECK")+
     " ("+predicate(next1,oldSha)+")");
   }
   await db.query("ALTER TABLE "+raw+" ENABLE ROW LEVEL SECURITY");
   await db.query("ALTER TABLE "+own+" ENABLE ROW LEVEL SECURITY");
   const query="SELECT tablename,policyname,cmd,permissive,"+
    "cardinality(roles)::int AS role_count,roles[1]::text AS assigned_role,"+
    "qual,with_check,qual IS NOT NULL AS has_using,"+
    "with_check IS NOT NULL AS has_check "+
    "FROM pg_policies WHERE schemaname='clean' AND "+
    "tablename=ANY($1::text[])";
   const baseline=(await db.query(query,[[raw.split(".")[1],own.split(".")[1]]])).rows;
   expect(baseline).toHaveLength(7);
   expect(gate4Next2PoliciesMatchV39(baseline,raw.split(".")[1])).toBe(true);
   expect(gate4Next2PoliciesMatchV39(baseline,own.split(".")[1])).toBe(true);

   await db.query(gate4Next2RoleDDLV39("gate4_receiver_2026_next2",
    "f".repeat(80),"2027-10-24T19:00:00.000Z",4));
   await db.query(gate4Next2RoleDDLV39("gate4_owner_writer_2026_next2",
    "f".repeat(80),"2027-10-24T19:00:00.000Z",1));
   for(const sql of gate4Next2ScopedStatementsV39(auth)){
    // Swap ONLY the fixed disposable DATABASE target in CI fixture, not
    // the scope, AUTH, receiver, role identifiers or any policy predicate.
    await db.query(sql.replace(
     "GRANT CONNECT ON DATABASE neondb TO ",
     "GRANT CONNECT ON DATABASE gate4_next2_ci TO "
    ));
   }
   const after=(await db.query(query,[[raw.split(".")[1],own.split(".")[1]]])).rows;
   expect(after).toHaveLength(11);
   // PostgreSQL itself deparses VARCHAR comparisons with ::text casts.
   // Recovered private authorization must match all four actual policies.
   const next2Policies=after.filter(x=>x.policyname.startsWith("gate4_next2_"));
   expect(next2Policies).toHaveLength(4);
   for(const p of next2Policies){
    const predicate=p.cmd==="SELECT"?p.qual:p.with_check;
    expect(recoverNext2PredicateV39(predicate)).toBe(auth);
   }

   expect(gate4Next2PoliciesMatchV39(after.filter(x=>!
    x.policyname.startsWith("gate4_next2_")),raw.split(".")[1])).toBe(true);
   expect(gate4Next2PoliciesMatchV39(after.filter(x=>!
    x.policyname.startsWith("gate4_next2_")),own.split(".")[1])).toBe(true);

   receiver=await db.connect();
   await receiver.query("SET ROLE gate4_receiver_2026_next2");
   expect((await receiver.query("SELECT count(*)::int AS n FROM "+raw)).rows[0].n).toBe(0);
   const insertOriginal="INSERT INTO "+raw+
    " (scope_id,original_sha256,source_commit,authorization_sha256,"+
    "airport_icao,claimed_provider_subscription_id,original_wire) "+
    "VALUES ($1::uuid,$2,$3,$4,'WSSS',$5,$6)";
   const fixture=Buffer.from('{"synthetic":"next2"}');
   await expect(receiver.query(insertOriginal,[old,digest(fixture),sha,auth,
    "badold99",fixture])).rejects.toThrow();
   await expect(receiver.query(insertOriginal,[next2,digest(fixture),oldSha,auth,
    "badsource99",fixture])).rejects.toThrow();
   await receiver.query(insertOriginal,[next2,digest(fixture),sha,auth,
    "freshsynthetic99",fixture]);
   expect((await receiver.query("SELECT count(*)::int AS n FROM "+raw)).rows[0].n).toBe(1);
   await expect(receiver.query("DELETE FROM "+raw)).rejects.toThrow();
   await expect(receiver.query("SELECT * FROM "+own)).rejects.toThrow();

   writer=await db.connect();
   await writer.query("SET ROLE gate4_owner_writer_2026_next2");
   expect((await writer.query("SELECT count(*)::int AS n FROM "+own)).rows[0].n).toBe(0);
   await expect(writer.query(insertOwner,[next1,auth,sha,"badnext199",
    "e".repeat(64),"f".repeat(64)])).rejects.toThrow();
   await expect(writer.query(insertOwner,[next2,auth,oldSha,"badsource99",
    "e".repeat(64),"f".repeat(64)])).rejects.toThrow();
   await writer.query(insertOwner,[next2,auth,sha,"newpositive99",
    "e".repeat(64),"f".repeat(64)]);
   expect((await writer.query("SELECT count(*)::int AS n FROM "+own)).rows[0].n).toBe(1);
   await expect(writer.query("SELECT * FROM "+raw)).rejects.toThrow();
   await expect(writer.query("DELETE FROM "+own)).rejects.toThrow();
   expect((await db.query("SELECT count(*)::int AS n FROM "+own)).rows[0].n).toBe(3);
   expect((await db.query("SELECT count(*)::int AS n FROM "+raw)).rows[0].n).toBe(2);
   const original=(await db.query("SELECT original_wire,original_sha256 "+
    "FROM "+raw+" WHERE scope_id=$1::uuid",[old])).rows[0];
   expect(original.original_wire.equals(oldWire)).toBe(true);
   expect(original.original_sha256).toBe(digest(oldWire));
   console.log("GATE4_NEXT2_THIRD_SCOPE_ADDITIVE_PG16_NO_PROVIDER_PASS");
  }finally{
   await receiver?.query("RESET ROLE").catch(()=>undefined);
   await writer?.query("RESET ROLE").catch(()=>undefined);
   receiver?.release();writer?.release();
   await db.end().catch(()=>undefined);
   await root.end().catch(()=>undefined);
  }
 });
});
