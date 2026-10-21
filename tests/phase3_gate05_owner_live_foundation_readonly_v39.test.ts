import {describe,it,expect} from "vitest";
import {
  assessGate05LiveFoundationV39,
  type Gate05FoundationFactsV39
} from "../scripts/v39_gate05_owner_live_foundation_readonly_v39";

const actions=["commission","activate","dispatch","safety"] as const;
const HEAD="6".repeat(40);
const baseline=():Gate05FoundationFactsV39=>{
  const groups={} as Gate05FoundationFactsV39["groups"];
  const acl={} as Gate05FoundationFactsV39["acl"];
  const directTableWrites={} as Gate05FoundationFactsV39["directTableWrites"];
  for(const group of actions){
    groups[group]={exists:true,canLogin:false,restricted:true};
    acl[group]={} as Record<typeof actions[number],boolean>;
    for(const fn of actions)acl[group][fn]=group===fn;
    directTableWrites[group]=0;
  }
  return {
    repoHead:HEAD,expectedHead:HEAD,
    db:"neondb",databaseUser:"neondb_owner",replica:false,
    groups,acl,directTableWrites,prepared:0,active:0,unusedPermits:0,
    candidateLogins:[],
    githubOwner:true,githubAdmin:true,reviewerProtected:true,mainOnly:true,
    requiredSecrets:{
      GATE05_SAFETY_DATABASE_URL:true,
      GATE05_EXPECTED_DB_HOST:true,
      GATE05_SIGNED_BUNDLE_B64:false,
      GATE05_INDEPENDENT_PINS_B64:false
    }
  };
};

describe("Gate05 production-readonly foundation policy: zero I/O",()=>{
  it("recognizes safe foundation while refusing to assert paid readiness",()=>{
    const result=assessGate05LiveFoundationV39(baseline());
    expect(result.foundationPass).toBe(true);
    expect(result.status).toBe("FOUNDATION_VERIFIED_BUT_PAID_NO_GO");
    expect(result.paidGo).toBe(false);
    expect(result.providerRequests).toBe(0);
    expect(result.databaseWrites).toBe(0);
    expect(result.githubMutations).toBe(0);
    expect(result.unfinished).toContain("INDEPENDENT_STOP_NOT_ARMED");
    expect(result.unfinished).toContain(
      "GATE05_SIGNED_BUNDLE_B64_MISSING"
    );
  });
  it("fails closed for wrong release, DB, open scopes or unused permits",()=>{
    for(const variant of [
      {repoHead:"f".repeat(40)},
      {db:"shadowdb"},
      {databaseUser:"ordinary_app"},
      {replica:true},
      {prepared:1},
      {active:1},
      {unusedPermits:1}
    ]){
      const x=assessGate05LiveFoundationV39({
        ...baseline(),...variant
      });
      expect(x.foundationPass).toBe(false);
      expect(x.paidGo).toBe(false);
      expect(x.holds.length).toBeGreaterThan(0);
    }
  });
  it("rejects privilege bleed, login-enabled groups and any table writes",()=>{
    const x=baseline();
    x.acl.dispatch.safety=true;
    x.groups.commission.canLogin=true;
    x.directTableWrites.activate=1;
    const result=assessGate05LiveFoundationV39(x);
    expect(result.holds).toContain("ACL_DISPATCH_SAFETY");
    expect(result.holds).toContain("GROUP_COMMISSION");
    expect(result.holds).toContain("TABLE_UPDATE_ACTIVATE");
    expect(result.paidGo).toBe(false);
  });
  it("rejects disabled protections and missing protected STOP secret names",()=>{
    const x=baseline();
    x.reviewerProtected=false;
    x.mainOnly=false;
    x.requiredSecrets.GATE05_SAFETY_DATABASE_URL=false;
    const y=assessGate05LiveFoundationV39(x);
    expect(y.holds).toContain("GITHUB_PROTECTION");
    expect(y.holds).toContain("SECRET_GATE05_SAFETY_DATABASE_URL");
    expect(y.foundationPass).toBe(false);
  });
  it("never calls paid GO even when all four secret names are present",()=>{
    const x=baseline();
    x.requiredSecrets.GATE05_SIGNED_BUNDLE_B64=true;
    x.requiredSecrets.GATE05_INDEPENDENT_PINS_B64=true;
    const result=assessGate05LiveFoundationV39(x);
    expect(result.foundationPass).toBe(true);
    expect(result.unfinished).toContain("INDEPENDENT_STOP_NOT_ARMED");
    expect(result.paidGo).toBe(false);
  });
});
