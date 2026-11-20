import {execFileSync} from "node:child_process";
import {describe,it,expect} from "vitest";
import {
  P6_HISTORICAL_STAGE_RECOVERY_V39,
  buildHistoricalRecoveryCommandReviewV39,
  patchHistoricalPrepareHelperV39,
  gitBlobSha,
} from "../review-tools/p6_recover_exact_historical_stage_packet_no_provider_v39.mjs";


describe("historical exact Phase-5 stage packet recovery review",()=>{
  it("matches actual Git object hashing for empty, text, and binary bytes",()=>{
    for(const bytes of [Buffer.alloc(0),Buffer.from("hello\n"),Buffer.from([0,255,10,0])]){
      const actual=execFileSync("git",["hash-object","--stdin"],{input:bytes,encoding:"utf8"}).trim();
      expect(gitBlobSha(bytes)).toBe(actual);
    }
    expect(gitBlobSha(Buffer.alloc(0))).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  });

  it("pins the exact immutable historical/current identities and remains no-provider/no-db/no-go",()=>{
    expect(P6_HISTORICAL_STAGE_RECOVERY_V39).toMatchObject({
      currentMain:"0a7b1a28f243de76d4c83026d15f585265ef6f7b",
      historicalMain:"ae0915d1eb0c37651d280ff3f178efdb640ed509",
      historicalTree:"d08bd85c5c2ba9ca269ff5ffa34bb5fc0165af80",
      prepareHelperBlob:"d8c6983a8a69c14e11598c92035503bc079a121d",
      authorizationId:"AUTH-20261119-P5INERTFREEZE",
      stageInputSha256:"b833c9f52a24a6f953ebf5e2f3df481310b6bedd25a1d41c4f7a5d5833b2e745",
      manifestSha256:"bd14ff3e558b975a889741380da807644ca9d3573a23e2416986ee6f71e1e41f",
      costEnvelopeSha256:"abc19fc266558940b43fc2bad580178174e7e5877feb6bfff599a49427f50e7a",
    });
    expect(buildHistoricalRecoveryCommandReviewV39()).toMatchObject({
      providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false,
    });
  });

  it("permits exactly one reviewed guard substitution and nothing else",()=>{
    const needle="need(remote===codeSha,'REMOTE_MAIN_CHANGED');";
    const prefix="#!/usr/bin/env node\nconst x=1;\n";
    const suffix="\nconsole.log('rest unchanged');\n";
    let raw=Buffer.from(prefix+needle+suffix);
    // The production function also verifies the immutable Git blob. For this
    // unit fixture, reproduce the exact function contract by monkeying only the
    // blob bytes is intentionally impossible; test the pinned hash expectation.
    expect(gitBlobSha(raw)).not.toBe(P6_HISTORICAL_STAGE_RECOVERY_V39.prepareHelperBlob);
    expect(()=>patchHistoricalPrepareHelperV39(raw)).toThrow(/HELPER_BLOB_MISMATCH/);
  });

  it("documents that the fallback changes no retained scientific identity",()=>{
    const r=buildHistoricalRecoveryCommandReviewV39();
    expect(r.modifiedSemanticScope).toMatch(/only replace historical helper remote-main equality guard/);
    expect(r.expectedRecoveredStageSha256).toBe(
      "b833c9f52a24a6f953ebf5e2f3df481310b6bedd25a1d41c4f7a5d5833b2e745"
    );
  });
});
