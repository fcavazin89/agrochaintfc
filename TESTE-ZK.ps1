# ═══════════════════════════════════════════════════════════════
#  🧪 GUIA DE TESTE - CERTIFICADOR ZK AGROCHAIN
# ═══════════════════════════════════════════════════════════════

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       TESTE DO CERTIFICADOR ZK - PROVA GROTH16 REAL         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "🌐 URL:" -ForegroundColor Yellow -NoNewline
Write-Host " http://localhost:8000/certificador.html`n"

Write-Host "📋 PASSO A PASSO:`n" -ForegroundColor Green

Write-Host "  1️⃣  Abrir a URL no browser" -ForegroundColor White
Write-Host "      → Chrome, Firefox, Edge (qualquer browser moderno)`n"

Write-Host "  2️⃣  Preencher dados do certificado:" -ForegroundColor White
Write-Host "      • Score de Qualidade: " -NoNewline -ForegroundColor Gray
Write-Host "85" -ForegroundColor Cyan -NoNewline
Write-Host " (pode mudar, mas >= Nota Mínima)" -ForegroundColor Gray
Write-Host "      • Nota Mínima: " -NoNewline -ForegroundColor Gray
Write-Host "70" -ForegroundColor Cyan
Write-Host "      • Sal (randomness): " -NoNewline -ForegroundColor Gray
Write-Host "12345" -ForegroundColor Cyan -NoNewline
Write-Host " (qualquer número)" -ForegroundColor Gray
Write-Host "      • Clique " -NoNewline -ForegroundColor Gray
Write-Host "'Gerar IDs Exemplo'" -ForegroundColor Yellow -NoNewline
Write-Host " para preencher hashes`n" -ForegroundColor Gray

Write-Host "  3️⃣  Clicar no botão " -ForegroundColor White -NoNewline
Write-Host "'Gerar Prova ZK'" -ForegroundColor Yellow

Write-Host "`n  ⏱️  AGUARDE: ~3-6 segundos de processamento`n" -ForegroundColor Magenta

Write-Host "  4️⃣  Verificar mensagens de status:" -ForegroundColor White
Write-Host "      ⚡ Carregando Poseidon..." -ForegroundColor DarkGray
Write-Host "      ⚡ Verificando wasm/zkey..." -ForegroundColor DarkGray
Write-Host "      ⚡ Gerando prova Groth16..." -ForegroundColor DarkGray
Write-Host "      ✅ Prova Groth16 real gerada" -ForegroundColor Green

Write-Host "`n  5️⃣  Ver o badge de certificação:" -ForegroundColor White
Write-Host "      • Commitment Poseidon (hash longo)" -ForegroundColor Gray
Write-Host "      • Dados públicos exibidos" -ForegroundColor Gray
Write-Host "      • Nota privada NUNCA revelada" -ForegroundColor Gray

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

Write-Host "🔍 O QUE VERIFICAR NO BROWSER:`n" -ForegroundColor Yellow

Write-Host "  ✓ Console do Dev Tools (F12):" -ForegroundColor Cyan
Write-Host "    • Deve mostrar carregamento de .wasm e .zkey" -ForegroundColor Gray
Write-Host "    • Sem erros 404 ou CORS" -ForegroundColor Gray
Write-Host "    • Log: 'Prova Groth16 real gerada'`n" -ForegroundColor Gray

Write-Host "  ✓ Network Tab:" -ForegroundColor Cyan
Write-Host "    • GET /blockchain/circuits/.../agrochain-score-threshold.wasm" -ForegroundColor Gray
Write-Host "      Status: " -NoNewline -ForegroundColor Gray
Write-Host "200 OK" -ForegroundColor Green -NoNewline
Write-Host ", Size: ~2.1 MB" -ForegroundColor Gray
Write-Host "    • GET /blockchain/circuits/agrochain-score-threshold_final.zkey" -ForegroundColor Gray
Write-Host "      Status: " -NoNewline -ForegroundColor Gray
Write-Host "200 OK" -ForegroundColor Green -NoNewline
Write-Host ", Size: ~378 KB`n" -ForegroundColor Gray

Write-Host "  ✓ UI Visual:" -ForegroundColor Cyan
Write-Host "    • Badge aparece com design profissional" -ForegroundColor Gray
Write-Host "    • Commitment mostra hash longo (64+ chars)" -ForegroundColor Gray
Write-Host "    • Botão de compartilhar funciona`n" -ForegroundColor Gray

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

Write-Host "⚠️  TROUBLESHOOTING:`n" -ForegroundColor Red

Write-Host "  • Se aparecer 'Commitment Poseidon calculado (wasm: ausente)':" -ForegroundColor Yellow
Write-Host "    → Verificar caminho dos arquivos no servidor" -ForegroundColor Gray
Write-Host "    → Checar console para erros 404`n" -ForegroundColor Gray

Write-Host "  • Se demorar muito (>30s):" -ForegroundColor Yellow
Write-Host "    → Possível problema com WASM em worker" -ForegroundColor Gray
Write-Host "    → Tentar em outro browser`n" -ForegroundColor Gray

Write-Host "  • Se der erro de constraints:" -ForegroundColor Yellow
Write-Host "    → Verificar se Score >= Nota Mínima" -ForegroundColor Gray
Write-Host "    → Verificar se Score <= 100`n" -ForegroundColor Gray

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

Write-Host "🎯 RESULTADO ESPERADO:`n" -ForegroundColor Green

Write-Host "  ✅ Commitment Poseidon calculado (hash criptográfico real)" -ForegroundColor Green
Write-Host "  ✅ Prova Groth16 gerada com snarkjs (a, b, c + publicSignals)" -ForegroundColor Green
Write-Host "  ✅ Badge exibido com dados estruturados" -ForegroundColor Green
Write-Host "  ✅ Nota privada (85) NUNCA aparece no badge" -ForegroundColor Green
Write-Host "  ✅ Apenas commitment + contextos públicos visíveis`n" -ForegroundColor Green

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray

Write-Host "🚀 Pronto para testar! Abrindo browser...`n" -ForegroundColor Cyan

Start-Process "http://localhost:8000/certificador.html"

Start-Sleep -Seconds 2

Write-Host "✨ Browser aberto! Siga os passos acima.`n" -ForegroundColor Green
Write-Host "💬 Cole no chat o resultado (sucesso ou erro) para continuarmos!`n" -ForegroundColor Yellow
