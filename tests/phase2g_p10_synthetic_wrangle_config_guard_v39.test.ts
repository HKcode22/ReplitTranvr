import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,it,expect} from "vitest";

const filepath=join(process.cwd(),
  "experiments/phase2g_cf_sandbox_ingress/wrangler.synthetic-staging.jsonc");
const txt=readFileSync(filepath,"utf8");
function data(){
  return JSON.parse(txt.replace(/^\s*\/\/.*$/gm,"")) as Record<string,any>;
}
describe("P10 UNPROVISIONED Cloudflare synthetic-only staging config",()=>{
  it("references only the isolated sandbox entry point, never paid provider callback",()=>{
    const x=data();
    expect(x.main).toBe("./worker.ts");
    expect(x.name).toBe("p2g-yssy-synthetic-edge-staging");
    expect(x.vars).toMatchObject({
      EDGE_EXECUTION_MODE:"synthetic-only",
      EDGE_ALLOW_SYNTHETIC_RELAY:"0"
    });
    expect(x.routes).toBeUndefined();
    expect(x.route).toBeUndefined();
    expect(txt).not.toMatch(/AERODATABOX_API_KEY|AERODATABOX_WEBHOOK_SECRET/);
    expect(txt).not.toContain("maxDeliveryRetries");
  });
  it("synthetic-only R2 and Queue bindings match actual prototype, do not imply account resources exist",()=>{
    const x=data();
    expect(x.r2_buckets).toEqual([{
      binding:"RAW",
      bucket_name:"p2g-yssy-synthetic-only-evidence-staging"
    }]);
    expect(x.queues.producers).toEqual([{
      binding:"DELIVERY_QUEUE",
      queue:"p2g-yssy-synthetic-only-receipts"
    }]);
    expect(x.queues.consumers[0]).toMatchObject({
      queue:"p2g-yssy-synthetic-only-receipts",
      dead_letter_queue:"p2g-yssy-synthetic-only-dlq",
      max_retries:10
    });
    expect(x.triggers.crons).toEqual(["*/5 * * * *"]);
  });
  it("cannot be advertised as seven-day actual source retention, ingress authentication or a paid-ready config",()=>{
    const x=data();
    expect(x.vars.EDGE_PROVENANCE_SIGNING_KEY).toBeUndefined();
    expect(x.vars.EDGE_TEST_SECRET).toBeUndefined();
    expect(x.vars.EDGE_TEST_RECEIVER_PATH_SECRET).toBeUndefined();
    expect(x.vars.EDGE_SANDBOX_RECEIVER_ORIGIN).toBeUndefined();
    expect(x.vars.EDGE_ALLOW_SYNTHETIC_RELAY).toBe("0");
    expect(txt).toMatch(/DO NOT deploy/i);
  });
});
