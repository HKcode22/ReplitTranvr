import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const path='scripts/phase5_synthetic_webhook_readonly_preflight_owner.sh';
const s=readFileSync(path,'utf8');
test('diagnostic is source-hash pinned and names every prior silent shell prerequisite',()=>{
 for(const expected of [
 '29544c30e3c9833fd85035e75999ccf2d2e021f6',
 'cbcc4783690e6e2c9acec392ac4e644392f3ac82',
 'WEBHOOK_SECRET_ENV_PRESENT',
 'WEBHOOK_SECRET_LENGTH_AT_LEAST_32',
 'RUNTIME_DATABASE_URL_ENV_PRESENT',
 'REQUIRED_PROVIDER_BLOB_MODE',
 'REPLIT_OBJECT_STORAGE_BUCKET_ENV_VALID',
 'TSX_LOCAL_EXECUTABLE_PRESENT',
 'PHASE5_SYNTHETIC_WEBHOOK_PREFLIGHT_ALL_PREDICATES_PASS_NO_POST_NO_DB_NO_PROVIDER'
 ])assert(s.includes(expected),expected);
});
test('no provider HTTP, paid account/DB action, secret value echo or synthetic POST',()=>{
 assert(!/\b(curl|wget|psql|tsx|npm|npx)\b/.test(s));
 assert(!/\bgit\s+(?:fetch|reset|clean|pull|merge|rebase|checkout|push)\b/.test(s));
 assert(!/\bgh\s+workflow\s+run\b/.test(s));
 assert(!/\becho\s+"\$AERODATABOX_WEBHOOK_SECRET"/.test(s));
 assert(s.includes("set +x"));
 assert(s.includes("if \"$@\" >/dev/null 2>&1"));
});
test('bash syntax and missing workspace must fail with a named HOLD',()=>{
 const syntax=spawnSync('bash',['-n',path],{encoding:'utf8',timeout:6000});
 assert.equal(syntax.status,0,syntax.stderr);
 const output=spawnSync('bash',[path],{encoding:'utf8',timeout:6000,
  env:{PATH:process.env.PATH,HOME:'/nonexistent-phase5-owner-workspace'}});
 assert.equal(output.status,2);
 assert.match(output.stdout,/HOLD WORKSPACE_DIRECTORY_MISSING/);
});
