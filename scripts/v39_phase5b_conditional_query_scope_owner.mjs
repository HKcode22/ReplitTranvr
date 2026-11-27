/** Count-only prospective query instruction scope audit, not a signer or
 * provider read. Never returns packet bytes, digests, routes or flight data.
 * Uses the exact active manifest and existing private packet custody; no
 * expired packet payload is read. Independent runtime signature and policy
 * admission still required. Day 3/4 only, at most 576 prepared queries. */
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const hold=x=>{throw Error("HOLD_P6_CONDITIONAL_QUERY_SCOPE_"+x)};
const iso=x=>typeof x==="string"&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const utc=x=>x instanceof Date?x.toISOString():x;
const horizons=["T-24h","T-6h","T-90m"];
const exactDays=[3,4];
const statuses=["LIVE_PACKET_UNAVAILABLE","PACKET_LEDGER_PARITY_UNVERIFIED","NO_CONDITIONAL_SOURCE_MARKER","CONDITIONAL_MARKER_INVALID","CONDITIONAL_MARKER_CLOCK_AND_SHAPE_MATCH_NOT_SIGNATURE_PROOF"];
export function classifyP6ConditionalQueryMarker(r){
 if(r.packet_present!==true)return statuses[0];
 if(r.packet_scope_match!==true||r.content_hash_match!==true||
   !iso(r.planned_utc)||!iso(r.cohort_utc)||!iso(r.packet_reviewed_utc)||
   r.packet_planned_utc!==r.planned_utc||r.packet_cohort_utc!==r.cohort_utc||
   r.packet_reviewed_utc>=r.planned_utc)return statuses[1];
 if(r.marker_present===false)return statuses[2];
 if(r.marker_present!==true||r.marker_exact_shape!==true||r.marker_protocol_shape!==true||
   r.marker_reviewed!==true||!iso(r.marker_effective_utc)||
   r.marker_cohort_utc!==r.cohort_utc||
   r.marker_effective_utc>r.packet_reviewed_utc||
   r.marker_effective_utc>r.planned_utc)return statuses[3];
 return statuses[4];
}
export function projectP6ConditionalQueryScope(rows,observedAtUtc){
 if(!iso(observedAtUtc)||!Array.isArray(rows)||rows.length>576)hold("DENOMINATOR");
 const cells=exactDays.flatMap(day=>horizons.map(horizon=>({day,horizon,prepared:0,futurePrepared:0,
  counts:Object.fromEntries(statuses.map(s=>[s,0]))})));
 for(const r of rows){
  const cell=cells.find(c=>c.day===r.day&&c.horizon===r.horizon);
  if(!cell||!iso(r.planned_utc)||++cell.prepared>96)hold("LEDGER_ROW");
  if(r.planned_utc>observedAtUtc)cell.futurePrepared++;
  cell.counts[classifyP6ConditionalQueryMarker(r)]++;
 }
 for(const c of cells)c.status=c.prepared?"PREPARED_DENOMINATOR_OBSERVED":"NO_PREPARED_DENOMINATOR";
 return {status:"P6_CONDITIONAL_QUERY_INSTRUCTION_SCOPE_COUNTS_READONLY",observedAtUtc,cells,
  packetSignatureVerified:false,protectedPolicyAdmitted:false,actualConditionalMemberVerified:false,
  actualPreCommitVerified:false,trainingEligibilityCertified:false,providerCalls:0,databaseWrites:0};
}
export async function readP6ConditionalQueryScope(c){
 let tx=false,stage="TRANSACTION";
 try{
  await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");tx=true;
  await c.query("SET LOCAL statement_timeout='25000ms'");await c.query("SET LOCAL lock_timeout='2000ms'");
  stage="OWNER_CONTEXT";
  const who=(await c.query("SELECT current_database()='neondb' db,current_user='neondb_owner' owner,session_user='neondb_owner' login,NOT pg_is_in_recovery() primary,current_setting('transaction_read_only')='on' ro,transaction_timestamp() at")).rows[0];
  if(!who?.db||!who.owner||!who.login||!who.primary||!who.ro)hold("OWNER_CONTEXT");
  stage="AUTHORIZATION";
  const auth=(await c.query("SELECT manifest_sha256,calendar_hash FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL")).rows;
  if(auth.length!==1||!["manifest_sha256","calendar_hash"].every(k=>/^[a-f0-9]{64}$/.test(auth[0][k]??"")))hold("AUTHORIZATION");
  const {manifest_sha256:m,calendar_hash:cal}=auth[0];
  // The only decoded objects are live SOURCE_QUERY_PACKET instructions,
  // not provider bodies or original/member rows. Return only booleans,
  // clocks and day/horizon for bounded aggregate projection.
  // Explicit aliases and JSON functions avoid ambiguous bare SQL labels and
  // operator tokenization. Only retained instruction bytes are decoded.
  stage="QUERY_PROJECTION";
  const q=await c.query(`
   WITH packets AS MATERIALIZED (
    SELECT q.run_day_index AS study_day, q.horizon AS horizon,
      q.planned_dispatch_utc AS planned_utc, d.scheduled_start_utc AS cohort_utc,
      (p.logical_path IS NOT NULL) AS packet_present,
      p.externally_reviewed_at_utc AS packet_reviewed_utc,
      p.rights_sha256 AS rights_sha256, q.rights_review_sha256 AS ledger_rights_sha256,
      (p.content_sha256 = pg_catalog.encode(pg_catalog.sha256(p.payload_bytes),'hex')) AS content_hash_match,
      CASE WHEN p.logical_path IS NOT NULL THEN pg_catalog.convert_from(p.payload_bytes,'UTF8')::jsonb END AS body,
      q.manifest_sha256 AS manifest_sha256, q.query_digest AS query_digest
    FROM clean.phase5_fids_allowed_query_v39 AS q
    JOIN clean.adb_phase6_calendar_day AS d ON d.calendar_hash=$2 AND d.run_day_index=q.run_day_index
    LEFT JOIN phase6_private.frozen_native_packet_v39 AS p
      ON p.manifest_sha256=q.manifest_sha256 AND p.run_day_index=q.run_day_index
      AND p.kind='SOURCE_QUERY_PACKET' AND p.retention_not_after_utc>transaction_timestamp()
      AND p.logical_path='data-collection/phase5/frozen/sourceq_d'||q.run_day_index::text||'_'||q.query_digest||'.json'
    WHERE q.manifest_sha256=$1 AND q.run_day_index IN (3,4) LIMIT 577
   ), projected AS (
    SELECT *, pg_catalog.jsonb_extract_path(body,'plan','conditionalService') AS marker FROM packets
   )
   SELECT study_day AS "day", horizon, planned_utc, cohort_utc, packet_present, packet_reviewed_utc, content_hash_match,
      (body->>'schema'='v39.phase5.github-source-one-query-template.v2'
       AND body->>'manifestSha256'=manifest_sha256 AND body->>'queryDigestSha256'=query_digest
       AND rights_sha256=ledger_rights_sha256
       AND pg_catalog.jsonb_extract_path_text(body,'plan','reviewedProviderRightsSha256')=ledger_rights_sha256
       AND pg_catalog.jsonb_extract_path(body,'plan','independentlyApprovedSourceAndRetention')='true'::jsonb
       AND pg_catalog.jsonb_extract_path(body,'plan','githubOnlyOwnerApproved')='true'::jsonb
       AND pg_catalog.jsonb_extract_path_text(body,'plan','acquisition','runDayIndex')=study_day::text
       AND pg_catalog.jsonb_extract_path_text(body,'plan','day','runDayIndex')=study_day::text
       AND pg_catalog.jsonb_extract_path_text(body,'plan','acquisition','horizon')=horizon
       AND NOT pg_catalog.jsonb_exists_any(body,ARRAY['githubRunId','approvedCodeSha']::text[])) AS packet_scope_match,
      pg_catalog.jsonb_extract_path_text(body,'plan','acquisition','scheduledRequestUtc') AS packet_planned_utc,
      pg_catalog.jsonb_extract_path_text(body,'plan','day','scheduledStartUtc') AS packet_cohort_utc,
      (marker IS NOT NULL) AS marker_present,
      CASE WHEN pg_catalog.jsonb_typeof(marker)='object'
        THEN pg_catalog.jsonb_exists_all(marker,ARRAY['cohortStartUtc','effectiveUtc','protocolSha256','reviewedConditionalServiceScope']::text[])
        AND (marker - ARRAY['cohortStartUtc','effectiveUtc','protocolSha256','reviewedConditionalServiceScope']::text[])='{}'::jsonb
        ELSE false END AS marker_exact_shape,
      (marker->>'protocolSha256' ~ '^[a-f0-9]{64}$') AS marker_protocol_shape,
      (marker->'reviewedConditionalServiceScope'='true'::jsonb) AS marker_reviewed,
      marker->>'effectiveUtc' AS marker_effective_utc, marker->>'cohortStartUtc' AS marker_cohort_utc
   FROM projected
  `,[m,cal]);
  stage="COUNT_PROJECTION";
  return projectP6ConditionalQueryScope(q.rows.map(r=>({...r,planned_utc:utc(r.planned_utc),cohort_utc:utc(r.cohort_utc),packet_reviewed_utc:utc(r.packet_reviewed_utc)})),utc(who.at));
 }catch(err){
  const safe=new Error("HOLD_P6_CONDITIONAL_QUERY_SCOPE_"+stage);
  safe.stage=stage;safe.code=err?.code;safe.position=err?.position;
  throw safe;
 }finally{if(tx)await c.query("ROLLBACK").catch(()=>{});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let c;
 try{
  if(process.argv.length!==2||!process.env.DATABASE_URL||process.env.NODE_TLS_REJECT_UNAUTHORIZED==="0")hold("OWNER_URL");
  const {Client}=createRequire(resolve(process.cwd(),"package.json"))("pg");
  c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
  await c.connect();console.log(JSON.stringify(await readP6ConditionalQueryScope(c)));
 }catch(e){console.error(JSON.stringify({status:"HOLD_P6_CONDITIONAL_QUERY_SCOPE_REDACTED",stage:["TRANSACTION","OWNER_CONTEXT","AUTHORIZATION","QUERY_PROJECTION","COUNT_PROJECTION"].includes(e?.stage)?e.stage:"ADMISSION",sqlPosition:/^[0-9]{1,5}$/.test(e?.position??"")?Number(e.position):null,sqlstate:/^[A-Z0-9]{5}$/.test(e?.code??"")?e.code:null,providerCalls:0,databaseWrites:0}));process.exitCode=2;}
 finally{if(c)await c.end().catch(()=>{});}
}
