/**
 * PR37 qualified pilot administrative source custody: exact original Git
 * blob identities without rewriting the historical YSSY outcome. Provider-free.
 */
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const expected = [
  {
    "path": "data-collection/phase2g/amendments/2026-10-14_APPROVED_PHASE2_QUALIFIED_EARLY_PILOT_EXCEPTION_AND_PHASE3_BOUNDARY.md",
    "sha": "451d82af67a9926bba778265156e4e9309a12ebd",
    "bytes": 6590
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-13_PHASE2G_EARLY_PILOT_RESEARCH_INCLUSION_MANIFEST.json",
    "sha": "33d61b27f2ab54cb418308276952dccd39ce39d0",
    "bytes": 4186
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-13_PHASE2G_RESEARCH_COHORT_INVENTORY_YSSY.md",
    "sha": "5889ab127b865558f3cf3d8a1ff6fdb6836d5c0a",
    "bytes": 9766
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_P25_SCIENTIFIC_QUALITY_DIMENSIONS_AND_GAP_PREVENTION.md",
    "sha": "996d3929975d7806c106a8b95ba18f9f4a3ff375",
    "bytes": 8321
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_PHASE2G_CLOSEOUT_CHECKPOINT_NEXT_SESSION.md",
    "sha": "8f1f7f971a1b7e40f12e9c883028e87b6fa45844",
    "bytes": 9661
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_PHASE2G_EARLY_PILOT_CLOSEOUT_PHASE3_OFFLINE_HANDOFF.md",
    "sha": "160577c2ea76b75b98ba7bd5dfd8d3ef5d63e068",
    "bytes": 9576
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_PHASE2G_GATE2_CLOSEOUT_EVIDENCE_AND_DECISION.md",
    "sha": "9bca5fce45e95dcd7bb6ed726a79230c79ae0d6e",
    "bytes": 5665
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_PHASE2G_GATE2_EARLY_PILOT_FIELDWORK_CLOSEOUT_RECORD.json",
    "sha": "121d719901d7222b5522b864cb9373343d3dfbcf",
    "bytes": 3705
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_PHASE2G_TERMINAL_DISPOSITION_AND_ENTRY_EXCEPTION_DRAFT.json",
    "sha": "a80fff587bd2aa59544aaa99561a5ec2cc5496b7",
    "bytes": 3195
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_PHASE2G_TERMINAL_FIELDWORK_CLOSEOUT_AND_EXCEPTION_BOUNDARY.md",
    "sha": "ef68ceb872cba075efc2108fc02f0458bed640b0",
    "bytes": 10036
  },
  {
    "path": "data-collection/phase2g/reports/2026-10-14_PHASE2_QUALIFIED_PILOT_OPERATOR_APPROVAL_RECORD.json",
    "sha": "cc462429e865a280e9e7b43ec51abebd04a5238e",
    "bytes": 2799
  }
] as const;
describe("Qualified Phase2 exception preserved as a separate Gate3 predecessor",()=>{
 it("preserves all eleven PR37 original Git blobs without changing source bytes",()=>{
  expect(expected).toHaveLength(11);
  for(const item of expected){
   const bytes=readFileSync(item.path);
   expect(bytes.length,item.path).toBe(item.bytes);
   const object=execFileSync("git",["hash-object","--",item.path],{encoding:"utf8"}).trim();
   expect(object,item.path).toBe(item.sha);
  }
 });
 it("does not promote original strict Gate2 or authorize provider spend",()=>{
  const decision=readFileSync("data-collection/phase2g/amendments/2026-10-14_APPROVED_PHASE2_QUALIFIED_EARLY_PILOT_EXCEPTION_AND_PHASE3_BOUNDARY.md","utf8");
  const owner=JSON.parse(readFileSync("data-collection/phase2g/reports/2026-10-14_PHASE2_QUALIFIED_PILOT_OPERATOR_APPROVAL_RECORD.json","utf8"));
  expect(decision).toContain("QUALIFIED_EARLY_PILOT_CLOSED_BY_OPERATOR_EXCEPTION");
  expect(owner.original_gate2.status).toBe("NOT_PASSED_UNCHANGED");
  expect(owner.change_permissions.paid_provider_calls).toBe(false);
  expect(owner.change_permissions.production_deploy).toBe(false);
  expect(owner.change_permissions.main_merge).toBe(false);
  expect(owner.yssy.original_reconciliation).toBe("DELIVERY_GAP");
  expect(owner.yssy.settled_provider_billed_credit_units).toBe(231);
  expect(owner.yssy.internal_saved_item_credit_claims).toBe(229);
 });
});
