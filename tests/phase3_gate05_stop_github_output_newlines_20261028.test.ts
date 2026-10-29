import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const file="scripts/v39_gate05_nonsecret_stop_github_output_20261028.mjs";
const commissioning=readFileSync(
  "scripts/v39_gate05_newscope_commission_github_no_provider_20261028.mjs","utf8");
const sample={
  scope_id:"12345678-1234-4234-8234-123456789abc",
  runner_sha:"a".repeat(40),
  receiver_sha:"b".repeat(40),
  authorization_sha256:"c".repeat(64),
  stop_ticket_sha256:"d".repeat(64),
  start_utc:"2026-10-29T03:00:00.000Z",
  stop_utc:"2026-10-29T04:00:00.000Z",
  starting_credits:"1981"
};
function offline(payload:unknown){
  const code='import {gate05NonsecretStopOutputV39 as run} from "./'+file+'";\n'+
    'try{process.stdout.write(JSON.stringify({ok:true,output:run('+JSON.stringify(payload)+')}));}'+
    'catch(e){process.stdout.write(JSON.stringify({ok:false,error:String(e.message)}));}';
  const p=spawnSync(process.execPath,["--input-type=module","-e",code],
    {encoding:"utf8",timeout:10000});
  expect(p.status).toBe(0);
  return JSON.parse(p.stdout) as {ok:boolean;output?:string;error?:string};
}
describe("Gate05 committed GitHub Actions STOP handoff output contract",()=>{
  it("emits exactly 8 distinct actual newline-delimited GitHub output records",()=>{
    const r=offline(sample);
    expect(r.ok).toBe(true);
    const out=r.output!;
    expect(out.endsWith("\n")).toBe(true);
    expect(out.includes("\\n")).toBe(false);
    const rows=out.split("\n");
    expect(rows).toHaveLength(9);
    expect(rows.at(-1)).toBe("");
    expect(rows.slice(0,8)).toEqual(Object.entries(sample)
      .map(([k,v])=>k+"="+v));
    expect(out).not.toContain("DATABASE_URL");
    expect(out).not.toContain("AERODATABOX_API_KEY");
  });
  it("rejects newline injection, extra fields and missing fields",()=>{
    expect(offline({...sample,scope_id:sample.scope_id+"\nevil=value"}).ok).toBe(false);
    expect(offline({...sample,starting_credits:"1981\nEVIL=1"}).ok).toBe(false);
    expect(offline({...sample,secret:"not-allowed"}).ok).toBe(false);
    const missing={...sample} as Partial<typeof sample>;
    delete missing.scope_id;
    expect(offline(missing).ok).toBe(false);
  });
  it("rejects a non-60-minute or non-UTC stop, preventing stale STOP inputs",()=>{
    expect(offline({...sample,stop_utc:"2026-10-29T04:00:01.000Z"}).ok).toBe(false);
    expect(offline({...sample,start_utc:"2026-10-29T03:00:00-07:00"}).ok).toBe(false);
    expect(offline({...sample,starting_credits:"81"}).ok).toBe(false);
  });
  it("validates GitHub output before irreversible DB or protected env writes",()=>{
    expect(commissioning).toContain("GITHUB_OUTPUT_NOT_WRITABLE_PRECOMMIT");
    expect(commissioning).toContain("accessSync(outputFile,fsConstants.W_OK)");
    expect(commissioning).toContain(
      "appendFileSync(outputFile,gate05NonsecretStopOutputV39(handoff)");
    expect(commissioning).not.toContain('k+"="+v+"\\\\n"');
    expect(commissioning.indexOf("GITHUB_OUTPUT_NOT_WRITABLE_PRECOMMIT"))
      .toBeLessThan(commissioning.indexOf("PRECOMMIT_SAFETY_ENV_CONFIGURATION"));
    expect(commissioning.indexOf("PUBLISH_NON_SECRET_POSTCOMMIT_STOP_HANDOFF"))
      .toBeGreaterThan(commissioning.indexOf("READ_AFTER_COMMIT"));
  });
  it("both scripts parse without any provider or database connections",()=>{
    for(const f of [file,
      "scripts/v39_gate05_newscope_commission_github_no_provider_20261028.mjs"]){
      const p=spawnSync(process.execPath,["--check",f],
        {encoding:"utf8",timeout:10000});
      expect(p.status).toBe(0);
    }
  });
});