'use strict';
// Owner-local Mac only. Verify the existing six private keys by public fingerprints;
// repin the already-installed GET-only watchdog, preserve other plist fields.
// No key creation, private output, uploads, provider, DB or paid dispatch.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),c=require('node:crypto');
const {execFileSync}=require('node:child_process');
const PIN='70580b3749544dfcbeff39da181b2aa42b1b4476',R='HKcode22/ReplitTranvr',LABEL='com.travnr.github-watch';
const OLD_SCRIPT_SHA1='ac2764fe810f4e09e028bbfe7ebdda991a26d812',PROBE_BLOB='1ba12adeb1000a842cac01680f338a36c5c4742e';
const FINGERPRINTS={
 'daily':'7639dcd0773f7b21e1194c91e19a941589ac361621a1cadd31edd10c832c7744',
 'query':'80d59db77bec734d4e34eb43ed8dfa92ceb220a1ef82a8f4a06a55a30e08b5b2',
 'registry-index':'60538d4035f3bb3132cad7ccd2b459242e5fa9e949aea43cabe974bb29519e67',
 'later-pre-t24-registry':'de37f2d4f8736cb92c04a31c94d3d252482667f937ce80a0f65b09df5293e733',
 'post':'4c0e85e2834b217eeeb3d96d8f350f6d5c844ea6b29cfa0fb449683db251846b',
 't24-independent-custody':'5d002b5a2cede6da00aab6d3b516aa4766f58858b252ba85e1c67049dd08d23f'};
const NEED=(ok,k)=>{if(!ok)throw Error('HOLD_P5_MAC_READBACK_'+k)};
const hash=(a,b)=>c.createHash(a).update(b).digest('hex');
function cmd(p,args,opts={}){return execFileSync(p,args,{encoding:'utf8',timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe'],...opts}).trim();}
function checked(p,dir=false,mode=dir?0o700:0o600){const st=fs.lstatSync(p);NEED((dir?st.isDirectory():st.isFile())&&st.uid===process.getuid()&&(st.mode&0o777)===mode&&(dir||st.nlink===1),'UNSAFE_CUSTODY');return st;}
function validateKeys(dir){checked(dir,true);const out=[];
 for(const [id,expected] of Object.entries(FINGERPRINTS)){const f=path.join(dir,id+'.pkcs8.pem'),st=checked(f);NEED(st.size<65536,'KEY_SIZE');const raw=fs.readFileSync(f);try{
  const k=c.createPrivateKey(raw),pub=c.createPublicKey(k);NEED(k.asymmetricKeyType==='ed25519','KEY_TYPE');const digest=hash('sha256',pub.export({type:'spki',format:'der'}));NEED(digest===expected,'PUBLIC_FINGERPRINT_DRIFT');const challenge=c.randomBytes(32);NEED(c.verify(null,challenge,pub,c.sign(null,challenge,k)),'POSSESSION_CHALLENGE');out.push({id,fingerprintSha256:digest});}finally{raw.fill(0)}}
 NEED(new Set(out.map(x=>x.fingerprintSha256)).size===6,'SIGNER_DUPLICATE');return out;
}
const readPlist=f=>JSON.parse(cmd('/usr/bin/plutil',['-convert','json','-o','-',f]));
function validatePlist(pl){const a=pl.ProgramArguments;
 NEED(pl.Label===LABEL&&Array.isArray(a)&&a.length===5&&a.every(x=>typeof x==='string')&&a[0].startsWith('/')&&a[1].startsWith('/')&&a[2]==='observe-auth-notify'&&/^[a-f0-9]{40}$/.test(a[3])&&a[4].startsWith('/')&&pl.StartInterval===600&&pl.RunAtLoad===true,'EXISTING_AGENT_IDENTITY');
 NEED(Object.keys(pl.EnvironmentVariables??{}).every(k=>['TRAVNR_WATCH_GH_BINARY','GH_CONFIG_DIR','XDG_CONFIG_HOME'].includes(k)),'UNEXPECTED_AGENT_ENV');
 return a;
}
function execute(){
 NEED(process.platform==='darwin'&&process.argv.length===2&&process.getuid()>0,'MAC_OWNER_ONLY');
 const live=()=>cmd('gh',['api','--hostname','github.com','--method','GET','repos/'+R+'/git/ref/heads/main','--jq','.object.sha']);
 NEED(live()===PIN,'MAIN_MOVED');
 const home=fs.realpathSync(os.homedir());const signers=validateKeys(path.join(home,'.travnr-phase6-signer-candidates-v2'));
 console.log(JSON.stringify({status:'SIX_EXISTING_MAC_KEYS_POSSESSION_VERIFIED_NO_GO',signers,privateKeyBytesPrinted:false,githubSecretWrites:0,durableExternalBackupVerified:false}));
 const plfile=path.join(home,'Library','LaunchAgents',LABEL+'.plist');const st=fs.lstatSync(plfile);NEED(st.isFile()&&st.uid===process.getuid()&&st.nlink===1&&(st.mode&0o022)===0,'AGENT_FILE_SCOPE');
 const pl=readPlist(plfile),a=validatePlist(pl),raw=fs.readFileSync(a[1]),git=hash('sha1',Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw]));
 NEED(hash('sha1',raw)===OLD_SCRIPT_SHA1||git===PROBE_BLOB,'INSTALLED_PROBE_BYTE_IDENTITY');
 NEED(live()===PIN,'MAIN_MOVED_BEFORE_MAC_CHANGE');
 const domain='gui/'+process.getuid(),service=domain+'/'+LABEL,original=fs.readFileSync(plfile);
 let loaded=true;try{cmd('/bin/launchctl',['print',service])}catch{loaded=false}
 const oldPin=a[3];let changed=false;
 if(oldPin!==PIN||!loaded){
  const tmp=fs.mkdtempSync(path.join(path.dirname(plfile),'.travnr-watch-repin-')),candidate=path.join(tmp,'candidate.plist');
  let unloaded=false,installed=false,bootstrapped=false;
  try{
   fs.writeFileSync(candidate,original,{mode:st.mode&0o777,flag:'wx'});
   cmd('/usr/libexec/PlistBuddy',['-c','Set :ProgramArguments:3 '+PIN,candidate]);cmd('/usr/bin/plutil',['-lint',candidate]);
   const next=readPlist(candidate);validatePlist(next);const expected={...pl,ProgramArguments:a.map((x,i)=>i===3?PIN:x)};
   // JSON serialization key order stable because both reads use plutil.
   NEED(JSON.stringify(next)===JSON.stringify(expected),'OTHER_AGENT_FIELD_CHANGED');
   NEED(live()===PIN,'MAIN_MOVED_BEFORE_BOOTSTRAP');
   if(loaded){cmd('/bin/launchctl',['bootout',service]);unloaded=true;}
   fs.renameSync(candidate,plfile);installed=true;cmd('/bin/launchctl',['bootstrap',domain,plfile]);bootstrapped=true;changed=true;
  }catch(e){
   let failed=false;
   if(bootstrapped)try{cmd('/bin/launchctl',['bootout',service])}catch{failed=true}
   if(installed)try{const restore=path.join(tmp,'restore.plist');fs.writeFileSync(restore,original,{mode:st.mode&0o777,flag:'wx'});fs.renameSync(restore,plfile)}catch{failed=true}
   if(unloaded)try{cmd('/bin/launchctl',['bootstrap',domain,plfile])}catch{failed=true}
   NEED(!failed,'ROLLBACK_REQUIRES_MANUAL_REVIEW');throw e;
  }finally{fs.rmSync(tmp,{recursive:true,force:true})}
 }
 NEED(validatePlist(readPlist(plfile))[3]===PIN,'PIN_READBACK');
 // One actual observation using the installed reviewed node/script and private existing state directory.
 // No separate canary, never POST. Reuse the LaunchAgent's narrow environment paths.
 let env={PATH:process.env.PATH,HOME:home,GH_PROMPT_DISABLED:'1',...pl.EnvironmentVariables};
 const j=JSON.parse(cmd(a[0],[a[1],'observe-auth',PIN,a[4]],{env}));
 NEED(j.status==='READONLY_GITHUB_METADATA_NOT_COLLECTION_OR_DELETION_PROOF'&&j.observedMainMatchesReviewedPin===true&&live()===PIN,'ACTUAL_OBSERVATION_REQUIRES_REVIEW');
 cmd('/bin/launchctl',['print',service]);
 console.log(JSON.stringify({status:'MAC_EXISTING_WATCHDOG_REPINNED_AND_OBSERVED_NO_GO',oldPin,newPin:PIN,changed,observedUtc:j.observedUtc,lanes:j.lanes?.map(x=>({lane:x.lane??x.id??x.name??null,level:x.level,runId:x.runId??null})),localMonitorGap:j.localMonitorGap??null,launchAgentLoaded:true,intervalSeconds:600,githubSecretWrites:0,providerCalls:0,databaseWrites:0,dispatches:0,phase6PaidGo:false}));
}
module.exports={validatePlist,validateKeys};
if(require.main===module)try{execute()}catch(e){console.error(/^HOLD_P5_MAC_READBACK_[A-Z0-9_]+$/.test(e.message)?e.message:'HOLD_P5_MAC_READBACK_LOCAL_STATE_REVIEW');process.exitCode=2}
