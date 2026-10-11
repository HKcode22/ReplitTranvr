import {describe,it,expect} from "vitest";
import {runP20SyntheticLocalWallclockV39}
  from "../experiments/phase2g_rehearsal/synthetic_replit_local_wallclock_v39";

async function asSynthetic<T>(work:()=>Promise<T>){
  const key="P2G_LOCAL_SYNTHETIC_ONLY";
  const saved=process.env[key];
  process.env[key]="YES";
  try{return await work();}
  finally{if(saved===undefined)delete process.env[key];
    else process.env[key]=saved;}
}
describe("P20 genuine monotonic-time LOCAL HTTP + raw fsync, not published two-hour proof",()=>{
  it("1.2s local no-provider smoke verifies original bytes and eight bins through two outages",async()=>{
    await asSynthetic(async()=>{
      const r=await runP20SyntheticLocalWallclockV39({
        durationMs:1200,sourceCount:8,keepEvidence:false
      });
      expect(r.mode).toBe("SHORT_LOCAL_SMOKE");
      expect(r.localRuntimeResult).toBe("PASS_LOCAL_ONLY");
      expect(r.elapsedSeconds).toBeGreaterThanOrEqual(1.2);
      expect(r.syntheticSenderAttempts).toBe(8);
      expect(r.syntheticSenderTimely202).toBe(8);
      expect(r.syntheticSenderFailedOrLate).toBe(0);
      expect(r.receiverUniqueOriginals).toBe(8);
      expect(r.receiverRejectedDuringOutage).toBeGreaterThanOrEqual(2);
      expect(r.sourceReceiptsVerified).toBe(8);
      expect(r.eightOriginalUtcBins).toEqual([1,1,1,1,1,1,1,1]);
      expect(r.originalSpoolAuditPassed).toBe(true);
      expect(r.allLocallySentSourcesReplayedExactly).toBe(true);
      expect(r.evidenceDirectory).toBeNull();
      expect(r.publishedHttpsIngressProven).toBe(false);
      expect(r.providerSourceIdentityAuthenticated).toBe(false);
      expect(r.scientificFlightPhysicalV2Proven).toBe(false);
      expect(r.originalProviderCreditsUsed).toBe(0);
      expect(r.productionDatabaseReadOrWrite).toBe(false);
      expect(r.liveSixPlusSixEnabled).toBe(false);
      expect(r.paidYssyGoAuthorized).toBe(false);
    });
  },15000);
  it("requires explicit P20 synthetic mode, forbids accidental invocation from the live environment",async()=>{
    const old=process.env.P2G_LOCAL_SYNTHETIC_ONLY;
    delete process.env.P2G_LOCAL_SYNTHETIC_ONLY;
    try{
      await expect(runP20SyntheticLocalWallclockV39({
        durationMs:1200,sourceCount:8
      })).rejects.toThrow("P20_EXPLICIT_LOCAL_SYNTHETIC_ONLY_REQUIRED");
    }finally{if(old!==undefined)process.env.P2G_LOCAL_SYNTHETIC_ONLY=old;}
  });
  it("refuses real paid provider API and scientific PostgreSQL binding, even if test mode is enabled",async()=>{
    await asSynthetic(async()=>{
      for(const [name,val] of [
        ["AERODATABOX_API_KEY","synthetic-placeholder-only"],
        ["V39_DATABASE_RUNTIME_URL","placeholder-no-real-url"],
        ["V39_PROVIDER_BLOB_BUCKET_ID","placeholder-bucket"],
        ["DATABASE_URL","placeholder-db"]
      ]){
        const old=process.env[name];
        process.env[name]=val;
        try{
          await expect(runP20SyntheticLocalWallclockV39({
            durationMs:1200,sourceCount:8
          })).rejects.toThrow("P20_PAID_OR_LIVE_DATABASE_OR_BLOB_ENVIRONMENT_FORBIDDEN");
        }finally{if(old===undefined)delete process.env[name];
          else process.env[name]=old;}
      }
    });
  });
  it("refuses a shortened 118-minute or arbitrary run being presented as full 120 minutes",async()=>{
    await asSynthetic(async()=>{
      for(const invalid of [
        {durationMs:7_080_000,sourceCount:120},
        {durationMs:1200,sourceCount:120},
        {durationMs:7200000,sourceCount:8}
      ]){
        await expect(runP20SyntheticLocalWallclockV39(invalid))
          .rejects.toThrow("P20_ONLY_120M_OR_SHORT_SMOKE_MODES_ALLOWED");
      }
    });
  });
});
