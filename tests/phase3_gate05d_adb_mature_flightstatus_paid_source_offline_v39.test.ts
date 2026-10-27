import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {Script,createContext} from "node:vm";
const source=readFileSync(
 "scripts/v39_gate05d_mature_wsss_fids_flightstatus_once_20261027.mjs","utf8"
);
const i=source.indexOf("function sg("),j=source.indexOf("const from=sg(");
if(i<0||j<=i)throw Error("Gate05d pure diagnostic review boundary changed");
const {parsedUtc,tally,choose}=new Script(source.slice(i,j)+
  "\n;({parsedUtc,tally,choose})").runInContext(createContext({
  Intl,Date,Number,Math,Array,Object,String,RegExp
}),{timeout:1000}) as {
 parsedUtc:(x:string)=>number|null;
 tally:(x:unknown[])=>Record<string,number>;
 choose:(x:unknown[])=>{number:string}|null;
};
const flight=(number:string,runway:boolean,status="Arrived",codeshare="IsOperator")=>({
 number,status,codeshareStatus:codeshare,
 departure:{quality:["Live"],scheduledTime:{utc:"2026-10-27 04:05Z"},
 revisedTime:{utc:"2026-10-27 04:20Z"},
 ...(runway?{runwayTime:{utc:"2026-10-27 04:22Z"}}:{})},
 arrival:{airport:{icao:"WADD"}},
 lastUpdatedUtc:"2026-10-27T06:00:00Z"
});
describe("Gate05d genuinely new AeroDataBox mature FIDS vs Flight Status experiment",()=>{
 it("counts present vs missing runway on mature operator movements and never leaks identifiers",()=>{
  const rows=[flight("SQSECRET",true),flight("QFSECRET",false,"Departed"),
    flight("UALONG",true,"Arrived","IsCodeshared")];
  const x=tally(rows);
  expect(x.objects).toBe(3);
  expect(x.runwayPresent).toBe(2);
  expect(x.scheduledPresent).toBe(3);
  expect(x.revisedPresent).toBe(3);
  expect(x.operatorRecords).toBe(2);
  expect(x.marketingRecords).toBe(1);
  expect(x.departedOrArrived).toBe(3);
  expect(JSON.stringify(x)).not.toContain("SECRET");
  expect(choose(rows)?.number).toBe("SQSECRET");
 });
 it("missing runwayTime never becomes zero-delay or a false actual runway result",()=>{
  const x=tally([flight("SQ123",false)]);
  expect(x.runwayPresent).toBe(0);
  expect(x.scheduledPresent).toBe(1);
  expect(x.liveDeparture).toBe(1);
  expect(source).toContain("exactRunwayDelayLabelProven:false");
 });
 it("understands provider space UTC, rejects invalid calendar and non-UTC offset",()=>{
  expect(parsedUtc("2026-10-27 04:05Z")).not.toBeNull();
  expect(parsedUtc("2026-02-30 04:05Z")).toBeNull();
  expect(parsedUtc("2026-10-27T04:05+03:00")).toBeNull();
 });
 it("uses novel mature 235-255min window, one new one-use token, and bounded SAME provider only",()=>{
  expect(source).toContain("now-255*60000");
  expect(source).toContain("now-235*60000");
  expect(source).toContain("https://aerodatabox.p.rapidapi.com");
  expect(source).toContain("flights/number/");
  expect(source).toContain("withFlightPlan:\"false\"");
  expect(source).toContain("withLeg:\"true\"");
  expect(source).toContain("paidAttempts>=2");
  expect(source).toContain("flag:\"wx\"");
  expect(source).toContain("GATE05D_FIRST_DEBIT_NOT_TWO_REFUSE_SECOND");
  expect(source).toContain("GATE05D_PAID_GO");
  expect(source).toContain("expectedApiUnits:2*paidAttempts");
  expect(source).not.toContain("https://api.cirium.com");
  expect(source).not.toContain("GATE05C_PAID_GO");
  expect(source).not.toContain("POST");
  expect(source).not.toContain("maxDeliveryRetries");
  expect(source).not.toContain("from \"pg\"");
 });
});
