/**
 * Runs only on the local disposable CI PostgreSQL v39_ci fixture.
 * Applies STAGED Gate05 V0074 INSIDE a transaction, proves isolation against
 * the installed Gate3 V0065 and historical Phase2, then ROLLBACK.
 * No provider key, provider requests, live database or production schema.
 */
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import pg from "pg";
const url=process.env.DATABASE_URL??"";
let local=false;
try{
  const x=new URL(url);
  local=["127.0.0.1","localhost"].includes(x.hostname)&&
    x.pathname==="/v39_ci"&&process.env.GITHUB_ACTIONS==="true"&&
    !process.env.AERODATABOX_API_KEY;
}catch{}
(local?describe:describe.skip)("Gate05 forward-only new logged owner and prepaid callback exact binding",()=>{
  it("requires signed LOGGED WSSS owner, immutable one-pilot cap and exact bound subscription",async()=>{
    const db=new pg.Client({connectionString:url,connectionTimeoutMillis:8000});
    await db.connect();
    const id=randomUUID(),bad=randomUUID(),old=randomUUID();
    const a="a".repeat(64),b="b".repeat(64),c="c".repeat(64);
    try {
      await db.query("BEGIN");
      const original=await db.query("SELECT to_regclass('clean.phase3_gate3_canary_owner_v39') AS gate3");
      expect(original.rows[0].gate3).not.toBeNull();
      const sql=readFileSync("migrations/staged/V0074__gate05_science_prepaid_owner_v39.sql","utf8");
      await db.query(sql);
      const existing=await db.query("SELECT to_regclass('clean.phase3_gate05_science_owner_v39') AS gate05");
      expect(existing.rows[0].gate05).not.toBeNull();
      const tryInvalid=async(name:string,query:string,args:unknown[])=>{
        await db.query("SAVEPOINT "+name);
        await expect(db.query(query,args)).rejects.toThrow();
        await db.query("ROLLBACK TO SAVEPOINT "+name);
      };
      const insRuntime=`INSERT INTO clean.prepaid_probe_session_runtime
        (session_id,owner_kind,owner_probe_id,stage,icao,state,created_at_utc,expires_at_utc)
        VALUES($1,'phase3_gate05_science',NULL,NULL,$2,'armed',now(),now()+interval '3 hours 10 minutes')`;
      await tryInvalid("orphan",insRuntime,[id,"WSSS"]);
      await tryInvalid("budget",`INSERT INTO clean.phase3_gate05_science_owner_v39
        (session_id,source_commit,authorization_sha256,reviewed_stop_ticket_sha256,
         alert_credit_ceiling,start_at_utc,stop_at_utc,session_expires_at_utc)
        VALUES($1,$2,$3,$4,501,now()+interval '2 hours',
         now()+interval '3 hours',now()+interval '3 hours 20 minutes')`,
         [id,"a".repeat(40),a,b]);
      const ins=`INSERT INTO clean.phase3_gate05_science_owner_v39
        (session_id,source_commit,authorization_sha256,reviewed_stop_ticket_sha256,
         start_at_utc,stop_at_utc,session_expires_at_utc)
         VALUES($1,$2,$3,$4,now()+interval '2 hours',
           now()+interval '3 hours',now()+interval '3 hours 20 minutes')`;
      await db.query(ins,[id,"a".repeat(40),a,b]);
      await tryInvalid("second_open",ins,[bad,"a".repeat(40),a,b]);
      await tryInvalid("wrong_airport",insRuntime,[id,"YSSY"]);
      await db.query(insRuntime,[id,"WSSS"]);
      await tryInvalid("early_bind",`UPDATE clean.prepaid_probe_session_runtime
        SET provider_subscription_id='unreviewed-provider'
        WHERE session_id=$1`,[id]);
      await db.query(`UPDATE clean.phase3_gate05_science_owner_v39
        SET state='ACTIVE',provider_subscription_id='reviewed-provider'
        WHERE session_id=$1`,[id]);
      await tryInvalid("wrong_bind",`UPDATE clean.prepaid_probe_session_runtime
        SET provider_subscription_id='foreign-provider'
        WHERE session_id=$1`,[id]);
      await db.query(`UPDATE clean.prepaid_probe_session_runtime
        SET provider_subscription_id='reviewed-provider',state='active'
        WHERE session_id=$1`,[id]);
      await tryInvalid("change_budget",`UPDATE clean.phase3_gate05_science_owner_v39
        SET alert_credit_ceiling=400,state='STOPPED',
        exact_owned_delete_verified=true,terminal_evidence_sha256=$2,
        terminal_at_utc=now() WHERE session_id=$1`,[id,c]);
      await db.query(`UPDATE clean.phase3_gate05_science_owner_v39
        SET state='STOPPED',exact_owned_delete_verified=true,
        terminal_evidence_sha256=$2,terminal_at_utc=now()
        WHERE session_id=$1`,[id,c]);
      await db.query(`UPDATE clean.prepaid_probe_session_runtime
        SET state='settling' WHERE session_id=$1`,[id]);
      await tryInvalid("terminal_mutate",`UPDATE clean.phase3_gate05_science_owner_v39
        SET state='FAILED' WHERE session_id=$1`,[id]);
      await tryInvalid("delete_receipt",`DELETE FROM clean.phase3_gate05_science_owner_v39
        WHERE session_id=$1`,[id]);
      // Proves the historic Phase2 owner is not affected by the new guard.
      await db.query(`INSERT INTO clean.prepaid_probe_session_runtime
        (session_id,owner_kind,stage,state,created_at_utc,expires_at_utc)
        VALUES ($1,'phase2_safety_smoke',NULL,'armed',now(),now()+interval '1 hour')`,[old]);
      expect((await db.query(`SELECT count(*)::int AS n
        FROM clean.prepaid_probe_session_runtime WHERE session_id=$1`,[old])).rows[0].n).toBe(1);
    } finally {
      await db.query("ROLLBACK").catch(()=>undefined);
      await db.end();
    }
  },30000);
});
