const http=require("http"),fs=require("fs"),path=require("path");
const PORT=8000;
const ROOT="c:\\Users\\Usu\u00e1rio\\agrochain\\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip\\prototipo-agrochain";
const BLK ="c:\\Users\\Usu\u00e1rio\\agrochain\\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip\\blockchain";
const MIME={".html":"text/html;charset=utf-8",".js":"text/javascript",".css":"text/css",".json":"application/json",".wasm":"application/wasm",".zkey":"application/octet-stream",".png":"image/png",".svg":"image/svg+xml"};
http.createServer((req,res)=>{
  let u=req.url.split("?")[0];
  if(u==="/")u="/index.html";
  let fp=u.startsWith("/blockchain/")?path.join(BLK,u.slice(12)):path.join(ROOT,u);
  fs.readFile(fp,(err,data)=>{
    if(err){res.writeHead(err.code==="ENOENT"?404:500);res.end(String(err.code));return;}
    const ext=path.extname(fp).toLowerCase();
    res.writeHead(200,{"Content-Type":MIME[ext]||"application/octet-stream"});
    res.end(data);
  });
  console.log(req.method,u);
}).listen(PORT,"0.0.0.0",()=>{
  console.log("AgroChain OK: http://localhost:"+PORT);
  console.log("ZK Cert: http://localhost:"+PORT+"/certificador.html");
});