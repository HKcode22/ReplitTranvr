import {afterAll,describe,expect,it} from "vitest";
import pg from "pg";
import {makeP5Stage28DedicatedRolePool,P5_STAGE28_GROUPS} from
 "../server/lib/disruption/phase5Stage28DedicatedRolePool_v39";
const {Pool}=pg;
const enabled=process.env.P5_STAGE28_DISPOSABLE_PG16_TEST==="1";
const urls={
 pre:process.env.P5_STAGE28_PRE_URL||"",
 source:process.env.P5_STAGE28_SOURCE_URL||"",
 other:process.env.P5_STAGE28_OTHER_URL||"",
 indirect:process.env.P5_STAGE28_INDIRECT_URL||""
};
const pools:InstanceType<typeof Pool>[]=[];
const pool=(k:keyof typeof urls)=>{
 const p=new Pool({connectionString:urls[k],max:2,
  connectionTimeoutMillis:2500,idleTimeoutMillis:500});
 pools.push(p);return p;
};
afterAll(async()=>{for(const p of pools)await p.end();});
describe.skipIf(!enabled)("Stage28 exact PG16 NOLOGIN role and SET privilege session isolation",()=>{
 it("PRE login can only SET PRE role, no source, budget or witness writes",async()=>{
  const p=pool("pre");
  const adapter=makeP5Stage28DedicatedRolePool(p,{
   group:"pre",reviewedDedicatedLogin:"phase5_stage28_pre_ci",
   forbiddenApplicationLogin:"phase5_runtime_app_ci"
  });
  const a=await adapter.query("SELECT current_user AS actor,session_user AS login");
  expect(a.rows).toHaveLength(1);
  expect(a.rows[0].actor).toBe(P5_STAGE28_GROUPS.pre);
  expect(a.rows[0].login).toBe("phase5_stage28_pre_ci");
  const acl=await adapter.query(
   "SELECT has_table_privilege(current_user,'clean.flight_snapshots','INSERT') AS pre,"+
   "has_table_privilege(current_user,'clean.phase5_fids_original_binding_v39','INSERT') AS source,"+
   "has_table_privilege(current_user,'clean.phase5_t24_postcommit_witness_v39','INSERT') AS witness");
  expect(acl.rows[0]).toMatchObject({pre:true,source:false,witness:false});
 });
 it("source login can only SET source role, no PRE or witness writes",async()=>{
  const p=pool("source");
  const adapter=makeP5Stage28DedicatedRolePool(p,{
   group:"source",reviewedDedicatedLogin:"phase5_stage28_source_ci",
   forbiddenApplicationLogin:"phase5_runtime_app_ci"
  });
  const q=await adapter.query("SELECT current_user AS actor");
  expect(q.rows[0].actor).toBe(P5_STAGE28_GROUPS.source);
 });
 it("login with no membership cannot impersonate PRE role",async()=>{
  const p=pool("other");
  const adapter=makeP5Stage28DedicatedRolePool(p,{
   group:"pre",reviewedDedicatedLogin:"phase5_stage28_other_ci",
   forbiddenApplicationLogin:"phase5_runtime_app_ci"
  });
  await expect(adapter.query("SELECT 1")).rejects.toThrow(
   /REFUSED_P5_STAGE28_UNREVIEWED_ROLE_LOGIN_OR_SET_PRIVILEGE/);
 });
 it("source login cannot borrow PRE group",async()=>{
  const p=pool("source");
  const adapter=makeP5Stage28DedicatedRolePool(p,{
   group:"pre",reviewedDedicatedLogin:"phase5_stage28_source_ci",
   forbiddenApplicationLogin:"phase5_runtime_app_ci"
  });
  await expect(adapter.query("SELECT 1")).rejects.toThrow(
   /REFUSED_P5_STAGE28_UNREVIEWED_ROLE_LOGIN_OR_SET_PRIVILEGE/);
 });
 it("indirect transitive SET access to another group is rejected",async()=>{
  // Direct pg_auth_members shows only SOURCE; the PRE group is reachable
  // through an intermediate CI role. Stage28 must NOT miss that path.
  const p=pool("indirect");
  const adapter=makeP5Stage28DedicatedRolePool(p,{
   group:"source",reviewedDedicatedLogin:"phase5_stage28_indirect_ci",
   forbiddenApplicationLogin:"phase5_runtime_app_ci"
  });
  await expect(adapter.query("SELECT 1")).rejects.toThrow(
    /REFUSED_P5_STAGE28_INDIRECT_CROSS_GROUP_OR_INHERITED_RUNTIME_ACCESS/);
 });
 it("forbidden shared application login always fails before DB use",async()=>{
  const p=pool("pre");
  expect(()=>makeP5Stage28DedicatedRolePool(p,{
    group:"pre",reviewedDedicatedLogin:"phase5_stage28_pre_ci",
    forbiddenApplicationLogin:"phase5_stage28_pre_ci"
   })).toThrow("REFUSED_P5_STAGE28_NO_INDEPENDENT_DEDICATED_LOGIN_SCOPE");
 });
 it("no borrowed connection leaks switched role into another checkout",async()=>{
  const p=pool("pre");
  const adapter=makeP5Stage28DedicatedRolePool(p,{
   group:"pre",reviewedDedicatedLogin:"phase5_stage28_pre_ci",
   forbiddenApplicationLogin:"phase5_runtime_app_ci"
  });
  const c=await adapter.connect();
  expect((await c.query("SELECT current_user AS actor")).rows[0].actor)
   .toBe(P5_STAGE28_GROUPS.pre);
  c.release();
  // The adapter deliberately destroys SET ROLE sessions; the plain pool
  // must yield only its actual login identity.
  const other=await p.connect();
  try{
   expect((await other.query("SELECT current_user AS actor")).rows[0].actor)
    .toBe("phase5_stage28_pre_ci");
  }finally{other.release();}
 });
});
