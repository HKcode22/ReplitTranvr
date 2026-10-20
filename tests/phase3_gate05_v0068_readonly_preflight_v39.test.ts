import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {
  gate05V0068ReadonlyPreflightSqlV39,
  reviewGate05V0068ReadonlyPreflightV39
} from "../server/lib/disruption/gate05V0068ReadonlyPreflight_v39";

const catalog=()=>({
  scope_table_exists:true,
  allowed_query_table_exists:true,
  attempt_table_exists:true,
  reserve_function_exists:true,
  stop_function_exists:true,
  dispatch_group_nonlogin:true,
  safety_group_nonlogin:true,
  commission_group_nonlogin:true,
  v0068_index_name_exists:false
});
const inventory=()=>({
  open_scope_count:0,prepared_scope_count:0,active_scope_count:0,
  stopped_history_count:0,total_scope_count:0,
  total_query_count:0,total_attempt_count:0
});
describe("Gate05 staged V0068 read-only preflight semantics: no DDL or paid AUTH",()=>{
  it("builds exactly two read-only catalog/inventory SELECTs",()=>{
    const s=gate05V0068ReadonlyPreflightSqlV39();
    expect(s.queryCount).toBe(2);
    expect(s.catalogSql.trimStart()).toMatch(/^SELECT\b/);
    expect(s.inventorySql.trimStart()).toMatch(/^SELECT\b/);
    for(const q of [s.catalogSql,s.inventorySql]){
      expect(q).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|COMMIT|GRANT)\b/);
    }
    expect(s.defaultTransactionReadOnlyRequired).toBe(true);
    expect(s.approvedForDeployment).toBe(false);
    expect(s.paidPilotAuthorized).toBe(false);
  });
  it("accepts unused schema and ignores only terminal audit history",()=>{
    const r=reviewGate05V0068ReadonlyPreflightV39(catalog(),{
      ...inventory(),stopped_history_count:3,total_scope_count:3,
      total_query_count:6,total_attempt_count:14
    });
    expect(r).toMatchObject({
      status:"V0068_CATALOG_CANDIDATE_ONLY_NOT_RELEASED",
      noOpenGate05ScopeVerified:true,historicalStoppedScopeCount:3,
      historicalAllowedQueryCount:6,historicalAttemptCount:14,
      productionDatabaseIdentityAttested:false,
      migrationInstallationAuthorized:false,
      productionDatabaseWrites:0,providerRequests:0,
      paidPilotAuthorized:false
    });
  });
  it("refuses absent prior schema, roles with LOGIN, index already existing",()=>{
    for(const key of Object.keys(catalog()).filter(k=>k!=="v0068_index_name_exists")){
      expect(()=>reviewGate05V0068ReadonlyPreflightV39({
        ...catalog(),[key]:false
      },inventory())).toThrow("GATE05_V0068_PRIOR_SCHEMA_HOLD");
    }
    for(const present of [true,null,"false",undefined]){
      expect(()=>reviewGate05V0068ReadonlyPreflightV39({
        ...catalog(),v0068_index_name_exists:present
      },inventory())).toThrow("GATE05_V0068_INDEX_EXISTING_OR_UNKNOWN_HOLD");
    }
  });
  it("rejects open scope, contradictory counts, malformed/forged snapshots",()=>{
    const open={...inventory(),open_scope_count:1,
      prepared_scope_count:1,total_scope_count:1};
    expect(()=>reviewGate05V0068ReadonlyPreflightV39(catalog(),open))
      .toThrow("GATE05_V0068_EXISTING_OPEN_SCOPE_HOLD");
    expect(()=>reviewGate05V0068ReadonlyPreflightV39(catalog(),{
      ...inventory(),open_scope_count:1,total_scope_count:1
    })).toThrow("GATE05_V0068_ACCOUNTING_HOLD");
    for(const bad of [
      {...inventory(),active_scope_count:-1},
      {...inventory(),total_attempt_count:"0"},
      {...inventory(),total_query_count:NaN},
      {...inventory(),stopped_history_count:1.5}
    ]){
      expect(()=>reviewGate05V0068ReadonlyPreflightV39(catalog(),bad))
        .toThrow("GATE05_V0068_COUNTS_HOLD");
    }
    for(const shape of [[],null,[catalog(),catalog()],[null]]){
      expect(()=>reviewGate05V0068ReadonlyPreflightV39(shape,[inventory()]))
        .toThrow("GATE05_V0068_RESULT_SHAPE_HOLD");
    }
  });
});

// TEST-ONLY exact CI target: never connect to any real provider/production DB.
const ciUrl="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const ci=process.env.GITHUB_ACTIONS==="true"&&
  process.env.NODE_ENV==="test"&&
  process.env.DATABASE_URL===ciUrl&&!process.env.AERODATABOX_API_KEY;
(ci?describe:describe.skip)(
  "Gate05 V0068 preflight against real disposable PG16 (ROLLBACK ONLY)",()=>{
  it("distinguishes safe preinstall, open conflict, terminal history and already-indexed",async()=>{
    const db=new pg.Client({connectionString:ciUrl,connectionTimeoutMillis:8000});
    await db.connect();
    try{
      expect((await db.query("SELECT current_database() AS name")).rows[0].name)
        .toBe("v39_ci");
      await db.query("BEGIN");
      await db.query("SELECT pg_advisory_xact_lock(hashtext('gate05_staged_schema_test_v39'))");
      for(const name of [
        "V0066__gate05_scoped_fids_budget_v39.sql",
        "V0067__gate05_fids_function_only_roles_v39.sql"
      ])await db.query(readFileSync("migrations/staged/"+name,"utf8"));
      const queries=gate05V0068ReadonlyPreflightSqlV39();
      const snapshot=async()=>({
        catalog:(await db.query(queries.catalogSql)).rows,
        inventory:(await db.query(queries.inventorySql)).rows
      });
      let s=await snapshot();
      expect(reviewGate05V0068ReadonlyPreflightV39(s.catalog,s.inventory).status)
        .toBe("V0068_CATALOG_CANDIDATE_ONLY_NOT_RELEASED");

      const id=randomUUID();
      const scopeSql="INSERT INTO clean.gate05_fids_pilot_scope_v39 "+
        "(scope_id,authorization_id,authorization_sha256,cycle_id,icao,"+
        "starts_at_utc,expires_at_utc) "+
        "VALUES ($1::uuid,'AUTH-G05V0068TEST0001',$2,$3,'WSSS',"+
        "clock_timestamp()+interval '5 minutes',"+
        "clock_timestamp()+interval '20 minutes')";
      await db.query(scopeSql,[id,"a".repeat(64),"ci-disposable-cycle-only"]);
      s=await snapshot();
      expect(()=>reviewGate05V0068ReadonlyPreflightV39(s.catalog,s.inventory))
        .toThrow("GATE05_V0068_EXISTING_OPEN_SCOPE_HOLD");

      const stopped=await db.query(
        "SELECT * FROM clean.stop_gate05_fids_pilot_v39($1::uuid,'OPERATOR_STOP')",
        [id]
      );
      expect(stopped.rows[0].state).toBe("STOPPED");
      s=await snapshot();
      expect(reviewGate05V0068ReadonlyPreflightV39(s.catalog,s.inventory)
        .historicalStoppedScopeCount).toBe(1);

      await db.query(readFileSync(
        "migrations/staged/V0068__gate05_single_open_scope_v39.sql","utf8"
      ));
      s=await snapshot();
      expect(s.catalog[0].v0068_index_name_exists).toBe(true);
      expect(()=>reviewGate05V0068ReadonlyPreflightV39(s.catalog,s.inventory))
        .toThrow("GATE05_V0068_INDEX_EXISTING_OR_UNKNOWN_HOLD");
    }finally{
      await db.query("ROLLBACK").catch(()=>{});
      await db.end().catch(()=>{});
    }
  },40000);
});
