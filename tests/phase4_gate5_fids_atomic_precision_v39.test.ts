import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {FIDS_ATOMIC_POPULATION_VALUES_V39}
 from "../server/lib/disruption/fidsCensus_v3";
describe("future FIDS raw receipt available-at microsecond custody",()=>{
 it("row 28 availability uses original DB raw receipt, not only rounded JS Date",()=>{
  const expressions=FIDS_ATOMIC_POPULATION_VALUES_V39.split(/,(?![^()]*\))/);
  // The single available_at slot uses GREATEST and a correlated raw receipt.
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).toContain(
   "(SELECT GREATEST($28::timestamptz, q.available_at) FROM clean.fids_query_response q WHERE q.population_query_id=$19::uuid)");
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39.startsWith("$1,$2,$3,")).toBe(true);
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39.endsWith(",$33,$34")).toBe(true);
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).not.toContain("date_trunc");
  expect(expressions.length).toBeGreaterThanOrEqual(34);
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).toContain("SELECT GREATEST");
 });
 it("limits database timestamp binding to atomic raw-plus-member writer",()=>{
  const source=readFileSync("server/lib/disruption/fidsCensus_v3.ts","utf8");
  const raw=source.indexOf("export async function persistFidsObservation");
  const standalone=source.indexOf("export async function persistPopulationRows");
  const binding="VALUES (${FIDS_ATOMIC_POPULATION_VALUES_V39})";
  expect(standalone).toBeGreaterThan(0);
  expect(raw).toBeGreaterThan(standalone);
  expect(source.slice(standalone,raw)).not.toContain(binding);
  expect(source.slice(raw)).toContain(binding);
  expect(source.slice(standalone,raw)).toContain("Array.from({ length: 34 }");
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39.split(",").length).toBeGreaterThanOrEqual(34);
 });
 it("cannot use a later FIDS response or silently redate other source columns",()=>{
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).toContain(
   "WHERE q.population_query_id=$19::uuid");
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).not.toMatch(/\bUPDATE\b|\bDELETE\b/);
  // Only the matching query's original receipt is visible to this scalar read.
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).toContain("FROM clean.fids_query_response q");
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).toContain("q.available_at");
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).not.toContain("COALESCE");
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).not.toContain("clock_timestamp");
 });
});
