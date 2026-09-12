/** V3.9 prerequisite-P security/retention verifier. */
import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import {
  RETENTION_SURFACES,
  checkLeastPrivilege,
  checkWebhookSecurity,
  executeRetentionDryRun,
  type DatabaseRoleEvidence,
  type RetentionAdapters,
  type WebhookSecurityEvidence,
} from "../server/lib/disruption/retentionSecurity_v39";

interface Check { name:string; pass:boolean; detail:string }
type SurfaceState="DEPLOYED"|"NOT_DEPLOYED"|"UNKNOWN";
interface RetentionDeploymentEvidence { surfaces: Record<string, SurfaceState> }
function parseEvidence<T>(name:string):T|null{const raw=process.env[name];if(!raw)return null;try{return JSON.parse(raw) as T}catch{return null}}

async function verifyRoleLive(role:string):Promise<string[]>{
  const failures:string[]=[],ownerUrl=process.env.DATABASE_URL;if(!ownerUrl)return["no-owner-DATABASE_URL-for-live-check"];
  const owner=new Pool({connectionString:ownerUrl});
  try{
    const attr=await owner.query("SELECT rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles WHERE rolname=$1",[role]);
    if(!attr.rowCount)return[`role-missing:${role}`];const a=attr.rows[0];if(a.rolsuper)failures.push("role-is-superuser");if(a.rolcreatedb)failures.push("role-can-createdb");if(a.rolcreaterole)failures.push("role-can-createrole");if(!a.rolcanlogin)failures.push("role-cannot-login");
    const grants=await owner.query(`SELECT table_schema s, table_name t,string_agg(DISTINCT privilege_type,',' ORDER BY privilege_type) p FROM information_schema.role_table_grants WHERE grantee=$1 GROUP BY 1,2`,[role]);
    const allowed=new Set(["SELECT","INSERT","UPDATE","DELETE"]);if(!grants.rows.length)failures.push("role-has-no-table-grants");
    for(const r of grants.rows){if(r.s!=="clean")failures.push(`grant-outside-clean:${r.s}.${r.t}`);for(const p of String(r.p).split(","))if(!allowed.has(p))failures.push(`excess-privilege:${p}@${r.s}.${r.t}`)}
    if(!ownerUrl.includes("sslmode="))failures.push("owner-url-missing-sslmode");
    const tomb=await owner.query("SELECT to_regclass('clean.retention_tombstone') AS c");if(tomb.rows[0]?.c!=="clean.retention_tombstone")failures.push("tombstone-audit-table-missing");
  }catch(err:any){failures.push(`live-check-error:${err?.message??err}`)}finally{await owner.end().catch(()=>undefined)}return failures;
}

async function verifyWebhookLive(e:WebhookSecurityEvidence):Promise<string[]>{
  const f:string[]=[];const secret=process.env.AERODATABOX_WEBHOOK_SECRET;if(!secret||secret.length<32)f.push("webhook-secret-missing-or-short");
  try{const {defaultWebhookUrl}=await import("../server/lib/disruption/aerodataboxLimiter_v3");const url=defaultWebhookUrl();if(!url.startsWith("https://"))f.push("runtime-webhook-url-not-https");if(!/\/api\/v1\/webhooks\/aerodatabox\/.+/.test(url))f.push("runtime-webhook-url-missing-secret-path");if(new URL(e.url).host!==new URL(url).host)f.push("evidence-host-mismatch")}catch(err:any){f.push(`webhook-runtime-check:${err?.message??err}`)}
  try{const routes=readFileSync(join(process.cwd(),"server","routes_v3.ts"),"utf8");if(!routes.includes("req.params.secret")||!routes.includes("webhookSecret()"))f.push("ingress-secret-enforcement-missing");const raw=readFileSync(join(process.cwd(),"server","lib","disruption","rawIngress_v3.ts"),"utf8");if(!raw.includes("ON CONFLICT (delivery_id) DO NOTHING"))f.push("replay-idempotency-missing")}catch(err:any){f.push(`code-check:${err?.message??err}`)}return f;
}

async function verifyRetentionSurfaces(e:RetentionDeploymentEvidence|null):Promise<Check>{
  if(!e)return{name:"retention-deployment-surfaces",pass:false,detail:"missing-V39_RETENTION_DEPLOYMENT_EVIDENCE"};
  const unknown=RETENTION_SURFACES.filter(s=>!e.surfaces?.[s]||e.surfaces[s]==="UNKNOWN");if(unknown.length)return{name:"retention-deployment-surfaces",pass:false,detail:`UNKNOWN surfaces: ${unknown.join(",")}`};
  // A configured production database means the primary storage surface exists;
  // calling it NOT_DEPLOYED is an invalid evidence claim, not a safe default.
  if(process.env.DATABASE_URL && e.surfaces.primary!=="DEPLOYED"){
    return{name:"retention-deployment-surfaces",pass:false,detail:"primary database is configured but evidence does not declare primary=DEPLOYED"};
  }
  const deployed=RETENTION_SURFACES.filter(s=>e.surfaces[s]==="DEPLOYED");
  // This verifier currently has a real adapter only for primary PostgreSQL.
  // Declared deployed replica/backup/object/log surfaces remain BLOCKED until a
  // real deletion/expiry verifier exists for that surface.
  const unsupported=deployed.filter(s=>s!=="primary");if(unsupported.length)return{name:"retention-deployment-surfaces",pass:false,detail:`real adapter missing for DEPLOYED surfaces: ${unsupported.join(",")}`};
  if(e.surfaces.primary==="DEPLOYED"){
    try{
      const {v39Pool:pool}=await import("../server/lib/disruption/db_v39");const tomb=await pool.query(`SELECT surface,record_id,content_hash,expired_at FROM clean.retention_tombstone WHERE expired_at<=now() ORDER BY expired_at ASC`);
      const primary={listExpired:async()=>(tomb.rows as any[]).map(r=>({id:`${r.surface}:${r.record_id}`,contentHash:r.content_hash,expiresAt:new Date(r.expired_at).toISOString(),containsRawContent:false}))};
      const dry=await executeRetentionDryRun({primary} as unknown as RetentionAdapters,new Date().toISOString(),true);
      if(!/^[a-f0-9]{64}$/.test(dry.evidenceHash))throw new Error("invalid dry-run evidence hash");
      return{name:"retention-deployment-surfaces",pass:true,detail:`primary real dry-run evidence=${dry.evidenceHash}; other surfaces explicitly NOT_DEPLOYED`};
    }catch(err:any){return{name:"retention-deployment-surfaces",pass:false,detail:`primary real adapter failed:${err?.message??err}`};}
  }
  return{name:"retention-deployment-surfaces",pass:false,detail:"primary storage surface not verified"};
}

async function main(){
  const checks:Check[]=[];const db=parseEvidence<DatabaseRoleEvidence>("V39_DB_ROLE_EVIDENCE");
  if(!db)checks.push({name:"least-privilege-db-tls",pass:false,detail:"missing-V39_DB_ROLE_EVIDENCE"});else{const s=checkLeastPrivilege(db),l=await verifyRoleLive(db.role),all=[...s.failures,...l];checks.push({name:"least-privilege-db-tls",pass:!all.length,detail:all.join(",")||`role=${db.role} live-verified`})}
  const web=parseEvidence<WebhookSecurityEvidence>("V39_WEBHOOK_SECURITY_EVIDENCE");
  if(!web)checks.push({name:"webhook-tls-auth-replay",pass:false,detail:"missing-V39_WEBHOOK_SECURITY_EVIDENCE"});else{const s=checkWebhookSecurity(web),l=await verifyWebhookLive(web),all=[...s.failures,...l];checks.push({name:"webhook-tls-auth-replay",pass:!all.length,detail:all.join(",")||"runtime ingress verified"})}
  checks.push(await verifyRetentionSurfaces(parseEvidence<RetentionDeploymentEvidence>("V39_RETENTION_DEPLOYMENT_EVIDENCE")));
  try {
    const { RETENTION_MATRIX_HASH, parseRetentionMatrixEvidence, resolveRetentionMatrix, verifyRetentionMatrix } = await import("../server/lib/disruption/retentionMatrix_v39");
    const overlayRaw = process.env.V39_RETENTION_MATRIX_EVIDENCE;
    if (!overlayRaw) {
      const verdict = verifyRetentionMatrix();
      checks.push({ name: "retention-content-matrix", pass: false, detail: `missing-V39_RETENTION_MATRIX_EVIDENCE;${verdict.failures.slice(0, 2).join(",")}` });
    } else {
      const { rows, failures } = resolveRetentionMatrix(parseRetentionMatrixEvidence(overlayRaw));
      const verdict = verifyRetentionMatrix(rows);
      const all = [...failures, ...verdict.failures];
      checks.push({ name: "retention-content-matrix", pass: all.length === 0, detail: all.length === 0 ? `matrix=${RETENTION_MATRIX_HASH.slice(0, 12)}… verified` : all.slice(0, 5).join(",") });
    }
  } catch (err: any) { checks.push({ name: "retention-content-matrix", pass: false, detail: `matrix-check-error:${err?.message ?? err}` }); }
  try{const {v39Pool:pool}=await import("../server/lib/disruption/db_v39");await pool.query("SELECT 1 FROM clean.adb_incident_stop WHERE resolved=false LIMIT 1");const c=readFileSync(join(process.cwd(),"server","lib","disruption","adbCollectionController_v3.ts"),"utf8");checks.push({name:"incident-stop-refusal",pass:c.includes("clean.adb_incident_stop")&&c.includes("REFUSED_INCIDENT_STOP"),detail:"persistent incident admission source inspected"})}catch(err:any){checks.push({name:"incident-stop-refusal",pass:false,detail:`${err?.message??err}`})}
  for(const c of checks)console.log(`[${c.pass?"PASS":"BLOCKED"}] ${c.name} - ${c.detail}`);
  const pass=checks.length>0&&checks.every(c=>c.pass);
  console.log(`[${pass?"PASS":"BLOCKED"}] PREPAID_SECURITY_RETENTION - ${pass?"prerequisite P evidence is complete for the verified runtime":"one or more prerequisite-P checks remain unresolved"}`);
  if(!pass)process.exitCode=1;
}
void main();
