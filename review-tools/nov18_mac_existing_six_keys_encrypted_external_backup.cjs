'use strict';
// Mac owner local, native encrypted disk-image backup of six existing signer keys.
// No generation, rotation, credential upload, provider, DB or GitHub mutation.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),c=require('node:crypto');
const {execFileSync}=require('node:child_process');
const FINGERPRINTS={
 'daily':'7639dcd0773f7b21e1194c91e19a941589ac361621a1cadd31edd10c832c7744',
 'query':'80d59db77bec734d4e34eb43ed8dfa92ceb220a1ef82a8f4a06a55a30e08b5b2',
 'registry-index':'60538d4035f3bb3132cad7ccd2b459242e5fa9e949aea43cabe974bb29519e67',
 'later-pre-t24-registry':'de37f2d4f8736cb92c04a31c94d3d252482667f937ce80a0f65b09df5293e733',
 'post':'4c0e85e2834b217eeeb3d96d8f350f6d5c844ea6b29cfa0fb449683db251846b',
 't24-independent-custody':'5d002b5a2cede6da00aab6d3b516aa4766f58858b252ba85e1c67049dd08d23f'};
const need=(x,k)=>{if(!x)throw Error('HOLD_P5_KEY_BACKUP_'+k)};
const MARK='public-candidate-receipt.json';
const names=[...Object.keys(FINGERPRINTS).map(id=>id+'.pkcs8.pem'),MARK].sort();
const sha=b=>c.createHash('sha256').update(b).digest('hex');
function cmd(p,args,options={}){return execFileSync(p,args,{encoding:'utf8',timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe'],...options});}
function native(args){return execFileSync('/usr/bin/hdiutil',args,{stdio:'inherit',timeout:600000});}
function externalVolume(dest,home,info,device){
 const root=info.MountPoint;
 need(typeof root==='string'&&/^\/Volumes\/[^/]+$/.test(root)&&
  (dest===root||dest.startsWith(root+'/'))&&info.Internal===false&&info.Writable!==false&&
  device!==home,'INDEPENDENT_WRITABLE_EXTERNAL_VOLUME_REQUIRED');
 need(!/disk image/i.test(String(info.Protocol??''))&&!/disk image/i.test(String(info.MediaName??'')),'DISK_IMAGE_NOT_INDEPENDENT');
 return root;
}
function file(dir,n,strict){
 const f=path.join(dir,n),s=fs.lstatSync(f);need(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<65536,'FILE_SCOPE');
 if(strict)need(s.uid===process.getuid()&&(s.mode&0o777)===0o600&&s.nlink===1,'OWNER_FILE_MODE');
 return fs.readFileSync(f);
}
function inspect(dir,strict){
 const st=fs.lstatSync(dir);need(st.isDirectory()&&!st.isSymbolicLink(),'DIRECTORY_SCOPE');
 if(strict)need(st.uid===process.getuid()&&(st.mode&0o777)===0o700&&JSON.stringify(fs.readdirSync(dir).sort())===JSON.stringify(names),'COHORT_DIRECTORY_DRIFT');
 const out={};
 for(const [id,expected] of Object.entries(FINGERPRINTS)){
  const n=id+'.pkcs8.pem',raw=file(dir,n,strict);
  try{
   const key=c.createPrivateKey(raw),pub=c.createPublicKey(key);
   need(key.asymmetricKeyType==='ed25519'&&sha(pub.export({type:'spki',format:'der'}))===expected,'KEY_FINGERPRINT_DRIFT');
   const msg=c.randomBytes(32);need(c.verify(null,msg,pub,c.sign(null,msg,key)),'RESTORE_SIGN_VERIFY');
   out[n]=sha(raw);
  }finally{raw.fill(0)}
 }
 const m=file(dir,MARK,strict);try{
  const j=JSON.parse(m.toString('utf8'));
  need(j.schema==='v39.phase6.local-signer-candidate-custody.v1'&&j.originMain==='ea89308f468494d848f549539200f73f848a4fa7'&&j.originManifestCandidateSha256==='e5315b35fb8978d1de823bb1953191d976ccf093594a656890fb16d91f88a3e0'&&
   j.signers?.length===6&&j.signers.every(x=>FINGERPRINTS[x.id]===x.fingerprintSha256)&&new Set(j.signers.map(x=>x.id)).size===6,'ORIGIN_MARKER_DRIFT');
  out[MARK]=sha(m);
 }finally{m.fill(0)}
 return out;
}
function run(){
 need(process.platform==='darwin'&&process.getuid()>0&&process.argv.length===3&&process.stdin.isTTY,'MAC_OWNER_INTERACTIVE_ONLY');
 const home=fs.realpathSync(os.homedir()),source=path.join(home,'.travnr-phase6-signer-candidates-v2');
 const orig=inspect(source,true);
 const dest=fs.realpathSync(process.argv[2]);need(fs.statSync(dest).isDirectory(),'DESTINATION_DIRECTORY');
 const xml=cmd('/usr/sbin/diskutil',['info','-plist',dest]);
 const info=JSON.parse(cmd('/usr/bin/plutil',['-convert','json','-o','-','-'],{input:xml,stdio:['pipe','pipe','pipe']}));
 externalVolume(dest,fs.statSync(home).dev,info,fs.statSync(dest).dev);
 const temp=fs.mkdtempSync(path.join(dest,'.travnr-encrypted-backup-'));fs.chmodSync(temp,0o700);
 const image=path.join(temp,'signer-custody-v2.dmg'),final=path.join(dest,'travnr-phase6-signer-custody-v2-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dmg');
 const mountParent=fs.mkdtempSync(path.join(os.tmpdir(),'travnr-key-check-')),mount=path.join(mountParent,'image');fs.mkdirSync(mount,{mode:0o700});
 let attached=false,completed=false;
 try{
  console.error('Create an AES-256 encrypted image. Use a strong unique recovery passphrase, retain it separately, and do not save it on this external volume.');
  native(['create','-srcfolder',source,'-format','UDZO','-encryption','AES-256','-volname','TravnrSignerCustodyV2',image]);
  const st=fs.lstatSync(image);need(st.isFile()&&!st.isSymbolicLink()&&st.size>0,'IMAGE_NOT_CREATED');
  fs.chmodSync(image,0o600);
  const enc=cmd('/usr/bin/hdiutil',['isencrypted',image]);need(/encrypted\s*:\s*yes/i.test(enc),'IMAGE_ENCRYPTION_NOT_VERIFIED');
  console.error('Re-enter the passphrase to restore-check the image read-only.');
  native(['attach','-readonly','-nobrowse','-noautoopen','-mountpoint',mount,image]);attached=true;
  need(JSON.stringify(inspect(mount,false))===JSON.stringify(orig),'RESTORED_BYTES_DIFFER');
  native(['detach',mount]);attached=false;
  need(JSON.stringify(inspect(source,true))===JSON.stringify(orig),'ORIGINAL_BYTES_CHANGED');
  need(!fs.existsSync(final),'DESTINATION_EXISTS');
  // Hard link gives exclusive no-clobber publication on the same volume.
  fs.linkSync(image,final);const fd=fs.openSync(final,'r');try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
  const backupSha=sha(fs.readFileSync(final));
  completed=true;fs.unlinkSync(image);fs.rmdirSync(temp);
  console.log(JSON.stringify({status:'SIX_EXISTING_MAC_KEYS_ENCRYPTED_EXTERNAL_BACKUP_RESTORE_VERIFIED_NO_GO',observedUtc:new Date().toISOString(),verifiedSignerCount:6,exactOriginalAndRestoredBytes:true,encryptedDiskImage:true,externalVolumeVerified:true,archiveSha256:backupSha,backupPath:final,independentCustodianApproved:false,passphraseSeparateOwnerResponsibility:true,privateKeyBytesPrinted:false,githubSecretWrites:0,providerCalls:0,databaseWrites:0,phase6PaidGo:false}));
 }finally{
  if(attached)try{native(['detach',mount])}catch{console.error('HOLD_P5_KEY_BACKUP_MANUAL_DETACH_REQUIRED')}
  try{fs.rmdirSync(mount);fs.rmdirSync(mountParent)}catch{}
  if(!completed)console.error('HOLD_P5_KEY_BACKUP_NO_COMPLETION_CLAIM; encrypted/partial artifact, if any, remains in private temporary directory for owner inspection.');
 }
}
module.exports={externalVolume};
if(require.main===module)try{run()}catch(e){console.error(/^HOLD_P5_KEY_BACKUP_[A-Z0-9_]+$/.test(e.message)?e.message:'HOLD_P5_KEY_BACKUP_MAC_COMMAND_OR_LOCAL_STATE');process.exitCode=2}
