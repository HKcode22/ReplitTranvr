/** Same existing Neon endpoint when a worker uses the direct host and a
 * previously commissioned credential uses its -pooler counterpart.
 * Not a substitute for each caller's role password TLS or actual PG identity
 * checks. Only exact database / endpoint / port continuity is compared.
 */
export function sameP6NeonDatabaseEndpoint(a:URL,b:URL):boolean{
 const endpoint=(u:URL):string|null=>{
  if(!["postgres:","postgresql:"].includes(u.protocol)||u.pathname!=="/neondb"||u.hash||
    (u.port!==""&&u.port!=="5432"))return null;
  const host=u.hostname.toLowerCase();
  if(!/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.neon\.tech$/.test(host))return null;
  // Neon appends "-pooler" to the endpoint label ONLY. Region and
  // DNS routing labels are part of the exact endpoint identity.
  const [label,...suffix]=host.split(".");
  const canonicalLabel=label.replace(/-pooler$/,"");
  if(canonicalLabel.endsWith("-pooler")||canonicalLabel.length<=3)return null;
  return [canonicalLabel,...suffix].join(".");
 };
 const x=endpoint(a),y=endpoint(b);
 return x!==null&&x===y;
}
