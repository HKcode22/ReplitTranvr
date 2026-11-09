/**
 * Owner-readable, LOCAL ONLY, no network/provider/DB. No default date:
 * user must deliberately specify a provisional earliest UTC parent date.
 *
 * Example: npx tsx scripts/v39_phase5_corrected_pair_date_geometry_readonly.ts --first-date 2026-11-24
 *
 * This can ONLY generate a REVIEW CANDIDATE. It cannot create a signed
 * calendar, independent treatment seed, current provider source budget,
 * PRE source originals or Phase6 paid GO.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {proposeP5RealCorrectedPairDateGeometry} from
 "../server/lib/disruption/phase5CorrectedPairDateGeometryProposal_v39";

async function main(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=="--first-date"){
  process.stderr.write("USAGE_READONLY: --first-date YYYY-MM-DD (provisional UTC date only)\n");
  process.exitCode=2;return;
 }
 const here=dirname(fileURLToPath(import.meta.url));
 const path=resolve(here,"../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json");
 const owner=JSON.parse(readFileSync(path,"utf8"));
 const p=proposeP5RealCorrectedPairDateGeometry({
  ownerCorrectedReadback:owner,firstRunDateUtc:args[1]
 });
 process.stdout.write(JSON.stringify(p,null,2)+"\n");
 if(p.status!=="DATE_GEOMETRY_CANDIDATE_ONLY_NOT_SCIENCE_FREEZE")
  process.exitCode=2;
}
main().catch(error=>{
 process.stderr.write(String(error instanceof Error?error.message:error)+"\n");
 process.exitCode=2;
});
