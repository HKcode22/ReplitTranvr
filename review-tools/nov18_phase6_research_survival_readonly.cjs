'use strict';
// Read-only physical research-survival inventory; not a legal retention decision.
// Existing Replit-attached DB only; no contents/identifiers, writes, provider or backup export.
const {execFileSync}=require('node:child_process');
const PIN='70580b3749544dfcbeff39da181b2aa42b1b4476',R='HKcode22/ReplitTranvr';
const hold=x=>{throw Error('HOLD_P5_RESEARCH_SURVIVAL_'+x)};
const targets=['clean.flight_snapshots','clean.flight_outcomes','clean.population_research_membership','clean.phase5_t24_postcommit_witness_v39'];
const sources=['clean.fids_query_response','clean.flight_population','clean.flight_data_pre_post','clean.raw_delivery','clean.raw_delivery_item','clean.webhook_flight_identity','clean.webhook_flight_schedule_version','clean.webhook_identity_resolution','phase6_private.frozen_native_packet_v39','phase6_private.signed_run_day_index_revision_v39'];
const all=[...targets,...sources];
const integer=x=>Number.isSafeInteger(x)&&x>=0;
function analyze(edges){
 const seen=new Set(sources),parents=new Map(),queue=[...sources];
 while(queue.length){const a=queue.shift();for(const e of edges.filter(e=>e.parent===a&&e.action==='c')){
  if(!seen.has(e.child)){seen.add(e.child);parents.set(e.child,a);queue.push(e.child);}
 }}
 const paths=targets.filter(t=>seen.has(t)).map(t=>{const p=[t];while(parents.has(p[0]))p.unshift(parents.get(p[0]));return p;});
 return {cascadePathsToResearchTables:paths,foreignKeyCascadeRisk:paths.length>0};
}
const read=async(c,sql,params=[])=> (await c.query(sql,params)).rows;
async function review(c){
 let tx=false;
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');tx=true;await c.query("SET LOCAL statement_timeout='12000ms'");
  const id=(await read(c,"SELECT current_database() db,current_user actor,session_user login,current_setting('server_version_num')::int ver,current_setting('transaction_read_only') ro,pg_is_in_recovery() replica,transaction_timestamp() t"))[0];
  if(!id||id.db!=='neondb'||id.actor!=='neondb_owner'||id.actor!==id.login||id.ver<160000||id.ver>=170000||id.ro!=='on'||id.replica!==false)hold('EXISTING_OWNER_PG16_READONLY');
  const relations=await read(c,"SELECT x.name,to_regclass(x.name) IS NOT NULL AS present FROM unnest($1::text[]) x(name)",[all]);
  if(relations.length!==all.length||relations.some(x=>!all.includes(x.name)||x.present!==true))hold('EXPECTED_SCHEMA_MISSING');
  // All clean/private FK edges, including intermediates (not only directly attached tables).
  const edges=await read(c,`SELECT pn.nspname||'.'||p.relname parent,cn.nspname||'.'||ch.relname child,k.confdeltype::text action
   FROM pg_constraint k JOIN pg_class p ON p.oid=k.confrelid JOIN pg_namespace pn ON pn.oid=p.relnamespace
   JOIN pg_class ch ON ch.oid=k.conrelid JOIN pg_namespace cn ON cn.oid=ch.relnamespace
   WHERE k.contype='f' AND pn.nspname IN ('clean','phase6_private') AND cn.nspname IN ('clean','phase6_private')`);
  if(edges.length>5000||edges.some(e=>!['a','r','c','n','d'].includes(e.action)))hold('FK_CATALOG_SCOPE');
  // Names and operation masks only. Trigger presence is not proof of its behavior.
  const triggers=await read(c,`SELECT n.nspname||'.'||cl.relname relation,t.tgname name,t.tgenabled::text enabled,
   (t.tgtype::int&4)<>0 handles_insert,(t.tgtype::int&8)<>0 handles_delete,(t.tgtype::int&16)<>0 handles_update,(t.tgtype::int&32)<>0 handles_truncate,
   pn.nspname||'.'||p.proname function_name
   FROM pg_trigger t JOIN pg_class cl ON cl.oid=t.tgrelid JOIN pg_namespace n ON n.oid=cl.relnamespace
   JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
   WHERE NOT t.tgisinternal AND n.nspname||'.'||cl.relname=ANY($1::text[]) ORDER BY 1,2`,[all]);
  if(triggers.length>500)hold('TRIGGER_SCOPE');
  const pre=await read(c,`SELECT horizon,count(*)::int total,count(*) FILTER(WHERE created_at<transaction_timestamp()-interval '7 days')::int older_than_7d,
   count(*) FILTER(WHERE created_at<transaction_timestamp()-interval '24 hours')::int older_than_24h,
   count(*) FILTER(WHERE features_json<>'[]'::jsonb)::int nonempty_features FROM clean.flight_snapshots
   WHERE prediction_state='PRE_DEPARTURE' GROUP BY horizon ORDER BY horizon`);
  const post=await read(c,`SELECT target,count(*)::int total,count(*) FILTER(WHERE updated_at<transaction_timestamp()-interval '7 days')::int updated_over_7d,
   count(*) FILTER(WHERE label_status='observed')::int observed FROM clean.flight_outcomes GROUP BY target ORDER BY target`);
  const witnesses=(await read(c,'SELECT count(*)::int total FROM clean.phase5_t24_postcommit_witness_v39'))[0];
  for(const r of [...pre,...post,witnesses])for(const [k,v] of Object.entries(r)){if(['horizon','target'].includes(k))continue;if(!integer(v)||v>r.total)hold('COUNT_SHAPE');}
  if(pre.some(r=>!['T-24h','T-6h','T-90m'].includes(r.horizon))||post.some(r=>!['gate_out','wheels_off','wheels_on','gate_in'].includes(r.target)))hold('UNKNOWN_SCOPE');
  const columns=await read(c,`SELECT n.nspname||'.'||cl.relname relation,a.attname column_name
   FROM pg_attribute a JOIN pg_class cl ON a.attrelid=cl.oid JOIN pg_namespace n ON n.oid=cl.relnamespace
   WHERE a.attnum>0 AND NOT a.attisdropped AND n.nspname||'.'||cl.relname=ANY($1::text[])
   AND a.attname ~ '(expir|retention|delet)' ORDER BY 1,2`,[targets]);
  const cascade=analyze(edges);
  const researchParents=edges.filter(e=>targets.includes(e.child)||targets.includes(e.parent));
  await c.query('ROLLBACK');tx=false;
  return {status:'ACTUAL_RESEARCH_SURVIVAL_CATALOG_AND_COUNTS_READONLY_NO_GO',main:PIN,observedAtUtc:new Date(id.t).toISOString(),pre,post,witnesses,
   researchForeignKeys:researchParents,...cascade,expiryRelatedResearchColumns:columns,nonInternalTriggers:triggers,
   noFutureDeletionGuaranteed:false,applicationDeletionPathsFullyAudited:false,derivedWorkCertified:false,accountRightsVerified:false,backupOrPitrVerified:false,
   fieldValuesExported:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
 }finally{if(tx)await c.query('ROLLBACK').catch(()=>{});}
}
async function main(){
 const e=process.env;if(e.GITHUB_ACTIONS==='true'||!e.DATABASE_URL||e.AERODATABOX_API_KEY||e.RAPIDAPI_KEY||e.AERODATABOX_WEBHOOK_SECRET||e.NODE_TLS_REJECT_UNAUTHORIZED==='0')hold('OWNER_NO_PROVIDER_ENV');
 const live=()=>execFileSync('gh',['api','repos/'+R+'/git/ref/heads/main','--jq','.object.sha'],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','ignore']}).trim();
 if(live()!==PIN)hold('MAIN_CHANGED');
 const u=new URL(e.DATABASE_URL);
 if(!['postgres:','postgresql:'].includes(u.protocol)||decodeURIComponent(u.username)!=='neondb_owner'||!u.password||!u.hostname.endsWith('.neon.tech')||u.pathname!=='/neondb'||!['require','verify-full'].includes(u.searchParams.get('sslmode'))||u.hash||[...u.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k)))hold('EXISTING_TLS_OWNER_REQUIRED');
 u.searchParams.set('sslmode','verify-full');
 const {Client}=require(require.resolve('pg',{paths:[process.cwd()]}));const c=new Client({connectionString:u.toString(),connectionTimeoutMillis:8000,query_timeout:15000,options:'-c default_transaction_read_only=on',application_name:'p5_research_survival_review'});
 try{await c.connect();const out=await review(c);if(live()!==PIN)hold('MAIN_CHANGED_AFTER_READ');console.log(JSON.stringify(out));}finally{await c.end().catch(()=>{});}
}
module.exports={analyze,review};
if(require.main===module)main().catch(e=>{console.error(/^HOLD_P5_RESEARCH_SURVIVAL_[A-Z0-9_]+$/.test(e.message)?e.message:'HOLD_P5_RESEARCH_SURVIVAL_REDACTED');process.exitCode=2;});
