/** Deterministic bounded, non-paid Gate5-R decision from reviewed Nov2 record.
 * Never a Phase5 FREEZE or Phase6 activation command.
 */
import {readFileSync} from "node:fs";
import {assessG5RExpeditedSourceReadinessV39,
 type G5RHistoricalReceiptV39} from
 "../server/lib/disruption/phase4Gate5ExpeditedReadinessV39";
const filename=
 "data-collection/phase4/GATE5_20261102_BOUNDED_CLOSEOUT_HOLD_STATUS.json";
const parsed=JSON.parse(readFileSync(filename,"utf8")) as G5RHistoricalReceiptV39;
const report=assessG5RExpeditedSourceReadinessV39(parsed);
console.log(JSON.stringify(report,null,2));
if(report.status!=="GATE5_REVISED_COLLECTION_READINESS_PASS"||
 report.phase5FreezeAuthorized||report.phase6LiveCollectionAuthorized)
 throw Error("GATE5_R_IMPOSSIBLE_STATUS");
