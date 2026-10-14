/**
 * Actual disposable GitHub-Actions PostgreSQL constraint proof.
 * No provider SDK/credentials, Replit host, live database or production
 * mutation permitted. This runs ONLY against the named workflow-local v39_ci
 * on 127.0.0.1/localhost; all synthetic writes roll back transactionally.
 */
import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import pg from "pg";

const rawUrl=process.env.DATABASE_URL??"";
let isLocal=false;
try{
  const url=new URL(rawUrl);
  isLocal=["127.0.0.1","localhost"].includes(url.hostname)
    && url.pathname==="/v39_ci"
    && process.env.GITHUB_ACTIONS==="true"
    && !process.env.AERODATABOX_API_KEY;
}catch{}
const suite=isLocal?describe:describe.skip;

suite("Phase3 Gate3 real disposable-PG LOGGED owner before UNLOGGED prepaid runtime",()=>{
  it("rejects orphan and wrong-scope canaries, accepts exact journal, preserves Phase2",async()=>{
    const client=new pg.Client({connectionString:rawUrl,connectionTimeoutMillis:8000});
    await client.connect();
    const sha="b".repeat(64),receipt="c".repeat(64);
    const session=randomUUID(), smoke=randomUUID();
    try{
      await client.query("BEGIN");
      const schema=await client.query(
        "SELECT to_regclass('clean.phase3_gate3_canary_owner_v39') AS owner");
      expect(schema.rows[0].owner).not.toBeNull();

      // Failure is contained in a savepoint so nothing escapes the fixture.
      await client.query("SAVEPOINT no_owner");
      await expect(client.query(
        `INSERT INTO clean.prepaid_probe_session_runtime
           (session_id,owner_kind,icao,state,created_at_utc,expires_at_utc)
         VALUES ($1,'phase3_credit_canary','YSSY','armed',now(),now()+interval '30 minutes')`,
        [session],
      )).rejects.toThrow(/REFUSED_GATE3_CANARY_DURABLE_OWNER_REQUIRED/);
      await client.query("ROLLBACK TO SAVEPOINT no_owner");

      await client.query(
        `INSERT INTO clean.phase3_gate3_canary_owner_v39
           (session_id,icao,authorization_evidence_sha256,
            canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
         VALUES ($1,'YSSY',$2,20,300,now()+interval '1 hour')`,
        [session,sha],
      );

      await client.query("SAVEPOINT wrong_icao");
      await expect(client.query(
        `INSERT INTO clean.prepaid_probe_session_runtime
           (session_id,owner_kind,icao,state,created_at_utc,expires_at_utc)
         VALUES ($1,'phase3_credit_canary','WSSS','armed',now(),now()+interval '30 minutes')`,
        [session],
      )).rejects.toThrow(/REFUSED_GATE3_CANARY_DURABLE_OWNER_REQUIRED/);
      await client.query("ROLLBACK TO SAVEPOINT wrong_icao");

      await client.query(
        `INSERT INTO clean.prepaid_probe_session_runtime
           (session_id,owner_kind,icao,state,created_at_utc,expires_at_utc)
         VALUES ($1,'phase3_credit_canary','YSSY','armed',now(),now()+interval '30 minutes')`,
        [session],
      );
      const armed=await client.query(
        "SELECT owner_kind,icao,state FROM clean.prepaid_probe_session_runtime WHERE session_id=$1",
        [session],
      );
      expect(armed.rows[0]).toMatchObject({
        owner_kind:"phase3_credit_canary",icao:"YSSY",state:"armed",
      });

      await client.query("SAVEPOINT wrong_cost");
      await expect(client.query(
        `UPDATE clean.phase3_gate3_canary_owner_v39
         SET state='SETTLED',balance_before=500,balance_stable=498,
             external_credits=2,internal_received_credits=1,
             stable_read_count=3,owned_subscription_delete_verified=true,
             foreign_billable_count=0,evidence_sha256=$2,
             terminal_at_utc=now()
         WHERE session_id=$1`,
        [session,receipt],
      )).rejects.toThrow();
      await client.query("ROLLBACK TO SAVEPOINT wrong_cost");

      await client.query(
        `UPDATE clean.phase3_gate3_canary_owner_v39
         SET state='SETTLED',balance_before=500,balance_stable=498,
             external_credits=2,internal_received_credits=2,
             stable_read_count=3,owned_subscription_delete_verified=true,
             foreign_billable_count=0,evidence_sha256=$2,
             terminal_at_utc=now()
         WHERE session_id=$1`,
        [session,receipt],
      );
      await client.query("SAVEPOINT mutate_terminal");
      await expect(client.query(
        "UPDATE clean.phase3_gate3_canary_owner_v39 SET external_credits=3 WHERE session_id=$1",
        [session],
      )).rejects.toThrow(/terminal receipt immutable/);
      await client.query("ROLLBACK TO SAVEPOINT mutate_terminal");

      await client.query(
        `INSERT INTO clean.prepaid_probe_session_runtime
           (session_id,owner_kind,state,created_at_utc,expires_at_utc)
         VALUES ($1,'phase2_safety_smoke','armed',now(),now()+interval '1 hour')`,
        [smoke],
      );
      const q=await client.query(
        `SELECT count(*)::int AS smoke_n
         FROM clean.prepaid_probe_session_runtime
         WHERE session_id=$1 AND owner_kind='phase2_safety_smoke'`,
        [smoke],
      );
      expect(q.rows[0].smoke_n).toBe(1);
    }finally{
      await client.query("ROLLBACK").catch(()=>undefined);
      await client.end();
    }
  },30000);
});
