const fs = require("fs");
const file = "c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/prototipo-agrochain/certificador.html";
let html = fs.readFileSync(file, "utf8");

const MARCA_INICIO = "    async function gerarProva() {\n      try {";
const pos = html.indexOf(MARCA_INICIO);
if (pos === -1) { console.error("MARCA NAO ENCONTRADA"); process.exit(1); }

// encontrar fechamento da funcao
let depth = 0, fim = pos;
for (let i = pos; i < html.length; i++) {
  if (html[i] === "{") depth++;
  else if (html[i] === "}") { depth--; if (depth === 0) { fim = i + 1; break; } }
}

// nova funcao ZK real
const novaFn = `
    // ── ZK STATE ────────────────────────────────────────────────────
    let _poseidon = null;
    const BN_FR = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    async function _buildPoseidon() {
      if (_poseidon) return _poseidon;
      if (window.circomlibjs && window.circomlibjs.buildPoseidon)
        _poseidon = await window.circomlibjs.buildPoseidon();
      return _poseidon;
    }
    function _toFr(s) {
      let n; try { n = BigInt(String(s)); } catch(e) { try { n = BigInt("0x" + String(s).replace(/^0x/,"")); } catch(e2) { n = 1n; } }
      return n % BN_FR;
    }

    async function gerarProva() {
      const statusEl = document.getElementById("provaStatus");
      const btnEl    = document.getElementById("btnGerarProva");
      btnEl.disabled = true;
      estadoApp.provaGerada = null;
      try {
        const score   = parseInt(document.getElementById("inputScore").value) || 0;
        const notaMin = parseInt(document.getElementById("inputNotaMinima").value) || 80;
        const salt    = BigInt(document.getElementById("inputSal").value || "12345");
        const loteRaw = document.getElementById("inputLoteId").value   || "1";
        const padRaw  = document.getElementById("inputPadraoHash").value || "2";
        const laudRaw = document.getElementById("inputHashLaudo").value  || "3";

        if (score < 0 || score > 100) { mostrarMensagem("Score deve ser 0-100","erro"); return; }
        if (score < notaMin) { mostrarMensagem("Score (" + score + ") < nota minima (" + notaMin + ")","erro"); return; }

        statusEl.innerHTML = "<span class=\\"carregando\\"></span> Carregando Poseidon\u2026";
        statusEl.style.color = "var(--especial)";

        const loteFr = _toFr(loteRaw), padFr = _toFr(padRaw), laudFr = _toFr(laudRaw);

        let commitment = "0";
        const poseidon = await _buildPoseidon();
        if (poseidon) {
          const h = poseidon([BigInt(score), salt, loteFr, padFr, laudFr]);
          commitment = poseidon.F.toString(h);
        } else {
          let acc = 7n;
          const raw = score + "|" + salt + "|" + loteFr;
          for (const c of new TextEncoder().encode(raw)) acc = (acc * 31n + BigInt(c)) % BN_FR;
          commitment = acc.toString();
        }
        estadoApp.zkCommitment = commitment;

        statusEl.innerHTML = "<span class=\\"carregando\\"></span> Verificando wasm/zkey\u2026";

        const WASM = "/blockchain/circuits/agrochain-score-threshold_js/agrochain-score-threshold.wasm";
        const ZKEY = "/blockchain/circuits/agrochain-score-threshold_final.zkey";
        const [wasmOk, zkeyOk] = await Promise.all([
          fetch(WASM,{method:"HEAD"}).then(r=>r.ok).catch(()=>false),
          fetch(ZKEY,{method:"HEAD"}).then(r=>r.ok).catch(()=>false)
        ]);

        let prova, modoZK = false;
        if (wasmOk && zkeyOk && window.snarkjs) {
          statusEl.innerHTML = "<span class=\\"carregando\\"></span> Gerando prova Groth16\u2026";
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            { commitment, minimumScore: String(notaMin), lotContext: String(loteFr),
              standardContext: String(padFr), reportContext: String(laudFr),
              qualityScore: String(score), salt: String(salt) }, WASM, ZKEY);
          prova = { a:[proof.pi_a[0],proof.pi_a[1]], b:[[proof.pi_b[0][1],proof.pi_b[0][0]],[proof.pi_b[1][1],proof.pi_b[1][0]]], c:[proof.pi_c[0],proof.pi_c[1]], publicSignals, real:true };
          modoZK = true;
        } else {
          prova = { a:[commitment.slice(0,20)||"0","0"], b:[["0","0"],["0","0"]], c:["0","0"],
            publicSignals:[commitment,String(notaMin),String(loteFr),String(padFr),String(laudFr)], real:false };
        }
        estadoApp.provaGerada = prova;

        statusEl.textContent = modoZK ? "\u2713 Prova Groth16 real gerada"
          : (poseidon ? "\u2713 Commitment Poseidon calculado (wasm: " + (wasmOk?"ok":"ausente") + ")" : "\u2713 Commitment calculado");
        statusEl.style.color = modoZK ? "var(--verde-600)" : "var(--ouro)";
        mostrarMensagem(
          modoZK ? "Prova Groth16 gerada \u2014 pronto para emitir na blockchain"
                 : "Commitment calculado. Para Groth16 completo: npm run zk:setup:prod",
          modoZK ? "sucesso" : "info");

        let badge = document.getElementById("zkBadge");
        if (!badge) { badge = document.createElement("div"); badge.id = "zkBadge";
          badge.style.cssText = "margin-top:10px;padding:8px 12px;border-radius:8px;font-size:11px;font-family:monospace;line-height:1.6;word-break:break-all;";
          statusEl.after(badge); }
        badge.style.background = modoZK ? "rgba(47,143,82,.12)" : "rgba(184,145,42,.14)";
        badge.style.color = modoZK ? "var(--verde-700)" : "var(--ouro-claro)";
        badge.style.border = modoZK ? "1px solid rgba(47,143,82,.3)" : "1px solid rgba(184,145,42,.35)";
        badge.innerHTML = (modoZK ? "\uD83D\uDD10 ZK Groth16 (real)" : (poseidon ? "\uD83D\uDD11 Poseidon ativo" : "\uD83D\uDD11 Commitment"))
          + "<br><span style=\\"opacity:.7\\">commitment: " + commitment.slice(0,44) + "\u2026</span>"
          + (wasmOk ? "" : "<br><span style=\\"opacity:.5\\">wasm/zkey: npm run zk:setup:prod</span>");

      } catch(err) {
        statusEl.textContent = "\u2717 Erro ao gerar prova";
        statusEl.style.color = "var(--critico)";
        mostrarMensagem("Erro ZK: " + err.message, "erro");
        console.error("[ZK]", err);
      } finally { btnEl.disabled = false; }
    }
`;

html = html.slice(0, pos) + novaFn + html.slice(fim);
fs.writeFileSync(file, html, "utf8");
console.log("PATCH ZK OK");
console.log("snarkjs presente:", html.includes("snarkjs.min.js"));
console.log("buildPoseidon presente:", html.includes("_buildPoseidon"));
console.log("zkBadge presente:", html.includes("zkBadge"));
console.log("simulacao removida:", !html.includes("Simulação: em produção"));
console.log("tamanho:", html.length);