import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

const deployment=readFileSync(".replit","utf8");
const build=readFileSync("scripts/build.ts","utf8");
const callback=readFileSync("server/phase2gCallbackOnly.ts","utf8");
const general=readFileSync("server/index.ts","utf8");
const hook=readFileSync("scripts/post-merge.sh","utf8");

describe("P25 Replit published callback release configuration",()=>{
 it("restores BOTH exact documented original callback-only deployment flags",()=>{
  const section=deployment.match(/\[deployment\]\n([\s\S]*?)(?=\n\[|$)/)?.[1]??"";
  expect(section).toContain('deploymentTarget = "autoscale"');
  expect(section).toContain('build = ["env", "V39_CALLBACK_ONLY_BUILD=1", "npm", "run", "build"]');
  expect(section).toContain('run = ["env", "V39_CALLBACK_ONLY_RUNTIME=1", "V39_WORKSPACE_RUNTIME_OWNER_MODE=replit-published-deployment", "V39_RUNTIME_DURABILITY_CLASS=autoscale", "node", "dist/index.mjs"]');
  expect(section).not.toContain('run = ["env", "V39_WORKSPACE_RUNTIME_OWNER_MODE=');
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
  expect(deployment).toContain('path = "scripts/post-merge.sh"');
  expect(hook).toContain("set -Eeuo pipefail");
  expect(hook).toContain("npm ci --no-audit --no-fund");
  expect(hook).toContain("P25_POSTMERGE_DATABASE_MUTATIONS=ZERO");
  expect(hook).not.toMatch(/\b(?:drizzle|prisma|psql|knex|sequelize|migrate|db:push)\b\s+(?:--force|apply|up|push)?/i);
  expect(hook).not.toContain("db:push");
  expect(hook).not.toContain("DATABASE_URL");
 });
});
