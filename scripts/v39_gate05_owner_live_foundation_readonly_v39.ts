/**
 * Gate05 owner-operated READ-ONLY foundation preflight.
 *
 * Reads GitHub repository/environment metadata and PostgreSQL catalog/ledger.
 * No AeroDataBox import, no credential creation, no workflow dispatch, no
 * GH issue/secret mutation, and no production BEGIN WRITE or migrations.
 * A PASS here is NOT live-safety ARMED, signer attestation, or paid GO.
 */
import "dotenv/config";
import pg from "pg";
import {execFileSync,spawnSync} from "node:child_process";

const REPO="HKcode22/ReplitTranvr";
const OWNER="HKcode22";
const ENV="gate05-safety";
const GROUPS={
  commission:"gate05_fids_commission_v39",
  activate:"gate05_fids_activate_v39",
  dispatch:"gate05_fids_dispatch_v39",
  safety:"gate05_fids_safety_v39"
} as const;
type Action=keyof typeof GROUPS;
const FUNCTIONS:{
  [A in Action]:string
}={
  commission:"clean.prepare_gate05_permitted_scope_v39(uuid,text)",
  activate:"clean.activate_gate05_prepared_scope_v39(uuid,text)",
  dispatch:"clean.reserve_gate05_fids_attempt_v39(uuid,uuid,text,text,text,text,text,text,integer,integer)",
  safety:"clean.stop_gate05_fids_pilot_v39(uuid,text)"
};
const SHA=/^[0-9a-f]{40}$/;
function hold(reason:string):never{
  throw Error("GATE05_LIVE_READONLY_HOLD_"+reason);
}
export type Gate05FoundationFactsV39={
  repoHead:string;
  expectedHead:string;
  db:string;
  databaseUser:string;
  replica:boolean;
  groups:Record<Action,{exists:boolean;canLogin:boolean;restricted:boolean}>;
  acl:Record<Action,Record<Action,boolean>>;
  directTableWrites:Record<Action,number>;
  prepared:number;
  active:number;
  unusedPermits:number;
  candidateLogins:{name:string;expiryUtc:string|null;canLogin:boolean}[];
  githubOwner:boolean;
  githubAdmin:boolean;
  reviewerProtected:boolean;
  mainOnly:boolean;
  requiredSecrets:Record<string,boolean>;
};
export function assessGate05LiveFoundationV39(x:Gate05FoundationFactsV39){
  const holds:string[]=[];
  if(!SHA.test(x.expectedHead)||x.repoHead!==x.expectedHead)
    holds.push("RELEASE_SHA");
  if(x.db!=="neondb"||x.databaseUser!=="neondb_owner"||x.replica!==false)
    holds.push("DATABASE_IDENTITY");
  for(const action of Object.keys(GROUPS) as Action[]){
    const group=x.groups[action];
    if(!group?.exists||group.canLogin||!group.restricted)
      holds.push("GROUP_"+action.toUpperCase());
    for(const f of Object.keys(FUNCTIONS) as Action[]){
      if(x.acl[action]?.[f] !== (action===f))
        holds.push("ACL_"+action.toUpperCase()+"_"+f.toUpperCase());
    }
    if(x.directTableWrites[action]!==0)
      holds.push("TABLE_UPDATE_"+action.toUpperCase());
  }
  if(x.prepared!==0||x.active!==0)holds.push("OPEN_SCOPE");
  if(x.unusedPermits!==0)holds.push("UNUSED_PERMIT");
  if(!x.githubOwner||!x.githubAdmin||!x.reviewerProtected||
     !x.mainOnly)holds.push("GITHUB_PROTECTION");
  for(const name of ["GATE05_SAFETY_DATABASE_URL",
    "GATE05_EXPECTED_DB_HOST"]){
    if(x.requiredSecrets[name]!==true)holds.push("SECRET_"+name);
  }
  // A pre-spend foundation readback never proves that a future workflow,
  // short-lived login, signer, provider right or alert is healthy.
  const unfinished:string[]=[];
  for(const name of ["GATE05_SIGNED_BUNDLE_B64",
    "GATE05_INDEPENDENT_PINS_B64"]){
    if(x.requiredSecrets[name]!==true)unfinished.push(name+"_MISSING");
  }
  unfinished.push("FRESH_FOUR_LOGIN_AUTH_NOT_VERIFIED",
    "INDEPENDENT_STOP_NOT_ARMED",
    "OWNER_SIGNATURE_AND_PROVIDER_RIGHTS_NOT_ATTESTED",
    "ALERT_AND_STOP_RECEIPT_NOT_LIVE_VERIFIED");
  return {
    schema:"v39.gate05.owner-readonly-foundation.v1" as const,
    foundationPass:holds.length===0,
    status:holds.length===0?
      "FOUNDATION_VERIFIED_BUT_PAID_NO_GO" as const:
      "FOUNDATION_HOLD" as const,
    holds,
    unfinished,
    paidGo:false as const,
    providerRequests:0 as const,
    databaseWrites:0 as const,
    githubMutations:0 as const
  };
}
function gh(args:string[]):any{
  const result=spawnSync("gh",args,{encoding:"utf8",
    stdio:["ignore","pipe","pipe"],timeout:15000,
    maxBuffer:1024*1024});
  if(result.status!==0||result.error)hold("GH_READ");
  try{return JSON.parse(result.stdout);}catch{return hold("GH_RESPONSE");}
}
async function run(){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=="--head"||!SHA.test(args[1]))
    hold("CLI_HEAD");
  const expectedHead=args[1];
  const local=execFileSync("git",["rev-parse","HEAD"],{
    encoding:"utf8",stdio:["ignore","pipe","ignore"]
  }).trim();
  if(local!==expectedHead)hold("LOCAL_HEAD");
  const main=gh(["api",`repos/${REPO}/git/ref/heads/main`]);
  const account=gh(["api","user"]);
  const repo=gh(["api",`repos/${REPO}`]);
  const env=gh(["api",`repos/${REPO}/environments/${ENV}`]);
  const secretList=gh(["api",`repos/${REPO}/environments/${ENV}/secrets`]);
  const branches=gh(["api",
    `repos/${REPO}/environments/${ENV}/deployment-branch-policies`]);
  if(!process.env.DATABASE_URL)hold("DATABASE_URL_ABSENT");
  const db=new pg.Client({connectionString:process.env.DATABASE_URL,
    connectionTimeoutMillis:7000,statement_timeout:9000,
    query_timeout:11000,application_name:"gate05_foundation_readonly"});
  let connected=false;
  try{
    await db.connect();connected=true;
    await db.query("BEGIN READ ONLY");
    const who=(await db.query(
      "SELECT current_database() AS db,current_user AS actor,"+
      "pg_is_in_recovery() AS replica,clock_timestamp() AS observed_utc"
    )).rows[0];
    // Block catalog reads against the wrong DB instead of auditing a decoy.
    if(who.db!=="neondb"||who.actor!=="neondb_owner"||
       who.replica!==false)hold("DATABASE_IDENTITY");
    const groups={} as Gate05FoundationFactsV39["groups"];
    const acl={} as Gate05FoundationFactsV39["acl"];
    const directTableWrites={} as Gate05FoundationFactsV39["directTableWrites"];
    const oids={} as Record<Action,string>;
    for(const action of Object.keys(FUNCTIONS) as Action[]){
      const q=(await db.query(
        "SELECT to_regprocedure($1)::oid::text AS oid",
        [FUNCTIONS[action]])).rows[0];
      if(!q?.oid)hold("MISSING_FUNCTION_"+action.toUpperCase());
      oids[action]=q.oid;
    }
    for(const action of Object.keys(GROUPS) as Action[]){
      const group=GROUPS[action];
      const role=(await db.query(
        "SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,"+
        "rolreplication,rolbypassrls,rolinherit "+
        "FROM pg_roles WHERE rolname=$1",[group])).rows;
      const row=role[0];
      groups[action]={
        exists:role.length===1,
        canLogin:row?.rolcanlogin??true,
        restricted:role.length===1 && !row.rolsuper &&
          !row.rolcreatedb && !row.rolcreaterole &&
          !row.rolreplication && !row.rolbypassrls &&
          !row.rolinherit
      };
      acl[action]={} as Record<Action,boolean>;
      for(const fn of Object.keys(FUNCTIONS) as Action[]){
        acl[action][fn]=(await db.query(
          "SELECT has_function_privilege($1,$2::oid,'EXECUTE') AS allowed",
          [group,oids[fn]])).rows[0].allowed;
      }
      const table=(await db.query(
        "SELECT count(*)::int AS n FROM pg_catalog.pg_class c "+
        "JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace "+
        "WHERE n.nspname='clean' AND c.relname = ANY($1::text[]) "+
        "AND has_table_privilege($2,c.oid,'UPDATE')",
        [[
          "gate05_fids_pilot_scope_v39",
          "gate05_fids_allowed_query_v39",
          "gate05_fids_attempt_v39",
          "gate05_fids_commission_permit_v39"
        ],group]
      )).rows[0];
      directTableWrites[action]=table.n;
    }
    const inventory=(await db.query(
      "SELECT "+
      "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
      " WHERE state='PREPARED') AS prepared,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_pilot_scope_v39 "+
      " WHERE state='ACTIVE') AS active,"+
      "(SELECT count(*)::int FROM clean.gate05_fids_commission_permit_v39 "+
      " WHERE consumed_at_utc IS NULL AND revoked_at_utc IS NULL) AS unused"
    )).rows[0];
    const logins=(await db.query(
      "SELECT rolname,rolcanlogin,rolvaliduntil "+
      "FROM pg_roles WHERE rolname LIKE 'gate05_fids_%login%' "+
      "ORDER BY rolname"
    )).rows.map(x=>({name:x.rolname,canLogin:x.rolcanlogin,
      expiryUtc:x.rolvaliduntil instanceof Date?
        x.rolvaliduntil.toISOString():
        x.rolvaliduntil==null?null:String(x.rolvaliduntil)}));
    const reviewer=(env.protection_rules??[]).some((x:any)=>
      x.type==="required_reviewers" &&
      (x.reviewers??[]).some((z:any)=>
        z.type==="User"&&z.reviewer?.id===account.id
      ));
    const names=new Set<string>((secretList.secrets??[]).map(
      (x:any)=>x.name as string
    ));
    const requiredSecrets:Record<string,boolean>={};
    for(const name of [
      "GATE05_SAFETY_DATABASE_URL",
      "GATE05_EXPECTED_DB_HOST",
      "GATE05_SIGNED_BUNDLE_B64",
      "GATE05_INDEPENDENT_PINS_B64"
    ])requiredSecrets[name]=names.has(name);
    const facts:Gate05FoundationFactsV39={
      repoHead:main.object?.sha,expectedHead,
      db:who.db,databaseUser:who.actor,replica:who.replica,
      groups,acl,directTableWrites,
      prepared:inventory.prepared,active:inventory.active,
      unusedPermits:inventory.unused,
      candidateLogins:logins,
      githubOwner:account.login===OWNER,
      githubAdmin:repo.permissions?.admin===true,
      reviewerProtected:reviewer,
      mainOnly:env.deployment_branch_policy?.custom_branch_policies===true &&
        (branches.branch_policies??[]).length===1 &&
        branches.branch_policies[0]?.name==="main",
      requiredSecrets
    };
    const result=assessGate05LiveFoundationV39(facts);
    console.log("GATE05_LIVE_FOUNDATION_READONLY",JSON.stringify({
      observedUtc:who.observed_utc,main:expectedHead,
      roleMatrixPass:!result.holds.some(x=>
        x.startsWith("ACL_")||x.startsWith("GROUP_")||
        x.startsWith("TABLE_UPDATE_")),
      openScopes:inventory.prepared+inventory.active,
      unusedPermits:inventory.unused,
      olderLoginExpiries:logins,
      protectedEnvironment:result.holds.includes("GITHUB_PROTECTION")?
        "HOLD":"CONFIGURED_NOT_ARMED",
      secretNamesPresent:requiredSecrets,
      ...result
    },null,2));
    if(!result.foundationPass)process.exitCode=2;
  }finally{
    if(connected){
      await db.query("ROLLBACK").catch(()=>{});
      await db.end().catch(()=>{});
    }
  }
}
if(import.meta.url===`file://${process.argv[1]}`){
  run().catch(err=>{
    const msg=err instanceof Error?err.message:"";
    console.error("GATE05_LIVE_READONLY_AUDIT_HOLD",JSON.stringify({
      code:/^GATE05_LIVE_READONLY_HOLD_/.test(msg)?msg:
        "OPERATOR_INVESTIGATION_REQUIRED",
      databaseWrites:0,providerRequests:0,githubMutations:0
    }));
    process.exitCode=2;
  });
}
