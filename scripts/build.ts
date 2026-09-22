import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile } from "fs/promises";
import { execFileSync } from "child_process";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

function resolveBuildGitHead(): string {
  const explicit = String(process.env.V39_BUILD_GIT_HEAD ?? "").trim().toLowerCase();
  if (/^[a-f0-9]{40}$/.test(explicit)) return explicit;
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().toLowerCase();
    if (/^[a-f0-9]{40}$/.test(head)) return head;
  } catch {}
  throw new Error("V39_BUILD_GIT_HEAD_UNRESOLVED");
}

async function buildAll() {
  const buildGitHead = resolveBuildGitHead();
  console.log(`V39 build git head: ${buildGitHead}`);
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.mjs",
    banner: {
      js: 'import { createRequire } from "module"; import { fileURLToPath as __esm_fileURLToPath } from "url"; import { dirname as __esm_dirname } from "path"; const require = createRequire(import.meta.url); const __filename = __esm_fileURLToPath(import.meta.url); const __dirname = __esm_dirname(__filename);',
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      "process.env.V39_DEPLOYED_GIT_HEAD": JSON.stringify(buildGitHead),
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  await writeFile("dist/index.cjs", 'import("./index.mjs");\n');
  await writeFile(
    "dist/v39-build-meta.json",
    JSON.stringify({ schema: "v39.build-meta.v1", git_head: buildGitHead }, null, 2) + "\n",
  );
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
