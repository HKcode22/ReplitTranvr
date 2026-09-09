/** V3.9 strict calendar solver CLI. Offline; never calls provider. */
import { readFileSync, writeFileSync } from "fs";
import { solveV39Calendar, type FrozenCalendarDesignInput } from "../server/lib/disruption/experimentCalendarSolver_v39";

function arg(name:string):string|null{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]??null:null;}
function main(){
  const inputPath=arg("--input")??process.env.V39_CALENDAR_DESIGN_INPUT;
  const outputPath=arg("--output")??process.env.V39_CALENDAR_OUTPUT;
  if(!inputPath){console.error("UNSAT: --input <frozen-design.json> is required; refusing to synthesize airport/budget evidence");process.exit(1);}
  let input:FrozenCalendarDesignInput;try{input=JSON.parse(readFileSync(inputPath,"utf8"));}catch(e:any){console.error(`UNSAT: cannot parse frozen design input: ${e?.message??e}`);process.exit(1);return;}
  const result=solveV39Calendar(input);
  console.log(`CALENDAR SOLVE: ${result.status}`);if(result.reason)console.log(`reason: ${result.reason}`);if(result.calendarHash)console.log(`calendar_hash: ${result.calendarHash}`);
  if(result.status!=="SAT"){process.exitCode=1;return;}
  if(outputPath)writeFileSync(outputPath,JSON.stringify(result,null,2)+"\n",{encoding:"utf8",flag:"wx"});
  console.log(`run_days: ${result.days.length}`);console.log(`output: ${outputPath??"<not written>"}`);
}
main();
