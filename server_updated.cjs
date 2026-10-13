const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8000;
const ROOT = "c:\\Users\\Usuário\\agrochain\\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip\\prototipo-agrochain";
const WORKSPACE_ROOT = "c:\\Users\\Usuário\\agrochain\\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const BLK = "c:\\Users\\Usuário\\agrochain\\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip\\blockchain";

const MIME = {
    ".html": "text/html;charset=utf-8",
    ".js": "text/javascript",
    ".cjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".wasm": "application/wasm",
    ".zkey": "application/octet-stream",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain",
    ".md": "text/markdown"
};

http.createServer((req, res) => {
    let url = req.url.split("?")[0];
    
    // Mapeamento de rotas especiais
    const specialRoutes = {
        "/dex-status": "/dex_status.html",
        "/dex": "/dex_status.html",
        "/cafeswap-status": "/dex_status.html"
    };
    
    if (specialRoutes[url]) {
        url = specialRoutes[url];
    }
    
    let filePath;
    
    if (url.startsWith("/blockchain/")) {
        filePath = path.join(BLK, url.slice(12));
    } else if (url === "/dex_status.html") {
        filePath = path.join(WORKSPACE_ROOT, "dex_status.html");
    } else {
        filePath = path.join(ROOT, url === "/" ? "index.html" : url);
    }
    
    // Ler arquivo
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                // Arquivo não encontrado - tentar servir do workspace root
                const fallbackPath = path.join(WORKSPACE_ROOT, url === "/" ? "index.html" : url);
                fs.readFile(fallbackPath, (fallbackErr, fallbackData) => {
                    if (fallbackErr) {
                        res.writeHead(404, { "Content-Type": "text/html;charset=utf-8" });
                        res.end(`
                            <html><body style="background:#0b1d12;color:#f3f7f2;font-family:sans-serif;padding:40px;">
                            <h1>404 - Arquivo não encontrado</h1>
                            <p>Arquivo: ${url}</p>
                            <p><a href="/dex-status" style="color:#f3d76e;">Ver status DEX</a> | <a href="/" style="color:#f3d76e;">Página inicial</a></p>
                            </body></html>
                        `);
                    } else {
                        const ext = path.extname(fallbackPath).toLowerCase();
                        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
                        res.end(fallbackData);
                    }
                });
            } else {
                res.writeHead(500);
                res.end("Erro interno do servidor");
            }
            return;
        }
        
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
    });
    
    console.log(`${req.method} ${url}`);
}).listen(PORT, "0.0.0.0", () => {
    console.log("AgroChain OK: http://localhost:" + PORT);
    console.log("ZK Cert: http://localhost:" + PORT + "/certificador.html");
    console.log("Status DEX: http://localhost:" + PORT + "/dex-status");
    console.log("Dashboard: http://localhost:8001");
});