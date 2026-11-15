/** Commission exactly one missing existing-workflow credential; never activate a draw.
 * Catalog discovery before creation. No migration, provider, source/flight row or owner
 * URL in GitHub. Reuse the same ACL checker and SQL grant contract as runtime.
 */
import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";
import {Pool} from "pg";
import {EARLY_DRAW_READ_TABLES,EARLY_DRAW_INSERT_COLUMNS,EARLY_DRAW_UPDATE_COLUMNS,verifyP5EarlyDrawObjectAcl,verifyP5EarlyDrawReadonlyAcl} from "./v39_phase5_github_six_slot_early_draw_owner_v39";
const REPO="HKcode22/ReplitTranvr";
const ROLE="phase5_early_draw_prod20261115";
const URL_SECRET="V39_P5_EARLY_DRAW_DATABASE_URL";
const ROLE_SECRET="V39_P5_EARLY_DRAW_EFFECTIVE_ROLE";
const SECRET_NAMES=[URL_SECRET,ROLE_SECRET];
export const EARLY_DRAW_COMMISSION_APPROVAL="COMMISSION_MISSING_EARLY_DRAW_LOGIN_ONLY_NO_PROVIDER_NO_GO";
const CI_URL="postgresql://postgres:postgres@localhost:5432/v39_ci?sslmode=disable";
const fail=(m:string):never=>{throw Error("HOLD_P5_EARLY_DRAW_COMMISSION_"+m);};
type Env=Record<string,string|undefined>;
type Driver={mainSha:()=>Promise<string>;names:()=>Promise<string[]>;set:(name:string,value:string)=>Promise<void>;remove:(name:string)=>Promise<void>};
function admission(e:Env){
 if(e.P5_EARLY_DRAW_COMMISSION_APPROVAL!==EARLY_DRAW_COMMISSION_APPROVAL||
    !/^[a-f0-9]{40}$/.test(e.P5_EARLY_DRAW_COMMISSION_MAIN??"")||
    e.ADB_AUTO_COLLECT!=="0"||e.V39_PHASE6_PROCESS_ARMED!=="0"||e.V39_PHASE6_OWNER_APPROVED!=="0"||
    e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||e.NODE_TLS_REJECT_UNAUTHORIZED==="0")
  fail("NOT_EXACT_INERT_OWNER_SCOPE");
 const ci=e.GITHUB_ACTIONS==="true";
 if(ci&&!(e.P5_EARLY_DRAW_COMMISSION_DISPOSABLE==="1"&&e.DATABASE_URL===CI_URL))fail("NO_PRODUCTION_CI");
 let url:URL;
 try{url=new URL(e.DATABASE_URL??"");}catch{return fail("OWNER_URL_MISSING");}
 if(!ci&&(!["postgresql:","postgres:"].includes(url.protocol)||!url.hostname.endsWith(".neon.tech")||
     decodeURIComponent(url.username)!=="neondb_owner"||url.pathname!=="/neondb"||!url.password||url.hash||
     (url.port!==""&&url.port!=="5432")||url.searchParams.getAll("sslmode").length!==1||
     !["require","verify-full"].includes(url.searchParams.get("sslmode")??"")||
     [...url.searchParams.keys()].some(k=>!["sslmode","channel_binding"].includes(k))||
     (url.searchParams.has("channel_binding")&&(url.searchParams.getAll("channel_binding").length!==1||url.searchParams.get("channel_binding")!=="require"))))
  fail("NOT_EXISTING_NEON_OWNER_URL");
 return {url,ci,db:ci?"v39_ci":"neondb",main:e.P5_EARLY_DRAW_COMMISSION_MAIN!};
}
export async function commissionP5EarlyDrawOnce(pool:Pick<Pool,"connect">,driver:Driver,e:Env,
    verifyLogin:(url:string,role:string,db:string)=>Promise<unknown>){
 const ctx=admission(e);
 if(await driver.mainSha()!==ctx.main)fail("MAIN_CHANGED");
 const names=await driver.names();
 if(SECRET_NAMES.some(n=>names.includes(n)))fail("SECRET_ALREADY_EXISTS_RECONCILE_NO_OVERWRITE");
 const c=await pool.connect();let tx=false,commitAttempted=false;
 const touched:string[]=[];
 try{
  await c.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");tx=true;
  await c.query("SET LOCAL statement_timeout='15000ms'");
  await c.query("SET LOCAL lock_timeout='3000ms'");
  const who=(await c.query("SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,pg_is_in_recovery() replica,(SELECT rolcreaterole OR rolsuper FROM pg_roles WHERE rolname=current_user) creator")).rows[0];
  if(who?.db!==ctx.db||who.actor!==(ctx.ci?"postgres":"neondb_owner")||who.login!==who.actor||
     who.ver<160000||who.ver>=170000||who.replica!==false||who.creator!==true)fail("WRONG_OWNER_PRIMARY");
  if((await c.query("SELECT pg_try_advisory_xact_lock(hashtext('v39-p5-early-draw'),hashtext('credential-only')) got")).rows[0]?.got!==true)fail("OTHER_COMMISSION_ACTIVE");
  if((await c.query("SELECT count(*)::int n FROM clean.adb_phase6_authorization WHERE enabled AND revoked_at_utc IS NULL")).rows[0]?.n!==0)fail("PHASE6_ALREADY_ENABLED");
  const existing=(await c.query(`SELECT rolname FROM pg_roles WHERE rolname=$1 OR
   (rolcanlogin AND NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls) AND
    (rolname ~ '^phase[56]_.*(early.*draw|draw.*early)' OR
      (has_any_column_privilege(rolname,'clean.adb_sampling_draw','INSERT')
       AND NOT has_any_column_privilege(rolname,'clean.flight_snapshots','INSERT')
       AND NOT has_any_column_privilege(rolname,'clean.adb_phase6_authorization','INSERT'))))`,[ROLE])).rows;
  if(existing.length)fail("EXISTING_DRAW_LOGIN_RECONCILE_NO_DUPLICATE");
  const password=randomBytes(48).toString("hex");
  await c.query("CREATE ROLE "+ROLE+" LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");
  await c.query("GRANT USAGE ON SCHEMA clean TO "+ROLE);
  await c.query("GRANT SELECT ON "+EARLY_DRAW_READ_TABLES.map(t=>"clean."+t).join(",")+" TO "+ROLE);
  for(const [table,cols] of Object.entries(EARLY_DRAW_INSERT_COLUMNS))
   await c.query("GRANT INSERT ("+cols.join(",")+") ON clean."+table+" TO "+ROLE);
  for(const [table,cols] of Object.entries(EARLY_DRAW_UPDATE_COLUMNS))
   await c.query("GRANT UPDATE ("+cols.join(",")+") ON clean."+table+" TO "+ROLE);
  const seq=(await c.query("SELECT pg_get_serial_sequence('clean.adb_sampling_draw','draw_id') name")).rows[0]?.name;
  if(seq){
   if(!/^clean\\.adb_sampling_draw_[a-z0-9_]+$/.test(seq))fail("UNREVIEWED_SEQUENCE");
   await c.query("GRANT USAGE ON SEQUENCE "+seq+" TO "+ROLE);
  }
  await verifyP5EarlyDrawObjectAcl(c,ROLE);
  const membership=(await c.query("SELECT count(*)::int n FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=$1",[ROLE])).rows[0]?.n;
  if(membership!==0)fail("UNEXPECTED_ROLE_MEMBERSHIP");
  const scoped=new URL(ctx.url.toString());scoped.username=ROLE;scoped.password=password;
  if(await driver.mainSha()!==ctx.main)fail("MAIN_CHANGED_BEFORE_SECRET");
  const fresh=await driver.names();
  if(SECRET_NAMES.some(n=>fresh.includes(n)))fail("SECRET_APPEARED_NO_OVERWRITE");
  for(const [n,v] of [[URL_SECRET,scoped.toString()],[ROLE_SECRET,ROLE]]){
   touched.push(n);await driver.set(n,v);
  }
  const after=await driver.names();
  if(!SECRET_NAMES.every(n=>after.includes(n))||await driver.mainSha()!==ctx.main)fail("SECRET_READBACK_OR_MAIN_CHANGED");
  commitAttempted=true;await c.query("COMMIT");tx=false;
  await verifyLogin(scoped.toString(),ROLE,ctx.db);
  return {status:"EARLY_DRAW_LOGIN_AND_TWO_SECRETS_COMMISSIONED_NO_GO",role:ROLE,newLoginCount:1,secretNames:SECRET_NAMES,authenticatedScopedLogin:true,providerCalls:0,flightWrites:0,drawRowsWritten:0,phase6PaidGo:false};
 }catch(err){
  if(commitAttempted)fail("COMMIT_UNKNOWN_OR_POSTCOMMIT_FAILURE_NEVER_RETRY");
  let ok=true;if(tx){try{await c.query("ROLLBACK");tx=false;}catch{ok=false;}}
  for(const name of [...touched].reverse()){try{await driver.remove(name);}catch{ok=false;}}
  if(!ok)fail("ROLLBACK_OR_SECRET_CLEANUP_UNKNOWN_NEVER_RETRY");
  throw err;
 }finally{c.release();}
}
function gh(args:string[],input?:string):Promise<string>{
 return new Promise((resolve,reject)=>{
  const proc=spawn("gh",args,{stdio:["pipe","pipe","pipe"]});let out="";
  proc.stdout.on("data",x=>{out+=String(x);if(out.length>100000)proc.kill();});
  proc.stderr.on("data",()=>{});proc.on("error",()=>reject(Error("GH_COMMAND_FAILED")));
  proc.on("close",code=>code===0?resolve(out.trim()):reject(Error("GH_COMMAND_FAILED")));
  proc.stdin.on("error",()=>{});proc.stdin.end(input);
 });
}
function realDriver():Driver{
 return {mainSha:()=>gh(["api","repos/"+REPO+"/git/ref/heads/main","--jq",".object.sha"]),
  names:async()=> (await gh(["api","repos/"+REPO+"/actions/secrets","--paginate","--jq",".secrets[].name"])).split("\n").filter(Boolean),
  set:async(n,v)=>{if(!SECRET_NAMES.includes(n))fail("SECRET_SCOPE");await gh(["secret","set",n,"-R",REPO,"--app","actions"],v);},
  remove:async(n)=>{if(!SECRET_NAMES.includes(n))fail("SECRET_SCOPE");await gh(["secret","delete",n,"-R",REPO,"--app","actions"]);}
 };
}
if(process.env.P5_EARLY_DRAW_COMMISSION_APPROVAL){
 (async()=>{
  const ctx=admission(process.env);if(ctx.ci)fail("CLI_NEVER_LIVE_GITHUB");
  const pool=new Pool({connectionString:ctx.url.toString(),max:1,connectionTimeoutMillis:8000});
  try{console.log(JSON.stringify(await commissionP5EarlyDrawOnce(pool,realDriver(),process.env,async(url,role,db)=>{
   const scoped=new Pool({connectionString:url,max:1,connectionTimeoutMillis:8000});
   try{return await verifyP5EarlyDrawReadonlyAcl(scoped,role,db);}finally{await scoped.end();}
  })));}finally{await pool.end();}
 })().catch(e=>{const m=String(e?.message??"");console.error(/^HOLD_P5_EARLY_DRAW_COMMISSION_[A-Z0-9_]+$/.test(m)?m:"HOLD_P5_EARLY_DRAW_COMMISSION_DB_OR_GH_FAILURE");process.exitCode=2;});
}
