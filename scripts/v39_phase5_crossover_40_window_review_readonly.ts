/**
 * Local-only exact 40 airport-window review backlog, stdout JSON or CSV.
 *
 * Examples:
 * npx tsx scripts/v39_phase5_crossover_40_window_review_readonly.ts --first-date 2026-11-24
 * npx tsx scripts/v39_phase5_crossover_40_window_review_readonly.ts --first-date 2026-11-24 --format csv
 *
 * NO network, database, GitHub Actions dispatch, source GET, paid Alert,
 * library file write, source proof or independent scientific approval.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {
 buildP5Crossover40WindowReview
} from "../server/lib/disruption/phase5Crossover40WindowEvidenceReview_v39";

const columns=[
 "review_key_sha256","pair_id","period","run_day_index","slot",
 "airport_icao","date_utc","start_utc","conservative_review_end_utc",
 "scheduled_passenger_population","provider_original_verified",
 "unique_operating_leg_count","directed_routes_verified",
 "public_evidence_url","public_evidence_observed_at_utc",
 "public_context_class","reviewer_notes"
];
const csvEscape=(x:string)=>'"'+x.replaceAll('"','""')+'"';
function main(){
 const args=process.argv.slice(2);
 if(!((args.length===2&&args[0]==="--first-date")||
    (args.length===4&&args[0]==="--first-date"&&
      args[2]==="--format"&&["json","csv"].includes(args[3])))){
  process.stderr.write(
   "USAGE_LOCAL_READONLY: --first-date YYYY-MM-DD [--format json|csv]\n"
  );
  process.exitCode=2;return;
 }
 const ownerFile=resolve(dirname(fileURLToPath(import.meta.url)),
  "../data-collection/phase5/evidence/2026-11-09_five_full_frame_pairs_post_selection_kteb_to_kbuf_readonly.json");
 const owner=JSON.parse(readFileSync(ownerFile,"utf8"));
 const result=buildP5Crossover40WindowReview({
  ownerCorrectedReadback:owner,firstRunDateUtc:args[1]
 });
 if(args[3]==="csv"){
  const rows=result.reviewRows.map(row=>[
   row.reviewKeySha256,row.pairId,String(row.crossoverPeriod),
   String(row.runDayIndex),row.slot,row.airportIcao,row.dateUtc,
   row.startUtc,row.conservativeEndUtc,row.scheduledPassengerPopulation,
   String(row.providerNativeWindowSourceVerified),"","",
   "","","",""
  ]);
  process.stdout.write(
   [columns,...rows].map(r=>r.map(csvEscape).join(",")).join("\n")+"\n"
  );
 }else process.stdout.write(JSON.stringify(result,null,2)+"\n");
}
try{main();}catch(error){
 process.stderr.write(
  String(error instanceof Error?error.message:error)+"\n"
 );
 process.exitCode=2;
}
