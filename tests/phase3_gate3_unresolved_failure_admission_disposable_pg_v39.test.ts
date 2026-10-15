/**
 * Verify the EXACT Gate3 admission query against real disposable PostgreSQL.
 * Uses SAVEPOINT isolation and full ROLLBACK so no historical/production
 * immutable receipt, source row, provider usage or provider credentials.
 */
import {randomUUID} from "node:crypto";
import pg from "pg";
import {describe,expect,it} from "vitest";
import {GATE3_PRIOR_OWNER_ADMISSION_SQL_V39}
  from "../server/lib/disruption/gate3PrepaidCanaryPreparation_v39";

const url=process.env.DATABASE_URL??"";
let allowed=false;
try {
  const u=new URL(url);
  allowed=process.env.GITHUB_ACTIONS==="true" &&
    ["localhost","127.0.0.1"].includes(u.hostname) &&
    u.pathname==="/v39_ci" && !process.env.AERODATABOX_API_KEY;
}catch{}
const suite=allowed?describe:describe.skip;

suite("Gate3 PREPARED admission real-PG: unresolved FAILED != safe new canary",()=>{
  it("keeps every ambiguous account failure blocking but not an ordinary settled credit-gap research failure",async()=>{
    const c=new pg.Client({connectionString:url,connectionTimeoutMillis:8000});
    await c.connect();
    try {
      await c.query("BEGIN");
      const faultCodes=[
        "CREATE_AMBIGUOUS_ACCOUNT_HOLD",
        "BIND_FAILED",
        "OWNED_DELETE_UNVERIFIED",
        "SETTLEMENT_UNRESOLVED",
      ];
      for(const failureCode of [...faultCodes,"CREDIT_DIFFERENCE"]){
        await c.query("SAVEPOINT prior_failure");
        const id=randomUUID();
        await c.query(`INSERT INTO clean.phase3_gate3_canary_owner_v39
          (session_id,icao,authorization_evidence_sha256,
           canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
          VALUES ($1,'YSSY',$2,20,300,now()+interval '20 minutes')`,
          [id,"a".repeat(64)]);
        await c.query(`UPDATE clean.phase3_gate3_canary_owner_v39
          SET state='FAILED',failure_reason=$2,
              evidence_sha256=$3,terminal_at_utc=now()
          WHERE session_id=$1`,[id,failureCode,"b".repeat(64)]);
        const q=await c.query(GATE3_PRIOR_OWNER_ADMISSION_SQL_V39);
        if(faultCodes.includes(failureCode)){
          expect(q.rowCount).toBe(1);
          expect(q.rows[0]).toMatchObject({
            session_id:id,state:"FAILED",failure_reason:failureCode,
          });
        }else {
          expect(q.rowCount).toBe(0);
        }
        await c.query("ROLLBACK TO SAVEPOINT prior_failure");
      }
      // PREPARED remains an independent blocker even with no FAILED row.
      await c.query("SAVEPOINT pending_owner");
      const id=randomUUID();
      await c.query(`INSERT INTO clean.phase3_gate3_canary_owner_v39
        (session_id,icao,authorization_evidence_sha256,
         canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
        VALUES ($1,'YSSY',$2,20,300,now()+interval '20 minutes')`,
        [id,"a".repeat(64)]);
      const q=await c.query(GATE3_PRIOR_OWNER_ADMISSION_SQL_V39);
      expect(q.rows[0]).toMatchObject({session_id:id,state:"PREPARED"});
      await c.query("ROLLBACK TO SAVEPOINT pending_owner");
      expect((await c.query(GATE3_PRIOR_OWNER_ADMISSION_SQL_V39)).rowCount).toBe(0);
    }finally {
      await c.query("ROLLBACK").catch(()=>undefined);
      await c.end();
    }
  },30000);
});
