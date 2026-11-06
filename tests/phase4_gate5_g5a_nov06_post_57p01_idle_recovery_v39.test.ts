import {describe,it,expect} from "vitest";
import {EventEmitter} from "node:events";
import {readFileSync} from "node:fs";
import type pg from "pg";
import {attachG5APostIdlePgGuardsV39}
 from "../scripts/v39_phase4_gate5_g5a_nov06_1400z_prospective_post_schedule_observation";

describe("Nov6 G5A POST fail-closed idle 57P01 recovery",()=>{
 it("consumes actual asynchronous pg error without unhandled Node crash",()=>{
  const fake=new EventEmitter();
  const lost:string[]=[];
  attachG5APostIdlePgGuardsV39(fake as unknown as pg.Client,
   code=>lost.push(code));
  expect(()=>fake.emit("error",Object.assign(new Error(
   "terminating connection due to administrator command"),{code:"57P01"}))
  ).not.toThrow();
  expect(lost).toEqual(["57P01"]);
  fake.emit("end");
  expect(lost).toEqual(["57P01","END"]);
 });
 it("sanitizes unknown DB exception codes, never logs URL/secrets",()=>{
  const fake=new EventEmitter();
  const lost:string[]=[];
  attachG5APostIdlePgGuardsV39(fake as unknown as pg.Client,
   code=>lost.push(code));
  fake.emit("error",new Error("sensitive implementation diagnostics"));
  expect(lost).toEqual(["UNKNOWN"]);
 });
 it("guards live wait with read-only probes; no paid action replay on reconnect",()=>{
  const source=readFileSync(
   "scripts/v39_phase4_gate5_g5a_nov06_1400z_prospective_post_schedule_observation.ts",
   "utf8");
  expect(source).toContain("G5A_POST_PG_ASYNC_DISCONNECT_IDLE_ONLY");
  expect(source).toContain("G5A_POST_IDLE_DB_RECONNECTED_NO_SOURCE_REPLAY");
  expect(source).toContain('SELECT clock_timestamp() AS db_now_utc');
  expect(source).toContain("await waitUntil(ms(planned),readOnlyHealthProbe)");
  expect(source).toContain("await waitUntil(ms(FINAL),readOnlyHealthProbe)");
  expect(source).toContain("PG_IDLE_RECONNECT_UNAVAILABLE_NO_PAID_RETRY");
  expect(source).toContain("return persistFidsObservation(query,rows,async(client,facts)");
  expect(source).toContain("await reserveG5APostSlotDbV39(db,manifestSha,cohortId,i)");
  // POST chronology is immutable; the patch is an idle session repair only.
  for(const time of [
   "2026-11-06T15:40:00.000Z",
   "2026-11-06T16:10:00.000Z",
   "2026-11-06T16:40:00.000Z",
   "2026-11-06T15:25:00.000Z"
  ])expect(source).toContain(time);
 });
});
