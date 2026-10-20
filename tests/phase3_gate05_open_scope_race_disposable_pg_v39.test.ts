/**
 * ONE disposable CI-only integration test of the exact staged V0068 unique
 * partial-index expression, with two independent PG16 connections.
 *
 * Unlike a one-transaction duplicate INSERT, this tests a second writer
 * racing against an UNCOMMITTED first writer's index entry.
 *
 * Gated to CI's literal localhost v39_ci PostgreSQL and empty API key.
 * A unique ephemeral table is created and DROPPED; never runs on production.
 */
import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import pg from "pg";

const disposableUrl="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const ciOnly=process.env.GITHUB_ACTIONS==="true"&&
  process.env.NODE_ENV==="test"&&
  process.env.DATABASE_URL===disposableUrl&&
  !process.env.AERODATABOX_API_KEY;
const onlyDisposable=ciOnly?describe:describe.skip;

onlyDisposable("Gate05 V0068 partial unique index stops a real independent-connection race",()=>{
  it("blocks a racing OPEN insert, rejects later duplicate, and admits after terminal STOP",async()=>{
    const table="gate05_race_ci_"+randomUUID().replaceAll("-","");
    const index=table+"_one_open";
    const target="clean."+table;
    const a=new pg.Client({connectionString:disposableUrl,connectionTimeoutMillis:5000});
    const b=new pg.Client({connectionString:disposableUrl,connectionTimeoutMillis:5000});
    let aConnected=false,bConnected=false,created=false;
    try{
      await a.connect();aConnected=true;
      await b.connect();bConnected=true;
      expect((await a.query("SELECT current_database() AS db")).rows[0].db).toBe("v39_ci");
      expect((await b.query("SELECT current_database() AS db")).rows[0].db).toBe("v39_ci");
      await a.query("CREATE TABLE "+target+
        " (scope_id uuid PRIMARY KEY,state text NOT NULL "+
        "CHECK (state IN ('PREPARED','ACTIVE','STOPPED')))");
      created=true;
      const migration=readFileSync(
        "migrations/staged/V0068__gate05_single_open_scope_v39.sql","utf8"
      );
      expect(migration).toContain("CREATE UNIQUE INDEX gate05_fids_one_open_scope_v39");
      const mirrored=migration.replaceAll(
        "gate05_fids_one_open_scope_v39",index
      ).replaceAll(
        "clean.gate05_fids_pilot_scope_v39",target
      );
      await a.query(mirrored);

      const id1=randomUUID(),id2=randomUUID();
      await a.query("BEGIN");
      await a.query("INSERT INTO "+target+" VALUES($1,'PREPARED')",[id1]);

      // The second connection cannot get past the uncommitted unique-index
      // entry; fail quickly instead of waiting for the first transaction.
      await b.query("BEGIN");
      await b.query("SET LOCAL lock_timeout='900ms'");
      await expect(b.query(
        "INSERT INTO "+target+" VALUES($1,'PREPARED')",[id2]
      )).rejects.toMatchObject({code:"55P03"});
      await b.query("ROLLBACK");

      await a.query("COMMIT");
      await b.query("BEGIN");
      await expect(b.query(
        "INSERT INTO "+target+" VALUES($1,'ACTIVE')",[id2]
      )).rejects.toMatchObject({code:"23505"});
      await b.query("ROLLBACK");

      await a.query("UPDATE "+target+" SET state='STOPPED' WHERE scope_id=$1",[id1]);
      await b.query("BEGIN");
      expect((await b.query(
        "INSERT INTO "+target+" VALUES($1,'PREPARED')",[id2]
      )).rowCount).toBe(1);
      await b.query("COMMIT");

      const counts=(await a.query(
        "SELECT state,count(*)::int n FROM "+target+" GROUP BY state ORDER BY state"
      )).rows;
      expect(counts).toEqual([{state:"PREPARED",n:1},{state:"STOPPED",n:1}]);
    }finally{
      if(bConnected)await b.query("ROLLBACK").catch(()=>{});
      if(aConnected)await a.query("ROLLBACK").catch(()=>{});
      if(created&&aConnected)await a.query("DROP TABLE IF EXISTS "+target).catch(()=>{});
      if(bConnected)await b.end().catch(()=>{});
      if(aConnected)await a.end().catch(()=>{});
    }
  },30000);
});
