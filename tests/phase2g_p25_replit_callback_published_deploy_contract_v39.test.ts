import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const deployment=readFileSync(".replit","utf8");
const build=readFileSync("scripts/build.ts","utf8");
const callback=readFileSync("server/phase2gCallbackOnly.ts","utf8");
const general=readFileSync("server/index.ts","utf8");
const hook=readFileSync("scripts/post-merge.sh","utf8");

describe("P25 Replit published callback release configuration",()=>{
 it("preserves callback-only deployment flags with a verified-source build",()=>{
  const section=deployment.match(/\[deployment\]\n([\s\S]*?)(?=\n\[|$)/)?.[1]??"";
  expect(section).toContain('deploymentTarget = "autoscale"');
  // Reviewer-pinned NEXT2 build wrapper performs the same callback-only build
  // only after verifying runtime content and preserving snapshot provenance.
  expect(section).toContain('build = ["bash", "scripts/v39_gate4_reviewed_source_build_v39.sh"]');
  const wrapper=readFileSync("scripts/v39_gate4_reviewed_source_build_v39.sh","utf8");
  expect(wrapper).toContain('V39_CALLBACK_ONLY_BUILD=1 V39_BUILD_GIT_HEAD="$PIN" npm run build');
  expect(wrapper).toContain('git diff --quiet "$PIN" HEAD');
  expect(section).toContain('run = ["env", "V39_CALLBACK_ONLY_RUNTIME=1", "V39_WORKSPACE_RUNTIME_OWNER_MODE=replit-published-deployment", "V39_RUNTIME_DURABILITY_CLASS=autoscale", "V39_GATE05_DURABLE_CUSTODY_REQUIRED=1", "node", "dist/index.mjs"]');
  expect(section).not.toContain('run = ["env", "V39_WORKSPACE_RUNTIME_OWNER_MODE=');
  expect(wrapper).toContain('git show "$PIN:.replit"');
  expect(wrapper).toContain("cmp -s - .replit");
  expect(deployment).toContain('V39_PROVIDER_BLOB_BUCKET_ID = "replit-objstore-5aa4d2c4-399b-4933-9acf-0292f79d6d59"');
  expect(deployment).toContain('defaultBucketID = "replit-objstore-5aa4d2c4-399b-4933-9acf-0292f79d6d59"');
  expect(deployment).not.toContain('replit-objstore-89d08290-bfed-4ba9-ab3a-517a47e8095f');
  expect(deployment).not.toContain('https://travnr.com');
 });
 it("build entry is callback-only and refuses wrong runtime executable",()=>{
  expect(build).toContain('process.env.V39_CALLBACK_ONLY_BUILD === "1"');
  expect(build).toContain('callbackOnlyBuild ? "server/phase2gCallbackOnly.ts" : "server/index.ts"');
  expect(build).toContain('"process.env.V39_DEPLOYED_GIT_HEAD"');
  expect(callback).toContain('if (process.env.V39_CALLBACK_ONLY_RUNTIME !== "1")');
  expect(callback).toContain('AUTO_COLLECTION_MUST_BE_DISABLED');
  expect(callback).toContain('BOOT_MIGRATIONS=DISABLED');
  expect(general).toContain('REFUSED:FULL_APP_BINARY_IN_CALLBACK_ONLY_MODE');
 });
 it("Replit postMerge never does surprise forced migrations or database pushes",()=>{
  expect(deployment).not.toContain("[postMerge]");
  expect(hook).toContain("set -Eeuo pipefail");
  expect(hook).toContain("npm ci --no-audit --no-fund");
  expect(hook).toContain("P25_POSTMERGE_DATABASE_MUTATIONS=ZERO");
  expect(hook).not.toMatch(/\b(?:drizzle|prisma|psql|knex|sequelize|migrate|db:push)\b\s+(?:--force|apply|up|push)?/i);
  expect(hook).not.toContain("db:push");
  expect(hook).not.toContain("DATABASE_URL");
 });
});
