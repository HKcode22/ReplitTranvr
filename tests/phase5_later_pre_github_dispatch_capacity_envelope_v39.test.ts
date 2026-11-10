import {describe,it,expect} from "vitest";
import {assessP5SignedLaterPreGithubCapacity,
 type P5CapacitySignedLaterFlightHorizon}
 from "../server/lib/disruption/phase5LaterPreGithubDispatchCapacityEnvelope_v39";

const sha="a".repeat(64);
const native="2027-02-10T12:00:00.000Z";
const packet=(id:number,horizon:"T-6h"|"T-90m"="T-6h",
 registeredAtUtc="2027-02-10T04:20:00.000Z"):
 P5CapacitySignedLaterFlightHorizon=>({
  packetPath:"data-collection/phase5/frozen/native_flight_"+
   String(id).padStart(4,"0")+"_"+horizon.replace("-","_")+".json",
  flightInstanceId:"leg:native:"+id,
  horizon,selectedTNativeUtc:native,registeredAtUtc,
  packetSha256:sha
 });
function polls(start:string,n:number){
 const ms=Date.parse(start);
 return Array.from({length:n},(_,i)=>
  new Date(ms+i*600000).toISOString());
}
describe("Phase5 GitHub later PRE 4 per 10m optimistic capacity envelope",()=>{
 it("identifies overloaded 100 native T6 requests: only 32 available child slots",()=>{
  const packets=Array.from({length:100},(_,i)=>packet(i));
  const audit=assessP5SignedLaterPreGithubCapacity(
   packets,polls("2027-02-10T04:30:00.000Z",8),
   "2027-02-10T06:00:00.000Z");
  expect(audit.nominalRequestsPerContinuousHour).toBe(24);
  expect(audit.simulatedPolls).toBe(8);
  expect(audit.optimisticAcceptedRequests).toBe(32);
  expect(audit.prospectiveCapacityMisses).toBe(68);
  expect(audit.publishedTooLate).toBe(0);
  expect(audit.capacityMeasuredFromProduction).toBe(false);
  expect(audit.actualPreSnapshotsCommitted).toBe(0);
  expect(audit.providerCalls).toBe(0);
  expect(audit.phase6PaidGoGranted).toBe(false);
 });
 it("separately considers one flight's two native PRE horizons",()=>{
  const [t6,t90]=[packet(1),packet(1,"T-90m",
    "2027-02-10T08:50:00.000Z")];
  const x=assessP5SignedLaterPreGithubCapacity(
   [t6,t90],
   ["2027-02-10T04:30:00.000Z","2027-02-10T09:00:00.000Z"],
   "2027-02-10T11:00:00.000Z");
  expect(x.optimisticAcceptedRequests).toBe(2);
  expect(x.results.map(r=>r.cutoffUtc)).toEqual([
   "2027-02-10T06:00:00.000Z",
   "2027-02-10T10:30:00.000Z"
  ]);
 });
 it("never treats a registered-after-cutoff flight as prospective",()=>{
  const x=assessP5SignedLaterPreGithubCapacity(
   [packet(1,"T-6h","2027-02-10T05:46:00.000Z")],
   polls("2027-02-10T04:30:00.000Z",8),
   "2027-02-10T06:00:00.000Z");
  expect(x.publishedTooLate).toBe(1);
  expect(x.optimisticAcceptedRequests).toBe(0);
  expect(x.results[0].optimisticDispatchPollUtc).toBeNull();
 });
 it("missing GH ticks only reduce capacity, never silently create extra time",()=>{
  const x=assessP5SignedLaterPreGithubCapacity(
   Array.from({length:100},(_,i)=>packet(i)),
   polls("2027-02-10T04:30:00.000Z",4),
   "2027-02-10T06:00:00.000Z");
  expect(x.optimisticAcceptedRequests).toBe(16);
  expect(x.prospectiveCapacityMisses).toBe(84);
 });
 it("unfinished future horizon remains unassessed rather than invalidated",()=>{
  const x=assessP5SignedLaterPreGithubCapacity(
   [packet(1,"T-90m","2027-02-10T04:00:00.000Z")],
   ["2027-02-10T04:30:00.000Z"],
   "2027-02-10T05:00:00.000Z");
  expect(x.futureUnassessed).toBe(1);
  expect(x.prospectiveCapacityMisses).toBe(0);
 });
 it("refuses duplicate flights/horizons and counterfeit source signature",()=>{
  const one=packet(1);
  expect(()=>assessP5SignedLaterPreGithubCapacity(
   [one,one],polls("2027-02-10T04:30:00.000Z",8),
    "2027-02-10T06:00:00.000Z"))
   .toThrow("UNSIGNED_DUPLICATE_OR_INVALID_NATIVE_HORIZON");
  expect(()=>assessP5SignedLaterPreGithubCapacity(
   [{...one,packetSha256:"unknown"}],
   polls("2027-02-10T04:30:00.000Z",8),
   "2027-02-10T06:00:00.000Z"))
   .toThrow("UNSIGNED_DUPLICATE_OR_INVALID_NATIVE_HORIZON");
 });
 it("refuses impossible faster-than-GH-cron tick grids and rate overrides",()=>{
  const one=packet(1);
  expect(()=>assessP5SignedLaterPreGithubCapacity(
   [one],["2027-02-10T04:30:00.000Z",
          "2027-02-10T04:31:00.000Z"],
   "2027-02-10T06:00:00.000Z"))
   .toThrow("IMPOSSIBLE_OR_FUTURE_GITHUB_POLL_GRID");
  expect(()=>assessP5SignedLaterPreGithubCapacity(
   [one],polls("2027-02-10T04:30:00.000Z",1),
   "2027-02-10T06:00:00.000Z",5))
   .toThrow("UNBOUNDED_OR_OVERCAPACITY_MODEL");
  expect(()=>assessP5SignedLaterPreGithubCapacity(
   [one],["2027-02-10T06:10:00.000Z"],
   "2027-02-10T06:00:00.000Z"))
   .toThrow("IMPOSSIBLE_OR_FUTURE_GITHUB_POLL_GRID");
 });
 it("uses earliest deadline first, not data/model outcome as priority",()=>{
  const first={...packet(1),selectedTNativeUtc:
   "2027-02-10T12:10:00.000Z"};
  const earlier=packet(2);
  const x=assessP5SignedLaterPreGithubCapacity(
   [first,earlier],
   ["2027-02-10T04:40:00.000Z"],
   "2027-02-10T06:20:00.000Z",1);
  expect(x.optimisticAcceptedRequests).toBe(1);
  expect(x.results.find(r=>r.optimisticDispatchPollUtc)!.
   flightInstanceId).toBe("leg:native:2");
 });
});
