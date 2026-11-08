import {describe,it,expect} from "vitest";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

/**
 * Vitest is configured to discover .test.ts files, not pure Node .test.mjs;
 * evidence tests would otherwise be silently skipped by v39:test:full.
 * Run exact source tests as a subprocess in a discovered Vitest test.
 */
const root=fileURLToPath(new URL("../",import.meta.url));
describe("actual B0062 four-HUB owner-frame provenance/release boundary",()=>{
 it("executes both real Node test files, not just green CI with zero tests",()=>{
  const files=[
   "tests/phase5_owner_four_anchor_frame_readonly_v39.test.mjs",
   "tests/phase5_four_hub_real_frame_evidence_binding_v39.test.mjs"
  ];
  const p=spawnSync(process.execPath,["--test",...files],{
   cwd:root,encoding:"utf8",timeout:30000,maxBuffer:1024*1024,
   env:{PATH:process.env.PATH??"",NODE_ENV:"test"}
  });
  const diagnostic="node exit="+p.status+"; signal="+p.signal+
   "\nstdout:\n"+p.stdout+"\nstderr:\n"+p.stderr;
  expect(p.status,diagnostic).toBe(0);
  expect(p.stdout).toMatch(/tests\s+[1-9]\d*/);
  expect(p.stdout).toContain("fail 0");
 });
});
