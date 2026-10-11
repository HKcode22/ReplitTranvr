/**
 * Phase2G exact P2G24 30-blob queue sizing from read-only LOGGED metadata.
 * No provider API, object storage, raw flight payload, Cloudflare or writes.
 * Manual Replit Shell use only; CI must compile WITHOUT executing.
 */
import {v39Pool as pool} from "../server/lib/disruption/db_v39.ts";

const SESSION="6267293e-75a0-42a7-b977-89543f200ebc";
const EXPECTED_REFS=30;
async function main(){
  console.log("P2G24_QUEUE_SIZE_READ_ONLY=true");
  console.log("PROVIDER_CALLS=0;STORAGE_CALLS=0;CLOUDFLARE_CALLS=0;DB_MUTATIONS=0");
  if(!process.env.V39_DATABASE_RUNTIME_URL)throw Error("DB_NOT_CONFIGURED");
  const client=await pool.connect();
  try{
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query("SET LOCAL statement_timeout = '8s'");
    const sql=[
      "SELECT COUNT(*)::int AS refs,",
      "MIN(content_bytes)::bigint AS min_bytes,",
      "MAX(content_bytes)::bigint AS max_bytes,",
      "ROUND(AVG(content_bytes))::bigint AS mean_bytes,",
      "PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY content_bytes) AS p50_bytes,",
      "PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY content_bytes) AS p95_bytes,",
      "COUNT(*) FILTER (WHERE content_bytes > 60000)::int AS above_60k,",
      "COUNT(*) FILTER (WHERE content_bytes > 120000)::int AS above_120k,",
      "COUNT(*) FILTER (WHERE content_bytes >= 128000)::int AS at_least_128k,",
      "COUNT(*) FILTER (WHERE content_bytes IS NULL OR content_bytes <= 0)::int AS invalid_bytes,",
      "COUNT(*) FILTER (WHERE deletion_verified_at_utc IS NOT NULL)::int AS deleted_refs,",
      "MIN(expires_at_utc) AS earliest_reference_expiry",
      "FROM clean.provider_content_blob_ref",
      "WHERE source_kind = 'webhook' AND source_record_id LIKE $1"
    ].join("\n");
    const result=await client.query(sql,["prepaid:"+SESSION+":%"]);
    const row=result.rows[0];
    console.log("=== EXACT P2G24 30-OBJECT METADATA ONLY ===");
    console.log(JSON.stringify(row,null,2));
    const ok=Number(row.refs)===EXPECTED_REFS&&Number(row.invalid_bytes)===0&&
      Number(row.deleted_refs)===0;
    console.log("EXACT_30_REFERENCE_CONTRACT="+(ok?"PASS":"FAIL"));
    console.log("KNOWN_60KB_OVERSIZE="+(Number(row.above_60k)===0?"NONE":"PRESENT"));
    console.log("ACTUAL_QUEUES_SERIALIZATION_TESTED=false");
    console.log("FUTURE_AERODATABOX_PAYLOAD_SIZES_PROVEN=false");
    console.log("CLOUD_PROVIDER_QUOTA_GUARANTEE=false");
    if(!ok)process.exitCode=2;
  }finally{
    await client.query("ROLLBACK").catch(()=>{});
    client.release();
    await pool.end();
  }
}
main().catch(()=>{
  console.error("P2G24_QUEUE_SIZE_READONLY_AUDIT_FAILED");
  process.exitCode=2;
});
