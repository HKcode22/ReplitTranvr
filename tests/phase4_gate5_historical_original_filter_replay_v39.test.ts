import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {auditP4HistoricalOriginalFilterReplayV39,
 classifyP4OriginalFidsDepartureV39,P4_FIDS_FILTER_REPLAY_SQL_V39}
 from "../server/lib/disruption/phase4Gate5HistoricalOriginalFilterReplay_v39";
const F={schema:"v39.fids-request-frame.application-intent.v1",
 direction:"Departure",airportIcao:"WSSS",
 withCargo:false,withPrivate:false,withCancelled:true,withCodeshared:true
} as const;
const scope={
 airportIcao:"WSSS",serviceWindowStartUtc:"2026-10-31T17:00:00.000Z",
 serviceWindowEndUtc:"2026-10-31T18:00:00.000Z",
 readAsOfUtc:"2026-11-01T03:12:59.570Z",
 reviewedFrozenManifestSha256:"a".repeat(64)
};
const flight=(utc:string,extra:Record<string,unknown>={})=>({
 number:"AA10",departure:{scheduledTime:{utc}},...extra
});
const row=(rank:number,departures:unknown[])=>({
 receipt_rank:rank,raw_payload:{fidsRequestContract:F,departures}
});
const db=(rows:unknown[])=>({
 query:async(sql:string,args:unknown[])=>{
  expect(sql).toBe(P4_FIDS_FILTER_REPLAY_SQL_V39);
  expect(args).toEqual(["WSSS","2026-10-31T17:00:00.000Z",
   "2026-10-31T18:00:00.000Z","2026-11-01T03:12:59.570Z"]);
  return {rows};
 }
});
describe("Gate5 historical FIDS filter replay: current software behavior only",()=>{
 it("isolates one outside-end raw record without claiming a missing operated flight",async()=>{
  const a=Array.from({length:24},()=>flight("2026-10-31T17:15:00Z"));
  const b=Array.from({length:86},()=>flight("2026-10-31T17:30:00Z"));
  b.push(flight("2026-10-31T18:00:00Z"));
  const result=await auditP4HistoricalOriginalFilterReplayV39(
   db([row(1,a),row(2,b)]),scope
  );
  expect(result.rawDepartureSourceRows).toBe(111);
  expect(result.predictedNormalizedRows).toBe(110);
  expect(result.perReceipt[0].filterCounts.would_be_normalized).toBe(24);
  expect(result.perReceipt[1].filterCounts.would_be_normalized).toBe(86);
  expect(result.perReceipt[1].filterCounts.schedule_at_or_after_window_end).toBe(1);
  expect(result.historicalProducerVersionProven).toBe(false);
  expect(result.rawMemberOrdinalLinkageVerified).toBe(false);
  expect(result.physicalOperatingFlightCount).toBeNull();
  expect(result.actualOnlyWheelsOffCount).toBeNull();
 });
 it("follows production filter precedence for schedule, cargo, private and allowed codeshares",()=>{
  const begin=Date.parse(scope.serviceWindowStartUtc),end=Date.parse(scope.serviceWindowEndUtc);
  const values=[
   [flight("",{isCargo:true}),"missing_or_invalid_schedule"],
   [flight("2026-10-31T16:59:59Z"),"schedule_before_window"],
   [flight("2026-10-31T18:00:00Z"),"schedule_at_or_after_window_end"],
   [flight("2026-10-31T17:01:00Z",{isCargo:true}),"excluded_cargo"],
   [flight("2026-10-31T17:01:00Z",{isPrivate:true}),"excluded_private_or_ga"],
   [flight("2026-10-31T17:01:00Z",{isGeneralAviation:true}),"excluded_private_or_ga"],
   [flight("2026-10-31T17:01:00Z",{status:"Canceled",codeshareStatus:"IsCodeshared"}),"would_be_normalized"]
  ] as const;
  for(const [record,reason] of values){
   expect(classifyP4OriginalFidsDepartureV39(record,F,begin,end)).toBe(reason);
  }
  const noCancel={...F,withCancelled:false,withCodeshared:false};
  expect(classifyP4OriginalFidsDepartureV39(flight("2026-10-31T17:01:00Z",
   {status:"Canceled",codeshareStatus:"IsCodeshared"}),noCancel,begin,end))
   .toBe("excluded_cancelled");
 });
 it("rejects missing original producer application contract, not guessed filter flags",async()=>{
  const r=row(1,[flight("2026-10-31T17:30:00Z")]);
  delete (r.raw_payload as Record<string,unknown>).fidsRequestContract;
  await expect(auditP4HistoricalOriginalFilterReplayV39(db([r]),scope))
   .rejects.toThrow("P4_FIDS_FILTER_ORIGINAL_REQUEST_FRAME_HOLD");
 });
 it("rejects wrong receipt ranks and invalid source array without silently inventing zero",async()=>{
  await expect(auditP4HistoricalOriginalFilterReplayV39(db([
   row(2,[flight("2026-10-31T17:30:00Z")])
  ]),scope)).rejects.toThrow("P4_FIDS_FILTER_RECEIPT_ORDER_HOLD");
  await expect(auditP4HistoricalOriginalFilterReplayV39(db([
   {receipt_rank:1,raw_payload:{fidsRequestContract:F}}
  ]),scope)).rejects.toThrow("P4_FIDS_FILTER_RAW_DEPARTURES_SHAPE_HOLD");
 });
 it("if retained source expires, replay evidence is UNKNOWN not measured 0",async()=>{
  const r=await auditP4HistoricalOriginalFilterReplayV39(db([]),scope);
  expect(r.rawDepartureSourceRows).toBeNull();
  expect(r.predictedNormalizedRows).toBeNull();
  expect(r.exclusionReasonTotals).toBeNull();
  expect(r.strictGate5Passed).toBe(false);
  expect(r.providerCalls).toBe(0);
  expect(r.databaseWrites).toBe(0);
 });
 it("no outbound provider key, SQL DML, flight identifiers or raw output",()=>{
  expect(P4_FIDS_FILTER_REPLAY_SQL_V39).toContain("LIMIT 12");
  expect(P4_FIDS_FILTER_REPLAY_SQL_V39).toContain("raw_expired_at_utc IS NULL");
  expect(P4_FIDS_FILTER_REPLAY_SQL_V39).not.toMatch(/\bINSERT\s+INTO\b|\bUPDATE\s+clean\.|\bDELETE\s+FROM\b/i);
  const src=readFileSync("server/lib/disruption/phase4Gate5HistoricalOriginalFilterReplay_v39.ts","utf8");
  expect(src).not.toContain("fetch(");
  expect(src).not.toContain("AERODATABOX_API_KEY");
  expect(src).not.toContain("process.env");
  expect(src).not.toContain("console.log");
 });
});