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
 const match=block.match(/^ {4}if: \$\{\{ ([^\n]+) \}\}$/m);
 if(!match)return null;
 const cond=match[1];
 const modes=[...cond.matchAll(/inputs\.private_transport == '(true|false|stored)'/g)].map(x=>x[1]);
 if(!modes.length)return null;
 return {condition:cond,modes};
};
describe("original SOURCE one-paid-GET jobs remain mutually exclusive",()=>{
 it("requires exact false for checkout-local, exact true for protected private",()=>{
  const a=getMode(job(LEGACY)),b=getMode(job(PRIVATE));
  expect(a?.modes).toEqual(["false"]);
  expect(b?.modes).toEqual(["true","stored","stored"]);
  for(const x of [a,b]){
   expect(x?.condition).toContain("github.ref == 'refs/heads/main'");
   expect(x?.condition).toContain("github.event_name == 'workflow_dispatch'");
   expect(x?.condition).toContain(
    "inputs.confirm == 'ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET'");
   expect(x?.condition).not.toMatch(/private_transport\s*!=/);
  }
  // Assert the exact Boolean branches, not merely occurrences of transport
  // strings. The second stored branch is DISARMED actor-only admission.
  const main="github.ref == 'refs/heads/main' && github.event_name == 'workflow_dispatch' && ";
  const paid="inputs.confirm == 'ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET'";
  const pre="inputs.confirm == 'ONLY_PRE_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER'";
  expect(a?.condition).toBe(main+paid+" && inputs.private_transport == 'false'");
  expect(b?.condition).toBe(main+"(("+paid+" && (inputs.private_transport == 'true' || inputs.private_transport == 'stored')) || ("+pre+" && inputs.private_transport == 'stored'))");
  const transports=["false","true","stored","","missing","unexpected"];
  for(const transport of transports){
   const selected=[a,b].filter(x=>x?.modes.includes(transport));
   expect(selected.length).toBe(["false","true","stored"].includes(transport)?1:0);
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
 it("actor-only confirmation cannot reach any provider credential or actual observation",()=>{
  const b=job(PRIVATE),steps=b.split(/\n {6}- (?:name: |uses: )/).slice(1);
  const paid="inputs.confirm == 'ONE_SIGNED_SOURCE_CHILD_MAX_ONE_PAID_GET'";
  const pre="inputs.confirm == 'ONLY_PRE_INDEPENDENT_ACTOR_PREFLIGHT_NO_PROVIDER'";
  const providerSteps=steps.filter(x=>x.includes("secrets.AERODATABOX_API_KEY")||x.includes("v39_phase6_private_source_one_original_child_github_v39.mjs"));
  expect(providerSteps).toHaveLength(2);
  for(const step of providerSteps){expect(step).toContain(paid);expect(step).not.toContain(pre);}
  expect(b.slice(0,b.indexOf("    steps:"))).not.toContain("secrets.AERODATABOX_API_KEY");
  const only=steps.find(x=>x.startsWith("Admission for real actor preflight ONLY"));
  expect(only).toContain(pre);
  expect(only).toContain('test "$V39_PHASE6_PROCESS_ARMED" = 0');
  expect(only).not.toContain("secrets.");
  for(const step of steps.filter(x=>x.startsWith("Independently read actual committed")||x.startsWith("Review and publish later PRE"))){expect(step).toContain(paid);expect(step).not.toContain(pre);}
 });
 it("optional public NOAA archive cannot introduce a required actor-commissioning step",()=>{
  const steps=job(PRIVATE).split(/\n {6}- (?:name: |uses: )/).slice(1);
  const archive=steps.find(x=>x.startsWith("Read latest completed signed public NOAA archive"));
  expect(archive).toContain("vars.P6_NOAA_PUBLIC_ARCHIVE_ENABLED == '1'");
  expect(archive).not.toContain("secrets.AERODATABOX_API_KEY");
  for(const name of ["Preflight independent PRE lane role","Preflight independent PRE proof role","Review and publish later PRE using existing private registry"]){
   const step=steps.find(x=>x.startsWith(name));expect(step).toContain("P6_NOAA_PUBLIC_ARCHIVE_ENABLED: ${{ vars.P6_NOAA_PUBLIC_ARCHIVE_ENABLED }}");
   expect(step?.split("\n").find(l=>l.includes("if:"))).not.toContain("P6_NOAA_PUBLIC_ARCHIVE_ENABLED");
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
