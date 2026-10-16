/**
 * Phase3 independent exploratory-ML input screening; local JSON files only.
 * This command NEVER reads production DB/provider or produces a model,
 * and must not consume original Phase6 protected test data.
 *
 * tsx scripts/v39_ml_exploratory_input_review_v39.ts \
 *   --rows-json permitted_derived_ml_rows.json \
 *   --split-json preregistered_exploratory_splits.json
 */
import {readFileSync} from "node:fs";
import {
  auditMlPilotInputV39,
  type MlPilotRowV39,
  type MlPilotSplitV39,
} from "../server/lib/disruption/exploratoryMlInputAudit_v39";

export function runMlExploratoryAuditV39(args:readonly string[]=process.argv.slice(2)):number {
  if(args.length!==4 || args[0]!=="--rows-json" || args[2]!=="--split-json" ||
     !args[1] || !args[3]) {
    throw Error("ML_EXPLORATORY_REQUIRES_EXACT_LOCAL_ROWS_AND_SPLIT_JSON");
  }
  const rows:unknown=JSON.parse(readFileSync(args[1],"utf8"));
  const split:unknown=JSON.parse(readFileSync(args[3],"utf8"));
  const result=auditMlPilotInputV39(rows as MlPilotRowV39[],split as MlPilotSplitV39);
  console.log(JSON.stringify({
    ...result,
    sourceType:"PERMITTED_LOCAL_DERIVED_JSON_ONLY",
    rawProviderObjectsReadByThisCommand:false,
    sourceLicenseIndependentlyVerifiedByThisCommand:false,
    actualLabelEvidenceIndependentlyVerifiedByThisCommand:false,
    phase6ProtectedTestUsed:false,
    modelFitExecuted:false,
    providerCalls:0,
    databaseMutations:0,
  },null,2));
  return result.status==="READY_FOR_EXPLORATORY_MODEL_ONLY"?0:2;
}
if(import.meta.url===`file://${process.argv[1]}`){
  try{process.exitCode=runMlExploratoryAuditV39();}
  catch{console.error("ML_EXPLORATORY_LOCAL_EVIDENCE_UNAVAILABLE_OR_MALFORMED");process.exitCode=2;}
}
