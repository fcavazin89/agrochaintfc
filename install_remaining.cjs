const https=require("https"),zlib=require("zlib"),fs=require("fs"),path=require("path");
const NM="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/circom2_pkg/node_modules";

function getJ(u){return new Promise((res,rej)=>{https.get(u,{headers:{Accept:"application/json"}},r=>{if(r.statusCode>=300&&r.statusCode<400)return res(getJ(r.headers.location));let d="";r.on("data",c=>d+=c);r.on("end",()=>{try{res(JSON.parse(d))}catch(e){rej(e)}});r.on("error",rej)}).on("error",rej)})}
function getDl(u){return new Promise((res,rej)=>{https.get(u,r=>{if(r.statusCode>=300&&r.statusCode<400)return res(getDl(r.headers.location));const c=[];r.on("data",d=>c.push(d));r.on("end",()=>res(Buffer.concat(c)));r.on("error",rej)}).on("error",rej)})}
function exTgz(buf,dest){const tar=zlib.gunzipSync(buf);let p=0;while(p+512<=tar.length){const h=tar.slice(p,p+512);const n=h.slice(0,100).toString().replace(/[\x00]/g,"");if(!n)break;const s=parseInt(h.slice(124,136).toString().trim(),8)||0;const t=h.slice(156,157).toString();p+=512;if(s>0&&t!=="5"){const fi=path.join(dest,n.replace(/^package\//,""));fs.mkdirSync(path.dirname(fi),{recursive:true});fs.writeFileSync(fi,tar.slice(p,p+s))}p+=Math.ceil(s/512)*512}}
async function ins(nm){const d=path.join(NM,nm);if(fs.existsSync(path.join(d,"package.json"))){console.log("  skip (exists):",nm);return;}console.log("  + install:",nm);const m=await getJ("https://registry.npmjs.org/"+nm+"/latest");exTgz(await getDl(m.dist.tarball),d);for(const[dep] of Object.entries(m.dependencies||{}))await ins(dep).catch(e=>console.error("    dep fail:",dep,e.message))}

// Lista de módulos a garantir instalados
const needed=[
  "set-function-length","define-data-property","es-errors",
  "has-property-descriptors","call-bind","get-intrinsic",
  "function-bind","has-proto","has-symbols","hasown","gopd"
];
(async()=>{for(const n of needed)await ins(n).catch(e=>console.error("FAIL:",n,e.message));console.log("ALL INSTALLED");})();
