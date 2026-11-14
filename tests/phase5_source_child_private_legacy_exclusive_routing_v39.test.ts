/**
 * Exact GitHub Actions SOURCE child routing: mutually exclusive paid jobs.
 * Static no-provider no-DB no-Github-POST regression.
 */
import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
const yaml=readFileSync(
 ".github/workflows/phase5-one-signed-day-source-child-dispatch.yml","utf8");
const LEGACY="exact-reviewed-source-child";
const PRIVATE="exact-private-source-existing-one-get-child";
const job=(name:string)=>{
 const start=yaml.indexOf("\n  "+name+":\n");
 if(start<0)throw Error("SOURCE_CHILD_JOB_ABSENT_"+name);
 const begin=start+name.length+5;
 const next=yaml.indexOf("\n  "+(name===LEGACY?PRIVATE:LEGACY)+":\n",begin);
 return yaml.slice(begin,next<0?undefined:next);
};
const getMode=(block:string)=>{
 const match=block.match(/^    if: \$\{\{ ([^\n]+) \}\}$/m);
 if(!match)return null;
 const cond=match[1];
 const mode=cond.match(/inputs\.private_transport == '(true|false)'/g);
 if(!mode||mode.length!==1)return null;
 return {condition:cond,mode:mode[0].endsWith("'true'")?"true":"false"};
};
describe("original SOURCE one-paid-GET jobs remain mutually exclusive",()=>{
 it("requires exact false for checkout-local, exact true for protected private",()=>{
  const a=getMode(job(LEGACY)),b=getMode(job(PRIVATE));
  expect(a?.mode).toBe("false");
  expect(b?.mode).toBe("true");
  for(const x of [a,b]){
   expect(x?.condition).toContain("github.ref == 'refs/heads/main'");
   expect(x?.condition).toContain("github.event_name == 'workflow_dispatch'");
   expect(x?.condition).toContain(
    "inputs.confirm == 'ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET'");
   expect(x?.condition).not.toMatch(/private_transport\s*!=/);
  }
  for(const transport of ["false","true","", "missing","unexpected"]){
   const selected=[a,b].filter(x=>x?.mode===transport);
   expect(selected.length).toBe(
    transport==="false"||transport==="true"?1:0);
  }
 });
 it("rechecks exact mode BEFORE setup-node or any paid worker",()=>{
  const old=job(LEGACY),privateJob=job(PRIVATE);
  expect(old).toContain(
   "test \"$P6_PRIVATE_SOURCE_TRANSPORT_INPUT\" = 'false'");
  expect(privateJob).toContain(
   "test \"$P6_PRIVATE_SOURCE_TRANSPORT_INPUT\" = 'true'");
  for(const block of [old,privateJob]){
   expect(block).toContain(
    "P6_PRIVATE_SOURCE_TRANSPORT_INPUT: ${{ inputs.private_transport }}");
   expect(block.indexOf(
    "test \"$P6_PRIVATE_SOURCE_TRANSPORT_INPUT\"")).toBeGreaterThan(0);
   expect(block.indexOf(
    "test \"$P6_PRIVATE_SOURCE_TRANSPORT_INPUT\"")).toBeLessThan(
     block.indexOf("actions/setup-node@v4"));
   expect(block).toContain("test \"$GITHUB_RUN_ATTEMPT\" = '1'");
   expect(block).toContain("test \"$V39_PHASE5_FREEZE_SIGNED\" = '1'");
   expect(block).toContain("test \"$V39_PHASE5_SOURCE_RIGHTS_APPROVED\" = '1'");
  }
 });
 it("private mode never falls back to old packet files and retains own PG16 review",()=>{
  const old=job(LEGACY),privateJob=job(PRIVATE);
  expect(old).toContain("scripts/v39_phase5_one_signed_day_source_child_github_owner_v39.ts");
  expect(old).not.toContain("scripts/v39_phase6_private_source_one_original_child_github_v39.mjs");
  expect(privateJob).toContain("scripts/v39_phase6_private_source_one_original_child_github_v39.mjs");
  expect(privateJob).not.toContain("scripts/v39_phase5_one_signed_day_source_child_github_owner_v39.ts");
  expect(privateJob).toContain("P6_PRIVATE_SOURCE_TRANSPORT_APPROVED");
  expect(privateJob).toContain("P6_PRIVATE_DAY_EPOCH_REVIEW_PINS_BASE64");
  expect(privateJob).toContain("P6_PRIVATE_SOURCE_QUERY_REVIEW_PINS_BASE64");
  expect(yaml).toContain("group: p5-source-child-${{ inputs.query_digest }}");
  expect(yaml).toContain("cancel-in-progress: false");
  expect(yaml).toContain("default: 'false'");
 });
});
