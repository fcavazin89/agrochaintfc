# 📱 AgroChain Mobile APK

Aplicativo Android do AgroChain com certificador Web3 integrado.

## 🚀 Build Rápido (5 minutos)

### Opção 1: Script PowerShell (Recomendado)

```powershell
# Build APK debug
.\build-apk.ps1

# Build e instalar diretamente no dispositivo
.\build-apk.ps1 -Install

# Build versão release
.\build-apk.ps1 -BuildType release
```

### Opção 2: Comandos NPM

```powershell
# Instalar dependências
npm install

# Inicializar Android
npm run android:init

# Sincronizar código
npm run android:sync

# Build APK
npm run android:build
```

### Opção 3: Manual

```powershell
# 1. Instalar
npm install

# 2. Adicionar Android
npx cap add android

# 3. Sincronizar
npx cap sync android

# 4. Build
cd android
.\gradlew assembleDebug
cd ..
```

## 📦 APK Gerado

**Localização:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Tamanho:** ~25 MB (debug) / ~15 MB (release)

## 📲 Instalação

### Via ADB (USB)

```powershell
# Conecte dispositivo via USB
# Habilite "Depuração USB"

adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Via Arquivo

1. Copie APK para dispositivo (email, USB, WhatsApp)
2. Habilite "Fontes desconhecidas" em Configurações
3. Abra o arquivo APK
4. Toque "Instalar"

## ✨ Funcionalidades no Mobile

✅ **Todas as telas do protótipo**
- Painel, Lavoura, Lotes, ERP, IA, IoT
- Cadeia, Mercado, Selo, Auditoria
- Assistente, Sobre

✅ **Certificador Web3**
- Conexão MetaMask mobile (WalletConnect)
- Geração de prova ZK
- Emissão de certificação
- Consulta de certificados

✅ **UI Mobile-Optimized**
- Responsivo para todas as telas
- Touch gestures
- Status bar customizada
- Splash screen

## 🔧 Pré-requisitos

| Requisito | Versão | Link |
|-----------|--------|------|
| Node.js | 18+ | https://nodejs.org |
| Java JDK | 17+ | https://adoptium.net/temurin/releases/ |
| Android Studio | Recente | https://developer.android.com/studio |
| Gradle | (incluído) | - |

## 📚 Documentação Completa

Veja **[BUILD-APK.md](./BUILD-APK.md)** para:
- Guia detalhado passo a passo
- Configuração de assinatura (release)
- Personalização (ícone, splash)
- Troubleshooting
- Distribuição (Google Play, Firebase)

## 🐛 Problemas Comuns

### "npm install" falha

```powershell
npm config set registry https://registry.npmjs.org/
npm cache clean --force
npm install
```

### "ANDROID_HOME not set"

```powershell
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
```

### "Gradle build failed"

```powershell
# Abra Android Studio primeiro
npm run android:open

# Deixe sincronizar
# Depois tente build novamente
```

## 🌐 Web3 no Mobile

O certificador usa **WalletConnect** para conectar com MetaMask mobile:

1. App detecta ambiente mobile
2. Exibe QR Code WalletConnect
3. Usuário escaneia com MetaMask
4. Conexão estabelecida
5. Transações assinadas pelo MetaMask

## 📊 Tamanhos

| Versão | Tamanho |
|--------|---------|
| Debug | ~25 MB |
| Release | ~15 MB |
| Após instalação | ~35 MB |

## 🎯 Checklist Pré-Distribuição

- [ ] Testado em dispositivo físico
- [ ] Web3 conecta com MetaMask mobile
- [ ] Todas as telas funcionam
- [ ] Rotação de tela OK
- [ ] Back button navega corretamente
- [ ] Ícone e splash screen OK
- [ ] Assinado (para release)

## 📤 Distribuição

### Google Play Store
1. Criar conta ($25 one-time)
2. Upload APK/AAB assinado
3. Preencher metadados
4. Submeter para revisão

### Beta/Teste
- Firebase App Distribution (grátis)
- Compartilhamento direto de APK
- APKPure, F-Droid

## 🔗 Links

- **Capacitor**: https://capacitorjs.com
- **WalletConnect**: https://walletconnect.com
- **MetaMask Mobile**: https://metamask.io/download/
- **Android Studio**: https://developer.android.com/studio

---

**Precisa de ajuda?** Veja [BUILD-APK.md](./BUILD-APK.md) para guia completo.

**AgroChain Mobile © 2026** 📱🌱
