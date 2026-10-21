/**
 * Purely local OpenAPI review. No provider network call, DB access or writes.
 * Usage: node --import tsx scripts/v39_gate05_inspect_openapi_v39.ts --file <path>
 */
import {readFileSync} from "node:fs";
import {inspectGate05OpenApiBytesV39} from "../server/lib/disruption/gate05OpenApiInspector_v39";
function run(argv:string[]){
  if(argv.length!==2||argv[0]!=="--file"||!argv[1]||argv[1].startsWith("--"))
    throw Error("GATE05_OPENAPI_LOCAL_FILE_REQUIRED");
  const read=readFileSync(argv[1]);
  const review=inspectGate05OpenApiBytesV39(read);
  console.log(JSON.stringify({...review,providerRequests:0,databaseWrites:0,blobWrites:0},null,2));
}
try{run(process.argv.slice(2));}
catch(e){
  console.error("GATE05_OPENAPI_OFFLINE_REVIEW_HOLD: "+(e instanceof Error?e.message:"UNKNOWN"));
  process.exitCode=1;
}
