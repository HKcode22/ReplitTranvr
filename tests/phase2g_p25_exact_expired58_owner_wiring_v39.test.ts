import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL(
 "../scripts/v39_p25_exact58_expired_cleanup_v39.ts",import.meta.url),"utf8");
describe("P25 exact 58 live-operator source authorization and partition",()=>{
 it("requires exact mode+manifest, excludes paid provider imports",()=>{
   expect(source).toContain("args.expectedManifest!==plan.manifestSha256");
   expect(source).toContain("argv[0]===\"--apply\"");
   expect(source).not.toContain("aerodataboxLimiter_v3");
   expect(source).not.toContain("createSubscription(");
 });
 it("read-only preflight locks scope to failed P25, budget, incidents",()=>{
   expect(source).toContain("BEGIN TRANSACTION READ ONLY");
   expect(source).toContain('probe_id=19 AND probe_budget_day_id=$1 AND icao=\'YSSY\'');
   expect(source).toContain("Number(open[0].id)!==31");
   expect(source).toContain("Number(open[1].id)!==32");
   expect(source).toContain("Number(active.probes)!==0");
 });
 it("only exact pre-approved object references can receive SQL tombstone",()=>{
   expect(source).toContain("executeExactP25DeletionV39(plan");
   expect(source).toContain("deleteProviderBlobAtExpiryV39({");
   expect(source).toContain("AND source_record_id LIKE $3 AND object_name=$4");
   expect(source).toContain("AND content_sha256=$5 AND content_bytes=$6");
   expect(source).toContain("AND deletion_verified_at_utc IS NULL RETURNING blob_ref_id");
   expect(source).not.toContain("UPDATE clean.adb_incident_stop");
   expect(source).not.toContain("UPDATE clean.adb_probe_budget_day");
 });
 it("post-readback demands all 58 storage absent and SQL tombstoned",()=>{
   expect(source).toContain("physicallyAbsent!==58");
   expect(source).toContain("Number(state?.marked)!==58");
   expect(source).toContain("HOLD_NO_AUTOMATIC_RETRY");
   expect(source).toContain("pg_try_advisory_lock");
 });
});
