import {createHmac} from "node:crypto";
import {describe,it,expect,vi} from "vitest";
import {verifyReadOnlyDbLivePreflightV39} from "../server/lib/disruption/phase2gDbLivePreflight_v39";
import {verifyStage1PublishedDatabaseLiveV39} from "../scripts/phase2gStage1PublishedDatabaseLivePreflight_v39";

const dbUrl="postgresql://offline-only.invalid/not-a-real-database";
const challenge="phase2g-stage1-db-live-00000000-0000-4000-8000-000000000001";
const proof=createHmac("sha256",dbUrl).update("phase2g-db-live-preflight:"+challenge).digest("hex");
const input=(selectOne:()=>Promise<{rows:Array<{connected:unknown}>}>)=>({
  runtimeUrl:dbUrl,challenge,suppliedProof:proof,selectOne
});
const selectOK=async()=>({rows:[{connected:1}]});
const fakeAnswer={
  schema:"v39.phase2g-db-live-preflight.v1",status:"PASS",
  database_connection_verified:true,provider_call:false,
  provider_mutation:false,database_mutation:false,alert_credits_spent:0
};

describe("P2G24 PRIMARY prevention: HMAC-gated actual DB connection before paid Stage1",()=>{
  it("valid challenge only passes AFTER actual read-only SQL returns SELECT 1",async()=>{
    const select=vi.fn(selectOK);
    const response=await verifyReadOnlyDbLivePreflightV39(input(select));
    expect(response.http).toBe(200);
    expect(response.body).toMatchObject(fakeAnswer);
    expect(select).toHaveBeenCalledOnce();
  });
  it("wrong proof or malformed challenge refuses request BEFORE ANY database query",async()=>{
    const select=vi.fn(selectOK);
    expect((await verifyReadOnlyDbLivePreflightV39({...input(select),suppliedProof:"f".repeat(64)})).http).toBe(404);
    expect((await verifyReadOnlyDbLivePreflightV39({...input(select),challenge:"wrong"})).http).toBe(404);
    expect(select).not.toHaveBeenCalled();
  });
  it("missing configured runtime database URL fails closed without DB query",async()=>{
    const select=vi.fn(selectOK);
    expect((await verifyReadOnlyDbLivePreflightV39({...input(select),runtimeUrl:""})).http).toBe(503);
    expect(select).not.toHaveBeenCalled();
  });
  it("database refused connection or query returned non-one fails closed",async()=>{
    const offline=await verifyReadOnlyDbLivePreflightV39(input(async()=>{
      throw Error("not-a-real-db-secret-connection-error");
    }));
    expect(offline.http).toBe(503);
    expect(JSON.stringify(offline)).not.toContain("not-a-real-db-secret");
    const wrong=await verifyReadOnlyDbLivePreflightV39(input(async()=>({rows:[{connected:0}]})));
    expect(wrong.http).toBe(503);
  });
  it("supervisor client signs proof for published route and accepts only exact PASS schema",async()=>{
    const requests:string[]=[];
    const fetchStub=vi.fn(async(url:string|URL|Request,options?:RequestInit)=>{
      requests.push(String(url));
      expect(options?.method).toBe("POST");
      const headers=options?.headers as Record<string,string>;
      const nonce=headers["x-v39-phase2g-db-live-challenge"];
      expect(headers["x-v39-phase2g-db-live-proof"]).toBe(
        createHmac("sha256",dbUrl).update("phase2g-db-live-preflight:"+nonce).digest("hex")
      );
      expect(options?.signal).toBeTruthy();
      return {status:200,json:async()=>fakeAnswer} as Response;
    }) as unknown as typeof fetch;
    const answer=await verifyStage1PublishedDatabaseLiveV39({
      base:"https://offline-only.invalid",githubRuntimeDbUrl:dbUrl,
      fetchImpl:fetchStub,nonce:"00000000-0000-4000-8000-000000000001"
    });
    expect(answer).toMatchObject({healthy:true,check:"runtime_db_connection",reason:"ok"});
    expect(requests).toEqual(["https://offline-only.invalid/__v39/phase2g/db-live-preflight"]);
  });
  it("supervisor refuses HTTP 503 despite correct binding URL",async()=>{
    const fetchStub=vi.fn(async()=>({status:503,json:async()=>({
      ...fakeAnswer,status:"FAIL",database_connection_verified:false
    })})) as unknown as typeof fetch;
    const a=await verifyStage1PublishedDatabaseLiveV39({
      base:"https://offline-only.invalid",githubRuntimeDbUrl:dbUrl,fetchImpl:fetchStub
    });
    expect(a.healthy).toBe(false);
    expect(a.reason).toBe("database_not_connected");
  });
  it("supervisor rejects false-positive HTTP 200 with no proof of SQL SELECT",async()=>{
    const fetchStub=vi.fn(async()=>({status:200,json:async()=>({
      ...fakeAnswer,database_connection_verified:false
    })})) as unknown as typeof fetch;
    const a=await verifyStage1PublishedDatabaseLiveV39({
      base:"https://offline-only.invalid",githubRuntimeDbUrl:dbUrl,fetchImpl:fetchStub
    });
    expect(a.healthy).toBe(false);
  });
  it("supervisor refuses network failure and missing database URL",async()=>{
    const fetchStub=vi.fn(async()=>{throw Error("network unavailable")}) as unknown as typeof fetch;
    const x=await verifyStage1PublishedDatabaseLiveV39({
      base:"https://offline-only.invalid",githubRuntimeDbUrl:dbUrl,fetchImpl:fetchStub
    });
    expect(x).toMatchObject({healthy:false,reason:"network_or_timeout"});
    const y=await verifyStage1PublishedDatabaseLiveV39({
      base:"https://offline-only.invalid",githubRuntimeDbUrl:"",fetchImpl:fetchStub
    });
    expect(y).toMatchObject({healthy:false,reason:"missing_github_db_environment"});
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });
});
