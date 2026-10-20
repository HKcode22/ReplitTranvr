/**
 * Disposable CI-only two-connection race and authorization replay test.
 * V0068 UNIQUE open-slot plus immutable authorization-ID/digest indexes
 * are mirrored on a uniquely named ephemeral table, then DROPPED.
 * NEVER runs on production, never invokes AeroDataBox.
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

onlyDisposable("Gate05 V0068 prevents concurrent open scopes and replayed AUTH",()=>{
  it("serializes two sessions and permits new AUTH only after STOPPED",async()=>{
    const table="gate05_race_ci_"+randomUUID().replaceAll("-","");
    const target="clean."+table;
    const indexes={
      gate05_fids_one_open_scope_v39:table+"_open",
      gate05_fids_one_authorization_id_v39:table+"_authid",
      gate05_fids_one_authorization_sha_v39:table+"_authsha"
    };
    const a=new pg.Client({connectionString:disposableUrl,connectionTimeoutMillis:5000});
    const b=new pg.Client({connectionString:disposableUrl,connectionTimeoutMillis:5000});
    let aConnected=false,bConnected=false,created=false;
    const insert=(state:"PREPARED"|"ACTIVE")=>
      "INSERT INTO "+target+
      " (scope_id,authorization_id,authorization_sha256,state) "+
      "VALUES($1,$2,$3,'"+state+"')";
    const first=[randomUUID(),"AUTH-G05-RACE-ONE","a".repeat(64)];
    const second=[randomUUID(),"AUTH-G05-RACE-TWO","b".repeat(64)];
    try{
      await a.connect();aConnected=true;
      await b.connect();bConnected=true;
      expect((await a.query("SELECT current_database() AS db")).rows[0].db).toBe("v39_ci");
      expect((await b.query("SELECT current_database() AS db")).rows[0].db).toBe("v39_ci");
      await a.query("CREATE TABLE "+target+
        " (scope_id uuid PRIMARY KEY,authorization_id text NOT NULL,"+
        "authorization_sha256 text NOT NULL,state text NOT NULL "+
        "CHECK (state IN ('PREPARED','ACTIVE','STOPPED')))");
      created=true;
      const migration=readFileSync(
        "migrations/staged/V0068__gate05_single_open_scope_v39.sql","utf8"
      );
      let mirrored=migration;
      for(const [name,substitute] of Object.entries(indexes))
        mirrored=mirrored.replaceAll(name,substitute);
      mirrored=mirrored.replaceAll("clean.gate05_fids_pilot_scope_v39",target);
      await a.query(mirrored);

      await a.query("BEGIN");
      await a.query(insert("PREPARED"),first);
      // Racing writer cannot sneak past uncommitted UNIQUE index entry.
      await b.query("BEGIN");
      await b.query("SET LOCAL lock_timeout='900ms'");
      await expect(b.query(insert("PREPARED"),second))
        .rejects.toMatchObject({code:"55P03"});
      await b.query("ROLLBACK");
      await a.query("COMMIT");

      await b.query("BEGIN");
      await expect(b.query(insert("ACTIVE"),second))
        .rejects.toMatchObject({code:"23505"});
      await b.query("ROLLBACK");

      await a.query("UPDATE "+target+" SET state='STOPPED' WHERE scope_id=$1",[first[0]]);
      // The open slot has been released, but the first signed AUTH must
      // remain one-use permanently, even in a later execution window.
      await b.query("BEGIN");
      await expect(b.query(insert("PREPARED"),[
        randomUUID(),first[1],"c".repeat(64)
      ])).rejects.toMatchObject({code:"23505",constraint:indexes.gate05_fids_one_authorization_id_v39});
      await b.query("ROLLBACK");
      await b.query("BEGIN");
      await expect(b.query(insert("PREPARED"),[
        randomUUID(),"AUTH-G05-RACE-THREE",first[2]
      ])).rejects.toMatchObject({code:"23505",constraint:indexes.gate05_fids_one_authorization_sha_v39});
      await b.query("ROLLBACK");

      await b.query("BEGIN");
      expect((await b.query(insert("PREPARED"),second)).rowCount).toBe(1);
      await b.query("COMMIT");
      expect((await a.query(
        "SELECT state,count(*)::int n FROM "+target+" GROUP BY state ORDER BY state"
      )).rows).toEqual([{state:"PREPARED",n:1},{state:"STOPPED",n:1}]);
    }finally{
      if(bConnected)await b.query("ROLLBACK").catch(()=>{});
      if(aConnected)await a.query("ROLLBACK").catch(()=>{});
      if(created&&aConnected)await a.query("DROP TABLE IF EXISTS "+target).catch(()=>{});
      if(bConnected)await b.end().catch(()=>{});
      if(aConnected)await a.end().catch(()=>{});
    }
  },30000);
});
