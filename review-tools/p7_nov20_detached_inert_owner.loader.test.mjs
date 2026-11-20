import {loadExactInertImplementation,P7_DETACHED_PINS as pins} from "./p7_nov20_detached_inert_owner.mjs";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
assert.equal(execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),pins.HEAD);
assert.equal(process.env.GITHUB_ACTIONS,"true");
for(const k of ["DATABASE_URL","AERODATABOX_API_KEY","RAPIDAPI_KEY"])assert.equal(process.env[k]??"","");
const m=await loadExactInertImplementation(process.cwd());
assert.equal(typeof m.Pool,"function");assert.equal(typeof m.installP7InertStorage,"function");assert.equal(typeof m.inspectP7InertStorage,"function");
console.log("P7_EXACT_PINNED_TSX_LOADER_AND_3_SQL_BLOBS_NO_PROVIDER_NO_DB");
