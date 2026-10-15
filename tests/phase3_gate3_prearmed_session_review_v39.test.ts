import {randomUUID} from "node:crypto";
import {describe,expect,it} from "vitest";
import pg from "pg";
import {reviewGate3PreparedSessionV39} from
  "../server/lib/disruption/gate3PreparedSessionReview_v39";

const sha="b".repeat(64);
const expected=(id=randomUUID())=>({
  sessionId:id,icao:"YSSY",authorizationEvidenceSha256:sha,
  canaryCreditCeiling:20,fixedExposureSeconds:300,
});
describe("Gate3 read-only prearmed session shape",()=>{
  it("rejects malformed owner scope BEFORE any SQL read",async()=>{
    let calls=0;
    const fake={query:async()=>{calls++;throw Error("DB_CALL_NEVER_EXPECTED");}};
    await expect(reviewGate3PreparedSessionV39(fake as any,{
      ...expected(),authorizationEvidenceSha256:"hash-only",
    })).rejects.toThrow("GATE3_PREARM_REVIEW_INPUT_INVALID");
    await expect(reviewGate3PreparedSessionV39(fake as any,{
      ...expected(),canaryCreditCeiling:1900,
    })).rejects.toThrow("GATE3_PREARM_REVIEW_INPUT_INVALID");
    expect(calls).toBe(0);
  });
  it("does not mistake a correct-looking row shape for PAID authorization",async()=>{
    const spec=expected();
    const now=new Date();
    const query=async()=>({rowCount:1,rows:[{
      session_id:spec.sessionId,icao:"YSSY",
      authorization_evidence_sha256:sha,
      canary_credit_ceiling:20,fixed_exposure_seconds:300,
      durable_state:"PREPARED",durable_expires:new Date(now.getTime()+60_000),
      owner_kind:"phase3_credit_canary",owner_probe_id:null,stage:null,
      session_icao:"YSSY",runtime_state:"armed",
      runtime_expires:new Date(now.getTime()+60_000),
      subscription_bound:false,
      callback_requests_seen:0,callback_success_2xx:0,callback_failures:0,
      prepared_owner_count:1,
    }]});
    const v=await reviewGate3PreparedSessionV39({query} as any,{...spec,nowUtc:now});
    expect(v).toMatchObject({
      status:"OFFLINE_SOURCE_SHAPE_VALID",reasons:[],
      signedAuthorizationVerifiedHere:false,livePublishedReceiverVerified:false,
      realProviderAccountVerified:false,
      providerCalls:0,databaseMutations:0,authorizedPaidCanary:false,
    });
  });
  it("rejects a LOGGED owner with lost UNLOGGED session; never auto-rearms",async()=>{
    const query=async()=>({rowCount:1,rows:[{
      icao:"YSSY",authorization_evidence_sha256:sha,
      canary_credit_ceiling:20,fixed_exposure_seconds:300,
      durable_state:"PREPARED",durable_expires:new Date(Date.now()+30_000),
      owner_kind:null,owner_probe_id:null,stage:null,session_icao:null,
      runtime_state:null,runtime_expires:null,subscription_bound:false,
      callback_requests_seen:null,callback_success_2xx:null,
      callback_failures:null,prepared_owner_count:1,
    }]});
    const v=await reviewGate3PreparedSessionV39({query} as any,expected());
    expect(v.status).toBe("HOLD");
    expect(v.reasons).toContain("PREPAID_SESSION_ABSENT_OR_WRONG_OWNER_STATE");
    expect(v.reasons).toContain("PREPAID_RUNTIME_SESSION_EXPIRED_OR_DISAGREES");
  });
});
const url=process.env.DATABASE_URL??"";
let local=false;
try{
  const u=new URL(url);
  local=process.env.GITHUB_ACTIONS==="true" &&
    ["localhost","127.0.0.1"].includes(u.hostname) &&
    u.pathname==="/v39_ci" && !process.env.AERODATABOX_API_KEY;
}catch{}
const pgSuite=local?describe:describe.skip;
pgSuite("Gate3 read-only prearmed session in disposable PostgreSQL",()=>{
  it("reviews exact source snapshot and fails closed when terminal, with zero provider calls",async()=>{
    const client=new pg.Client({connectionString:url,connectionTimeoutMillis:8000});
    await client.connect();
    const spec=expected();
    try{
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO clean.phase3_gate3_canary_owner_v39
          (session_id,icao,authorization_evidence_sha256,
           canary_credit_ceiling,fixed_exposure_seconds,expires_at_utc)
        VALUES ($1,'YSSY',$2,20,300,now()+interval '60 minutes')`,
        [spec.sessionId,sha],
      );
      await client.query(
        `INSERT INTO clean.prepaid_probe_session_runtime
          (session_id,owner_kind,icao,state,expires_at_utc)
        VALUES ($1,'phase3_credit_canary','YSSY','armed',
          now()+interval '30 minutes')`,[spec.sessionId],
      );
      const good=await reviewGate3PreparedSessionV39(client,spec);
      expect(good).toMatchObject({
        status:"OFFLINE_SOURCE_SHAPE_VALID",
        authorizedPaidCanary:false,providerCalls:0,databaseMutations:0,
      });
      const badHash=await reviewGate3PreparedSessionV39(client,{
        ...spec,authorizationEvidenceSha256:"a".repeat(64),
      });
      expect(badHash.reasons).toContain("DURABLE_SCOPE_OR_AUTH_HASH_DOES_NOT_MATCH");
      await client.query(
        `UPDATE clean.phase3_gate3_canary_owner_v39
           SET state='FAILED',failure_reason='synthetic_review_test_end',
               terminal_at_utc=now(),evidence_sha256=$2
          WHERE session_id=$1`,[spec.sessionId,"c".repeat(64)],
      );
      const after=await reviewGate3PreparedSessionV39(client,spec);
      expect(after.reasons).toContain("DURABLE_OWNER_NOT_PREPARED");
    }finally{
      await client.query("ROLLBACK").catch(()=>undefined);
      await client.end();
    }
  },30000);
});
