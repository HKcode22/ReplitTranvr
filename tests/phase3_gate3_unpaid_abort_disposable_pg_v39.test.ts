/**
 * Real disposable PostgreSQL transaction rehearsal of Gate3 unpaid autoabort.
 * NEVER touches production or AeroDataBox, and rolls back all synthetic data.
 * The previous standalone failure-commit tests cover acknowledged COMMIT;
 * this test proves exact source inspection and terminal SQL semantics.
 */
import {randomUUID} from "node:crypto";
import {describe,it,expect} from "vitest";
import pg from "pg";
import {GATE3_PRIOR_OWNER_ADMISSION_SQL_V39} from
  "../server/lib/disruption/gate3PrepaidCanaryPreparation_v39";
import {GATE3_PRECREATE_ABORT_SOURCE_SQL_V39,
  terminateUnpaidGate3PrecreateV39,
  type UnpaidPrecreateAbortScopeV39,
  type UnpaidPrecreateSourceV39} from
  "../server/lib/disruption/gate3UnpaidPrecreateAbort_v39";
import {recordGate3CanaryFailureV39} from
  "../server/lib/disruption/gate3CanaryFailureReceipt_v39";

const raw=process.env.DATABASE_URL??"";
let safe=false;
try{
 const u=new URL(raw);
 safe=process.env.GITHUB_ACTIONS==="true"&&
      ["localhost","127.0.0.1"].includes(u.hostname)&&
      u.pathname==="/v39_ci"&&!process.env.AERODATABOX_API_KEY;
}catch{}
const suite=safe?describe:describe.skip;
suite("Gate3 real disposable PostgreSQL unpaid abort — ZERO provider",()=>{
 it("replays exact prepared source, terminal FAILED SQL and full transaction rollback",async()=>{
   const client=new pg.Client({connectionString:raw,connectionTimeoutMillis:8000});
   await client.connect();
   const sessionId=randomUUID(),authSha256="e".repeat(64);
   const at=new Date();
   const start=new Date(at.getTime()+360_000);
   start.setMilliseconds(0);
   const scope:UnpaidPrecreateAbortScopeV39={
     sessionId,icao:"WSSS",authSha256,credits:50,seconds:600,
     startUtc:start.toISOString().replace(".000Z","Z"),
     baselineCredits:2056
   };
   await client.query("BEGIN");
   try{
     await client.query(
       `INSERT INTO clean.phase3_gate3_canary_owner_v39
         (session_id,icao,authorization_evidence_sha256,
          canary_credit_ceiling,fixed_exposure_seconds,
          created_at_utc,expires_at_utc,state)
         VALUES ($1,'WSSS',$2,50,600,$3,$4,'PREPARED')`,
       [sessionId,authSha256,at,new Date(at.getTime()+2_400_000)]);
     await client.query(
       `INSERT INTO clean.prepaid_probe_session_runtime
         (session_id,owner_kind,owner_probe_id,stage,icao,
          state,created_at_utc,expires_at_utc)
         VALUES ($1,'phase3_credit_canary',NULL,NULL,'WSSS',
                 'armed',$2,$3)`,
       [sessionId,at,new Date(at.getTime()+2_100_000)]);
     let strictAccountReads=0,commits=0;
     const evidence=await terminateUnpaidGate3PrecreateV39(scope,{
       now:()=>at,
       readSource:async()=>{
         const q=await client.query(GATE3_PRECREATE_ABORT_SOURCE_SQL_V39,[sessionId]);
         const u=await client.query(GATE3_PRIOR_OWNER_ADMISSION_SQL_V39);
         return {
           row:q.rows[0] as UnpaidPrecreateSourceV39,
           unsettled:u.rows.map(x=>({session_id:String(x.session_id),
             state:String(x.state)}))
         };
       },
       readStrictCleanBalance:async()=>{strictAccountReads++;return 2056},
       delay:async()=>undefined,
       commitFailure:async digest=>{
         commits++;
         const out=await recordGate3CanaryFailureV39(client,{
           sessionId,icao:"WSSS",authorizationEvidenceSha256:authSha256,
           failureCode:"OPERATOR_ABORTED",safeEvidenceSha256:digest
         });
         expect(out.disposition).toBe("FAILED_RECORDED");
       },
       readFailure:async()=>{
         const q=await client.query(
          `SELECT state,failure_reason,evidence_sha256 FROM
             clean.phase3_gate3_canary_owner_v39 WHERE session_id=$1::uuid`,
           [sessionId]);
         return q.rows[0];
       }
     });
     expect(evidence).toMatch(/^[a-f0-9]{64}$/);
     expect({strictAccountReads,commits}).toEqual({strictAccountReads:2,commits:1});
     const result=await client.query(
       "SELECT state,failure_reason FROM clean.phase3_gate3_canary_owner_v39 WHERE session_id=$1",
       [sessionId]);
     expect(result.rows[0]).toMatchObject({
       state:"FAILED",failure_reason:"OPERATOR_ABORTED"
     });
   }finally{
     await client.query("ROLLBACK").catch(()=>undefined);
     await client.end();
   }
 },30000);
});
