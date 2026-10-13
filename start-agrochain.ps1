# AgroChain - Script de Inicialização Completo
# Coffee & Cacao Supply Chain Platform

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    AGROCHAIN STARTUP SCRIPT" -ForegroundColor Yellow
Write-Host "  Coffee & Cacao Supply Chain" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$workspaceRoot = "c:\Users\Usuário\agrochain\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip"

# Check if already running
Write-Host "[1/3] Verificando portas..." -ForegroundColor Yellow
$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$port8001 = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue

if ($port8000) {
    Write-Host "  ? Porta 8000 já está em uso (ZK Certificador)" -ForegroundColor Green
} else {
    Write-Host "  ? Iniciando Node.js Server (porta 8000)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspaceRoot'; node server.cjs" -WindowStyle Minimized
    Start-Sleep -Seconds 2
}

if ($port8001) {
    Write-Host "  ? Porta 8001 já está em uso (AI Compliance API)" -ForegroundColor Green
} else {
    Write-Host "  ? Iniciando FastAPI Server (porta 8001)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspaceRoot'; python ia/compliance_api.py" -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "[2/3] Verificando status dos servidores..." -ForegroundColor Yellow

$retries = 0
$maxRetries = 5

while ($retries -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host "  ? Node.js Server: ATIVO (http://localhost:8000)" -ForegroundColor Green
        break
    } catch {
        $retries++
        if ($retries -eq $maxRetries) {
            Write-Host "  ? Node.js Server: FALHOU" -ForegroundColor Red
            Write-Host "    Inicie manualmente: node server.cjs" -ForegroundColor Yellow
        } else {
            Start-Sleep -Seconds 1
        }
    }
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ? FastAPI Server: ATIVO (http://localhost:8001)" -ForegroundColor Green
} catch {
    Write-Host "  ? FastAPI Server: FALHOU" -ForegroundColor Red
    Write-Host "    Inicie manualmente: python ia/compliance_api.py" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Abrindo navegadores..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

Start-Process "http://localhost:8000/"
Start-Sleep -Seconds 1
Start-Process "http://localhost:8001/docs"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    AGROCHAIN INICIADO!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Páginas disponíveis:" -ForegroundColor Yellow
Write-Host "  ?? Homepage:          http://localhost:8000/" -ForegroundColor White
Write-Host "  ?? Dashboard:         http://localhost:8000/dashboard.html" -ForegroundColor White
Write-Host "  ?? Certificador ZK:   http://localhost:8000/certificador.html" -ForegroundColor White
Write-Host "  ?? AI API Docs:       http://localhost:8001/docs" -ForegroundColor White
Write-Host "  ??  Health Check:      http://localhost:8001/health" -ForegroundColor White
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

