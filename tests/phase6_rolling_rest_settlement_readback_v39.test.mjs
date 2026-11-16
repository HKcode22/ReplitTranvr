import test from "node:test";
import assert from "node:assert/strict";
import {summarizeP6RestLedger,readP6RestLedgerAccounting,P6_SOURCE_RESERVATION_SQL,P6_OTHER_RESERVATION_SQL,P6_CATEGORY_ACCOUNTING_SQL} from "../server/lib/disruption/phase6RollingRestSettlementReadback_v39.mjs";
const manifest="a".repeat(64),epochUtc="2030-01-01T00:00:00.000Z",chainDeadlineUtc="2030-01-01T02:00:00.000Z",observedAt=new Date("2030-01-01T02:10:00.000Z");
const input={manifestSha256:manifest,epochUtc,chainDeadlineUtc,paidCapableChildRuns:[
 {lane:"SOURCE",parentRunId:10001,runId:20001},{lane:"POST",parentRunId:10001,runId:20002},{lane:"SOURCE",parentRunId:10002,runId:20003}]};
const sourceRows=[{run_id:"20001",units:2,reserved_at:new Date("2030-01-01T00:01:00.000Z"),original_state:"COMMITTED_SOURCE_BINDING_METADATA"}];
const otherRows=[{run_id:"20002",units:2,reserved_at:new Date("2030-01-01T02:01:00.000Z"),category:"OUTCOME_REST_UNIT_BUDGET",original_state:"NO_ORIGINAL_METADATA"}];
const categoryRows=["FIDS_BASE_UNITS","FIDS_SPLIT_UNITS","FIDS_RETRY_UNIT_BUDGET","VALIDATION_UNIT_BUDGET","OUTCOME_REST_UNIT_BUDGET","HISTORY_BOOTSTRAP_UNIT_BUDGET","DIAGNOSTIC_UNIT_BUDGET"].map(category=>({day:"2030-01-01",category,planned_units:20,reserved_units:["FIDS_BASE_UNITS","OUTCOME_REST_UNIT_BUDGET"].includes(category)?2:0,ledger_units:["FIDS_BASE_UNITS","OUTCOME_REST_UNIT_BUDGET"].includes(category)?2:0}));
const fixtures={sourceRows,otherRows,categoryRows,observedAt,unattributedReservationCount:0};
test("distinguish committed metadata, reserved without original, no reservation, and late operation; no inferred billed amount",()=>{
 const o=summarizeP6RestLedger(input,fixtures);
 assert.equal(o.knownChildReservedUnits,4);assert.equal(o.knownChildCommittedOriginalMetadataCount,1);
 assert.equal(o.children[1].reservationsAtOrAfterChainDeadline,1);
 assert.equal(o.children[2].disposition,"NO_RESERVATION_ROW_FOUND_NOT_BILL_PROOF");
 assert.equal(o.manifestCategoryAccounting.completeAndConsistent,true);
 assert.equal(o.actualProviderBilledUnitsVerified,false);assert.equal(o.permitClose,false);
});
test("duplicates, foreign ID, wrong category or discrepant ledger are never silently accepted",()=>{
 assert.throws(()=>summarizeP6RestLedger({...input,paidCapableChildRuns:[...input.paidCapableChildRuns,input.paidCapableChildRuns[0]]},fixtures),/CHILD_SCOPE/);
 assert.throws(()=>summarizeP6RestLedger(input,{...fixtures,sourceRows:[{...sourceRows[0],run_id:"99999"}]}),/RESERVATION_METADATA/);
 const o=summarizeP6RestLedger(input,{...fixtures,otherRows:[{...otherRows[0],category:"DIAGNOSTIC_UNIT_BUDGET",original_state:"NOT_POST_CATEGORY"}],categoryRows:categoryRows.slice(1)});
 assert.equal(o.children[1].disposition,"MULTIPLE_OR_WRONG_RESERVATION_SCOPE");
 assert.equal(o.manifestCategoryAccounting.completeAndConsistent,false);
});
test("owner reader uses repeatable-read READ ONLY and exact manifest/run IDs, always rolls back",async()=>{
 const calls=[],client={query:async(s,args)=>{
  calls.push({s,args});
  if(s.startsWith("SELECT current_database"))return {rows:[{db:"neondb",actor:"neondb_owner",login:"neondb_owner",ver:160016,replica:false,ro:"on",isolation:"repeatable read",at:observedAt}]};
  if(s===P6_SOURCE_RESERVATION_SQL)return {rows:sourceRows};
  if(s===P6_OTHER_RESERVATION_SQL)return {rows:otherRows};
  if(s===P6_CATEGORY_ACCOUNTING_SQL)return {rows:categoryRows};
  if(s.includes("SELECT count(*)::int n FROM ("))return {rows:[{n:0}]};
  return {rows:[]};
 }};
 const o=await readP6RestLedgerAccounting(input,client);
 assert.equal(o.readOnlyRepeatableRead,true);assert.equal(calls[0].s,"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");assert.equal(calls.at(-1).s,"ROLLBACK");
 assert.deepEqual(calls.find(x=>x.s===P6_OTHER_RESERVATION_SQL).args,[manifest,["20001","20002","20003"]]);
 const bad={query:async(s,args)=>{if(s===P6_OTHER_RESERVATION_SQL)throw Error("injected db failure");return client.query(s,args);}};
 await assert.rejects(readP6RestLedgerAccounting(input,bad),/injected/);assert.equal(calls.at(-1).s,"ROLLBACK");
});

test("historical expired source binding is separate from missing/drift and cannot be used as retained byte or billing evidence",()=>{
 const o=summarizeP6RestLedger(input,{...fixtures,sourceRows:[{...sourceRows[0],original_state:"EXPIRED_SOURCE_BINDING_METADATA_ONLY"}]});
 assert.equal(o.children[0].disposition,"EXPIRED_SOURCE_BINDING_METADATA_ONLY");
 assert.equal(o.knownChildCommittedOriginalMetadataCount,1);
 assert.equal(o.knownChildExpiredSourceBindingMetadataCount,1);
 assert.equal(o.sourceOriginalBytesIndependentlyVerified,false);assert.equal(o.permitClose,false);
});
