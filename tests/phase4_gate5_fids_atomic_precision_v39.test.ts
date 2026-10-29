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
 it("cannot use a later FIDS response or silently redate other source columns",()=>{
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).toContain(
   "WHERE population_query_id=$19::uuid");
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).not.toMatch(/\bUPDATE\b|\bDELETE\b/);
  expect(FIDS_ATOMIC_POPULATION_VALUES_V39).not.toContain("clock_timestamp");
 });
});
