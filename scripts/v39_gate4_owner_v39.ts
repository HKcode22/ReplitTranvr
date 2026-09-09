import { getCollectionStatus } from "../server/lib/disruption/adbCollectionController_v3";
import { runGate4OfflineTest } from "../server/lib/disruption/gates_v3";

export async function runGate4Owner(): Promise<number> {
  const threshold = runGate4OfflineTest();
  const live = await getCollectionStatus();
  const passed = threshold.passed && !live.running;
  console.log(JSON.stringify({ schema: "v39.gate4-evidence.v1", status: passed ? "PASS" : "FAIL", threshold, live }));
  return passed ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) runGate4Owner().then((code) => { process.exitCode = code; }).catch((error: any) => {
  console.error(JSON.stringify({ schema: "v39.gate4-evidence.v1", status: "FAIL", error: error?.message ?? String(error) }));
  process.exitCode = 1;
});
