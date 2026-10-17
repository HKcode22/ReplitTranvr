import {describe,expect,it} from "vitest";
import pg from "pg";
import {
  prepareGate3CanaryDraftV39,validateGate3DraftPreparationV39,
  GATE3_PRIOR_OWNER_ADMISSION_SQL_V39,
} from "../server/lib/disruption/gate3PrepaidCanaryPreparation_v39";
const sha="a".repeat(64);
const base=()=>({
  icao:"YSSY",authorizationEvidenceSha256:sha,
  canaryCreditCeiling:20,fixedExposureSeconds:300,
  nowUtc:new Date("2026-10-14T12:00:00.000Z"),
});
describe("Gate3 draft canary preparation never grants paid provider authority",()=>{
  it("refuses unverified shape and too-large future canary, without DB connection",()=>{
    for(const patch of [
      {icao:"yssy"},{icao:"AB1D"},
      {authorizationEvidenceSha256:"hash-no-auth"},
      {canaryCreditCeiling:0},{canaryCreditCeiling:101},
      {canaryCreditCeiling:NaN},{canaryCreditCeiling:"10"},
      {fixedExposureSeconds:0},{fixedExposureSeconds:3601},
      {fixedExposureSeconds:0.5},
      {nowUtc:new Date("invalid")},
    ]){
      expect(()=>validateGate3DraftPreparationV39({...base(),...patch} as any)).toThrow();
    }
    expect(()=>validateGate3DraftPreparationV39(base())).not.toThrow();
  });
});
// Real SQL negative integration requires GitHub Actions disposable /v39_ci.
// Never connects to production or to user-supplied DATABASE_URL host.
let local=false;
const url=process.env.DATABASE_URL??"";
try{
  const u=new URL(url);
  local=process.env.GITHUB_ACTIONS==="true" &&
    (u.hostname==="localhost"||u.hostname==="127.0.0.1") &&
    u.pathname==="/v39_ci" &&
    !process.env.AERODATABOX_API_KEY;
}catch{}
const pgSuite=local?describe:describe.skip;
pgSuite("Gate3 draft preparation durable atomic source in disposable PG",()=>{
  it("creates same-ID logged owner and unlogged session and refuses repeated arm",async()=>{
    const client=new pg.Client({connectionString:url,connectionTimeoutMillis:8000});
    await client.connect();
    let preparedSessionId:string|null=null;
    try{
      const input={...base(),nowUtc:new Date()};
      // Disposable CI shares one PostgreSQL database among real-PG suites.
      // Other tests intentionally COMMIT immutable FAILED incident receipts.
      // That is exactly what this new production admission protection must
      // reject. A failed provider account is not disposable just because
      // another test wants a fresh PREPARED row.
      const blockers=await client.query(GATE3_PRIOR_OWNER_ADMISSION_SQL_V39);
      if(blockers.rowCount){
        const expected=blockers.rows[0]?.state==="FAILED"
          ?"GATE3_PREPARE_PRIOR_UNRESOLVED_ACCOUNT_FAILURE_HOLD"
          :"GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD";
        await expect(prepareGate3CanaryDraftV39(client,input))
          .rejects.toThrow(expected);
        return; // exact PG owner/runtime pairing has separate ROLLBACK fixture
      }
      let created;
      try {
        created=await prepareGate3CanaryDraftV39(client,input);
      } catch(err){
        // Another CI test can finish a FAILED receipt after our first read.
        if(err instanceof Error &&
           (err.message==="GATE3_PREPARE_PRIOR_UNRESOLVED_ACCOUNT_FAILURE_HOLD"||
            err.message==="GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD"))
          return;
        throw err;
      }
      preparedSessionId=created.sessionId;
      expect(created).toMatchObject({
        icao:"YSSY",state:"PREPARED",runtimeState:"armed",
        canaryCreditCeiling:20,fixedExposureSeconds:300,
        approvalVerifiedHere:false,authorizedPaidProviderCalls:false,
      });
      const q=await client.query(
        `SELECT a.authorization_evidence_sha256,a.canary_credit_ceiling,
                a.state AS durable_state,s.owner_kind,s.owner_probe_id,
                s.stage,s.icao,s.state AS runtime_state
           FROM clean.phase3_gate3_canary_owner_v39 a
           JOIN clean.prepaid_probe_session_runtime s
             ON a.session_id=s.session_id
          WHERE a.session_id=$1`,[created.sessionId],
      );
      expect(q.rows).toHaveLength(1);
      expect(q.rows[0]).toMatchObject({
        authorization_evidence_sha256:sha,canary_credit_ceiling:20,
        durable_state:"PREPARED",owner_kind:"phase3_credit_canary",
        owner_probe_id:null,stage:null,icao:"YSSY",runtime_state:"armed",
      });
      await expect(prepareGate3CanaryDraftV39(client,input))
        .rejects.toThrow("GATE3_PREPARE_PRIOR_UNSETTLED_OWNER_HOLD");
      const preserved=await client.query(
        "SELECT count(*)::int AS n FROM clean.phase3_gate3_canary_owner_v39 WHERE state='PREPARED'",
      );
      expect(preserved.rows[0].n).toBe(1);
      // Keep the immutable audit trail but terminalize this synthetic
      // canary, so the second offline/full CI pass can start from a clean
      // operator-admission state. Never DELETE a real source/owner.
    }finally {
      if(preparedSessionId){
        await client.query(
          `UPDATE clean.phase3_gate3_canary_owner_v39
              SET state='FAILED',failure_reason='synthetic_disposable_test_end',
                  evidence_sha256=$2,terminal_at_utc=now()
            WHERE session_id=$1 AND state='PREPARED'`,
          [preparedSessionId,"f".repeat(64)],
        ).catch(()=>undefined);
      }
      await client.end();
    }
  },30000);
});
