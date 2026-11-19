#!/usr/bin/env bash
set -Eeuo pipefail
set +x
umask 077
REPO="HKcode22/ReplitTranvr"
PIN="ea89308f468494d848f549539200f73f848a4fa7"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
hold() { printf 'HOLD_P5_COOLDOWN_OWNER_WRAPPER_%s\n' "$1" >&2; exit 2; }
[[ "$(printenv GITHUB_ACTIONS || true)" != true ]] || hold OWNER_ONLY
[[ "$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')" == "$PIN" ]] || hold MAIN_PIN
fetch_blob() {
  gh api "repos/$REPO/git/blobs/$1" --jq '.content' |
    base64 --decode > "$2"
  [[ "$(git hash-object "$2")" == "$1" ]] || hold BLOB_HASH
}
find_review() {
  node <<'NODE'
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const home=fs.realpathSync(os.homedir()),name="nov18-ea89308f4684",h=b=>crypto.createHash("sha256").update(b).digest("hex");
const exact={"manifest-candidate.json":"e5315b35fb8978d1de823bb1953191d976ccf093594a656890fb16d91f88a3e0","source-inventory.json":"af8122be433b471ef09091f194a9a3d275514fa8240e337ccfec505288ceaa17","config-candidate.json":"4055c04207222f5dbdda7d124c30f7bfdc40e852e68fef38df4d1e93e0659edb","external-input-offline-review-NOT-STAGE.json":"db1645f302e7840455938e88738c3b895bea808ea2b3132eaff959551214a46e"};
const stat=f=>{try{return fs.lstatSync(f)}catch(e){if(e.code==="ENOENT")return null;throw e;}};
const good=(s,dir)=>s&&(dir?s.isDirectory():s.isFile())&&!s.isSymbolicLink()&&s.uid===process.getuid()&&(s.mode&0o777)===(dir?0o700:0o600)&&(dir||s.nlink===1&&s.size<2*1024*1024);
try{
 const dirs=fs.readdirSync(home,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^\.phase5-final-review-[A-Za-z0-9]+$/.test(x.name)).sort((a,b)=>a.name.localeCompare(b.name));
 if(dirs.length>128)throw Error("BOUNDED_CUSTODY_SCAN");
 const valid=[];
 for(const x of dirs){
  const parent=path.join(home,x.name),d=path.join(parent,name);
  if(!stat(d))continue;
  if(!good(stat(parent),true)||!good(stat(d),true))throw Error("UNSAFE_PRIVATE_REVIEW_DIR");
  for(const [f,digest] of Object.entries(exact)){
   const p=path.join(d,f),s=stat(p);
   if(!good(s,false)||h(fs.readFileSync(p))!==digest)throw Error("PRESENT_REVIEW_BYTES_DRIFT_NO_OVERWRITE");
  }
  for(const f of ["receipt.json","timing-input-offline-review.json"]){
   if(!good(stat(path.join(d,f)),false))throw Error("PRESENT_REVIEW_INCOMPLETE");
  }
  valid.push(d);
 }
 if(valid.length)console.log(valid.find(x=>x.includes(".phase5-final-review-uCxODN/"))??valid[0]);
}catch(e){console.error("HOLD_P5_PRIVATE_ASSET_DISCOVERY_"+(String(e.message).match(/^[A-Z_]+$/)?e.message:"REDACTED"));process.exitCode=2;}
NODE
}
REVIEW="$(find_review)"
if [[ -z "$REVIEW" ]]; then
  echo '{"status":"PREVIOUS_UNSIGNED_REVIEW_MISSING_CONDITIONAL_EXACT_RECONSTRUCTION_ONLY"}'
  fetch_blob "2ad0b136f2f92605a5ce9d4129358c7240408b91" "$TMP/rebind.cjs"
  fetch_blob "62ffb5537748e4d50ed5c2d54be92e5d16c51814" "$TMP/recover.cjs"
  fetch_blob "6b626c5f34a0891d1322eb150d97456a7ed95d02" "$TMP/index.json"
  node --check "$TMP/rebind.cjs"
  node --check "$TMP/recover.cjs"
  node "$TMP/rebind.cjs" "$TMP/recover.cjs" "$TMP/index.json"
  REVIEW="$(find_review)"
  [[ -n "$REVIEW" ]] || hold RECOVERED_REVIEW_NOT_FOUND
fi
if [[ ! -f "$REVIEW/airport-timezone-catalog-CANDIDATE.json" ]]; then
  echo '{"status":"TIMEZONE_PRIVATE_FILE_MISSING_RECOVER_EXACT_PRIOR_ONLY"}'
  fetch_blob "79a08f9383d3edf8d9b56920932249fae08405a9" "$TMP/assets.cjs"
  fetch_blob "b14c6523e12131ea92bd5cd792b439ded77e52da" "$TMP/old-public.json"
  fetch_blob "7adbd255fae4aa1921a8489dcecf10d903541bab" "$TMP/timezone.cjs"
  node --check "$TMP/assets.cjs"
  node --check "$TMP/timezone.cjs"
  rc=0
  node "$TMP/assets.cjs" "$TMP/old-public.json" "$TMP/timezone.cjs" "$REVIEW" > "$TMP/assets-output.jsonl" || rc=$?
  cat "$TMP/assets-output.jsonl"
  ASSET_EXIT="$rc" node - "$TMP/assets-output.jsonl" <<'NODE'
const fs=require("node:fs"),s=fs.readFileSync(process.argv[2],"utf8").trim().split(/\r?\n/);
const r=JSON.parse(s.at(-1));
const expected=r.status==="HOLD_P5_CURRENT_ASSETS_ORIGINAL_SIGNER_CANDIDATES_MISSING_NO_REGEN"&&
 r.signers?.state==="PRIOR_DIRECTORY_NOT_PRESENT_NO_REGEN"&&r.signers?.verifiedKeys===0&&process.env.ASSET_EXIT==="2";
if(!expected||r.main!=="ea89308f468494d848f549539200f73f848a4fa7"||
 r.timezone?.sha256!=="4264ae7d2d7efc784ae0deab0354c506a943fa51b4a8649d020422853d798534"||
 r.timezone?.bytes!==14722||r.providerCalls!==0||r.databaseWrites!==0||r.createdOrRotatedKeys!==0||r.githubSecretWrites!==0||r.phase6PaidGo!==false)
 throw Error("HOLD_P5_CONDITIONAL_TIMEZONE_RECOVERY_SCOPE");
NODE
fi
fetch_blob "2ee1a81d5899806dc929cb1efedc070ae274f6a1" "$TMP/transition.cjs"
node --check "$TMP/transition.cjs"
node "$TMP/transition.cjs" --deploy-exact-876 "$REVIEW"
