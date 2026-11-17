'use strict';
// Owner-local name-only release inventory against the existing exact static map.
// No configuration changes, secret values, DB, provider requests or dispatch.
const fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const REPO='HKcode22/ReplitTranvr',PIN='6f518add10d00567a95fbcaf3650ebf608da8a60',TREE='ccf9f6665e3a8547476651a17efcf2261d32c53c';
const STATIC='d0097f8e8afc63f981a96c2de945339c4e498b35',COMPACT='6b626c5f34a0891d1322eb150d97456a7ed95d02';
const check=(ok,k)=>{if(!ok)throw Error('HOLD_P5_CURRENT_METADATA_'+k)};
const name=/^[A-Z_][A-Z0-9_]*$/;
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
function summarize(staticIndex,compact,secretNames,variables){
 check(staticIndex?.jobs?.length===15&&new Set(staticIndex.jobs.map(x=>x.workflow)).size===11&&compact?.signingKeyGroups?.length===6,'INDEX_SCOPE');
 check(Array.isArray(secretNames)&&secretNames.every(x=>name.test(x))&&new Set(secretNames).size===secretNames.length,'SECRET_NAME_SHAPE');
 check(Array.isArray(variables)&&variables.every(x=>name.test(x.name)&&typeof x.value==='string')&&new Set(variables.map(x=>x.name)).size===variables.length,'VARIABLE_SHAPE');
 const present=new Set(secretNames),v=new Map(variables.map(x=>[x.name,x.value]));
 const names=(xs)=>{check(Array.isArray(xs)&&xs.every(x=>name.test(x))&&new Set(xs).size===xs.length,'REFERENCE_NAME_SHAPE');return {present:xs.filter(x=>present.has(x)),missing:xs.filter(x=>!present.has(x))};};
 const flags=(spec)=>Object.entries(spec).map(([k,want])=>({name:k,state:!v.has(k)?'UNSET':v.get(k)===want?'MATCHES_REFERENCE':'OTHER_VALUE'}));
 const stages={calendar:names(staticIndex.first_stage.calendar_required_names),cost:names(staticIndex.first_stage.cost_required_names)};
 const scopeNames=[...new Set(staticIndex.jobs.flatMap(x=>x.secret_name_references))].sort();
 const creds=[...new Set([...scopeNames.filter(x=>x.endsWith('_DATABASE_URL')),'P5_PRIMARY_FIDS_SWEEP_DATABASE_URL'])].sort();
 const laneCounts=staticIndex.jobs.map(x=>({lane:x.id,references:x.secret_name_references.length,missing:names(x.secret_name_references).missing}));
 return {status:'P5_FINAL_CURRENT_METADATA_NAMES_ONLY_NO_GO',main:PIN,tree:TREE,lanes:15,workflows:11,scopeSecretNameReferences:scopeNames.length,
  existingRestrictedCredentialNames:names(creds),initialStageNames:stages,
  signingGroups:compact.signingKeyGroups.map(x=>({role:x.role,...names(x.secretNames),fingerprintVerified:false})),
  missingReferenceNames:laneCounts,conditionalAndInheritedReferencesNotResolved:true,
  intendedFutureModeFlags:flags(staticIndex.future_reference_values),legacyCompetingFlags:flags(staticIndex.competing_legacy_enable_values_to_avoid),
  optionalRollingEnabled:v.get('P6_ROLLING_CONTROLLER_ENABLED')==='1',
  retentionMetadataMonitorEnabled:v.get('P5_RETENTION_READONLY_MONITOR_ENABLED')==='true',
  primarySweepEnabled:v.get('P5_PRIMARY_FIDS_EXPIRY_ENABLED')==='true',
  primarySweepPinMatchesExactMain:v.get('P5_PRIMARY_FIDS_EXPIRY_APPROVED_MAIN_SHA')===PIN,
  primarySweepApprovalMatchesPrior:v.get('P5_PRIMARY_FIDS_EXPIRY_APPROVAL')==='APPLY_REVIEWED_PRIMARY_FIDS_EXPIRY_ONLY_NO_PROVIDER',
  privateCommissionVerifyOnly:v.get('P6_PRIVATE_EPOCH_EXPIRY_MODE')==='COMMISSION_VERIFY_ONLY',
  privateApplyApprovalPresent:Boolean(v.get('P6_PRIVATE_EPOCH_EXPIRY_MANIFEST_SHA256')||v.get('P6_PRIVATE_EPOCH_EXPIRY_APPROVAL')),
  actualSecretValuesRead:false,actualCredentialAuthenticationVerifiedHere:false,scientificFreezeApproved:false,sourceRightsApproved:false,providerCalls:0,databaseWrites:0,githubMutations:0,phase6PaidGo:false};
}
module.exports={summarize};
if(require.main===module){
 try{
  check(process.argv.length===4&&process.env.GITHUB_ACTIONS!=='true','OWNER_LOCAL_ARGS');
  const inputs=process.argv.slice(2).map(x=>fs.readFileSync(x));check(blob(inputs[0])===STATIC&&blob(inputs[1])===COMPACT,'BLOB_IDENTITY');
  const [staticIndex,compact]=inputs.map(x=>JSON.parse(x));
  const gh=args=>execFileSync('gh',args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:40000,stdio:['ignore','pipe','pipe'],env:{...process.env,GH_PROMPT_DISABLED:'1'}}).trim();
  const api=p=>JSON.parse(gh(['api','repos/'+REPO+'/'+p]));
  const main=()=>api('git/ref/heads/main').object.sha;
  check(main()===PIN&&api('git/commits/'+PIN).tree.sha===TREE,'MAIN_TREE');
  const t=api('git/trees/'+TREE+'?recursive=1');check(t.truncated===false&&Array.isArray(t.tree),'TREE_INCOMPLETE');
  const byPath=new Map(t.tree.map(x=>[x.path,x.sha]));
  check(byPath.get('scripts/v39_phase6_release_inventory_readonly.mjs')===staticIndex.inventory_script_blob&&staticIndex.jobs.every(x=>byPath.get('.github/workflows/'+x.workflow)===x.workflow_blob_sha),'WORKFLOW_BLOB_DRIFT');
  const list=(kind)=>gh(['api','--paginate','repos/'+REPO+'/actions/'+kind+'?per_page=100','--jq','.'+kind+'[] | @json']).split('\n').filter(Boolean).map(x=>JSON.parse(x));
  const secretNames=list('secrets').map(x=>x.name);
  const variables=list('variables').map(({name,value})=>({name,value}));
  const receipt=summarize(staticIndex,compact,secretNames,variables);
  check(main()===PIN,'MAIN_CHANGED');
  console.log(JSON.stringify(receipt));
 }catch(e){const m=String(e?.message??'');console.error(/^HOLD_P5_CURRENT_METADATA_[A-Z_]+$/.test(m)?m:'HOLD_P5_CURRENT_METADATA_GH_OR_LOCAL_READ_FAILED_REDACTED');process.exitCode=2;}
}
