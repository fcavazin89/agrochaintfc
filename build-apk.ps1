# AgroChain APK Builder
# Script automatizado para gerar APK Android

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("debug", "release")]
    [string]$BuildType = "debug",
    
    [Parameter(Mandatory=$false)]
    [switch]$Install,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSync
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Green
Write-Host "  AgroChain APK Builder" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "[1/6] Verificando Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion instalado" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js não encontrado. Instale de: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Verificar Java
Write-Host "[2/6] Verificando Java JDK..." -ForegroundColor Cyan
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✓ Java instalado" -ForegroundColor Green
} catch {
    Write-Host "⚠ Java não encontrado. Necessário para build Android" -ForegroundColor Yellow
    Write-Host "  Baixe de: https://adoptium.net/temurin/releases/" -ForegroundColor Yellow
}

# Verificar ANDROID_HOME
Write-Host "[3/6] Verificando Android SDK..." -ForegroundColor Cyan
if ($env:ANDROID_HOME) {
    Write-Host "✓ ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "⚠ ANDROID_HOME não configurado" -ForegroundColor Yellow
    Write-Host "  Configure para: C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" -ForegroundColor Yellow
}

# Instalar dependências se necessário
if (-not (Test-Path "node_modules")) {
    Write-Host "[4/6] Instalando dependências..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Falha ao instalar dependências" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[4/6] Dependências já instaladas" -ForegroundColor Green
}

# Inicializar Android se necessário
if (-not (Test-Path "android")) {
    Write-Host "[5/6] Inicializando projeto Android..." -ForegroundColor Cyan
    npx cap add android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Falha ao inicializar Android" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[5/6] Projeto Android já inicializado" -ForegroundColor Green
}

# Sincronizar código
if (-not $SkipSync) {
    Write-Host "[6/6] Sincronizando código web → Android..." -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Falha ao sincronizar" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[6/6] Sincronização pulada (--SkipSync)" -ForegroundColor Yellow
}

# Build APK
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Construindo APK ($BuildType)" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

Push-Location android

if ($BuildType -eq "debug") {
    Write-Host "Executando: gradlew assembleDebug..." -ForegroundColor Cyan
    & .\gradlew assembleDebug
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
} else {
    Write-Host "Executando: gradlew assembleRelease..." -ForegroundColor Cyan
    & .\gradlew assembleRelease
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
}

Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Build falhou" -ForegroundColor Red
    Write-Host "  Tente abrir Android Studio e sincronizar o projeto:" -ForegroundColor Yellow
    Write-Host "  npm run android:open" -ForegroundColor Yellow
    exit 1
}

# Verificar APK gerado
$fullApkPath = Join-Path "android" $apkPath
if (Test-Path $fullApkPath) {
    $apkSize = (Get-Item $fullApkPath).Length / 1MB
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "✓ APK gerado com sucesso!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Localização: $fullApkPath" -ForegroundColor Cyan
    Write-Host "Tamanho: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    
    # Instalar se solicitado
    if ($Install) {
        Write-Host "Instalando APK via ADB..." -ForegroundColor Cyan
        adb install -r $fullApkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ APK instalado com sucesso" -ForegroundColor Green
        } else {
            Write-Host "⚠ Falha ao instalar. Certifique-se de que:" -ForegroundColor Yellow
            Write-Host "  - Dispositivo está conectado via USB" -ForegroundColor Yellow
            Write-Host "  - Depuração USB está habilitada" -ForegroundColor Yellow
            Write-Host "  - Drivers ADB instalados" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "  1. Copie o APK para seu dispositivo Android" -ForegroundColor White
    Write-Host "  2. Habilite 'Fontes desconhecidas' nas configurações" -ForegroundColor White
    Write-Host "  3. Abra o APK e instale" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou instale via ADB:" -ForegroundColor Cyan
    Write-Host "  adb install -r $fullApkPath" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host "✗ APK não encontrado em: $fullApkPath" -ForegroundColor Red
    exit 1
}
