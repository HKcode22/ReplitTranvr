/** Atomic owner-only inert schema commissioning. No login, data policy,
 * key, source-rights decision, provider request, or paid enablement. Reuse the
 * three exact disposable-tested candidate SQL files; no runtime boot migration. */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import type {Pool,PoolClient} from "pg";
const root="data-collection/phase5/review-tools/";
export const P7_STORAGE_SQL_BLOBS=Object.freeze({
 [root+"p7_derived_release_storage_candidate_NOT_FOR_INSTALL.sql"]:"010ec630b0ee66e576ad28af99f60e60ff636dfd",
 [root+"p7_pre_fragment_storage_candidate_NOT_FOR_INSTALL.sql"]:"8d202ec52729100343f721da66a46a761e1a0101",
 [root+"p7_research_expiry_candidate_NOT_FOR_INSTALL.sql"]:"0f09dfd0167118a2eed973d89b5e9c66edeef7b9"
});
const roles={
 preReader:"phase7_pre_reader_prod20261120",
 postScopedReader:"phase7_post_scoped_prod20261120",
 bundleWriter:"phase7_bundle_writer_prod20261120",
 bundleReader:"phase7_bundle_reader_prod20261120",
 expiryReader:"phase7_expiry_reader_prod20261120",
 expiryWriter:"phase7_expiry_writer_prod20261120"
} as const;
export const P7_INERT_ROLES=Object.freeze(roles);
const schema="phase7_private";
const tables=["derived_release_bundle_v39","pre_fragment_v39","pre_source_link_v39","pre_preservation_policy_v39"];
const fns=[
 "canonical_pre_jsonb_v39(jsonb)",
 "persist_bound_pre_fragment_v39(text,text,bigint,uuid,uuid,text,text,text,text,bytea,text,timestamptz,timestamptz,integer,timestamptz)",
 "read_bound_pre_group_v39(text,bigint,text,text,integer,text,text)",
 "pre_link_expiry_status_v39()","sweep_due_pre_links_v39(integer)",
 "research_expiry_status_v39()","sweep_due_research_outputs_v39(integer)"
];
const hold=(s:string):never=>{throw Error("HOLD_P7_INERT_STORAGE_"+s);};
const blob=(b:Buffer)=>createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
export function compileP7InertStorageSql(read:(p:string)=>Buffer=readFileSync){
 return Object.entries(P7_STORAGE_SQL_BLOBS).map(([p,h])=>{
  const b=read(p);if(!Buffer.isBuffer(b)||blob(b)!==h)hold("EXACT_SQL_BLOB");
  const s=b.toString("utf8");
  if(!/^\s*BEGIN;\s*$/m.test(s)||!/^\s*COMMIT;\s*$/m.test(s)||!s.trimEnd().endsWith("COMMIT;"))hold("TRANSACTION_WRAPPER");
  return s.replace(/^\s*BEGIN;\s*$/m,"").replace(/^\s*COMMIT;\s*$/m,"");
 });
}
const grant={
 preReader:{table:"pre_fragment_v39",priv:"SELECT"},
 bundleWriter:{table:"derived_release_bundle_v39",priv:"INSERT"},
 bundleReader:{table:"derived_release_bundle_v39",priv:"SELECT"}
} as const;
const fnGrant={
 postScopedReader:[fns[2]],
 expiryReader:[fns[3],fns[5]],
 expiryWriter:[fns[4],fns[6]]
} as const;
async function verifyInert(c:PoolClient){
 const t=(await c.query("SELECT c.relname,pg_get_userbyid(c.relowner) owner,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind IN ('r','p','v','m','f') ORDER BY c.relname",[schema])).rows;
 if(t.length!==4||t.some(v=>!tables.includes(v.relname)||v.relkind!=="r"))hold("TABLE_SHAPE");
 const funcs=(await c.query("SELECT p.proname,p.prosecdef,p.proconfig,pg_get_userbyid(p.proowner) owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1",[schema])).rows;
 if(funcs.length!==fns.length||funcs.some(x=>!fns.some(f=>f.split("(")[0]===x.proname)||
  x.prosecdef!==(x.proname!=="canonical_pre_jsonb_v39")||JSON.stringify(x.proconfig)!==JSON.stringify(["search_path=pg_catalog, pg_temp"])))hold("FUNCTION_BOUNDARY");
 const pubs=(await c.query("SELECT (SELECT count(*)::int FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname=$1 AND a.grantee=0) schema_public,(SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname=$1 AND c.relkind='r' AND a.grantee=0) table_public,(SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname=$1 AND a.grantee=0) function_public",[schema])).rows[0];
 if(Object.values(pubs).some(x=>x!==0))hold("PUBLIC_GRANT");
 for(const [k,role] of Object.entries(roles)){
  const a=(await c.query("SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,rolinherit,EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) member,has_schema_privilege(r.oid,$2,'USAGE') can_use,has_schema_privilege(r.oid,$2,'CREATE') can_create FROM pg_roles r WHERE rolname=$1",[role,schema])).rows;
  if(a.length!==1||a[0].can_use!==true||Object.entries(a[0]).some(([n,v])=>n!=="can_use"&&v!==false))hold("ROLE_BOUNDARY");
  const g=(grant as Record<string,{table:string;priv:string}>)[k];
  for(const table of tables){
   const x=(await c.query("SELECT has_any_column_privilege($1,$2,'SELECT') r,has_any_column_privilege($1,$2,'INSERT') i,has_any_column_privilege($1,$2,'UPDATE,REFERENCES') u,has_table_privilege($1,$2,'DELETE,TRUNCATE,TRIGGER') d",[role,schema+"."+table])).rows[0];
   if(x.r!==(g?.table===table&&g.priv==="SELECT")||x.i!==(g?.table===table&&g.priv==="INSERT")||x.u!==false||x.d!==false)hold("TABLE_PRIVILEGE_DRIFT");
  }
  for(const f of fns){
   const x=(await c.query("SELECT has_function_privilege($1,$2,'EXECUTE') ok",[role,schema+"."+f])).rows[0];
   if(x.ok!==((fnGrant as Record<string,readonly string[]>)[k]??[]).includes(f))hold("FUNCTION_PRIVILEGE_DRIFT");
  }
 }
 const rows=(await c.query("SELECT (SELECT count(*)::int FROM phase7_private.derived_release_bundle_v39) bundles,(SELECT count(*)::int FROM phase7_private.pre_fragment_v39) fragments,(SELECT count(*)::int FROM phase7_private.pre_source_link_v39) links,(SELECT count(*)::int FROM phase7_private.pre_preservation_policy_v39) policies")).rows[0];
 if(Object.values(rows).some(x=>x!==0))hold("NOT_INERT");
 return {schemaRoleCount:Object.keys(roles).length,tables:t.length,functions:funcs.length,empty:true,publicGrants:0,loginRoles:0};
}
/** Runs in a single owner transaction; disposable test uses same exact
 * implementation with mock pre-existing source schemas and no provider. */
export async function installP7InertStorage(pool:Pool,assertDisabledOwner:(c:PoolClient)=>Promise<void>,read:(p:string)=>Buffer=readFileSync){
 const bodies=compileP7InertStorageSql(read);
 const c=await pool.connect();let commit=false,ack=false;
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await c.query("SET LOCAL statement_timeout='30000ms'; SET LOCAL lock_timeout='2000ms'");
  await assertDisabledOwner(c);
  if((await c.query("SELECT to_regnamespace($1) IS NOT NULL present",[schema])).rows[0].present!==false||
   (await c.query("SELECT count(*)::int n FROM pg_roles WHERE rolname=ANY($1::text[])",[Object.values(roles)])).rows[0].n!==0)hold("EXISTING_SCHEMA_OR_ROLE_NO_REPLAY");
  for(const sql of bodies)await c.query(sql);
  for(const role of Object.values(roles)){
   await c.query("CREATE ROLE "+role+" NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
   await c.query("GRANT USAGE ON SCHEMA "+schema+" TO "+role);
  }
  for(const [k,g] of Object.entries(grant))await c.query("GRANT "+g.priv+" ON "+schema+"."+g.table+" TO "+roles[k as keyof typeof roles]);
  for(const [k,funcs] of Object.entries(fnGrant))for(const fn of funcs)await c.query("GRANT EXECUTE ON FUNCTION "+schema+"."+fn+" TO "+roles[k as keyof typeof roles]);
  // Existing PRE group intentionally receives no production grant at this
  // inert step; policy and actual restricted login readback come later.
  const before=await verifyInert(c);
  await assertDisabledOwner(c);
  commit=true;await c.query("COMMIT");ack=true;
  return {status:"P7_INERT_SCHEMA_COMMITTED_AWAIT_SEPARATE_OWNER_READBACK",...before,providerCalls:0,authorizationEnabled:false,phase6PaidGo:false};
 }finally{if(!commit)await c.query("ROLLBACK").catch(()=>{});c.release(commit&&!ack?Error("P7_UNKNOWN_COMMIT_RECONCILE_NO_REPLAY"):undefined)}
}
export async function inspectP7InertStorage(pool:Pool){
 const c=await pool.connect();
 try{await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");const result=await verifyInert(c);await c.query("ROLLBACK");return {status:"P7_INERT_SCHEMA_INDEPENDENT_READBACK_NO_GO",...result,providerCalls:0,databaseWrites:0,phase6PaidGo:false};}
 finally{await c.query("ROLLBACK").catch(()=>{});c.release();}
}
